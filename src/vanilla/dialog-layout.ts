import type { CommonDrawerDirection, CommonDrawerSnapPoint } from '../core'
import type { VanillaDrawerOptions } from './render'

export function getDirection(options: VanillaDrawerOptions): CommonDrawerDirection {
  return (options.direction ?? 'bottom') as CommonDrawerDirection
}

export function getClosedTransform(direction: CommonDrawerDirection) {
  if (direction === 'bottom') return 'translate3d(0, 100%, 0)'
  if (direction === 'top') return 'translate3d(0, -100%, 0)'
  if (direction === 'right') return 'translate3d(100%, 0, 0)'
  return 'translate3d(-100%, 0, 0)'
}

export function getSnapPoints(options: VanillaDrawerOptions): CommonDrawerSnapPoint[] | undefined {
  return options.snapPoints
}

export function getActiveSnapPoint(options: VanillaDrawerOptions): CommonDrawerSnapPoint | null {
  return options.activeSnapPoint ?? options.snapPoints?.[0] ?? null
}

export function getFadeFromIndex(options: VanillaDrawerOptions): number | undefined {
  if (options.fadeFromIndex !== undefined) return options.fadeFromIndex
  return options.snapPoints && options.snapPoints.length > 0 ? options.snapPoints.length - 1 : undefined
}

/**
 * Resolve the viewport size to feed the snap-point runtime helpers.
 * Returns `{width: 0, height: 0}` in non-DOM environments (so the
 * helpers degrade to `NaN` offsets, which the dialog treats as
 * "no snap points configured" downstream).
 */
export function getContainerSize(container?: HTMLElement | null) {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
  }
  // G3: 1:1 with vaul upstream — when the consumer passes a
  // `container` option, use the container's bounding rect for the
  // snap-point math instead of the viewport. vaul does this in
  // `use-snap-points.ts:75-80`. Without this, a consumer with
  // `container: someInnerDiv` and `snapPoints: [0.5, 0.8]` would
  // get viewport-based snap points in the drawer but
  // container-based in vaul.
  if (container && typeof container.getBoundingClientRect === 'function') {
    const rect = container.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * Invert `getSnapPointOffset` to find the snap-point **value** that
 * produces the given offset. `getSnapPointReleaseAction` returns the
 * matched offset; the dialog needs the original value (string /
 * number) to call `controller.setActiveSnapPoint`.
 *
 * The index lookup is exact because the runtime helper stores offsets
 * as a parallel array — two distinct snap points cannot produce the
 * same offset unless the viewport is degenerate, in which case
 * `findIndex` returns `-1` and we return `null` (the caller should
 * keep the previous active snap).
 */
export function findSnapPointByOffset(
  snapPoints: CommonDrawerSnapPoint[] | undefined,
  snapPointsOffset: number[],
  targetOffset: number
): CommonDrawerSnapPoint | null {
  if (!snapPoints) return null
  const index = snapPointsOffset.findIndex((offset) => offset === targetOffset)
  if (index === -1) return null
  return snapPoints[index] ?? null
}

/**
 * Decide whether the overlay should be visible for a given active
 * snap. Mirrors the original React `use-snap-points` logic: the
 * overlay is hidden only when the active snap sits BELOW `fadeFromIndex`
 * AND is not the last snap point. The last snap is always visible
 * because the user has fully expanded the drawer.
 */
export function shouldShowSnapOverlay(
  snapPoints: CommonDrawerSnapPoint[] | undefined,
  fadeFromIndex: number | undefined,
  activeSnapPoint: CommonDrawerSnapPoint | null
): boolean {
  if (!snapPoints || snapPoints.length === 0) return true
  if (fadeFromIndex === undefined) return true
  const activeIndex = snapPoints.findIndex((snap) => snap === activeSnapPoint)
  if (activeIndex === -1) return false
  if (activeIndex === snapPoints.length - 1) return true
  return activeIndex >= fadeFromIndex
}
