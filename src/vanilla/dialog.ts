// Vanilla dialog primitives. Direct DOM manipulation — no framework
// runtime, no virtual DOM, no peer dependencies. The runtime registry
// owns the controller state and delegates side effects (focus, body
// scroll lock, ARIA, animations) to this module through a small
// callback surface.
//
// The CSS contract: every element the stylesheet reads uses a
// `data-drawer*` attribute. The dialog module is the only place that
// knows about those attributes; the rest of the package uses
// `data-drawer` as an opaque marker.
//
// What this module owns:
//   - Lazy overlay/content presence inside each registry-owned host.
//   - The optional built-in trigger, handle, and close button.
//   - Focus, Escape, backdrop dismissal, ARIA, and viewport behavior.
//   - Pointer gestures and their visual drag/snap/scale effects.
//   - Acquisition and release of shared page-level side effects.
//
// The controller and pure interaction math remain in `core/` and
// `runtime/`; this module applies their results to the DOM.

import type { CommonDrawerDirection, CommonDrawerSnapPoint } from '../core'
import {
  CLOSE_THRESHOLD,
  DRAG_CLASS,
  SCROLL_LOCK_TIMEOUT,
  TRANSITIONS,
  VELOCITY_THRESHOLD,
  WINDOW_TOP_OFFSET
} from '../constants'
import { isVertical, set } from '../helpers'
import { getDraggableOffset, getDraggedDistance, getDragPercentage } from '../runtime/drag'
import { getDragPermission, getDragTargetMetadata, type DragTargetMetadata } from '../runtime/drag-policy'
import { getNextHandleState } from '../runtime/handle'
import { getSwipeIntent } from '../runtime/pointer'
import { getDismissibleReleaseResult, getSnapPointReleaseAction } from '../runtime/release'
import {
  getActiveSnapPointIndex,
  getShouldFade,
  getSnapDragValue,
  getSnapPointOffset,
  getSnapPointPercentageDragged,
  getSnapPointsOffset
} from '../runtime/snap-points'
import {
  getAxisAwareTranslate,
  getBackgroundDragState,
  getBackgroundResetState,
  getScaleTranslateTransform,
  getTranslate
} from '../runtime/transforms'
import { getViewportDrivenDrawerLayout } from '../runtime/viewport'
import {
  lockDocumentScrollBehavior,
  lockScrollRestoration,
  preventBodyScroll,
  setPositionFixed
} from '../runtime/scroll-lock'
import type { VanillaCloseButtonOptions, VanillaDrawerOptions, VanillaRenderable } from './render'

/**
 * Minimum attributes a synthetic `Event` must expose for the drag
 * pipeline. Real `PointerEvent` instances satisfy this in browsers;
 * the integration tests in `test/drag-pipeline-integration.test.ts`
 * construct a plain `Event` and attach the geometry fields via
 * `Object.assign` because jsdom does not implement `PointerEvent`.
 */
interface DragPointerEvent extends Event {
  clientX: number
  clientY: number
  pointerId: number
  pointerType?: string
  button?: number
  relatedTarget?: EventTarget | null
  currentTarget: HTMLElement
  target: EventTarget | null
}

const VISUALLY_HIDDEN_STYLE = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0'
} as const

export interface VanillaDialogOptions {
  host: HTMLElement
  id: string
  options: VanillaDrawerOptions
  open: boolean
  openOrder?: number | null
  /** Whether the drawer completed an earlier open render. */
  hasBeenOpened?: boolean
  onBuiltInTriggerMouseDown?: () => void
  onBuiltInTriggerClick?: () => void
  onOpenChange: (open: boolean) => void
  onDragChange?: (percentageDragged: number) => void
  onReleaseChange?: (open: boolean) => void
  onActiveSnapPointChange?: (snapPoint: CommonDrawerSnapPoint | null) => void
}

/**
 * Per-host drag state. Captured at `pointerdown`, mutated by
 * `pointermove`, and discarded at `pointerup`. Mirrors the `useRef`
 * cluster in the original React component.
 *
 * Phase B uses the snap-point fields when `options.snapPoints` is set:
 * `activeSnapPointOffset` is the runtime offset of the active snap at
 * `pointerdown` time, `activeSnapPointIndex` and `snapPointsOffset`
 * are pre-computed for `getSnapPointReleaseAction`, and `shouldFade`
 * is the `getShouldFade` result for the fade-overlay pipeline.
 */
interface DragState {
  pointerStart: { x: number; y: number }
  pointerStartTimeStamp: number
  startedAt: number
  draggedDistance: number
  isDraggingDown: boolean
  snapPointOffset: number
  lastTimeDragPrevented: number
  pointerId: number
  /**
   * G5: 1:1 with vaul upstream — the drawer's actual rendered
   * dimensions (height for vertical directions, width for
   * horizontal). Captured at `pointerdown` time via
   * `getBoundingClientRect()` and reused across the entire
   * drag. Used as the denominator for `percentageDragged` and
   * the close-threshold check (vaul: `index.tsx:213-214, 266-267`).
   * Without this, non-full-height drawers (e.g. `height: 300px`
   * or `fixed: true` with a constrained height) would calculate
   * the drag-to-close threshold against the viewport instead of
   * the actual drawer, breaking the gesture.
   */
  drawerHeight: number
  drawerWidth: number
  // Phase B: snap-point context. `null` when no snap points are
  // configured; otherwise the values captured at `pointerdown` and
  // reused across the entire drag.
  activeSnapPointOffset: number | null
  activeSnapPointIndex: number | null
  snapPointsOffset: number[]
  shouldFade: boolean
  lastPointerEvent: DragPointerEvent | null
  reachedIntentBoundary: boolean
  isAllowed: boolean
}

interface BackgroundScaleGroup {
  wrapper: HTMLElement
  wrapperCssText: string
  wrapperBackgroundColor: string
  wrapperBackgroundColorPriority: string
  owners: BackgroundScaleOwner[]
  clearTimeout: ReturnType<typeof setTimeout> | null
  closingSetBodyBackground: boolean
  pendingStates: Set<DialogMountState>
}

interface BackgroundScaleOwner {
  state: DialogMountState
  group: BackgroundScaleGroup
  baseScale: number
  direction: CommonDrawerDirection
  setBodyBackground: boolean
  openOrder: number
}

/**
 * Per-host dialog mount state. The host element is reused across
 * `mountVanillaDialog` calls (state changes call it again with the
 * same host); we keep the active overlay / content / trigger
 * references here so we can update them in place instead of
 * rebuilding the tree on every state change.
 */
interface DialogMountState {
  trigger: HTMLButtonElement | null
  cleanupBuiltInTrigger: (() => void) | null
  overlay: HTMLDivElement | null
  content: HTMLDivElement | null
  handle: HTMLDivElement | null
  title: HTMLDivElement | null
  description: HTMLDivElement | null
  body: HTMLDivElement | null
  /**
   * Built-in close button. Set when `options.closeButton` is truthy
   * and the mount has built the button. `teardownMount` removes it
   * (and the listener it carries) on the next mount. Held here
   * separately from the body / title so the close button's
   * lifecycle is independent of the title / description slots.
   */
  closeButton: HTMLButtonElement | null
  previouslyFocused: HTMLElement | null
  cleanups: Array<() => void>
  options: VanillaDrawerOptions
  mountedOptions: VanillaDrawerOptions | null
  openOrder: number
  hasMounted: boolean
  closeRemovalTimer: number | null
  suppressHandleClick: boolean
  lastTimeDragPrevented: number | null
  /**
   * Restore function returned by `preventBodyScroll()`. Called from
   * `teardownMount` to undo the body-scroll lock. `null` when the
   * drawer was not modal (no lock was applied) or the dialog was
   * not opened yet. Replaces the older `bodyOverflowBackup` /
   * `bodyPaddingRightBackup` pair which only handled desktop
   * browsers. The current pipeline also handles iOS Safari and
   * concurrent owners.
   */
  unlockBodyScroll: (() => void) | null
  restoreBodyPosition: (() => void) | null
  restoreScrollBehavior: (() => void) | null
  openedAt: number | null
  drag: DragState | null
  cleanupDragGesture: (() => void) | null
  // Phase C: background-scale pipeline. `baseScale` is captured at
  // open time so the drag/release math has a single source of truth
  // for the rest-state scale. `clearTimeout` is the pending handle
  // for the `TRANSITIONS.DURATION` deferred clear after a close
  // release; we cancel it on teardown to avoid touching a wrapper
  // that no longer belongs to this drawer.
  backgroundScale: BackgroundScaleOwner | null
  pendingBackgroundScaleGroup: BackgroundScaleGroup | null
  // Phase E: viewport / mobile-keyboard pipeline. The
  // `getViewportDrivenDrawerLayout` helper is stateful (it tracks
  // the diff from the initial layout to detect when the mobile
  // keyboard toggles open/closed). The dialog caches the previous
  // values here so the math stays stable across viewport resizes.
  // `activeSnapPointOffset` is also cached so the snap-aware
  // branches of the layout helper see the current snap on every
  // resize (the registry re-renders on `setActiveSnapPoint`, which
  // re-attaches the listener with fresh options).
  keyboardIsOpen: boolean
  previousDiffFromInitial: number
  initialDrawerHeight: number
  activeSnapPointOffset: number
  // Phase E: `history.scrollRestoration` backup. Set to the prior
  // value when `preventScrollRestoration: true` flips it to
  // `'manual'`; cleared in `teardownMount` after restoring. `null`
  // when the dialog never changed the value (e.g. it was already
  // `'manual'` at mount time, or `preventScrollRestoration` is off).
  restoreScrollRestoration: (() => void) | null
  /**
   * G11: `justReleased` ref + timer. Set to `true` in `onPointerUp`
   * when `velocity > 0.05` (high-velocity release). Used by the
   * `preventBodyScroll` gate (G3) to release the body-scroll lock
   * for 200 ms after a fast drag-release, so the next focus event
   * (on an input inside the drawer) does not fight the lock. Reset
   * to `false` after `JUST_RELEASED_TIMEOUT` ms via the stored
   * timer handle (cancelled on teardown to avoid touching a
   * destroyed state).
   */
  justReleased: boolean
  justReleasedTimer: ReturnType<typeof setTimeout> | null
}

const hostState = new WeakMap<HTMLElement, DialogMountState>()
const openDialogStack: DialogMountState[] = []
const handledEscapeEvents = new WeakSet<Event>()
let fallbackOpenOrder = 0

function removeFromOpenDialogStack(state: DialogMountState) {
  const index = openDialogStack.indexOf(state)
  if (index !== -1) openDialogStack.splice(index, 1)
}

function registerOpenDialog(state: DialogMountState, openOrder?: number | null) {
  removeFromOpenDialogStack(state)
  state.openOrder = openOrder ?? ++fallbackOpenOrder
  const insertionIndex = openDialogStack.findIndex((candidate) => candidate.openOrder > state.openOrder)
  if (insertionIndex === -1) openDialogStack.push(state)
  else openDialogStack.splice(insertionIndex, 0, state)
}

