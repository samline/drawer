import type { CommonDrawerDirection } from '../core';

export interface DragScrollableAncestor {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
  role: string | null;
}

export interface DragPermissionResult {
  allow: boolean;
  updatePreventedAt: boolean;
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
  ancestors,
}: {
  targetTagName: string;
  hasNoDragAttribute: boolean;
  direction: CommonDrawerDirection;
  timeSinceOpenMs: number | null;
  swipeAmount: number | null;
  hasHighlightedText: boolean;
  timeSinceLastPreventedMs: number | null;
  scrollLockTimeout: number;
  isDraggingInDirection: boolean;
  ancestors: DragScrollableAncestor[];
}): DragPermissionResult {
  if (targetTagName === 'SELECT' || hasNoDragAttribute) {
    return { allow: false, updatePreventedAt: false };
  }

  if (direction === 'left' || direction === 'right') {
    return { allow: true, updatePreventedAt: false };
  }

  if (timeSinceOpenMs !== null && timeSinceOpenMs < 500) {
    return { allow: false, updatePreventedAt: false };
  }

  if (swipeAmount !== null) {
    const isClosingSwipeOffset = direction === 'bottom' ? swipeAmount > 0 : swipeAmount < 0;
    if (isClosingSwipeOffset) {
      return { allow: true, updatePreventedAt: false };
    }
  }

  if (hasHighlightedText) {
    return { allow: false, updatePreventedAt: false };
  }

  if (timeSinceLastPreventedMs !== null && timeSinceLastPreventedMs < scrollLockTimeout && swipeAmount === 0) {
    return { allow: false, updatePreventedAt: true };
  }

  if (isDraggingInDirection) {
    return { allow: false, updatePreventedAt: true };
  }

  for (const ancestor of ancestors) {
    if (ancestor.scrollHeight > ancestor.clientHeight) {
      if (ancestor.scrollTop !== 0) {
        return { allow: false, updatePreventedAt: true };
      }

      if (ancestor.role === 'dialog') {
        return { allow: true, updatePreventedAt: false };
      }
    }
  }

  return { allow: true, updatePreventedAt: false };
}