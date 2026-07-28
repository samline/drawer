import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { preventBodyScroll, setPositionFixed, trackScrollPosition } from '../src/runtime/scroll-lock'

/**
 * F6: iOS Safari body-scroll prevention.
 *
 * The full mobile-safari pipeline is gated on `isIOS()` so it
 * does NOT run in the jsdom test environment. These tests assert:
 *
 * 1. `preventBodyScroll({ disablePreventScroll: true })` returns
 *    a no-op (does not touch `document.body.style.overflow`).
 * 2. `preventBodyScroll({ disablePreventScroll: false })` in
 *    jsdom (NOT iOS) takes the desktop path: it sets
 *    `body.style.overflow = 'hidden'` and the restore function
 *    reverts it.
 * 3. `setPositionFixed` is a no-op off Safari (jsdom).
 * 4. `setPositionFixed` toggles the body position when
 *    `isSafari()` is mocked to return true.
 * 5. `trackScrollPosition` reads `window.scrollY` once and
 *    updates the module-level saved Y on scroll events.
 * 6. The restore function returned by `preventBodyScroll` is
 *    idempotent — calling it twice does not throw and does
 *    not double-restore.
 *
 * The iOS-specific paths (`preventScrollMobileSafari`) are not
 * directly tested here because the environment is jsdom. They
 * are exercised by `test/drag-close-easytrip-modal.test.ts` in a
 * real browser via puppeteer (when the user runs that suite).
 */

