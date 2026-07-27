import type { CommonDrawerDirection } from '../core'
import { BORDER_RADIUS } from '../constants'

/**
 * Pure transform-string builders used by the nested-drawer pipeline
 * (Phase A — `getNestedDrawerTransform` / `getNestedDragTransform`)
 * and the background-scale pipeline (Phase C — `getBackgroundDragState`
 * / `getBackgroundResetState`). Both pipelines are wired by
 * `vanilla/dialog.ts#attachListeners`: the nested path is called from
 * `runtime/registry.ts#syncParentNestedTransform` on every
 * `onDragChange` of a child; the background-scale path is called from
 * `vanilla/dialog.ts#applyWrapperDragState` and `applyWrapperOpenState`.
 */

export function getAxisAwareTranslate(direction: CommonDrawerDirection, value: number | string) {
  return direction === 'top' || direction === 'bottom'
    ? `translate3d(0, ${value}px, 0)`
    : `translate3d(${value}px, 0, 0)`
}

export function getScaleTranslateTransform({
  direction,
  scale,
  translate
}: {
  direction: CommonDrawerDirection
  scale: number
  translate: number | string
}) {
  return direction === 'top' || direction === 'bottom'
    ? `scale(${scale}) translate3d(0, ${translate}, 0)`
    : `scale(${scale}) translate3d(${translate}, 0, 0)`
}

export function getNestedDrawerTransform({
  direction,
  isOpen,
  viewportSize,
  displacement
}: {
  direction: CommonDrawerDirection
  isOpen: boolean
  viewportSize: number
  displacement: number
}) {
  const scale = isOpen ? (viewportSize - displacement) / viewportSize : 1
  const translate = isOpen ? -displacement : 0

  return {
    scale,
    translate,
    transform: getScaleTranslateTransform({ direction, scale, translate: `${translate}px` })
  }
}

export function getNestedDragTransform({
  direction,
  viewportSize,
  displacement,
  percentageDragged
}: {
  direction: CommonDrawerDirection
  viewportSize: number
  displacement: number
  percentageDragged: number
}) {
  const initialScale = (viewportSize - displacement) / viewportSize
  const scale = initialScale + percentageDragged * (1 - initialScale)
  const translate = -displacement + percentageDragged * displacement

  return {
    scale,
    translate,
    transform: getScaleTranslateTransform({ direction, scale, translate: `${translate}px` })
  }
}

export function getBackgroundDragState({
  baseScale,
  percentageDragged
}: {
  baseScale: number
  percentageDragged: number
}) {
  const scaleValue = Math.min(baseScale + percentageDragged * (1 - baseScale), 1)
  const borderRadiusValue = BORDER_RADIUS - percentageDragged * BORDER_RADIUS
  const translateValue = Math.max(0, 14 - percentageDragged * 14)

  return {
    scaleValue,
    borderRadiusValue,
    translateValue
  }
}

export function getBackgroundResetState({
  direction,
  baseScale
}: {
  direction: CommonDrawerDirection
  baseScale: number
}) {
  return {
    borderRadius: `${BORDER_RADIUS}px`,
    overflow: 'hidden',
    transform: getScaleTranslateTransform({
      direction,
      scale: baseScale,
      translate: 'calc(env(safe-area-inset-top) + 14px)'
    }),
    transformOrigin: direction === 'top' || direction === 'bottom' ? 'top' : 'left'
  }
}

/**
 * Read the inline `translate*` value from an element's computed
 * `transform` and return it as a pixel offset along the drawer's
 * axis. Mirrors vaul upstream's `getTranslate` in
 * `src/helpers.ts`, which the React port uses inside `shouldDrag` to
 * detect "the drawer is already in a non-zero position" before
 * allowing a drag in the close direction.
 *
 * Returns `null` when the element has no transform, when the
 * transform does not match the expected matrix shape, or when the
 * `DOMMatrix` API is unavailable (jsdom). Callers should treat
 * `null` as "drawer is at rest" and use their fallback path.
 */
export function getTranslate(
  element: HTMLElement | null,
  direction: CommonDrawerDirection
): number | null {
  if (!element) return null
  // `getComputedStyle(...).transform` returns a `matrix(a, b, c, d, tx, ty)`
  // string when there is a non-trivial transform, or `'none'` for the
  // identity matrix. Parse with `DOMMatrix` (modern browsers + jsdom
  // 16+).
  if (typeof DOMMatrix === 'undefined') return null
  const transform = window.getComputedStyle(element).transform
  if (!transform || transform === 'none') return null
  const matrix = new DOMMatrix(transform)
  // The drawer's `translate3d(x, y, 0)` sets `matrix.m41` for the
  // horizontal axis and `matrix.m42` for the vertical axis. Pick the
  // one that matches the drawer's axis.
  return direction === 'top' || direction === 'bottom' ? matrix.m42 : matrix.m41
}
