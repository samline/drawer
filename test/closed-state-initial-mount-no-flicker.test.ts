import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression tests for the initial-mount flicker (parpadeo) on
 * non-snap-points closed states.
 *
 * Bug: previously, the closed-state CSS rule set
 * `animation-name: slideToRight` (or the direction equivalent) +
 * `animation-fill-mode: forwards`. The animation ran on every
 * mount, animating from the default (center) position to the
 * off-screen `to` keyframe. The user saw a 0.5s slide on page
 * load even though the drawer was created with `open: false`.
 *
 * Fix: each closed-state rule now also sets a static
 * `transform: translate3d(<off-screen>)` matching the `to` keyframe
 * of the animation. The animation is still set (preserved for the
 * open→close transition) but the start and end positions are now
 * both off-screen on initial mount, so the interpolation is a
 * no-op and the user sees no visible change.
 *
 * Same pattern applied to `[data-drawer-overlay][data-state='closed']`
 * with `opacity: 0` replacing the `animation-name: fadeOut` flicker.
 *
 * jsdom does not fully resolve `transform: translate3d(100%, 0, 0)`
 * (the `%` units need a parent width to resolve against), so the
 * test reads the compiled `dist/style.css` as a string and asserts
 * the static transform is present in each closed-state rule. The
 * runtime test only verifies the drawer is created and the closed
 * data-state is applied.
 */

const CSS_PATH = resolve(import.meta.dirname, '../dist/style.css')
const CSS = readFileSync(CSS_PATH, 'utf8')

describe('closed-state initial mount (no flicker)', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  describe('compiled CSS has a static off-screen transform on every closed-state rule', () => {
    function ruleHasStaticTransform(rule: string): boolean {
      // Match: rule body contains a `transform: translate3d(...)` line
      // (ignoring comments and the `animation-name` / `animation-fill-mode` lines).
      const body = rule.replace(/\/\*[\s\S]*?\*\//g, '')
      return /transform:\s*translate3d\(/.test(body)
    }

    it('right direction closed rule has a static off-screen transform', () => {
      const match = CSS.match(
        /\[data-drawer\]\[data-drawer-snap-points='false'\]\[data-drawer-direction='right'\]\[data-state='closed'\]\s*\{([^}]+)\}/
      )
      expect(match).not.toBeNull()
      const body = match![1] ?? ''
      expect(ruleHasStaticTransform(body)).toBe(true)
    })

    it('left direction closed rule has a static off-screen transform', () => {
      const match = CSS.match(
        /\[data-drawer\]\[data-drawer-snap-points='false'\]\[data-drawer-direction='left'\]\[data-state='closed'\]\s*\{([^}]+)\}/
      )
      expect(match).not.toBeNull()
      const body = match![1] ?? ''
      expect(ruleHasStaticTransform(body)).toBe(true)
    })

    it('top direction closed rule has a static off-screen transform', () => {
      const match = CSS.match(
        /\[data-drawer\]\[data-drawer-snap-points='false'\]\[data-drawer-direction='top'\]\[data-state='closed'\]\s*\{([^}]+)\}/
      )
      expect(match).not.toBeNull()
      const body = match![1] ?? ''
      expect(ruleHasStaticTransform(body)).toBe(true)
    })

    it('bottom direction closed rule has a static off-screen transform', () => {
      const match = CSS.match(
        /\[data-drawer\]\[data-drawer-snap-points='false'\]\[data-drawer-direction='bottom'\]\[data-state='closed'\]\s*\{([^}]+)\}/
      )
      expect(match).not.toBeNull()
      const body = match![1] ?? ''
      expect(ruleHasStaticTransform(body)).toBe(true)
    })

    it('overlay closed rule has a static opacity:0', () => {
      const match = CSS.match(/\[data-drawer-overlay\]\[data-state='closed'\]\s*\{([^}]+)\}/)
      expect(match).not.toBeNull()
      const body = (match![1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(/opacity:\s*0/.test(body)).toBe(true)
    })
  })

  describe('runtime: closed drawer is mounted with data-state=closed', () => {
    it.each(['top', 'bottom', 'left', 'right'] as const)(
      'direction=%s mounts the drawer in the closed state',
      (direction) => {
        createDrawer({
          id: `mt-${direction}`,
          direction,
          content: 'body'
        })
        const el = document.querySelector('[data-drawer]') as HTMLElement
        expect(el).not.toBeNull()
        expect(el.getAttribute('data-state')).toBe('closed')
      }
    )

    it('overlay is mounted with data-state=closed and pointer-events:none', () => {
      createDrawer({
        id: 'mt-overlay',
        direction: 'right',
        content: 'body'
      })
      const overlay = document.querySelector('[data-drawer-overlay]') as HTMLElement
      expect(overlay).not.toBeNull()
      expect(overlay.getAttribute('data-state')).toBe('closed')
    })
  })
})
