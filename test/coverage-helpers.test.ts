import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  isIOS,
  isIPad,
  isIPhone,
  isMac,
  isMobileFirefox,
  isSafari,
  testPlatform,
} from '../src/runtime/browser'
import { getNextHandleState } from '../src/runtime/handle'
import {
  findSnapPointByOffset,
  getClosedTransform,
  getContainerSize,
  shouldShowSnapOverlay,
} from '../src/vanilla/dialog-layout'
import { renderVanillaHost, type VanillaHostState } from '../src/vanilla/host'

const stubNavigator = (userAgent: string, platform: string, maxTouchPoints = 0) => {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue(platform)
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    get: () => maxTouchPoints,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('platform detection', () => {
  it('recognizes Android and iOS Firefox', () => {
    stubNavigator('Mozilla/5.0 (Android 14; Mobile) Firefox/130.0', 'Linux armv8l')
    expect(isMobileFirefox()).toBe(true)
    stubNavigator('Mozilla/5.0 (iPhone) FxiOS/130.0 Mobile/15E148 Safari/605.1.15', 'iPhone')
    expect(isMobileFirefox()).toBe(true)
    stubNavigator('Mozilla/5.0 (Windows NT 10.0) Firefox/130.0', 'Win32')
    expect(isMobileFirefox()).toBe(false)
  })

  it('tells Safari from Chrome', () => {
    stubNavigator(
      'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      'MacIntel'
    )
    expect(isSafari()).toBe(true)
    stubNavigator(
      'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',
      'MacIntel'
    )
    expect(isSafari()).toBe(false)
  })

  it('treats a touch Mac as iPadOS and an iPhone as iOS', () => {
    stubNavigator('Mozilla/5.0 (Macintosh) Safari/605.1.15', 'MacIntel', 5)
    expect(isMac()).toBe(true)
    expect(isIPad()).toBe(true)
    expect(isIOS()).toBe(true)
    stubNavigator('Mozilla/5.0 (Macintosh) Safari/605.1.15', 'MacIntel', 0)
    expect(isIPad()).toBe(false)
    expect(isIOS()).toBe(false)
    stubNavigator('Mozilla/5.0 (iPhone) Safari/605.1.15', 'iPhone')
    expect(isIPhone()).toBe(true)
    expect(isIOS()).toBe(true)
  })

  it('returns undefined without a browser', () => {
    vi.stubGlobal('navigator', undefined)
    expect(isMobileFirefox()).toBeUndefined()
    expect(isSafari()).toBeUndefined()
    vi.unstubAllGlobals()
    vi.spyOn(window, 'navigator', 'get').mockReturnValue(null as unknown as Navigator)
    expect(testPlatform(/^Mac/)).toBeUndefined()
  })
})

describe('handle cycling', () => {
  const base = { isDragging: false, preventCycle: false, shouldCancelInteraction: false }

  it('wraps from the last snap point when the drawer cannot be dismissed', () => {
    expect(
      getNextHandleState({ ...base, snapPoints: [0.5, 1], activeSnapPoint: 1, dismissible: false })
    ).toEqual({ type: 'snap', snapPoint: 0.5 })
  })

  it('does nothing for an unknown active snap point', () => {
    expect(
      getNextHandleState({
        ...base,
        snapPoints: [0.5, 1],
        activeSnapPoint: 0.25,
        dismissible: true,
      })
    ).toEqual({ type: 'noop' })
  })
})

describe('dialog layout', () => {
  it('slides each direction off screen', () => {
    expect(getClosedTransform('top')).toBe('translate3d(0, -100%, 0)')
    expect(getClosedTransform('left')).toBe('translate3d(-100%, 0, 0)')
  })

  it('measures a custom container instead of the viewport', () => {
    const container = document.createElement('div')
    container.getBoundingClientRect = () => ({ width: 320, height: 480 }) as DOMRect
    expect(getContainerSize(container)).toEqual({ width: 320, height: 480 })
  })

  it('finds snap points by offset', () => {
    expect(findSnapPointByOffset(undefined, [], 0)).toBeNull()
    expect(findSnapPointByOffset([0.5, 1], [400, 0], 123)).toBeNull()
    expect(findSnapPointByOffset([0.5, 1], [400, 0], 0)).toBe(1)
  })

  it('decides when the snap overlay is visible', () => {
    expect(shouldShowSnapOverlay([0.25, 0.5, 1], undefined, 0.25)).toBe(true)
    expect(shouldShowSnapOverlay([0.25, 0.5, 1], 1, 0.75)).toBe(false)
    expect(shouldShowSnapOverlay([0.25, 0.5, 1], 1, 0.25)).toBe(false)
    expect(shouldShowSnapOverlay([0.25, 0.5, 1], 1, 0.5)).toBe(true)
  })
})

describe('vanilla host', () => {
  const render = (host: VanillaHostState, container?: HTMLElement) =>
    renderVanillaHost({
      host,
      id: 'host-test',
      options: { title: 'Host', ...(container ? { container } : {}) },
      open: false,
      openOrder: null,
      hasBeenOpened: false,
      onOpenChange: () => {},
      onDragChange: () => {},
      onReleaseChange: () => {},
      onActiveSnapPointChange: () => {},
    })

  it('moves its owned element when the container changes', () => {
    const first = document.createElement('section')
    const second = document.createElement('section')
    document.body.append(first, second)

    const mounted = render({ root: null, element: null, ownsElement: false }, first)
    expect(mounted?.element?.parentElement).toBe(first)

    const moved = render(
      { root: mounted!.root, element: mounted!.element, ownsElement: true },
      second
    )
    expect(moved?.element?.parentElement).toBe(second)
    expect(first.querySelector('[data-drawer-vanilla-root]')).toBeNull()

    moved?.element?.remove()
    first.remove()
    second.remove()
  })

  it('renders nothing without a DOM', () => {
    vi.stubGlobal('document', undefined)
    expect(render({ root: null, element: null, ownsElement: false })).toBeNull()
  })
})

describe('background wrapper lookup', () => {
  it('finds nothing without a DOM', async () => {
    const { getWrapperElement } = await import('../src/vanilla/dialog-background')
    vi.stubGlobal('document', undefined)
    expect(getWrapperElement()).toBeNull()
  })
})

describe('vanilla host without optional callbacks', () => {
  it('mounts with only the required arguments', () => {
    const mounted = renderVanillaHost({
      host: { root: null, element: null, ownsElement: false },
      id: 'host-minimal',
      options: { title: 'Minimal' },
      open: false,
      onOpenChange: () => {},
    })
    expect(mounted?.element?.dataset.drawerVanillaRoot).toBe('host-minimal')
    mounted?.element?.remove()
  })
})
