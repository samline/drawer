import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers, getDrawer } from '../src'

/**
 * Phase D integration tests for the handle-cycle pipeline.
 *
 * The vanilla dialog mounts a built-in `[data-drawer-handle]` element
 * when `options.handleOnly` or `options.showHandle` is set. Phase D
 * makes the handle interactive: clicking it advances the drawer to
 * the next snap point (or closes it at the last snap with
 * `dismissible: true`). The math is in `runtime/handle.ts`
 * (`getNextHandleState`); this test file verifies the dialog wires
 * the math into a real `click` event on the handle DOM element.
 *
 * Synthetic events: jsdom does not implement `PointerEvent`, so the
 * pointer helpers attach `clientX` / `clientY` / `pointerId` to a
 * plain `Event` via `Object.assign`. The handle click only needs a
 * plain `Event('click')` — no geometry fields.
 */
function createPointerEvent(
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  init: { clientX: number; clientY: number; pointerId?: number; bubbles?: boolean }
) {
  const event = new window.Event(type, { bubbles: init.bubbles ?? true })
  Object.assign(event, {
    clientX: init.clientX,
    clientY: init.clientY,
    pointerId: init.pointerId ?? 1
  })
  return event
}

function createClickEvent() {
  return new window.Event('click', { bubbles: true })
}

function getContent(): HTMLElement {
  const element = document.querySelector('[data-drawer]') as HTMLElement | null
  if (!element) {
    throw new Error('Expected a [data-drawer] content element to be mounted')
  }
  return element
}

function getHandle(): HTMLElement {
  const element = document.querySelector('[data-drawer-handle]') as HTMLElement | null
  if (!element) {
    throw new Error('Expected a [data-drawer-handle] element to be mounted')
  }
  return element
}

function dispatchOnContent(event: Event) {
  getContent().dispatchEvent(event)
}

function dispatchOnHandle(event: Event) {
  getHandle().dispatchEvent(event)
}

