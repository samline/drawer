import type { CommonDrawerDirection } from '../core'

/**
 * Pure swipe-intent math. **Planned API, not yet wired into the dialog.**
 *
 * The current drag pipeline in `vanilla/dialog.ts#attachListeners` reads
 * the pointer delta inline and delegates the close decision to
 * `runtime/drag.ts#shouldCloseDrawerOnRelease` + `runtime/release.ts`.
 * `getSwipeIntent` was extracted for a future swipe-to-dismiss variant
 * (e.g. a "swipe past the dismiss threshold even at low velocity"
 * path) and is exercised by the unit tests in `test/pointer-runtime.test.ts`.
 *
 * It is safe to delete if the swipe-to-dismiss feature is dropped —
 * the only consumer today is the test file.
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
