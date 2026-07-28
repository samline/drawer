import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

describe('multi-drawer lifecycle', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('closes only the most recently opened drawer on Escape', () => {
    const first = createDrawer({ id: 'escape-first', content: 'First' })
    const second = createDrawer({ id: 'escape-second', content: 'Second' })

    second.setOpen(true)
    first.setOpen(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))

    expect(first.getSnapshot().state.isOpen).toBe(false)
    expect(second.getSnapshot().state.isOpen).toBe(true)
  })

  it('keeps an initially open nested child above its opened ancestors', () => {
    const parent = createDrawer({ id: 'nested-parent', content: 'Parent' })
    const child = createDrawer({ id: 'nested-child', parentId: 'nested-parent', open: true, content: 'Child' })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))

    expect(child.getSnapshot().state.isOpen).toBe(false)
    expect(parent.getSnapshot().state.isOpen).toBe(true)
  })

  it('orders a drawer opened from onOpenChange above its caller', () => {
    const second = createDrawer({ id: 'reentrant-second', content: 'Second' })
    const first = createDrawer({
      id: 'reentrant-first',
      content: 'First',
      onOpenChange(open) {
        if (open) second.setOpen(true)
      }
    })

    first.setOpen(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))

    expect(second.getSnapshot().state.isOpen).toBe(false)
    expect(first.getSnapshot().state.isOpen).toBe(true)
  })

  it('does not promote a background drawer when it remounts', () => {
    const first = createDrawer({ id: 'remount-first', open: true, content: 'First' })
    const second = createDrawer({ id: 'remount-second', open: true, content: 'Second' })

    first.update({ content: 'Updated first' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))

    expect(second.getSnapshot().state.isOpen).toBe(false)
    expect(first.getSnapshot().state.isOpen).toBe(true)
  })

  it('restores focus through a three-drawer stack', () => {
    const firstButton = document.createElement('button')
    const secondButton = document.createElement('button')
    const thirdButton = document.createElement('button')
    const first = createDrawer({ id: 'focus-first', content: firstButton })
    const second = createDrawer({ id: 'focus-second', content: secondButton })
    const third = createDrawer({ id: 'focus-third', content: thirdButton })

    first.setOpen(true)
    firstButton.focus()
    second.setOpen(true)
    secondButton.focus()
    third.setOpen(true)
    thirdButton.focus()

    third.setOpen(false)
    expect(document.activeElement).toBe(secondButton)
    second.setOpen(false)
    expect(document.activeElement).toBe(firstButton)
  })

  it('keeps drawers isolated when they share a custom container', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const first = createDrawer({ id: 'container-first', container, open: true, content: 'First' })
    createDrawer({ id: 'container-second', container, open: true, content: 'Second' })

    expect(container.querySelectorAll('[data-drawer-vanilla-root]').length).toBe(2)
    first.destroy()
    expect(container.querySelector('[data-drawer-id="container-second"]')?.getAttribute('data-state')).toBe('open')
  })

  it('cancels stale close removal when reopened', () => {
    vi.useFakeTimers()
    const drawer = createDrawer({ id: 'rapid-reopen', open: true, content: 'Body' })

    drawer.setOpen(false)
    vi.advanceTimersByTime(300)
    drawer.setOpen(true)
    vi.advanceTimersByTime(301)

    expect(document.querySelector('[data-drawer-id="rapid-reopen"]')?.getAttribute('data-state')).toBe('open')
  })

  it('reconciles the built-in trigger while the drawer is exiting', () => {
    vi.useFakeTimers()
    const drawer = createDrawer({ id: 'trigger-exit', triggerText: 'Open', open: true, content: 'Body' })

    drawer.setOpen(false)
    drawer.update({ triggerText: 'Open again' })
    expect(document.querySelectorAll('[data-drawer-vanilla-trigger]').length).toBe(1)
    expect(document.querySelector('[data-drawer-vanilla-trigger]')?.textContent).toBe('Open again')

    drawer.update({ triggerText: '' })
    vi.advanceTimersByTime(601)
    expect(document.querySelector('[data-drawer-vanilla-trigger]')).toBeNull()
  })

  it('keeps runtime and controller options synchronized on no-op writes', () => {
    const drawer = createDrawer({ id: 'no-op-open', open: false })
    const listener = vi.fn()
    const unsubscribe = drawer.subscribe(listener)
    const callsBeforeWrite = listener.mock.calls.length

    drawer.setOpen(false)

    expect(drawer.options.open).toBe(false)
    expect(drawer.getSnapshot().options.open).toBe(false)
    expect(listener).toHaveBeenCalledTimes(callsBeforeWrite + 1)
    unsubscribe()
  })
})
