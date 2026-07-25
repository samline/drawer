import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  closeDrawer,
  configureDrawer,
  createDrawer,
  destroyDrawer,
  destroyDrawers,
  getChildDrawers,
  getDrawer,
  getDrawers,
  getParentDrawer,
  openDrawer,
  toggleDrawer,
  updateDrawer
} from '../src'

describe('vanilla root entry', () => {
  beforeEach(() => {
    destroyDrawers()
  })

  it('creates and returns a shared drawer controller', () => {
    const drawer = createDrawer({ direction: 'left', dismissible: false })

    expect(drawer.getSnapshot().state.direction).toBe('left')
    expect(drawer.getSnapshot().state.dismissible).toBe(false)
    expect(getDrawer()).not.toBeNull()
  })

  it('updates the same shared controller via configureDrawer', () => {
    const drawer = createDrawer({ direction: 'bottom' })
    const updated = configureDrawer({ modal: false })

    expect(updated).toBeTruthy()
    expect(updated.getSnapshot().state.modal).toBe(false)
    expect(drawer.getSnapshot().state.modal).toBe(false)
  })

  it('destroys the shared vanilla controller', () => {
    createDrawer({ direction: 'bottom' })

    destroyDrawer()

    expect(getDrawer()).toBeNull()
  })

  it('stores vanilla-only render options on the shared controller', () => {
    const drawer = createDrawer({
      triggerText: 'Open drawer',
      showHandle: true,
      handleClassName: 'drawer-handle',
      ariaLabel: 'Drawer label',
      ariaLabelledBy: 'drawer-title-id',
      ariaDescribedBy: 'drawer-description-id',
      title: 'Drawer title',
      titleVisuallyHidden: true,
      description: 'Drawer description',
      descriptionVisuallyHidden: true,
      content: 'Drawer content'
    })

    expect(drawer.options.triggerText).toBe('Open drawer')
    expect(drawer.options.showHandle).toBe(true)
    expect(drawer.options.handleClassName).toBe('drawer-handle')
    expect(drawer.options.ariaLabel).toBe('Drawer label')
    expect(drawer.options.ariaLabelledBy).toBe('drawer-title-id')
    expect(drawer.options.ariaDescribedBy).toBe('drawer-description-id')
    expect(drawer.options.title).toBe('Drawer title')
    expect(drawer.options.titleVisuallyHidden).toBe(true)
    expect(drawer.options.description).toBe('Drawer description')
    expect(drawer.options.descriptionVisuallyHidden).toBe(true)
    expect(drawer.options.content).toBe('Drawer content')
  })

  it('creates multiple independent drawer instances when ids are provided', () => {
    const leftDrawer = createDrawer({ id: 'left', direction: 'left', dismissible: false })
    const rightDrawer = createDrawer({ id: 'right', direction: 'right', modal: false })

    expect(leftDrawer.id).toBe('left')
    expect(rightDrawer.id).toBe('right')
    expect(getDrawer('left')?.getSnapshot().state.direction).toBe('left')
    expect(getDrawer('right')?.getSnapshot().state.direction).toBe('right')
    expect(getDrawer('left')?.getSnapshot().state.modal).toBe(true)
    expect(getDrawer('right')?.getSnapshot().state.modal).toBe(false)
    expect(Object.keys(getDrawers())).toEqual(['left', 'right'])
  })

  it('destroys only the targeted drawer instance', () => {
    createDrawer({ id: 'alpha', direction: 'left' })
    createDrawer({ id: 'beta', direction: 'right' })

    destroyDrawer('alpha')

    expect(getDrawer('alpha')).toBeNull()
    expect(getDrawer('beta')).not.toBeNull()
  })

  it('notifies shared lifecycle callbacks for programmatic open and close changes', () => {
    vi.useFakeTimers()

    const onOpenChange = vi.fn()
    const onClose = vi.fn()
    const onAnimationEnd = vi.fn()
    const drawer = createDrawer({
      id: 'callbacks',
      onOpenChange,
      onClose,
      onAnimationEnd
    })

    drawer.setOpen(true)
    drawer.setOpen(false)
    vi.runAllTimers()

    expect(onOpenChange).toHaveBeenNthCalledWith(1, true)
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onAnimationEnd).toHaveBeenNthCalledWith(1, true)
    expect(onAnimationEnd).toHaveBeenNthCalledWith(2, false)

    vi.useRealTimers()
  })

  it('supports imperative helpers for opening, closing, toggling, and updating by id', () => {
    openDrawer('helper-drawer')
    expect(getDrawer('helper-drawer')?.getSnapshot().state.isOpen).toBe(true)

    closeDrawer('helper-drawer')
    expect(getDrawer('helper-drawer')?.getSnapshot().state.isOpen).toBe(false)

    toggleDrawer('helper-drawer')
    expect(getDrawer('helper-drawer')?.getSnapshot().state.isOpen).toBe(true)

    updateDrawer('helper-drawer', { direction: 'left', modal: false })
    expect(getDrawer('helper-drawer')?.getSnapshot().state.direction).toBe('left')
    expect(getDrawer('helper-drawer')?.getSnapshot().state.modal).toBe(false)
  })

  it('keeps snap point state observable through the vanilla controller', () => {
    const onReleaseChange = vi.fn()
    const drawer = createDrawer({
      id: 'snap-vanilla',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      onReleaseChange
    })

    expect(drawer.getSnapshot().state.activeSnapPoint).toBe('120px')
    expect(drawer.options.onReleaseChange).toBe(onReleaseChange)

    drawer.setActiveSnapPoint('320px')
    expect(getDrawer('snap-vanilla')?.getSnapshot().state.activeSnapPoint).toBe('320px')

    updateDrawer('snap-vanilla', { activeSnapPoint: 1 })
    expect(getDrawer('snap-vanilla')?.getSnapshot().state.activeSnapPoint).toBe(1)
  })

  it('tracks parent-child relationships and coordinates nested drawers outside React', () => {
    createDrawer({ id: 'parent', direction: 'bottom' })
    createDrawer({ id: 'child', parentId: 'parent', open: true, direction: 'right' })

    expect(getParentDrawer('child')?.id).toBe('parent')
    expect(getChildDrawers('parent').map((drawer) => drawer.id)).toEqual(['child'])
    expect(getDrawer('child')?.options.nested).toBe(true)
    expect(getDrawer('parent')?.getSnapshot().state.isOpen).toBe(true)

    closeDrawer('parent')

    expect(getDrawer('parent')?.getSnapshot().state.isOpen).toBe(false)
    expect(getDrawer('child')?.getSnapshot().state.isOpen).toBe(false)
  })

  it('destroys child drawers recursively when destroying a parent', () => {
    createDrawer({ id: 'parent' })
    createDrawer({ id: 'child-a', parentId: 'parent' })
    createDrawer({ id: 'child-b', parentId: 'parent' })

    destroyDrawer('parent')

    expect(getDrawer('parent')).toBeNull()
    expect(getDrawer('child-a')).toBeNull()
    expect(getDrawer('child-b')).toBeNull()
  })

  it('leaves the runtime registry empty after repeated create and destroy cycles', () => {
    for (let index = 0; index < 50; index += 1) {
      const id = `cycle-${index}`

      createDrawer({
        id,
        direction: index % 2 === 0 ? 'bottom' : 'right',
        title: `Drawer ${index}`,
        content: `Content ${index}`
      })

      openDrawer(id)
      closeDrawer(id)
      destroyDrawer(id)
    }

    expect(Object.keys(getDrawers())).toHaveLength(0)
  })

  it('opens the full ancestor chain when a deep nested drawer opens', () => {
    createDrawer({ id: 'grandparent', open: false })
    createDrawer({ id: 'parent', parentId: 'grandparent', open: false })
    createDrawer({ id: 'child', parentId: 'parent', open: true })

    expect(getDrawer('grandparent')?.getSnapshot().state.isOpen).toBe(true)
    expect(getDrawer('parent')?.getSnapshot().state.isOpen).toBe(true)
    expect(getDrawer('child')?.getSnapshot().state.isOpen).toBe(true)
  })

  it('updates data-state on the dialog when opened programmatically', () => {
    const drawer = createDrawer({
      id: 'state-test',
      title: 'State test',
      content: 'Body',
      direction: 'bottom'
    })

    // mountVanillaDialog tears down and re-mounts the content on every
    // re-render, so each check has to query the fresh element.
    const getContent = () => document.querySelector('[data-drawer]') as HTMLElement | null

    expect(getContent()?.dataset.state).toBe('closed')

    drawer.setOpen(true)
    expect(getContent()?.dataset.state).toBe('open')

    drawer.setOpen(false)
    expect(getContent()?.dataset.state).toBe('closed')
  })
})
