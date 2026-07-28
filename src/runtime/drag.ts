import type { CommonDrawerDirection } from '../core'

/**
 * Pure pointer-drag math: direction sign, dragged distance, percentage
 * dragged, release-toward-expanded, threshold-close decision.
 *
 * Consumed by `vanilla/dialog.ts#attachListeners` (Phase A — drag-to-dismiss)
 * and by `runtime/release.ts`. Every live export here runs on the
 * dialog mount:
 *
 * - `getDragDirectionMultiplier` is used by `getDraggedDistance` to
 *   encode the direction into the sign of the result.
 * - `getDraggedDistance` is called on every `pointermove`.
 * - `getDragPercentage` feeds `onDragChange` and the nested-drawer
 *   transform.
 * - `shouldCloseDrawerOnRelease` is called on `pointerup` via
 *   `runtime/release.ts#getDismissibleReleaseResult`.
 *
 * `isReleaseTowardExpandedState` is used by `runtime/release.ts#getReleaseAction`.
 *
 * `isDraggingTowardExpandedState` is also exported as the pure form of
 * the sign check used by the pointer pipeline.
 */

export function getDragDirectionMultiplier(direction: CommonDrawerDirection) {
  return direction === 'bottom' || direction === 'right' ? 1 : -1
}

export function getDraggedDistance({
  pointerStart,
  currentPointer,
  direction
}: {
  pointerStart: number
  currentPointer: number
  direction: CommonDrawerDirection
}) {
  return (pointerStart - currentPointer) * getDragDirectionMultiplier(direction)
}

export function isDraggingTowardExpandedState(draggedDistance: number) {
  return draggedDistance > 0
}

/**
 * Logarithmic dampening of an out-of-bounds drag distance. Mirrors
 * the v2 vaul library's `dampenValue` (`8 * (log(d + 1) - 2)`), the
 * same curve used by Safari's scroll bounce. The function grows
 * much more slowly than the input — a 100 px drag in the wrong
 * direction produces ~21 px of movement, a 200 px drag ~32 px.
 * This keeps the drawer visibly "anchored" to its rest position
 * when the user tries to drag it away from the close direction.
 */
export function dampenValue(distance: number): number {
  return 8 * (Math.log(distance + 1) - 2)
}

/**
 * The "close" direction is the screen direction the user drags to
 * dismiss the drawer. For `bottom`/`right` drawers the close
 * direction is the positive screen axis (down / right); for
 * `top`/`left` drawers it's the negative screen axis (up / left).
 * Anything else is "out of bounds" and gets the elastic dampening.
 *
 * Sign convention: `getDraggedDistance` is `(start - current) *
 * multiplier`, so dragging TOWARD the close position always yields
 * a NEGATIVE `draggedDistance` regardless of `direction` (the
 * runtime uses `(start - current)` because the close direction
 * reduces the drawer's visible offset from its rest position).
 * Therefore this helper returns `draggedDistance < 0` for every
 * direction. The previous branch on `direction` was a v2-era
 * leftover that incorrectly resisted close-direction drags on
 * `top`/`left` drawers.
 */
export function isDraggingInCloseDirection({
  direction,
  draggedDistance
}: {
  direction: CommonDrawerDirection
  draggedDistance: number
}) {
  void direction
  return draggedDistance < 0
}

/**
 * Compute the inline transform offset (in pixels along the drawer's
 * axis) for the current drag. For the close direction, the offset
 * matches the finger position 1:1 so the close threshold / velocity
 * math stays accurate. For the opposite direction, the offset is
 * scaled by `dampenValue` (logarithmic, v2 vaul parity) to give the
 * elastic / rubber-band effect. 1:1 with vaul upstream's onDrag.
 */
export function getDraggableOffset({
  direction,
  draggedDistance
}: {
  direction: CommonDrawerDirection
  draggedDistance: number
}) {
  const baseOffset = direction === 'bottom' || direction === 'right' ? -draggedDistance : draggedDistance
  const outOfBounds = !isDraggingInCloseDirection({ direction, draggedDistance })
  if (!outOfBounds) return baseOffset
  // `dampenValue` expects a non-negative distance. The opposite-
  // direction `baseOffset` is already the magnitude (the sign
  // encodes the screen direction; we use the absolute value for
  // the curve and reapply the sign at the end).
  const magnitude = dampenValue(Math.abs(baseOffset))
  return Math.max(0, magnitude) * Math.sign(baseOffset)
}

export function getDragPercentage({
  draggedDistance,
  drawerDimension,
  snapPointPercentageDragged
}: {
  draggedDistance: number
  drawerDimension: number
  snapPointPercentageDragged: number | null
}) {
  const absDraggedDistance = Math.abs(draggedDistance)
  let percentageDragged = drawerDimension > 0 ? absDraggedDistance / drawerDimension : 0

  if (snapPointPercentageDragged !== null) {
    percentageDragged = snapPointPercentageDragged
  }

  return {
    absDraggedDistance,
    percentageDragged
  }
}

export function isReleaseTowardExpandedState({
  direction,
  distMoved
}: {
  direction: CommonDrawerDirection
  distMoved: number
}) {
  // `getDraggedDistance` normalizes every direction: closing is
  // negative and expanding is positive. Release decisions must use
  // that normalized sign rather than interpreting it as a raw axis
  // delta (which inverted top/left drawers).
  void direction
  return distMoved > 0
}

export function shouldCloseDrawerOnRelease({
  velocity,
  velocityThreshold,
  swipeAmount,
  drawerDimension,
  closeThreshold
}: {
  velocity: number
  velocityThreshold: number
  swipeAmount: number
  drawerDimension: number
  closeThreshold: number
}) {
  if (velocity > velocityThreshold) {
    return true
  }

  return Math.abs(swipeAmount) >= drawerDimension * closeThreshold
}
