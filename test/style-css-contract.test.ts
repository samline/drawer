import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Snapshot tests for the CSS contract of the drawer, post-F1
 * (1:1 with vaul upstream). The base rule now declares
 * `transition: transform 0.5s` and the close path relies on the
 * cascade `transform` change (0 → 100 %) being interpolated by
 * that base transition. The CSS `slideTo{X}` animation has an
 * explicit `from: 0` so it acts as a `forwards` fill-mode anchor.
 *
 * The previous F1b fix scoped the `transition` to
 * `[data-state="open"]` only and used a JS-side `data-drawer-closing`
 * flag to override the static off-screen transform. The new
 * approach is 1:1 with vaul: the base `transition` runs the close
 * interpolation, no JS-side flag needed.
 */

const CSS = readFileSync(resolve(__dirname, '..', 'src', 'style.css'), 'utf8')
const CSS_DIST = readFileSync(resolve(__dirname, '..', 'dist', 'style.css'), 'utf8')

describe('style.css — animation / transition contract', () => {
  it('base [data-drawer] rule DOES declare `transition: transform 0.5s` (1:1 with vaul upstream)', () => {
    const baseRuleMatch = CSS.match(/\[data-drawer\]\s*\{[^}]*\}/)
    expect(baseRuleMatch, 'expected a [data-drawer] base rule in style.css').not.toBeNull()
    const baseRule = baseRuleMatch![0]
    expect(baseRule).toMatch(
      /transition\s*:\s*transform\s+0\.5s\s+cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)/
    )
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

  it('slideToX keyframes have an explicit `from: translate3d(..., 0, ...)` (open position) so the close animation has a clean start frame', () => {
    // The `from` matters because the close path no longer has a JS
    // override; the `slideToX` keyframe must declare both endpoints
    // explicitly. The `forwards` fill-mode on the `[data-state="closed"]`
    // rule anchors the post-transition cascade.
    expect(CSS).toMatch(/@keyframes\s+slideToBottom\s*\{[^}]*from\s*\{[^}]*transform\s*:\s*translate3d\(0,\s*0,\s*0\)/)
    expect(CSS).toMatch(/@keyframes\s+slideToTop\s*\{[^}]*from\s*\{[^}]*transform\s*:\s*translate3d\(0,\s*0,\s*0\)/)
    expect(CSS).toMatch(/@keyframes\s+slideToLeft\s*\{[^}]*from\s*\{[^}]*transform\s*:\s*translate3d\(0,\s*0,\s*0\)/)
    expect(CSS).toMatch(/@keyframes\s+slideToRight\s*\{[^}]*from\s*\{[^}]*transform\s*:\s*translate3d\(0,\s*0,\s*0\)/)
  })

  describe('dist/style.css (compiled bundle — what the consumer actually loads)', () => {
    it('has the same close-path contract as src/style.css', () => {
      // Base rule has the transform transition.
      expect(CSS_DIST).toMatch(/\[data-drawer\][^}]*transition\s*:\s*transform/m)
      // No `data-drawer-closing` flag in the compiled bundle.
      expect(CSS_DIST).not.toMatch(/data-drawer-closing/)
      // The `[data-state="closed"]` rule still has the `forwards` fill-mode.
      expect(CSS_DIST).toMatch(/\[data-state=['"]closed['"]\][^}]*animation-fill-mode\s*:\s*forwards/)
    })
  })
})
