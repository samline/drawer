import { describe, expect, it } from 'vitest'

import {
  dampenValue,
  getDraggableOffset,
  isDraggingInCloseDirection
} from '../src/runtime/drag'

/**
 * Regression tests for the opposite-direction drag resistance
 * (v2 vaul parity).
 *
 * Background:
 *   - v2 used `dampenValue(v) = 8 * (log(v + 1) - 2)` to dampen
 *     out-of-bounds drags. A 100 px drag in the wrong direction
 *     produced ~21 px of movement; a 200 px drag ~26 px.
 *   - v3.0.0-beta.3 replaced it with a linear `0.5` factor. The
 *     drawer followed the finger at 50 % of the gesture distance,
 *     a visible regression for the consumer ("the drawer follows
 *     the finger in the opposite of the close direction").
 *   - This commit restores the v2 logarithmic dampening and adds
 *     a `dampenValue` export so the curve is unit-testable without
 *     a real DOM / PointerEvent.
 *
 * Direction sign convention (matches the runtime):
 *   - `getDraggedDistance` = (pointerStart - currentPointer) * multiplier
 *   - Multiplier = 1 for `bottom`/`right`, -1 for `top`/`left`.
 *   - Dragging toward the close direction ALWAYS yields a NEGATIVE
 *     `draggedDistance` for every `direction` (the runtime uses
 *     `(start - current)` because the close direction reduces the
 *     drawer's visible offset from its rest position).
 *   - `isDraggingInCloseDirection` therefore returns
 *     `draggedDistance < 0` for every direction.
 *
 * See `.agents/issues/2026-07-26-drag-opposite-direction-no-logarithmic-dampening.md`
 * for the full diagnosis.
 */

