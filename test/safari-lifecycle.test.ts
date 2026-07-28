import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'
import { browserModuleMocks } from './_test-helpers'

describe('Safari drawer lifecycle', () => {
  let scrollToSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.useFakeTimers()
    destroyDrawers()
    document.body.innerHTML = ''
    browserModuleMocks.reset()
    browserModuleMocks.isSafariSpy.mockReturnValue(true)
    browserModuleMocks.isIOSSpy.mockReturnValue(true)
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    destroyDrawers()
    vi.runAllTimers()
    vi.useRealTimers()
    scrollToSpy.mockRestore()
    browserModuleMocks.reset()
    document.body.removeAttribute('style')
    document.body.innerHTML = ''
  })

  it('skips fixed positioning for an initially open drawer', () => {
    const drawer = createDrawer({ id: 'safari-initial', open: true, content: 'Body' })

    expect(drawer.getSnapshot().state.isOpen).toBe(true)
    expect(document.body.style.position).toBe('')
  })

  it('visually offsets an initially open drawer while the iOS lock scrolls to zero', () => {
    let currentX = 8
    let currentY = 300
    const pageXOffset = vi.spyOn(window, 'pageXOffset', 'get').mockImplementation(() => currentX)
    const pageYOffset = vi.spyOn(window, 'pageYOffset', 'get').mockImplementation(() => currentY)
    const scrollX = vi.spyOn(window, 'scrollX', 'get').mockImplementation(() => currentX)
    const scrollY = vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => currentY)
    scrollToSpy.mockImplementation((x, y) => {
      currentX = Number(x)
      currentY = Number(y)
    })
    try {
      const drawer = createDrawer({ id: 'safari-initial-scroll', open: true, content: 'Body' })

      expect(currentY).toBe(0)
      expect(document.body.style.marginTop).toBe('-300px')

      drawer.setOpen(false)
      expect(currentY).toBe(300)
      expect(document.body.style.marginTop).toBe('')
    } finally {
      scrollY.mockRestore()
      scrollX.mockRestore()
      pageYOffset.mockRestore()
      pageXOffset.mockRestore()
    }
  })

  it('uses fixed positioning after an explicit open and restores on close', () => {
    const drawer = createDrawer({ id: 'safari-explicit', content: 'Body' })

    drawer.setOpen(true)
    expect(document.body.style.position).toBe('fixed')
    drawer.setOpen(false)
    expect(document.body.style.position).toBe('')
  })

  it('keeps the body fixed until the final drawer closes', () => {
    const first = createDrawer({ id: 'safari-first', content: 'First' })
    const second = createDrawer({ id: 'safari-second', content: 'Second' })

    first.setOpen(true)
    second.setOpen(true)
    first.setOpen(false)
    expect(document.body.style.position).toBe('fixed')

    second.setOpen(false)
    expect(document.body.style.position).toBe('')
  })
})
