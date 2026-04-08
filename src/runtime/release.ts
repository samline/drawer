import type { CommonDrawerDirection } from '../core';
import { isReleaseTowardExpandedState, shouldCloseDrawerOnRelease } from './drag';

export function shouldPreventFocusOnRelease(velocity: number, threshold = 0.05) {
  return velocity > threshold;
}

export function getReleaseAction({
  direction,
  distMoved,
  velocity,
  velocityThreshold,
  swipeAmount,
  drawerDimension,
  closeThreshold,
}: {
  direction: CommonDrawerDirection;
  distMoved: number;
  velocity: number;
  velocityThreshold: number;
  swipeAmount: number;
  drawerDimension: number;
  closeThreshold: number;
}) {
  if (isReleaseTowardExpandedState({ direction, distMoved })) {
    return 'reset' as const;
  }

  if (
    shouldCloseDrawerOnRelease({
      velocity,
      velocityThreshold,
      swipeAmount,
      drawerDimension,
      closeThreshold,
    })
  ) {
    return 'close' as const;
  }

  return 'reset' as const;
}