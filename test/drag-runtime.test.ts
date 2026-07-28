import { describe, expect, it } from 'vitest'

import {
  getDragDirectionMultiplier,
  getDragPercentage,
  getDraggedDistance,
  isDraggingTowardExpandedState,
  isReleaseTowardExpandedState,
  shouldCloseDrawerOnRelease
} from '../src/runtime/drag'

describe('drag runtime helpers', () => {
  it('returns the expected direction multiplier', () => {
    expect(getDragDirectionMultiplier('bottom')).toBe(1)
    expect(getDragDirectionMultiplier('right')).toBe(1)
    expect(getDragDirectionMultiplier('top')).toBe(-1)
    expect(getDragDirectionMultiplier('left')).toBe(-1)
  })

  it('calculates dragged distance per direction', () => {
    expect(getDraggedDistance({ pointerStart: 100, currentPointer: 40, direction: 'bottom' })).toBe(60)
    expect(getDraggedDistance({ pointerStart: 100, currentPointer: 140, direction: 'top' })).toBe(40)
  })

  it('detects dragging toward the expanded state', () => {
    expect(isDraggingTowardExpandedState(10)).toBe(true)
    expect(isDraggingTowardExpandedState(-10)).toBe(false)
  })

  it('prefers snap point drag percentage when present', () => {
    expect(getDragPercentage({ draggedDistance: 40, drawerDimension: 200, snapPointPercentageDragged: 0.75 })).toEqual({
      absDraggedDistance: 40,
      percentageDragged: 0.75
    })
  })

  it('detects release direction from normalized dragged distance', () => {
    for (const direction of ['bottom', 'top', 'left', 'right'] as const) {
      expect(isReleaseTowardExpandedState({ direction, distMoved: 50 })).toBe(true)
      expect(isReleaseTowardExpandedState({ direction, distMoved: -50 })).toBe(false)
    }
  })

  it('closes on velocity or threshold', () => {
    expect(
      shouldCloseDrawerOnRelease({
        velocity: 0.6,
        velocityThreshold: 0.5,
        swipeAmount: 10,
        drawerDimension: 200,
        closeThreshold: 0.25
      })
    ).toBe(true)

    expect(
      shouldCloseDrawerOnRelease({
        velocity: 0.1,
        velocityThreshold: 0.5,
        swipeAmount: 60,
        drawerDimension: 200,
        closeThreshold: 0.25
      })
    ).toBe(true)

    expect(
      shouldCloseDrawerOnRelease({
        velocity: 0.1,
        velocityThreshold: 0.5,
        swipeAmount: 20,
        drawerDimension: 200,
        closeThreshold: 0.25
      })
    ).toBe(false)
  })
})
