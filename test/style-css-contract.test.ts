import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * The base transition handles programmatic close. To-only slideToX
 * keyframes let drag-close begin at the retained release transform;
 * an explicit zero frame would make the drawer jump fully open first.
 */

const CSS = readFileSync(resolve(__dirname, '..', 'src', 'style.css'), 'utf8')
const CSS_DIST = readFileSync(resolve(__dirname, '..', 'dist', 'style.css'), 'utf8')
const CSS_WITHOUT_COMMENTS = CSS.replace(/\/\*[\s\S]*?\*\//g, '')

describe('style.css — animation / transition contract', () => {
  it('base [data-drawer] rule DOES declare `transition: transform 0.5s` (1:1 with vaul upstream)', () => {
    const baseRuleMatch = CSS.match(/\[data-drawer\]\s*\{[^}]*\}/)
    expect(baseRuleMatch, 'expected a [data-drawer] base rule in style.css').not.toBeNull()
    const baseRule = baseRuleMatch![0]
    expect(baseRule).toMatch(/transition\s*:\s*transform\s+0\.5s\s+cubic-bezier\(0\.32,\s*0\.72,\s*0,\s*1\)/)
    expect(CSS).toMatch(
      /\[data-drawer\]\[data-drawer-direction='top'\],[\s\S]*?\[data-drawer\]\[data-drawer-direction='bottom'\]\s*\{\s*touch-action:\s*pan-x;/
    )
    expect(CSS).toMatch(
      /\[data-drawer\]\[data-drawer-direction='left'\],[\s\S]*?\[data-drawer\]\[data-drawer-direction='right'\]\s*\{\s*touch-action:\s*pan-y;/
    )
    expect(CSS).toMatch(/\[data-drawer-handle\]\s*\{[\s\S]*?touch-action:\s*inherit;/)
  })

  it('[data-state="closed"] rule (without data-drawer-closing) declares animation-fill-mode: forwards so the to-frame holds after the close animation', () => {
    // Match the bottom closed rule specifically (the pattern repeats per direction)
    const closedRuleMatch = CSS.match(/\[data-drawer\][^}]*\[data-state=['"]closed['"]\]\s*\{[^}]*\}/)
    expect(closedRuleMatch, 'expected a [data-state="closed"] rule in style.css').not.toBeNull()
    expect(closedRuleMatch![0]).toMatch(/animation-fill-mode\s*:\s*forwards/)
  })

  it('NO [data-drawer-closing] rule exists (F1: removed)', () => {
    // F1: the JS-side `data-drawer-closing` flag and the four
    // matching CSS rules were a port-side workaround. The new
    // approach is 1:1 with vaul: no flag, no rule, just the base
    // `transition: transform` + the cascade change.
    const closingRuleMatch = CSS.match(/\[data-drawer-closing\]/)
    expect(closingRuleMatch, 'expected NO [data-drawer-closing] rule in style.css').toBeNull()
  })

  it('slideToX keyframes use the current transform as their implicit start frame', () => {
    for (const direction of ['Bottom', 'Top', 'Left', 'Right']) {
      expect(CSS_WITHOUT_COMMENTS).toMatch(new RegExp(`@keyframes\\s+slideTo${direction}\\s*\\{\\s*to\\s*\\{`))
      expect(CSS_WITHOUT_COMMENTS).not.toMatch(
        new RegExp(`@keyframes\\s+slideTo${direction}\\s*\\{\\s*(?:from|0%)\\s*\\{`)
      )
    }
  })

  describe('dist/style.css (compiled bundle — what the consumer actually loads)', () => {
    it('matches the source stylesheet exactly', () => {
      expect(CSS_DIST).toBe(CSS)
    })
  })
})
