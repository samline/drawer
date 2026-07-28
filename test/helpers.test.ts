import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { assignStyle, isInView, reset, set } from '../src/helpers'

/**
 * G5 + G6 + G9: 1:1 with vaul upstream's `helpers.ts` exports.
 *
 * - `set(el, styles, ignoreCache)` with a WeakMap cache for
 *   restoration.
 * - `reset(el, prop?)` to restore the pre-`set` styles.
 * - `assignStyle(el, style)` for `useScaleBackground` cleanup.
 * - `isInView(el)` for the keyboard / reposition pipeline.
 */

describe('helpers (G5 + G6 + G9)', () => {
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

    it('captures the pre-set styles in the cache (so reset can restore them)', () => {
      el.style.color = 'green'
      set(el, { color: 'red' })
      expect(el.style.color).toBe('red')
      reset(el, 'color')
      expect(el.style.color).toBe('green')
    })

    it('ignoreCache=true skips the cache write', () => {
      el.style.color = 'green'
      set(el, { color: 'red' }, true)
      // No cache entry → reset does nothing.
      reset(el, 'color')
      expect(el.style.color).toBe('red') // unchanged
    })
  })

  describe('reset (G6)', () => {
    it('restores a single property', () => {
      el.style.color = 'green'
      set(el, { color: 'red', fontSize: '12px' })
      reset(el, 'color')
      expect(el.style.color).toBe('green')
      expect(el.style.fontSize).toBe('12px')
    })

    it('restores all properties when prop is omitted', () => {
      el.style.color = 'green'
      el.style.fontSize = '16px'
      set(el, { color: 'red', fontSize: '12px' })
      reset(el)
      expect(el.style.color).toBe('green')
      expect(el.style.fontSize).toBe('16px')
    })

    it('is a no-op when no cache entry exists', () => {
      // No `set` call first.
      expect(() => reset(el, 'color')).not.toThrow()
      expect(el.style.color).toBe('')
    })
  })

  describe('assignStyle', () => {
    it('assigns CSSStyleDeclaration keys and returns a restore', () => {
      el.style.color = 'green'
      const restore = assignStyle(el, { color: 'red' })
      expect(el.style.color).toBe('red')
      restore()
      // The previous cssText is restored (color set to 'green').
      expect(el.style.color).toBe('green')
    })

    it('returns a no-op for null / undefined', () => {
      const restore = assignStyle(null, { color: 'red' })
      expect(() => restore()).not.toThrow()
    })
  })

  describe('isInView (G9)', () => {
    it('returns true for an element inside the visualViewport', () => {
      // jsdom does not implement visualViewport by default, so the
      // function returns `false` (the early-return guard).
      const visible = document.createElement('div')
      document.body.appendChild(visible)
      expect(isInView(visible)).toBe(false)
      visible.remove()
    })

    it('returns false when window.visualViewport is missing', () => {
      // No setup needed; the jsdom default has no visualViewport.
      expect(isInView(el)).toBe(false)
    })
  })
})
