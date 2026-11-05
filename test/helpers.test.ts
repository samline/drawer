import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { chain, set } from '../src/helpers'

/**
 * Internal style and cleanup helpers. Test-only vaul ports (`reset`,
 * `assignStyle`, `isInView`) were removed: no runtime path used them.
 */

describe('helpers', () => {
  let el: HTMLDivElement

  beforeEach(() => {
    el = document.createElement('div')
    document.body.appendChild(el)
  })

  afterEach(() => {
    el.remove()
  })

  describe('set (G5)', () => {
    it('writes inline styles', () => {
      set(el, { color: 'red', backgroundColor: 'blue' })
      expect(el.style.color).toBe('red')
      expect(el.style.backgroundColor).toBe('blue')
    })

    it('writes CSS custom properties via setProperty', () => {
      set(el, { '--my-var': '42px' })
      expect(el.style.getPropertyValue('--my-var')).toBe('42px')
    })

    it('ignores null / non-HTMLElement', () => {
      expect(() => set(null, { color: 'red' })).not.toThrow()
      expect(() => set(undefined, { color: 'red' })).not.toThrow()
    })
  })

  describe('chain (F18 exception isolation)', () => {
    it('runs every callback in order when none throw', () => {
      const order: string[] = []
      const cleanup = chain(
        () => order.push('a'),
        () => order.push('b'),
        () => order.push('c')
      )
      cleanup()
      expect(order).toEqual(['a', 'b', 'c'])
    })

    it('runs every callback even when one throws (F18)', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const order: string[] = []
      const cleanup = chain(
        () => order.push('a'),
        () => {
          throw new TypeError('simulated')
        },
        () => order.push('c')
      )
      expect(() => cleanup()).not.toThrow()
      expect(order).toEqual(['a', 'c'])
      vi.restoreAllMocks()
    })

    it('continues past a throw in the FIRST callback', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const order: string[] = []
      const cleanup = chain(
        () => {
          throw new TypeError('first')
        },
        () => order.push('second')
      )
      expect(() => cleanup()).not.toThrow()
      expect(order).toEqual(['second'])
      vi.restoreAllMocks()
    })

    it('skips non-function entries (null / undefined)', () => {
      const order: string[] = []
      const cleanup = chain(
        () => order.push('a'),
        null,
        undefined,
        () => order.push('b')
      )
      cleanup()
      expect(order).toEqual(['a', 'b'])
    })
  })
})
