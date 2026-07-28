import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { preventBodyScroll } from '../src/runtime/scroll-lock'
import { browserModuleMocks } from './_test-helpers'

/**
 * G3 + G11 + G12: `preventBodyScroll` (port of vaul's
 * `usePreventScroll`) must respect the full 7-condition gate from
 * vaul upstream, not just `disablePreventScroll`.
 *
 * The gate suppresses the body-scroll lock when ANY of the
 * following is true:
 *   1. `disablePreventScroll: true`
 *   2. `isOpen: false`
 *   3. `isDragging: true`
 *   4. `modal: false`
 *   5. `justReleased: true`
 *   6. `hasBeenOpened: false`
 *   7. `repositionInputs: false`
 *
 * The desktop baseline test asserts that on a non-iOS, non-Safari
 * jsdom environment, the desktop path sets `body.overflow: hidden`
 * when ALL gates pass. Each test then flips ONE gate and asserts
 * the lock is suppressed (the body's `overflow` is NOT set to
 * `hidden`).
 */

function bodyOverflow(): string {
  return document.body.style.overflow
}

describe('preventBodyScroll gate (G3 + G11 + G12)', () => {
  beforeEach(() => {
    browserModuleMocks.reset()
  })

  afterEach(() => {
    browserModuleMocks.reset()
    document.body.style.overflow = ''
  })

  it('desktop baseline: locks when all gates pass', () => {
    const restore = preventBodyScroll({
      disablePreventScroll: false,
      isOpen: true,
      isDragging: false,
      modal: true,
      justReleased: false,
      hasBeenOpened: true,
      repositionInputs: true
    })
    expect(bodyOverflow()).toBe('hidden')
    restore()
    expect(bodyOverflow()).toBe('')
  })

  it('G3: disablePreventScroll=true is a no-op', () => {
    const restore = preventBodyScroll({
      disablePreventScroll: true,
      isOpen: true,
      isDragging: false,
      modal: true,
      justReleased: false,
      hasBeenOpened: true,
      repositionInputs: true
    })
    expect(bodyOverflow()).toBe('')
    expect(() => restore()).not.toThrow()
  })

  it('G3: isOpen=false suppresses the lock', () => {
    const restore = preventBodyScroll({
      isOpen: false,
      isDragging: false,
      modal: true,
      justReleased: false,
      hasBeenOpened: true,
      repositionInputs: true
    })
    expect(bodyOverflow()).toBe('')
    restore()
  })

  it('G3: isDragging=true suppresses the lock (user is mid-drag)', () => {
    const restore = preventBodyScroll({
      isOpen: true,
      isDragging: true,
      modal: true,
      justReleased: false,
      hasBeenOpened: true,
      repositionInputs: true
    })
    expect(bodyOverflow()).toBe('')
    restore()
  })

  it('G3: modal=false suppresses the lock', () => {
    const restore = preventBodyScroll({
      isOpen: true,
      isDragging: false,
      modal: false,
      justReleased: false,
      hasBeenOpened: true,
      repositionInputs: true
    })
    expect(bodyOverflow()).toBe('')
    restore()
  })

  it('G11: justReleased=true suppresses the lock (200 ms focus race)', () => {
    const restore = preventBodyScroll({
      isOpen: true,
      isDragging: false,
      modal: true,
      justReleased: true,
      hasBeenOpened: true,
      repositionInputs: true
    })
    expect(bodyOverflow()).toBe('')
    restore()
  })

  it('G12: hasBeenOpened=false suppresses the lock (initial mount)', () => {
    const restore = preventBodyScroll({
      isOpen: true,
      isDragging: false,
      modal: true,
      justReleased: false,
      hasBeenOpened: false,
      repositionInputs: true
    })
    expect(bodyOverflow()).toBe('')
    restore()
  })

  it('G3: repositionInputs=false suppresses the lock', () => {
    const restore = preventBodyScroll({
      isOpen: true,
      isDragging: false,
      modal: true,
      justReleased: false,
      hasBeenOpened: true,
      repositionInputs: false
    })
    expect(bodyOverflow()).toBe('')
    restore()
  })

  it('multiple gates combine (OR semantics)', () => {
    const restore = preventBodyScroll({
      isOpen: true,
      isDragging: true, // gate 1
      modal: true,
      justReleased: true, // gate 2
      hasBeenOpened: true,
      repositionInputs: false // gate 3
    })
    expect(bodyOverflow()).toBe('')
    restore()
  })
})
