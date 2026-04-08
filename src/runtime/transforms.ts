import type { CommonDrawerDirection } from '../core';

export function getAxisAwareTranslate(direction: CommonDrawerDirection, value: number | string) {
  return direction === 'top' || direction === 'bottom'
    ? `translate3d(0, ${value}px, 0)`
    : `translate3d(${value}px, 0, 0)`;
}

export function getScaleTranslateTransform({
  direction,
  scale,
  translate,
}: {
  direction: CommonDrawerDirection;
  scale: number;
  translate: number | string;
}) {
  return direction === 'top' || direction === 'bottom'
    ? `scale(${scale}) translate3d(0, ${translate}, 0)`
    : `scale(${scale}) translate3d(${translate}, 0, 0)`;
}

export function getNestedDrawerTransform({
  direction,
  isOpen,
  viewportSize,
  displacement,
}: {
  direction: CommonDrawerDirection;
  isOpen: boolean;
  viewportSize: number;
  displacement: number;
}) {
  const scale = isOpen ? (viewportSize - displacement) / viewportSize : 1;
  const translate = isOpen ? -displacement : 0;

  return {
    scale,
    translate,
    transform: getScaleTranslateTransform({ direction, scale, translate: `${translate}px` }),
  };
}

export function getNestedDragTransform({
  direction,
  viewportSize,
  displacement,
  percentageDragged,
}: {
  direction: CommonDrawerDirection;
  viewportSize: number;
  displacement: number;
  percentageDragged: number;
}) {
  const initialScale = (viewportSize - displacement) / viewportSize;
  const scale = initialScale + percentageDragged * (1 - initialScale);
  const translate = -displacement + percentageDragged * displacement;

  return {
    scale,
    translate,
    transform: getScaleTranslateTransform({ direction, scale, translate: `${translate}px` }),
  };
}

export function getBackgroundDragState({
  baseScale,
  percentageDragged,
}: {
  baseScale: number;
  percentageDragged: number;
}) {
  const scaleValue = Math.min(baseScale + percentageDragged * (1 - baseScale), 1);
  const borderRadiusValue = 8 - percentageDragged * 8;
  const translateValue = Math.max(0, 14 - percentageDragged * 14);

  return {
    scaleValue,
    borderRadiusValue,
    translateValue,
  };
}

export function getBackgroundResetState({
  direction,
  baseScale,
}: {
  direction: CommonDrawerDirection;
  baseScale: number;
}) {
  return {
    borderRadius: '8px',
    overflow: 'hidden',
    transform: getScaleTranslateTransform({
      direction,
      scale: baseScale,
      translate: 'calc(env(safe-area-inset-top) + 14px)',
    }),
    transformOrigin: direction === 'top' || direction === 'bottom' ? 'top' : 'left',
  };
}