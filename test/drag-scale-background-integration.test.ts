import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'
import { TRANSITIONS } from '../src/constants'
import { getBackgroundDragState, getBackgroundResetState } from '../src/runtime/transforms'
import type { CommonDrawerDirection } from '../src/core'

/**
 * Phase C integration tests for the background-scale pipeline.
 *
 * Reuses the synthetic pointer-event pattern from Phase A and B:
 * `createPointerEvent` attaches `clientX`, `clientY`, and `pointerId`
 * to a plain `Event` because jsdom does not implement `PointerEvent`.
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

function getWrapper(): HTMLElement {
  const element = document.querySelector('[data-drawer-wrapper]') as HTMLElement | null
  if (!element) {
    throw new Error('Expected a [data-drawer-wrapper] element to be in the DOM')
  }
  return element
}

function dispatchOnContent(event: Event) {
  getContent().dispatchEvent(event)
}

function attachWrapper() {
  const wrapper = document.createElement('div')
  wrapper.setAttribute('data-drawer-wrapper', '')
  document.body.appendChild(wrapper)
  return wrapper
}

function removeWrapper() {
  document.querySelectorAll('[data-drawer-wrapper]').forEach((node) => node.remove())
}

/**
 * Mirrors `computeBaseScale` in `src/vanilla/dialog.ts`. 1:1 with
 * vaul upstream's `useScaleBackground#getScale()`: always uses
 * `innerWidth` and `WINDOW_TOP_OFFSET` (= 26), regardless of
 * direction. Audit G4 fixed the previous formula which incorrectly
 * used `NESTED_DISPLACEMENT` (= 16) and switched axes per
 * direction.
 */
function computeBaseScale(_direction: CommonDrawerDirection): number {
  if (window.innerWidth <= 0) return 1
  return (window.innerWidth - 26) / window.innerWidth
}

