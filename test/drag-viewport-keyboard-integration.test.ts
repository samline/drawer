import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers, getDrawer } from '../src'
import { WINDOW_TOP_OFFSET } from '../src/constants'
import { getSnapPointOffset } from '../src/runtime/snap-points'
import { getViewportDrivenDrawerLayout } from '../src/runtime/viewport'

/**
 * Phase E integration tests for the viewport / mobile-keyboard pipeline.
 *
 * The vanilla dialog attaches a `window.visualViewport.resize` listener
 * when the consumer sets `repositionInputs: true` or `fixed: true`. On
 * every resize the dialog recomputes the content's `style.bottom` and
 * `style.height` via `getViewportDrivenDrawerLayout` (the pure math in
 * `runtime/viewport.ts`).
 *
 * jsdom does NOT implement `window.visualViewport`, so each test
 * installs a polyfill that:
 *   - exposes the `height` / `width` fields the dialog reads
 *   - records `addEventListener` / `removeEventListener` calls so the
 *     lifecycle tests can assert the listener is attached on open
 *     and detached on close
 *   - `dispatchEvent` lets the test simulate the mobile keyboard
 *     opening (a shrink in `visualViewport.height`)
 */
class MockVisualViewport extends EventTarget {
  height: number
  width: number
  offsetTop: number
  offsetLeft: number
  pageTop: number
  pageLeft: number
  scale: number

  constructor(height: number = 768, width: number = 1024) {
    super()
    this.height = height
    this.width = width
    this.offsetTop = 0
    this.offsetLeft = 0
    this.pageTop = 0
    this.pageLeft = 0
    this.scale = 1
  }
}

function installVisualViewportPolyfill(initialHeight: number = 768): MockVisualViewport {
  const mock = new MockVisualViewport(initialHeight)
  Object.defineProperty(window, 'visualViewport', {
    value: mock,
    writable: true,
    configurable: true
  })
  return mock
}

function uninstallVisualViewportPolyfill() {
  // Reflecting the property back to `undefined` keeps the polyfill
  // installation / removal symmetric across the test suite. The
  // `configurable: true` descriptor on the install allows the delete;
  // the lib.dom type treats `visualViewport` as required, so we cast
  // through `unknown` to silence the operator-typecheck error.
  delete (window as { visualViewport?: unknown }).visualViewport
}

function fireVisualViewportResize(mock: MockVisualViewport, height: number) {
  mock.height = height
  mock.dispatchEvent(new window.Event('resize'))
}

function getContent(): HTMLElement {
  const element = document.querySelector('[data-drawer]') as HTMLElement | null
  if (!element) {
    throw new Error('Expected a [data-drawer] content element to be mounted')
  }
  return element
}

/**
 * jsdom does not implement layout, so `Element.offsetHeight` /
 * `offsetWidth` always return `0`. The viewport-driven math in
 * `getViewportDrivenDrawerLayout` needs a non-zero drawer size to
 * produce a meaningful `height` string (a zero drawer height leads
 * to a negative `height` like `-400px`, which jsdom's CSS parser
 * silently rejects on inline-style write). Override the getter on
 * the content element so the test exercises the contract with a
 * realistic drawer dimension.
 */
function mockContentSize(content: HTMLElement, height: number, width: number = 1024) {
  Object.defineProperty(content, 'offsetHeight', { configurable: true, value: height })
  Object.defineProperty(content, 'offsetWidth', { configurable: true, value: width })
}

