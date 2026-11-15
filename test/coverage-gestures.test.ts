import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'
import { DRAG_CLASS } from '../src/constants'

type PointerInit = {
  clientX?: number
  clientY: number
  pointerId?: number
  button?: number
  pointerType?: string
  relatedTarget?: EventTarget | null
}

const pointer = (type: string, target: EventTarget, init: PointerInit) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, { clientX: 50, pointerId: 1, ...init })
  target.dispatchEvent(event)
  return event
}

const content = () => document.querySelector<HTMLElement>('[data-drawer]')!

/** Opens a drawer and waits out the post-open drag grace period. */
const openDrawer = (options: Parameters<typeof createDrawer>[0] = {}) => {
  const drawer = createDrawer({ id: 'gesture', title: 'Gestures', ...options })
  drawer.setOpen(true)
  vi.advanceTimersByTime(600)
  return drawer
}

/** Starts a downward drag on `target` and reports whether it was taken. */
const startDrag = (target: EventTarget, init: Partial<PointerInit> = {}) => {
  pointer('pointerdown', target, { clientY: 100, ...init })
  vi.advanceTimersByTime(20)
  pointer('pointermove', content(), { clientY: 140, ...init })
  return content().classList.contains(DRAG_CLASS)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  destroyDrawers()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('which targets start a drag', () => {
  const withChild = (html: string) => {
    const container = document.createElement('div')
    container.innerHTML = html
    openDrawer({ content: () => container })
    return container.firstElementChild!
  }

  it('skips children that carry an interactive role or a tab stop', () => {
    expect(startDrag(withChild('<div role="button">Act</div>'))).toBe(false)
    destroyDrawers()
    expect(startDrag(withChild('<div tabindex="0">Focusable</div>'))).toBe(false)
  })

  it('drags from presentational and programmatic-focus children', () => {
    expect(startDrag(withChild('<div role="presentation">Decor</div>'))).toBe(true)
    destroyDrawers()
    expect(startDrag(withChild('<div tabindex="-1">Region</div>'))).toBe(true)
  })

  it('ignores secondary buttons and a second pointer', () => {
    openDrawer()
    expect(startDrag(content(), { button: 2 })).toBe(false)
    expect(startDrag(content(), { pointerId: 3 })).toBe(true)
    pointer('pointerdown', content(), { clientY: 100, pointerId: 4 })
    pointer('pointerup', content(), { clientY: 300, pointerId: 4 })
    expect(content().classList.contains(DRAG_CLASS)).toBe(true)
  })

  it('only drags from the handle when handleOnly is set', () => {
    openDrawer({ handleOnly: true })
    expect(startDrag(content())).toBe(false)
  })

  it('gives up when the pointer moves across the drag axis', () => {
    openDrawer()
    pointer('pointerdown', content(), { clientY: 100, pointerType: 'touch' })
    pointer('pointermove', content(), { clientX: 90, clientY: 101, pointerType: 'touch' })
    pointer('pointermove', content(), { clientX: 90, clientY: 160, pointerType: 'touch' })
    expect(content().classList.contains(DRAG_CLASS)).toBe(false)
  })
})

describe('ending a drag without pointerup', () => {
  it('releases when the pointer leaves the panel, not when it moves inside', () => {
    openDrawer()
    const inner = document.createElement('span')
    content().append(inner)
    expect(startDrag(content())).toBe(true)

    pointer('pointerout', content(), { clientY: 140, relatedTarget: inner })
    pointer('pointerout', content(), { clientY: 140, pointerId: 9, relatedTarget: null })
    expect(content().classList.contains(DRAG_CLASS)).toBe(true)

    const leave = pointer('pointerout', content(), { clientY: 140, relatedTarget: null })
    expect(leave.defaultPrevented).toBe(true)
    expect(content().classList.contains(DRAG_CLASS)).toBe(false)
  })

  it('releases on a long-press context menu', () => {
    openDrawer()
    expect(content().dispatchEvent(new Event('contextmenu', { cancelable: true }))).toBe(true)
    expect(startDrag(content())).toBe(true)
    const menu = new Event('contextmenu', { cancelable: true })
    content().dispatchEvent(menu)
    expect(menu.defaultPrevented).toBe(true)
    expect(content().classList.contains(DRAG_CLASS)).toBe(false)
  })

  it('resets to the start position on pointercancel from the same pointer', () => {
    const drawer = openDrawer()
    expect(startDrag(content())).toBe(true)
    pointer('pointercancel', content(), { clientY: 0, pointerId: 5 })
    pointer('pointerup', content(), { clientY: 600, pointerId: 5 })
    expect(content().classList.contains(DRAG_CLASS)).toBe(true)
    pointer('pointercancel', content(), { clientY: 0 })
    expect(content().classList.contains(DRAG_CLASS)).toBe(false)
    expect(drawer.getSnapshot().state.isOpen).toBe(true)
  })
})

describe('snap point drags', () => {
  it('settles back on the active snap point after a short drag', () => {
    const drawer = openDrawer({ snapPoints: [0.5, 1], activeSnapPoint: 1, fadeFromIndex: 1 })
    expect(startDrag(content())).toBe(true)
    pointer('pointerup', content(), { clientY: 140 })
    expect(drawer.getSnapshot().state.isOpen).toBe(true)
    expect(content().style.transform).toContain('translate3d')
  })

  it('a quick second release restarts the just-released window', () => {
    openDrawer({ snapPoints: [0.5, 1], activeSnapPoint: 1 })
    expect(startDrag(content())).toBe(true)
    pointer('pointerup', content(), { clientY: 140 })
    expect(startDrag(content())).toBe(true)
    pointer('pointerup', content(), { clientY: 140 })
    expect(document.querySelector(`.${DRAG_CLASS}`)).toBeNull()
    vi.advanceTimersByTime(1000)
  })
})

describe('handle clicks', () => {
  const handle = () => document.querySelector<HTMLElement>('[data-drawer-handle]')!

  it('are ignored right after a drag', () => {
    const drawer = openDrawer({ snapPoints: [0.5, 1], activeSnapPoint: 1, showHandle: true })
    expect(startDrag(content())).toBe(true)
    pointer('pointerup', content(), { clientY: 101 })
    const before = drawer.options.activeSnapPoint
    handle().click()
    expect(drawer.options.activeSnapPoint).toBe(before)
  })

  it('cycle the snap points only while the drawer is open', () => {
    const drawer = openDrawer({ snapPoints: [0.5, 1], activeSnapPoint: 0.5, showHandle: true })
    handle().click()
    expect(drawer.options.activeSnapPoint).toBe(1)
    content().dataset.state = 'closed'
    handle().click()
    expect(drawer.options.activeSnapPoint).toBe(1)
  })
})
