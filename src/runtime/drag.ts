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
 * `isDraggingTowardExpandedState` is **exported for the public API** but
 * not wired into the dialog — the dialog does the equivalent direction
 * check inline at the `pointermove` handler. The function is exercised
 * by `test/drag-runtime.test.ts` and is kept as a pure helper for
 * consumers who want the same logic without the direction-encoding
 * overhead. Safe to delete if the public surface is trimmed.
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
 * Resistance factor (0–1) applied to the inline transform when the
 * user drags in the OPPOSITE of the close direction. Mirrors the
 * v2 vaul library's elastic behavior (Safari-style scroll bounce).
 * `1` = no resistance, `0` = no movement. The close direction has
 * no resistance so the close-threshold / velocity math stays
 * predictable.
 */
export const DRAG_RESISTANCE = 0.5

/**
 * The "close" direction is the screen direction the user drags to
 * dismiss the drawer. For `bottom`/`right` drawers the close
 * direction is the positive screen axis (down / right); for
 * `top`/`left` drawers it's the negative screen axis (up / left).
 * Anything else is "out of bounds" and gets the elastic resistance.
 */
export function isDraggingInCloseDirection({
  direction,
  draggedDistance
}: {
  direction: CommonDrawerDirection
  draggedDistance: number
}) {
  return direction === 'bottom' || direction === 'right'
    ? draggedDistance < 0
    : draggedDistance > 0
}

/**
 * Compute the inline transform offset (in pixels along the drawer's
 * axis) for the current drag. For the close direction, the offset
 * matches the finger position 1:1 so the close threshold / velocity
 * math stays accurate. For the opposite direction, the offset is
 * scaled by `DRAG_RESISTANCE` to give the elastic / rubber-band
 * effect from v2 vaul (Safari-style scroll bounce).
 */
export function getDraggableOffset({
  direction,
  draggedDistance
}: {
  direction: CommonDrawerDirection
  draggedDistance: number
}) {
  const baseOffset =
    direction === 'bottom' || direction === 'right' ? -draggedDistance : draggedDistance
  const outOfBounds = !isDraggingInCloseDirection({ direction, draggedDistance })
  return outOfBounds ? baseOffset * DRAG_RESISTANCE : baseOffset
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
  let percentageDragged = absDraggedDistance / drawerDimension

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
  return direction === 'bottom' || direction === 'right' ? distMoved > 0 : distMoved < 0
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
