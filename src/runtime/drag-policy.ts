import type { CommonDrawerDirection } from '../core'

/**
 * Pure drag-permission policy. The vanilla dialog does not yet wire
 * this — see the placeholder at the end of
 * `vanilla/dialog.ts#attachListeners`. The helpers decide whether
 * the pointerdown target should start a drag, taking into account
 * the data-drawer-no-drag opt-out, the recent scroll, and the
 * scrollable ancestors.
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
    return { allow: true, updatePreventedAt: false }
  }

  if (timeSinceOpenMs !== null && timeSinceOpenMs < 500) {
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
