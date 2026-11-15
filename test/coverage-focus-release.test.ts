import { afterEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'
import { getSnapPointReleaseAction } from '../src/runtime/release'

const keydown = (target: EventTarget, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  destroyDrawers()
  document.body.innerHTML = ''
})

describe('modal focus trap', () => {
  const openWith = (html: string) => {
    const container = document.createElement('div')
    container.innerHTML = html
    const drawer = createDrawer({ id: 'trap-cover', content: () => container })
    drawer.setOpen(true)
    const content = drawer.element!.querySelector<HTMLElement>('[data-drawer]')!
    return { container, content }
  }

  it('keeps focus on the panel when it has no focusable controls', () => {
    const { content } = openWith('<p>Read only</p>')
    const event = keydown(content, { key: 'Tab' })
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(content)
  })

  it('brings focus back from outside the panel to the first or last control', () => {
    const { container, content } = openWith(
      '<button id="a" type="button">A</button><button id="b" type="button">B</button>'
    )
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    expect(keydown(content, { key: 'Tab' }).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(container.querySelector('#a'))

    outside.focus()
    keydown(content, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(container.querySelector('#b'))
  })

  it('wraps Shift+Tab from the first control to the last', () => {
    const { container } = openWith(
      '<button id="a" type="button">A</button><button id="b" type="button">B</button>'
    )
    const first = container.querySelector<HTMLButtonElement>('#a')!
    first.focus()
    expect(keydown(first, { key: 'Tab', shiftKey: true }).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(container.querySelector('#b'))
  })

  it('leaves other keys alone', () => {
    const { content } = openWith('<button type="button">A</button>')
    expect(keydown(content, { key: 'a' }).defaultPrevented).toBe(false)
  })
})

describe('snap point release', () => {
  const base = {
    direction: 'bottom' as const,
    snapPointsOffset: [600, 300, 0],
    snapPointsCount: 3,
    dismissible: true,
    velocityThreshold: 0.4,
    viewportSize: 800,
  }

  it('moves toward a top drawer by adding the dragged distance', () => {
    expect(
      getSnapPointReleaseAction({
        ...base,
        direction: 'top',
        activeSnapPointOffset: 300,
        activeSnapPointIndex: 1,
        draggedDistance: 10,
        velocity: 0,
      })
    ).toEqual({ type: 'snap', targetOffset: 300 })
  })

  it('fast flings toward the expanded state go to the last snap point', () => {
    expect(
      getSnapPointReleaseAction({
        ...base,
        activeSnapPointOffset: 600,
        activeSnapPointIndex: 0,
        draggedDistance: 50,
        velocity: 3,
      })
    ).toEqual({ type: 'snap', targetOffset: 0 })
  })

  it('a quick upward drag from the last snap point stays there', () => {
    expect(
      getSnapPointReleaseAction({
        ...base,
        activeSnapPointOffset: 0,
        activeSnapPointIndex: 2,
        draggedDistance: 40,
        velocity: 1,
      })
    ).toEqual({ type: 'snap', targetOffset: 0 })
  })

  it('a quick drag without a known index does nothing', () => {
    expect(
      getSnapPointReleaseAction({
        ...base,
        activeSnapPointOffset: 300,
        activeSnapPointIndex: null,
        draggedDistance: -40,
        velocity: 1,
      })
    ).toEqual({ type: 'noop' })
  })

  it('a quick drag past the snap list does nothing', () => {
    expect(
      getSnapPointReleaseAction({
        ...base,
        dismissible: false,
        activeSnapPointOffset: 600,
        activeSnapPointIndex: 0,
        draggedDistance: -40,
        velocity: 1,
      })
    ).toEqual({ type: 'noop' })
  })
})
