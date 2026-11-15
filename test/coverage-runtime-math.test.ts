import { afterEach, describe, expect, it, vi } from 'vitest'

import { getDragPercentage } from '../src/runtime/drag'
import { getDragPermission, getDragTargetMetadata } from '../src/runtime/drag-policy'
import {
  getClosestSnapPoint,
  getSnapPointOffset,
  getSnapPointPercentageDragged,
} from '../src/runtime/snap-points'
import { getNestedDragTransform, getTranslate } from '../src/runtime/transforms'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('drag policy', () => {
  const allowed = {
    targetTagName: 'DIV',
    hasNoDragAttribute: false,
    timeSinceOpenMs: 1000,
    swipeAmount: 0,
    hasHighlightedText: false,
    timeSinceLastPreventedMs: null,
    scrollLockTimeout: 500,
    isDraggingInDirection: false,
  }

  it('does not drag while text is selected', () => {
    expect(
      getDragPermission({
        ...allowed,
        direction: 'bottom',
        hasHighlightedText: true,
        ancestors: [],
      })
    ).toEqual({ allow: false, updatePreventedAt: false })
  })

  it('treats missing horizontal scroll sizes as not scrollable', () => {
    expect(
      getDragPermission({
        ...allowed,
        direction: 'right',
        ancestors: [{ scrollHeight: 900, clientHeight: 300, scrollTop: 40, role: null }],
      }).allow
    ).toBe(true)
  })

  it('records elements without horizontal scroll metrics as zero', () => {
    const element = {
      scrollHeight: 100,
      clientHeight: 100,
      scrollTop: 0,
      getAttribute: () => null,
      hasAttribute: () => false,
      closest: () => null,
      parentElement: null,
      tagName: 'DIV',
    }
    const metadata = getDragTargetMetadata(element as unknown as EventTarget)
    expect(metadata.ancestors[0]).toMatchObject({ scrollWidth: 0, clientWidth: 0, scrollLeft: 0 })
  })
})

describe('transforms', () => {
  const withTransform = (transform: string) => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ transform } as CSSStyleDeclaration)
    return document.createElement('div')
  }

  it('reads the drag axis from computed matrices and translates', () => {
    expect(getTranslate(null, 'bottom')).toBeNull()
    expect(getTranslate(withTransform('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,7,9,0,1)'), 'left')).toBe(7)
    expect(getTranslate(withTransform('matrix(1,0,0,1,4,6)'), 'right')).toBe(4)
    expect(getTranslate(withTransform('matrix(1,0,0,1,4,6)'), 'top')).toBe(6)
    expect(getTranslate(withTransform('translate3d(12px, 30px, 0px)'), 'bottom')).toBe(30)
    expect(getTranslate(withTransform('translate3d(12px, 30px, 0px)'), 'left')).toBe(12)
    expect(getTranslate(withTransform('rotate(45deg)'), 'bottom')).toBeNull()
  })

  it('keeps the nested scale at 1 without a viewport', () => {
    expect(
      getNestedDragTransform({
        direction: 'bottom',
        viewportSize: 0,
        displacement: 0,
        percentageDragged: 0,
      }).scale
    ).toBe(1)
  })
})

describe('snap point math', () => {
  const containerSize = { width: 400, height: 800 }

  it('places snap points from the top and from the left', () => {
    expect(getSnapPointOffset({ snapPoint: 0.5, direction: 'top', containerSize })).toBe(-400)
    expect(getSnapPointOffset({ snapPoint: '100px', direction: 'left', containerSize })).toBe(-300)
  })

  it('finds the closest offset', () => {
    expect(getClosestSnapPoint({ snapPointsOffset: [400, 0], currentPosition: 30 })).toBe(0)
  })

  it('has no fade percentage when the neighbouring snap point is missing', () => {
    expect(
      getSnapPointPercentageDragged({
        snapPoints: [0.5],
        activeSnapPointIndex: 0,
        snapPointsOffset: [400],
        fadeFromIndex: 1,
        shouldFade: true,
        absDraggedDistance: 10,
        isDraggingDown: false,
      })
    ).toBe(1)
    expect(
      getSnapPointPercentageDragged({
        snapPoints: [0.25, 0.5],
        activeSnapPointIndex: 0,
        snapPointsOffset: [600],
        fadeFromIndex: 1,
        shouldFade: true,
        absDraggedDistance: 10,
        isDraggingDown: true,
      })
    ).toBeNull()
  })
})

describe('drag percentage', () => {
  it('is zero for a drawer without size', () => {
    expect(
      getDragPercentage({
        draggedDistance: 30,
        drawerDimension: 0,
        snapPointPercentageDragged: null,
      }).percentageDragged
    ).toBe(0)
  })
})
