import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { browserModuleMocks } from './_test-helpers'
import {
  lockDocumentScrollBehavior,
  lockScrollRestoration,
  preventBodyScroll,
  setPositionFixed,
} from '../src/runtime/scroll-lock'

/** A touch event with the one property the iOS pipeline reads. */
const touch = (type: string, target: EventTarget, pageY?: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'changedTouches', {
    value: pageY === undefined ? [] : [{ pageY }],
  })
  target.dispatchEvent(event)
  return event
}

/** A scrollable box: overflow auto with a measurable scroll range. */
const scrollBox = (scrollHeight: number, clientHeight: number, scrollTop: number) => {
  const box = document.createElement('div')
  box.style.overflow = 'auto'
  Object.defineProperty(box, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(box, 'clientHeight', { configurable: true, value: clientHeight })
  box.scrollTop = scrollTop
  const child = document.createElement('p')
  box.append(child)
  document.body.append(box)
  return { box, child }
}

let frames: FrameRequestCallback[] = []
let scrollTo: ReturnType<typeof vi.spyOn>
const flushFrames = () => {
  while (frames.length) frames.shift()!(0)
}

beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  // Not vi.restoreAllMocks(): it would detach the shared browser spies.
  browserModuleMocks.reset()
  scrollTo.mockRestore()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.innerHTML = ''
  document.body.removeAttribute('style')
  document.documentElement.removeAttribute('style')
  Reflect.deleteProperty(window, 'visualViewport')
})

describe('iOS body scroll prevention', () => {
  beforeEach(() => {
    browserModuleMocks.isIOSSpy.mockReturnValue(true)
  })

  it('shares one pipeline between locks and restores it with the last release', () => {
    const first = preventBodyScroll()
    const second = preventBodyScroll()
    expect(document.documentElement.style.paddingRight).not.toBe('')

    first()
    first()
    expect(document.documentElement.style.paddingRight).not.toBe('')
    second()
    expect(document.documentElement.style.paddingRight).toBe('')
  })

  it('blocks window scrolling outside a scrollable area', () => {
    const release = preventBodyScroll()
    const plain = document.createElement('p')
    document.body.append(plain)
    touch('touchstart', plain, 100)
    expect(touch('touchmove', plain, 120).defaultPrevented).toBe(true)
    release()
  })

  it('stops bounce scrolling only at the edges of a nested scroller', () => {
    const release = preventBodyScroll()
    const top = scrollBox(400, 100, 0)
    touch('touchstart', top.child, 100)
    expect(touch('touchmove', top.child, 140).defaultPrevented).toBe(true)
    expect(touch('touchmove', top.child).defaultPrevented).toBe(false)

    const bottom = scrollBox(400, 100, 300)
    touch('touchstart', bottom.child, 100)
    expect(touch('touchmove', bottom.child, 60).defaultPrevented).toBe(true)

    const middle = scrollBox(400, 100, 150)
    touch('touchstart', middle.child, 100)
    expect(touch('touchmove', middle.child, 60).defaultPrevented).toBe(false)

    const flat = scrollBox(100, 100, 0)
    touch('touchstart', flat.child, 100)
    expect(touch('touchmove', flat.child, 140).defaultPrevented).toBe(false)
    release()
  })

  it('focuses a tapped input itself and clears the transform on the next frame', () => {
    const release = preventBodyScroll()
    const input = document.createElement('input')
    document.body.append(input)
    expect(touch('touchend', input).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(input)
    flushFrames()
    expect(input.style.transform).toBe('')
    expect(touch('touchend', input).defaultPrevented).toBe(false)
    release()
  })

  it('scrolls a focused input into view once the keyboard is visible', () => {
    vi.stubGlobal('innerHeight', 800)
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: Object.assign(new EventTarget(), { height: 400 }),
    })
    const release = preventBodyScroll()
    const { box } = scrollBox(1000, 200, 0)
    const input = document.createElement('input')
    box.append(input)
    box.getBoundingClientRect = () => ({ top: 0, bottom: 200 }) as DOMRect
    input.getBoundingClientRect = () => ({ top: 500, bottom: 540 }) as DOMRect

    input.dispatchEvent(new FocusEvent('focus'))
    flushFrames()
    expect(box.scrollTop).toBe(500)
    release()
  })

  it('waits for the viewport to resize, and drops the wait on release', () => {
    vi.stubGlobal('innerHeight', 800)
    const viewport = Object.assign(new EventTarget(), { height: 800 })
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
    const release = preventBodyScroll()
    const { box } = scrollBox(1000, 200, 0)
    const input = document.createElement('textarea')
    box.append(input)
    box.getBoundingClientRect = () => ({ top: 0, bottom: 200 }) as DOMRect
    input.getBoundingClientRect = () => ({ top: 300, bottom: 340 }) as DOMRect

    input.dispatchEvent(new FocusEvent('focus'))
    flushFrames()
    viewport.dispatchEvent(new Event('resize'))
    expect(box.scrollTop).toBe(300)

    input.dispatchEvent(new FocusEvent('focus'))
    flushFrames()
    const remove = vi.spyOn(viewport, 'removeEventListener')
    release()
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('scrolls the window back to the top while locked', () => {
    const release = preventBodyScroll()
    window.dispatchEvent(new Event('scroll'))
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    release()
  })
})

describe('Safari position fixed', () => {
  beforeEach(() => {
    browserModuleMocks.isSafariSpy.mockReturnValue(true)
  })

  it('offsets the body by the bottom bar once it settles', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('pageYOffset', 1000)
    const release = setPositionFixed({ isOpen: true, modal: true, noBodyStyles: false })
    vi.stubGlobal('innerHeight', 740)
    vi.advanceTimersByTime(300)
    flushFrames()
    expect(document.body.style.top).toBe('-1060px')
    release()
    release()
    flushFrames()
    expect(document.body.style.position).toBe('')
  })

  it('stays put when closed', () => {
    const release = setPositionFixed({ isOpen: false, modal: true, noBodyStyles: false })
    expect(document.body.style.position).toBe('')
    release()
  })
})

describe('document scroll guards', () => {
  it('release once and restore the page settings', () => {
    document.documentElement.style.scrollBehavior = 'smooth'
    const releaseBehavior = lockDocumentScrollBehavior()
    releaseBehavior()
    releaseBehavior()
    expect(document.documentElement.style.scrollBehavior).toBe('smooth')

    const releaseRestoration = lockScrollRestoration()
    releaseRestoration()
    releaseRestoration()
  })

  it('do nothing without a document or history', () => {
    vi.stubGlobal('document', undefined)
    expect(lockDocumentScrollBehavior()).toBeTypeOf('function')
    vi.unstubAllGlobals()
    const history = vi
      .spyOn(window, 'history', 'get')
      .mockReturnValue(undefined as unknown as History)
    expect(lockScrollRestoration()).toBeTypeOf('function')
    history.mockRestore()
  })
})
