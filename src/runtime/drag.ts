import type { CommonDrawerDirection } from '../core';

export function getDragDirectionMultiplier(direction: CommonDrawerDirection) {
  return direction === 'bottom' || direction === 'right' ? 1 : -1;
}

export function getDraggedDistance({
  pointerStart,
  currentPointer,
  direction,
}: {
  pointerStart: number;
  currentPointer: number;
  direction: CommonDrawerDirection;
}) {
  return (pointerStart - currentPointer) * getDragDirectionMultiplier(direction);
}

export function isDraggingTowardExpandedState(draggedDistance: number) {
  return draggedDistance > 0;
}

export function getDragPercentage({
  draggedDistance,
  drawerDimension,
  snapPointPercentageDragged,
}: {
  draggedDistance: number;
  drawerDimension: number;
  snapPointPercentageDragged: number | null;
}) {
  const absDraggedDistance = Math.abs(draggedDistance);
  let percentageDragged = absDraggedDistance / drawerDimension;

  if (snapPointPercentageDragged !== null) {
    percentageDragged = snapPointPercentageDragged;
  }

  return {
    absDraggedDistance,
    percentageDragged,
  };
}

export function isReleaseTowardExpandedState({
  direction,
  distMoved,
}: {
  direction: CommonDrawerDirection;
  distMoved: number;
}) {
  return direction === 'bottom' || direction === 'right' ? distMoved > 0 : distMoved < 0;
}

export function shouldCloseDrawerOnRelease({
  velocity,
  velocityThreshold,
  swipeAmount,
  drawerDimension,
  closeThreshold,
}: {
  velocity: number;
  velocityThreshold: number;
  swipeAmount: number;
  drawerDimension: number;
  closeThreshold: number;
}) {
  if (velocity > velocityThreshold) {
    return true;
  }

  return Math.abs(swipeAmount) >= drawerDimension * closeThreshold;
}