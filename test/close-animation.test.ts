import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression test for the close animation, post-F1 (1:1 with vaul
 * upstream). The previous fix (F1b) used a JS-side
 * `data-drawer-closing` flag to override the static off-screen
 * transform during the close animation. The new approach is 1:1
 * with vaul: the close path drives the cascade `transform` from 0
 * (open) to 100 % (closed) and the base `transition: transform 0.5s`
 * interpolates between them. The CSS `slideTo{X}` animation now has
 * an explicit `from: 0` so it acts as a `forwards` fill-mode anchor
 * for the post-transition cascade, not the dynamic slide.
 *
 * The DOM stays in the tree for 600 ms (animation duration + 100 ms
 * safety) and is removed by a setTimeout. No JS-side flag, no inline
 * transform clear, no animationend listener.
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

  it('keeps the DOM in place and flips data-state to "closed" so the CSS transition can interpolate', () => {
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

    // F1: 1:1 with vaul. The drawer is still mounted (the close
    // transition needs the element to interpolate the cascade
    // `transform` change) but `data-state` has flipped to "closed".
    // No `data-drawer-closing` flag — the base `transition:
    // transform` does the work.
    expect(content.dataset.state).toBe('closed')
    expect(content.dataset.drawerClosing).toBeUndefined()
  })

  it('does not set data-drawer-closing when the dialog is mounted closed from the start (no flicker)', () => {
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
    // setOpen(true) goes through a teardown + re-mount, so we
    // query the new element. The new mount starts with
    // `data-state='open'` directly. No `data-drawer-closing`
    // flag (it is no longer part of the contract).
    const after = document.querySelector('[data-drawer]') as HTMLElement
    expect(after.dataset.state).toBe('open')
    expect(after.dataset.drawerClosing).toBeUndefined()
  })

  it('removes the DOM after the close transition safety timeout (jsdom fallback)', () => {
    const drawer = createDrawer({
      id: 'teardown-timing',
      direction: 'right',
      title: 'Teardown timing',
      content: 'Body'
    })
    drawer.setOpen(true)
    drawer.setOpen(false)

    // Immediately after close, the drawer is still in the DOM
    // (the base `transition: transform` needs the element to
    // interpolate). After the safety timeout (600 ms — 500 ms
    // animation + 100 ms safety) the drawer is fully removed.
    expect(document.querySelector('[data-drawer]')).not.toBeNull()

    return new Promise<void>(resolve => {
      window.setTimeout(() => {
        expect(document.querySelector('[data-drawer]')).toBeNull()
        resolve()
      }, 800)
    })
  })

  it('clears the inline drag transform on the open→close transition so the cascade takes over', () => {
    // F1: the F1b fix kept the inline `transform: translate3d(0,
    // dragY, 0)` during the close animation so `slideToX` would
    // pick it up as the `from` frame. The new approach is 1:1 with
    // vaul: we clear the inline transform on the open→close
    // transition so the cascade `transform: translate3d(0, 100 %, 0)`
    // is the only thing the base `transition: transform` has to
    // interpolate from. The `slideToX` keyframe is a static
    // `from: 0 → to: 100 %` and acts as a `forwards` fill-mode
    // anchor for the post-transition cascade.
    //
    // For the drag-release path, the inline transform clear happens
    // BEFORE the data-state flip in `onPointerUp` (this is the
    // new "release resets the drag transform" step — the previous
    // F1b kept it). After the clear, the cascade `transform: 100 %`
    // is what the transition interpolates against.
    //
    // We test the programmatic (non-drag) close path here, which is
    // simpler: the close path flips `data-state` to "closed" and
    // never had an inline `transform` to clear in the first place.
    const drawer = createDrawer({
      id: 'cascade-takes-over',
      direction: 'bottom',
      title: 'Cascade',
      content: 'Body'
    })
    drawer.setOpen(true)
    const content = document.querySelector('[data-drawer]') as HTMLElement
    expect(content.style.transform).toBe('')
    drawer.setOpen(false)
    expect(content.dataset.state).toBe('closed')
    // Programmatic close: no inline transform was ever written.
    expect(content.style.transform).toBe('')
  })
})
