import { describe, expect, it } from 'vitest'

import { getParentNestedVisualState } from '../src/runtime/nested'

describe('nested runtime helpers', () => {
  it('returns the open nested visual state for a parent with an open child', () => {
    expect(
      getParentNestedVisualState({
        direction: 'bottom',
        viewportSize: 400,
        hasOpenChild: true
      })
    ).toEqual({
      transform: 'scale(0.96) translate3d(0, -16px, 0)',
      transition: 'transform 0.5s cubic-bezier(0.32,0.72,0,1)'
    })
  })

  it('returns the reset nested visual state when no child is open', () => {
    expect(
      getParentNestedVisualState({
        direction: 'bottom',
        viewportSize: 400,
        hasOpenChild: false
      })
    ).toEqual({
      transform: 'scale(1) translate3d(0, 0px, 0)',
      transition: 'transform 0.5s cubic-bezier(0.32,0.72,0,1)'
    })
  })

  it('returns a drag visual state while a nested child is being dragged', () => {
    expect(
      getParentNestedVisualState({
        direction: 'bottom',
        viewportSize: 400,
        hasOpenChild: true,
        percentageDragged: 0.5
      })
    ).toEqual({
      transform: 'scale(0.98) translate3d(0, -8px, 0)',
      transition: 'none'
    })
  })
})
