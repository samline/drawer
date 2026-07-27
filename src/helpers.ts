import type { CommonDrawerDirection } from './core'

interface Style {
  [key: string]: string
}

/**
 * Apply inline styles to an element. The registry and the host call
 * this on every render of the nested-drawer transform; the writes
 * are intentionally fire-and-forget because the snapshot is fully
 * derived from `CommonDrawerSnapshot` and the runtime never needs to
 * restore prior values.
 */
export function set(el: Element | HTMLElement | null | undefined, styles: Style) {
  if (!el || !(el instanceof HTMLElement)) return

  const target = el.style as unknown as Record<string, string>
  for (const [key, value] of Object.entries(styles)) {
    if (key.startsWith('--')) {
      el.style.setProperty(key, value)
    } else {
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

export function isVertical(direction: CommonDrawerDirection): boolean {
  return direction === 'top' || direction === 'bottom'
}
