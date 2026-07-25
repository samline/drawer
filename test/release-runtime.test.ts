import { describe, expect, it } from 'vitest'

import { getDismissibleReleaseResult, getReleaseAction, shouldPreventFocusOnRelease } from '../src/runtime/release'

describe('release runtime helpers', () => {
  it('marks high-velocity releases to prevent focus', () => {
    expect(shouldPreventFocusOnRelease(0.1)).toBe(true)
    expect(shouldPreventFocusOnRelease(0.01)).toBe(false)
  })

  it('resets when released toward expanded state', () => {
    expect(
      getReleaseAction({
        direction: 'bottom',
        distMoved: 50,
        velocity: 0.1,
        velocityThreshold: 0.4,
        swipeAmount: 20,
        drawerDimension: 200,
        closeThreshold: 0.25
      })
    ).toBe('reset')
  })

  it('closes when release crosses the threshold toward dismissal', () => {
    expect(
      getReleaseAction({
        direction: 'bottom',
        distMoved: -50,
        velocity: 0.6,
        velocityThreshold: 0.4,
        swipeAmount: 70,
        drawerDimension: 200,
        closeThreshold: 0.25
      })
    ).toBe('close')
  })

  it('resets when release does not cross the closing criteria', () => {
    expect(
      getReleaseAction({
        direction: 'left',
        distMoved: 50,
        velocity: 0.1,
        velocityThreshold: 0.4,
        swipeAmount: 20,
        drawerDimension: 200,
        closeThreshold: 0.25
      })
    ).toBe('reset')
  })

  it('returns the combined dismissible release result', () => {
    expect(
      getDismissibleReleaseResult({
        direction: 'bottom',
        distMoved: -50,
        velocity: 0.6,
        velocityThreshold: 0.4,
        swipeAmount: 70,
        drawerDimension: 200,
        closeThreshold: 0.25
      })
    ).toEqual({
      action: 'close',
      shouldPreventFocus: true,
      nextOpen: false
    })

    expect(
      getDismissibleReleaseResult({
        direction: 'left',
        distMoved: -20,
        velocity: 0.01,
        velocityThreshold: 0.4,
        swipeAmount: 20,
        drawerDimension: 200,
        closeThreshold: 0.25
      })
    ).toEqual({
      action: 'reset',
      shouldPreventFocus: false,
      nextOpen: true
    })
  })
})
