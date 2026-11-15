import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'
import { browserModuleMocks } from './_test-helpers'

afterEach(() => {
  destroyDrawers()
  browserModuleMocks.reset()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
  Reflect.deleteProperty(window, 'visualViewport')
})

const dialogOf = (drawer: ReturnType<typeof createDrawer>) =>
  drawer.element!.querySelector<HTMLElement>('[data-drawer]')!

describe('dialog markup', () => {
  it('applies the overlay and panel class names', () => {
    const drawer = createDrawer({
      id: 'classes',
      title: 'Classes',
      open: true,
      overlayClassName: 'my-overlay',
      contentClassName: 'my-panel',
    })
    expect(drawer.element!.querySelector('[data-drawer-overlay]')!.className).toBe('my-overlay')
    expect(dialogOf(drawer).className).toBe('my-panel')
  })

  it('uses the consumer ids for the title and description', () => {
    const drawer = createDrawer({
      id: 'aria-ids',
      title: 'Named',
      description: 'Described',
      ariaLabelledBy: 'my-title',
      ariaDescribedBy: 'my-description',
      open: true,
    })
    const dialog = dialogOf(drawer)
    expect(dialog.getAttribute('aria-labelledby')).toBe('my-title')
    expect(dialog.querySelector('#my-title')?.textContent).toBe('Named')
    expect(dialog.getAttribute('aria-describedby')).toBe('my-description')
    expect(dialog.querySelector('#my-description')?.textContent).toBe('Described')
  })

  it('places an initially open snap drawer at rest without an entrance', () => {
    const drawer = createDrawer({ id: 'snap-rest', snapPoints: [0.5, 1], open: true })
    const dialog = dialogOf(drawer)
    expect(dialog.style.transform).toContain('translate3d')
    expect(dialog.style.transition).toBe('')
  })

  it('follows window resizes while a snap drawer is open', () => {
    const drawer = createDrawer({ id: 'snap-resize', snapPoints: [0.5, 1], open: true })
    const before = dialogOf(drawer).style.getPropertyValue('--initial-transform')
    vi.stubGlobal('innerHeight', window.innerHeight * 2)
    window.dispatchEvent(new Event('resize'))
    expect(dialogOf(drawer).style.getPropertyValue('--initial-transform')).not.toBe(before)
  })
})

describe('mobile keyboard', () => {
  const viewport = () => {
    const mock = Object.assign(new EventTarget(), { height: 768, width: 1024, offsetTop: 0 })
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: mock })
    return mock
  }
  const resize = (mock: ReturnType<typeof viewport>, height: number) => {
    mock.height = height
    mock.dispatchEvent(new Event('resize'))
  }

  it('reacts to textareas and editable regions but not to toggles', () => {
    const mock = viewport()
    const container = document.createElement('div')
    container.innerHTML =
      '<textarea></textarea><div contenteditable="true">Edit</div><input type="checkbox" /><span tabindex="0">x</span>'
    const drawer = createDrawer({
      id: 'keyboard-kinds',
      content: () => container,
      repositionInputs: true,
      open: true,
    })
    const dialog = dialogOf(drawer)
    Object.defineProperty(dialog, 'offsetHeight', { configurable: true, value: 600 })

    container.querySelector<HTMLInputElement>('input')!.focus()
    resize(mock, 368)
    expect(dialog.style.bottom).toBe('')

    container.querySelector<HTMLElement>('span')!.focus()
    resize(mock, 368)
    expect(dialog.style.bottom).toBe('')

    const editable = container.querySelector<HTMLElement>('[contenteditable]')!
    Object.defineProperty(editable, 'isContentEditable', { configurable: true, value: true })
    editable.focus()
    resize(mock, 368)
    expect(dialog.style.bottom).not.toBe('')

    resize(mock, 768)
    container.querySelector<HTMLTextAreaElement>('textarea')!.focus()
    resize(mock, 368)
    expect(dialog.style.bottom).not.toBe('')
  })
})

describe('Safari position fixed on reopen', () => {
  it('is skipped for an installed web app', () => {
    browserModuleMocks.isSafariSpy.mockReturnValue(true)
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('standalone') }))
    const drawer = createDrawer({ id: 'standalone', title: 'App' })
    drawer.setOpen(true)
    drawer.setOpen(false)
    drawer.setOpen(true)
    expect(document.body.style.position).toBe('')
  })
})

describe('background scaling', () => {
  it('keeps a scale of 1 when the viewport has no width', () => {
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-drawer-wrapper', '')
    document.body.append(wrapper)
    vi.stubGlobal('innerWidth', 0)
    createDrawer({ id: 'zero-width', title: 'Zero', shouldScaleBackground: true, open: true })
    expect(wrapper.style.transform).not.toContain('NaN')
  })
})
