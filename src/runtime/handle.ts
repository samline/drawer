import type { CommonDrawerSnapPoint } from '../core'

/**
 * Pure handle-cycle math. Wired by `vanilla/dialog.ts#mountVanillaDialog`
 * (Phase D): the built-in `[data-drawer-handle]` renders a drag
 * affordance; clicking it advances to the next snap point (or closes
 * the drawer at the last snap when `dismissible: true`). `preventCycle`
 * disables the click-to-cycle while keeping the handle draggable.
 */

export function getNextHandleState({
  isDragging,
  preventCycle,
  shouldCancelInteraction,
  snapPoints,
  activeSnapPoint,
  dismissible
}: {
  isDragging: boolean
  preventCycle: boolean
  shouldCancelInteraction: boolean
  snapPoints?: CommonDrawerSnapPoint[]
  activeSnapPoint?: CommonDrawerSnapPoint | null
  dismissible: boolean
}) {
  if (isDragging || preventCycle || shouldCancelInteraction) {
    return { type: 'noop' as const }
  }

  if (!snapPoints || snapPoints.length === 0) {
    return dismissible ? { type: 'noop' as const } : { type: 'close' as const }
  }

  const isLastSnapPoint = activeSnapPoint === snapPoints[snapPoints.length - 1]
  if (isLastSnapPoint && dismissible) {
    return { type: 'close' as const }
  }

  const currentSnapIndex = snapPoints.findIndex((point) => point === activeSnapPoint)
  if (currentSnapIndex === -1) {
    return { type: 'noop' as const }
  }

  return {
    type: 'snap' as const,
    snapPoint: snapPoints[currentSnapIndex + 1] ?? null
  }
}
