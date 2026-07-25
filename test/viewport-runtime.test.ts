import { describe, expect, it } from 'vitest'

import { getKeyboardOpenState, getViewportDrivenDrawerLayout } from '../src/runtime/viewport'

describe('viewport runtime helpers', () => {
  it('toggles keyboard state only when the diff crosses the threshold', () => {
    expect(getKeyboardOpenState({ previousDiffFromInitial: 0, diffFromInitial: 80, keyboardIsOpen: false })).toBe(true)

    expect(getKeyboardOpenState({ previousDiffFromInitial: 20, diffFromInitial: 50, keyboardIsOpen: false })).toBe(
      false
    )
  })

  it('computes a fixed drawer layout while the keyboard is open', () => {
    expect(
      getViewportDrivenDrawerLayout({
        visualViewportHeight: 500,
        totalHeight: 800,
        drawerHeight: 700,
        offsetFromTop: 20,
        fixed: true,
        previousDiffFromInitial: 0,
        keyboardIsOpen: false,
        initialDrawerHeight: 0,
        activeSnapPointOffset: undefined as unknown as number,
        isMobileFirefox: false,
        windowTopOffset: 26
      })
    ).toEqual({
      diffFromInitial: 300,
      nextKeyboardIsOpen: true,
      nextInitialDrawerHeight: 700,
      height: '400px',
      bottom: '300px'
    })
  })

  it('restores the initial height when no keyboard layout is needed', () => {
    expect(
      getViewportDrivenDrawerLayout({
        visualViewportHeight: 800,
        totalHeight: 800,
        drawerHeight: 300,
        offsetFromTop: 30,
        fixed: false,
        previousDiffFromInitial: 0,
        keyboardIsOpen: false,
        initialDrawerHeight: 320,
        activeSnapPointOffset: undefined as unknown as number,
        isMobileFirefox: false,
        windowTopOffset: 26
      })
    ).toEqual({
      diffFromInitial: 0,
      nextKeyboardIsOpen: false,
      nextInitialDrawerHeight: 320,
      height: '320px',
      bottom: '0px'
    })
  })

  it('pins bottom to zero when snap points are active and the keyboard state remains closed', () => {
    expect(
      getViewportDrivenDrawerLayout({
        visualViewportHeight: 800,
        totalHeight: 800,
        drawerHeight: 300,
        offsetFromTop: 30,
        fixed: false,
        previousDiffFromInitial: 180,
        keyboardIsOpen: false,
        initialDrawerHeight: 300,
        activeSnapPointOffset: 180,
        isMobileFirefox: false,
        windowTopOffset: 26
      }).bottom
    ).toBe('0px')
  })
})
