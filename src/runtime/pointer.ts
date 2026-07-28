import type { CommonDrawerDirection } from '../core'

/**
 * Pure swipe-intent math used by the dialog before pointer capture.
 *
 * The current drag pipeline in `vanilla/dialog.ts#attachListeners` reads
 * the pointer delta inline and delegates the close decision to
 * `runtime/drag.ts#shouldCloseDrawerOnRelease` + `runtime/release.ts`.
 * `getSwipeIntent` distinguishes an axis-aligned drawer gesture from a
 * perpendicular page scroll before the runtime captures the pointer.
 */

export function getSwipeIntent({
  delta,
  direction,
  threshold = 0,
  wasBeyondThePoint
}: {
  delta: { x: number; y: number }
  direction: CommonDrawerDirection
  threshold?: number
  wasBeyondThePoint: boolean
}) {
  if (wasBeyondThePoint) {
    return { isAllowed: true, reachedIntentBoundary: true }
  }

  const deltaY = Math.abs(delta.y)
  const deltaX = Math.abs(delta.x)
  const isDeltaX = deltaX > deltaY
  const directionFactor = direction === 'bottom' || direction === 'right' ? 1 : -1

  if (direction === 'left' || direction === 'right') {
    const isReverseDirection = delta.x * directionFactor < 0
    if (!isReverseDirection && deltaX >= 0 && deltaX <= threshold) {
      return { isAllowed: isDeltaX, reachedIntentBoundary: false }
    }
  } else {
    const isReverseDirection = delta.y * directionFactor < 0
    if (!isReverseDirection && deltaY >= 0 && deltaY <= threshold) {
      return { isAllowed: !isDeltaX, reachedIntentBoundary: false }
    }
  }

  return { isAllowed: true, reachedIntentBoundary: true }
}
