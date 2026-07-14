import type { CommonDrawerDirection, CommonDrawerSnapPoint } from '../core';

function isVerticalDirection(direction: CommonDrawerDirection) {
  return direction === 'top' || direction === 'bottom';
}

function toSnapPointNumber(snapPoint: CommonDrawerSnapPoint) {
  return typeof snapPoint === 'string' ? parseInt(snapPoint, 10) : snapPoint;
}

export function getActiveSnapPointIndex({
  snapPoints,
  activeSnapPoint,
}: {
  snapPoints?: CommonDrawerSnapPoint[];
  activeSnapPoint?: CommonDrawerSnapPoint | null;
}) {
  return snapPoints?.findIndex((snapPoint) => snapPoint === activeSnapPoint) ?? null;
}

export function getShouldFade({
  snapPoints,
  fadeFromIndex,
  activeSnapPoint,
}: {
  snapPoints?: CommonDrawerSnapPoint[];
  fadeFromIndex?: number;
  activeSnapPoint?: CommonDrawerSnapPoint | null;
}) {
  return (
    (snapPoints &&
      snapPoints.length > 0 &&
      (fadeFromIndex || fadeFromIndex === 0) &&
      !Number.isNaN(fadeFromIndex) &&
      snapPoints[fadeFromIndex] === activeSnapPoint) ||
    !snapPoints
  );
}

export function getSnapPointOffset({
  snapPoint,
  direction,
  containerSize,
}: {
  snapPoint: CommonDrawerSnapPoint;
  direction: CommonDrawerDirection;
  containerSize: { width: number; height: number };
}) {
  const isPx = typeof snapPoint === 'string';
  const snapPointAsNumber = toSnapPointNumber(snapPoint);

  if (isVerticalDirection(direction)) {
    const height = isPx ? snapPointAsNumber : snapPointAsNumber * containerSize.height;
    return direction === 'bottom' ? containerSize.height - height : -containerSize.height + height;
  }

  const width = isPx ? snapPointAsNumber : snapPointAsNumber * containerSize.width;
  return direction === 'right' ? containerSize.width - width : -containerSize.width + width;
}

export function getSnapPointsOffset({
  snapPoints,
  direction,
  containerSize,
}: {
  snapPoints?: CommonDrawerSnapPoint[];
  direction: CommonDrawerDirection;
  containerSize: { width: number; height: number };
}) {
  return snapPoints?.map((snapPoint) => getSnapPointOffset({ snapPoint, direction, containerSize })) ?? [];
}

export function getSnapDragValue({
  activeSnapPointOffset,
  draggedDistance,
  direction,
}: {
  activeSnapPointOffset: number;
  draggedDistance: number;
  direction: CommonDrawerDirection;
}) {
  return direction === 'bottom' || direction === 'right'
    ? activeSnapPointOffset - draggedDistance
    : activeSnapPointOffset + draggedDistance;
}

export function getClosestSnapPoint({
  snapPointsOffset,
  currentPosition,
}: {
  snapPointsOffset?: number[];
  currentPosition: number;
}) {
  return snapPointsOffset?.reduce((prev, curr) => {
    if (typeof prev !== 'number' || typeof curr !== 'number') return prev;

    return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev;
  });
}

export function getSnapPointPercentageDragged({
  snapPoints,
  activeSnapPointIndex,
  snapPointsOffset,
  fadeFromIndex,
  shouldFade,
  absDraggedDistance,
  isDraggingDown,
}: {
  snapPoints?: CommonDrawerSnapPoint[];
  activeSnapPointIndex?: number | null;
  snapPointsOffset?: number[];
  fadeFromIndex?: number;
  shouldFade: boolean;
  absDraggedDistance: number;
  isDraggingDown: boolean;
}) {
  if (!snapPoints || typeof activeSnapPointIndex !== 'number' || !snapPointsOffset || fadeFromIndex === undefined) {
    return null;
  }

  const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex - 1;
  const isOverlaySnapPointOrHigher = activeSnapPointIndex >= fadeFromIndex;

  if (isOverlaySnapPointOrHigher && isDraggingDown) {
    return 0;
  }

  if (isOverlaySnapPoint && !isDraggingDown) return 1;
  if (!shouldFade && !isOverlaySnapPoint) return null;

  const targetSnapPointIndex = isOverlaySnapPoint ? activeSnapPointIndex + 1 : activeSnapPointIndex - 1;

  const snapPointsOffsetCurrent = snapPointsOffset[targetSnapPointIndex];
  const snapPointsOffsetNext = isOverlaySnapPoint
    ? snapPointsOffset[targetSnapPointIndex - 1]
    : snapPointsOffset[targetSnapPointIndex + 1];

  if (snapPointsOffsetCurrent === undefined || snapPointsOffsetNext === undefined) {
    return null;
  }

  const snapPointDistance = snapPointsOffsetCurrent - snapPointsOffsetNext;

  const percentageDragged = absDraggedDistance / Math.abs(snapPointDistance);

  return isOverlaySnapPoint ? 1 - percentageDragged : percentageDragged;
}