describe('drag pipeline integration (Phase E — viewport / mobile-keyboard)', () => {
  let visualViewport: MockVisualViewport

  beforeEach(() => {
    destroyDrawers()
    document.body.innerHTML = ''
    // Reset scrollRestoration to a known state. jsdom defaults to
    // 'auto', but the property is settable so we make the value
    // explicit per-test.
    if (window.history) {
      window.history.scrollRestoration = 'auto'
    }
    visualViewport = installVisualViewportPolyfill(768)
  })

  afterEach(() => {
    vi.useRealTimers()
    destroyDrawers()
    document.body.innerHTML = ''
    if (window.history) {
      window.history.scrollRestoration = 'auto'
    }
    uninstallVisualViewportPolyfill()
  })

  it('writes the keyboard offset to the content style.bottom when repositionInputs: true', () => {
    const drawer = createDrawer({
      id: 'reposition-inputs',
      direction: 'bottom',
      repositionInputs: true,
      title: 'Reposition inputs',
      content: '<input type="text" />'
    })
    drawer.setOpen(true)

    const content = getContent()
    // jsdom does not implement layout; force a meaningful
    // `offsetHeight` so the math produces a valid (non-negative)
    // height and jsdom's CSS parser accepts the inline write.
    mockContentSize(content, 600)

    // Simulate the mobile keyboard opening: visualViewport.height
    // shrinks from 768 to 368 (a 400 px keyboard). The dialog
    // recomputes the layout and writes the keyboard offset to
    // `style.bottom` so the focused input stays above the keyboard.
    fireVisualViewportResize(visualViewport, 368)

    const drawerHeight = content.offsetHeight
    const totalHeight = window.innerHeight
    const offsetFromTop = Math.max(totalHeight - drawerHeight, 0)
    const expectedLayout = getViewportDrivenDrawerLayout({
      visualViewportHeight: 368,
      totalHeight,
      drawerHeight,
      offsetFromTop,
      fixed: false,
      previousDiffFromInitial: 0,
      keyboardIsOpen: false,
      initialDrawerHeight: 0,
      activeSnapPointOffset: 0,
      isMobileFirefox: false,
      windowTopOffset: WINDOW_TOP_OFFSET
    })
    expect(content.style.bottom).toBe(expectedLayout.bottom)
    // The expected bottom is positive (the keyboard pushed the
    // drawer up). Sanity: it is at least the keyboard size.
    expect(parseInt(content.style.bottom, 10)).toBeGreaterThan(0)
  })

  it('writes the drawer height (but not the bottom) to the content when fixed: true', () => {
    const drawer = createDrawer({
      id: 'fixed-height',
      direction: 'bottom',
      fixed: true,
      title: 'Fixed',
      content: 'Body'
    })
    drawer.setOpen(true)

    const content = getContent()
    // Force a meaningful `offsetHeight` so the math produces a
    // valid `height` (a zero drawer height yields a negative
    // height that jsdom's CSS parser silently rejects).
    mockContentSize(content, 600)
    fireVisualViewportResize(visualViewport, 368)

    const drawerHeight = content.offsetHeight
    const totalHeight = window.innerHeight
    const offsetFromTop = Math.max(totalHeight - drawerHeight, 0)
    const expectedLayout = getViewportDrivenDrawerLayout({
      visualViewportHeight: 368,
      totalHeight,
      drawerHeight,
      offsetFromTop,
      fixed: true,
      previousDiffFromInitial: 0,
      keyboardIsOpen: false,
      initialDrawerHeight: 0,
      activeSnapPointOffset: 0,
      isMobileFirefox: false,
      windowTopOffset: WINDOW_TOP_OFFSET
    })

    // `fixed: true` writes `height` (the drawer's height shrinks by
    // the keyboard offset). It does NOT write `bottom` — the drawer's
    // top stays anchored, the body extends under it.
    expect(content.style.height).toBe(expectedLayout.height)
    expect(content.style.bottom).toBe('')
  })

  it('does not change the content inline styles when neither repositionInputs nor fixed is set', () => {
    const drawer = createDrawer({
      id: 'no-viewport',
      direction: 'bottom',
      title: 'No viewport',
      content: 'Body'
    })
    drawer.setOpen(true)

    const content = getContent()
    // No snap points → --initial-transform is not set, bottom and
    // height are empty. The pre-resize snapshot should be clean.
    expect(content.style.bottom).toBe('')
    expect(content.style.height).toBe('')

    // Fire a resize. The dialog only attaches the listener when
    // `repositionInputs` or `fixed` is set; the resize event has
    // no effect on the content's inline styles.
    fireVisualViewportResize(visualViewport, 368)

    expect(content.style.bottom).toBe('')
    expect(content.style.height).toBe('')
  })

  it('flips history.scrollRestoration to "manual" on open and restores it on destroy', () => {
    expect(window.history.scrollRestoration).toBe('auto')

    const drawer = createDrawer({
      id: 'prevent-scroll',
      direction: 'bottom',
      preventScrollRestoration: true,
      title: 'Prevent scroll',
      content: 'Body'
    })
    drawer.setOpen(true)

    expect(window.history.scrollRestoration).toBe('manual')
    expect(getDrawer('prevent-scroll')?.getSnapshot().state.isOpen).toBe(true)

    destroyDrawers()

    expect(window.history.scrollRestoration).toBe('auto')
  })

  it('does not override history.scrollRestoration when it is already "manual"', () => {
    // Pre-set the value to 'manual' (e.g. another drawer or the
    // page has already opted into manual restoration).
    window.history.scrollRestoration = 'manual'

    const drawer = createDrawer({
      id: 'prevent-scroll-already-manual',
      direction: 'bottom',
      preventScrollRestoration: true,
      title: 'Already manual',
      content: 'Body'
    })
    drawer.setOpen(true)

    // The dialog observes the value is already 'manual' and does
    // not write to it (and does not save a backup).
    expect(window.history.scrollRestoration).toBe('manual')

    // On destroy, the dialog has no backup to restore — the value
    // is still 'manual'.
    destroyDrawers()
    expect(window.history.scrollRestoration).toBe('manual')
  })

  it('attaches the visualViewport listener on open and detaches it on close (lifecycle)', () => {
    const addSpy = vi.spyOn(visualViewport, 'addEventListener')
    const removeSpy = vi.spyOn(visualViewport, 'removeEventListener')

    const drawer = createDrawer({
      id: 'listener-lifecycle',
      direction: 'bottom',
      repositionInputs: true,
      title: 'Listener lifecycle',
      content: 'Body'
    })

    // Closed: no listener yet.
    const addCountClosed = addSpy.mock.calls.length
    const removeCountClosed = removeSpy.mock.calls.length
    expect(addCountClosed).toBe(0)
    expect(removeCountClosed).toBe(0)

    // Open 1: listener attached.
    drawer.setOpen(true)
    const addCallsAfterOpen1 = addSpy.mock.calls.filter(([type]) => type === 'resize').length
    expect(addCallsAfterOpen1).toBeGreaterThan(0)

    // Close 1: listener detached (the teardown array consumed).
    drawer.setOpen(false)
    const removeCallsAfterClose1 = removeSpy.mock.calls.filter(([type]) => type === 'resize').length
    expect(removeCallsAfterClose1).toBeGreaterThan(0)

    // Open 2: listener attached again (a fresh cleanup array).
    const addCallsBeforeOpen2 = addSpy.mock.calls.filter(([type]) => type === 'resize').length
    drawer.setOpen(true)
    const addCallsAfterOpen2 = addSpy.mock.calls.filter(([type]) => type === 'resize').length
    expect(addCallsAfterOpen2).toBeGreaterThan(addCallsBeforeOpen2)

    // Close 2: listener detached again.
    const removeCallsBeforeClose2 = removeSpy.mock.calls.filter(([type]) => type === 'resize').length
    drawer.setOpen(false)
    const removeCallsAfterClose2 = removeSpy.mock.calls.filter(([type]) => type === 'resize').length
    expect(removeCallsAfterClose2).toBeGreaterThan(removeCallsBeforeClose2)
  })

  it('does not attach the listener when window.visualViewport is undefined (desktop fallback)', () => {
    uninstallVisualViewportPolyfill()

    const drawer = createDrawer({
      id: 'desktop-no-visual-viewport',
      direction: 'bottom',
      repositionInputs: true,
      fixed: true,
      title: 'Desktop',
      content: 'Body'
    })
    drawer.setOpen(true)

    // Desktop: the listener is not attached. The CSS-driven layout
    // is left alone — no `style.bottom` / `style.height` write.
    const content = getContent()
    expect(content.style.bottom).toBe('')
    expect(content.style.height).toBe('')

    // Re-install the polyfill for the teardown cleanup.
    visualViewport = installVisualViewportPolyfill(768)
  })

  it('threads the active snap offset into the layout when snap points are configured', () => {
    const drawer = createDrawer({
      id: 'snap-viewport',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      repositionInputs: true,
      title: 'Snap viewport',
      content: 'Body'
    })
    drawer.setOpen(true)

    // Force a meaningful `offsetHeight` so the math produces a
    // valid layout string. (See `mockContentSize` for the rationale.)
    const content = getContent()
    mockContentSize(content, 600)

    // Fire a resize. The listener reads the current activeSnapPoint
    // ('120px') and passes the snap offset to the layout helper,
    // which folds it into the `diffFromInitial`.
    fireVisualViewportResize(visualViewport, 368)

    // Compute the expected layout with the snap offset included.
    // The math comes straight from the pure helper; the test pins
    // that the dialog passes the right offset.
    const snapOffset = getSnapPointOffset({
      snapPoint: '120px',
      direction: 'bottom',
      containerSize: { width: window.innerWidth, height: window.innerHeight }
    })
    const drawerHeight = content.offsetHeight
    const totalHeight = window.innerHeight
    const offsetFromTop = Math.max(totalHeight - drawerHeight, 0)
    const expectedLayout = getViewportDrivenDrawerLayout({
      visualViewportHeight: 368,
      totalHeight,
      drawerHeight,
      offsetFromTop,
      fixed: false,
      previousDiffFromInitial: 0,
      keyboardIsOpen: false,
      initialDrawerHeight: 0,
      activeSnapPointOffset: snapOffset,
      isMobileFirefox: false,
      windowTopOffset: WINDOW_TOP_OFFSET
    })
    expect(content.style.bottom).toBe(expectedLayout.bottom)
  })

  it('preserves preventScrollRestoration through a re-render (open → setActiveSnapPoint → close)', () => {
    expect(window.history.scrollRestoration).toBe('auto')

    const drawer = createDrawer({
      id: 'prevent-scroll-rerender',
      direction: 'bottom',
      snapPoints: ['120px', '320px', 1],
      activeSnapPoint: '120px',
      preventScrollRestoration: true,
      title: 'Prevent scroll re-render',
      content: 'Body'
    })
    drawer.setOpen(true)
    expect(window.history.scrollRestoration).toBe('manual')

    // Re-render via setActiveSnapPoint. The mount pipeline runs
    // teardown → setup. The teardown restores 'auto' and clears
    // the backup; the setup flips it back to 'manual' and saves
    // the current value (now 'auto') as the new backup.
    drawer.setActiveSnapPoint('320px')
    expect(window.history.scrollRestoration).toBe('manual')

    // Close. The teardown restores 'auto'.
    drawer.setOpen(false)
    expect(window.history.scrollRestoration).toBe('auto')
  })
})
