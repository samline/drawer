import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers, getDrawer } from '../src'
import type { CommonDrawerDirection } from '../src/core'

/**
 * Regression tests for the drag-release close animation.
 *
 * Bug (v3.0.0-beta.3 → stable): closing a drawer via a drag-down
 * release did not visibly play the CSS `slideToBottom` /
 * `slideToRight` / etc. animation. The drawer just disappeared.
 *
 * Root cause: the drag pipeline writes an inline `transform:
 * translate3d(...)` on the content (the position the user dragged
 * it to). The close animation interpolates from the current
 * computed transform to the closed-position keyframe. With the
 * inline transform in place, the animation usually starts at a
 * position already past the closed position, so the slide is
 * invisible — the drawer just disappears.
 *
 * Fix: in the drag-release close path (Phase A and Phase B), the
 * dialog clears the inline `transform` on the content before
 * calling `onOpenChange(false)`. The CSS `data-drawer-closing`
 * rule's `transform: none` then provides the open position as the
 * animation's start frame, matching the close-button path.
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
    // The fix: the inline `transform` left over from the drag is
    // cleared so the CSS slide animation has the open position as
    // its start frame. Without this, the drawer disappears silently
    // because the animation interpolates from the dragged position
    // (often already past the closed position) to the closed-position
    // keyframe.
    expect(content.style.transform).toBe('')
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(drawer.getSnapshot().state.isOpen).toBe(false)
  })

  it('clears the inline transform on the content before the close animation runs (direction: right)', () => {
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
    expect(content.style.transform).toBe('')
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

  it('clears the inline transform on the content before the close animation runs (snap-points close path)', () => {
    // The Phase B snap-points release path also has a `close` action
    // (when the user drags in the dismiss direction from the active
    // snap with high velocity). The fix applies to that path too —
    // the same inline transform leftover bug would silence the slide.
    //
    // We use `direction: 'right'` with a small snap-point array. The
    // close direction is left (negative X). A high-velocity left
    // swipe from the first snap triggers the close action.
    //
    // `fadeFromIndex` is required: the snap-points release returns
    // 'noop' when `fadeFromIndex` is undefined (the fade overlay is
    // the only thing that distinguishes snap-point transitions from
    // a free drag).
    vi.useFakeTimers()
    const onOpenChange = vi.fn()
    const drawer = createDrawer({
      id: 'drag-close-snap',
      direction: 'right',
      title: 'Drag close snap',
      content: 'Body',
      snapPoints: ['0.25', '0.5', '1'],
      activeSnapPoint: '0.25',
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
    expect(content.style.transform).toBe('')
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(getDrawer('drag-close-snap')?.getSnapshot().state.isOpen).toBe(false)
  })
})
