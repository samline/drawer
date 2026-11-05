import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'
import { getDragPermission, type DragScrollableAncestor } from '../src/runtime/drag-policy'

/**
 * Regression coverage for the 2026-11 runtime audit. Each block pins
 * one user-visible defect that previously shipped.
 */

const keydown = (target: EventTarget, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

const query = <T extends Element>(drawer: { element: HTMLElement | null }, selector: string) =>
  drawer.element?.querySelector<T>(selector) ?? null

afterEach(() => {
  destroyDrawers()
  document.body.innerHTML = ''
  Reflect.deleteProperty(window, 'visualViewport')
})

describe('overlay dismissal', () => {
  it('ignores a press that started inside the panel and was released over the overlay', () => {
    const drawer = createDrawer({ id: 'overlay-select', content: 'Selectable order number' })
    drawer.setOpen(true)
    const content = query<HTMLElement>(drawer, '[data-drawer]')!
    const overlay = query<HTMLElement>(drawer, '[data-drawer-overlay]')!

    content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    overlay.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(drawer.getSnapshot().state.isOpen).toBe(true)

    overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    overlay.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(drawer.getSnapshot().state.isOpen).toBe(false)
  })
})

describe('Escape during text composition', () => {
  it('keeps the drawer open while an IME composition consumes Escape', () => {
    const input = document.createElement('input')
    const drawer = createDrawer({ id: 'ime', content: () => input })
    drawer.setOpen(true)
    input.focus()

    keydown(input, { key: 'Escape', isComposing: true })
    expect(drawer.getSnapshot().state.isOpen).toBe(true)
    keydown(input, { key: 'Escape', keyCode: 229 })
    expect(drawer.getSnapshot().state.isOpen).toBe(true)

    keydown(input, { key: 'Escape' })
    expect(drawer.getSnapshot().state.isOpen).toBe(false)
  })
})

describe('focus trap boundaries', () => {
  it('ignores controls removed from the tab order when finding the last stop', () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <button type="button" id="only">Only stop</button>
      <button type="button" tabindex="-1">Programmatic only</button>
      <fieldset disabled><button type="button">Disabled by fieldset</button></fieldset>`
    const drawer = createDrawer({ id: 'trap', content: () => container })
    drawer.setOpen(true)
    const only = container.querySelector<HTMLButtonElement>('#only')!
    only.focus()

    const event = keydown(only, { key: 'Tab' })
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(only)
  })
})

describe('visually hidden slots', () => {
  it('applies white-space: nowrap to the hidden title', () => {
    const drawer = createDrawer({ id: 'hidden-title', title: 'Order details', titleVisuallyHidden: true })
    drawer.setOpen(true)
    const title = query<HTMLElement>(drawer, '[data-drawer-title]')!
    expect(title.style.whiteSpace).toBe('nowrap')
    expect(title.style.position).toBe('absolute')
  })
})

describe('built-in trigger state', () => {
  it('announces a dialog popup and reflects its expanded state', () => {
    const drawer = createDrawer({ id: 'built-in-trigger', triggerText: 'Open cart', content: 'Cart' })
    const trigger = query<HTMLButtonElement>(drawer, '[data-drawer-vanilla-trigger]')!
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    trigger.focus()
    trigger.click()
    expect(drawer.getSnapshot().state.isOpen).toBe(true)
    // The same button persists across renders instead of being recreated.
    expect(query(drawer, '[data-drawer-vanilla-trigger]')).toBe(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    drawer.setOpen(false)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })
})

describe('handle semantics', () => {
  it('hides a handle that cannot cycle from keyboard and assistive technology', () => {
    const drawer = createDrawer({ id: 'plain-handle', showHandle: true, content: 'Body' })
    drawer.setOpen(true)
    const handle = query<HTMLButtonElement>(drawer, '[data-drawer-handle]')!
    expect(handle.tabIndex).toBe(-1)
    expect(handle.getAttribute('aria-hidden')).toBe('true')
    expect(handle.hasAttribute('aria-label')).toBe(false)
  })

  it('keeps preventCycle handles out of the tab order', () => {
    const drawer = createDrawer({ id: 'locked-handle', showHandle: true, snapPoints: [0.4, 1], preventCycle: true })
    drawer.setOpen(true)
    expect(query<HTMLButtonElement>(drawer, '[data-drawer-handle]')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('exposes a named button when the handle cycles snap points', () => {
    const drawer = createDrawer({ id: 'snap-handle', showHandle: true, snapPoints: [0.4, 1] })
    drawer.setOpen(true)
    const handle = query<HTMLButtonElement>(drawer, '[data-drawer-handle]')!
    expect(handle.tabIndex).toBe(0)
    expect(handle.getAttribute('aria-label')).toBe('Change drawer position')
    expect(handle.hasAttribute('aria-hidden')).toBe(false)
  })
})

describe('keyboard viewport layout for side panels', () => {
  it('uses vertical viewport geometry for a right drawer', () => {
    const viewport = Object.assign(new EventTarget(), { height: 768, width: 1024 })
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true, writable: true })
    const input = document.createElement('input')
    const drawer = createDrawer({ id: 'side-keyboard', direction: 'right', content: () => input })
    drawer.setOpen(true)
    input.focus()

    // The keyboard covers 368px of the 768px layout viewport.
    viewport.height = 400
    viewport.dispatchEvent(new Event('resize'))

    const content = query<HTMLElement>(drawer, '[data-drawer]')!
    expect(content.style.bottom).toBe('368px')
    expect(content.style.height).toBe('400px')
  })
})

describe('keyboard dismissal restores authored geometry', () => {
  it('clears the inline height and bottom written while the keyboard was open', () => {
    const viewport = Object.assign(new EventTarget(), { height: 768, width: 1024 })
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true, writable: true })
    const input = document.createElement('input')
    const drawer = createDrawer({ id: 'side-keyboard-close', direction: 'right', content: () => input })
    drawer.setOpen(true)
    input.focus()

    viewport.height = 400
    viewport.dispatchEvent(new Event('resize'))
    const content = query<HTMLElement>(drawer, '[data-drawer]')!
    expect(content.style.height).toBe('400px')

    viewport.height = 768
    viewport.dispatchEvent(new Event('resize'))
    expect(content.style.height).toBe('')
    expect(content.style.bottom).toBe('')
  })
})

describe('drag permission follows the drawer axis', () => {
  const scroller = (overrides: Partial<DragScrollableAncestor>): DragScrollableAncestor => ({
    scrollHeight: 100,
    clientHeight: 100,
    scrollTop: 0,
    scrollWidth: 100,
    clientWidth: 100,
    scrollLeft: 0,
    role: null,
    ...overrides
  })
  const permission = (direction: 'top' | 'bottom' | 'left' | 'right', ancestor: DragScrollableAncestor) =>
    getDragPermission({
      targetTagName: 'DIV',
      hasNoDragAttribute: false,
      direction,
      timeSinceOpenMs: null,
      swipeAmount: null,
      hasHighlightedText: false,
      timeSinceLastPreventedMs: null,
      scrollLockTimeout: 100,
      isDraggingInDirection: false,
      ancestors: [ancestor, scroller({ role: 'dialog' })]
    }).allow

  it('lets a top drawer list scroll forward instead of closing at scrollTop 0', () => {
    expect(permission('top', scroller({ scrollHeight: 500, clientHeight: 200, scrollTop: 0 }))).toBe(false)
    expect(permission('top', scroller({ scrollHeight: 500, clientHeight: 200, scrollTop: 300 }))).toBe(true)
  })

  it('keeps the bottom drawer contract: dismiss only from the scroll start', () => {
    expect(permission('bottom', scroller({ scrollHeight: 500, clientHeight: 200, scrollTop: 0 }))).toBe(true)
    expect(permission('bottom', scroller({ scrollHeight: 500, clientHeight: 200, scrollTop: 40 }))).toBe(false)
  })

  it('ignores vertical scroll position for side panels and checks horizontal scroll', () => {
    expect(permission('right', scroller({ scrollHeight: 500, clientHeight: 200, scrollTop: 40 }))).toBe(true)
    expect(permission('right', scroller({ scrollWidth: 600, clientWidth: 300, scrollLeft: 30 }))).toBe(false)
    expect(permission('left', scroller({ scrollWidth: 600, clientWidth: 300, scrollLeft: 0 }))).toBe(false)
    expect(permission('left', scroller({ scrollWidth: 600, clientWidth: 300, scrollLeft: 300 }))).toBe(true)
  })
})

describe('focus across structural updates', () => {
  it('does not bounce focus to the background trigger while rebuilding an open drawer', () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Open'
    document.body.appendChild(trigger)
    trigger.focus()
    const drawer = createDrawer({ id: 'rebuild-focus', title: 'Step 1', content: 'First step' })
    drawer.setOpen(true)

    let triggerFocusCount = 0
    trigger.addEventListener('focus', () => triggerFocusCount++)
    drawer.update({ title: 'Step 2' })

    expect(triggerFocusCount).toBe(0)
    expect(query<HTMLElement>(drawer, '[data-drawer]')!.contains(document.activeElement)).toBe(true)

    drawer.setOpen(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('leaves focus in an open child when its parent is rebuilt', () => {
    const parent = createDrawer({ id: 'focus-parent', title: 'Order', content: 'Summary' })
    parent.setOpen(true)
    const choice = document.createElement('button')
    choice.textContent = 'Express'
    const child = createDrawer({ id: 'focus-child', parentId: 'focus-parent', content: () => choice })
    child.setOpen(true)
    choice.focus()

    parent.update({ title: 'Order updated' })
    expect(document.activeElement).toBe(choice)
  })
})

describe('initial focus', () => {
  it('does not scroll the panel body to the first control', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>Long introduction</p><button type="button">Continue</button>'
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    const drawer = createDrawer({ id: 'initial-focus', autoFocus: true, content: () => container })
    drawer.setOpen(true)

    expect(document.activeElement).toBe(container.querySelector('button'))
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    focus.mockRestore()
  })
})
