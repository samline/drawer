import { describe, expect, it } from 'vitest'

import { getSnapPointReleaseAction } from '../src/runtime/release'

describe('snap release runtime helpers', () => {
  it('closes on a high-velocity dismissing release when dismissible', () => {
    expect(
      getSnapPointReleaseAction({
        fadeFromIndex: 1,
        direction: 'bottom',
        activeSnapPointOffset: 680,
        activeSnapPointIndex: 0,
        snapPointsOffset: [680, 400, 0],
        snapPointsCount: 3,
        draggedDistance: -40,
        velocity: 2.5,
        dismissible: true,
        snapToSequentialPoint: false,
        velocityThreshold: 0.4,
        viewportSize: 800
      })
    ).toEqual({ type: 'close' })
  })

  it('snaps back to the first point on a high-velocity dismissing release when not dismissible', () => {
    expect(
      getSnapPointReleaseAction({
        fadeFromIndex: 1,
        direction: 'bottom',
        activeSnapPointOffset: 680,
        activeSnapPointIndex: 0,
        snapPointsOffset: [680, 400, 0],
        snapPointsCount: 3,
        draggedDistance: -40,
        velocity: 2.5,
        dismissible: false,
        snapToSequentialPoint: false,
        velocityThreshold: 0.4,
        viewportSize: 800
      })
    ).toEqual({ type: 'snap', targetOffset: 680 })
  })

  it('snaps to the last point on a high-velocity expanding release', () => {
    expect(
      getSnapPointReleaseAction({
        fadeFromIndex: 1,
        direction: 'bottom',
        activeSnapPointOffset: 400,
        activeSnapPointIndex: 1,
        snapPointsOffset: [680, 400, 0],
        snapPointsCount: 3,
        draggedDistance: 120,
        velocity: 2.5,
        dismissible: true,
        snapToSequentialPoint: false,
        velocityThreshold: 0.4,
        viewportSize: 800
      })
    ).toEqual({ type: 'snap', targetOffset: 0 })
  })

  it('steps to the next snap point on a moderate directional release', () => {
    expect(
      getSnapPointReleaseAction({
        fadeFromIndex: 1,
        direction: 'bottom',
        activeSnapPointOffset: 400,
        activeSnapPointIndex: 1,
        snapPointsOffset: [680, 400, 0],
        snapPointsCount: 3,
        draggedDistance: 60,
        velocity: 0.5,
        dismissible: true,
        snapToSequentialPoint: false,
        velocityThreshold: 0.4,
        viewportSize: 800
      })
    ).toEqual({ type: 'snap', targetOffset: 0 })
  })

  it('falls back to the closest snap point when velocity is low', () => {
    expect(
      getSnapPointReleaseAction({
        fadeFromIndex: 1,
        direction: 'bottom',
        activeSnapPointOffset: 400,
        activeSnapPointIndex: 1,
        snapPointsOffset: [680, 400, 0],
        snapPointsCount: 3,
        draggedDistance: 30,
        velocity: 0.1,
        dismissible: true,
        snapToSequentialPoint: false,
        velocityThreshold: 0.4,
        viewportSize: 800
      })
    ).toEqual({ type: 'snap', targetOffset: 400 })
  })

  it('returns noop when snap release inputs are incomplete', () => {
    expect(
      getSnapPointReleaseAction({
        direction: 'bottom',
        activeSnapPointOffset: null,
        activeSnapPointIndex: null,
        snapPointsOffset: [],
        snapPointsCount: 0,
        draggedDistance: 0,
        velocity: 0,
        dismissible: true,
        snapToSequentialPoint: false,
        velocityThreshold: 0.4,
        viewportSize: 800
      })
    ).toEqual({ type: 'noop' })
  })
})
