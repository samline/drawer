import type { CommonDrawerDirection } from '../core'
import { TRANSITIONS, NESTED_DISPLACEMENT } from '../constants'
import { getNestedDragTransform, getNestedDrawerTransform } from './transforms'

/**
 * Nested-drawer parent transform. The parent draws smaller and shifts
 * when a child drawer opens. Wired by `runtime/registry.ts`
 * (`syncParentNestedTransform`) which calls `set()` on the parent
 * element. Pure math lives here.
 */

export function getParentNestedVisualState({
  direction,
  viewportSize,
  hasOpenChild,
  percentageDragged,
  displacement = NESTED_DISPLACEMENT
}: {
  direction: CommonDrawerDirection
  viewportSize: number
  hasOpenChild: boolean
  percentageDragged?: number
  displacement?: number
}) {
  if (typeof percentageDragged === 'number' && hasOpenChild) {
    const { transform } = getNestedDragTransform({
      direction,
      viewportSize,
      displacement,
      percentageDragged
    })

    return {
      transform,
      transition: 'none'
    }
  }

  const { transform } = getNestedDrawerTransform({
    direction,
    isOpen: hasOpenChild,
    viewportSize,
    displacement
  })

  return {
    transform,
    transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
  }
}
