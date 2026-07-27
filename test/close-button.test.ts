import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

/**
 * Regression tests for the built-in `closeButton` option.
 *
 * The option lets consumers add a close button to the drawer
 * without writing a manual `document.addEventListener('click', ...)`.
 * The package renders a `<button data-drawer-close>` and wires
 * its `click` to `onOpenChange(false)`, so the user can dismiss
 * the drawer by clicking the button. The button is removed on
 * re-mount (HMR safety) via `teardownMount`.
 *
 * This eliminates the most common source of HMR-related bugs
 * in consumers (e.g. Vite HMR re-running the consumer's
 * `<script>` and accumulating
 * `document.addEventListener('click', ...)` listeners on
 * `document`, each holding a reference to a stale controller).
 *
 * See `.agents/recommendations/2026-07-25-built-in-closeButton-option.md`
 * for the design rationale and
 * `.agents/issues/2026-07-25-modal-drawers-title-leak-open-parpadeo-and-close-button.md`
 * for the original bug report.
 */

function getCloseButton(): HTMLButtonElement | null {
  return document.querySelector('[data-drawer-close]')
}

describe('closeButton option', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('renders a default close button when closeButton: true', () => {
    createDrawer({
      id: 'cb-default',
      closeButton: true,
      content: 'body'
    })

    const btn = getCloseButton()
    expect(btn).not.toBeNull()
    expect(btn!.tagName).toBe('BUTTON')
    expect(btn!.getAttribute('type')).toBe('button')
    expect(btn!.getAttribute('aria-label')).toBe('Close')
    expect(btn!.className).toBe('drawer-close-button')
    // Icon is rendered as a `<span aria-hidden="true">` so
    // screen readers only announce the button's aria-label.
    const iconSpan = btn!.querySelector('[data-drawer-close-icon]')
    expect(iconSpan).not.toBeNull()
    expect(iconSpan!.getAttribute('aria-hidden')).toBe('true')
    expect(iconSpan!.textContent).toBe('xmark')
  })

  it('respects a custom className, icon string, and ariaLabel', () => {
    createDrawer({
      id: 'cb-custom',
      closeButton: {
        className: 'absolute top-5 right-5 z-10',
        icon: 'x-circle',
        ariaLabel: 'Dismiss this drawer'
      },
      content: 'body'
    })

    const btn = getCloseButton()
    expect(btn).not.toBeNull()
    expect(btn!.className).toBe('absolute top-5 right-5 z-10')
    expect(btn!.getAttribute('aria-label')).toBe('Dismiss this drawer')
    expect(btn!.querySelector('[data-drawer-close-icon]')!.textContent).toBe('x-circle')
  })

  it('respects a custom icon passed as an HTMLElement', () => {
    const customIcon = document.createElement('span')
    customIcon.className = 'fa-solid fa-xmark'
    customIcon.textContent = '×'

    createDrawer({
      id: 'cb-custom-icon-el',
      closeButton: { icon: customIcon },
      content: 'body'
    })

    const btn = getCloseButton()
    const iconSpan = btn!.querySelector('[data-drawer-close-icon]')
    expect(iconSpan).not.toBeNull()
    // The HTMLElement is appended inside the aria-hidden span.
    expect(iconSpan!.firstElementChild).toBe(customIcon)
  })

  it('calls onOpenChange(false) when the close button is clicked', async () => {
    const drawer = createDrawer({
      id: 'cb-clicks',
      closeButton: true,
      content: 'body'
    })

    drawer.setOpen(true)
    await new Promise<void>((resolve) => setTimeout(resolve, 5))
    expect(drawer.getSnapshot().state.isOpen).toBe(true)

    getCloseButton()!.click()
    await new Promise<void>((resolve) => setTimeout(resolve, 5))
    expect(drawer.getSnapshot().state.isOpen).toBe(false)
  })

  it('does not render a close button when closeButton is omitted', () => {
    createDrawer({
      id: 'cb-omitted',
      content: 'body'
    })

    expect(getCloseButton()).toBeNull()
  })

  it('does not render a close button when closeButton is explicitly false', () => {
    createDrawer({
      id: 'cb-explicit-false',
      closeButton: false,
      content: 'body'
    })

    expect(getCloseButton()).toBeNull()
  })

  it('removes the close button on re-mount (HMR safety)', () => {
    const d1 = createDrawer({
      id: 'cb-hmr',
      closeButton: true,
      content: 'body'
    })
    expect(getCloseButton()).not.toBeNull()

    // Simulate HMR re-mount: destroy + re-create with the same id.
    d1.destroy()
    const d2 = createDrawer({
      id: 'cb-hmr',
      closeButton: true,
      content: 'body'
    })

    // Exactly one close button is in the DOM (the new one). The
    // old one was removed by `teardownMount` (via `state.content`).
    expect(document.querySelectorAll('[data-drawer-close]').length).toBe(1)

    // The new button's click must close d2, not d1.
    d2.setOpen(true)
    getCloseButton()!.click()
    expect(d2.getSnapshot().state.isOpen).toBe(false)
  })

  it('stopPropagation on click does not bubble to the drawer content', () => {
    let contentClickCount = 0
    createDrawer({
      id: 'cb-no-bubble',
      closeButton: true,
      content: 'body'
    })
    const content = document.querySelector('[data-drawer]') as HTMLElement
    content.addEventListener('click', () => {
      contentClickCount += 1
    })

    getCloseButton()!.click()
    expect(contentClickCount).toBe(0)
  })
})
