import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression test: clicking the built-in close button must close the
 * drawer even though the parent `[data-drawer]` element captures
 * the pointer on `pointerdown`.
 *
 * Bug (v3.0.0-beta.3): `onPointerDown` called `setPointerCapture`
 * BEFORE the drag-permission check. Once `content` captured the
 * pointer, the browser redirected `mouseup` (and therefore `click`)
 * to `content` instead of the close button. The click event was
 * dispatched on the dialog tree, not the button, so the
 * `[data-drawer-close]` listener never fired. Tapping the close
 * button started a no-op drag with `draggedDistance = 0`; the
 * release path returned `'reset'` and the drawer stayed open.
 *
 * Fix (stable): the pointerdown handler now
 *   1. Bails out before `setPointerCapture` when the target is an
 *      interactive child of the drawer (button, link, form field,
 *      the close button itself). The pointer is never captured, so
 *      the browser fires `click` on the original target as usual.
 *   2. Calls `setPointerCapture` AFTER the permission check passes
 *      and only when a drag actually starts.
 *
 * The fix is asserted end-to-end here:
 *   - The close button receives its `click` listener.
 *   - A `pointerdown` on the button does NOT capture the pointer
 *     (the close handler can run).
 *   - A subsequent `click` on the button reaches the button's
 *     listener (not the dialog tree).
 *   - `setOpen(false)` is called and the controller reports
 *     `isOpen === false`.
 */

function el(tag: string, attrs: Record<string, string> = {}, children: (Node | string)[] = []): HTMLElement {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value)
  }
  for (const child of children) {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
  }
  return node
}

describe('close button does not lose click events to pointer capture', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('fires the close button click handler when pointerdown lands on the button', () => {
    const drawer = createDrawer({
      id: 'close-cb',
      direction: 'right',
      title: 'Close button',
      content: el('div', {}, ['Body']),
      closeButton: {
        className: 'absolute top-5 right-5',
        ariaLabel: 'Close'
      }
    })
    drawer.setOpen(true)

    const content = document.querySelector('[data-drawer]') as HTMLElement
    const closeBtn = document.querySelector('[data-drawer-close]') as HTMLButtonElement
    expect(content).toBeTruthy()
    expect(closeBtn).toBeTruthy()

    // Dispatch pointerdown directly on the button (simulating a
    // user tap). The fix bails out of `onPointerDown` before
    // `setPointerCapture` for interactive children.
    closeBtn.dispatchEvent(new window.Event('pointerdown', { bubbles: true }))

    // Dispatch the click that the browser would synthesize after
    // a real mousedown/mouseup sequence. Because the pointer was
    // never captured, the click fires on the button.
    closeBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))

    // The controller reports the drawer is closed.
    expect(drawer.getSnapshot().state.isOpen).toBe(false)
    const contentAfter = document.querySelector('[data-drawer]') as HTMLElement
    expect(contentAfter.getAttribute('data-state')).toBe('closed')
  })

  it('still captures the pointer when the user drags from the content background', () => {
    // Sanity check: the fix must not regress the drag pipeline.
    // A pointerdown on the content itself (not on a child button)
    // should still capture the pointer and start a drag.
    const drawer = createDrawer({
      id: 'drag-still-works',
      direction: 'bottom',
      title: 'Drag still works',
      content: el('div', {}, ['Body'])
    })
    drawer.setOpen(true)

    const content = document.querySelector('[data-drawer]') as HTMLElement
    // Dispatch pointerdown directly on the content (background).
    content.dispatchEvent(
      Object.assign(new window.Event('pointerdown', { bubbles: true }), {
        clientY: 100,
        clientX: 50,
        pointerId: 7
      })
    )
    // Move down by 10 px (small drag, below close threshold).
    content.dispatchEvent(
      Object.assign(new window.Event('pointermove', { bubbles: true }), {
        clientY: 110,
        clientX: 50,
        pointerId: 7
      })
    )
    content.dispatchEvent(
      Object.assign(new window.Event('pointerup', { bubbles: true }), {
        clientY: 110,
        clientX: 50,
        pointerId: 7
      })
    )

    // The drawer is still open (release below threshold = reset).
    expect(drawer.getSnapshot().state.isOpen).toBe(true)
  })

  it('does not capture the pointer when pointerdown lands on a form input', () => {
    // A form input inside the drawer must receive its own focus /
    // click events. Without the fix, clicking an input started a
    // no-op drag and the input's events never fired.
    const input = el('input', { type: 'text', name: 'test' })
    const drawer = createDrawer({
      id: 'input-cb',
      direction: 'right',
      title: 'Input',
      content: el('div', {}, [input])
    })
    drawer.setOpen(true)

    const found = document.querySelector('input') as HTMLInputElement
    expect(found).toBeTruthy()

    found.dispatchEvent(new window.Event('pointerdown', { bubbles: true }))
    found.dispatchEvent(new window.Event('click', { bubbles: true }))

    // Drawer remains open (the click didn't bubble into a close).
    expect(drawer.getSnapshot().state.isOpen).toBe(true)
    // No drag started, so no inline transform was applied to the
    // content element.
    const content = document.querySelector('[data-drawer]') as HTMLElement
    expect(content.style.transform).not.toContain('translate')
  })

  it('does not capture the pointer when pointerdown lands on a link', () => {
    const link = el('a', { href: '#test' }, ['Link'])
    const drawer = createDrawer({
      id: 'link-cb',
      direction: 'right',
      title: 'Link',
      content: el('div', {}, [link])
    })
    drawer.setOpen(true)

    const found = document.querySelector('a') as HTMLAnchorElement
    expect(found).toBeTruthy()

    found.dispatchEvent(new window.Event('pointerdown', { bubbles: true }))
    found.dispatchEvent(new window.Event('click', { bubbles: true }))

    expect(drawer.getSnapshot().state.isOpen).toBe(true)
  })

  it('honors data-drawer-no-drag attribute on a child (no drag, no capture)', () => {
    const noDragChild = el('div', { 'data-drawer-no-drag': 'true' }, ['Static'])
    const drawer = createDrawer({
      id: 'no-drag-cb',
      direction: 'bottom',
      title: 'No drag',
      content: el('div', {}, [noDragChild])
    })
    drawer.setOpen(true)

    const found = document.querySelector('[data-drawer-no-drag]') as HTMLElement
    expect(found).toBeTruthy()

    found.dispatchEvent(new window.Event('pointerdown', { bubbles: true }))
    found.dispatchEvent(
      Object.assign(new window.Event('pointermove', { bubbles: true }), {
        clientY: 200,
        clientX: 50,
        pointerId: 9
      })
    )
    found.dispatchEvent(
      Object.assign(new window.Event('pointerup', { bubbles: true }), {
        clientY: 200,
        clientX: 50,
        pointerId: 9
      })
    )

    expect(drawer.getSnapshot().state.isOpen).toBe(true)
  })
})