describe('drag pipeline integration (Phase C — scale background)', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
    removeWrapper()
  })

  afterEach(() => {
    vi.useRealTimers()
    destroyDrawers()
    document.body.innerHTML = ''
    removeWrapper()
  })

  it('applies the wrapper open-rest state when the drawer opens', () => {
    const wrapper = attachWrapper()
    const direction: CommonDrawerDirection = 'bottom'
    const baseScale = computeBaseScale(direction)
    const drawer = createDrawer({
      id: 'scale-open',
      direction,
      shouldScaleBackground: true,
      title: 'Scale open',
      content: 'Body'
    })
    drawer.setOpen(true)

    const { borderRadius, overflow, transform, transformOrigin } = getBackgroundResetState({
      direction,
      baseScale
    })
    expect(wrapper.style.transform).toBe(transform)
    expect(wrapper.style.borderRadius).toBe(borderRadius)
    expect(wrapper.style.overflow).toBe(overflow)
    expect(wrapper.style.transformOrigin).toBe(transformOrigin)
    expect(document.body.style.backgroundColor).toBe('black')
  })

  it('writes the drag-state transform to the wrapper during a mid-drag move', () => {
    const wrapper = attachWrapper()
    const direction: CommonDrawerDirection = 'bottom'
    const baseScale = computeBaseScale(direction)

    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'scale-drag',
      direction,
      shouldScaleBackground: true,
      title: 'Scale drag',
      content: 'Body'
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    const drawerHeight = window.innerHeight
    const startY = 200
    const endY = 200 + drawerHeight * 0.5

    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: startY, pointerId: 91 }))
    vi.advanceTimersByTime(10)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: endY, pointerId: 91 }))

    // Compute the expected wrapper transform from the runtime helper
    // (the single source of truth for the drag-state math). The
    // expected percentage is `0.5` (50% of the drawer height) and
    // the expected translate is `7` (`14 - 0.5 * 14`).
    const percentageDragged = 0.5
    const { scaleValue, borderRadiusValue, translateValue } = getBackgroundDragState({
      baseScale,
      percentageDragged
    })
    const expectedTransform = `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)`

    expect(wrapper.style.transform).toBe(expectedTransform)
    expect(wrapper.style.borderRadius).toBe(`${borderRadiusValue}px`)
    expect(wrapper.style.overflow).toBe('hidden')
    expect(wrapper.style.transformOrigin).toBe('top')
  })

  it('clears the wrapper inline styles after TRANSITIONS.DURATION on a close release', () => {
    const wrapper = attachWrapper()
    const direction: CommonDrawerDirection = 'bottom'
    const baseScale = computeBaseScale(direction)

    vi.useFakeTimers()
    const onOpenChange = vi.fn()
    const onReleaseChange = vi.fn()
    const drawer = createDrawer({
      id: 'scale-close-release',
      direction,
      shouldScaleBackground: true,
      title: 'Scale close release',
      content: 'Body',
      onOpenChange,
      onReleaseChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    const drawerHeight = window.innerHeight
    // Drag down by 40% of the drawer height — well past the 25%
    // close threshold. The 10 ms tick makes the velocity
    // (40% / 10 ms) high enough to clear VELOCITY_THRESHOLD.
    const startY = 100
    const endY = startY + drawerHeight * 0.4

    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: startY, pointerId: 93 }))
    vi.advanceTimersByTime(10)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: endY, pointerId: 93 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: endY, pointerId: 93 }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onReleaseChange).toHaveBeenCalledWith(false)

    // Closing targets the page's normal state, not the scaled open
    // rest state. Overflow/origin remain until the transition ends.
    expect(wrapper.style.transform).toBe('none')
    expect(wrapper.style.borderRadius).toBe('0px')
    expect(wrapper.style.overflow).toBe('hidden')
    expect(wrapper.style.transformOrigin).toBe('top')

    // Advance the fake clock past TRANSITIONS.DURATION so the
    // deferred clear fires. The wrapper should land in its NORMAL
    // state — no inline styles.
    vi.advanceTimersByTime(TRANSITIONS.DURATION * 1000 + 50)
    expect(wrapper.style.transform).toBe('')
    expect(wrapper.style.borderRadius).toBe('')
    expect(wrapper.style.overflow).toBe('')
    expect(wrapper.style.transformOrigin).toBe('')
  })

  it('settles the wrapper on the open-rest state on a reset release (no close)', () => {
    const wrapper = attachWrapper()
    const direction: CommonDrawerDirection = 'bottom'
    const baseScale = computeBaseScale(direction)

    vi.useFakeTimers()
    const onOpenChange = vi.fn()
    const onReleaseChange = vi.fn()
    const drawer = createDrawer({
      id: 'scale-reset-release',
      direction,
      shouldScaleBackground: true,
      title: 'Scale reset release',
      content: 'Body',
      onOpenChange,
      onReleaseChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    // Drag down by 5% — well below the 25% close threshold. The
    // slow advance keeps velocity low so the release resolves to
    // the in-place reset path.
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 100, pointerId: 95 }))
    vi.advanceTimersByTime(1000)
    const endY = 100 + window.innerHeight * 0.05
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: endY, pointerId: 95 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: endY, pointerId: 95 }))

    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onReleaseChange).toHaveBeenCalledWith(true)

    // The wrapper settles on the open-rest state. No deferred
    // clear is scheduled on a reset release — the wrapper stays at
    // baseScale for the remainder of the open session.
    const { borderRadius, overflow, transform, transformOrigin } = getBackgroundResetState({
      direction,
      baseScale
    })
    expect(wrapper.style.transform).toBe(transform)
    expect(wrapper.style.borderRadius).toBe(borderRadius)
    expect(wrapper.style.overflow).toBe(overflow)
    expect(wrapper.style.transformOrigin).toBe(transformOrigin)

    // Advancing the clock should NOT clear the inline styles on
    // a reset release — the wrapper stays at baseScale.
    vi.advanceTimersByTime(TRANSITIONS.DURATION * 1000 + 50)
    expect(wrapper.style.transform).toBe(transform)
  })

  it('does NOT touch the wrapper when shouldScaleBackground is false', () => {
    const wrapper = attachWrapper()
    const onDragChange = vi.fn()

    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'no-scale',
      direction: 'bottom',
      // shouldScaleBackground: undefined → false by default
      title: 'No scale',
      content: 'Body',
      onDragChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    const drawerHeight = window.innerHeight
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 200, pointerId: 97 }))
    vi.advanceTimersByTime(10)
    dispatchOnContent(
      createPointerEvent('pointermove', { clientX: 50, clientY: 200 + drawerHeight * 0.5, pointerId: 97 })
    )

    // Drag fired (so the pipeline ran), but the wrapper is untouched.
    expect(onDragChange).toHaveBeenCalled()
    expect(wrapper.style.transform).toBe('')
    expect(wrapper.style.borderRadius).toBe('')
    expect(wrapper.style.overflow).toBe('')
  })

  it('writes a background-color overlay during drag by default', () => {
    const wrapper = attachWrapper()

    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'scale-color',
      direction: 'bottom',
      shouldScaleBackground: true,
      title: 'Scale color',
      content: 'Body'
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    const drawerHeight = window.innerHeight
    const startY = 200
    const endY = 200 + drawerHeight * 0.5

    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: startY, pointerId: 99 }))
    vi.advanceTimersByTime(10)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: endY, pointerId: 99 }))

    // The overlay is a translucent black at the drag percentage
    // (50% of the drawer height → 0.5 × 0.5 = 0.25 alpha). The
    // exact value comes from `applyWrapperDragState`; the spec
    // accepts the `rgba(0, 0, 0, percentageDragged * 0.5)`
    // approximation documented in the deliverable.
    const match = wrapper.style.backgroundColor.match(/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([0-9.]+)\s*\)$/)
    expect(match).not.toBeNull()
    const alpha = Number(match?.[1] ?? -1)
    expect(alpha).toBeGreaterThan(0)
    expect(alpha).toBeLessThanOrEqual(0.5)

    // Release with reset (slow, below threshold) → background-color
    // is cleared from the wrapper along with the rest-state apply.
    vi.advanceTimersByTime(1000)
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: startY, pointerId: 99 }))

    expect(wrapper.style.backgroundColor).toBe('')
  })

  it('uses the X axis for horizontal directions (left/right)', () => {
    const wrapper = attachWrapper()
    const direction: CommonDrawerDirection = 'right'
    const baseScale = computeBaseScale(direction)
    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'scale-horizontal',
      direction,
      shouldScaleBackground: true,
      title: 'Scale horizontal',
      content: 'Body'
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    const drawerWidth = window.innerWidth
    const startX = 100
    const endX = startX + drawerWidth * 0.5

    dispatchOnContent(createPointerEvent('pointerdown', { clientX: startX, clientY: 50, pointerId: 101 }))
    vi.advanceTimersByTime(10)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: endX, clientY: 50, pointerId: 101 }))

    const percentageDragged = 0.5
    const { scaleValue, translateValue } = getBackgroundDragState({
      baseScale,
      percentageDragged
    })
    const expectedTransform = `scale(${scaleValue}) translate3d(${translateValue}px, 0, 0)`
    expect(wrapper.style.transform).toBe(expectedTransform)
    // Horizontal origin is `left`, not `top`.
    expect(wrapper.style.transformOrigin).toBe('left')
  })

  it('animates the wrapper back to NORMAL on a programmatic close (no drag)', () => {
    const wrapper = attachWrapper()
    const direction: CommonDrawerDirection = 'bottom'

    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'scale-prog-close',
      direction,
      shouldScaleBackground: true,
      title: 'Scale programmatic close',
      content: 'Body'
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    drawer.setOpen(false)

    expect(wrapper.style.transform).toBe('none')
    expect(wrapper.style.borderRadius).toBe('0px')
    expect(wrapper.style.overflow).toBe('hidden')
    expect(wrapper.style.transformOrigin).toBe('top')

    // After the transition completes, the wrapper is stripped of
    // every inline style we wrote.
    vi.advanceTimersByTime(TRANSITIONS.DURATION * 1000 + 50)
    expect(wrapper.style.transform).toBe('')
    expect(wrapper.style.borderRadius).toBe('')
    expect(wrapper.style.overflow).toBe('')
    expect(wrapper.style.transformOrigin).toBe('')
  })

  it('keeps the newest scale owner active when an older drawer closes', () => {
    const wrapper = attachWrapper()
    vi.useFakeTimers()
    const first = createDrawer({
      id: 'scale-owner-first',
      open: true,
      direction: 'bottom',
      shouldScaleBackground: true,
      content: 'First'
    })
    const second = createDrawer({
      id: 'scale-owner-second',
      open: true,
      direction: 'right',
      shouldScaleBackground: true,
      content: 'Second'
    })
    const secondTransform = getBackgroundResetState({
      direction: 'right',
      baseScale: computeBaseScale('right')
    }).transform

    expect(wrapper.style.transform).toBe(secondTransform)
    first.setOpen(false)
    vi.advanceTimersByTime(TRANSITIONS.DURATION * 1000)

    expect(second.getSnapshot().state.isOpen).toBe(true)
    expect(wrapper.style.transform).toBe(secondTransform)
    expect(document.body.style.backgroundColor).toBe('black')
  })

  it('reapplies the previous scale owner when the newest drawer closes', () => {
    const wrapper = attachWrapper()
    vi.useFakeTimers()
    const first = createDrawer({
      id: 'scale-stack-first',
      open: true,
      direction: 'bottom',
      shouldScaleBackground: true,
      content: 'First'
    })
    const second = createDrawer({
      id: 'scale-stack-second',
      open: true,
      direction: 'right',
      shouldScaleBackground: true,
      content: 'Second'
    })
    const firstTransform = getBackgroundResetState({
      direction: 'bottom',
      baseScale: computeBaseScale('bottom')
    }).transform

    second.setOpen(false)

    expect(first.getSnapshot().state.isOpen).toBe(true)
    expect(wrapper.style.transform).toBe(firstTransform)
    expect(document.body.style.backgroundColor).toBe('black')
  })

  it('does not promote a background scale owner when it remounts', () => {
    const wrapper = attachWrapper()
    const first = createDrawer({
      id: 'scale-remount-first',
      open: true,
      direction: 'bottom',
      shouldScaleBackground: true,
      content: 'First'
    })
    createDrawer({
      id: 'scale-remount-second',
      open: true,
      direction: 'right',
      shouldScaleBackground: true,
      content: 'Second'
    })
    const foregroundTransform = getBackgroundResetState({
      direction: 'right',
      baseScale: computeBaseScale('right')
    }).transform

    first.update({ content: 'Updated first' })

    expect(wrapper.style.transform).toBe(foregroundTransform)
  })

  it('cannot restore a reused scale group from a stale drawer', () => {
    const wrapper = attachWrapper()
    vi.useFakeTimers()
    const first = createDrawer({
      id: 'scale-stale-first',
      open: true,
      shouldScaleBackground: true,
      content: 'First'
    })
    first.setOpen(false)
    const second = createDrawer({
      id: 'scale-stale-second',
      open: true,
      shouldScaleBackground: true,
      content: 'Second'
    })
    second.setOpen(false)
    vi.advanceTimersByTime(TRANSITIONS.DURATION * 1000)

    const third = createDrawer({
      id: 'scale-stale-third',
      open: true,
      shouldScaleBackground: true,
      content: 'Third'
    })
    const activeTransform = wrapper.style.transform
    first.destroy()

    expect(third.getSnapshot().state.isOpen).toBe(true)
    expect(wrapper.style.transform).toBe(activeTransform)
    expect(document.body.style.backgroundColor).toBe('black')
  })

  it('shares body background ownership across replacement wrappers', () => {
    const firstWrapper = attachWrapper()
    const first = createDrawer({
      id: 'scale-wrapper-first',
      open: true,
      shouldScaleBackground: true,
      content: 'First'
    })
    firstWrapper.remove()
    const secondWrapper = attachWrapper()
    const second = createDrawer({
      id: 'scale-wrapper-second',
      open: true,
      shouldScaleBackground: true,
      content: 'Second'
    })

    first.setOpen(false)

    expect(second.getSnapshot().state.isOpen).toBe(true)
    expect(secondWrapper.style.transform).not.toBe('')
    expect(document.body.style.backgroundColor).toBe('black')
  })

  it('releases captured scale styles when the option changes during close', () => {
    const wrapper = attachWrapper()
    wrapper.style.cssText = 'color: red; background-color: rgb(1, 2, 3) !important;'
    const originalCssText = wrapper.style.cssText
    document.body.style.setProperty('background-color', 'rgb(4, 5, 6)', 'important')
    const originalBodyCssText = document.body.style.cssText
    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'scale-option-flip',
      open: true,
      shouldScaleBackground: true,
      content: 'Body'
    })

    drawer.update({ open: false, shouldScaleBackground: false })
    vi.advanceTimersByTime(TRANSITIONS.DURATION * 1000)

    expect(wrapper.style.cssText).toBe(originalCssText)
    expect(document.body.style.cssText).toBe(originalBodyCssText)
  })

  it('restores body styles immediately when the captured wrapper was removed', () => {
    const wrapper = attachWrapper()
    document.body.style.backgroundColor = 'navy'
    const drawer = createDrawer({
      id: 'scale-removed-wrapper',
      open: true,
      shouldScaleBackground: true,
      content: 'Body'
    })

    wrapper.remove()
    drawer.setOpen(false)

    expect(document.body.style.backgroundColor).toBe('navy')
  })

  it('does not change the body when no scale wrapper exists', () => {
    document.body.style.backgroundColor = 'navy'
    createDrawer({ id: 'scale-no-wrapper', open: true, shouldScaleBackground: true, content: 'Body' })

    expect(document.body.style.backgroundColor).toBe('navy')
  })
})
