import type { CommonDrawerDirection } from './core'

interface Style {
  [key: string]: string
}

// G5: 1:1 with vaul upstream's `set` helper. The WeakMap cache
// stores the pre-`set` inline styles so `reset` (G6) can restore
// them later. 1:1 port from `/tmp/vaul-reference/src/helpers.ts:7`.
const setCache = new WeakMap<HTMLElement, Style>()

/**
 * Apply inline styles to an element. 1:1 with vaul upstream's
 * `set` helper. The third argument `ignoreCache` skips the
 * `setCache.set(el, originalStyles)` write — used by
 * `useScaleBackground` in vaul when the wrapper should keep
 * its existing inline styles as the cache (so `reset` is a
 * no-op). The WeakMap lets `reset(el, prop?)` restore the
 * pre-`set` styles.
 *
 * Audit G5 fixed the previous `helpers.ts#set` which had no
 * cache and no `ignoreCache` parameter.
 */
export function set(
  el: Element | HTMLElement | null | undefined,
  styles: Style,
  ignoreCache = false
) {
  if (!el || !(el instanceof HTMLElement)) return

  const originalStyles: Style = {}

  for (const [key, value] of Object.entries(styles)) {
    if (key.startsWith('--')) {
      el.style.setProperty(key, value)
      continue
    }
    const target = el.style as unknown as Record<string, string>
    originalStyles[key] = target[key] ?? ''
    target[key] = value
  }

  if (ignoreCache) return

  setCache.set(el, originalStyles)
}

/**
 * Restore inline styles previously captured by `set`. 1:1 with
 * vaul upstream's `reset` helper. When `prop` is provided, only
 * that property is restored; otherwise every captured property
 * is restored. Audit G6.
 */
export function reset(el: Element | HTMLElement | null, prop?: string) {
  if (!el || !(el instanceof HTMLElement)) return
  const originalStyles = setCache.get(el)
  if (!originalStyles) return

  const target = el.style as unknown as Record<string, string>
  if (prop) {
    target[prop] = originalStyles[prop] ?? ''
  } else {
    for (const [key, value] of Object.entries(originalStyles)) {
      target[key] = value
    }
  }
}

/**
 * Chain a list of optional cleanup callbacks into a single one.
 * Non-function entries are skipped (so callers can use
 * `chain(...maybeUndefined, another)` without a manual null
 * check). Each callback runs in order. Used by the F6 scroll-lock
 * pipeline (the 6-step Mobile Safari workaround) to combine the
 * `removeEventListener` cleanups and the style restore callbacks
 * into a single teardown function.
 *
 * Mirrors vaul upstream's `chain` helper in `src/helpers.ts`.
 */
export function chain(...callbacks: Array<(() => void) | undefined | null>): () => void {
  return () => {
    for (const callback of callbacks) {
      if (typeof callback === 'function') {
        callback()
      }
    }
  }
}

/**
 * Assign a `Partial<CSSStyleDeclaration>` to an element and
 * return a restore function that reverts the prior `cssText`.
 * 1:1 with vaul upstream's `assignStyle` helper. Used by the
 * `useScaleBackground` cleanup to restore the wrapper's prior
 * inline styles.
 */
export function assignStyle(
  element: HTMLElement | null | undefined,
  style: Partial<CSSStyleDeclaration>
): () => void {
  if (!element) return () => {}

  const prevStyle = element.style.cssText
  Object.assign(element.style, style)

  return () => {
    element.style.cssText = prevStyle
  }
}

/**
 * Check if the element is inside the visual viewport (with a
 * 40 px safety margin for Safari detection). 1:1 with vaul
 * upstream's `isInView` helper. Used by the keyboard /
 * `repositionInputs` pipeline to decide whether a focused
 * input is visible. Audit G9.
 */
export function isInView(el: HTMLElement): boolean {
  if (typeof window === 'undefined' || !window.visualViewport) return false
  const rect = el.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.visualViewport.height - 40 &&
    rect.right <= window.visualViewport.width
  )
}

export function isVertical(direction: CommonDrawerDirection): boolean {
  return direction === 'top' || direction === 'bottom'
}

