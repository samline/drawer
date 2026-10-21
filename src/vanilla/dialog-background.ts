import type { CommonDrawerDirection } from '../core'
import { TRANSITIONS, WINDOW_TOP_OFFSET } from '../constants'
import { set } from '../helpers'
import { getBackgroundDragState, getBackgroundResetState, getScaleTranslateTransform } from '../runtime/transforms'

export interface BackgroundScaleState {
  backgroundScale: BackgroundScaleOwner | null
  pendingBackgroundScaleGroup: BackgroundScaleGroup | null
}

interface BackgroundScaleGroup {
  wrapper: HTMLElement
  wrapperCssText: string
  wrapperBackgroundColor: string
  wrapperBackgroundColorPriority: string
  owners: BackgroundScaleOwner[]
  clearTimeout: ReturnType<typeof setTimeout> | null
  closingSetBodyBackground: boolean
  pendingStates: Set<BackgroundScaleState>
}

interface BackgroundScaleOwner {
  state: BackgroundScaleState
  group: BackgroundScaleGroup
  baseScale: number
  direction: CommonDrawerDirection
  setBodyBackground: boolean
  openOrder: number
}

const WRAPPER_SELECTOR = '[data-drawer-wrapper]'

export function getWrapperElement(): HTMLElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null
  return document.querySelector(WRAPPER_SELECTOR)
}

function computeBaseScale(): number {
  if (typeof window === 'undefined') return 1
  // 1:1 with vaul upstream — `useScaleBackground#getScale()` always
  // uses `innerWidth` and `WINDOW_TOP_OFFSET` (= 26), regardless of
  // direction. The translate is per-direction; the scale itself is
  // a uniform page-background shrink. The previous implementation
  // used `NESTED_DISPLACEMENT` (= 16) and switched axes per
  // direction, which was wrong on both counts (audit G4).
  if (window.innerWidth <= 0) return 1
  return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth
}

function getTransformOrigin(direction: CommonDrawerDirection): string {
  return direction === 'top' || direction === 'bottom' ? 'top' : 'left'
}

/**
 * Apply the drag-state transform to the wrapper. The drag pipeline
 * calls this on every `pointermove` (after the content transform is
 * written). `transition: 'none'` is explicit so the inline transform
 * change is instant — the CSS transition is only enabled on release
 * when the wrapper animates back to its rest / cleared state.
 */
export function applyWrapperDragState({
  wrapper,
  baseScale,
  percentageDragged,
  direction,
  setBackgroundColorOnScale
}: {
  wrapper: HTMLElement
  baseScale: number
  percentageDragged: number
  direction: CommonDrawerDirection
  setBackgroundColorOnScale: boolean
}) {
  const { scaleValue, borderRadiusValue, translateValue } = getBackgroundDragState({
    baseScale,
    percentageDragged
  })
  const transform = getScaleTranslateTransform({
    direction,
    scale: scaleValue,
    translate: `${translateValue}px`
  })
  set(wrapper, {
    transform,
    borderRadius: `${borderRadiusValue}px`,
    overflow: 'hidden',
    transformOrigin: getTransformOrigin(direction),
    transition: 'none',
    // `setBackgroundColorOnScale` overlays a translucent black
    // backdrop during drag. The value scales linearly with drag
    // progress so the user feels the page "dimming" as the drawer
    // opens. Cleared on release.
    ...(setBackgroundColorOnScale ? { backgroundColor: `rgba(0, 0, 0, ${percentageDragged * 0.5})` } : {})
  })
}

/**
 * Apply the open-state wrapper transform. Used on the reset / new-snap
 * release path and on close release (followed by a deferred clear).
 * The CSS transition properties are written so the browser animates
 * the property change from the drag state to this rest state.
 */
function applyWrapperOpenState({
  wrapper,
  direction,
  baseScale
}: {
  wrapper: HTMLElement
  direction: CommonDrawerDirection
  baseScale: number
}) {
  const resetState = getBackgroundResetState({ direction, baseScale })
  set(wrapper, {
    ...resetState,
    transitionProperty: 'transform, border-radius',
    transitionDuration: `${TRANSITIONS.DURATION}s`,
    transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`
  })
}

function applyWrapperClosedState(wrapper: HTMLElement) {
  set(wrapper, {
    transform: 'none',
    borderRadius: '0px',
    transitionProperty: 'transform, border-radius',
    transitionDuration: `${TRANSITIONS.DURATION}s`,
    transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`
  })
}

const backgroundScaleGroups = new Map<HTMLElement, BackgroundScaleGroup>()
let backgroundScaleBodySnapshot: { value: string; priority: string } | null = null

function restoreStyleProperty(element: HTMLElement, property: string, value: string, priority: string) {
  if (value) element.style.setProperty(property, value, priority)
  else element.style.removeProperty(property)
}

export function applyBackgroundScaleOpen(owner: BackgroundScaleOwner) {
  applyWrapperOpenState({
    wrapper: owner.group.wrapper,
    direction: owner.direction,
    baseScale: owner.baseScale
  })
  restoreStyleProperty(
    owner.group.wrapper,
    'background-color',
    owner.group.wrapperBackgroundColor,
    owner.group.wrapperBackgroundColorPriority
  )
}

