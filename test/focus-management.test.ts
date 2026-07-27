import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression test for initial focus on drawer open.
 *
 * Bug (v3.0.0-beta.3 → stable): opening a drawer auto-focused the
 * first focusable descendant of the drawer body. For drawers
 * whose first focusable is a link (e.g. the consumer's support
 * drawer, whose WhatsApp phone link is the first anchor), the
 * drawer appeared to "highlight" the link on open — looks like a
 * stray hover or focus state, and surprised users.
 *
 * v2 (Radix/Vaul) default: do NOT auto-focus the content. Blur
 * the trigger before opening so the dialog never appears focused
 * inside, and leave focus where it was (or fall back to
 * `document.body` for keyboard / screen-reader users). The
 * consumer can opt into auto-focus via `autoFocus: true`.
 *
 * Fix: only call `focusFirstElement` when `options.autoFocus === true`.
 * `releaseHiddenFocusBeforeOpen` (already wired by the registry)
 * blurs the trigger on the no-autoFocus path so the dialog doesn't
 * appear to "steal" focus on open. The focus trap
 * (`trapFocus` on Tab/Shift+Tab) still keeps focus inside the
 * dialog while it is open.
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

describe('drawer initial focus management', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('does NOT auto-focus the first focusable descendant on open (v2 default restored)', () => {
    const wrapper = el('div', {}, [
      el('a', { href: 'https://example.com' }, ['A link']),
      el('button', {}, ['A button'])
    ])

    const drawer = createDrawer({
      id: 'no-autofocus',
      direction: 'right',
      title: 'No autoFocus',
      content: wrapper
    })
    drawer.setOpen(true)

    // The drawer's body contains a link as the first focusable.
    // v2 default: focus stays on `document.body`, not on the link.
    expect(document.activeElement).toBe(document.body)
  })

  it('does not auto-focus when autoFocus is unset (the default)', () => {
    const wrapper = el('div', {}, [el('input', { type: 'text', id: 'first-input' })])

    const drawer = createDrawer({
      id: 'no-autofocus-unset',
      direction: 'right',
      title: 'No autoFocus unset',
      content: wrapper
    })
    drawer.setOpen(true)

    expect(document.activeElement).toBe(document.body)
  })

  it('auto-focuses the first focusable when autoFocus: true (opt-in)', () => {
    const wrapper = el('div', {}, [el('input', { type: 'text', id: 'first-input' })])

    const drawer = createDrawer({
      id: 'autofocus-true',
      direction: 'right',
      title: 'autoFocus true',
      content: wrapper,
      autoFocus: true
    })
    drawer.setOpen(true)

    const first = document.querySelector('#first-input') as HTMLElement
    expect(first).toBeTruthy()
    expect(document.activeElement).toBe(first)
  })

  it('autoFocus: true focuses the first anchor when that is what comes first', () => {
    const wrapper = el('div', {}, [
      el('a', { href: '#test', id: 'first-anchor' }, ['A link']),
      el('button', { id: 'second' }, ['A button'])
    ])

    const drawer = createDrawer({
      id: 'autofocus-anchor',
      direction: 'right',
      title: 'autoFocus anchor first',
      content: wrapper,
      autoFocus: true
    })
    drawer.setOpen(true)

    const first = document.querySelector('#first-anchor') as HTMLElement
    expect(first).toBeTruthy()
    expect(document.activeElement).toBe(first)
  })

  it('falls back to the dialog body itself when no focusable descendant exists', () => {
    const wrapper = el('div', {}, [
      ((): HTMLElement => {
        const p = document.createElement('p')
        p.textContent = 'Just text'
        return p
      })()
    ])

    const drawer = createDrawer({
      id: 'no-focusables',
      direction: 'right',
      title: 'No focusables',
      content: wrapper,
      autoFocus: true
    })
    drawer.setOpen(true)

    const content = document.querySelector('[data-drawer][data-state="open"]') as HTMLElement
    // The dialog body itself is the focus target when there is no
    // interactive descendant. `tabIndex` was set to -1 and the
    // element received focus.
    expect(document.activeElement).toBe(content)
  })
})