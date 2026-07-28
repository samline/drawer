import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression test for the close animation, post-F1 (1:1 with vaul
 * upstream). The previous fix (F1b) used a JS-side
 * `data-drawer-closing` flag to override the static off-screen
 * transform during the close animation. The new approach is 1:1
 * with vaul: the close path drives the cascade `transform` from 0
 * (open) to 100 % (closed) and the base `transition: transform 0.5s`
 * interpolates between them. The CSS `slideTo{X}` animation leaves
 * its `from` frame implicit so a drag-close starts at the actual
 * release position instead of jumping back to fully open.
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

    expect(document.querySelector('[data-drawer]')).toBeNull()
    expect(document.querySelector('[data-drawer-overlay]')).toBeNull()
  })

  it('the open animation (slideFromRight) still plays on the initial mount', () => {
    const drawer = createDrawer({
      id: 'open-anim',
      direction: 'right',
      title: 'Open anim',
      content: 'Body'
    })

    expect(document.querySelector('[data-drawer]')).toBeNull()

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

    return new Promise<void>((resolve) => {
      window.setTimeout(() => {
        expect(document.querySelector('[data-drawer]')).toBeNull()
        resolve()
      }, 800)
    })
  })

  it('seeds the open transform for a programmatic close animation', () => {
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
    expect(content.style.transform).toBe('translate3d(0, 0px, 0)')
    expect(content.style.transition).toBe('none')
  })

  it('moves directly to the closed endpoint when animation is disabled', () => {
    const drawer = createDrawer({ id: 'close-no-animation', open: true, direction: 'left', content: 'Body' })
    const content = document.querySelector('[data-drawer]') as HTMLElement
    content.dataset.drawerAnimate = 'false'

    drawer.setOpen(false)

    expect(content.style.transform).toBe('translate3d(-100%, 0, 0)')
    expect(content.style.transition).toBe('none')
  })
})
