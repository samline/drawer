import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression tests for the `pointer-events: none` rule on the
 * closed-state overlay.
 *
 * The overlay element mounts at create time with
 * `data-state="closed"`. Its default `pointer-events: auto` makes
 * the invisible overlay capture every click on the page because
 * the consumer's CSS positions it at `position: fixed; inset: 0;
 * z-index: 100`. This test asserts the CSS bundle contains the
 * `pointer-events: none` rule for the closed state and that, once
 * the drawer is open, the rule no longer matches (so clicks on
 * the overlay dismiss the drawer as expected).
 *
 * See `.agents/issues/2026-07-25-overlay-closed-captures-clicks-pointer-events-not-none.md`
 * for the full bug report.
 */

function readSourceStylesheet(): string {
  return readFileSync(resolve(__dirname, '../src/style.css'), 'utf8')
}

describe('overlay closed-state pointer-events', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('declares `pointer-events: none` on the closed-state overlay rule', () => {
    const css = readSourceStylesheet()

    // Match the closed-state overlay rule (multi-line, attribute
    // selector) and assert it carries `pointer-events: none`.
    const closedRuleMatch = css.match(/\[data-drawer-overlay\]\[data-state=['"]closed['"]\]\s*\{[^}]*\}/m)
    expect(closedRuleMatch).not.toBeNull()

    const closedRuleBody = closedRuleMatch![0]
    expect(closedRuleBody).toMatch(/pointer-events\s*:\s*none/)
    expect(closedRuleBody).toMatch(/animation-name\s*:\s*fadeOut/)
    expect(closedRuleBody).toMatch(/animation-fill-mode\s*:\s*forwards/)
  })

  it('does not apply `pointer-events: none` to the open-state overlay rule', () => {
    const css = readSourceStylesheet()

    // The open-state overlay rule must NOT carry `pointer-events:
    // none` — when the drawer is open the user has to be able to
    // click the overlay to dismiss. The default value (`auto`) is
    // restored automatically once `data-state="open"` makes the
    // closed rule stop matching.
    //
    // The open-state rule carries an intermediate
    // `[data-drawer-snap-points='false']` attribute selector in
    // addition to `[data-state="open"]`, so the regex matches any
    // overlay rule whose final state attribute is `open`.
    const openRuleMatch = css.match(/\[data-drawer-overlay\][^{}]*\[data-state=['"]open['"]\]\s*\{[^}]*\}/m)
    expect(openRuleMatch).not.toBeNull()

    const openRuleBody = openRuleMatch![0]
    expect(openRuleBody).not.toMatch(/pointer-events/)
  })

  it('does not leave an invisible overlay mounted while closed', () => {
    createDrawer({
      id: 'overlay-closed-pe',
      direction: 'right',
      overlayClassName: 'consumer-overlay'
    })

    expect(document.querySelector('[data-drawer-overlay]')).toBeNull()
  })
})
