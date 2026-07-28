import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { preventBodyScroll } from '../src/runtime/scroll-lock'
import { browserModuleMocks } from './_test-helpers'

/**
 * `preventBodyScroll` is the vanilla runtime's baseline modal lock.
 * Vaul can delegate that responsibility to Radix Dialog; this package
 * cannot, so initial-open drawers and `repositionInputs: false` still
 * lock the page.
 *
 * The gate suppresses the body-scroll lock when ANY of the
 * following is true:
 *   1. `disablePreventScroll: true`
 *   2. `isOpen: false`
 *   3. `isDragging: true`
 *   4. `modal: false`
 *   5. `justReleased: true`
 * The desktop baseline sets `body.overflow: hidden`; locks compose so
 * only the final owner restores the pre-existing style.
 */

function bodyOverflow(): string {
  return document.body.style.overflow
}

describe('preventBodyScroll gate (G3 + G11 + G12)', () => {
  const pendingRestores: Array<() => void> = []

  const acquire = (options: Parameters<typeof preventBodyScroll>[0]) => {
    const restore = preventBodyScroll(options)
    pendingRestores.push(restore)
    return restore
  }

  beforeEach(() => {
    browserModuleMocks.reset()
  })

  afterEach(() => {
    pendingRestores.splice(0).forEach((restore) => restore())
    browserModuleMocks.reset()
    document.body.style.overflow = ''
  })

  it('desktop baseline: locks when all gates pass', () => {
    const restore = acquire({
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
    const restore = acquire({
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
    const restore = acquire({
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
    const restore = acquire({
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
    const restore = acquire({
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
    const restore = acquire({
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

  it('locks an initially open modal before it has opened previously', () => {
    const restore = acquire({
      isOpen: true,
      isDragging: false,
      modal: true,
      justReleased: false,
      hasBeenOpened: false,
      repositionInputs: true
    })
    expect(bodyOverflow()).toBe('hidden')
    restore()
  })

  it('locks when input repositioning is disabled', () => {
    const restore = acquire({
      isOpen: true,
      isDragging: false,
      modal: true,
      justReleased: false,
      hasBeenOpened: true,
      repositionInputs: false
    })
    expect(bodyOverflow()).toBe('hidden')
    restore()
  })

  it('multiple gates combine (OR semantics)', () => {
    const restore = acquire({
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

  it('restores the page only after the final owner releases', () => {
    document.body.style.overflow = 'scroll'
    const restoreFirst = acquire({ isOpen: true, modal: true })
    const restoreSecond = acquire({ isOpen: true, modal: true })

    expect(bodyOverflow()).toBe('hidden')
    restoreFirst()
    expect(bodyOverflow()).toBe('hidden')
    restoreSecond()
    expect(bodyOverflow()).toBe('scroll')
  })
})
