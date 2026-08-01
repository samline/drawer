import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as browserModule from '../src/runtime/browser'
import { preventBodyScroll } from '../src/runtime/scroll-lock'
import { browserModuleMocks } from './_test-helpers'

/**
 * F18 — visualViewport listener cleanup in the mobile-safari
 * scroll-lock pipeline.
 *
 * Bug (v3.0.0 / v3.0.1): `onFocus` inside `preventScrollMobileSafari`
 * added a `visualViewport.addEventListener('resize', ..., { once:
 * true })` for each focused input. The `{ once: true }` option
 * auto-removes the listener when it fires — but if the visual
 * viewport never resizes (desktop, or the keyboard already
 * closed before focus), the listener never fires and is never
 * removed. The listener captures `target` (the focused input)
 * via closure, so the input element is held alive in memory
 * until the page reloads.
 *
 * In a long form (N inputs) + a session of M drawer opens, the
 * user can leak up to N*M listeners. Each listener holds the
 * focused input + a closure over `scrollIntoView` + a reference
 * to `visualViewport` (which lives for the lifetime of the
 * page).
 *
 * Fix (v3.1.0): the listener is now tracked in a
 * `pendingViewportResizeCleanups` array, and the teardown
 * chain drains the array. The listener still self-removes
 * when it fires (preserving the original behavior), but if it
 * never fires, the teardown removes it explicitly.
 *
 * These tests assert:
 *   - When a focus event lands on an input while the keyboard
 *     is NOT visible, the listener is registered.
 *   - When the listener never fires (no resize), the teardown
 *     removes it from the visualViewport.
 *   - When the listener DOES fire, the teardown is a no-op
 *     (already cleaned up) and no error is thrown.
 */

describe('visualViewport listener cleanup in mobile-safari scroll lock (F18)', () => {
  beforeEach(() => {
    browserModuleMocks.reset()
    browserModuleMocks.isIOSSpy.mockReturnValue(true)
    browserModuleMocks.isSafariSpy.mockReturnValue(true)
    vi.useFakeTimers()
    // jsdom throws "Not implemented" on window.scrollTo; the
    // mobile-safari pipeline calls it on acquire. Mock it.
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    browserModuleMocks.reset()
    document.body.innerHTML = ''
    // Remove any mocks of visualViewport.
    if ((window as unknown as { __mockVisualViewport?: unknown }).__mockVisualViewport) {
      delete (window as unknown as { __mockVisualViewport?: unknown }).__mockVisualViewport
    }
  })

  function installMockVisualViewport({ height = window.innerHeight }: { height?: number } = {}): {
    listeners: Set<EventListener>
    dispatchResize: () => void
  } {
    // jsdom does not implement `visualViewport`. We mock it.
    const listeners = new Set<EventListener>()
    const mockViewport = {
      height,
      width: window.innerWidth,
      addEventListener: vi.fn((type: string, handler: EventListener) => {
        if (type === 'resize') listeners.add(handler)
      }),
      removeEventListener: vi.fn((type: string, handler: EventListener) => {
        if (type === 'resize') listeners.delete(handler)
      }),
      dispatchEvent: vi.fn(),
      // Other required props (stubs to satisfy the type).
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      scale: 1
    } as unknown as VisualViewport
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      get: () => mockViewport
    })
    return {
      listeners,
      dispatchResize: () => {
        for (const handler of Array.from(listeners)) {
          handler(new Event('resize'))
        }
      }
    }
  }

  it('registers a visualViewport.resize listener when focusing an input with no visible keyboard', () => {
    // Keyboard NOT visible: visualViewport.height === window.innerHeight.
    const { listeners } = installMockVisualViewport({ height: window.innerHeight })
    const release = preventBodyScroll({ isOpen: true, modal: true })

    // Add an input and focus it. The mobile-safari onFocus
    // handler adds a listener.
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    // Flush the rAF inside onFocus (one frame to clear the
    // transform, then add the resize listener).
    vi.runAllTimers()

    expect(listeners.size).toBe(1)
    release()
  })

  it('teardown removes the visualViewport listener when the resize never fires', () => {
    // The bug: with `{ once: true }` and no resize event, the
    // listener stays attached forever.
    const { listeners } = installMockVisualViewport({ height: window.innerHeight })
    const release = preventBodyScroll({ isOpen: true, modal: true })

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    vi.runAllTimers()

    expect(listeners.size).toBe(1)

    // Trigger the teardown. The listener must be removed.
    release()
    expect(listeners.size).toBe(0)
  })

  it('teardown is a no-op when the listener already self-removed via resize', () => {
    // When the resize DOES fire, the listener self-removes
    // (the { once: true } option). The teardown must not throw
    // or double-remove.
    const { listeners, dispatchResize } = installMockVisualViewport({ height: window.innerHeight })
    const release = preventBodyScroll({ isOpen: true, modal: true })

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    vi.runAllTimers()

    expect(listeners.size).toBe(1)

    // The keyboard appears: the visualViewport resizes.
    dispatchResize()
    expect(listeners.size).toBe(0)

    // Teardown: the entry is already null in the pending
    // array, so the teardown's drain is a no-op. No error.
    expect(() => release()).not.toThrow()
    expect(listeners.size).toBe(0)
  })

  it('teardown removes multiple pending listeners (one per focused input)', () => {
    const { listeners } = installMockVisualViewport({ height: window.innerHeight })
    const release = preventBodyScroll({ isOpen: true, modal: true })

    // Focus multiple inputs; each focus adds a listener.
    const input1 = document.createElement('input')
    const input2 = document.createElement('input')
    const input3 = document.createElement('input')
    document.body.append(input1, input2, input3)
    input1.focus()
    vi.runAllTimers()
    input2.focus()
    vi.runAllTimers()
    input3.focus()
    vi.runAllTimers()

    expect(listeners.size).toBe(3)

    // Teardown removes all three.
    release()
    expect(listeners.size).toBe(0)
  })

  // Sanity: the iOS gate still works. When isIOS() returns
  // false, the mobile-safari pipeline does not run, so no
  // listener is registered.
  it('does not register a visualViewport listener when isIOS() returns false (desktop baseline)', () => {
    browserModuleMocks.isIOSSpy.mockReturnValue(false)
    const { listeners } = installMockVisualViewport({ height: window.innerHeight / 2 })
    const release = preventBodyScroll({ isOpen: true, modal: true })

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    vi.runAllTimers()

    // The desktop path doesn't touch visualViewport.
    expect(listeners.size).toBe(0)
    release()
  })
})
