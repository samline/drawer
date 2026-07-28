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
  const scale = isOpen && viewportSize > 0 ? (viewportSize - displacement) / viewportSize : 1
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
  const initialScale = viewportSize > 0 ? (viewportSize - displacement) / viewportSize : 1
  const progress = Math.max(0, Math.min(1, percentageDragged))
  const scale = initialScale + progress * (1 - initialScale)
  const translate = -displacement + progress * displacement

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
  const progress = Math.max(0, Math.min(1, percentageDragged))
  const scaleValue = Math.min(baseScale + progress * (1 - baseScale), 1)
  const borderRadiusValue = BORDER_RADIUS - progress * BORDER_RADIUS
  const translateValue = Math.max(0, 14 - progress * 14)

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
 * Returns `null` when the element has no transform or the transform
 * does not match a supported matrix/translate shape. Parsing strings
 * directly keeps this path available when `DOMMatrix` is absent.
 */
export function getTranslate(element: HTMLElement | null, direction: CommonDrawerDirection): number | null {
  if (!element) return null
  const transform = window.getComputedStyle(element).transform
  if (!transform || transform === 'none') return null

  const matrix3d = transform.match(/^matrix3d\((.+)\)$/)
  if (matrix3d?.[1]) {
    const values = matrix3d[1].split(',').map((value) => Number.parseFloat(value.trim()))
    return values[direction === 'top' || direction === 'bottom' ? 13 : 12] ?? null
  }

  const matrix = transform.match(/^matrix\((.+)\)$/)
  if (matrix?.[1]) {
    const values = matrix[1].split(',').map((value) => Number.parseFloat(value.trim()))
    return values[direction === 'top' || direction === 'bottom' ? 5 : 4] ?? null
  }

  const translate3d = transform.match(/^translate3d\(([^,]+),\s*([^,]+),\s*[^)]+\)$/)
  if (translate3d) {
    const value = direction === 'top' || direction === 'bottom' ? translate3d[2] : translate3d[1]
    return value ? Number.parseFloat(value) : null
  }

  return null
}
