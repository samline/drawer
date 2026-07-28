import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'
import { reset, set } from '../src/helpers'

/**
 * G7: `body.pointerEvents = 'auto'` on open (modal: false) and
 * on close.
 *
 * G8: `documentElement.scrollBehavior` is set to `auto` while the
 * drawer is open and restored on close (via the `set` + `reset`
 * cache from G5+G6).
 */

describe('body pointer-events + scrollBehavior (G7 + G8)', () => {
  beforeEach(() => {
    destroyDrawers()
    document.body.style.pointerEvents = ''
    document.documentElement.style.scrollBehavior = ''
  })

  afterEach(() => {
    destroyDrawers()
    vi.useRealTimers()
    document.body.style.pointerEvents = ''
    document.documentElement.style.scrollBehavior = ''
  })

  describe('G7: body.pointerEvents', () => {
    it('modal: true does NOT explicitly write pointerEvents on open', () => {
      const drawer = createDrawer({
        id: 'g7-modal-true',
        modal: true,
        title: 'Modal true',
        content: 'Body'
      })
      drawer.setOpen(true)
      // modal: true → no rAF should write pointer-events.
      vi.useFakeTimers()
      vi.runAllTimers()
      // The drawer does not touch body.pointerEvents in this case.
      expect(document.body.style.pointerEvents).toBe('')
    })

    it('modal: false writes pointerEvents = auto on open (via rAF)', () => {
      const drawer = createDrawer({
        id: 'g7-modal-false',
        modal: false,
        title: 'Modal false',
        content: 'Body'
      })
      drawer.setOpen(true)
      // The write is deferred to requestAnimationFrame.
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(document.body.style.pointerEvents).toBe('auto')
          resolve()
        })
      })
    })

    it('always writes pointerEvents = auto on close', () => {
      vi.useFakeTimers()
      const drawer = createDrawer({
        id: 'g7-close',
        modal: true,
        title: 'Close',
        content: 'Body'
      })
      drawer.setOpen(true)
      vi.advanceTimersByTime(100)
      // Pre-condition: drawer did not write pointerEvents.
      expect(document.body.style.pointerEvents).toBe('')

      drawer.setOpen(false)
      expect(document.body.style.pointerEvents).toBe('auto')
    })
  })

  describe('G8: documentElement.scrollBehavior', () => {
    it('sets html { scroll-behavior: auto } while open', () => {
      // Pre-set a value the consumer's CSS would normally apply.
      set(document.documentElement, { scrollBehavior: 'smooth' })
      expect(document.documentElement.style.scrollBehavior).toBe('smooth')

      const drawer = createDrawer({
        id: 'g8-set',
        title: 'Scroll set',
        content: 'Body'
      })
      drawer.setOpen(true)
      expect(document.documentElement.style.scrollBehavior).toBe('auto')
    })

    it('restores the pre-open value on close', () => {
      set(document.documentElement, { scrollBehavior: 'smooth' })

      vi.useFakeTimers()
      const drawer = createDrawer({
        id: 'g8-restore',
        title: 'Scroll restore',
        content: 'Body'
      })
      drawer.setOpen(true)
      expect(document.documentElement.style.scrollBehavior).toBe('auto')

      drawer.setOpen(false)
      // The pre-open value is restored from the cache.
      expect(document.documentElement.style.scrollBehavior).toBe('smooth')
      // Cleanup: clear the cache so subsequent tests start fresh.
      reset(document.documentElement, 'scrollBehavior')
    })

    it('does not write scrollBehavior when open: false (initial close state)', () => {
      set(document.documentElement, { scrollBehavior: 'smooth' })

      const drawer = createDrawer({
        id: 'g8-closed',
        open: false,
        title: 'Closed',
        content: 'Body'
      })
      // No setOpen(true) call → mount should not have written.
      expect(document.documentElement.style.scrollBehavior).toBe('smooth')
      // touch the variable so eslint doesn't complain about unused
      drawer.getSnapshot()
    })
  })
})