describe('drag elastic resistance (opposite direction)', () => {
  describe('dampenValue (v2 logarithmic curve)', () => {
    it('produces ~21 px for a 100 px wrong-direction drag', () => {
      // dampenValue(100) = 8 * (ln(101) - 2) ≈ 8 * 2.615 ≈ 20.92
      expect(dampenValue(100)).toBeCloseTo(20.92, 1)
    })

    it('produces ~26 px for a 200 px wrong-direction drag', () => {
      // dampenValue(200) = 8 * (ln(201) - 2) ≈ 8 * 3.298 ≈ 26.4
      // (the curve flattens quickly)
      const v = dampenValue(200)
      expect(v).toBeGreaterThan(25)
      expect(v).toBeLessThan(30)
    })

    it('produces smaller magnitudes than the input (always resists)', () => {
      for (const input of [10, 50, 100, 200, 500]) {
        expect(dampenValue(input)).toBeLessThan(input)
      }
    })

    it('handles zero distance as a no-op (negative side)', () => {
      // dampenValue(0) = 8 * (ln(1) - 2) = 8 * (0 - 2) = -16
      // (negative — the consumer should clamp with Math.abs first
      // before feeding into the curve, which the runtime does)
      expect(dampenValue(0)).toBeCloseTo(-16, 1)
    })
  })

  describe('isDraggingInCloseDirection', () => {
    it('bottom: dragging down (positive Y) is the close direction', () => {
      // Multiplier for `bottom` is 1, so draggedDistance = (startY - currentY) * 1
      // Drag from y=100 to y=200 (downward) → draggedDistance = (100 - 200) * 1 = -100
      expect(isDraggingInCloseDirection({ direction: 'bottom', draggedDistance: -100 })).toBe(true)
      expect(isDraggingInCloseDirection({ direction: 'bottom', draggedDistance: 100 })).toBe(false)
    })

    it('right: dragging right (positive X) is the close direction', () => {
      // Multiplier for `right` is 1, draggedDistance = (startX - currentX) * 1
      // Drag from x=100 to x=200 (rightward) → draggedDistance = (100 - 200) * 1 = -100
      expect(isDraggingInCloseDirection({ direction: 'right', draggedDistance: -100 })).toBe(true)
      expect(isDraggingInCloseDirection({ direction: 'right', draggedDistance: 100 })).toBe(false)
    })

    it('left: dragging left (negative X) is the close direction', () => {
      // Multiplier for `left` is -1, draggedDistance = (startX - currentX) * -1
      // Drag from x=200 to x=100 (leftward) → draggedDistance = (200 - 100) * -1 = -100
      expect(isDraggingInCloseDirection({ direction: 'left', draggedDistance: -100 })).toBe(true)
      expect(isDraggingInCloseDirection({ direction: 'left', draggedDistance: 100 })).toBe(false)
    })

    it('top: dragging up (negative Y) is the close direction', () => {
      // Multiplier for `top` is -1, draggedDistance = (startY - currentY) * -1
      // Drag from y=200 to y=100 (upward) → draggedDistance = (200 - 100) * -1 = -100
      expect(isDraggingInCloseDirection({ direction: 'top', draggedDistance: -100 })).toBe(true)
      expect(isDraggingInCloseDirection({ direction: 'top', draggedDistance: 100 })).toBe(false)
    })
  })

  describe('getDraggableOffset (pure offset math, no DOM)', () => {
    it('right direction: drag right (close) → baseOffset follows 1:1', () => {
      // draggedDistance = -100, baseOffset = -(-100) = 100
      expect(getDraggableOffset({ direction: 'right', draggedDistance: -100 })).toBe(100)
    })

    it('right direction: drag left (opposite) → logarithmic dampening', () => {
      // draggedDistance = +100, baseOffset = -100, outOfBounds = true
      // magnitude = dampenValue(100) ≈ 20.92, sign = -1, return ≈ -20.92
      const offset = getDraggableOffset({ direction: 'right', draggedDistance: 100 })
      expect(offset).toBeCloseTo(-20.92, 1)
      expect(Math.abs(offset)).toBeLessThan(100 * 0.5) // less than half = v2 parity
    })

    it('bottom direction: drag down (close) → baseOffset follows 1:1', () => {
      // draggedDistance = -100, baseOffset = -(-100) = 100
      expect(getDraggableOffset({ direction: 'bottom', draggedDistance: -100 })).toBe(100)
    })

    it('bottom direction: drag up (opposite) → logarithmic dampening', () => {
      const offset = getDraggableOffset({ direction: 'bottom', draggedDistance: 100 })
      expect(offset).toBeCloseTo(-20.92, 1)
    })

    it('left direction: drag left (close) → baseOffset follows 1:1', () => {
      // For 'left', baseOffset = draggedDistance (no negation).
      // Dragging left → draggedDistance = -100 → baseOffset = -100.
      expect(getDraggableOffset({ direction: 'left', draggedDistance: -100 })).toBe(-100)
    })

    it('left direction: drag right (opposite) → logarithmic dampening', () => {
      // Dragging right on a `direction: 'left'` drawer → draggedDistance = +100.
      // baseOffset = +100. isDraggingInCloseDirection = false → outOfBounds.
      // magnitude = dampenValue(100) ≈ 20.92, sign = +1, return ≈ +20.92.
      const offset = getDraggableOffset({ direction: 'left', draggedDistance: 100 })
      expect(offset).toBeCloseTo(20.92, 1)
    })

    it('top direction: drag up (close) → baseOffset follows 1:1', () => {
      // Dragging up on a `direction: 'top'` drawer → draggedDistance = -100.
      expect(getDraggableOffset({ direction: 'top', draggedDistance: -100 })).toBe(-100)
    })

    it('top direction: drag down (opposite) → logarithmic dampening', () => {
      const offset = getDraggableOffset({ direction: 'top', draggedDistance: 100 })
      expect(offset).toBeCloseTo(20.92, 1)
    })

    it('zero drag returns zero offset (no edge case)', () => {
      expect(getDraggableOffset({ direction: 'right', draggedDistance: 0 })).toBeCloseTo(0)
      expect(getDraggableOffset({ direction: 'left', draggedDistance: 0 })).toBeCloseTo(0)
    })

    it('1:1 with vaul upstream (no DRAG_RESISTANCE multiplier, just dampenValue)', () => {
      // vaul upstream applies `dampenValue(draggedDistance)` directly
      // to the opposite-direction drag. The port historically had a
      // `DRAG_RESISTANCE = 1` multiplier (no-op) on top of the curve;
      // removed in v3.0.0 stable. For `direction: 'bottom'` and a
      // 100 px UP drag (opposite of close), `getDraggableOffset` returns
      // the dampened magnitude with the sign of the base offset
      // (negative, because the drawer is dragged up).
      const expected = -(8 * (Math.log(101) - 2))
      expect(getDraggableOffset({ direction: 'bottom', draggedDistance: 100 })).toBeCloseTo(
        expected,
        5
      )
    })

    it('opposite-direction resistance matches v2 ratio (~21% at 100 px)', () => {
      // Sanity check: the v2 vaul behavior was about 20% movement
      // for a 100 px drag in the wrong direction. Verify the
      // restored logarithmic curve matches.
      const offset = Math.abs(getDraggableOffset({ direction: 'right', draggedDistance: 100 }))
      const ratio = offset / 100
      expect(ratio).toBeGreaterThan(0.15)
      expect(ratio).toBeLessThan(0.3)
    })
  })
})