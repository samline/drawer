import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'

describe('modeless overlays', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  afterEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('preserves the existing overlay defaults', () => {
    const modal = createDrawer({ id: 'default-modal', content: 'Modal' })
    modal.setOpen(true)
    expect(modal.element?.querySelector('[data-drawer-overlay]')).not.toBeNull()
    modal.setOpen(false)

    const modeless = createDrawer({ id: 'default-modeless', modal: false, content: 'Modeless' })
    modeless.setOpen(true)
    expect(modeless.element?.querySelector('[data-drawer-overlay]')).toBeNull()
  })

  it('renders and dismisses a local overlay without modal side effects', () => {
    const navigation = document.createElement('nav')
    const navigationLink = document.createElement('a')
    navigationLink.href = '#dashboard'
    navigation.appendChild(navigationLink)

    const main = document.createElement('main')
    const backgroundButton = document.createElement('button')
    main.appendChild(backgroundButton)
    document.body.append(navigation, main)

    navigationLink.focus()
    const drawer = createDrawer({
      id: 'contextual-drawer',
      container: main,
      modal: false,
      overlay: true,
      content: 'Drawer content'
    })
    drawer.setOpen(true)

    const overlay = main.querySelector('[data-drawer-overlay]') as HTMLElement | null
    const content = main.querySelector('[data-drawer]') as HTMLElement | null

    expect(overlay).not.toBeNull()
    expect(content?.getAttribute('aria-modal')).toBe('false')
    expect(navigation.inert).not.toBe(true)
    expect(navigation.hasAttribute('aria-hidden')).toBe(false)
    expect(backgroundButton.inert).not.toBe(true)
    expect(backgroundButton.hasAttribute('aria-hidden')).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(navigationLink)

    overlay?.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }))
    expect(drawer.getSnapshot().state.isOpen).toBe(false)
  })

  it('supports a modal drawer with its overlay explicitly disabled', () => {
    const drawer = createDrawer({ id: 'overlay-disabled', modal: true, overlay: false, content: 'Modal' })
    drawer.setOpen(true)

    expect(drawer.element?.querySelector('[data-drawer-overlay]')).toBeNull()
    expect(drawer.element?.querySelector('[data-drawer]')?.getAttribute('aria-modal')).toBe('true')
  })
})
