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

export function getDragTargetMetadata(target: EventTarget | null, boundary?: EventTarget | null): DragTargetMetadata {
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

    if (element === (boundary as unknown as ElementLike)) break

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

  if (timeSinceOpenMs !== null && timeSinceOpenMs < POST_OPEN_GRACE_MS) {
    return { allow: false, updatePreventedAt: false }
  }

  if (swipeAmount !== null) {
    const isClosingSwipeOffset = direction === 'bottom' || direction === 'right' ? swipeAmount > 0 : swipeAmount < 0
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
