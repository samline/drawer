import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * F18 — cleanup exception isolation in teardownMount.
 *
 * Bug (v3.0.0 / v3.0.1): `teardownMount` ran `state.cleanups` in a
 * for-loop and assigned `state.cleanups = []` immediately after.
 * If any `removeEventListener` callback threw (e.g. the element
 * was already null because a partial teardown had cleared it),
 * the for-loop aborted, the rest of the cleanups did not run,
 * AND the `state.cleanups = []` write never happened. The
 * orphaned listeners (mouseup, pointerdown, click, resize,
 * visualViewport.resize) kept the `state` object alive via
 * closure capture until the next `destroyDrawer` or page
 * reload — a silent memory leak that grew on every partial-
 * teardown race (open → close → reopen within the 600 ms
 * removeDom safety window).
 *
 * Fix (v3.1.0): each cleanup runs inside its own try-catch. A
 * thrown cleanup logs a warning and lets the teardown continue.
 * `state.cleanups` is always cleared, and the downstream
 * `cleanupDragGesture` / `cleanupBuiltInTrigger` are also wrapped.
 *
 * These tests assert the contract:
 *   - A throw in the middle of the cleanup loop does not propagate
 *     to the caller of `setOpen(false)` / `destroyDrawer`.
 *   - The teardown completes its downstream responsibilities
 *     (body scroll lock release, focus restoration) even when a
 *     cleanup throws.
 *   - A subsequent open + close cycle on the same drawer works
 *     without "Cannot read properties of null" surfacing, which
 *     would indicate the previous teardown left a half-cleared
 *     state.
 */

describe('teardownMount isolates cleanup exceptions (F18)', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('does not throw when a state.cleanups callback throws', () => {
    // Silence the warning that the throw path now emits. We
    // assert the no-throw contract, not the warn — the warn is
    // a developer aid, the no-throw is the contract.
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const drawer = createDrawer({ id: 'cleanup-throw', open: true, content: 'Body' })
    const content = document.querySelector('[data-drawer]') as HTMLElement
    expect(content).toBeTruthy()

    // Patch the content's `removeEventListener` to throw on the
    // first call (simulating a detached / null element). The
    // teardown runs the content's pointerdown cleanup which
    // calls `content.removeEventListener('pointerdown', ...)`.
    const originalRemove = content.removeEventListener.bind(content)
    vi.spyOn(content, 'removeEventListener').mockImplementation(((
      type: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => {
      if (type === 'pointerdown') {
        throw new TypeError('simulated: element detached')
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalRemove as any)(type, ...args)
    }) as typeof content.removeEventListener)

    // The close path runs teardownMount. It must not throw to
    // the caller.
    expect(() => drawer.setOpen(false)).not.toThrow()
  })

  it('still releases the body scroll lock when a cleanup throws', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const drawer = createDrawer({ id: 'cleanup-throw-body', open: true, content: 'Body' })
    const content = document.querySelector('[data-drawer]') as HTMLElement
    expect(content).toBeTruthy()

    // The body overflow should be `hidden` while the modal
    // drawer is open. (lockBodyScrollDesktop on the desktop
    // baseline.)
    expect(document.body.style.overflow).toBe('hidden')

    const originalRemove = content.removeEventListener.bind(content)
    vi.spyOn(content, 'removeEventListener').mockImplementation(((
      type: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => {
      if (type === 'pointerdown') {
        throw new TypeError('simulated: element detached')
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalRemove as any)(type, ...args)
    }) as typeof content.removeEventListener)

    expect(() => drawer.setOpen(false)).not.toThrow()

    // The body scroll lock should be released even though a
    // cleanup threw. If teardownMount had aborted before
    // reaching `state.unlockBodyScroll?.()`, overflow would
    // still be 'hidden'.
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('clears state.cleanups so a subsequent mount does not double-remove', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const drawer = createDrawer({ id: 'cleanup-clear', open: true, content: 'Body' })
    const content = document.querySelector('[data-drawer]') as HTMLElement
    const originalRemove = content.removeEventListener.bind(content)
    let pointerdownCallCount = 0
    vi.spyOn(content, 'removeEventListener').mockImplementation(((
      type: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => {
      if (type === 'pointerdown') {
        pointerdownCallCount++
        throw new TypeError('simulated')
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalRemove as any)(type, ...args)
    }) as typeof content.removeEventListener)

    drawer.setOpen(false)
    // The first close threw on the pointerdown cleanup. If
    // state.cleanups had NOT been cleared, the second open
    // would re-run the same cleanup (and throw again).
    expect(pointerdownCallCount).toBe(1)

    // Second open: should not re-run the old cleanup.
    expect(() => drawer.setOpen(true)).not.toThrow()
    expect(pointerdownCallCount).toBe(1)

    // The content element is a new instance after the
    // re-mount; the old element is detached. The new element
    // has its own removeEventListener (not the spy).
    const newContent = document.querySelector('[data-drawer]') as HTMLElement
    expect(newContent).toBeTruthy()
    expect(newContent).not.toBe(content)

    // Second close: cleanups run on the NEW content. The
    // pointerdownCallCount should NOT increment (the spy is
    // on the old content's prototype method, not the new one).
    expect(() => drawer.setOpen(false)).not.toThrow()
    expect(pointerdownCallCount).toBe(1)
  })

  it('isolates exceptions in cleanupBuiltInTrigger on close', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const drawer = createDrawer({
      id: 'cleanup-built-in-trigger',
      open: true,
      triggerText: 'Open',
      content: 'Body'
    })
    const trigger = document.querySelector('[data-drawer-vanilla-trigger]') as HTMLButtonElement
    expect(trigger).toBeTruthy()

    // The built-in trigger's cleanup removes mousedown + click
    // listeners. Patch to throw on all calls.
    vi.spyOn(trigger, 'removeEventListener').mockImplementation((() => {
      throw new TypeError('simulated: trigger detached')
    }) as typeof trigger.removeEventListener)

    expect(() => drawer.setOpen(false)).not.toThrow()
  })

  it('isolates exceptions in cleanupDragGesture when close interrupts an in-flight drag', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const drawer = createDrawer({ id: 'cleanup-drag-gesture', open: true, content: 'Body' })
    const content = document.querySelector('[data-drawer]') as HTMLElement
    expect(content).toBeTruthy()

    // Start a drag (pointerdown + pointermove) but DO NOT
    // dispatch pointerup. The gesture is in-flight when we
    // close the drawer, so cleanupDragGesture is the active
    // function pointer (not null).
    content.dispatchEvent(
      Object.assign(new window.Event('pointerdown', { bubbles: true }), {
        clientX: 50,
        clientY: 50,
        pointerId: 1
      })
    )
    content.dispatchEvent(
      Object.assign(new window.Event('pointermove', { bubbles: true }), {
        clientX: 100,
        clientY: 50,
        pointerId: 1
      })
    )

    // Patch the content's removeEventListener so the
    // gesture-listener cleanup throws.
    const originalRemove = content.removeEventListener.bind(content)
    vi.spyOn(content, 'removeEventListener').mockImplementation(((
      type: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => {
      if (type === 'pointermove' || type === 'pointerup' || type === 'pointerout') {
        throw new TypeError('simulated: element detached')
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (originalRemove as any)(type, ...args)
    }) as typeof content.removeEventListener)

    expect(() => drawer.setOpen(false)).not.toThrow()
  })
})
