import type { CommonDrawerDirection } from '../core'
import { isReleaseTowardExpandedState, shouldCloseDrawerOnRelease } from './drag'
import { getClosestSnapPoint } from './snap-points'

/**
 * Pure release-decision math. When the user releases the drag, the
 * pipeline computes the action (close / reset / snap-to-X) plus
 * whether to skip the focus re-focus based on velocity. The vanilla
 * dialog does not yet wire this — see the placeholder at the end of
 * `vanilla/dialog.ts#attachListeners`.
 */

export function shouldPreventFocusOnRelease(velocity: number, threshold = 0.05) {
  return velocity > threshold
}

export function getReleaseAction({
  direction,
  distMoved,
  velocity,
  velocityThreshold,
  swipeAmount,
  drawerDimension,
  closeThreshold
}: {
  direction: CommonDrawerDirection
  distMoved: number
  velocity: number
  velocityThreshold: number
  swipeAmount: number
  drawerDimension: number
  closeThreshold: number
}) {
  if (isReleaseTowardExpandedState({ direction, distMoved })) {
    return 'reset' as const
  }

  if (
    shouldCloseDrawerOnRelease({
      velocity,
      velocityThreshold,
      swipeAmount,
      drawerDimension,
      closeThreshold
    })
  ) {
    return 'close' as const
  }

  return 'reset' as const
}

export function getDismissibleReleaseResult({
  direction,
  distMoved,
  velocity,
  velocityThreshold,
  swipeAmount,
  drawerDimension,
  closeThreshold,
  focusVelocityThreshold
}: {
  direction: CommonDrawerDirection
  distMoved: number
  velocity: number
  velocityThreshold: number
  swipeAmount: number
  drawerDimension: number
  closeThreshold: number
  focusVelocityThreshold?: number
}) {
  const action = getReleaseAction({
    direction,
    distMoved,
    velocity,
    velocityThreshold,
    swipeAmount,
    drawerDimension,
    closeThreshold
  })

  return {
    action,
    shouldPreventFocus: shouldPreventFocusOnRelease(velocity, focusVelocityThreshold),
    nextOpen: action !== 'close'
  }
}

export function getSnapPointReleaseAction({
  fadeFromIndex,
  direction,
  activeSnapPointOffset,
  activeSnapPointIndex,
  snapPointsOffset,
  snapPointsCount,
  draggedDistance,
  velocity,
  dismissible,
  snapToSequentialPoint,
  velocityThreshold,
  highVelocityThreshold = 2,
  viewportSize
}: {
  fadeFromIndex?: number
  direction: CommonDrawerDirection
  activeSnapPointOffset: number | null
  activeSnapPointIndex: number | null
  snapPointsOffset: number[]
  snapPointsCount: number
  draggedDistance: number
  velocity: number
  dismissible: boolean
  snapToSequentialPoint?: boolean
  velocityThreshold: number
  highVelocityThreshold?: number
  viewportSize: number
}) {
  if (fadeFromIndex === undefined || activeSnapPointOffset === null || snapPointsOffset.length === 0) {
    return { type: 'noop' as const }
  }

  const currentPosition =
    direction === 'bottom' || direction === 'right'
      ? activeSnapPointOffset - draggedDistance
      : activeSnapPointOffset + draggedDistance

  const isFirst = activeSnapPointIndex === 0
  const hasDraggedTowardExpandedState = draggedDistance > 0
  const isLastSnapPoint = activeSnapPointIndex === snapPointsCount - 1

  if (!snapToSequentialPoint && velocity > highVelocityThreshold && !hasDraggedTowardExpandedState) {
    if (dismissible) {
      return { type: 'close' as const }
    }

    return { type: 'snap' as const, targetOffset: snapPointsOffset[0] }
  }

  if (!snapToSequentialPoint && velocity > highVelocityThreshold && hasDraggedTowardExpandedState) {
    const lastOffset = snapPointsOffset[snapPointsCount - 1]
    return typeof lastOffset === 'number'
      ? { type: 'snap' as const, targetOffset: lastOffset }
      : { type: 'noop' as const }
  }

  const closestSnapPoint = getClosestSnapPoint({ snapPointsOffset, currentPosition })

  if (velocity > velocityThreshold && Math.abs(draggedDistance) < viewportSize * 0.4) {
    const dragDirection = hasDraggedTowardExpandedState ? 1 : -1

    if (dragDirection > 0 && isLastSnapPoint) {
      const lastOffset = snapPointsOffset[snapPointsCount - 1]
      return typeof lastOffset === 'number'
        ? { type: 'snap' as const, targetOffset: lastOffset }
        : { type: 'noop' as const }
    }

    if (isFirst && dragDirection < 0 && dismissible) {
      return { type: 'close' as const }
    }

    if (activeSnapPointIndex === null) {
      return { type: 'noop' as const }
    }

    const nextOffset = snapPointsOffset[activeSnapPointIndex + dragDirection]
    return typeof nextOffset === 'number'
      ? { type: 'snap' as const, targetOffset: nextOffset }
      : { type: 'noop' as const }
  }

  return typeof closestSnapPoint === 'number'
    ? { type: 'snap' as const, targetOffset: closestSnapPoint }
    : { type: 'noop' as const }
}
