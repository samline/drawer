import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression test for the close animation.
 *
 * Bug (v3.0.0-beta.3): closing a drawer did not play the CSS
 * `slideTo{X}` animation — the drawer vanished instantly. The root
 * cause was that `mountVanillaDialog` ALWAYS called `teardownMount`
 * before re-mounting, so the close path went through:
 *   1. `applyOpenState(false)` — flips `data-state` to "closed"
 *   2. `teardownMount` — REMOVES the open elements from the DOM
 *   3. New mount — creates fresh elements with `data-state="closed"`
 *      AND the static off-screen `transform` rule applies → drawer is
 *      off-screen from the very first frame.
 * The CSS animation never plays because the open element is destroyed
 * before it can transition.
 *
 * Fix: when the existing mount is already in `data-state="open"` and
 * the new state is just `false`, keep the DOM and flip `data-state`
 * with a transient `data-drawer-closing` flag. The flag tells the
 * CSS to drop the static off-screen transform for the duration of
 * the animation, so `slideTo{X}` has a clean start frame (the open
 * position). After `animationend` the flag is cleared (the animation's
 * `forwards` fill-mode is already holding the closed position) and
 * the DOM is finally torn down.
 */

describe('close animation', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('sets data-drawer-closing on the open→close transition so the slide plays', () => {
    const drawer = createDrawer({
      id: 'close-anim',
      direction: 'right',
      title: 'Close anim',
      content: 'Body'
    })
    drawer.setOpen(true)

    const content = document.querySelector('[data-drawer]') as HTMLElement
    expect(content.dataset.state).toBe('open')
    expect(content.dataset.drawerClosing).toBeUndefined()

    drawer.setOpen(false)

    // The drawer is still mounted (the close animation needs it) but
    // data-state has flipped to "closed" and data-drawer-closing is
    // set so the static off-screen transform is overridden.
    expect(content.dataset.state).toBe('closed')
    expect(content.dataset.drawerClosing).toBe('true')
  })

  it('does not set data-drawer-closing when the dialog is mounted closed from the start (no flicker)', () => {
    // A drawer created with `open: false` (or never opened) stays
    // off-screen via the static transform rule. The
    // `data-drawer-closing` flag is only set during the open→close
    // transition; it must NOT be set on the initial mount because
    // that would override the static transform and reintroduce the
    // flicker bug fixed in 3038ab4.
    const drawer = createDrawer({
      id: 'init-closed',
      direction: 'right',
      title: 'Init closed',
      content: 'Body'
    })
    expect(drawer.getSnapshot().state.isOpen).toBe(false)

    const content = document.querySelector('[data-drawer]') as HTMLElement
    expect(content.dataset.state).toBe('closed')
    expect(content.dataset.drawerClosing).toBeUndefined()
  })

  it('the open animation (slideFromRight) still plays on the initial mount', () => {
    // Sanity check: the original "open" animation is unaffected.
    // The drawer is created closed; `setOpen(true)` flips it to
    // open and the slide-from animation runs.
    const drawer = createDrawer({
      id: 'open-anim',
      direction: 'right',
      title: 'Open anim',
      content: 'Body'
    })

    const before = document.querySelector('[data-drawer]') as HTMLElement
    expect(before.dataset.state).toBe('closed')
    expect(before.dataset.drawerClosing).toBeUndefined()

    drawer.setOpen(true)
    // setOpen(true) tears down + re-mounts, so we need to query
    // the new element. The new mount starts with `data-state='open'`
    // directly (no `data-drawer-closing` flag — that flag is only
    // set during the open→close path).
    const after = document.querySelector('[data-drawer]') as HTMLElement
    expect(after.dataset.state).toBe('open')
    expect(after.dataset.drawerClosing).toBeUndefined()
  })

  it('clears data-drawer-closing once the close animation ends (or after the safety timeout)', () => {
    const drawer = createDrawer({
      id: 'clear-closing',
      direction: 'right',
      title: 'Clear closing',
      content: 'Body'
    })
    drawer.setOpen(true)
    drawer.setOpen(false)

    const content = document.querySelector('[data-drawer]') as HTMLElement
    expect(content.dataset.drawerClosing).toBe('true')

    // jsdom does not run CSS animations, so `animationend` never
    // fires. The runtime's safety timeout (animationDuration +
    // 100 ms, defaulting to 600 ms) is what clears the flag.
    return new Promise<void>(resolve => {
      window.setTimeout(() => {
        expect(content.dataset.drawerClosing).toBeUndefined()
        resolve()
      }, 800)
    })
  })

  it('torn-down only after the close animation (jsdom safety timeout)', () => {
    const drawer = createDrawer({
      id: 'teardown-timing',
      direction: 'right',
      title: 'Teardown timing',
      content: 'Body'
    })
    drawer.setOpen(true)
    drawer.setOpen(false)

    // Immediately after close, the drawer is still in the DOM
    // (the close animation needs the element to interpolate).
    expect(document.querySelector('[data-drawer]')).not.toBeNull()

    return new Promise<void>(resolve => {
      window.setTimeout(() => {
        // After the safety timeout, the drawer is fully removed.
        expect(document.querySelector('[data-drawer]')).toBeNull()
        resolve()
      }, 800)
    })
  })
})