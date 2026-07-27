import type { CommonDrawerDirection } from '../core'

/**
 * The post-open grace period (ms). For the first 500 ms after a drawer
 * opens, `pointerdown` does not start a drag — the consumer's tap-to-
 * open gesture must not be hijacked into a drag-to-dismiss. The
 * `getDragPermission` helper returns `allow: false` when
 * `timeSinceOpenMs < POST_OPEN_GRACE_MS`.
 */
export const POST_OPEN_GRACE_MS = 500

/**
 * Pure drag-permission policy. Wired by `vanilla/dialog.ts#attachListeners`
 * (Phase A): the `pointerdown` handler builds a `DragTargetMetadata`
 * snapshot and forwards it to `getDragPermission`, which decides
 * whether the gesture should start a drag. The policy honors the
 * `data-drawer-no-drag` opt-out, the recent scroll, the highlighted
 * text, the post-open grace period (500 ms), and the scrollable
 * ancestor list.
 */

export interface DragScrollableAncestor {
  scrollHeight: number
  clientHeight: number
  scrollTop: number
  role: string | null
}

export interface DragPermissionResult {
  allow: boolean
  updatePreventedAt: boolean
}

export interface DragTargetMetadata {
  targetTagName: string
  hasNoDragAttribute: boolean
  ancestors: DragScrollableAncestor[]
}

interface ElementLike {
  tagName?: string
  scrollHeight: number
  clientHeight: number
  scrollTop: number
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  closest(selector: string): ElementLike | null
  parentElement: ElementLike | null
}

function isElementLike(target: unknown): target is ElementLike {
  const element = target as Partial<ElementLike> | null

  return Boolean(
    element &&
    typeof element.getAttribute === 'function' &&
    typeof element.hasAttribute === 'function' &&
    typeof element.closest === 'function'
  )
}

export function getDragTargetMetadata(target: EventTarget | null): DragTargetMetadata {
  const targetElement = isElementLike(target) ? target : null
  const ancestors: DragScrollableAncestor[] = []
  let element: ElementLike | null = targetElement

  while (element) {
    ancestors.push({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollTop: element.scrollTop,
      role: element.getAttribute('role')
    })

    element = element.parentElement
  }

  return {
    targetTagName: targetElement?.tagName ?? '',
    hasNoDragAttribute:
      targetElement?.hasAttribute('data-drawer-no-drag') || Boolean(targetElement?.closest('[data-drawer-no-drag]')),
    ancestors
  }
}

export function getDragPermission({
  targetTagName,
  hasNoDragAttribute,
  direction,
  timeSinceOpenMs,
  swipeAmount,
  hasHighlightedText,
  timeSinceLastPreventedMs,
  scrollLockTimeout,
  isDraggingInDirection,
  ancestors
}: {
  targetTagName: string
  hasNoDragAttribute: boolean
  direction: CommonDrawerDirection
  timeSinceOpenMs: number | null
  swipeAmount: number | null
  hasHighlightedText: boolean
  timeSinceLastPreventedMs: number | null
  scrollLockTimeout: number
  isDraggingInDirection: boolean
  ancestors: DragScrollableAncestor[]
}): DragPermissionResult {
  if (targetTagName === 'SELECT' || hasNoDragAttribute) {
    return { allow: false, updatePreventedAt: false }
  }

  if (direction === 'left' || direction === 'right') {
    // For horizontal directions the policy used to short-circuit
    // with `allow: true`, which let the drag pipeline start a drag
    // in the WRONG direction (e.g. dragging a `direction: 'right'`
    // drawer to the LEFT). That mirrored a v2 vaul regression that
    // the consumer flagged as "the drawer follows the finger in
    // the opposite of the close direction". v2 only allowed the
    // close-direction swipe; the opposite direction was resisted
    // by the logarithmic dampening in `dampenValue`. Restore the
    // same direction check here so the pointerdown handler bails
    // out before `setPointerCapture` runs, and the wrong-direction
    // gesture falls through to the close-button / form-input
    // listeners instead of starting a drag.
    //
    // The early-out for `swipeAmount === null` (fresh pointerdown,
    // direction not yet known) is preserved so the very first
    // pointer event still starts the drag pipeline. The follow-up
    // `pointermove` (which carries the swipe direction) calls
    // `getDragPermission` again via the run-time check below.
    if (swipeAmount === null) {
      return { allow: true, updatePreventedAt: false }
    }
    const isClosingSwipeOffset =
      direction === 'right' ? swipeAmount < 0 : swipeAmount > 0
    if (isClosingSwipeOffset) {
      return { allow: true, updatePreventedAt: false }
    }
    return { allow: false, updatePreventedAt: false }
  }

  if (timeSinceOpenMs !== null && timeSinceOpenMs < POST_OPEN_GRACE_MS) {
    return { allow: false, updatePreventedAt: false }
  }

  if (swipeAmount !== null) {
    const isClosingSwipeOffset = direction === 'bottom' ? swipeAmount > 0 : swipeAmount < 0
    if (isClosingSwipeOffset) {
      return { allow: true, updatePreventedAt: false }
    }
  }

  if (hasHighlightedText) {
    return { allow: false, updatePreventedAt: false }
  }

  if (timeSinceLastPreventedMs !== null && timeSinceLastPreventedMs < scrollLockTimeout && swipeAmount === 0) {
    return { allow: false, updatePreventedAt: true }
  }

  if (isDraggingInDirection) {
    return { allow: false, updatePreventedAt: true }
  }

  for (const ancestor of ancestors) {
    if (ancestor.scrollHeight > ancestor.clientHeight) {
      if (ancestor.scrollTop !== 0) {
        return { allow: false, updatePreventedAt: true }
      }

      if (ancestor.role === 'dialog') {
        return { allow: true, updatePreventedAt: false }
      }
    }
  }

  return { allow: true, updatePreventedAt: false }
}
