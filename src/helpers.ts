import type { CommonDrawerDirection } from './core'

interface Style {
  [key: string]: string
}

/**
 * Apply inline styles to an element. Keys starting with `--` are
 * written as custom properties; other keys use CSSOM property names.
 * Restoration is owned by each caller (scroll lock, background scale,
 * nested transforms), so this helper keeps no style cache.
 */
export function set(el: Element | HTMLElement | null | undefined, styles: Style) {
  if (!el || !(el instanceof HTMLElement)) return

  for (const [key, value] of Object.entries(styles)) {
    if (key.startsWith('--')) {
      el.style.setProperty(key, value)
      continue
    }
    ;(el.style as unknown as Record<string, string>)[key] = value
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
 * F18 (memory hygiene): each callback runs inside its own
 * try-catch. The previous implementation aborted the chain on
 * the first throw, leaving subsequent cleanups un-run and
 * holding their captured state alive via closure. This is the
 * same pattern as the teardownMount cleanup loop (F18 commit
 * 2); the chain helper is the underlying primitive that
 * `teardownMount` and `removeEvents` both depend on, so the
 * isolation is applied at the source.
 *
 * Mirrors vaul upstream's `chain` helper in `src/helpers.ts`.
 */
export function chain(...callbacks: Array<(() => void) | undefined | null>): () => void {
  return () => {
    for (const callback of callbacks) {
      if (typeof callback === 'function') {
        try {
          callback()
        } catch (error) {
          // F18: log in dev for consumer-side diagnostics; the
          // bug is usually an external DOM removal racing the
          // cleanup. Production swallows to keep the rest of
          // the chain running.
          if (typeof console !== 'undefined') {
            console.warn('[@samline/drawer] chain() callback threw:', error)
          }
        }
      }
    }
  }
}

export function isVertical(direction: CommonDrawerDirection): boolean {
  return direction === 'top' || direction === 'bottom'
}
