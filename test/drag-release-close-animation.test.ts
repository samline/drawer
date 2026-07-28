import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers, getDrawer } from '../src'
import type { CommonDrawerDirection } from '../src/core'

/**
 * Regression tests for the drag-release close animation.
 *
 * Bug fixed in v3.0.0-beta.4: drag-release close either disappeared
 * or jumped back to open before exiting. The close path now retains
 * the release transform, samples the rendered position, and
 * transitions from that position to the directional closed endpoint.
 *
 * jsdom does not run CSS animations, so we assert on the inline
 * `transform` style on the content (which the fix clears) and on
 * the post-`onOpenChange(false)` state. Real-browser verification
 * lives in the consumer's E2E suite.
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

function dragPastCloseThreshold(direction: CommonDrawerDirection) {
  // 30% of the drawer dimension is well above the 25% close
  // threshold for both axes. The drag-release path picks the
  // 'close' action.
  const drawerDimension = direction === 'bottom' || direction === 'top' ? window.innerHeight : window.innerWidth
  const startY = 100
  const endY = startY + drawerDimension * 0.3
  dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: startY, pointerId: 1 }))
  // 30 ms keeps the velocity above VELOCITY_THRESHOLD.
  vi.advanceTimersByTime(30)
  dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: endY, pointerId: 1 }))
  dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: endY, pointerId: 1 }))
}

describe('drag-release close animation', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('clears the inline transform on the content before the close animation runs (direction: bottom)', () => {
    vi.useFakeTimers()
    const onOpenChange = vi.fn()
    const drawer = createDrawer({
      id: 'drag-close-bottom',
      direction: 'bottom',
      title: 'Drag close bottom',
      content: 'Body',
      onOpenChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    dragPastCloseThreshold('bottom')

    const content = getContent()
    // jsdom does not interpolate CSS transitions, so the retained
    // release transform remains observable until timed DOM removal.
    expect(content.style.transform).toMatch(/translate3d\(/)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(drawer.getSnapshot().state.isOpen).toBe(false)
  })

  it('retains the inline transform as the close start frame (direction: right)', () => {
    vi.useFakeTimers()
    const onOpenChange = vi.fn()
    const drawer = createDrawer({
      id: 'drag-close-right',
      direction: 'right',
      title: 'Drag close right',
      content: 'Body',
      onOpenChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    // For `direction: 'right'`, the close direction is to the right
    // (positive X). The drag pipeline reads the start pointer
    // position from the event's clientX since the axis is
    // horizontal.
    const startX = 50
    const endX = startX + window.innerWidth * 0.3
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: startX, clientY: 50, pointerId: 1 }))
    vi.advanceTimersByTime(30)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: endX, clientY: 50, pointerId: 1 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: endX, clientY: 50, pointerId: 1 }))

    const content = getContent()
    // Bug fix (refined 2026-07-27): see the matching block for
    // direction: 'bottom'. The inline `transform` is kept during
    // the close animation so the `slideToRight` keyframe
    // interpolates from the dragged position to the closed-position
    // keyframe, instead of jumping back to the open position first.
    expect(content.style.transform).toMatch(/translate3d\(/)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(drawer.getSnapshot().state.isOpen).toBe(false)
  })

  it('still applies the inline transform on the snap-back path (so the CSS transition has a start frame)', () => {
    // The fix is scoped to the drag-release *close* path. The
    // snap-back path (drag below threshold, drawer stays open) still
    // sets the inline transform so the CSS transition has a clean
    // start frame for the visible snap-back animation.
    vi.useFakeTimers()
    const onOpenChange = vi.fn()
    const drawer = createDrawer({
      id: 'drag-snap-back',
      direction: 'bottom',
      title: 'Drag snap back',
      content: 'Body',
      onOpenChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    // 5% drag — well below the 25% close threshold. Slow velocity.
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 100, pointerId: 1 }))
    vi.advanceTimersByTime(1000)
    const endY = 100 + window.innerHeight * 0.05
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: endY, pointerId: 1 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: endY, pointerId: 1 }))

    const content = getContent()
    // The snap-back path writes the open-position transform with a
    // transition. The transform attribute is non-empty and the
    // transition is set so the visible snap-back animation runs.
    expect(content.style.transform).not.toBe('')
    expect(content.style.transition).toContain('transform')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(drawer.getSnapshot().state.isOpen).toBe(true)
  })

  it('retains the inline transform on the snap-points close path', () => {
    // The Phase B snap-points release path also has a `close` action
    // (when the user drags in the dismiss direction from the active
    // snap with high velocity). The fix applies to that path too —
    // the same inline transform leftover bug would silence the slide.
    //
    // We use `direction: 'right'` with a small snap-point array. The
    // close direction is left (negative X). A high-velocity left
    // swipe from the first snap triggers the close action.
    //
    vi.useFakeTimers()
    const onOpenChange = vi.fn()
    const drawer = createDrawer({
      id: 'drag-close-snap',
      direction: 'right',
      title: 'Drag close snap',
      content: 'Body',
      snapPoints: [0.25, 0.5, 1],
      activeSnapPoint: 0.25,
      fadeFromIndex: 0,
      onOpenChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    // Drag right (positive X) with high velocity. For the first snap
    // and high velocity (< 0.4 viewport), the release returns
    // 'close' when dragDirection < 0 and dismissible. For
    // `direction: 'right'`, the close direction is LEFT (negative X
    // movement), so `draggedDistance = startX - endX` is NEGATIVE.
    const startX = 100
    const endX = 200
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: startX, clientY: 50, pointerId: 1 }))
    // 5 ms — high velocity (100px / 5ms = 20 px/ms, above
    // highVelocityThreshold = 2).
    vi.advanceTimersByTime(5)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: endX, clientY: 50, pointerId: 1 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: endX, clientY: 50, pointerId: 1 }))

    const content = getContent()
    // Bug fix (refined 2026-07-27): see the matching block for
    // direction: 'bottom'. The inline `transform` is kept during
    // the close animation so the snap-points close path also
    // interpolates from the dragged position to the closed-position
    // keyframe.
    expect(content.style.transform).toMatch(/translate3d\(/)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(getDrawer('drag-close-snap')?.getSnapshot().state.isOpen).toBe(false)
  })
})
