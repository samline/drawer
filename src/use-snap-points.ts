import React from 'react';
import { set, isVertical } from './helpers';
import { TRANSITIONS, VELOCITY_THRESHOLD } from './constants';
import { useControllableState } from './use-controllable-state';
import { DrawerDirection, DrawerSnapPoint } from './types';
import { getSnapPointReleaseAction } from './runtime/release';
import {
  getActiveSnapPointIndex,
  getClosestSnapPoint,
  getShouldFade,
  getSnapDragValue,
  getSnapPointPercentageDragged,
  getSnapPointsOffset,
} from './runtime/snap-points';

export function useSnapPoints({
  activeSnapPointProp,
  setActiveSnapPointProp,
  snapPoints,
  drawerRef,
  overlayRef,
  fadeFromIndex,
  onSnapPointChange,
  direction = 'bottom',
  container,
  snapToSequentialPoint,
}: {
  activeSnapPointProp?: DrawerSnapPoint | null;
  setActiveSnapPointProp?(snapPoint: DrawerSnapPoint | null): void;
  snapPoints?: DrawerSnapPoint[];
  fadeFromIndex?: number;
  drawerRef: React.RefObject<HTMLDivElement>;
  overlayRef: React.RefObject<HTMLDivElement>;
  onSnapPointChange(activeSnapPointIndex: number): void;
  direction?: DrawerDirection;
  container?: HTMLElement | null | undefined;
  snapToSequentialPoint?: boolean;
}) {
  const [activeSnapPoint, setActiveSnapPoint] = useControllableState<DrawerSnapPoint | null>({
    prop: activeSnapPointProp,
    defaultProp: snapPoints?.[0],
    onChange: setActiveSnapPointProp,
  });

  const [windowDimensions, setWindowDimensions] = React.useState(
    typeof window !== 'undefined'
      ? {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
        }
      : undefined,
  );

  React.useEffect(() => {
    function onResize() {
      setWindowDimensions({
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      });
    }
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isLastSnapPoint = React.useMemo(
    () => activeSnapPoint === snapPoints?.[snapPoints.length - 1] || null,
    [snapPoints, activeSnapPoint],
  );

  const activeSnapPointIndex = React.useMemo(
    () => getActiveSnapPointIndex({ snapPoints, activeSnapPoint }),
    [snapPoints, activeSnapPoint],
  );

  const shouldFade = getShouldFade({ snapPoints, fadeFromIndex, activeSnapPoint });

  const snapPointsOffset = React.useMemo(() => {
    const containerSize = container
      ? { width: container.getBoundingClientRect().width, height: container.getBoundingClientRect().height }
      : typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 };

    return getSnapPointsOffset({ snapPoints, direction, containerSize });
  }, [snapPoints, direction, windowDimensions, container]);

  const activeSnapPointOffset = React.useMemo(
    () => (activeSnapPointIndex !== null ? snapPointsOffset?.[activeSnapPointIndex] : null),
    [snapPointsOffset, activeSnapPointIndex],
  );

  const snapToPoint = React.useCallback(
    (dimension: number) => {
      const newSnapPointIndex = snapPointsOffset?.findIndex((snapPointDim) => snapPointDim === dimension) ?? null;
      onSnapPointChange(newSnapPointIndex);

      set(drawerRef.current, {
        transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
        transform: isVertical(direction) ? `translate3d(0, ${dimension}px, 0)` : `translate3d(${dimension}px, 0, 0)`,
      });

      if (
        snapPointsOffset &&
        newSnapPointIndex !== snapPointsOffset.length - 1 &&
        fadeFromIndex !== undefined &&
        newSnapPointIndex !== fadeFromIndex &&
        newSnapPointIndex < fadeFromIndex
      ) {
        set(overlayRef.current, {
          transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
          opacity: '0',
        });
      } else {
        set(overlayRef.current, {
          transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
          opacity: '1',
        });
      }

      setActiveSnapPoint(snapPoints?.[Math.max(newSnapPointIndex, 0)]);
    },
    [drawerRef.current, snapPoints, snapPointsOffset, fadeFromIndex, overlayRef, setActiveSnapPoint],
  );

  React.useEffect(() => {
    if (activeSnapPoint || activeSnapPointProp) {
      const newIndex =
        snapPoints?.findIndex((snapPoint) => snapPoint === activeSnapPointProp || snapPoint === activeSnapPoint) ?? -1;
      if (snapPointsOffset && newIndex !== -1 && typeof snapPointsOffset[newIndex] === 'number') {
        snapToPoint(snapPointsOffset[newIndex] as number);
      }
    }
  }, [activeSnapPoint, activeSnapPointProp, snapPoints, snapPointsOffset, snapToPoint]);

  function onRelease({
    draggedDistance,
    closeDrawer,
    velocity,
    dismissible,
  }: {
    draggedDistance: number;
    closeDrawer: () => void;
    velocity: number;
    dismissible: boolean;
  }) {
    if (fadeFromIndex === undefined) return;
    const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex - 1;

    if (isOverlaySnapPoint) {
      set(overlayRef.current, {
        transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      });
    }

    const dim = isVertical(direction) ? window.innerHeight : window.innerWidth;
    const releaseAction = getSnapPointReleaseAction({
      fadeFromIndex,
      direction,
      activeSnapPointOffset,
      activeSnapPointIndex,
      snapPointsOffset,
      snapPointsCount: snapPoints?.length ?? 0,
      draggedDistance,
      velocity,
      dismissible,
      snapToSequentialPoint,
      velocityThreshold: VELOCITY_THRESHOLD,
      viewportSize: dim,
    });

    if (releaseAction.type === 'close') {
      closeDrawer();
      return;
    }

    if (releaseAction.type === 'snap') {
      snapToPoint(releaseAction.targetOffset);
    }
  }

  function onDrag({ draggedDistance }: { draggedDistance: number }) {
    if (activeSnapPointOffset === null) return;
    const newValue = getSnapDragValue({ activeSnapPointOffset, draggedDistance, direction });

    // Don't do anything if we exceed the last(biggest) snap point
    if ((direction === 'bottom' || direction === 'right') && newValue < snapPointsOffset[snapPointsOffset.length - 1]) {
      return;
    }
    if ((direction === 'top' || direction === 'left') && newValue > snapPointsOffset[snapPointsOffset.length - 1]) {
      return;
    }

    set(drawerRef.current, {
      transform: isVertical(direction) ? `translate3d(0, ${newValue}px, 0)` : `translate3d(${newValue}px, 0, 0)`,
    });
  }

  function getPercentageDragged(absDraggedDistance: number, isDraggingDown: boolean) {
    return getSnapPointPercentageDragged({
      snapPoints,
      activeSnapPointIndex,
      snapPointsOffset,
      fadeFromIndex,
      shouldFade,
      absDraggedDistance,
      isDraggingDown,
    });
  }

  return {
    isLastSnapPoint,
    activeSnapPoint,
    shouldFade,
    getPercentageDragged,
    setActiveSnapPoint,
    activeSnapPointIndex,
    onRelease,
    onDrag,
    snapPointsOffset,
  };
}
