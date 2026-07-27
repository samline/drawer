import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression tests for the `[data-drawer]` wrapper accumulation
 * caused by the overlay's `mouseup` listener re-running
 * `renderVanillaDrawer` unconditionally on every event.
 *
 * The overlay is mounted at create time so the dismiss-on-outside
 * listener can be attached from the start. When the user clicks
 * the overlay, the listener calls `onOpenChange(false)`. The
 * registry's `onOpenChange` callback in turn calls
 * `renderVanillaDrawer(id)` **every** time, even when the state
 * did not actually change (e.g. the overlay is already
 * `data-state="closed"`). Combined with the previous bug where
 * `teardownMount` did not remove the `[data-drawer]` content
 * element, every `mouseup` leaks a new wrapper.
 *
 * Part 1 of the fix removes the redundant `renderVanillaDrawer`
 * call in the `onOpenChange` callback. Part 2 (already in place
 * via `6c4ec4c`) makes `teardownMount` remove the content
 * element. Together they guarantee that repeated `mouseup`
 * events on a closed overlay never accumulate wrappers.
 *
 * See `.agents/issues/2026-07-25-overlay-mouseup-accumulation-not-fixed.md`
 * for the full bug report.
 */

describe('overlay mouseup listener does not accumulate [data-drawer] wrappers', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('mounts exactly one [data-drawer] wrapper at create time', () => {
    createDrawer({
      id: 'mount-once',
      direction: 'right',
      content: 'body'
    })

    expect(document.querySelectorAll('[data-drawer]').length).toBe(1)
  })

  it('does not accumulate [data-drawer] wrappers after 10 mouseup events on the overlay', async () => {
    createDrawer({
      id: 'mouseup-no-leak',
      direction: 'right',
      content: 'body'
    })

    const initialCount = document.querySelectorAll('[data-drawer]').length
    expect(initialCount).toBe(1)

    const overlay = document.querySelector('[data-drawer-overlay]') as HTMLElement | null
    expect(overlay).not.toBeNull()

    for (let i = 0; i < 10; i++) {
      overlay!.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }))
      // Yield to the microtask queue so the controller state updates
      // and any queued renders run before the next mouseup.
      await new Promise<void>((resolve) => setTimeout(resolve, 5))
    }

    expect(document.querySelectorAll('[data-drawer]').length).toBe(initialCount)
  })

  it('does not accumulate [data-drawer] wrappers across 5 open/close cycles via overlay click', async () => {
    const drawer = createDrawer({
      id: 'cycle-no-leak',
      direction: 'right',
      content: 'body'
    })

    const overlay = document.querySelector('[data-drawer-overlay]') as HTMLElement | null
    expect(overlay).not.toBeNull()

    for (let i = 0; i < 5; i++) {
      drawer.setOpen(true)
      await new Promise<void>((resolve) => setTimeout(resolve, 5))
      // Click on the overlay (mouseup is the trigger that dismisses).
      overlay!.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }))
      await new Promise<void>((resolve) => setTimeout(resolve, 5))
    }

    expect(document.querySelectorAll('[data-drawer]').length).toBe(1)
  })

  it('re-renders the [data-drawer] data-state on dismiss via overlay mouseup', async () => {
    // Regression guard: the `onOpenChange` callback in
    // `renderVanillaDrawer` is invoked by `mouseup` / `Escape` /
    // drag-close. The trailing `renderVanillaDrawer(id)` call in
    // that callback is what actually re-renders the dialog DOM
    // (the `runtime.controller.setOpen(open)` it wraps is a
    // low-level state change and does NOT re-render by itself).
    // Removing that trailing render — as `efad4c0` proposed for
    // the controller's `setOpen` — would leave the `data-state`
    // attribute stuck on `"open"` after the user dismissed the
    // drawer, and body-scroll / focus / aria would never recover.
    // This test pins both halves of the fix together: the DOM
    // does update, AND the wrapper count does not leak.
    const drawer = createDrawer({
      id: 'dismiss-renders',
      direction: 'right',
      content: 'body'
    })

    // Helper: each re-render replaces the `[data-drawer]` element
    // (teardownMount removes the previous content node from the
    // DOM, see Part 2 of the fix). Re-query on every assertion so
    // we are always looking at the live element.
    const queryContent = () => document.querySelector('[data-drawer]') as HTMLElement | null
    const queryOverlay = () => document.querySelector('[data-drawer-overlay]') as HTMLElement | null

    expect(queryContent()?.getAttribute('data-state')).toBe('closed')
    expect(queryOverlay()).not.toBeNull()

    drawer.setOpen(true)
    await new Promise<void>((resolve) => setTimeout(resolve, 5))
    expect(queryContent()?.getAttribute('data-state')).toBe('open')

    queryOverlay()!.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }))
    await new Promise<void>((resolve) => setTimeout(resolve, 5))
    // After dismiss the data-state must be `closed` again — proves
    // the dismiss path re-rendered the dialog.
    expect(queryContent()?.getAttribute('data-state')).toBe('closed')
    // And the wrapper count must remain at 1.
    expect(document.querySelectorAll('[data-drawer]').length).toBe(1)
  })
})