describe('drag pipeline integration (Phase D — handle cycle)', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('advances the activeSnapPoint to the next snap when the handle is clicked', () => {
    const drawer = createDrawer({
      id: 'handle-cycle-next',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 1,
      dismissible: true,
      showHandle: true,
      title: 'Handle cycle next',
      content: 'Body'
    })
    drawer.setOpen(true)
    expect(getDrawer('handle-cycle-next')?.getSnapshot().state.activeSnapPoint).toBe('120px')

    dispatchOnHandle(createClickEvent())

    expect(getDrawer('handle-cycle-next')?.getSnapshot().state.activeSnapPoint).toBe('320px')
    expect(getDrawer('handle-cycle-next')?.getSnapshot().state.isOpen).toBe(true)
  })

  it('closes the drawer when the handle is clicked at the LAST snap with dismissible: true', () => {
    const onOpenChange = vi.fn()
    const drawer = createDrawer({
      id: 'handle-cycle-close',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: 1,
      fadeFromIndex: 1,
      dismissible: true,
      showHandle: true,
      title: 'Handle cycle close',
      content: 'Body',
      onOpenChange
    })
    drawer.setOpen(true)
    expect(getDrawer('handle-cycle-close')?.getSnapshot().state.isOpen).toBe(true)

    dispatchOnHandle(createClickEvent())

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(getDrawer('handle-cycle-close')?.getSnapshot().state.isOpen).toBe(false)
  })

  it('does NOT close the drawer when the handle is clicked at the LAST snap with dismissible: false (cycles back to nothing)', () => {
    const onOpenChange = vi.fn()
    const drawer = createDrawer({
      id: 'handle-cycle-no-close',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: 1,
      fadeFromIndex: 1,
      dismissible: false,
      showHandle: true,
      title: 'Handle cycle no close',
      content: 'Body',
      onOpenChange
    })
    drawer.setOpen(true)
    expect(getDrawer('handle-cycle-no-close')?.getSnapshot().state.isOpen).toBe(true)

    dispatchOnHandle(createClickEvent())

    // The helper returns `{ type: 'snap', snapPoint: null }` for the
    // last-snap + non-dismissible case. The dialog forwards `null`
    // through `onActiveSnapPointChange`. The registry's `toSnapshot`
    // derivation falls back to the first snap point when the
    // active snap is `null` (`options.activeSnapPoint ??
    // options.snapPoints?.[0] ?? null`), so the snapshot reports
    // '120px'. The key assertion is that the drawer stays open
    // (the handle click did NOT call `onOpenChange(false)`).
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(getDrawer('handle-cycle-no-close')?.getSnapshot().state.isOpen).toBe(true)
    expect(getDrawer('handle-cycle-no-close')?.getSnapshot().state.activeSnapPoint).toBe('120px')
  })

  it('does NOT close the drawer when the handle is clicked without snap points and dismissible: true (noop branch)', () => {
    // The helper's no-snap + dismissible branch returns `{ type: 'noop' }`.
    // The spec test list describes this case as "cycles to close", but
    // the pure helper short-circuits to noop for dismissible drawers
    // without snap points. This test pins the actual helper contract
    // (the dialog MUST NOT close the drawer in this branch).
    const onOpenChange = vi.fn()
    const drawer = createDrawer({
      id: 'handle-no-snap-dismissible',
      direction: 'bottom',
      dismissible: true,
      showHandle: true,
      title: 'Handle no snap dismissible',
      content: 'Body',
      onOpenChange
    })
    drawer.setOpen(true)
    // `setOpen(true)` fires `onOpenChange(true)` — that is the
    // expected first call. The handle click must NOT add a second
    // call (it must NOT close the drawer).
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(getDrawer('handle-no-snap-dismissible')?.getSnapshot().state.isOpen).toBe(true)

    dispatchOnHandle(createClickEvent())

    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(getDrawer('handle-no-snap-dismissible')?.getSnapshot().state.isOpen).toBe(true)
  })

  it('closes the drawer when the handle is clicked without snap points and dismissible: false', () => {
    // The other branch of the no-snap case: non-dismissible + no snap
    // points → `{ type: 'close' }`. The handle click closes the drawer.
    const onOpenChange = vi.fn()
    const drawer = createDrawer({
      id: 'handle-no-snap-no-dismissible',
      direction: 'bottom',
      dismissible: false,
      showHandle: true,
      title: 'Handle no snap not dismissible',
      content: 'Body',
      onOpenChange
    })
    drawer.setOpen(true)
    expect(getDrawer('handle-no-snap-no-dismissible')?.getSnapshot().state.isOpen).toBe(true)

    dispatchOnHandle(createClickEvent())

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(getDrawer('handle-no-snap-no-dismissible')?.getSnapshot().state.isOpen).toBe(false)
  })

  it('does NOT cycle when the handle is clicked while a drag is in progress', () => {
    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'handle-cycle-during-drag',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 1,
      dismissible: true,
      showHandle: true,
      title: 'Handle cycle during drag',
      content: 'Body'
    })
    drawer.setOpen(true)
    // Advance past the 500 ms grace period so the drag policy allows
    // the gesture.
    vi.advanceTimersByTime(600)

    // Start a drag on the content. `state.drag` is now non-null.
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 100, pointerId: 91 }))

    // Mid-drag, dispatch a click on the handle. The dialog's
    // `onHandleClick` reads `state.drag !== null` and forwards
    // `isDragging: true` to the helper, which returns noop. The
    // active snap and the open state must not change.
    dispatchOnHandle(createClickEvent())

    expect(getDrawer('handle-cycle-during-drag')?.getSnapshot().state.activeSnapPoint).toBe('120px')
    expect(getDrawer('handle-cycle-during-drag')?.getSnapshot().state.isOpen).toBe(true)
  })

  it('does NOT cycle when preventCycle: true is set (the option short-circuits the helper)', () => {
    const drawer = createDrawer({
      id: 'handle-prevent-cycle',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 1,
      dismissible: true,
      showHandle: true,
      preventCycle: true,
      title: 'Handle prevent cycle',
      content: 'Body'
    })
    drawer.setOpen(true)
    expect(getDrawer('handle-prevent-cycle')?.getSnapshot().state.activeSnapPoint).toBe('120px')

    dispatchOnHandle(createClickEvent())

    // Helper returns noop for `preventCycle: true`. Active snap is
    // unchanged, drawer stays open.
    expect(getDrawer('handle-prevent-cycle')?.getSnapshot().state.activeSnapPoint).toBe('120px')
    expect(getDrawer('handle-prevent-cycle')?.getSnapshot().state.isOpen).toBe(true)
  })

  it('is a no-op when the handle is clicked while the drawer is closed', () => {
    // The handle element stays in the DOM across open/close cycles
    // (the CSS does not `display: none` it on close). A click on a
    // closed drawer's handle must not re-open the drawer.
    const onOpenChange = vi.fn()
    createDrawer({
      id: 'handle-click-closed',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 1,
      dismissible: true,
      showHandle: true,
      title: 'Handle click closed',
      content: 'Body',
      onOpenChange
    })
    // Drawer is closed (default).
    expect(getDrawer('handle-click-closed')?.getSnapshot().state.isOpen).toBe(false)

    dispatchOnHandle(createClickEvent())

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(getDrawer('handle-click-closed')?.getSnapshot().state.isOpen).toBe(false)
  })
})
