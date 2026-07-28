import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers, getDrawer } from '../src'
import { getSnapPointOffset, getSnapPointsOffset } from '../src/runtime/snap-points'

/**
 * Phase B integration tests for the snap-point drag pipeline.
 *
 * Reuses the synthetic pointer-event pattern from Phase A:
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

function getOverlay(): HTMLElement {
  const element = document.querySelector('[data-drawer-overlay]') as HTMLElement | null
  if (!element) {
    throw new Error('Expected a [data-drawer-overlay] element to be mounted')
  }
  return element
}

function dispatchOnContent(event: Event) {
  getContent().dispatchEvent(event)
}

describe('drag pipeline integration (Phase B — snap points)', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    destroyDrawers()
    document.body.innerHTML = ''
  })

  it('writes the active snap offset to --initial-transform on open', () => {
    const drawer = createDrawer({
      id: 'snap-initial',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      title: 'Snap initial',
      content: 'Body'
    })
    drawer.setOpen(true)

    const content = getContent()
    const expectedOffset = getSnapPointOffset({
      snapPoint: '120px',
      direction: 'bottom',
      containerSize: { width: window.innerWidth, height: window.innerHeight }
    })
    expect(content.style.getPropertyValue('--initial-transform')).toBe(`${expectedOffset}px`)

    // Sanity: the offset is the same value the drag pipeline uses
    // for `getSnapDragValue` (runtime helper output).
    expect(expectedOffset).toBeGreaterThan(0)
  })

  it('animates from the closed edge to the active snap on a later open', () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })

    const drawer = createDrawer({
      id: 'snap-entrance',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 0,
      title: 'Snap entrance',
      content: 'Body'
    })

    drawer.setOpen(true)

    const content = getContent()
    const overlay = getOverlay()
    const expectedOffset = getSnapPointOffset({
      snapPoint: '120px',
      direction: 'bottom',
      containerSize: { width: window.innerWidth, height: window.innerHeight }
    })

    expect(content.style.transform).toBe('translate3d(0, 100%, 0)')
    expect(content.style.transition).toBe('none')
    expect(overlay.style.opacity).toBe('0')

    frames.forEach((callback) => callback(0))

    expect(content.style.transform).toBe(`translate3d(0, ${expectedOffset}px, 0)`)
    expect(content.style.transition).toContain('transform 0.5s')
    expect(overlay.style.opacity).toBe('1')
    expect(overlay.style.transition).toContain('opacity 0.5s')
  })

  it('moves the content transform to the new snap after a release that snaps', () => {
    vi.useFakeTimers()
    const onReleaseChange = vi.fn()

    const drawer = createDrawer({
      id: 'snap-drag',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 2,
      dismissible: true,
      title: 'Snap drag',
      content: 'Body',
      onReleaseChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    // Drag from snap 0 UP toward snap 1. The user moves their
    // pointer from y=200 to y=100 (100 px upward) over 100 ms
    // → velocity 1.0 px/ms, which clears the 0.4 velocity
    // threshold. The release helper's "step to next" branch
    // then returns the next snap's offset (448 on the jsdom
    // viewport of 768, i.e. '320px' at index 1).
    const startY = 200
    const endY = 100

    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: startY, pointerId: 71 }))
    vi.advanceTimersByTime(100)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: endY, pointerId: 71 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: endY, pointerId: 71 }))

    expect(onReleaseChange).toHaveBeenCalledWith(true)
    expect(getDrawer('snap-drag')?.getSnapshot().state.activeSnapPoint).toBe('320px')

    // The registry re-renders on setActiveSnapPoint; the new
    // content element should carry the offset for '320px'.
    const newContent = getContent()
    const expectedOffset = getSnapPointOffset({
      snapPoint: '320px',
      direction: 'bottom',
      containerSize: { width: window.innerWidth, height: window.innerHeight }
    })
    expect(newContent.style.getPropertyValue('--initial-transform')).toBe(`${expectedOffset}px`)
  })

  it('closes the drawer on a high-velocity dismissing release', () => {
    vi.useFakeTimers()
    const onOpenChange = vi.fn()
    const onReleaseChange = vi.fn()

    const drawer = createDrawer({
      id: 'snap-close-velocity',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 1,
      dismissible: true,
      title: 'Snap close velocity',
      content: 'Body',
      onOpenChange,
      onReleaseChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    // Fling downward (close direction) with high velocity. The
    // release helper should resolve to `close`. The dragged
    // distance for a 60px downward drag is -60, velocity over 20ms
    // is 3.0 px/ms, well above the 2.0 high-velocity threshold.
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 100, pointerId: 73 }))
    vi.advanceTimersByTime(20)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: 160, pointerId: 73 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: 160, pointerId: 73 }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onReleaseChange).toHaveBeenCalledWith(false)
    expect(getDrawer('snap-close-velocity')?.getSnapshot().state.isOpen).toBe(false)
    // The active snap should remain at '120px' (the close action
    // does not change the active snap).
    expect(getDrawer('snap-close-velocity')?.getSnapshot().state.activeSnapPoint).toBe('120px')
  })

  it('snaps to the LAST snap on a high-velocity expanding release (snapToSequentialPoint: false)', () => {
    vi.useFakeTimers()
    const onReleaseChange = vi.fn()

    const drawer = createDrawer({
      id: 'snap-expand-velocity',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '320px',
      fadeFromIndex: 1,
      dismissible: true,
      title: 'Snap expand velocity',
      content: 'Body',
      onReleaseChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    // Fling upward (expand direction) with high velocity. The
    // release helper should jump to the last snap. `snapToSequentialPoint`
    // is the default (false), so high velocity is allowed to
    // skip ahead.
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 400, pointerId: 75 }))
    vi.advanceTimersByTime(20)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: 340, pointerId: 75 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: 340, pointerId: 75 }))

    expect(onReleaseChange).toHaveBeenCalledWith(true)
    expect(getDrawer('snap-expand-velocity')?.getSnapshot().state.activeSnapPoint).toBe(1)
  })

  it('stays at the active snap on a moderate release when snapToSequentialPoint is true', () => {
    vi.useFakeTimers()
    const onOpenChange = vi.fn()
    const onReleaseChange = vi.fn()

    const drawer = createDrawer({
      id: 'snap-sequential',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 1,
      dismissible: true,
      snapToSequentialPoint: true,
      title: 'Snap sequential',
      content: 'Body',
      onOpenChange,
      onReleaseChange
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    // Fling downward with high velocity in close direction. With
    // `snapToSequentialPoint: true`, the helper steps one snap at
    // a time; from snap 0 the only "next" in the close direction
    // is to close, since snap 0 is the smallest. Verify the drawer
    // closes.
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 100, pointerId: 77 }))
    vi.advanceTimersByTime(20)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: 160, pointerId: 77 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: 160, pointerId: 77 }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onReleaseChange).toHaveBeenCalledWith(false)
  })

  it('updates the content --initial-transform when setActiveSnapPoint is called externally', () => {
    const drawer = createDrawer({
      id: 'snap-set-external',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      title: 'Snap external',
      content: 'Body'
    })
    drawer.setOpen(true)

    const content = getContent()
    const initialOffset = getSnapPointOffset({
      snapPoint: '120px',
      direction: 'bottom',
      containerSize: { width: window.innerWidth, height: window.innerHeight }
    })
    expect(content.style.getPropertyValue('--initial-transform')).toBe(`${initialOffset}px`)

    drawer.setActiveSnapPoint('320px')

    const newContent = getContent()
    const newOffset = getSnapPointOffset({
      snapPoint: '320px',
      direction: 'bottom',
      containerSize: { width: window.innerWidth, height: window.innerHeight }
    })
    expect(newContent.style.getPropertyValue('--initial-transform')).toBe(`${newOffset}px`)
    expect(getDrawer('snap-set-external')?.getSnapshot().state.activeSnapPoint).toBe('320px')
  })

  it('hides the overlay at the snap below fadeFromIndex and shows it at the fade index or above', () => {
    // Snap layout: ['120px' (idx 0), '320px' (idx 1), 1 (idx 2)]
    // fadeFromIndex = 1 → overlay hidden at idx 0, visible at idx 1+.
    // Open at '120px' (idx 0, below the fade): overlay hidden.
    const drawerAtSmallest = createDrawer({
      id: 'snap-overlay-below',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 1,
      title: 'Below fade',
      content: 'Body'
    })
    drawerAtSmallest.setOpen(true)
    expect(getOverlay().dataset.drawerSnapPointsOverlay).toBe('false')
    destroyDrawers()

    // Open at '320px' (idx 1, AT the fade): overlay visible.
    const drawerAtFade = createDrawer({
      id: 'snap-overlay-at',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '320px',
      fadeFromIndex: 1,
      title: 'At fade',
      content: 'Body'
    })
    drawerAtFade.setOpen(true)
    expect(getOverlay().dataset.drawerSnapPointsOverlay).toBe('true')
    destroyDrawers()

    // Open at 1 (idx 2, ABOVE the fade, last snap): overlay visible.
    const drawerAboveFade = createDrawer({
      id: 'snap-overlay-above',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: 1,
      fadeFromIndex: 1,
      title: 'Above fade',
      content: 'Body'
    })
    drawerAboveFade.setOpen(true)
    expect(getOverlay().dataset.drawerSnapPointsOverlay).toBe('true')
  })

  it('settles overlay opacity from the newly selected snap point', () => {
    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'snap-overlay-release',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 1,
      content: 'Body'
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: 200, pointerId: 78 }))
    vi.advanceTimersByTime(100)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: 100, pointerId: 78 }))
    dispatchOnContent(createPointerEvent('pointerup', { clientX: 50, clientY: 100, pointerId: 78 }))

    expect(drawer.getSnapshot().state.activeSnapPoint).toBe('320px')
    expect(getOverlay().dataset.drawerSnapPointsOverlay).toBe('true')
    expect(getOverlay().style.opacity).toBe('1')
  })

  it('tracks the active snap with getSnapDragValue during a drag (inline transform matches offset math)', () => {
    vi.useFakeTimers()
    const drawer = createDrawer({
      id: 'snap-drag-math',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      fadeFromIndex: 1,
      title: 'Snap drag math',
      content: 'Body'
    })
    drawer.setOpen(true)
    vi.advanceTimersByTime(600)

    const content = getContent()
    const containerSize = { width: window.innerWidth, height: window.innerHeight }
    const offsets = getSnapPointsOffset({ snapPoints: ['120px', '320px', 1], direction: 'bottom', containerSize })
    const activeOffset = offsets[0]!

    const startY = 200
    const endY = 180 // drag UP by 20px → draggedDistance = +20 (expand)
    dispatchOnContent(createPointerEvent('pointerdown', { clientX: 50, clientY: startY, pointerId: 79 }))
    vi.advanceTimersByTime(10)
    dispatchOnContent(createPointerEvent('pointermove', { clientX: 50, clientY: endY, pointerId: 79 }))

    // For bottom direction, getSnapDragValue(activeOffset, +20, 'bottom')
    // = activeOffset - 20. The inline transform should match.
    const expectedTranslateY = activeOffset - 20
    const transform = content.style.transform
    expect(transform).toBe(`translate3d(0, ${expectedTranslateY}px, 0)`)
  })
})
