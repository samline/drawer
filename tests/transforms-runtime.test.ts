import { describe, expect, it } from 'vitest';

import {
  getAxisAwareTranslate,
  getBackgroundDragState,
  getBackgroundResetState,
  getNestedDragTransform,
  getNestedDrawerTransform,
  getScaleTranslateTransform,
} from '../src/runtime/transforms';

describe('transform runtime helpers', () => {
  it('creates axis-aware translate transforms', () => {
    expect(getAxisAwareTranslate('bottom', 24)).toBe('translate3d(0, 24px, 0)');
    expect(getAxisAwareTranslate('left', -18)).toBe('translate3d(-18px, 0, 0)');
  });

  it('creates scale plus translate transforms', () => {
    expect(getScaleTranslateTransform({ direction: 'bottom', scale: 0.9, translate: '12px' })).toBe(
      'scale(0.9) translate3d(0, 12px, 0)',
    );
    expect(getScaleTranslateTransform({ direction: 'right', scale: 0.8, translate: '16px' })).toBe(
      'scale(0.8) translate3d(16px, 0, 0)',
    );
  });

  it('computes background drag state', () => {
    expect(getBackgroundDragState({ baseScale: 0.95, percentageDragged: 0.5 })).toEqual({
      scaleValue: 0.975,
      borderRadiusValue: 4,
      translateValue: 7,
    });
  });

  it('computes nested drawer transform state', () => {
    expect(
      getNestedDrawerTransform({ direction: 'bottom', isOpen: true, viewportSize: 400, displacement: 16 }),
    ).toEqual({
      scale: 0.96,
      translate: -16,
      transform: 'scale(0.96) translate3d(0, -16px, 0)',
    });

    expect(
      getNestedDrawerTransform({ direction: 'left', isOpen: false, viewportSize: 400, displacement: 16 }),
    ).toEqual({
      scale: 1,
      translate: 0,
      transform: 'scale(1) translate3d(0px, 0, 0)',
    });
  });

  it('computes nested drag transform state', () => {
    expect(
      getNestedDragTransform({ direction: 'bottom', viewportSize: 400, displacement: 16, percentageDragged: 0.5 }),
    ).toEqual({
      scale: 0.98,
      translate: -8,
      transform: 'scale(0.98) translate3d(0, -8px, 0)',
    });
  });

  it('computes background reset state', () => {
    expect(getBackgroundResetState({ direction: 'bottom', baseScale: 0.95 })).toEqual({
      borderRadius: '8px',
      overflow: 'hidden',
      transform: 'scale(0.95) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)',
      transformOrigin: 'top',
    });
  });
});