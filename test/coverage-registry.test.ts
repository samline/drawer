import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers, getChildDrawers, getDrawer, getParentDrawer } from '../src'

afterEach(() => {
  destroyDrawers()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('snap point reset after closing', () => {
  it('returns to the first snap point once the close animation ends', () => {
    vi.useFakeTimers()
    const onActiveSnapPointChange = vi.fn()
    const drawer = createDrawer({
      id: 'snap-reset',
      snapPoints: [0.3, 1],
      activeSnapPoint: 1,
      onActiveSnapPointChange,
    })
    drawer.setOpen(true)
    drawer.setOpen(false)
    drawer.setOpen(true)
    drawer.setOpen(false)
    vi.advanceTimersByTime(500)
    expect(drawer.options.activeSnapPoint).toBe(0.3)
    expect(onActiveSnapPointChange).toHaveBeenCalledTimes(1)
    expect(onActiveSnapPointChange).toHaveBeenCalledWith(0.3)
  })

  it('keeps the snap point when the drawer reopens or is destroyed first', () => {
    vi.useFakeTimers()
    const reopened = createDrawer({ id: 'snap-reopen', snapPoints: [0.3, 1], activeSnapPoint: 1 })
    reopened.setOpen(true)
    reopened.setOpen(false)
    reopened.update({ open: true })
    const destroyed = createDrawer({ id: 'snap-gone', snapPoints: [0.3, 1], activeSnapPoint: 1 })
    destroyed.setOpen(true)
    destroyed.setOpen(false)
    destroyed.destroy()
    vi.advanceTimersByTime(500)
    expect(reopened.options.activeSnapPoint).toBe(1)
    expect(getDrawer('snap-gone')).toBeNull()
  })
})

describe('nested ownership', () => {
  it('opening a child through update opens its whole ancestor chain', () => {
    const root = createDrawer({ id: 'chain-root' })
    const middle = createDrawer({ id: 'chain-middle', parentId: 'chain-root' })
    const leaf = createDrawer({ id: 'chain-leaf', parentId: 'chain-middle' })
    leaf.update({ open: true })
    expect(root.getSnapshot().state.isOpen).toBe(true)
    expect(middle.getSnapshot().state.isOpen).toBe(true)
    expect(leaf.options.nested).toBe(true)
    expect(getParentDrawer('chain-leaf')).toBe(middle)
    expect(getParentDrawer('chain-root')).toBeNull()
    expect(getChildDrawers('')).toEqual([])
  })

  it('an already open parent is left as it is', () => {
    const parent = createDrawer({ id: 'open-parent', open: true })
    const child = createDrawer({ id: 'open-child', parentId: 'open-parent' })
    child.update({ open: true })
    expect(parent.getSnapshot().state.isOpen).toBe(true)
  })
})

describe('callbacks that destroy their owner', () => {
  it('onClose may destroy the drawer during update', () => {
    let drawer: ReturnType<typeof createDrawer>
    drawer = createDrawer({ id: 'close-destroys', open: true, onClose: () => drawer.destroy() })
    const snapshot = drawer.update({ open: false })
    expect(snapshot.state.isOpen).toBe(true)
    expect(getDrawer('close-destroys')).toBeNull()
  })

  it('a child may destroy its parent while the parent opens', () => {
    const parent = createDrawer({ id: 'doomed-parent', onOpenChange: () => child.destroy() })
    const child = createDrawer({ id: 'doomed-child', parentId: 'doomed-parent' })
    const snapshot = child.update({ open: true })
    expect(snapshot.state.isOpen).toBe(false)
    expect(parent.getSnapshot().state.isOpen).toBe(true)
  })
})
