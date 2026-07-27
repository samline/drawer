import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'
import { getDragPermission } from '../src/runtime/drag-policy'

/**
 * Regression test for the horizontal-direction drag policy.
 *
 * Bug (v3.0.0-beta.3): for `direction === 'left'` or `direction === 'right'`,
 * `getDragPermission` returned `{ allow: true, updatePreventedAt: false }`
 * unconditionally — even when the swipe was in the OPPOSITE of the
 * close direction (e.g. dragging a `direction: 'right'` drawer to the
 * LEFT). The drag pipeline then started a drag, the consumer saw
 * "the drawer follows the finger in the opposite of the close
 * direction" (a v2 regression).
 *
 * Fix (stable): the horizontal short-circuit now
 *   - keeps the `swipeAmount: null` early-out (fresh pointerdown,
 *     direction not yet known — the run-time check below confirms
 *     the direction on the first move),
 *   - AND honours the close-direction check for non-null `swipeAmount`
 *     values, mirroring the existing `bottom`/`top` logic.
 *
 * The pure helper is exercised directly; the run-time path is
 * covered by `test/drag-pipeline-integration.test.ts`.
 */

describe('drag direction permission (horizontal)', () => {
  it('allows fresh pointerdown regardless of direction', () => {
    for (const direction of ['left', 'right', 'top', 'bottom'] as const) {
      expect(
        getDragPermission({
          targetTagName: 'DIV',
          hasNoDragAttribute: false,
          direction,
          timeSinceOpenMs: 1000,
          swipeAmount: null,
          hasHighlightedText: false,
          timeSinceLastPreventedMs: null,
          scrollLockTimeout: 100,
          isDraggingInDirection: false,
          ancestors: []
        }).allow
      ).toBe(true)
    }
  })

  it('allows `right` swipe when direction is `right` (close)', () => {
    // Drag right (close for `right`). Swipe amount is the current
    // translation along the axis: positive means dragging toward the
    // close position when direction is `right` (the runtime passes
    // `getDraggableOffset` semantics — sign here matches the drag
    // pipeline's positive close axis for `right`).
    //
    // Concretely: dragging right on a `right` drawer produces a
    // negative `draggedDistance` (per `getDraggedDistance`'s
    // `(start - current)` sign convention), so `swipeAmount < 0`
    // is the close-direction indicator. We pass `swipeAmount`
    // through the same convention the runtime uses (a number that
    // mirrors `draggedDistance`).
    const result = getDragPermission({
      targetTagName: 'DIV',
      hasNoDragAttribute: false,
      direction: 'right',
      timeSinceOpenMs: 1000,
      swipeAmount: -50,
      hasHighlightedText: false,
      timeSinceLastPreventedMs: null,
      scrollLockTimeout: 100,
      isDraggingInDirection: false,
      ancestors: []
    })
    expect(result.allow).toBe(true)
  })

  it('denies `left` swipe when direction is `right` (opposite)', () => {
    // Drag left on a `right` drawer → swipeAmount > 0 (per the
    // same sign convention) → opposite direction → drag denied.
    const result = getDragPermission({
      targetTagName: 'DIV',
      hasNoDragAttribute: false,
      direction: 'right',
      timeSinceOpenMs: 1000,
      swipeAmount: 50,
      hasHighlightedText: false,
      timeSinceLastPreventedMs: null,
      scrollLockTimeout: 100,
      isDraggingInDirection: false,
      ancestors: []
    })
    expect(result.allow).toBe(false)
  })

  it('allows `left` swipe when direction is `left` (close)', () => {
    // Drag left on a `left` drawer → swipeAmount > 0 → close.
    const result = getDragPermission({
      targetTagName: 'DIV',
      hasNoDragAttribute: false,
      direction: 'left',
      timeSinceOpenMs: 1000,
      swipeAmount: 50,
      hasHighlightedText: false,
      timeSinceLastPreventedMs: null,
      scrollLockTimeout: 100,
      isDraggingInDirection: false,
      ancestors: []
    })
    expect(result.allow).toBe(true)
  })

  it('denies `right` swipe when direction is `left` (opposite)', () => {
    const result = getDragPermission({
      targetTagName: 'DIV',
      hasNoDragAttribute: false,
      direction: 'left',
      timeSinceOpenMs: 1000,
      swipeAmount: -50,
      hasHighlightedText: false,
      timeSinceLastPreventedMs: null,
      scrollLockTimeout: 100,
      isDraggingInDirection: false,
      ancestors: []
    })
    expect(result.allow).toBe(false)
  })

  it('still honours data-drawer-no-drag opt-out', () => {
    const result = getDragPermission({
      targetTagName: 'DIV',
      hasNoDragAttribute: true,
      direction: 'right',
      timeSinceOpenMs: 1000,
      swipeAmount: -50,
      hasHighlightedText: false,
      timeSinceLastPreventedMs: null,
      scrollLockTimeout: 100,
      isDraggingInDirection: false,
      ancestors: []
    })
    expect(result.allow).toBe(false)
  })
})
