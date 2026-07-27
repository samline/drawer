import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Snapshot tests for the CSS contract of the drawer.
 *
 * Bug fixed (2026-07-27, drag-release close "regreso"):
 *   The base rule `[data-drawer] { transition: transform 0.5s ... }`
 *   was competing with the `slideToX` animation during the close
 *   path. The base `transition` would animate the cascade change
 *   from the inline dragged-position `transform` to the
 *   `transform: none` of the `[data-state='closed'][data-drawer-closing]`
 *   rule (i.e. move the drawer BACK to the open position), while
 *   the `slideToX` animation tried to move it forward to the closed
 *   position. The two competed and the user saw the drawer "jump
 *   back to open then close from the start".
 *
 *   Fix: scope the base `transition` to `[data-state='open']` only.
 *   On the open path, the `transition` is still active (for the
 *   snap-back-after-drag reset). On the close path, the `transition`
 *   is gone and only the `slideToX` animation drives the `transform`,
 *   so the close plays cleanly from start to end.
 */

const CSS = readFileSync(resolve(__dirname, '..', 'src', 'style.css'), 'utf8')
const CSS_DIST = readFileSync(resolve(__dirname, '..', 'dist', 'style.css'), 'utf8')

describe('style.css — animation / transition contract', () => {
  it('base [data-drawer] rule does NOT declare a transform transition (was the source of the close-path bug)', () => {
    const baseRuleMatch = CSS.match(/\[data-drawer\]\s*\{[^}]*\}/)
    expect(baseRuleMatch, 'expected a [data-drawer] base rule in style.css').not.toBeNull()
    const baseRule = baseRuleMatch![0]
    expect(baseRule).not.toMatch(/transition\s*:\s*[^;]*transform/)
  })

  it('[data-drawer][data-state="open"] rule DOES declare the transform transition (for snap-back-after-drag)', () => {
    const openRuleMatch = CSS.match(/\[data-drawer\]\[data-state=['"]open['"]\]\s*\{[^}]*\}/)
    expect(openRuleMatch, 'expected a [data-drawer][data-state="open"] rule in style.css').not.toBeNull()
    const openRule = openRuleMatch![0]
    expect(openRule).toMatch(/transition\s*:\s*transform\s+0\.5s\s+cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/)
  })

  it('[data-state="closed"] rule (without data-drawer-closing) declares animation-fill-mode: forwards so the to-frame holds after the close animation', () => {
    // Match the bottom closed rule specifically (the pattern repeats per direction)
    const closedRuleMatch = CSS.match(/\[data-drawer\][^}]*\[data-state=['"]closed['"]\]\s*\{[^}]*\}/)
    expect(closedRuleMatch, 'expected a [data-state="closed"] rule in style.css').not.toBeNull()
    expect(closedRuleMatch![0]).toMatch(/animation-fill-mode\s*:\s*forwards/)
  })

  it('[data-state="closed"][data-drawer-closing] rule sets transform: none so slideToX has a clean open-position start frame', () => {
    const closingRuleMatch = CSS.match(/\[data-drawer\][^}]*\[data-drawer-closing\]\s*\{[^}]*\}/)
    expect(closingRuleMatch, 'expected a [data-drawer-closing] rule in style.css').not.toBeNull()
    expect(closingRuleMatch![0]).toMatch(/transform\s*:\s*none/)
  })

  it('the [data-drawer-closing] rule is strictly more specific than the [data-state="closed"] rule (so transform: none wins over transform: translate3d(... 100% ...))', () => {
    // Find both rules for the bottom direction
    const closingRule = CSS.match(/\[data-drawer\]\[data-drawer-snap-points=['"]false['"]\]\[data-drawer-direction=['"]bottom['"]\]\[data-state=['"]closed['"]\]\[data-drawer-closing\]\s*\{/)
    const closedRule = CSS.match(/\[data-drawer\]\[data-drawer-snap-points=['"]false['"]\]\[data-drawer-direction=['"]bottom['"]\]\[data-state=['"]closed['"]\]\s*\{/)
    expect(closingRule, 'expected the closing rule for direction=bottom').not.toBeNull()
    expect(closedRule, 'expected the closed rule for direction=bottom').not.toBeNull()
    // Count attribute selectors in each
    const closingAttrCount = (closingRule![0].match(/\[/g) || []).length
    const closedAttrCount = (closedRule![0].match(/\[/g) || []).length
    expect(closingAttrCount).toBeGreaterThan(closedAttrCount)
  })

  describe('dist/style.css (compiled bundle — what the consumer actually loads)', () => {
    it('has the same close-path contract as src/style.css', () => {
      expect(CSS_DIST).not.toMatch(/^\[data-drawer\]\s*\{[^}]*transition\s*:\s*[^;]*transform/m)
      expect(CSS_DIST).toMatch(/\[data-drawer\]\[data-state=['"]open['"]\][^}]*transition\s*:\s*transform/m)
      expect(CSS_DIST).toMatch(/\[data-state=['"]closed['"]\][^}]*animation-fill-mode\s*:\s*forwards/)
    })
  })
})
