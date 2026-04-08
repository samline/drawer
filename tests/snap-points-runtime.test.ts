import { describe, expect, it } from 'vitest';

import {
  getActiveSnapPointIndex,
  getClosestSnapPoint,
  getShouldFade,
  getSnapDragValue,
  getSnapPointOffset,
  getSnapPointPercentageDragged,
  getSnapPointsOffset,
} from '../src/runtime/snap-points';

describe('snap points runtime helpers', () => {
  it('resolves the active snap point index', () => {
    expect(getActiveSnapPointIndex({ snapPoints: ['120px', 0.5, 1], activeSnapPoint: 0.5 })).toBe(1);
    expect(getActiveSnapPointIndex({ snapPoints: ['120px', 0.5, 1], activeSnapPoint: null })).toBe(-1);
  });

  it('computes snap point offsets for vertical and horizontal drawers', () => {
    expect(
      getSnapPointOffset({
        snapPoint: '120px',
        direction: 'bottom',
        containerSize: { width: 400, height: 800 },
      }),
    ).toBe(680);

    expect(
      getSnapPointOffset({
        snapPoint: 0.5,
        direction: 'left',
        containerSize: { width: 400, height: 800 },
      }),
    ).toBe(-200);
  });

  it('computes the full snap points offset list', () => {
    expect(
      getSnapPointsOffset({
        snapPoints: ['120px', 0.5, 1],
        direction: 'bottom',
        containerSize: { width: 400, height: 800 },
      }),
    ).toEqual([680, 400, 0]);
  });

  it('detects fade state from the configured snap point', () => {
    expect(getShouldFade({ snapPoints: ['120px', 0.5, 1], fadeFromIndex: 2, activeSnapPoint: 1 })).toBe(true);
    expect(getShouldFade({ snapPoints: ['120px', 0.5, 1], fadeFromIndex: 2, activeSnapPoint: 0.5 })).toBe(false);
  });

  it('computes drag value from the active snap point offset', () => {
    expect(getSnapDragValue({ activeSnapPointOffset: 400, draggedDistance: 50, direction: 'bottom' })).toBe(350);
    expect(getSnapDragValue({ activeSnapPointOffset: -200, draggedDistance: 50, direction: 'left' })).toBe(-150);
  });

  it('finds the closest snap point to the current position', () => {
    expect(getClosestSnapPoint({ snapPointsOffset: [680, 400, 0], currentPosition: 330 })).toBe(400);
  });

  it('computes overlay percentage dragged between snap points', () => {
    expect(
      getSnapPointPercentageDragged({
        snapPoints: ['120px', 0.5, 1],
        activeSnapPointIndex: 1,
        snapPointsOffset: [680, 400, 0],
        fadeFromIndex: 2,
        shouldFade: false,
        absDraggedDistance: 100,
        isDraggingDown: false,
      }),
    ).toBe(1);

    expect(
      getSnapPointPercentageDragged({
        snapPoints: ['120px', 0.5, 1],
        activeSnapPointIndex: 2,
        snapPointsOffset: [680, 400, 0],
        fadeFromIndex: 2,
        shouldFade: true,
        absDraggedDistance: 100,
        isDraggingDown: false,
      }),
    ).toBe(0.25);
  });
});