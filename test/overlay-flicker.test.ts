/**
 * Regression test for the initial-mount overlay flicker.
 *
 * Bug fixed in v3.0.0-beta.4 (intermittently reintroduced since beta.0): on
 * pages that mount drawers on load (the common eager-mount
 * pattern), the overlay was briefly visible — fading in from
 * opacity:1 to opacity:0 over 0.5s on every page load.
 *
 * Root cause: the package's `[data-state='closed']` rule sets
 * `opacity: 0`, but the package ALSO has a later rule
 * `[data-drawer-overlay][data-drawer-snap-points-overlay='true'] {
 * opacity: 1; }` with the SAME specificity (0,2,0). When
 * specificity ties, the LATER rule wins. The consumer's drawer
 * triggers `data-drawer-snap-points-overlay='true'` on every
 * mount (the runtime sets it whenever there are no snap-points),
 * so the later rule wins and the overlay starts at opacity:1.
 * The `fadeOut` animation then runs (with `forwards` fill-mode)
 * and fades the overlay to opacity:0 over 0.5s — the visible
 * flicker.
 *
 * Fix: a specificity-boosted companion selector
 * `[data-drawer-overlay][data-drawer-overlay][data-state='closed']`
 * (specificity 0,3,0) duplicates `data-drawer-overlay` so the
 * closed-state opacity wins regardless of source order.
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('overlay initial-mount flicker', () => {
  it('the closed-state rule has a specificity that beats the snap-points-overlay rule', () => {
    // Read the source stylesheet and assert the closed-state rule
    // has a specificity-boosted companion. This is a static-source
    // check because jsdom does not resolve specificity; the runtime
    // behaviour is verified end-to-end in the consumer's browser
    // (Playwright + real Chromium).
    const css = fs.readFileSync(path.resolve(__dirname, '../src/style.css'), 'utf8')
    // The companion must declare a higher-specificity selector
    // for the closed state. `[data-drawer-overlay][data-drawer-overlay][data-state='closed']`
    // is the documented pattern.
    expect(css).toMatch(/\[data-drawer-overlay\]\[data-drawer-overlay\]\[data-state=['"]closed['"]/)
  })

  it('the snap-points-overlay rule still wins for OPEN state (regression guard)', () => {
    // The same specificity ordering must keep the snap-points
    // overlay rule active when the drawer is open — we don't want
    // the boost to leak into the open state.
    const css = fs.readFileSync(path.resolve(__dirname, '../src/style.css'), 'utf8')
    // The snap-points-overlay rule must remain present.
    expect(css).toMatch(/\[data-drawer-overlay\]\[data-drawer-snap-points-overlay=['"]true['"]/)
    // The boost must NOT include the open state.
    expect(css).not.toMatch(/\[data-drawer-overlay\]\[data-drawer-overlay\]\[data-state=['"]open['"]/)
  })
})