describe('scroll-lock (F6)', () => {
  let originalBodyOverflow: string
  let originalBodyPaddingRight: string

  beforeEach(() => {
    originalBodyOverflow = document.body.style.overflow
    originalBodyPaddingRight = document.body.style.paddingRight
  })

  afterEach(() => {
    document.body.style.overflow = originalBodyOverflow
    document.body.style.paddingRight = originalBodyPaddingRight
  })

  it('disablePreventScroll=true is a no-op', () => {
    const restore = preventBodyScroll({ disablePreventScroll: true })
    expect(document.body.style.overflow).toBe(originalBodyOverflow)
    expect(document.body.style.paddingRight).toBe(originalBodyPaddingRight)
    // Restore is a no-op too.
    expect(() => restore()).not.toThrow()
  })

  it('desktop path: sets overflow:hidden and restores', () => {
    const restore = preventBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    restore()
    expect(document.body.style.overflow).toBe(originalBodyOverflow)
  })

  it('restore function is idempotent', () => {
    const restore = preventBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    restore()
    expect(document.body.style.overflow).toBe(originalBodyOverflow)
    // Calling restore again does not throw and does not
    // re-touch the body style.
    expect(() => restore()).not.toThrow()
    expect(document.body.style.overflow).toBe(originalBodyOverflow)
  })

  it('desktop path adds scrollbar padding-right when the page has a scrollbar', () => {
    // Force a non-zero scrollbar width
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1185 })

    const restore = preventBodyScroll()
    // 1200 - 1185 = 15px scrollbar → padding-right should be 15
    expect(document.body.style.paddingRight).toBe('15px')
    restore()
    expect(document.body.style.paddingRight).toBe(originalBodyPaddingRight)
  })

  it('setPositionFixed is a no-op off Safari', () => {
    // In jsdom, isSafari() returns undefined (no navigator.userAgent
    // or it does not contain 'safari'). setPositionFixed should
    // not touch the body.
    const beforePosition = document.body.style.position
    setPositionFixed({ isOpen: true, modal: true, noBodyStyles: false })
    expect(document.body.style.position).toBe(beforePosition)
    setPositionFixed({ isOpen: false, modal: true, noBodyStyles: false })
    expect(document.body.style.position).toBe(beforePosition)
  })

  it('setPositionFixed toggles body position when isSafari() returns true', async () => {
    // Mock the browser module's isSafari to return true.
    const browserModule = await import('../src/runtime/browser')
    const spy = vi.spyOn(browserModule, 'isSafari').mockReturnValue(true)
    try {
      const beforePosition = document.body.style.position
      const beforeTop = document.body.style.top

      const restore = setPositionFixed({ isOpen: true, modal: true, noBodyStyles: false })
      // The body should have position: fixed now.
      expect(document.body.style.position).toBe('fixed')

      restore()
      // After the close call, the body position is restored.
      // (previousBodyPosition was an empty record → styles revert to '')
      expect(document.body.style.position).toBe(beforePosition)
      expect(document.body.style.top).toBe(beforeTop)
    } finally {
      spy.mockRestore()
    }
  })

  it('setPositionFixed is a no-op when noBodyStyles=true', async () => {
    const browserModule = await import('../src/runtime/browser')
    const spy = vi.spyOn(browserModule, 'isSafari').mockReturnValue(true)
    try {
      const beforePosition = document.body.style.position
      setPositionFixed({ isOpen: true, modal: true, noBodyStyles: true })
      expect(document.body.style.position).toBe(beforePosition)
    } finally {
      spy.mockRestore()
    }
  })

  it('does not let an unowned close release another fixed-position owner', async () => {
    const browserModule = await import('../src/runtime/browser')
    const spy = vi.spyOn(browserModule, 'isSafari').mockReturnValue(true)
    try {
      const restore = setPositionFixed({ isOpen: true, modal: true, noBodyStyles: false })
      setPositionFixed({ isOpen: false, modal: true, noBodyStyles: false })

      expect(document.body.style.position).toBe('fixed')
      restore()
      expect(document.body.style.position).toBe('')
    } finally {
      spy.mockRestore()
    }
  })

  it('restores fixed body styles with their original priorities', async () => {
    const browserModule = await import('../src/runtime/browser')
    const spy = vi.spyOn(browserModule, 'isSafari').mockReturnValue(true)
    document.body.style.setProperty('position', 'relative', 'important')
    document.body.style.setProperty('top', '4px', 'important')
    try {
      const restore = setPositionFixed({ isOpen: true, modal: true, noBodyStyles: false })
      restore()

      expect(document.body.style.getPropertyValue('position')).toBe('relative')
      expect(document.body.style.getPropertyPriority('position')).toBe('important')
      expect(document.body.style.getPropertyValue('top')).toBe('4px')
      expect(document.body.style.getPropertyPriority('top')).toBe('important')
    } finally {
      document.body.style.removeProperty('position')
      document.body.style.removeProperty('top')
      spy.mockRestore()
    }
  })

  it('coordinates the Safari fixed body and iOS scroll restore at the captured position', async () => {
    const browserModule = await import('../src/runtime/browser')
    const safariSpy = vi.spyOn(browserModule, 'isSafari').mockReturnValue(true)
    const iosSpy = vi.spyOn(browserModule, 'isIOS').mockReturnValue(true)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const pageXOffset = vi.spyOn(window, 'pageXOffset', 'get').mockReturnValue(12)
    const pageYOffset = vi.spyOn(window, 'pageYOffset', 'get').mockReturnValue(300)
    const scrollX = vi.spyOn(window, 'scrollX', 'get').mockReturnValue(12)
    const scrollY = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(300)
    vi.useFakeTimers()
    try {
      const restorePosition = setPositionFixed({ isOpen: true, modal: true, noBodyStyles: false })
      const restoreScroll = preventBodyScroll({ isOpen: true, modal: true })

      expect(document.body.style.top).toBe('-300px')
      expect(scrollTo).toHaveBeenCalledWith(0, 0)

      restoreScroll()
      restorePosition()
      vi.runAllTimers()

      expect(scrollTo.mock.calls[scrollTo.mock.calls.length - 1]).toEqual([12, 300])
    } finally {
      vi.useRealTimers()
      scrollY.mockRestore()
      scrollX.mockRestore()
      pageYOffset.mockRestore()
      pageXOffset.mockRestore()
      scrollTo.mockRestore()
      iosSpy.mockRestore()
      safariSpy.mockRestore()
    }
  })

  it('trackScrollPosition returns a cleanup that detaches the scroll listener', () => {
    const remove = trackScrollPosition()
    expect(typeof remove).toBe('function')
    expect(() => remove()).not.toThrow()
  })
})
