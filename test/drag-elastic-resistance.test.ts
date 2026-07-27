import { describe, expect, it } from 'vitest'

import {
  DRAG_RESISTANCE,
  getDraggableOffset,
  isDraggingInCloseDirection
} from '../src/runtime/drag'

/**
 * Regression tests for the opposite-direction drag resistance
 * (v2 vaul parity).
 *
 * Symptom (v3.0.0-beta.3): when a drawer is open and the user drags
 * in the OPPOSITE of the close direction (e.g. dragging a
 * `direction='right'` drawer to the left), the drawer follows the
 * finger with no limit, sliding completely off-screen on the wrong
 * side. v2 (vaul) had a 50% resistance factor in this direction
 * (Safari-style scroll bounce); v3 dropped it.
 *
 * Fix: `getDraggableOffset` (pure helper in `runtime/drag.ts`)
 * returns the base offset in the close direction, and
 * `baseOffset * DRAG_RESISTANCE` (0.5) in the opposite direction.
 * `vanilla/dialog.ts` calls this on every `pointermove` to compute
 * the inline transform.
 *
 * The fix is exposed as a pure helper so it is unit-testable without
 * needing a real DOM / PointerEvent.
 *
 * See `.agents/issues/2026-07-26-drag-opposite-direction-no-elastic-resistance.md`
 * for the full diagnosis and the v2 vaul comparison.
 */

describe('drag elastic resistance (opposite direction)', () => {
  describe('isDraggingInCloseDirection', () => {
    it('bottom: dragging up (negative Y) is the close direction', () => {
      // Multiplier for `bottom` is 1, so draggedDistance = (startY - currentY) * 1
      // Drag from y=100 to y=60 → draggedDistance = (100 - 60) * 1 = 40 (positive)
      // Close direction for `bottom` is draggedDistance < 0 (drag down → y increases)
      expect(isDraggingInCloseDirection({ direction: 'bottom', draggedDistance: -40 })).toBe(true)
      expect(isDraggingInCloseDirection({ direction: 'bottom', draggedDistance: 40 })).toBe(false)
    })

    it('right: dragging right (positive X) is the close direction', () => {
      // Multiplier for `right` is 1, draggedDistance = (startX - currentX) * 1
      // Drag from x=100 to x=140 → draggedDistance = (100 - 140) * 1 = -40 (negative)
      // Close direction for `right` is draggedDistance < 0 (drag right)
      expect(isDraggingInCloseDirection({ direction: 'right', draggedDistance: -40 })).toBe(true)
      expect(isDraggingInCloseDirection({ direction: 'right', draggedDistance: 40 })).toBe(false)
    })

    it('left: dragging left (negative X) is the close direction', () => {
      // Multiplier for `left` is -1, draggedDistance = (startX - currentX) * -1
      // Drag from x=100 to x=60 → draggedDistance = (100 - 60) * -1 = -40
      // Close direction for `left` is draggedDistance > 0 (drag left)
      expect(isDraggingInCloseDirection({ direction: 'left', draggedDistance: 40 })).toBe(true)
      expect(isDraggingInCloseDirection({ direction: 'left', draggedDistance: -40 })).toBe(false)
    })

    it('top: dragging up (negative Y) is the close direction', () => {
      // Multiplier for `top` is -1, draggedDistance = (startY - currentY) * -1
      // Drag from y=100 to y=60 → draggedDistance = (100 - 60) * -1 = -40
      // Close direction for `top` is draggedDistance > 0 (drag up)
      expect(isDraggingInCloseDirection({ direction: 'top', draggedDistance: 40 })).toBe(true)
      expect(isDraggingInCloseDirection({ direction: 'top', draggedDistance: -40 })).toBe(false)
    })
  })

  describe('getDraggableOffset (pure offset math, no DOM)', () => {
    it('right direction: drag right (close) → baseOffset follows 1:1', () => {
      // draggedDistance = -40, baseOffset = -(-40) = 40
      expect(getDraggableOffset({ direction: 'right', draggedDistance: -40 })).toBe(40)
      // draggedDistance = -100, baseOffset = 100
      expect(getDraggableOffset({ direction: 'right', draggedDistance: -100 })).toBe(100)
    })

    it('right direction: drag left (opposite) → baseOffset * DRAG_RESISTANCE', () => {
      // draggedDistance = 40, baseOffset = -40, * 0.5 = -20
      expect(getDraggableOffset({ direction: 'right', draggedDistance: 40 })).toBe(-20)
      // draggedDistance = 100, baseOffset = -100, * 0.5 = -50
      expect(getDraggableOffset({ direction: 'right', draggedDistance: 100 })).toBe(-50)
    })

    it('bottom direction: drag down (close) → baseOffset follows 1:1', () => {
      // draggedDistance = -40, baseOffset = -(-40) = 40
      expect(getDraggableOffset({ direction: 'bottom', draggedDistance: -40 })).toBe(40)
    })

    it('bottom direction: drag up (opposite) → baseOffset * DRAG_RESISTANCE', () => {
      // draggedDistance = 40, baseOffset = -40, * 0.5 = -20
      expect(getDraggableOffset({ direction: 'bottom', draggedDistance: 40 })).toBe(-20)
    })

    it('left direction: drag left (close) → baseOffset follows 1:1', () => {
      // For left, baseOffset = draggedDistance (no negation)
      // draggedDistance = 40 (close direction for left), baseOffset = 40
      expect(getDraggableOffset({ direction: 'left', draggedDistance: 40 })).toBe(40)
    })

    it('left direction: drag right (opposite) → baseOffset * DRAG_RESISTANCE', () => {
      // draggedDistance = -40 (opposite for left), baseOffset = -40, * 0.5 = -20
      expect(getDraggableOffset({ direction: 'left', draggedDistance: -40 })).toBe(-20)
    })

    it('top direction: drag up (close) → baseOffset follows 1:1', () => {
      // draggedDistance = 40 (close for top), baseOffset = 40
      expect(getDraggableOffset({ direction: 'top', draggedDistance: 40 })).toBe(40)
    })

    it('top direction: drag down (opposite) → baseOffset * DRAG_RESISTANCE', () => {
      // draggedDistance = -40 (opposite for top), baseOffset = -40, * 0.5 = -20
      expect(getDraggableOffset({ direction: 'top', draggedDistance: -40 })).toBe(-20)
    })

    it('zero drag returns zero offset (no edge case)', () => {
      // `-0` (from `-0 * 0.5`) is structurally equal to `0` but not
      // strictly equal in `toBe`. Use `toBeCloseTo` to normalize.
      expect(getDraggableOffset({ direction: 'right', draggedDistance: 0 })).toBeCloseTo(0)
      expect(getDraggableOffset({ direction: 'left', draggedDistance: 0 })).toBeCloseTo(0)
    })

    it('DRAG_RESISTANCE is exported at 0.5 (v2 vaul parity)', () => {
      expect(DRAG_RESISTANCE).toBe(0.5)
    })
  })
})
