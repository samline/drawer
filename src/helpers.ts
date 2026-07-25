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

export function isVertical(direction: CommonDrawerDirection): boolean {
  return direction === 'top' || direction === 'bottom'
}
