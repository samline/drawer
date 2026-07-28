import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * G1 + G2 audit (1:1 vs vaul upstream): horizontal direction
 * (left/right) must translate on the X axis, not Y.
 *
 * vaul `style.css:45-51` (snap-points):
 *   [data-vaul-drawer][data-vaul-drawer-direction='left'] {
 *     transform: translate3d(calc(var(--initial-transform, 100%) * -1), 0, 0);
 *   }
 *
 * vaul `style.css:237-256` (slideToLeft/Right keyframes):
 *   @keyframes slideToLeft {
 *     to { transform: translate3d(calc(var(--initial-transform, 100%) * -1), 0, 0); }
 *   }
 *
 * The drawer originally used the Y axis (0, dy, 0) for both,
 * which is wrong for horizontal drawers.
 *
 * Note: `var(--initial-transform, 100%)` contains a literal comma
 * inside the `var()` fallback, so the regex can't use `[^,]+`.
 * We use `[\s\S]+?` (non-greedy any-character) instead.
 */
describe('horizontal direction CSS (G1 + G2)', () => {
  const css = readFileSync(join(__dirname, '..', 'src', 'style.css'), 'utf-8')

  it('snap-points left/right rules translate on the X axis (G1)', () => {
    const leftMatch = css.match(
      /\[data-drawer\]\[data-drawer-snap-points='true'\]\[data-drawer-direction='left'\][\s\S]*?\{[\s\S]*?\}/
    )
    const rightMatch = css.match(
      /\[data-drawer\]\[data-drawer-snap-points='true'\]\[data-drawer-direction='right'\][\s\S]*?\{[\s\S]*?\}/
    )
    expect(leftMatch, 'snap-points left rule missing').toBeTruthy()
    expect(rightMatch, 'snap-points right rule missing').toBeTruthy()
    // X axis: `translate3d(<expr>, 0, 0)`. Y axis: `translate3d(0, <expr>, 0)`.
    expect(leftMatch![0]).toMatch(/translate3d\(.*?,\s*0,\s*0\)/s)
    expect(rightMatch![0]).toMatch(/translate3d\(.*?,\s*0,\s*0\)/s)
  })

  it('slideToLeft/Right keyframes translate on the X axis (G2)', () => {
    const leftToMatch = css.match(/@keyframes slideToLeft\s*\{[\s\S]*?\}/)
    const rightToMatch = css.match(/@keyframes slideToRight\s*\{[\s\S]*?\}/)
    expect(leftToMatch, 'slideToLeft keyframe missing').toBeTruthy()
    expect(rightToMatch, 'slideToRight keyframe missing').toBeTruthy()
    expect(leftToMatch![0]).toMatch(/translate3d\(.*?,\s*0,\s*0\)/s)
    expect(rightToMatch![0]).toMatch(/translate3d\(.*?,\s*0,\s*0\)/s)
  })

  it('slideFromLeft/Right keyframes translate on the X axis (G2)', () => {
    const leftFromMatch = css.match(/@keyframes slideFromLeft\s*\{[\s\S]*?\}/)
    const rightFromMatch = css.match(/@keyframes slideFromRight\s*\{[\s\S]*?\}/)
    expect(leftFromMatch, 'slideFromLeft keyframe missing').toBeTruthy()
    expect(rightFromMatch, 'slideFromRight keyframe missing').toBeTruthy()
    expect(leftFromMatch![0]).toMatch(/translate3d\(.*?,\s*0,\s*0\)/s)
    expect(rightFromMatch![0]).toMatch(/translate3d\(.*?,\s*0,\s*0\)/s)
  })
})
