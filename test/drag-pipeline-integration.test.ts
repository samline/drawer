import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers, getDrawer } from '../src'
import type { CommonDrawerDirection } from '../src/core'

/**
 * Phase A integration tests for the drag-to-dismiss pipeline.
 *
 * The vanilla dialog is driven by synthetic pointer events: jsdom
 * does not implement `PointerEvent`, so the helpers here attach
 * `clientX`, `clientY`, and `pointerId` to a plain `Event` instance
 * via `Object.assign`. The dialog reads those fields off the cast
 * `DragPointerEvent`. Real browsers supply the same shape natively.
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

function getContent(): HTMLElement {
  const element = document.querySelector('[data-drawer]') as HTMLElement | null
  if (!element) {
    throw new Error('Expected a [data-drawer] content element to be mounted')
  }
  return element
}

function dispatchOnContent(event: Event) {
  getContent().dispatchEvent(event)
}

describe('drag pipeline integration (Phase A)', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('closes the drawer when a drag past the close threshold is released', () => {
    const onOpenChange = vi.fn()
    const onReleaseChange = vi.fn()
    const onDragChange = vi.fn()

    // Drag policy: 500 ms grace period after opening. With fake
    // timers the open time and pointer events happen at the same
    // performance.now() tick, so the drag is allowed as long as we
    // advance the clock past 500 ms first.
    vi.useFakeTimers()

    const drawer = createDrawer({
      id: 'drag-close',
      direction: 'bottom',
      title: 'Drag close',
      content: 'Body',
      onOpenChange,
      onReleaseChange,
      onDragChange
    })
    drawer.setOpen(true)
    // Advance past the 500 ms grace period and add some time so the
    // velocity calculation has a non-zero denominator.
    vi.advanceTimersByTime(600)

    const drawerHeight = window.innerHeight
    // Drag down by 30% of the drawer height (> 25% close threshold).
    const startY = 100
    const endY = startY + drawerHeight * 0.3

    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: startY, pointerId: 7 }))
    // Advance a tick so the velocity is not infinite — the drag is
    // 30% over a 30 ms span = high enough to clear VELOCITY_THRESHOLD.
    vi.advanceTimersByTime(30)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: endY, pointerId: 7 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: endY, pointerId: 7 }))

    expect(onDragChange).toHaveBeenCalled()
    // The last onDragChange call should report a percentage dragged
    // greater than 0.25 (the close threshold).
    const lastPercentage = onDragChange.mock.calls[onDragChange.mock.calls.length - 1]?.[0] as number
    expect(lastPercentage).toBeGreaterThan(0.25)

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onReleaseChange).toHaveBeenCalledWith(false)
    expect(getDrawer('drag-close')?.getSnapshot().state.isOpen).toBe(false)
  })

  it('resets to the open position when a small drag is released below the threshold', () => {
    const onOpenChange = vi.fn()
    const onReleaseChange = vi.fn()
    const onDragChange = vi.fn()

    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'drag-reset',
      direction: 'bottom',
      title: 'Drag reset',
      content: 'Body',
      onOpenChange,
      onReleaseChange,
      onDragChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    // Drag down by 5% — well below the 25% close threshold. We
    // advance the fake clock by a long interval so the velocity
    // (5% over 1 s) stays well under VELOCITY_THRESHOLD.
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 100, pointerId: 11 }))
    vi.advanceTimersByTime(1000)
    const endY = 100 + window.innerHeight * 0.05
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: endY, pointerId: 11 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: endY, pointerId: 11 }))

    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onReleaseChange).toHaveBeenCalledWith(true)
    expect(getDrawer('drag-reset')?.getSnapshot().state.isOpen).toBe(true)
    // onDragChange should have fired during the drag move.
    expect(onDragChange.mock.calls.length).toBeGreaterThan(0)
  })

  it('fires onDragChange with the expected percentage during the drag', () => {
    const onDragChange = vi.fn()

    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'drag-progress',
      direction: 'bottom',
      title: 'Drag progress',
      content: 'Body',
      onDragChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    const drawerHeight = window.innerHeight
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 200, pointerId: 21 }))
    vi.advanceTimersByTime(10)
    dispatchOnContent(
      createPointerEvent('pointermove', { clientX: 50, clientY: 200 + drawerHeight * 0.1, pointerId: 21 })
    )
    vi.advanceTimersByTime(10)
    dispatchOnContent(
      createPointerEvent('pointermove', { clientX: 50, clientY: 200 + drawerHeight * 0.5, pointerId: 21 })
    )
    // Release without crossing the threshold; the slow advance keeps
    // velocity low so the action resolves to 'reset' (and we focus
    // the assertion on the in-drag percentages).
    vi.advanceTimersByTime(1000)
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: 200, pointerId: 21 }))

    const percentages = onDragChange.mock.calls.map(([value]) => value as number)
    expect(percentages.length).toBeGreaterThanOrEqual(2)
    // The first move reports ~10% and the second reports ~50%.
    expect(percentages[0]).toBeCloseTo(0.1, 2)
    expect(percentages[1]).toBeCloseTo(0.5, 2)
    // Monotonically non-decreasing as the user drags further.
    for (let index = 1; index < percentages.length; index += 1) {
      expect(percentages[index]).toBeGreaterThanOrEqual(percentages[index - 1] as number)
    }
  })

  it('does not start a drag when the pointerdown target is inside a data-drawer-no-drag element', () => {
    const onDragChange = vi.fn()
    const onOpenChange = vi.fn()
    const onReleaseChange = vi.fn()

    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'drag-no-drag',
      direction: 'bottom',
      title: 'Drag no-drag',
      content: 'Body',
      onDragChange,
      onOpenChange,
      onReleaseChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    const content = getContent()
    const noDrag = document.createElement('div')
    noDrag.setAttribute('data-drawer-no-drag', '')
    const inner = document.createElement('button')
    inner.id = 'no-drag-trigger'
    inner.textContent = 'Do not drag from here'
    noDrag.appendChild(inner)
    content.appendChild(noDrag)

    const drawerHeight = window.innerHeight
    // Dispatch the pointerdown on the inner button — the policy
    // walks ancestors to find data-drawer-no-drag and rejects the
    // gesture before any pointermove listener is attached.
    inner.dispatchEvent(createPointerEvent('pointerdown', { clientX: 50, clientY: 100, pointerId: 31 }))
    vi.advanceTimersByTime(30)
    dispatchOnContent(
      createPointerEvent('pointermove', { clientX: 50, clientY: 100 + drawerHeight * 0.5, pointerId: 31 })
    )
    dispatchOnContent(
      createPointerEvent('pointerup', { clientX: 50, clientY: 100 + drawerHeight * 0.5, pointerId: 31 })
    )

    expect(onDragChange).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onReleaseChange).not.toHaveBeenCalled()
    expect(getDrawer('drag-no-drag')?.getSnapshot().state.isOpen).toBe(true)
  })

  it('blocks drag during the 500 ms grace period after opening (timeSinceOpenMs check)', () => {
    const onDragChange = vi.fn()
    const onOpenChange = vi.fn()
    const onReleaseChange = vi.fn()

    vi.useFakeTimers()
    // Open the drawer at t = 0 (fake timers).
    const drawer = createDrawer({
      id: 'drag-grace',
      direction: 'bottom',
      title: 'Drag grace',
      content: 'Body',
      onDragChange,
      onOpenChange,
      onReleaseChange
    })
    drawer.setOpen(true)
    // Do NOT advance the clock — the grace period is 500 ms, so
    // attempting a drag immediately must be rejected by the policy.

    const drawerHeight = window.innerHeight
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 100, pointerId: 41 }))
    vi.advanceTimersByTime(30)
    dispatchOnContent(
      createPointerEvent('pointermove', { clientX: 50, clientY: 100 + drawerHeight * 0.5, pointerId: 41 })
    )
    dispatchOnContent(
      createPointerEvent('pointerup', { clientX: 50, clientY: 100 + drawerHeight * 0.5, pointerId: 41 })
    )

    expect(onDragChange).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onReleaseChange).not.toHaveBeenCalled()
    expect(getDrawer('drag-grace')?.getSnapshot().state.isOpen).toBe(true)
  })

  it('reports the correct percentageDragged for horizontal directions', () => {
    const onDragChange = vi.fn()

    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'drag-horizontal',
      direction: 'right' as CommonDrawerDirection,
      title: 'Drag horizontal',
      content: 'Body',
      onDragChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    const drawerWidth = window.innerWidth
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 100, clientY: 50, pointerId: 51 }))
    vi.advanceTimersByTime(30)
    dispatchOnContent(
      createPointerEvent('pointermove', { clientX: 100 + drawerWidth * 0.4, clientY: 50, pointerId: 51 })
    )
    vi.advanceTimersByTime(1000)
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 100 + drawerWidth * 0.4, clientY: 50, pointerId: 51 }))

    const percentages = onDragChange.mock.calls.map(([value]) => value as number)
    expect(percentages.length).toBeGreaterThan(0)
    expect(percentages[percentages.length - 1]).toBeCloseTo(0.4, 2)
  })
})
