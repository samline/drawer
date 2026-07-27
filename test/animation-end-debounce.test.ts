import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { configureDrawer, createDrawer, destroyDrawer, destroyDrawers } from '../src/runtime/registry'

/**
 * F5/F17: `onAnimationEnd` debounce.
 *
 * A quick open→close→open sequence should fire only the LATEST
 * `onAnimationEnd` callback, not all of them within ~500ms.
 * Consumers use this callback to clean up external state
 * (e.g. removing a `body.modal-open` class), so firing multiple
 * callbacks in the wrong order breaks the cleanup contract.
 */
describe('onAnimationEnd debounce (F5/F17)', () => {
  beforeEach(() => {
    destroyDrawers()
  })

  afterEach(() => {
    destroyDrawers()
    vi.useRealTimers()
  })

  it('only fires the latest onAnimationEnd when state changes rapidly', () => {
    vi.useFakeTimers()

    const onAnimationEnd = vi.fn()
    const drawer = createDrawer({
      id: 'f5-rapid',
      onAnimationEnd
    })

    drawer.setOpen(true)
    drawer.setOpen(false)
    drawer.setOpen(true)
    drawer.setOpen(false)
    drawer.setOpen(true)
    vi.runAllTimers()

    // Only the LAST onAnimationEnd (open=true) should have fired.
    expect(onAnimationEnd).toHaveBeenCalledTimes(1)
    expect(onAnimationEnd).toHaveBeenNthCalledWith(1, true)
  })

  it('cancels a pending onAnimationEnd when the drawer is destroyed', () => {
    vi.useFakeTimers()

    const onAnimationEnd = vi.fn()
    createDrawer({
      id: 'f5-destroy',
      onAnimationEnd
    }).setOpen(true)

    destroyDrawer('f5-destroy')
    vi.runAllTimers()

    // The destroy cancels the pending callback, so it should NOT
    // fire for a destroyed drawer.
    expect(onAnimationEnd).not.toHaveBeenCalled()
  })

  it('does not cancel onAnimationEnd on re-render (bindTriggerElement is called on every render)', () => {
    vi.useFakeTimers()

    const onAnimationEnd = vi.fn()
    const drawer = createDrawer({
      id: 'f5-rerender',
      onAnimationEnd
    })

    drawer.setOpen(true)
    // The render that follows setOpen(true) calls
    // bindTriggerElement → cleanupRuntimeTrigger. That helper
    // must NOT cancel the pending onAnimationEnd timer.
    vi.runAllTimers()

    expect(onAnimationEnd).toHaveBeenCalledTimes(1)
    expect(onAnimationEnd).toHaveBeenNthCalledWith(1, true)
  })

  it('configureDrawer + setOpen also debounces', () => {
    vi.useFakeTimers()

    const onAnimationEnd = vi.fn()
    const drawer = configureDrawer({
      id: 'f5-configure',
      onAnimationEnd
    })

    drawer.setOpen(true)
    drawer.setOpen(false)
    vi.runAllTimers()

    expect(onAnimationEnd).toHaveBeenCalledTimes(1)
    expect(onAnimationEnd).toHaveBeenNthCalledWith(1, false)
  })
})