function getHostState(host: HTMLElement): DialogMountState {
  let state = hostState.get(host)
  if (!state) {
    state = {
      trigger: null,
      cleanupBuiltInTrigger: null,
      overlay: null,
      content: null,
      handle: null,
      title: null,
      description: null,
      body: null,
      closeButton: null,
      previouslyFocused: null,
      cleanups: [],
      options: {},
      mountedOptions: null,
      openOrder: 0,
      hasMounted: false,
      closeRemovalTimer: null,
      suppressHandleClick: false,
      lastTimeDragPrevented: null,
      unlockBodyScroll: null,
      restoreBodyPosition: null,
      restoreScrollBehavior: null,
      openedAt: null,
      drag: null,
      cleanupDragGesture: null,
      backgroundScale: null,
      pendingBackgroundScaleGroup: null,
      keyboardIsOpen: false,
      previousDiffFromInitial: 0,
      initialDrawerHeight: 0,
      activeSnapPointOffset: 0,
      restoreScrollRestoration: null,
      justReleased: false,
      justReleasedTimer: null
    }
    hostState.set(host, state)
  }
  return state
}

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

type DialogCallbacks = {
  onOpenChange: VanillaDialogOptions['onOpenChange']
  onBuiltInTriggerMouseDown?: () => void
  onBuiltInTriggerClick?: () => void
  onDragChange?: (percentageDragged: number) => void
  onReleaseChange?: (open: boolean) => void
  onActiveSnapPointChange?: (snapPoint: CommonDrawerSnapPoint | null) => void
}

const IN_PLACE_OPTION_KEYS = new Set<keyof VanillaDrawerOptions>([
  'activeSnapPoint',
  'open',
  'onOpenChange',
  'onClose',
  'onAnimationEnd',
  'onActiveSnapPointChange',
  'onDragChange',
  'onReleaseChange'
])

function canUpdateOpenMount(previous: VanillaDrawerOptions | null, next: VanillaDrawerOptions): boolean {
  if (!previous) return false
  const keys = new Set<keyof VanillaDrawerOptions>([
    ...(Object.keys(previous) as Array<keyof VanillaDrawerOptions>),
    ...(Object.keys(next) as Array<keyof VanillaDrawerOptions>)
  ])
  for (const key of keys) {
    if (IN_PLACE_OPTION_KEYS.has(key)) continue
    if (!Object.is(previous[key], next[key])) return false
  }
  return true
}

function cancelCloseRemoval(state: DialogMountState) {
  if (state.closeRemovalTimer !== null) {
    clearTimeout(state.closeRemovalTimer)
    state.closeRemovalTimer = null
  }
}

function attachBuiltInTrigger(
  state: DialogMountState,
  host: HTMLElement,
  options: VanillaDrawerOptions,
  callbacks: DialogCallbacks
) {
  state.cleanupBuiltInTrigger?.()
  state.cleanupBuiltInTrigger = null
  if (!options.triggerText) {
    state.trigger?.remove()
    state.trigger = null
    return
  }
  let trigger = state.trigger
  if (!trigger) {
    trigger = createEl('button', {
      type: 'button',
      'data-drawer-vanilla-trigger': ''
    })
    host.appendChild(trigger)
    state.trigger = trigger
  }
  trigger.textContent = options.triggerText

  const onMouseDown = (event: MouseEvent) => {
    if (options.modal === false || options.autoFocus) return
    event.preventDefault()
    trigger?.blur()
    callbacks.onBuiltInTriggerMouseDown?.()
  }
  const onClick = () => {
    trigger?.blur()
    callbacks.onBuiltInTriggerClick?.()
    callbacks.onOpenChange(true)
  }
  trigger.addEventListener('mousedown', onMouseDown)
  trigger.addEventListener('click', onClick)
  state.cleanupBuiltInTrigger = () => {
    trigger?.removeEventListener('mousedown', onMouseDown)
    trigger?.removeEventListener('click', onClick)
  }
}

function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | number | boolean | null | undefined>,
  children?: Array<Node | string | null | undefined>
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue
      if (value === true) element.setAttribute(name, '')
      else element.setAttribute(name, String(value))
    }
  }
  if (children) {
    for (const child of children) {
      if (child === null || child === undefined) continue
      if (typeof child === 'string') element.appendChild(document.createTextNode(child))
      else element.appendChild(child)
    }
  }
  return element
}

function setStyle(element: HTMLElement, styles: Record<string, string>) {
  for (const [key, value] of Object.entries(styles)) {
    element.style.setProperty(key, value)
  }
}

/**
 * Phase C: background-scale pipeline helpers.
 *
 * The page wrapper (the element with `data-drawer-wrapper`) gets a
 * `transform: scale + translate` + `border-radius` + `overflow: hidden`
 * write during drag, a `reset state` (open-rest) write on release
 * that the CSS transition carries back to NORMAL, and a deferred
 * `setTimeout(clear, TRANSITIONS.DURATION * 1000)` that strips the
 * inline styles so the consumer's CSS takes over.
 *
 * The wrapper selector is hard-coded to `data-drawer-wrapper` in
 * Phase C. A custom selector is a follow-up.
 */

const WRAPPER_SELECTOR = '[data-drawer-wrapper]'

function getWrapperElement(): HTMLElement | null {
  if (!canUseDOM()) return null
  return document.querySelector(WRAPPER_SELECTOR)
}