function clearPendingBackgroundScaleStates(group: BackgroundScaleGroup) {
  for (const pendingState of group.pendingStates) {
    if (pendingState.pendingBackgroundScaleGroup === group) {
      pendingState.pendingBackgroundScaleGroup = null
    }
  }
  group.pendingStates.clear()
}

function updateBackgroundScaleBody() {
  const groups = Array.from(backgroundScaleGroups.values())
  const shouldSetBackground = groups.some(
    (group) =>
      group.owners.some((owner) => owner.setBodyBackground) ||
      (group.clearTimeout !== null && group.closingSetBodyBackground)
  )
  if (shouldSetBackground) {
    document.body.style.setProperty('background-color', 'black')
  } else if (backgroundScaleBodySnapshot) {
    restoreStyleProperty(
      document.body,
      'background-color',
      backgroundScaleBodySnapshot.value,
      backgroundScaleBodySnapshot.priority
    )
  }
  if (groups.length === 0) backgroundScaleBodySnapshot = null
}

export function restoreBackgroundScaleGroup(group: BackgroundScaleGroup) {
  if (group.owners.length > 0) return
  if (backgroundScaleGroups.get(group.wrapper) !== group) {
    clearPendingBackgroundScaleStates(group)
    return
  }
  if (group.clearTimeout !== null) clearTimeout(group.clearTimeout)
  group.clearTimeout = null
  group.wrapper.style.cssText = group.wrapperCssText
  clearPendingBackgroundScaleStates(group)
  backgroundScaleGroups.delete(group.wrapper)
  updateBackgroundScaleBody()
}

export function acquireBackgroundScale(
  state: BackgroundScaleState,
  wrapper: HTMLElement,
  direction: CommonDrawerDirection,
  setBodyBackground: boolean,
  openOrder: number
) {
  const stalePendingGroup = state.pendingBackgroundScaleGroup
  if (stalePendingGroup && stalePendingGroup !== backgroundScaleGroups.get(wrapper)) {
    state.pendingBackgroundScaleGroup = null
  }
  let group = backgroundScaleGroups.get(wrapper)
  if (!group) {
    if (!backgroundScaleBodySnapshot) {
      backgroundScaleBodySnapshot = {
        value: document.body.style.getPropertyValue('background-color'),
        priority: document.body.style.getPropertyPriority('background-color')
      }
    }
    group = {
      wrapper,
      wrapperCssText: wrapper.style.cssText,
      wrapperBackgroundColor: wrapper.style.getPropertyValue('background-color'),
      wrapperBackgroundColorPriority: wrapper.style.getPropertyPriority('background-color'),
      owners: [],
      clearTimeout: null,
      closingSetBodyBackground: false,
      pendingStates: new Set()
    }
    backgroundScaleGroups.set(wrapper, group)
  }
  if (group.clearTimeout !== null) {
    clearTimeout(group.clearTimeout)
    group.clearTimeout = null
  }
  clearPendingBackgroundScaleStates(group)
  group.closingSetBodyBackground = false
  const owner: BackgroundScaleOwner = {
    state,
    group,
    baseScale: computeBaseScale(),
    direction,
    setBodyBackground,
    openOrder
  }
  const insertionIndex = group.owners.findIndex((candidate) => candidate.openOrder > openOrder)
  if (insertionIndex === -1) group.owners.push(owner)
  else group.owners.splice(insertionIndex, 0, owner)
  state.backgroundScale = owner
  applyBackgroundScaleOpen(group.owners[group.owners.length - 1] as BackgroundScaleOwner)
  updateBackgroundScaleBody()
}

export function isActiveBackgroundScaleOwner(owner: BackgroundScaleOwner) {
  return owner.group.owners[owner.group.owners.length - 1] === owner
}

export function releaseBackgroundScale(state: BackgroundScaleState, animate: boolean) {
  const owner = state.backgroundScale
  if (!owner) return
  state.backgroundScale = null
  const { group } = owner
  const ownerIndex = group.owners.indexOf(owner)
  if (ownerIndex !== -1) group.owners.splice(ownerIndex, 1)

  const nextOwner = group.owners[group.owners.length - 1]
  if (nextOwner) {
    applyBackgroundScaleOpen(nextOwner)
    updateBackgroundScaleBody()
    return
  }

  if (!animate || !group.wrapper.isConnected) {
    restoreBackgroundScaleGroup(group)
    return
  }

  applyWrapperClosedState(group.wrapper)
  state.pendingBackgroundScaleGroup = group
  group.pendingStates.add(state)
  group.closingSetBodyBackground = owner.setBodyBackground
  updateBackgroundScaleBody()
  group.clearTimeout = setTimeout(() => {
    group.clearTimeout = null
    restoreBackgroundScaleGroup(group)
  }, TRANSITIONS.DURATION * 1000)
}

export function restoreBackgroundScale(state: BackgroundScaleState) {
  releaseBackgroundScale(state, false)
  const pendingGroup = state.pendingBackgroundScaleGroup
  state.pendingBackgroundScaleGroup = null
  if (pendingGroup) restoreBackgroundScaleGroup(pendingGroup)
}
