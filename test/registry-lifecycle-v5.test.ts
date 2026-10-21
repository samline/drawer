import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createDrawer,
  createDrawerController,
  destroyDrawers,
  getDrawer,
  getDrawers,
  getChildDrawers,
  getParentDrawer
} from '../src'

afterEach(() => {
  destroyDrawers()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('v5 explicit instance ownership', () => {
  it('allocates independent ids and avoids explicit generated-name collisions', () => {
    const a = createDrawer()
    const reserved = createDrawer({ id: `drawer-${Number(a.id.slice('drawer-'.length)) + 1}` })
    const b = createDrawer()
    expect(a.id).not.toBe(b.id)
    expect(b.id).not.toBe(reserved.id)
    a.setOpen(true)
    expect(b.getSnapshot().state.isOpen).toBe(false)
  })
  it('keeps one controller identity through all registry reads and updates', () => {
    const drawer = createDrawer({ id: 'stable' })
    expect(getDrawer('stable')).toBe(drawer)
    expect(getDrawers().stable).toBe(drawer)
    const previous = getDrawers()
    const updated = drawer.update({ title: 'Updated', open: true })
    expect(updated).toBe(drawer.getSnapshot())
    expect(() => Object.assign(drawer, { id: 'changed' })).toThrow(TypeError)
    expect(getDrawer('stable')).toBe(drawer)
    expect(previous.stable).toBe(drawer)
    expect(drawer.getSnapshot().state.isOpen).toBe(true)
    expect(() => createDrawer({ id: 'stable' })).toThrow(/already registered/)
  })
  it('does not create while looking up a missing id', () => {
    expect(getDrawer('missing')).toBeNull()
    expect(getChildDrawers(undefined as any)).toEqual([])
    expect(getDrawers()).toEqual({})
  })
  it('makes destroyed handles terminal even when their id is reused', () => {
    const stale = createDrawer({ id: 'reused' })
    stale.destroy()
    const current = createDrawer({ id: 'reused' })
    expect(stale.id).toBe('reused')
    expect(stale.element).toBeNull()
    for (const action of [
      () => stale.setOpen(true),
      () => stale.update({ open: true }),
      () => stale.setActiveSnapPoint(1),
      () => stale.subscribe(() => {}),
      () => stale.getSnapshot(),
      () => stale.options
    ])
      expect(action).toThrow(/destroyed/)
    stale.destroy()
    expect(getDrawer('reused')).toBe(current)
    expect(current.getSnapshot().state.isOpen).toBe(false)
  })
  it('disposes subscriptions and rejects identity changes', () => {
    const drawer = createDrawer({ id: 'owned' })
    const listener = vi.fn()
    drawer.subscribe(listener)
    expect(() => drawer.update({ id: 'other' } as any)).toThrow(/cannot be changed/)
    drawer.destroy()
    const next = createDrawer({ id: 'owned' })
    next.setOpen(true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(getDrawer('other')).toBeNull()
  })
  it('keeps exact parent and child identities and tears down the owned tree', () => {
    const parent = createDrawer({ id: 'parent' })
    const child = createDrawer({ id: 'child', parentId: parent.id })
    expect(getParentDrawer(child.id)).toBe(parent)
    expect(getChildDrawers(parent.id)).toEqual([child])
    expect(getChildDrawers(parent.id)[0]).toBe(child)
    parent.destroy()
    expect(getDrawers()).toEqual({})
    expect(() => child.setOpen(true)).toThrow(/destroyed/)
  })
  it('rolls back failed content creation and permits an explicit retry', () => {
    expect(() =>
      createDrawer({
        id: 'retry',
        open: true,
        content: () => {
          throw new Error('Content unavailable')
        }
      })
    ).toThrow('Content unavailable')
    expect(getDrawer('retry')).toBeNull()
    expect(document.querySelector('[data-drawer-vanilla-root]')).toBeNull()
    const retry = createDrawer({ id: 'retry', title: 'Ready', open: true })
    expect(getDrawer('retry')).toBe(retry)
  })
  it.each(['onClose', 'onOpenChange', 'subscribe'] as const)(
    'permits owner teardown during %s without orphan effects',
    (during) => {
      vi.useFakeTimers()
      const animation = vi.fn()
      const drawer = createDrawer({ id: 'callback-owner', onAnimationEnd: animation })
      drawer.setOpen(true)
      if (during === 'onClose') drawer.update({ onClose: () => drawer.destroy() })
      if (during === 'onOpenChange') drawer.update({ onOpenChange: () => drawer.destroy() })
      if (during === 'subscribe')
        drawer.subscribe((snapshot) => {
          if (!snapshot.state.isOpen) drawer.destroy()
        })
      expect(() => drawer.setOpen(false)).not.toThrow()
      expect(getDrawer('callback-owner')).toBeNull()
      expect(document.querySelector('[data-drawer-vanilla-root]')).toBeNull()
      vi.runAllTimers()
      expect(animation).not.toHaveBeenCalled()
      vi.useRealTimers()
    }
  )
  it('permits teardown from an update callback without reviving the instance', () => {
    const drawer = createDrawer({ id: 'update-owner', open: true })
    expect(() => drawer.update({ open: false, onClose: () => drawer.destroy() })).not.toThrow()
    expect(getDrawer('update-owner')).toBeNull()
    expect(document.querySelector('[data-drawer-vanilla-root]')).toBeNull()
  })
  it('gives headless state the same single update and disposal contract', () => {
    const state = createDrawerController()
    const listener = vi.fn()
    state.subscribe(listener)
    state.update({ modal: false })
    expect(state.getSnapshot().state.modal).toBe(false)
    expect(getDrawers()).toEqual({})
    state.destroy()
    state.destroy()
    expect(() => state.setOpen(true)).toThrow(/destroyed/)
    expect(() => state.subscribe(listener)).toThrow(/destroyed/)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