function computeBaseScale(direction: CommonDrawerDirection): number {
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
function applyWrapperDragState({
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

function applyBackgroundScaleOpen(owner: BackgroundScaleOwner) {
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

function restoreBackgroundScaleGroup(group: BackgroundScaleGroup) {
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

function acquireBackgroundScale(
  state: DialogMountState,
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
    baseScale: computeBaseScale(direction),
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

function isActiveBackgroundScaleOwner(owner: BackgroundScaleOwner) {
  return owner.group.owners[owner.group.owners.length - 1] === owner
}

function releaseBackgroundScale(state: DialogMountState, animate: boolean) {
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

function restoreBackgroundScale(state: DialogMountState) {
  releaseBackgroundScale(state, false)
  const pendingGroup = state.pendingBackgroundScaleGroup
  state.pendingBackgroundScaleGroup = null
  if (pendingGroup) restoreBackgroundScaleGroup(pendingGroup)
}

/**
 * Resolve the value of a `VanillaRenderable` into either text, a
 * pre-built element, or a fresh container `<div>` that the caller
 * can mount custom content into.
 */
function resolveRenderable(value: VanillaRenderable | undefined): {
  text?: string
  element?: HTMLElement
  container?: HTMLDivElement
} {
  if (value === null || value === undefined) return {}
  if (typeof value === 'string' || typeof value === 'number') {
    return { text: String(value) }
  }
  if (typeof value === 'function') {
    const produced = value()
    if (produced instanceof HTMLElement) return { element: produced }
    return {}
  }
  if (value instanceof HTMLElement) return { element: value }
  return {}
}

function findElementByIdInSubtree(root: HTMLElement | null, elementId?: string): Element | null {
  if (!root || !elementId) return null
  if (root.id === elementId) return root

  for (const candidate of root.querySelectorAll('[id]')) {
    if (candidate.id === elementId) return candidate
  }

  return null
}

function getDirection(options: VanillaDrawerOptions): CommonDrawerDirection {
  return (options.direction ?? 'bottom') as CommonDrawerDirection
}

function getClosedTransform(direction: CommonDrawerDirection) {
  if (direction === 'bottom') return 'translate3d(0, 100%, 0)'
  if (direction === 'top') return 'translate3d(0, -100%, 0)'
  if (direction === 'right') return 'translate3d(100%, 0, 0)'
  return 'translate3d(-100%, 0, 0)'
}

function getSnapPoints(options: VanillaDrawerOptions): CommonDrawerSnapPoint[] | undefined {
  return options.snapPoints
}

function getActiveSnapPoint(options: VanillaDrawerOptions): CommonDrawerSnapPoint | null {
  return options.activeSnapPoint ?? options.snapPoints?.[0] ?? null
}

function getFadeFromIndex(options: VanillaDrawerOptions): number | undefined {
  if (options.fadeFromIndex !== undefined) return options.fadeFromIndex
  return options.snapPoints && options.snapPoints.length > 0 ? options.snapPoints.length - 1 : undefined
}

/**
 * Resolve the viewport size to feed the snap-point runtime helpers.
 * Returns `{width: 0, height: 0}` in non-DOM environments (so the
 * helpers degrade to `NaN` offsets, which the dialog treats as
 * "no snap points configured" downstream).
 */
function getContainerSize(container?: HTMLElement | null) {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
  }
  // G3: 1:1 with vaul upstream — when the consumer passes a
  // `container` option, use the container's bounding rect for the
  // snap-point math instead of the viewport. vaul does this in
  // `use-snap-points.ts:75-80`. Without this, a consumer with
  // `container: someInnerDiv` and `snapPoints: [0.5, 0.8]` would
  // get viewport-based snap points in the drawer but
  // container-based in vaul.
  if (container && typeof container.getBoundingClientRect === 'function') {
    const rect = container.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * Invert `getSnapPointOffset` to find the snap-point **value** that
 * produces the given offset. `getSnapPointReleaseAction` returns the
 * matched offset; the dialog needs the original value (string /
 * number) to call `controller.setActiveSnapPoint`.
 *
 * The index lookup is exact because the runtime helper stores offsets
 * as a parallel array — two distinct snap points cannot produce the
 * same offset unless the viewport is degenerate, in which case
 * `findIndex` returns `-1` and we return `null` (the caller should
 * keep the previous active snap).
 */
function findSnapPointByOffset(
  snapPoints: CommonDrawerSnapPoint[] | undefined,
  snapPointsOffset: number[],
  targetOffset: number
): CommonDrawerSnapPoint | null {
  if (!snapPoints) return null
  const index = snapPointsOffset.findIndex((offset) => offset === targetOffset)
  if (index === -1) return null
  return snapPoints[index] ?? null
}

/**
 * Decide whether the overlay should be visible for a given active
 * snap. Mirrors the original React `use-snap-points` logic: the
 * overlay is hidden only when the active snap sits BELOW `fadeFromIndex`
 * AND is not the last snap point. The last snap is always visible
 * because the user has fully expanded the drawer.
 */
function shouldShowSnapOverlay(
  snapPoints: CommonDrawerSnapPoint[] | undefined,
  fadeFromIndex: number | undefined,
  activeSnapPoint: CommonDrawerSnapPoint | null
): boolean {
  if (!snapPoints || snapPoints.length === 0) return true
  if (fadeFromIndex === undefined) return true
  const activeIndex = snapPoints.findIndex((snap) => snap === activeSnapPoint)
  if (activeIndex === -1) return false
  if (activeIndex === snapPoints.length - 1) return true
  return activeIndex >= fadeFromIndex
}

/**
 * Detach listeners and release page-level ownership for a mount.
 * Full teardown also removes its DOM; `deferDom` keeps the closing
 * visual nodes until the exit timeout removes them.
 */
function teardownMount(state: DialogMountState, opts: { deferDom?: boolean } = {}) {
  if (!opts.deferDom) cancelCloseRemoval(state)
  removeFromOpenDialogStack(state)
  // Step 1 — run every cleanup callback registered on the state.
  // This detaches every event listener the mount installed (visualViewport
  // resize, scroll restoration, overlay mouseup, keydown, pointerdown,
  // pointermove, pointerup, handle click, etc.) and clears the
  // cleanup array. After this returns, no listener owned by this
  // dialog will fire on subsequent events.
  for (const cleanup of state.cleanups) cleanup()
  state.cleanups = []
  state.cleanupDragGesture?.()
  state.cleanupDragGesture = null
  state.cleanupBuiltInTrigger?.()
  state.cleanupBuiltInTrigger = null

  // Step 2 — restore the page-level side-effects we own (focus,
  // body scroll lock, history scroll restoration, viewport state).
  if (state.trigger && document.activeElement === state.trigger) {
    if (typeof state.trigger.blur === 'function') state.trigger.blur()
  }
  const otherOpenDrawer = openDialogStack[openDialogStack.length - 1]?.content ?? null
  const activeElementWasClosing = Boolean(
    state.content && document.activeElement instanceof Node && state.content.contains(document.activeElement)
  )
  if (
    state.previouslyFocused &&
    document.contains(state.previouslyFocused) &&
    (!otherOpenDrawer || otherOpenDrawer.contains(state.previouslyFocused))
  ) {
    state.previouslyFocused.focus?.()
  } else if (activeElementWasClosing && otherOpenDrawer) {
    otherOpenDrawer.focus()
  }
  state.previouslyFocused = null
  // F6: invoke the body-scroll restore returned by
  // `preventBodyScroll()`. Handles both the desktop `overflow: hidden`
  // baseline AND the iOS-Safari 6-step workaround. Also flips
  // `position: fixed` off on Safari.
  if (state.unlockBodyScroll) {
    state.unlockBodyScroll()
    state.unlockBodyScroll = null
  }
  state.restoreBodyPosition?.()
  state.restoreBodyPosition = null
  // G8: 1:1 with vaul upstream — the `scrollBehavior` reset
  // happens in the `useEffect` cleanup, which only runs when
  // `isOpen` transitions from `true` to `false` (and on
  // unmount). In the drawer's lifecycle, this corresponds to
  // the close-only path (`isClosingOnly === true`). Running
  // it in `teardownMount` would be wrong because teardown
  // also runs on every re-render (e.g. `setOpen(true)` from a
  // closed state), which would reset the scrollBehavior before
  // the new `set` runs. The `set` (G5) is gated by
  // `if (open && ...)` so it only writes on the open path.
  state.restoreScrollBehavior?.()
  state.restoreScrollBehavior = null
  state.restoreScrollRestoration?.()
  state.restoreScrollRestoration = null
  state.keyboardIsOpen = false
  state.previousDiffFromInitial = 0
  state.initialDrawerHeight = 0
  state.activeSnapPointOffset = 0
  state.drag = null
  state.openedAt = null
  state.suppressHandleClick = false
  // G11: clear the `justReleased` state on every teardown so a
  // destroy → reopen sequence doesn't carry a stale flag from
  // the destroyed drawer.
  state.justReleased = false
  if (state.justReleasedTimer !== null) {
    clearTimeout(state.justReleasedTimer)
    state.justReleasedTimer = null
  }

  // Step 3 — remove the DOM on a full teardown. The close-only path
  // keeps it mounted for the exit animation.
  if (opts.deferDom) return
  restoreBackgroundScale(state)
  if (state.trigger?.parentNode) state.trigger.parentNode.removeChild(state.trigger)
  if (state.overlay?.parentNode) state.overlay.parentNode.removeChild(state.overlay)
  if (state.content?.parentNode) state.content.parentNode.removeChild(state.content)
  state.trigger = null
  state.overlay = null
  state.content = null
  state.handle = null
  state.title = null
  state.description = null
  state.body = null
  state.closeButton = null
  state.mountedOptions = null
}

function buildTitleContent(
  state: DialogMountState,
  options: VanillaDrawerOptions,
  resolvedContent: HTMLElement | undefined
) {
  if (!state.title) return
  const title = state.title
  title.innerHTML = ''

  const hasCustomTitle = findElementByIdInSubtree(resolvedContent ?? null, options.ariaLabelledBy) !== null

  const showTitle = options.title !== undefined
  const showDescription = options.description !== undefined
  const showProxyTitle = !showTitle && !hasCustomTitle && Boolean(options.ariaLabel)

  // Title
  if (showProxyTitle) {
    const proxy = options.ariaLabel ?? ''
    title.appendChild(document.createTextNode(proxy))
  }
  if (showTitle) {
    const resolved = resolveRenderable(options.title)
    if (resolved.text !== undefined) {
      title.appendChild(document.createTextNode(resolved.text))
    } else if (resolved.element) {
      title.appendChild(resolved.element)
    } else if (resolved.container) {
      title.appendChild(resolved.container)
    }
  }

  // Description
  if (state.description) {
    const desc = state.description
    desc.innerHTML = ''
    if (showDescription) {
      const resolved = resolveRenderable(options.description)
      if (resolved.text !== undefined) {
        desc.appendChild(document.createTextNode(resolved.text))
      } else if (resolved.element) {
        desc.appendChild(resolved.element)
      } else if (resolved.container) {
        desc.appendChild(resolved.container)
      }
    }
  }

  // Visually hidden styles
  //
  // Title slot visibility contract:
  //
  // - The consumer passed an explicit `title` (the visible
  //   case): the slot renders visibly, unless
  //   `titleVisuallyHidden: true` overrides.
  // - The consumer did NOT pass `title` but passed `ariaLabel`
  //   (the proxy case — the title slot is only there for the
  //   `aria-labelledby` reference): the slot is auto-hidden
  //   because proxy titles are accessibility targets, not
  //   visual content. The consumer can opt out with an
  //   explicit `titleVisuallyHidden: false`.
  //
  // See `.agents/recommendations/2026-07-25-auto-hide-title-slot-when-promoted-from-ariaLabel.md`
  // for the full design rationale.
  const isProxyTitle = showProxyTitle && !showTitle
  const shouldHideTitle =
    options.titleVisuallyHidden === true || (isProxyTitle && options.titleVisuallyHidden !== false)
  if (shouldHideTitle) setStyle(title, VISUALLY_HIDDEN_STYLE)
  if (options.descriptionVisuallyHidden && state.description) {
    setStyle(state.description, VISUALLY_HIDDEN_STYLE)
  }
}

/**
 * Resolve `options.closeButton` into a normalized options object,
 * or `false` if the close button is not requested. Centralizes
 * the `boolean | { className, icon, ariaLabel }` contract so the
 * mount path can stay short.
 */
function normalizeCloseButtonOptions(
  options: boolean | VanillaCloseButtonOptions | undefined
): false | { className: string; icon: string | HTMLElement; ariaLabel: string } {
  if (!options) return false
  if (options === true) {
    return { className: 'drawer-close-button', icon: 'xmark', ariaLabel: 'Close' }
  }
  return {
    className: options.className ?? 'drawer-close-button',
    icon: options.icon ?? 'xmark',
    ariaLabel: options.ariaLabel ?? 'Close'
  }
}

/**
 * Build the close button DOM and wire its `click` to
 * `callbacks.onOpenChange(false)`. The button's `click` event
 * `stopPropagation()`s so it does not bubble to the drawer's
 * content (e.g. a form submit handler).
 *
 * Returns the button element. The caller is responsible for
 * appending it to the dialog tree and storing it on
 * `state.closeButton` so `teardownMount` can remove it.
 *
 * The icon is rendered as a `<span aria-hidden="true">` so
 * screen readers only announce the button's `aria-label`.
 */
function buildCloseButton(
  options: { className: string; icon: string | HTMLElement; ariaLabel: string },
  callbacks: { onOpenChange: (open: boolean) => void }
): HTMLButtonElement {
  const button = createEl('button', {
    type: 'button',
    'data-drawer-close': '',
    'aria-label': options.ariaLabel
  }) as HTMLButtonElement
  button.className = options.className
  if (options.icon instanceof HTMLElement) {
    const iconSpan = createEl('span', { 'data-drawer-close-icon': '', 'aria-hidden': 'true' })
    iconSpan.appendChild(options.icon)
    button.appendChild(iconSpan)
  } else {
    button.appendChild(createEl('span', { 'data-drawer-close-icon': '', 'aria-hidden': 'true' }, [options.icon]))
  }
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    callbacks.onOpenChange(false)
  })
  return button
}

function buildBodyContent(
  state: DialogMountState,
  options: VanillaDrawerOptions,
  resolvedContent = resolveRenderable(options.content)
) {
  if (!state.body) return
  const body = state.body
  body.innerHTML = ''
  if (options.content === undefined) return
  if (resolvedContent.text !== undefined) {
    body.appendChild(document.createTextNode(resolvedContent.text))
  } else if (resolvedContent.element) {
    body.appendChild(resolvedContent.element)
  } else if (resolvedContent.container) {
    body.appendChild(resolvedContent.container)
  }
}

function applyOpenState(state: DialogMountState, options: VanillaDrawerOptions, open: boolean) {
  if (state.overlay) {
    state.overlay.dataset.state = open ? 'open' : 'closed'
  }
  if (state.content) {
    state.content.dataset.state = open ? 'open' : 'closed'
  }
  if (state.handle) {
    state.handle.dataset.drawerVisible = open ? 'true' : 'false'
  }
  const direction = getDirection(options)
  if (state.content) state.content.dataset.drawerDirection = direction
  const snapPoints = getSnapPoints(options)
  const activeSnapPoint = getActiveSnapPoint(options)
  const hasSnapPoints = Boolean(snapPoints?.length)
  const fadeFromIndex = getFadeFromIndex(options)
  if (state.overlay) {
    state.overlay.dataset.drawerSnapPoints = open && hasSnapPoints ? 'true' : 'false'
    state.overlay.dataset.drawerSnapPointsOverlay = shouldShowSnapOverlay(snapPoints, fadeFromIndex, activeSnapPoint)
      ? 'true'
      : 'false'
  }
  if (state.content) {
    state.content.dataset.drawerSnapPoints = open && hasSnapPoints ? 'true' : 'false'
    state.content.dataset.drawerDelayedSnapPoints = 'false'
    state.content.dataset.drawerCustomContainer = options.container || options.mountElement ? 'true' : 'false'
  }
  // F4: clear `--initial-transform` on the close path so the
  // `slideToX` keyframe animates to the FULLY closed position
  // (`100%` fallback) rather than the active snap's offset. The
  // open path (handled in the mount block) re-sets it to the
  // snap's runtime offset in pixels.
  if (!open && state.content) {
    state.content.style.removeProperty('--initial-transform')
  }

  // G8: 1:1 with vaul upstream — when the active snap is the
  // LAST snap (the drawer is fully expanded), extend the
  // post-open grace period so a follow-up scroll inside the
  // (now fully-expanded) drawer is not hijacked as a
  // drag-to-close. Mirrors vaul's `onSnapPointChange` callback
  // (`index.tsx:217-220`). Applied on every re-render so the
  // consumer's `setActiveSnapPoint(lastSnap)` and the drag
  // snap-target both trigger the extension.
  if (open && state.content) {
    const snapPoints = getSnapPoints(options)
    const activeSnapPoint = getActiveSnapPoint(options)
    if (snapPoints && snapPoints.length > 0 && activeSnapPoint === snapPoints[snapPoints.length - 1]) {
      state.openedAt = performance.now()
    }
  }
}

function updateOpenSnapState(state: DialogMountState, options: VanillaDrawerOptions) {
  if (!state.content) return
  const snapPoints = getSnapPoints(options)
  const activeSnapPoint = getActiveSnapPoint(options)
  applyOpenState(state, options, true)
  if (!snapPoints || activeSnapPoint === null) return

  const offset = getSnapPointOffset({
    snapPoint: activeSnapPoint,
    direction: getDirection(options),
    containerSize: getContainerSize(options.container ?? options.mountElement ?? null)
  })
  state.content.style.setProperty('--initial-transform', `${offset}px`)
  set(state.content, {
    transform: getAxisAwareTranslate(getDirection(options), offset),
    transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
  })

  if (state.overlay) {
    set(state.overlay, {
      opacity: shouldShowSnapOverlay(snapPoints, getFadeFromIndex(options), activeSnapPoint) ? '1' : '0',
      transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
    })
  }
}

function focusFirstElement(content: HTMLElement) {
  const focusables = content.querySelectorAll<HTMLElement>(
    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
  )
  const first = focusables[0]
  if (first instanceof HTMLElement) {
    first.focus()
  } else {
    content.tabIndex = -1
    content.focus()
  }
}

function isKeyboardInput(element: Element | null): boolean {
  if (element instanceof HTMLTextAreaElement) return true
  if (element instanceof HTMLElement && element.isContentEditable) return true
  if (!(element instanceof HTMLInputElement)) return false
  return !new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']).has(
    element.type
  )
}

function trapFocus(state: DialogMountState, content: HTMLElement, event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const focusables = Array.from(
    content.querySelectorAll<HTMLElement>(
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
    )
  )
  if (focusables.length === 0) {
    event.preventDefault()
    content.focus()
    return
  }
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement
  if (!active || !content.contains(active)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
  // Reference state to silence the unused warning when this is
  // closed over by a future iteration.
  void state
}

/**
 * Returns `true` when a `pointerdown` target is an interactive child
 * that the consumer expects to receive its own `click` event
 * (buttons, links, form fields, anything with a non-`none` `role`).
 *
 * Used by `attachListeners#onPointerDown` to bail out of the drag
 * pipeline BEFORE `setPointerCapture` is called. Without this guard,
 * the pointer capture on `content` would redirect `mouseup` to
 * `content`, the browser would not fire `click` on the original
 * target, and the close button (or any other interactive child)
 * would not work. The list of interactive tags mirrors what
 * `focusFirstElement` considers focusable.
 *
 * `target` is typed loosely because real browsers deliver the
 * `pointerdown` target as whatever element is at the click point —
 * `SVGElement` instances (e.g. an `<i>`-with-fontawesome `<svg>` icon
 * inside the close button) are NOT `HTMLElement` instances but they
 * ARE clickable children and must not start a drag.
 */
function isInteractiveDragTarget(target: Element): boolean {
  const tagName = target.tagName
  if (
    tagName === 'BUTTON' ||
    tagName === 'A' ||
    tagName === 'INPUT' ||
    tagName === 'SELECT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'LABEL' ||
    tagName === 'IFRAME'
  ) {
    return true
  }
  if (target.hasAttribute('role')) {
    const role = target.getAttribute('role')
    if (role && role !== 'presentation' && role !== 'none') {
      return true
    }
  }
  if (target.hasAttribute('tabindex')) {
    const tabIndex = target.getAttribute('tabindex')
    if (tabIndex !== null && tabIndex !== '-1') {
      return true
    }
  }
  // SVG icons inside an interactive parent (e.g. an `<svg>` inside a
  // `<button>`) are not themselves interactive, but they ARE part of
  // an interactive child. Walk up to the closest `<button>`, `<a>`,
  // etc. — if we land on one, the original target is part of an
  // interactive control and the drag pipeline must not capture the
  // pointer.
  const interactiveAncestor = target.closest(
    'button, a[href], input, select, textarea, label, iframe, [role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [role="tab"]'
  )
  return interactiveAncestor !== null
}

function attachListeners(state: DialogMountState, options: VanillaDrawerOptions, callbacks: DialogCallbacks) {
  if (state.content) {
    const content = state.content
    const onKeyDown = (event: KeyboardEvent) => {
      if (openDialogStack[openDialogStack.length - 1] !== state) return
      if (event.key === 'Escape' && options.dismissible !== false) {
        if (handledEscapeEvents.has(event)) return
        handledEscapeEvents.add(event)
        event.preventDefault()
        callbacks.onOpenChange(false)
        return
      }
      if (event.key === 'Tab' && options.modal !== false) {
        trapFocus(state, content, event)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    state.cleanups.push(() => document.removeEventListener('keydown', onKeyDown))
  }

  if (state.overlay && options.dismissible !== false) {
    const overlay = state.overlay
    const onMouseUp = () => {
      // G11: 1:1 with vaul upstream — vaul routes the overlay's
      // mouseup through the same release pipeline as the
      // content's pointerup (`index.tsx:817`: `onMouseUp={onRelease}`).
      // The drawer's content captures the pointer via
      // `setPointerCapture`, so the overlay's mouseup is a
      // rare edge case (only fires when the pointer capture
      // is broken or the drawer is rendered into a portal
      // that escapes the capture). To match vaul's contract
      // without reaching into the content's private
      // `onPointerUp` closure, we guard on `state.drag`:
      // when a drag is in progress, the content's own
      // `onPointerUp` (which fires via the captured pointer)
      // handles the release math; we skip the overlay close
      // to avoid double-firing. When no drag is in progress,
      // we close directly.
      if (!state.drag) {
        callbacks.onOpenChange(false)
      }
    }
    overlay.addEventListener('mouseup', onMouseUp)
    state.cleanups.push(() => overlay.removeEventListener('mouseup', onMouseUp))
  }

  // Drag pipeline:
  //   Phase A — drag-to-dismiss with no snap points, no scale
  //     background, no handle cycle, no viewport.
  //   Phase B — snap-point math when `options.snapPoints` is set:
  //     the dialog tracks the active snap, positions the drawer at
  //     `getSnapDragValue(activeOffset, draggedDistance)`, calls
  //     `getSnapPointReleaseAction` on release, and forwards the
  //     matched snap value through `onActiveSnapPointChange` so the
  //     registry can call `controller.setActiveSnapPoint`.
  if (state.content) {
    const content = state.content
    const direction = getDirection(options)
    const isVerticalAxis = isVertical(direction)
    const closeThreshold = options.closeThreshold ?? CLOSE_THRESHOLD
    const scrollLockTimeout = options.scrollLockTimeout ?? SCROLL_LOCK_TIMEOUT

    const onPointerDown = (rawEvent: Event) => {
      const event = rawEvent as DragPointerEvent
      const dragOptions = state.options
      if (event.button !== undefined && event.button !== 0) return
      if (state.drag || state.cleanupDragGesture) return

      // Beta.4 fix: the previous implementation
      // called `setPointerCapture` BEFORE the drag-permission check.
      // Once `content` captured the pointer, all subsequent pointer
      // events for that pointer id were redirected to `content`, so
      // the browser fired `mouseup` (and therefore `click`) on
      // `content` instead of the original target. Result: clicking
      // the built-in close button (`[data-drawer-close]`), a link,
      // a form input, or any other interactive child of the drawer
      // did not trigger the child's `click` handler. The pointer
      // capture is now taken ONLY when the drag pipeline actually
      // starts a drag, and never on a target the consumer expects to
      // receive its own clicks.
      //
      // We also bail out before the drag pipeline is even consulted
      // when the pointerdown landed on an interactive CHILD of the
      // drawer (button, input, select, textarea, link, the close
      // button itself, or any element explicitly opted out via
      // `data-drawer-no-drag`). Without this, a tap on the close
      // button started a no-op drag with `draggedDistance = 0`, the
      // release path returned `'reset'`, and the drawer stayed
      // open.
      //
      // The check deliberately excludes the drawer itself
      // (`event.target === content`): the content carries
      // `role="dialog"` and `tabindex="-1"` so it is keyboard-
      // focusable, but it is the drag handle, not an interactive
      // child. A drag MUST start when the user grabs the content
      // background.
      const eventTarget = event.target as Element | null
      if (
        dragOptions.handleOnly === true &&
        !(eventTarget instanceof Element && eventTarget.closest('[data-drawer-handle]'))
      ) {
        return
      }
      if (dragOptions.dismissible === false && !getSnapPoints(dragOptions)?.length) return
      const isInteractiveChild =
        eventTarget instanceof Element &&
        eventTarget !== content &&
        (isInteractiveDragTarget(eventTarget) || Boolean(eventTarget.closest('[data-drawer-close]')))

      if (isInteractiveChild) {
        return
      }

      const metadata: DragTargetMetadata = getDragTargetMetadata(event.target, content)
      const timeSinceOpenMs = state.openedAt !== null ? performance.now() - state.openedAt : null
      // `swipeAmount: null` lets the drag policy treat this as a
      // fresh pointerdown. The remaining fields (highlighted text,
      // last-prevented time, direction consistency) are inert here
      // but the policy signature requires them; we forward the
      // conservative defaults.
      const permission = getDragPermission({
        targetTagName: metadata.targetTagName,
        hasNoDragAttribute: metadata.hasNoDragAttribute,
        direction: getDirection(dragOptions),
        timeSinceOpenMs,
        swipeAmount: null,
        hasHighlightedText: false,
        timeSinceLastPreventedMs: null,
        scrollLockTimeout: dragOptions.scrollLockTimeout ?? scrollLockTimeout,
        isDraggingInDirection: false,
        ancestors: metadata.ancestors
      })

      if (!permission.allow) {
        if (permission.updatePreventedAt) {
          state.lastTimeDragPrevented = performance.now()
        }
        return
      }

      // G5: 1:1 with vaul upstream — capture the drawer's actual
      // rendered dimensions at pointerdown so the drag math
      // (percentageDragged, close threshold) uses the real
      // drawer size instead of the viewport. Without this, a
      // consumer with a non-full-height drawer (e.g. `height:
      // 300px` or `fixed: true` with a constrained height) would
      // miscalculate the drag-to-close threshold.
      const contentRect = content.getBoundingClientRect()
      const fallbackVertical = isVerticalAxis ? window.innerHeight : window.innerWidth
      const currentSnapPoints = getSnapPoints(dragOptions)
      const currentActiveSnapPoint = getActiveSnapPoint(dragOptions)
      const currentSnapPointsOffset = getSnapPointsOffset({
        ...(currentSnapPoints !== undefined ? { snapPoints: currentSnapPoints } : {}),
        direction,
        containerSize: getContainerSize(dragOptions.container ?? dragOptions.mountElement ?? null)
      })
      const currentActiveSnapPointIndex = getActiveSnapPointIndex({
        ...(currentSnapPoints !== undefined ? { snapPoints: currentSnapPoints } : {}),
        activeSnapPoint: currentActiveSnapPoint
      })
      const currentActiveSnapPointOffset =
        currentActiveSnapPointIndex !== null && currentActiveSnapPointIndex >= 0
          ? (currentSnapPointsOffset[currentActiveSnapPointIndex] ?? null)
          : null
      const gestureFadeFromIndex = getFadeFromIndex(dragOptions)
      const currentShouldFade = getShouldFade({
        ...(currentSnapPoints !== undefined ? { snapPoints: currentSnapPoints } : {}),
        ...(gestureFadeFromIndex !== undefined ? { fadeFromIndex: gestureFadeFromIndex } : {}),
        activeSnapPoint: currentActiveSnapPoint
      })
      state.drag = {
        pointerStart: { x: event.clientX, y: event.clientY },
        pointerStartTimeStamp: event.timeStamp || performance.now(),
        startedAt: performance.now(),
        draggedDistance: 0,
        isDraggingDown: false,
        snapPointOffset: 0,
        lastTimeDragPrevented: 0,
        pointerId: event.pointerId,
        // Fallback to the viewport when the drawer is not laid out
        // (jsdom tests where `getBoundingClientRect` returns 0,0).
        // vaul falls back to `window.innerWidth/Height` in the
        // `useRef` initializers at `index.tsx:213-214` for the same
        // reason.
        drawerHeight: contentRect.height > 0 ? contentRect.height : fallbackVertical,
        drawerWidth: contentRect.width > 0 ? contentRect.width : fallbackVertical,
        activeSnapPointOffset: currentActiveSnapPointOffset,
        activeSnapPointIndex: currentActiveSnapPointIndex,
        snapPointsOffset: currentSnapPointsOffset,
        shouldFade: currentShouldFade,
        lastPointerEvent: null,
        reachedIntentBoundary: false,
        isAllowed: false
      }

      // F3 / F11: stash the most recent pointermove so the synthetic
      // release listeners (`pointerout`, `contextmenu`,
      // `pointercancel`, see below) can replay the last known
      // gesture position when the real `pointerup` never reaches
      // the content (cursor off the drawer, OS interruption,
      // long-press context menu, etc.).
      let lastPointerMove: DragPointerEvent | null = null
      let pointerCaptured = false

      const onPointerMove = (moveRaw: Event) => {
        const moveEvent = moveRaw as DragPointerEvent
        const drag = state.drag
        if (!drag || moveEvent.pointerId !== drag.pointerId) return
        lastPointerMove = moveEvent
        drag.lastPointerEvent = moveEvent
        const currentPointer = isVerticalAxis ? moveEvent.clientY : moveEvent.clientX
        const draggedDistance = getDraggedDistance({
          pointerStart: isVerticalAxis ? drag.pointerStart.y : drag.pointerStart.x,
          currentPointer,
          direction
        })
        const absDraggedDistance = Math.abs(draggedDistance)
        const isDraggingDown =
          direction === 'bottom' || direction === 'right' ? draggedDistance < 0 : draggedDistance > 0

        if (!drag.reachedIntentBoundary) {
          const delta = {
            x: moveEvent.clientX - drag.pointerStart.x,
            y: moveEvent.clientY - drag.pointerStart.y
          }
          const threshold = moveEvent.pointerType === 'touch' ? 10 : 2
          const intent = getSwipeIntent({
            delta,
            direction,
            threshold,
            wasBeyondThePoint: false
          })
          if (!intent.isAllowed) {
            if (Math.abs(delta.x) > threshold || Math.abs(delta.y) > threshold) {
              state.drag = null
              cleanupGestureListeners()
            }
            return
          }
          if (!intent.reachedIntentBoundary) return

          const liveOptions = state.options
          const timeSinceLastPreventedMs =
            state.lastTimeDragPrevented === null ? null : performance.now() - state.lastTimeDragPrevented
          const movePermission = getDragPermission({
            targetTagName: metadata.targetTagName,
            hasNoDragAttribute: metadata.hasNoDragAttribute,
            direction,
            timeSinceOpenMs: state.openedAt === null ? null : performance.now() - state.openedAt,
            swipeAmount: getTranslate(content, direction) ?? 0,
            hasHighlightedText: Boolean(window.getSelection()?.toString()),
            timeSinceLastPreventedMs,
            scrollLockTimeout: liveOptions.scrollLockTimeout ?? scrollLockTimeout,
            isDraggingInDirection: draggedDistance > 0,
            ancestors: metadata.ancestors
          })
          if (!movePermission.allow) {
            if (movePermission.updatePreventedAt) state.lastTimeDragPrevented = performance.now()
            state.drag = null
            cleanupGestureListeners()
            return
          }

          drag.reachedIntentBoundary = true
          drag.isAllowed = true
          content.classList.add(DRAG_CLASS)
          const capture = content.setPointerCapture
          if (typeof capture === 'function') {
            try {
              capture.call(content, moveEvent.pointerId)
              pointerCaptured = true
            } catch {
              // The pointer may already have been released by the browser.
            }
          }
        }

        if (!drag.isAllowed) return

        // Phase B: when snap points are configured, the inline
        // transform follows `getSnapDragValue` (offset, not value).
        // The percentage reported to the parent is the snap-point
        // percentage so the nested-drawer transform tracks the
        // active snap rather than the raw pixel drag.
        const hasSnapPoints = drag.snapPointsOffset.length > 0 && drag.activeSnapPointOffset !== null
        const snapPointPercentageDragged = hasSnapPoints
          ? getSnapPointPercentageDragged({
              ...(currentSnapPoints !== undefined ? { snapPoints: currentSnapPoints } : {}),
              activeSnapPointIndex: drag.activeSnapPointIndex,
              snapPointsOffset: drag.snapPointsOffset,
              ...(gestureFadeFromIndex !== undefined ? { fadeFromIndex: gestureFadeFromIndex } : {}),
              shouldFade: drag.shouldFade,
              absDraggedDistance,
              isDraggingDown
            })
          : null
        const { percentageDragged } = getDragPercentage({
          draggedDistance,
          drawerDimension: isVerticalAxis ? drag.drawerHeight : drag.drawerWidth,
          snapPointPercentageDragged
        })

        state.drag = {
          ...drag,
          draggedDistance,
          isDraggingDown
        }

        // Phase A: the snap-free path delegates the
        // `draggableOffset` math to `getDraggableOffset`, which
        // applies elastic resistance when the user drags in the
        // OPPOSITE of the close direction (e.g. dragging a
        // `direction='right'` drawer to the left). The drawer
        // still moves but at `DRAG_RESISTANCE` (0.5) of the
        // gesture distance, matching the v2 vaul library and
        // Safari's scroll-bounce. The close direction has no
        // resistance so the close-threshold / velocity math stays
        // predictable. Phase B replaces this with the snap drag
        // value.
        const draggableOffset = hasSnapPoints
          ? getSnapDragValue({
              activeSnapPointOffset: drag.activeSnapPointOffset ?? 0,
              draggedDistance,
              direction
            })
          : getDraggableOffset({ direction, draggedDistance })
        set(content, {
          transform: getAxisAwareTranslate(direction, draggableOffset),
          transition: 'none'
        })

        // Phase B: fade the overlay while dragging in close direction
        // so it lightens as the user drags toward the closed position.
        // Mirrors vaul upstream: the fade runs whenever `shouldFade`
        // is true, which is the case both for snap-point drawers at
        // the `fadeFromIndex` snap AND for snap-free drawers (the
        // overlay always fades during the drag-to-dismiss gesture).
        // Outside the fade window the CSS rule keeps the overlay
        // hidden; we skip the inline write so the CSS transition
        // stays in charge.
        if (
          state.overlay &&
          draggedDistance < 0 &&
          (drag.shouldFade || drag.activeSnapPointIndex === (gestureFadeFromIndex ?? -1) - 1)
        ) {
          set(state.overlay, {
            opacity: `${Math.max(0, Math.min(1, 1 - percentageDragged))}`,
            transition: 'none'
          })
        }

        // Phase C: scale the page wrapper along the drag. We look
        // up the wrapper on every move (cheap query) and forward
        // the percentage to `applyWrapperDragState` which writes
        // `transition: 'none'` so the inline transform is instant
        // and tracks the finger. The wrapper's CSS transition is
        // re-enabled on release by the release handlers below.
        const scaleOwner = state.backgroundScale
        if (scaleOwner && isActiveBackgroundScaleOwner(scaleOwner)) {
          applyWrapperDragState({
            wrapper: scaleOwner.group.wrapper,
            baseScale: scaleOwner.baseScale,
            percentageDragged,
            direction,
            setBackgroundColorOnScale:
              dragOptions.setBackgroundColorOnScale !== false && dragOptions.noBodyStyles !== true
          })
        }

        callbacks.onDragChange?.(percentageDragged)
      }

      const settleOverlay = () => {
        if (!state.overlay) return
        const liveOptions = state.options
        const overlayVisible = shouldShowSnapOverlay(
          getSnapPoints(liveOptions),
          getFadeFromIndex(liveOptions),
          getActiveSnapPoint(liveOptions)
        )
        set(state.overlay, {
          opacity: overlayVisible ? '1' : '0',
          transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
        })
      }

      const settleBackgroundScale = () => {
        const owner = state.backgroundScale
        if (owner && isActiveBackgroundScaleOwner(owner)) applyBackgroundScaleOpen(owner)
      }

      const onPointerUp = (upRaw: Event) => {
        const upEvent = upRaw as DragPointerEvent
        const drag = state.drag
        if (drag && upEvent.pointerId !== undefined && upEvent.pointerId !== drag.pointerId) return
        state.drag = null
        cleanupGestureListeners()
        if (!drag || !drag.isAllowed) return

        state.suppressHandleClick = true
        window.setTimeout(() => {
          state.suppressHandleClick = false
        }, 0)

        const releasedPointer = isVerticalAxis ? upEvent.clientY : upEvent.clientX
        const draggedDistance = getDraggedDistance({
          pointerStart: isVerticalAxis ? drag.pointerStart.y : drag.pointerStart.x,
          currentPointer: releasedPointer,
          direction
        })
        const now = performance.now()
        const velocity = Math.abs(draggedDistance) / Math.max(now - drag.startedAt, 1)

        // G11: high-velocity releases set `justReleased = true` for
        // 200 ms. The `preventBodyScroll` gate (G3) reads this and
        // releases the body-scroll lock so the next focus event on
        // an input inside the drawer does not fight the lock.
        // 1:1 with vaul upstream's `setJustReleased(true)` +
        // 200ms `setTimeout(setJustReleased(false))` in `onRelease`.
        if (velocity > 0.05) {
          state.justReleased = true
          if (state.justReleasedTimer !== null) {
            clearTimeout(state.justReleasedTimer)
          }
          state.justReleasedTimer = setTimeout(() => {
            state.justReleased = false
            state.justReleasedTimer = null
          }, 200)
        }

        const hasSnapPoints = drag.snapPointsOffset.length > 0 && drag.activeSnapPointOffset !== null

        if (hasSnapPoints) {
          // Phase B release: delegate to `getSnapPointReleaseAction`.
          // The helper decides whether the gesture should close,
          // jump to a different snap, or settle on the closest one.
          // The target offset is mapped back to a snap-point value
          // via `findSnapPointByOffset`; on `close` we just call
          // `onOpenChange(false)`. `snapToSequentialPoint` is
          // forwarded so high-velocity flings stay one snap at a
          // time when the consumer opts in.
          const release = getSnapPointReleaseAction({
            ...(gestureFadeFromIndex !== undefined ? { fadeFromIndex: gestureFadeFromIndex } : {}),
            direction,
            activeSnapPointOffset: drag.activeSnapPointOffset,
            activeSnapPointIndex: drag.activeSnapPointIndex,
            snapPointsOffset: drag.snapPointsOffset,
            snapPointsCount: drag.snapPointsOffset.length,
            draggedDistance,
            velocity,
            dismissible: dragOptions.dismissible !== false,
            ...(dragOptions.snapToSequentialPoint !== undefined
              ? { snapToSequentialPoint: dragOptions.snapToSequentialPoint }
              : {}),
            velocityThreshold: VELOCITY_THRESHOLD,
            viewportSize: isVerticalAxis ? drag.drawerHeight : drag.drawerWidth
          })

          if (release.type === 'close') {
            set(content, { transition: 'none' })
            // Keep the release transform. The close mount samples the
            // rendered position, then transitions from there to the
            // direction's closed endpoint without an open-position jump.
            callbacks.onOpenChange(false)
            callbacks.onReleaseChange?.(false)
            return
          }

          if (release.type === 'snap' && typeof release.targetOffset === 'number') {
            const matchedSnapPoint = findSnapPointByOffset(
              currentSnapPoints,
              drag.snapPointsOffset,
              release.targetOffset
            )
            if (matchedSnapPoint !== null) {
              // Forward the new active snap to the registry, which
              // calls `controller.setActiveSnapPoint` and re-renders
              // the dialog. The re-render refreshes `--initial-transform`
              // so the drawer sits at the new snap. We also write
              // the inline transform as a fallback for the
              // pre-render frame.
              set(content, {
                transform: getAxisAwareTranslate(direction, release.targetOffset),
                transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
              })
              // Phase C: settle the wrapper on its rest state with
              // the CSS transition enabled so the visual change
              // from the drag state to `baseScale` is animated.
              settleBackgroundScale()
              callbacks.onActiveSnapPointChange?.(matchedSnapPoint)
              // G8: 1:1 with vaul upstream — when the user snaps
              // to the LAST snap, extend the post-open grace
              // period (vaul: `index.tsx:217-220`). The user just
              // expanded the drawer to full height and is
              // probably scrolling content, not trying to
              // drag-to-close. Without this, the grace period
              // expires 500ms after the initial open and a
              // follow-up scroll can be hijacked as a drag.
              if (currentSnapPoints && matchedSnapPoint === currentSnapPoints[currentSnapPoints.length - 1]) {
                state.openedAt = performance.now()
              }
            } else {
              // No matching snap (degenerate viewport). Reset the
              // inline transform so the drawer stays at the active
              // snap.
              set(content, {
                transform: getAxisAwareTranslate(direction, drag.activeSnapPointOffset ?? 0),
                transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
              })
              settleBackgroundScale()
            }
            settleOverlay()
            callbacks.onReleaseChange?.(true)
            return
          }

          // `type: 'noop'` — drag was inconclusive (no snap points,
          // no offset target). Reset the inline transform so the
          // drawer stays at the active snap.
          set(content, {
            transform: getAxisAwareTranslate(direction, drag.activeSnapPointOffset ?? 0),
            transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
          })
          settleBackgroundScale()
          settleOverlay()
          callbacks.onReleaseChange?.(true)
          return
        }

        // Phase A release: no snap points, delegate to the
        // dismissible release helper.
        const release = getDismissibleReleaseResult({
          direction,
          distMoved: draggedDistance,
          velocity,
          velocityThreshold: VELOCITY_THRESHOLD,
          swipeAmount: draggedDistance,
          drawerDimension: isVerticalAxis ? drag.drawerHeight : drag.drawerWidth,
          closeThreshold
        })

        if (release.action === 'close') {
          set(content, { transition: 'none' })
          // Keep the release transform. The close mount samples the
          // rendered position, then transitions from there to the
          // direction's closed endpoint without an open-position jump.
          callbacks.onOpenChange(false)
          callbacks.onReleaseChange?.(false)
          return
        }

        // Snap back to the open position. The CSS provides the
        // `transform` transition, but the dialog itself is re-mounted
        // by the registry on state change; the inline transition here
        // covers the in-place reset path (no re-render because the
        // drawer stays open).
        set(content, {
          transform: getAxisAwareTranslate(direction, 0),
          transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
        })
        // Phase C: settle the wrapper on its rest state with the
        // CSS transition enabled so the visual change from the drag
        // state to `baseScale` is animated.
        settleBackgroundScale()
        settleOverlay()
        callbacks.onReleaseChange?.(true)
      }

      // F3 / F11: vaul upstream tracks the most recent `pointermove`
      // event and replays the release path on `pointerout`,
      // `contextmenu`, and `pointercancel`. Without these, dragging
      // off the drawer's bounding box (or triggering a long-press
      // context menu on iOS) leaves the inline transform stuck at
      // the last drag position because the browser never fires a
      // `pointerup` on the content element. The `pointerout` /
      // `contextmenu` / `pointercancel` listeners replay the last
      // known `pointermove` through the same `onPointerUp` handler.
      const onPointerOut = (synthetic: Event) => {
        const drag = state.drag
        if (!drag) return
        const pointerEvent = synthetic as DragPointerEvent
        if (pointerEvent.pointerId !== undefined && pointerEvent.pointerId !== drag.pointerId) return
        const relatedTarget = pointerEvent.relatedTarget
        if (relatedTarget instanceof Node && content.contains(relatedTarget)) return
        if (typeof content.hasPointerCapture === 'function' && content.hasPointerCapture(drag.pointerId)) {
          return
        }
        if (typeof synthetic.preventDefault === 'function') {
          synthetic.preventDefault()
        }
        onPointerUp(lastPointerMove ?? (synthetic as DragPointerEvent))
      }
      const onContextMenu = (synthetic: Event) => {
        if (!state.drag) return
        if (typeof synthetic.preventDefault === 'function') {
          synthetic.preventDefault()
        }
        onPointerUp(lastPointerMove ?? (synthetic as DragPointerEvent))
      }
      const onPointerCancel = (synthetic: Event) => {
        const drag = state.drag
        if (!drag) return
        const pointerEvent = synthetic as DragPointerEvent
        if (pointerEvent.pointerId !== undefined && pointerEvent.pointerId !== drag.pointerId) return
        const resetEvent = {
          clientX: drag.pointerStart.x,
          clientY: drag.pointerStart.y,
          pointerId: drag.pointerId,
          target: synthetic.target,
          currentTarget: content
        } as unknown as DragPointerEvent
        onPointerUp(resetEvent as unknown as Event)
      }

      const cleanupGestureListeners = () => {
        content.removeEventListener('pointermove', onPointerMove)
        content.removeEventListener('pointerup', onPointerUp)
        content.removeEventListener('pointerout', onPointerOut)
        content.removeEventListener('contextmenu', onContextMenu)
        content.removeEventListener('pointercancel', onPointerCancel)
        if (pointerCaptured && typeof content.releasePointerCapture === 'function') {
          try {
            if (typeof content.hasPointerCapture !== 'function' || content.hasPointerCapture(event.pointerId)) {
              content.releasePointerCapture(event.pointerId)
            }
          } catch {
            // Pointer capture may already have been released implicitly.
          }
        }
        pointerCaptured = false
        content.classList.remove(DRAG_CLASS)
        if (state.cleanupDragGesture === cleanupGestureListeners) {
          state.cleanupDragGesture = null
        }
      }

      content.addEventListener('pointermove', onPointerMove)
      content.addEventListener('pointerup', onPointerUp)
      content.addEventListener('pointerout', onPointerOut)
      content.addEventListener('contextmenu', onContextMenu)
      content.addEventListener('pointercancel', onPointerCancel)
      state.cleanupDragGesture = cleanupGestureListeners
    }

    content.addEventListener('pointerdown', onPointerDown)
    state.cleanups.push(() => content.removeEventListener('pointerdown', onPointerDown))
  }

  // Phase D: handle cycle. When the consumer enables
  // `handleOnly: true` or `showHandle: true`, the dialog mounts a
  // built-in `[data-drawer-handle]` element. Clicking it should
  // advance the drawer to the next snap point, or close it (when
  // `dismissible: true`) at the last snap. The math is delegated
  // to `getNextHandleState` (pure helper in `runtime/handle.ts`);
  // the dialog only dispatches the result.
  //
  // Preconditions (enforced here, not in the helper):
  //   1. The drawer must be open. The handle element is in the
  //      DOM at all times (the CSS does not `display: none` it on
  //      close), so a click on a closed drawer's handle would
  //      otherwise fire. We read the content's `data-state` (set
  //      by `applyOpenState`) to gate the dispatch.
  //   2. Drag-priority. While `state.drag` is non-null the click
  //      must not cycle. We pass `isDragging: state.drag !== null`
  //      to the helper, which returns `{ type: 'noop' }`.
  //
  // Long-press is intentionally NOT implemented in Phase D
  // (documented in the deliverable). `shouldCancelInteraction` is
  // hard-coded to `false`. A future phase can wire a pointerdown
  // timer on the handle that flips it to `true` before the click
  // handler fires.
  if (state.handle) {
    const handle = state.handle
    const onHandleClick = () => {
      if (state.content?.dataset.state !== 'open') return
      if (state.suppressHandleClick) return

      const liveOptions = state.options
      const handleSnapPoints = getSnapPoints(liveOptions)
      const handleActiveSnapPoint = getActiveSnapPoint(liveOptions)
      const result = getNextHandleState({
        isDragging: state.drag !== null,
        preventCycle: liveOptions.preventCycle === true,
        shouldCancelInteraction: false,
        ...(handleSnapPoints !== undefined ? { snapPoints: handleSnapPoints } : {}),
        activeSnapPoint: handleActiveSnapPoint,
        dismissible: liveOptions.dismissible !== false
      })

      if (result.type === 'close') {
        callbacks.onOpenChange(false)
        return
      }
      if (result.type === 'snap') {
        // `result.snapPoint` is `null` when the helper cycles past
        // the last snap with `dismissible: false` (length-1 snap
        // list, or a last-snap where the next index is out of
        // bounds). Forward `null` so the registry clears the
        // active snap; the drawer stays open and renders the
        // first snap's offset (via `getActiveSnapPoint`'s fallback
        // in `core/index.ts`).
        callbacks.onActiveSnapPointChange?.(result.snapPoint)
        // G8: 1:1 with vaul upstream — handle-cycle that reaches
        // the last snap also extends the post-open grace period.
        const handleSnapPoints = getSnapPoints(liveOptions)
        if (handleSnapPoints && result.snapPoint === handleSnapPoints[handleSnapPoints.length - 1]) {
          state.openedAt = performance.now()
        }
        return
      }
      // `type: 'noop'` — drag in progress, `preventCycle` is on,
      // no snap points configured with `dismissible: true`, or
      // the active snap is not in the snap-points list. Do
      // nothing.
    }
    handle.addEventListener('click', onHandleClick)
    state.cleanups.push(() => handle.removeEventListener('click', onHandleClick))
  }
}

/**
 * Mount (or update) a vanilla dialog inside `host`. Idempotent:
 * calling twice with the same `host` updates the existing mount in
 * place — it does not detach listeners or recreate the dialog tree.
 */
export function mountVanillaDialog(dialogOptions: VanillaDialogOptions): void {
  if (!canUseDOM()) return
  const {
    host,
    id,
    options,
    open,
    openOrder,
    hasBeenOpened = false,
    onOpenChange,
    onBuiltInTriggerMouseDown,
    onBuiltInTriggerClick,
    onDragChange,
    onReleaseChange,
    onActiveSnapPointChange
  } = dialogOptions
  const state = getHostState(host)
  state.options = options
  const resolvedOpenOrder = open ? (openOrder ?? (state.openOrder || ++fallbackOpenOrder)) : null
  const callbacks: DialogCallbacks = {
    onOpenChange,
    ...(onBuiltInTriggerMouseDown !== undefined ? { onBuiltInTriggerMouseDown } : {}),
    ...(onBuiltInTriggerClick !== undefined ? { onBuiltInTriggerClick } : {}),
    ...(onDragChange !== undefined ? { onDragChange } : {}),
    ...(onReleaseChange !== undefined ? { onReleaseChange } : {}),
    ...(onActiveSnapPointChange !== undefined ? { onActiveSnapPointChange } : {})
  }

  // Beta.4 keeps an open mount in place for close, freezes its current
  // rendered transform, and flips `data-state` so the exit starts from
  // what the user sees. Other structural option changes still remount.
  const hadOpenMount = state.content !== null && state.content.dataset.state === 'open'
  const isClosingOnly = hadOpenMount && !open

  if (hadOpenMount && open && canUpdateOpenMount(state.mountedOptions, options)) {
    state.mountedOptions = options
    updateOpenSnapState(state, options)
    return
  }

  if (open) cancelCloseRemoval(state)

  if (isClosingOnly) {
    // Freeze the current visual position before changing state. This
    // prevents an entrance or snap-back transition from continuing
    // underneath the exit animation.
    if (state.content) {
      const direction = getDirection(options)
      if (state.content.dataset.drawerAnimate === 'false') {
        set(state.content, { transform: getClosedTransform(direction), transition: 'none' })
      } else {
        const computedTransform = window.getComputedStyle(state.content).transform
        const currentTransform =
          computedTransform && computedTransform !== 'none'
            ? computedTransform
            : state.content.style.transform || getAxisAwareTranslate(direction, 0)
        set(state.content, { transform: currentTransform, transition: 'none' })
      }
    }
    releaseBackgroundScale(state, true)
    // Flip data-state to "closed". The base `transition: transform`
    // (CSS, not JS) interpolates from the open cascade (0) to the
    // closed cascade (100 %). 1:1 with vaul.
    applyOpenState(state, options, false)
    // Detach listeners + restore page-level side-effects immediately
    // (matches v2 semantics; the visualViewport listener must come
    // off synchronously so the next `setOpen(true)` re-attaches a
    // fresh one with the current options). The DOM nodes themselves
    // stay in the tree until the close animation finishes — the
    // base `transition: transform` needs the elements present to
    // interpolate the transform.
    teardownMount(state, { deferDom: true })
    // Schedule the DOM removal for after the close animation. If
    // the transition never runs (CSS animations disabled by a
    // consumer `data-drawer-animate="false"`, or the test
    // environment doesn't run animations), the safety timeout
    // still tears down. Note: in the real browser, the
    // `transitionend` event would be the right hook — we use a
    // setTimeout with the same duration for cross-environment
    // robustness (jsdom + browsers that delay the transitionend
    // event under load).
    const closingOverlay = state.overlay
    const closingContent = state.content
    const removeDom = () => {
      state.closeRemovalTimer = null
      closingOverlay?.remove()
      closingContent?.remove()
      if (state.overlay === closingOverlay) state.overlay = null
      if (state.content === closingContent) {
        state.content = null
        state.handle = null
        state.title = null
        state.description = null
        state.body = null
        state.closeButton = null
      }
    }
    attachBuiltInTrigger(state, host, options, callbacks)
    state.closeRemovalTimer = window.setTimeout(removeDom, TRANSITIONS.DURATION * 1000 + 100)
    state.mountedOptions = options
    return
  }

  if (!open && state.closeRemovalTimer !== null) {
    attachBuiltInTrigger(state, host, options, callbacks)
    state.mountedOptions = options
    return
  }

  // Tear down any prior mount before building the new one.
  teardownMount(state)
  attachBuiltInTrigger(state, host, options, callbacks)

  // Match Radix Presence: a closed drawer has no overlay/content in
  // the document. Only the optional trigger persists. This prevents
  // closed-state keyframes from visibly animating every drawer out on
  // page load.
  if (!open) {
    state.hasMounted = true
    state.mountedOptions = options
    return
  }

  // Track when the drawer became open so the drag policy can enforce
  // the 500 ms grace period (the open animation is still running).
  if (open) {
    state.openedAt = performance.now()
  }

  // Scale the page wrapper into its open rest state. The original
  // wrapper/body styles are restored after the drawer closes.
  if (open && options.shouldScaleBackground) {
    const wrapper = getWrapperElement()
    if (wrapper) {
      acquireBackgroundScale(
        state,
        wrapper,
        getDirection(options),
        options.setBackgroundColorOnScale !== false && options.noBodyStyles !== true,
        resolvedOpenOrder as number
      )
    }
  }

  const direction = getDirection(options)
  const snapPoints = getSnapPoints(options)
  const activeSnapPoint = getActiveSnapPoint(options)
  const hasSnapPoints = Boolean(snapPoints?.length)
  const shouldAnimateEntrance = state.hasMounted && !hadOpenMount
  const shouldRenderHandle = Boolean(options.handleOnly || options.showHandle)
  const shouldRenderVanillaContent = true
  const shouldRenderOverlay = options.modal !== false
  let snapEntranceTransform: string | null = null
  let snapEntranceOverlayOpacity: string | null = null

  // --- Overlay -------------------------------------------------------
  if (shouldRenderOverlay) {
    const overlayShouldShow = shouldShowSnapOverlay(snapPoints, getFadeFromIndex(options), activeSnapPoint)
    const overlay = createEl('div', {
      'data-drawer-overlay': '',
      'data-state': open ? 'open' : 'closed',
      'data-drawer-snap-points': hasSnapPoints ? 'true' : 'false',
      'data-drawer-snap-points-overlay': overlayShouldShow ? 'true' : 'false',
      'data-drawer-animate': shouldAnimateEntrance ? 'true' : 'false'
    })
    if (hasSnapPoints && shouldAnimateEntrance) {
      overlay.style.opacity = '0'
      overlay.style.transition = 'none'
      snapEntranceOverlayOpacity = overlayShouldShow ? '1' : '0'
    }
    if (options.overlayClassName) overlay.className = options.overlayClassName
    host.appendChild(overlay)
    state.overlay = overlay
  }

  // --- Content -------------------------------------------------------
  if (shouldRenderVanillaContent) {
    const content = createEl('div', {
      'data-drawer': '',
      'data-state': open ? 'open' : 'closed',
      'data-drawer-direction': direction,
      'data-drawer-snap-points': hasSnapPoints ? 'true' : 'false',
      'data-drawer-delayed-snap-points': 'false',
      'data-drawer-custom-container': options.container || options.mountElement ? 'true' : 'false',
      'data-drawer-animate': shouldAnimateEntrance ? 'true' : 'false',
      role: 'dialog',
      'aria-modal': options.modal === false ? 'false' : 'true',
      tabIndex: -1
    })
    if (options.contentClassName) content.className = options.contentClassName
    // Beta.4 fix: the drawer id used to be
    // placed on the `[data-drawer]` content wrapper so consumers
    // could target the drawer via `#myDrawer` in CSS. That created
    // an id collision when the consumer's content HTML contained
    // any element with the same id (the common case: a `<form
    // id="myDrawer">` rendered inside the drawer). HTML's
    // `getElementById` returns the FIRST element with the id in
    // tree order, so the form controller (or any other consumer
    // code that looks up the form by id) found the drawer's
    // content `<div>` instead of the form, and the form's
    // initialization silently failed.
    //
    // The first attempt at a fix (placing the id on the host
    // element instead) also failed for the same reason: the host
    // is still in the DOM, and `getElementById` returns the
    // host when both the host and the inner form share the id.
    // The correct fix is to NOT place the id on either the
    // content or the host — the drawer is uniquely identified by
    // the `data-drawer` attribute, the host is uniquely
    // identified by the `data-drawer-vanilla-root` attribute, and
    // the consumer can target the drawer's content by the new
    // `data-drawer-id` attribute (which is just a metadata
    // attribute, not a real id, so it cannot collide with any
    // element's `id`).
    //
    // The migration path for consumers who relied on the `#myDrawer`
    // CSS selector is to use `[data-drawer-id="myDrawer"]` (which
    // matches the content) or `[data-drawer-vanilla-root="myDrawer"]`
    // (which matches the host). The new attribute is added below.
    if (host.id === id) {
      // Defensive: a stale host from a previous instance of the
      // same drawer (after a `destroyDrawer` + `createDrawer` cycle
      // that reused the same id) may still have the id. Clear it.
      host.removeAttribute('id')
    }
    content.setAttribute('data-drawer-id', id)
    if (options.ariaLabel) content.setAttribute('aria-label', options.ariaLabel)
    if (snapPoints && snapPoints.length > 0) {
      // Write the active snap's RUNTIME offset (the same value the
      // drag pipeline uses for `getSnapDragValue`). The CSS reads
      // `--initial-transform` to drive the open-state transform, so
      // keeping it in offset units ensures the inline drag transform
      // and the at-rest transform stay in the same coordinate system.
      // The default `100%` in the CSS rule is the closed-state fallback
      // and is harmless when a numeric offset is present.
      const initialOffset =
        activeSnapPoint !== null
          ? getSnapPointOffset({
              snapPoint: activeSnapPoint,
              direction,
              // G3: pass the container so the snap math uses the
              // container's bounding rect when set.
              containerSize: getContainerSize(options.container ?? options.mountElement ?? null)
            })
          : 0
      content.style.setProperty('--initial-transform', `${initialOffset}px`)
      const restingTransform = getAxisAwareTranslate(direction, initialOffset)
      if (shouldAnimateEntrance) {
        content.style.transform = getClosedTransform(direction)
        content.style.transition = 'none'
        snapEntranceTransform = restingTransform
      } else {
        content.style.transform = restingTransform
      }
    }
    host.appendChild(content)
    state.content = content

    if (shouldRenderHandle) {
      const handle = createEl('div', {
        'data-drawer-handle': '',
        'data-drawer-visible': open ? 'true' : 'false',
        'aria-hidden': 'true'
      })
      if (options.handleClassName) handle.className = options.handleClassName
      const hitArea = createEl('span', { 'data-drawer-handle-hitarea': '', 'aria-hidden': 'true' })
      handle.appendChild(hitArea)
      content.appendChild(handle)
      state.handle = handle
    }

    const titleEl = createEl('div', { 'data-drawer-title': '' })
    const descEl = createEl('div', { 'data-drawer-description': '' })
    // Reintroduce the vanilla-node wrapper for CSS retro-compat (v2 DOM contract).
    // It sits between [data-drawer] and [data-drawer-vanilla-body].
    const nodeWrapperEl = createEl('div', { 'data-drawer-vanilla-node': '' })
    const bodyEl = createEl('div', { 'data-drawer-vanilla-body': '' })
    state.title = titleEl
    state.description = descEl
    state.body = bodyEl
    content.appendChild(titleEl)
    content.appendChild(descEl)
    content.appendChild(nodeWrapperEl)
    nodeWrapperEl.appendChild(bodyEl)

    const resolvedBodyContent = resolveRenderable(options.content)
    const contentRoot = resolvedBodyContent.element
    const contentHasId = (targetId: string) => findElementByIdInSubtree(contentRoot ?? null, targetId) !== null

    // Auto-set id on title/description slots when ariaLabelledBy/ariaDescribedBy
    // is provided but no matching element exists in the caller-supplied HTML.
    // This makes aria-labelledby / aria-describedby point to a real target.
    if (options.ariaLabelledBy) {
      if (!contentHasId(options.ariaLabelledBy)) titleEl.id = options.ariaLabelledBy
      content.setAttribute('aria-labelledby', options.ariaLabelledBy)
    } else {
      const autoTitleId = `${id}-title`
      titleEl.id = autoTitleId
      content.setAttribute('aria-labelledby', autoTitleId)
    }
    if (options.ariaDescribedBy) {
      if (!contentHasId(options.ariaDescribedBy)) descEl.id = options.ariaDescribedBy
      content.setAttribute('aria-describedby', options.ariaDescribedBy)
    } else {
      const autoDescId = `${id}-description`
      descEl.id = autoDescId
      content.setAttribute('aria-describedby', autoDescId)
    }

    buildTitleContent(state, options, contentRoot)
    buildBodyContent(state, options, resolvedBodyContent)

    // Built-in close button. Rendered last so it sits at the
    // end of the dialog tree (between the body and any
    // consumer-supplied children). The button is removed on
    // the next `teardownMount` via `state.closeButton`; its
    // `click` listener is owned by the button element, so
    // removing the element is enough to detach the listener.
    const closeButtonOptions = normalizeCloseButtonOptions(options.closeButton)
    if (closeButtonOptions) {
      const closeBtn = buildCloseButton(closeButtonOptions, { onOpenChange })
      content.appendChild(closeBtn)
      state.closeButton = closeBtn
    }
  }

  registerOpenDialog(state, resolvedOpenOrder)
  attachListeners(state, options, callbacks)

  applyOpenState(state, options, open)

  if (snapPoints && snapPoints.length > 0) {
    const onWindowResize = () => updateOpenSnapState(state, state.options)
    window.addEventListener('resize', onWindowResize)
    state.cleanups.push(() => window.removeEventListener('resize', onWindowResize))
  }

  // Phase E: `preventScrollRestoration`. While the drawer is open we
  // disable the browser's automatic scroll restoration so closing
  // the drawer does not jump the page back to its prior scroll
  // position. The value is restored in `teardownMount` from
  // `state.scrollRestorationBackup`. The guard `backup === null`
  // makes the open-then-re-open path idempotent: a second mount
  // (e.g. after `setActiveSnapPoint`) sees the backup already
  // populated and skips the second `scrollRestoration` write, while
  // the prior teardown has already cleared the backup.
  if (open && options.preventScrollRestoration) {
    state.restoreScrollRestoration = lockScrollRestoration()
  }

  // Phase E: viewport / mobile-keyboard pipeline. When the consumer
  // sets `repositionInputs: true` (reposition the drawer so focused
  // inputs stay above the keyboard) or `fixed: true` (shrink the
  // drawer height instead of repositioning), the dialog attaches a
  // `window.visualViewport.resize` listener that recomputes the
  // drawer's `style.bottom` and `style.height` via
  // `getViewportDrivenDrawerLayout` (the pure math in
  // `runtime/viewport.ts`).
  //
  // Lifecycle:
  //   - Attaches only when the drawer is `open` (closing detaches
  //     the listener via the `state.cleanups` teardown array).
  //   - Guards on `window.visualViewport` (jsdom + desktop do not
  //     expose it). When the API is absent, the layout is the
  //     default CSS-driven position and no math runs.
  //   - Re-attaches on every mount. The registry re-renders the
  //     dialog on `setActiveSnapPoint` / `setOpen`, so the listener
  //     closure always sees the current `options.activeSnapPoint`.
  if (
    open &&
    (options.repositionInputs !== false || options.fixed) &&
    typeof window !== 'undefined' &&
    window.visualViewport
  ) {
    const visualViewport = window.visualViewport
    const listenerDirection = getDirection(options)
    // Phase E scope limitation: a dedicated `isMobileFirefox` helper
    // is a follow-up. The in-line user-agent regex keeps the
    // layout math working without an extra module.
    const listenerIsMobileFirefox = /firefox|fxios/i.test(navigator.userAgent)

    const onVisualViewportResize = () => {
      const contentEl = state.content
      if (!contentEl) return
      const focusedElement = document.activeElement
      if (!state.keyboardIsOpen && (!isKeyboardInput(focusedElement) || !contentEl.contains(focusedElement))) {
        return
      }

      // Re-read the active snap from the closure-captured `options`
      // so a snap change that did not re-render (e.g. the registry
      // patched `runtime.options` in place) still surfaces here.
      // The registry re-renders on `setActiveSnapPoint`, so a
      // fresh listener is attached with the new value in the
      // common case; this read is the safety net.
      const liveOptions = state.options
      const snapPoints = getSnapPoints(liveOptions)
      const activeSnapPoint = getActiveSnapPoint(liveOptions)
      let snapPointOffset = 0
      if (snapPoints && activeSnapPoint !== null) {
        // G3: pass the container so the snap math uses the
        // container's bounding rect when set.
        snapPointOffset = getSnapPointOffset({
          snapPoint: activeSnapPoint,
          direction: listenerDirection,
          containerSize: getContainerSize(liveOptions.container ?? liveOptions.mountElement ?? null)
        })
      }
      state.activeSnapPointOffset = snapPointOffset

      const verticalAxis = isVertical(listenerDirection)
      const totalSize = verticalAxis ? window.innerHeight : window.innerWidth
      const drawerSize = verticalAxis ? contentEl.offsetHeight : contentEl.offsetWidth
      // For a `bottom` / `right` drawer the natural top offset is
      // `total - drawer`; for `top` / `left` it is `0`. The math
      // helper uses this in the `isTallEnough` branch to compute
      // the new drawer height when the visual viewport shrinks.
      const offsetFromTop =
        listenerDirection === 'bottom' || listenerDirection === 'right' ? Math.max(totalSize - drawerSize, 0) : 0
      const visualViewportSize = verticalAxis ? visualViewport.height : visualViewport.width

      const layout = getViewportDrivenDrawerLayout({
        visualViewportHeight: visualViewportSize,
        totalHeight: totalSize,
        drawerHeight: drawerSize,
        offsetFromTop,
        fixed: liveOptions.fixed === true,
        previousDiffFromInitial: state.previousDiffFromInitial,
        keyboardIsOpen: state.keyboardIsOpen,
        initialDrawerHeight: state.initialDrawerHeight,
        activeSnapPointOffset: snapPointOffset,
        isMobileFirefox: listenerIsMobileFirefox,
        windowTopOffset: WINDOW_TOP_OFFSET
      })

      state.keyboardIsOpen = layout.nextKeyboardIsOpen
      state.previousDiffFromInitial = layout.diffFromInitial
      state.initialDrawerHeight = layout.nextInitialDrawerHeight

      // `repositionInputs: true` writes `bottom` (the keyboard pushes
      // the drawer up). `fixed: true` only writes `height` (the
      // drawer's height shrinks by the keyboard height). The runtime
      // helper always returns a `bottom`; the dialog decides whether
      // to forward it. `height` may be `null` (no layout override
      // needed) — in that case we leave the CSS-driven height alone.
      const layoutStyles: Record<string, string> = {}
      if (liveOptions.repositionInputs !== false) {
        layoutStyles.bottom = layout.bottom
      }
      if (layout.height !== null) {
        layoutStyles.height = layout.height
      }
      set(contentEl, layoutStyles)
    }

    visualViewport.addEventListener('resize', onVisualViewportResize)
    state.cleanups.push(() => {
      visualViewport.removeEventListener('resize', onVisualViewportResize)
    })
  }

  if (open && options.modal !== false) {
    state.previouslyFocused = (document.activeElement as HTMLElement | null) ?? null
    // F6: iOS Safari body-scroll prevention (1:1 with vaul upstream).
    // - `preventBodyScroll` returns a restore function that handles
    //   both the desktop `overflow: hidden` baseline AND the
    //   6-step Mobile Safari workaround. The restore is stored on
    //   state so `teardownMount` can call it on close.
    // - `setPositionFixed` is the separate body-position trick
    //   Safari needs to avoid several jank bugs (vaul#435, vaul#433).
    //   It's a no-op off Safari.
    // Fixed positioning must be acquired before the iOS lock scrolls
    // the viewport to zero, otherwise it captures the wrong position.
    // G12: 1:1 with vaul upstream — `setPositionFixed` only runs
    // after the drawer has been opened at least once. On the very
    // first open (typically with `defaultOpen: true`), the Safari
    // toolbar is already shown, so forcing `position: fixed` is
    // unnecessary and can cause a visible shift. Mirrors vaul's
    // `nested || !hasBeenOpened` early-return in `usePositionFixed`.
    if (hasBeenOpened && options.nested !== true) {
      // Avoid for standalone mode (PWA) per vaul upstream.
      const isStandalone =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches
      if (!isStandalone) {
        state.restoreBodyPosition = setPositionFixed({
          isOpen: true,
          // We're inside the `options.modal !== false` branch
          // (line 2104), so this is always `true` here.
          modal: true,
          noBodyStyles: options.noBodyStyles === true
        })
      }
    }
    state.unlockBodyScroll = preventBodyScroll({
      disablePreventScroll: options.disablePreventScroll === true,
      modal: true,
      isOpen: true
    })
    // G8: 1:1 with vaul upstream — while the drawer is open, set
    // `html { scroll-behavior: auto }` to override any consumer
    // `html { scroll-behavior: smooth }` (otherwise a hash-change
    // triggered by the drawer would smooth-scroll and fight the
    // open animation). Shared ownership restores the original value
    // after the final modal drawer releases it.
    state.restoreScrollBehavior = lockDocumentScrollBehavior()
    // Beta.4 fix: the previous implementation
    // ALWAYS called `focusFirstElement(content)`, which auto-focused
    // the first focusable descendant of the drawer body (a link,
    // a button, a form field). v2's default behaviour was the
    // opposite: by default (`autoFocus: false`) the trigger was
    // blurred before opening and the dialog body was NOT auto-
    // focused — focus stayed on the trigger (or fell back to
    // `document.body` for keyboard / screen-reader users). The
    // consumer (easytrip) reported the regression: opening the
    // support drawer auto-focused the WhatsApp link, which looks
    // like a stray hover/focus state.
    //
    // The fix preserves v2's default: only auto-focus when the
    // consumer explicitly opts in via `autoFocus: true`. The
    // `releaseHiddenFocusBeforeOpen` helper (called from the
    // registry BEFORE this mount, gated on `!options.autoFocus`)
    // already blurs the trigger so the dialog never appears
    // focused inside. Screen-reader and keyboard users can still
    // Tab into the content; the focus trap in `trapFocus` keeps
    // focus inside the dialog while it is open.
    if (options.autoFocus === true && state.content) {
      focusFirstElement(state.content)
    }
  }

  const mountedContent = state.content
  const mountedOverlay = state.overlay
  if (snapEntranceTransform !== null || snapEntranceOverlayOpacity !== null) {
    window.requestAnimationFrame(() => {
      if (
        snapEntranceTransform !== null &&
        mountedContent?.isConnected &&
        state.content === mountedContent &&
        mountedContent.dataset.state === 'open'
      ) {
        void mountedContent.offsetHeight
        mountedContent.style.transition = `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
        mountedContent.style.transform = snapEntranceTransform
      }
      if (
        snapEntranceOverlayOpacity !== null &&
        mountedOverlay?.isConnected &&
        state.overlay === mountedOverlay &&
        mountedOverlay.dataset.state === 'open'
      ) {
        mountedOverlay.style.transition = `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
        mountedOverlay.style.opacity = snapEntranceOverlayOpacity
      }
    })
  }
  if (mountedContent?.dataset.drawerAnimate === 'false' || mountedOverlay?.dataset.drawerAnimate === 'false') {
    window.requestAnimationFrame(() => {
      if (mountedContent?.isConnected) mountedContent.dataset.drawerAnimate = 'true'
      if (mountedOverlay?.isConnected) mountedOverlay.dataset.drawerAnimate = 'true'
    })
  }
  state.hasMounted = true
  state.mountedOptions = options
}

/**
 * Phase E: destroy-time teardown hook. The host module calls this
 * before removing the host element from the DOM so the dialog can
 * run the cleanup paths that `teardownMount` would normally run on
 * the next `mountVanillaDialog` call.
 *
 * The `mountVanillaDialog` -> `teardownMount` pair covers the open
 * -> close lifecycle (close re-mounts the dialog with `open: false`,
 * which triggers teardown at the top of the next mount). The
 * destroy path (`destroyDrawer` / `destroyDrawers` in the registry)
 * skips that re-mount — it removes the host element directly. This
 * hook bridges the gap: it runs the same teardown the close path
 * would, so:
 *   - the `visualViewport.resize` listener is detached (its
 *     `removeEventListener` is in the cleanups array);
 *   - `history.scrollRestoration` is restored from the backup
 *     captured when the drawer opened with
 *     `preventScrollRestoration: true`;
 *   - the cached viewport / keyboard state is reset.
 *
 * The host is unchanged by the call (no element is removed here);
 * the host module owns the DOM removal.
 */
export function destroyVanillaDialog(host: HTMLElement): void {
  const state = hostState.get(host)
  if (state) {
    teardownMount(state)
  }
}
