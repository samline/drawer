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
//   - The portal target: a small `<div data-drawer-vanilla-root>`
//     inside the host that holds the dialog (overlay + content).
//   - The trigger button when `triggerText` is provided.
//   - Focus trap + initial focus when the dialog opens (modal=true).
//   - Escape key handling.
//   - Click-outside / backdrop dismiss.
//   - Body scroll lock while open.
//   - ARIA wiring (role="dialog", aria-modal, aria-labelledby,
//     aria-describedby).
//   - The `data-state` and `data-drawer-animate` attributes the
//     stylesheet consumes to drive the open/close animation.
//   - Inert siblings while the modal is open.
//
// What this module does NOT own:
//   - The controller (state, snap-point math, drag math) — lives in
//     `core/` and `runtime/`.
//   - The drag / release / snap-point logic itself — the host wires
//     pointer listeners on the content element and forwards events
//     back through the callback API. This module only mounts the
//     DOM and manages the focus / escape / click-outside contract.

import type { CommonDrawerDirection, CommonDrawerSnapPoint } from '../core'
import {
  CLOSE_THRESHOLD,
  NESTED_DISPLACEMENT,
  SCROLL_LOCK_TIMEOUT,
  TRANSITIONS,
  VELOCITY_THRESHOLD,
  WINDOW_TOP_OFFSET
} from '../constants'
import { isVertical, set } from '../helpers'
import { getDraggableOffset, getDraggedDistance, getDragPercentage } from '../runtime/drag'
import { getDragPermission, getDragTargetMetadata, type DragTargetMetadata } from '../runtime/drag-policy'
import { getNextHandleState } from '../runtime/handle'
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
  getScaleTranslateTransform
} from '../runtime/transforms'
import { getViewportDrivenDrawerLayout } from '../runtime/viewport'
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
  // Phase B: snap-point context. `null` when no snap points are
  // configured; otherwise the values captured at `pointerdown` and
  // reused across the entire drag.
  activeSnapPointOffset: number | null
  activeSnapPointIndex: number | null
  snapPointsOffset: number[]
  shouldFade: boolean
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
  bodyOverflowBackup: string | null
  bodyPaddingRightBackup: string | null
  openedAt: number | null
  drag: DragState | null
  // Phase C: background-scale pipeline. `baseScale` is captured at
  // open time so the drag/release math has a single source of truth
  // for the rest-state scale. `clearTimeout` is the pending handle
  // for the `TRANSITIONS.DURATION` deferred clear after a close
  // release; we cancel it on teardown to avoid touching a wrapper
  // that no longer belongs to this drawer.
  backgroundScale: {
    baseScale: number
    clearTimeout: ReturnType<typeof setTimeout> | null
  } | null
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
  scrollRestorationBackup: string | null
}

const hostState = new WeakMap<HTMLElement, DialogMountState>()

function getHostState(host: HTMLElement): DialogMountState {
  let state = hostState.get(host)
  if (!state) {
    state = {
      trigger: null,
      overlay: null,
      content: null,
      handle: null,
      title: null,
      description: null,
      body: null,
      closeButton: null,
      previouslyFocused: null,
      cleanups: [],
      bodyOverflowBackup: null,
      bodyPaddingRightBackup: null,
      openedAt: null,
      drag: null,
      backgroundScale: null,
      keyboardIsOpen: false,
      previousDiffFromInitial: 0,
      initialDrawerHeight: 0,
      activeSnapPointOffset: 0,
      scrollRestorationBackup: null
    }
    hostState.set(host, state)
  }
  return state
}

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
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
  const viewportSize = isVertical(direction) ? window.innerHeight : window.innerWidth
  if (viewportSize <= 0) return 1
  return (viewportSize - NESTED_DISPLACEMENT) / viewportSize
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
  baseScale,
  clearBackgroundColor
}: {
  wrapper: HTMLElement
  direction: CommonDrawerDirection
  baseScale: number
  clearBackgroundColor: boolean
}) {
  const resetState = getBackgroundResetState({ direction, baseScale })
  set(wrapper, {
    ...resetState,
    transitionProperty: 'transform, border-radius',
    transitionDuration: `${TRANSITIONS.DURATION}s`,
    transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
    // `setBackgroundColorOnScale` only writes during drag; on release
    // we strip the inline color so the consumer's CSS wins back.
    ...(clearBackgroundColor ? { backgroundColor: '' } : {})
  })
}

/**
 * Schedule the deferred inline-style clear. After
 * `TRANSITIONS.DURATION` the wrapper is stripped of every inline
 * style we wrote so it lands in the NORMAL state (consumer's CSS).
 * Any prior pending clear is cancelled so the wrappers do not pile
 * up timeouts when the user reopens the drawer within the window.
 */
function scheduleWrapperClear(wrapper: HTMLElement, state: DialogMountState) {
  if (!state.backgroundScale) return
  const existing = state.backgroundScale.clearTimeout
  if (existing !== null) {
    clearTimeout(existing)
  }
  const handle = setTimeout(() => {
    wrapper.removeAttribute('style')
    if (state.backgroundScale) {
      state.backgroundScale.clearTimeout = null
    }
  }, TRANSITIONS.DURATION * 1000)
  state.backgroundScale.clearTimeout = handle
}

function cancelPendingWrapperClear(state: DialogMountState) {
  const existing = state.backgroundScale?.clearTimeout
  if (existing !== undefined && existing !== null) {
    clearTimeout(existing)
    if (state.backgroundScale) state.backgroundScale.clearTimeout = null
  }
}

/**
 * True when the wrapper currently carries any of the inline styles
 * the drag pipeline writes. Used by `mountVanillaDialog` to decide
 * whether a programmatic close needs to animate the wrapper back to
 * NORMAL (the user dragged, then closed via a non-drag path) or
 * whether the wrapper is already at rest and should be left alone.
 */
function wrapperHasInlineStyles(wrapper: HTMLElement): boolean {
  return Boolean(
    wrapper.style.transform ||
    wrapper.style.borderRadius ||
    wrapper.style.overflow ||
    wrapper.style.transformOrigin ||
    wrapper.style.backgroundColor
  )
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

/**
 * Read the accessible text from a root element by id, falling back
 * to the element's own text.
 */
function readAccessibleTextFromRoot(root: HTMLElement | null, elementId?: string): string | undefined {
  if (!root || !elementId) return undefined
  if (root.id === elementId) return root.textContent?.trim() || undefined
  const found = root.querySelector(`#${CSS.escape(elementId)}`)
  if (found && found.textContent) return found.textContent.trim() || undefined
  return undefined
}

function getDirection(options: VanillaDrawerOptions): CommonDrawerDirection {
  return (options.direction ?? 'bottom') as CommonDrawerDirection
}

function getSnapPoints(options: VanillaDrawerOptions): CommonDrawerSnapPoint[] | undefined {
  return options.snapPoints
}

function getActiveSnapPoint(options: VanillaDrawerOptions): CommonDrawerSnapPoint | null {
  if (options.activeSnapPoint !== undefined) return options.activeSnapPoint
  return options.snapPoints?.[0] ?? null
}

/**
 * Resolve the viewport size to feed the snap-point runtime helpers.
 * Returns `{width: 0, height: 0}` in non-DOM environments (so the
 * helpers degrade to `NaN` offsets, which the dialog treats as
 * "no snap points configured" downstream).
 */
function getContainerSize() {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
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
 * Tear down the previous dialog mount inside `host`. Removes the
 * overlay / content / trigger and detaches every listener. Also blurs
 * the old trigger so a click that triggered this teardown does not
 * leave the old focused element behind. jsdom and real browsers
 * are consistent here, but the explicit `blur` is defensive — the
 * runtime should not depend on the host's focus management.
 */
/**
 * Bug fix (v3.0.0-beta.3 → stable): the previous implementation
 * ALWAYS called `teardownMount` and re-mounted the dialog, even
 * for the trivial open→close transition. The new elements were
 * created with `data-state="closed"` from the start (so the
 * static `transform: translate3d(...)` rule positioned them
 * off-screen immediately), and the CSS `slideToRight` /
 * `slideToBottom` / etc. close animations never played. The
 * drawer just vanished on close.
 *
 * For the simple open→close transition we now keep the existing
 * DOM in place and flip `data-state` to `"closed"` so the CSS
 * close animation can run. The DOM teardown is deferred to the
 * `animationend` event so listeners stay attached during the
 * animation (the close button / form inputs / overlay mouseup
 * continue to work — see `.agents/issues/2026-07-26-close-button-click-suppressed-by-pointer-capture.md`).
 *
 * The listener teardown, body-scroll-lock restore, and focus
 * restoration happen immediately (so the visualViewport listener
 * etc. are detached synchronously, matching v2 behaviour), but
 * the DOM nodes themselves stay in the tree until the animation
 * completes.
 *
 * Every other transition (closed→open, open→open on option change,
 * destroy, etc.) still goes through the standard teardown +
 * re-mount path because the option set may have changed and the
 * existing elements no longer reflect the desired DOM contract.
 */
function teardownMount(state: DialogMountState, opts: { deferDom?: boolean } = {}) {
  // Step 1 — run every cleanup callback registered on the state.
  // This detaches every event listener the mount installed (visualViewport
  // resize, scroll restoration, overlay mouseup, keydown, pointerdown,
  // pointermove, pointerup, handle click, etc.) and clears the
  // cleanup array. After this returns, no listener owned by this
  // dialog will fire on subsequent events.
  for (const cleanup of state.cleanups) cleanup()
  state.cleanups = []

  // Step 2 — restore the page-level side-effects we own (focus,
  // body scroll lock, history scroll restoration, viewport state).
  if (state.trigger && document.activeElement === state.trigger) {
    if (typeof state.trigger.blur === 'function') state.trigger.blur()
  }
  if (state.previouslyFocused && document.contains(state.previouslyFocused)) {
    state.previouslyFocused.focus?.()
  }
  state.previouslyFocused = null
  if (state.bodyOverflowBackup !== null) {
    document.body.style.overflow = state.bodyOverflowBackup
    state.bodyOverflowBackup = null
  }
  if (state.bodyPaddingRightBackup !== null) {
    document.body.style.paddingRight = state.bodyPaddingRightBackup
    state.bodyPaddingRightBackup = null
  }
  if (state.scrollRestorationBackup !== null) {
    if (typeof window !== 'undefined' && window.history) {
      window.history.scrollRestoration = state.scrollRestorationBackup as ScrollRestoration
    }
    state.scrollRestorationBackup = null
  }
  state.keyboardIsOpen = false
  state.previousDiffFromInitial = 0
  state.initialDrawerHeight = 0
  state.activeSnapPointOffset = 0
  state.drag = null
  state.openedAt = null

  // Step 3 — cancel the wrapper-clear timer and remove the DOM
  // nodes. The wrapper-clear timer is intentionally only cancelled
  // in the FULL teardown path (not the close-only path with
  // `deferDom: true`) because the close-only path needs the
  // wrapper's CSS transition to complete after the drag-release
  // pipeline wrote the inline rest styles.
  if (opts.deferDom) {
    // On the close-only path, keep `state.backgroundScale` populated
    // until the DOM removal runs so `scheduleWrapperClear`'s
    // pending timer can still touch the wrapper. The timer reads
    // `state.backgroundScale.clearTimeout` to no-op itself once
    // it fires; clearing `state.backgroundScale` here would
    // make the timer's existence check fail and leave the
    // wrapper with stale inline styles. The DOM removal block
    // below is the one place that cancels the timer.
    return
  }
  cancelPendingWrapperClear(state)
  state.backgroundScale = null
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
}

function buildTitleContent(
  state: DialogMountState,
  options: VanillaDrawerOptions,
  resolvedContent: HTMLElement | undefined
) {
  if (!state.title) return
  const title = state.title
  title.innerHTML = ''

  const proxyTitle =
    title == null && resolvedContent ? readAccessibleTextFromRoot(resolvedContent, options.ariaLabelledBy) : undefined
  const proxyDescription =
    title == null && resolvedContent ? readAccessibleTextFromRoot(resolvedContent, options.ariaDescribedBy) : undefined

  const showTitle = options.title !== undefined
  const showDescription = options.description !== undefined
  const showProxyTitle = !showTitle && Boolean(proxyTitle ?? options.ariaLabel)
  const showProxyDescription = !showDescription && Boolean(proxyDescription)

  // Title
  if (showProxyTitle) {
    const proxy = proxyTitle ?? options.ariaLabel ?? ''
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
    if (showProxyDescription && proxyDescription) {
      desc.appendChild(document.createTextNode(proxyDescription))
    } else if (showDescription) {
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

function buildBodyContent(state: DialogMountState, options: VanillaDrawerOptions) {
  if (!state.body) return
  const body = state.body
  body.innerHTML = ''
  if (options.content === undefined) return
  const resolved = resolveRenderable(options.content)
  if (resolved.text !== undefined) {
    body.appendChild(document.createTextNode(resolved.text))
  } else if (resolved.element) {
    body.appendChild(resolved.element)
  } else if (resolved.container) {
    body.appendChild(resolved.container)
  }
}

function applyOpenState(state: DialogMountState, options: VanillaDrawerOptions, open: boolean) {
  if (state.overlay) {
    state.overlay.dataset.state = open ? 'open' : 'closed'
  }
  if (state.content) {
    state.content.dataset.state = open ? 'open' : 'closed'
    // `data-drawer-closing` is intentionally NOT touched here.
    // The runtime sets it before invoking this function on the
    // open→close path (see `mountVanillaDialog#isClosingOnly`) so
    // the CSS close-animation rule wins over the static off-screen
    // transform. The runtime clears it on `animationend`. If we
    // re-set it here we would lose that signal mid-animation.
    delete state.content.dataset.drawerClosing
  }
  if (state.handle) {
    state.handle.dataset.drawerVisible = open ? 'true' : 'false'
  }
  const direction = getDirection(options)
  if (state.content) state.content.dataset.drawerDirection = direction
  const snapPoints = getSnapPoints(options)
  const activeSnapPoint = getActiveSnapPoint(options)
  const fadeFromIndex = options.fadeFromIndex
  if (state.overlay) {
    state.overlay.dataset.drawerSnapPoints = snapPoints ? 'true' : 'false'
    state.overlay.dataset.drawerSnapPointsOverlay = shouldShowSnapOverlay(snapPoints, fadeFromIndex, activeSnapPoint)
      ? 'true'
      : 'false'
  }
  if (state.content) {
    state.content.dataset.drawerSnapPoints = snapPoints ? 'true' : 'false'
    state.content.dataset.drawerDelayedSnapPoints = 'false'
    state.content.dataset.drawerCustomContainer = 'false'
    state.content.dataset.drawerAnimate = 'true'
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

function trapFocus(state: DialogMountState, content: HTMLElement, event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const focusables = Array.from(
    content.querySelectorAll<HTMLElement>(
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
    )
  )
  if (focusables.length === 0) {
    event.preventDefault()
    return
  }
  const first = focusables[0]!
  const last = focusables[focusables.length - 1]!
  const active = document.activeElement
  if (event.shiftKey && active === first) {
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

function lockBodyScroll() {
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  if (document.body.style.overflow !== 'hidden') {
    document.body.style.overflow = 'hidden'
  }
  if (scrollbar > 0) {
    const existing = window.getComputedStyle(document.body).paddingRight
    document.body.style.paddingRight = `${parseFloat(existing || '0') + scrollbar}px`
  }
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

function attachListeners(
  state: DialogMountState,
  options: VanillaDrawerOptions,
  callbacks: {
    onOpenChange: VanillaDialogOptions['onOpenChange']
    onBuiltInTriggerMouseDown?: () => void
    onBuiltInTriggerClick?: () => void
    onDragChange?: (percentageDragged: number) => void
    onReleaseChange?: (open: boolean) => void
    onActiveSnapPointChange?: (snapPoint: CommonDrawerSnapPoint | null) => void
  }
) {
  if (state.trigger) {
    const trigger = state.trigger
    const onMouseDown = (event: MouseEvent) => {
      if (options.modal === false || options.autoFocus) return
      event.preventDefault()
      // `preventDefault` on a synthetic mousedown does not always
      // remove an already-focused element across DOM environments, so
      // we blur explicitly to match the Radix behaviour. The runtime
      // should not depend on the host's focus management.
      if (typeof trigger.blur === 'function') trigger.blur()
      callbacks.onBuiltInTriggerMouseDown?.()
    }
    const onClick = () => {
      // The trigger must not be the focused element while the dialog
      // is open. Blur it synchronously so the runtime that re-mounts
      // the dialog (and re-applies focus management) sees the trigger
      // already out of focus, regardless of which DOM environment the
      // host is running in.
      if (typeof trigger.blur === 'function') trigger.blur()
      callbacks.onBuiltInTriggerClick?.()
      callbacks.onOpenChange(true)
    }
    trigger.addEventListener('mousedown', onMouseDown)
    trigger.addEventListener('click', onClick)
    state.cleanups.push(() => {
      trigger.removeEventListener('mousedown', onMouseDown)
      trigger.removeEventListener('click', onClick)
    })
  }

  if (state.content && options.modal !== false) {
    const content = state.content
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && options.dismissible !== false) {
        event.preventDefault()
        callbacks.onOpenChange(false)
        return
      }
      if (event.key === 'Tab') {
        trapFocus(state, content, event)
      }
    }
    content.addEventListener('keydown', onKeyDown)
    state.cleanups.push(() => content.removeEventListener('keydown', onKeyDown))
  }

  if (state.overlay && options.dismissible !== false) {
    const overlay = state.overlay
    const onMouseUp = () => {
      callbacks.onOpenChange(false)
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
    const drawerDimension = isVerticalAxis ? window.innerHeight : window.innerWidth
    const closeThreshold = options.closeThreshold ?? CLOSE_THRESHOLD
    const scrollLockTimeout = options.scrollLockTimeout ?? SCROLL_LOCK_TIMEOUT
    const snapPoints = getSnapPoints(options)
    const activeSnapPoint = getActiveSnapPoint(options)
    const snapPointsOffset = getSnapPointsOffset({
      ...(snapPoints !== undefined ? { snapPoints } : {}),
      direction,
      containerSize: getContainerSize()
    })
    const activeSnapPointIndex = getActiveSnapPointIndex({
      ...(snapPoints !== undefined ? { snapPoints } : {}),
      activeSnapPoint
    })
    const activeSnapPointOffset =
      activeSnapPointIndex !== null && activeSnapPointIndex >= 0
        ? (snapPointsOffset[activeSnapPointIndex] ?? null)
        : null
    const initialShouldFade = getShouldFade({
      ...(snapPoints !== undefined ? { snapPoints } : {}),
      ...(options.fadeFromIndex !== undefined ? { fadeFromIndex: options.fadeFromIndex } : {}),
      activeSnapPoint
    })

    const onPointerDown = (rawEvent: Event) => {
      const event = rawEvent as DragPointerEvent

      // Bug fix (v3.0.0-beta.3 → stable): the previous implementation
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
      const isInteractiveChild =
        eventTarget instanceof Element &&
        eventTarget !== content &&
        (isInteractiveDragTarget(eventTarget) ||
          Boolean(eventTarget.closest('[data-drawer-close]')))

      if (isInteractiveChild) {
        return
      }

      const metadata: DragTargetMetadata = getDragTargetMetadata(event.target)
      const timeSinceOpenMs = state.openedAt !== null ? performance.now() - state.openedAt : null
      // `swipeAmount: null` lets the drag policy treat this as a
      // fresh pointerdown. The remaining fields (highlighted text,
      // last-prevented time, direction consistency) are inert here
      // but the policy signature requires them; we forward the
      // conservative defaults.
      const permission = getDragPermission({
        targetTagName: metadata.targetTagName,
        hasNoDragAttribute: metadata.hasNoDragAttribute,
        direction,
        timeSinceOpenMs,
        swipeAmount: null,
        hasHighlightedText: false,
        timeSinceLastPreventedMs: null,
        scrollLockTimeout,
        isDraggingInDirection: false,
        ancestors: metadata.ancestors
      })

      if (!permission.allow) {
        if (permission.updatePreventedAt) {
          state.drag = state.drag
            ? { ...state.drag, lastTimeDragPrevented: performance.now() }
            : {
                pointerStart: { x: event.clientX, y: event.clientY },
                pointerStartTimeStamp: event.timeStamp || performance.now(),
                startedAt: performance.now(),
                draggedDistance: 0,
                isDraggingDown: false,
                snapPointOffset: 0,
                lastTimeDragPrevented: performance.now(),
                pointerId: event.pointerId,
                activeSnapPointOffset,
                activeSnapPointIndex,
                snapPointsOffset,
                shouldFade: initialShouldFade
              }
        }
        return
      }

      // Capture the pointer only after the drag pipeline has decided
      // to start a drag. `setPointerCapture` redirects subsequent
      // pointer events to `event.currentTarget` (the content element)
      // for the lifetime of the gesture; capturing before the
      // permission check would suppress `click` events on interactive
      // children like the close button (mouseup would land on
      // `content` instead of the original target, and the browser
      // would not synthesize a click on the button).
      //
      // `setPointerCapture` is not implemented in jsdom, so we guard
      // the call. Real browsers do, so the production drag pipeline
      // keeps working; the integration test simulates pointer events
      // directly on the content element.
      const capture = event.currentTarget?.setPointerCapture
      if (typeof capture === 'function') {
        try {
          capture.call(event.currentTarget, event.pointerId)
        } catch {
          // Some browsers throw if the pointer id is no longer active.
          // The drag pipeline tolerates the loss: `pointermove` /
          // `pointerup` will fall through to the global listeners.
        }
      }

      state.drag = {
        pointerStart: { x: event.clientX, y: event.clientY },
        pointerStartTimeStamp: event.timeStamp || performance.now(),
        startedAt: performance.now(),
        draggedDistance: 0,
        isDraggingDown: false,
        snapPointOffset: 0,
        lastTimeDragPrevented: 0,
        pointerId: event.pointerId,
        activeSnapPointOffset,
        activeSnapPointIndex,
        snapPointsOffset,
        shouldFade: initialShouldFade
      }

      const onPointerMove = (moveRaw: Event) => {
        const moveEvent = moveRaw as DragPointerEvent
        const drag = state.drag
        if (!drag) return
        const currentPointer = isVerticalAxis ? moveEvent.clientY : moveEvent.clientX
        const draggedDistance = getDraggedDistance({
          pointerStart: isVerticalAxis ? drag.pointerStart.y : drag.pointerStart.x,
          currentPointer,
          direction
        })
        const absDraggedDistance = Math.abs(draggedDistance)
        const isDraggingDown =
          direction === 'bottom' || direction === 'right' ? draggedDistance < 0 : draggedDistance > 0

        // Phase B: when snap points are configured, the inline
        // transform follows `getSnapDragValue` (offset, not value).
        // The percentage reported to the parent is the snap-point
        // percentage so the nested-drawer transform tracks the
        // active snap rather than the raw pixel drag.
        const hasSnapPoints = drag.snapPointsOffset.length > 0 && drag.activeSnapPointOffset !== null
        const snapPointPercentageDragged = hasSnapPoints
          ? getSnapPointPercentageDragged({
              ...(snapPoints !== undefined ? { snapPoints } : {}),
              activeSnapPointIndex: drag.activeSnapPointIndex,
              snapPointsOffset: drag.snapPointsOffset,
              ...(options.fadeFromIndex !== undefined ? { fadeFromIndex: options.fadeFromIndex } : {}),
              shouldFade: drag.shouldFade,
              absDraggedDistance,
              isDraggingDown
            })
          : null
        const { percentageDragged } = getDragPercentage({
          draggedDistance,
          drawerDimension,
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

        // Phase B: fade the overlay while dragging between snap
        // points when the active snap is at or one-below the
        // configured `fadeFromIndex`. The original React
        // implementation writes `1 - percentageDragged` so the
        // overlay lightens as the user drags toward the smaller
        // snap. Outside the fade window the CSS rule keeps the
        // overlay hidden; we skip the inline write so the CSS
        // transition stays in charge.
        if (
          hasSnapPoints &&
          state.overlay &&
          (drag.shouldFade || drag.activeSnapPointIndex === (options.fadeFromIndex ?? -1) - 1)
        ) {
          set(state.overlay, {
            opacity: `${1 - percentageDragged}`,
            transition: 'none'
          })
        }

        // Phase C: scale the page wrapper along the drag. We look
        // up the wrapper on every move (cheap query) and forward
        // the percentage to `applyWrapperDragState` which writes
        // `transition: 'none'` so the inline transform is instant
        // and tracks the finger. The wrapper's CSS transition is
        // re-enabled on release by the release handlers below.
        if (options.shouldScaleBackground && state.backgroundScale) {
          const wrapper = getWrapperElement()
          if (wrapper) {
            applyWrapperDragState({
              wrapper,
              baseScale: state.backgroundScale.baseScale,
              percentageDragged,
              direction,
              setBackgroundColorOnScale: options.setBackgroundColorOnScale === true
            })
          }
        }

        callbacks.onDragChange?.(percentageDragged)
      }

      const onPointerUp = (upRaw: Event) => {
        const upEvent = upRaw as DragPointerEvent
        const drag = state.drag
        state.drag = null
        content.removeEventListener('pointermove', onPointerMove)
        content.removeEventListener('pointerup', onPointerUp)
        if (!drag) return

        const releasedPointer = isVerticalAxis ? upEvent.clientY : upEvent.clientX
        const draggedDistance = getDraggedDistance({
          pointerStart: isVerticalAxis ? drag.pointerStart.y : drag.pointerStart.x,
          currentPointer: releasedPointer,
          direction
        })
        const now = performance.now()
        const velocity = Math.abs(draggedDistance) / Math.max(now - drag.startedAt, 1)

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
            ...(options.fadeFromIndex !== undefined ? { fadeFromIndex: options.fadeFromIndex } : {}),
            direction,
            activeSnapPointOffset: drag.activeSnapPointOffset,
            activeSnapPointIndex: drag.activeSnapPointIndex,
            snapPointsOffset: drag.snapPointsOffset,
            snapPointsCount: drag.snapPointsOffset.length,
            draggedDistance,
            velocity,
            dismissible: options.dismissible !== false,
            ...(options.snapToSequentialPoint !== undefined
              ? { snapToSequentialPoint: options.snapToSequentialPoint }
              : {}),
            velocityThreshold: VELOCITY_THRESHOLD,
            viewportSize: drawerDimension
          })

          if (release.type === 'close') {
            set(content, { transition: 'none' })
            // Phase C: drive the wrapper back to its rest state
            // with the CSS transition enabled, then schedule the
            // deferred inline-style clear. The re-render triggered
            // by `onOpenChange(false)` will hit `mountVanillaDialog`
            // which re-asserts the same reset state (the timer
            // handle is reused so we only clear once).
            if (options.shouldScaleBackground && state.backgroundScale) {
              const wrapper = getWrapperElement()
              if (wrapper) {
                applyWrapperOpenState({
                  wrapper,
                  direction,
                  baseScale: state.backgroundScale.baseScale,
                  clearBackgroundColor: options.setBackgroundColorOnScale === true
                })
                scheduleWrapperClear(wrapper, state)
              }
            }
            callbacks.onOpenChange(false)
            callbacks.onReleaseChange?.(false)
            return
          }

          if (release.type === 'snap' && typeof release.targetOffset === 'number') {
            const matchedSnapPoint = findSnapPointByOffset(snapPoints, drag.snapPointsOffset, release.targetOffset)
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
              if (options.shouldScaleBackground && state.backgroundScale) {
                const wrapper = getWrapperElement()
                if (wrapper) {
                  applyWrapperOpenState({
                    wrapper,
                    direction,
                    baseScale: state.backgroundScale.baseScale,
                    clearBackgroundColor: options.setBackgroundColorOnScale === true
                  })
                }
              }
              callbacks.onActiveSnapPointChange?.(matchedSnapPoint)
            } else {
              // No matching snap (degenerate viewport). Reset the
              // inline transform so the drawer stays at the active
              // snap.
              set(content, {
                transform: getAxisAwareTranslate(direction, drag.activeSnapPointOffset ?? 0),
                transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
              })
              if (options.shouldScaleBackground && state.backgroundScale) {
                const wrapper = getWrapperElement()
                if (wrapper) {
                  applyWrapperOpenState({
                    wrapper,
                    direction,
                    baseScale: state.backgroundScale.baseScale,
                    clearBackgroundColor: options.setBackgroundColorOnScale === true
                  })
                }
              }
            }
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
          if (options.shouldScaleBackground && state.backgroundScale) {
            const wrapper = getWrapperElement()
            if (wrapper) {
              applyWrapperOpenState({
                wrapper,
                direction,
                baseScale: state.backgroundScale.baseScale,
                clearBackgroundColor: options.setBackgroundColorOnScale === true
              })
            }
          }
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
          drawerDimension,
          closeThreshold
        })

        if (release.action === 'close') {
          set(content, { transition: 'none' })
          // Phase C: drive the wrapper back to its rest state with
          // the CSS transition enabled, then schedule the deferred
          // clear. The re-render via `onOpenChange(false)` will
          // re-enter `mountVanillaDialog` which re-asserts the same
          // reset state (the timer is reused, so we only clear once).
          if (options.shouldScaleBackground && state.backgroundScale) {
            const wrapper = getWrapperElement()
            if (wrapper) {
              applyWrapperOpenState({
                wrapper,
                direction,
                baseScale: state.backgroundScale.baseScale,
                clearBackgroundColor: options.setBackgroundColorOnScale === true
              })
              scheduleWrapperClear(wrapper, state)
            }
          }
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
        if (options.shouldScaleBackground && state.backgroundScale) {
          const wrapper = getWrapperElement()
          if (wrapper) {
            applyWrapperOpenState({
              wrapper,
              direction,
              baseScale: state.backgroundScale.baseScale,
              clearBackgroundColor: options.setBackgroundColorOnScale === true
            })
          }
        }
        callbacks.onReleaseChange?.(true)
      }

      content.addEventListener('pointermove', onPointerMove)
      content.addEventListener('pointerup', onPointerUp)
      state.cleanups.push(() => {
        content.removeEventListener('pointermove', onPointerMove)
        content.removeEventListener('pointerup', onPointerUp)
      })
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

      const handleSnapPoints = getSnapPoints(options)
      const handleActiveSnapPoint = getActiveSnapPoint(options)
      const result = getNextHandleState({
        isDragging: state.drag !== null,
        preventCycle: options.preventCycle === true,
        shouldCancelInteraction: false,
        ...(handleSnapPoints !== undefined ? { snapPoints: handleSnapPoints } : {}),
        activeSnapPoint: handleActiveSnapPoint,
        dismissible: options.dismissible !== false
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
    onOpenChange,
    onBuiltInTriggerMouseDown,
    onBuiltInTriggerClick,
    onDragChange,
    onReleaseChange,
    onActiveSnapPointChange
  } = dialogOptions
  const state = getHostState(host)

  // Bug fix (v3.0.0-beta.3 → stable): the previous implementation
  // ALWAYS called `teardownMount` and re-mounted the dialog, even
  // for the trivial open→close transition. The new elements were
  // created with `data-state="closed"` from the start (so the
  // static `transform: translate3d(...)` rule positioned them
  // off-screen immediately), and the CSS `slideToRight` /
  // `slideToBottom` / etc. close animations never played. The
  // drawer just vanished on close.
  //
  // For the simple open→close transition we now keep the existing
  // DOM in place and flip `data-state` to `"closed"` so the CSS
  // close animation can run. The actual teardown is deferred to
  // the `animationend` event so listeners stay attached during the
  // animation (the close button / form inputs / overlay mouseup
  // continue to work — see `.agents/issues/2026-07-26-close-button-click-suppressed-by-pointer-capture.md`).
  //
  // Every other transition (closed→open, open→open on option change,
  // destroy, etc.) still goes through the standard teardown +
  // re-mount path because the option set may have changed and the
  // existing elements no longer reflect the desired DOM contract.
  const hadOpenMount = state.content !== null && state.content.dataset.state === 'open'
  const isClosingOnly = hadOpenMount && !open
  if (isClosingOnly) {
    // Phase C: programmatic close path. When the drawer is being
    // closed AND the page wrapper still carries any of the inline
    // styles the drag pipeline wrote, we need to animate the
    // wrapper back to NORMAL. The drag-release close path in
    // `onPointerUp` already does this; this branch covers the case
    // where the consumer closed the drawer via a non-drag path
    // (e.g. clicking a custom close button that calls
    // `controller.setOpen(false)`). When the wrapper is already
    // clean we leave it alone — the spec says programmatic
    // open/close must not change the wrapper's visual state.
    if (options.shouldScaleBackground) {
      const wrapper = getWrapperElement()
      if (wrapper && wrapperHasInlineStyles(wrapper)) {
        const baseScale = computeBaseScale(getDirection(options))
        state.backgroundScale = { baseScale, clearTimeout: null }
        applyWrapperOpenState({
          wrapper,
          direction: getDirection(options),
          baseScale,
          clearBackgroundColor: options.setBackgroundColorOnScale === true
        })
        scheduleWrapperClear(wrapper, state)
      }
    }
    // The CSS close-animation rule
    // `[data-state='closed'][data-drawer-closing]` overrides the
    // static off-screen transform so `slideToRight` has a clean
    // start frame (the open position) and the drawer visibly
    // slides out instead of jumping. The animation's `forwards`
    // fill-mode holds the closed position once it ends; the
    // `animationend` listener below clears the flag.
    applyOpenState(state, options, false)
    if (state.content) state.content.dataset.drawerClosing = 'true'
    // Detach listeners + restore page-level side-effects immediately
    // (matches v2 semantics; the visualViewport listener must come
    // off synchronously so the next `setOpen(true)` re-attaches a
    // fresh one with the current options). The DOM nodes themselves
    // stay in the tree until the close animation finishes — the
    // CSS animation needs the elements present to interpolate the
    // transform.
    teardownMount(state, { deferDom: true })
    // Schedule the DOM removal for after the close animation. If
    // the animation never ends (CSS animations disabled by a
    // consumer `data-drawer-animate="false"`, or the test
    // environment doesn't run animations), the safety timeout
    // still tears down.
    const target = state.content
    const removeDom = () => {
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
    }
    if (target) {
      const onAnimationEnd = () => {
        target.removeEventListener('animationend', onAnimationEnd)
        target.removeEventListener('animationcancel', onAnimationEnd)
        // Clear the closing flag so the static off-screen
        // transform rule takes over again (the animation's
        // `forwards` fill-mode is already holding the element at
        // the closed position; clearing the flag keeps the rule
        // consistent if the consumer re-opens before the timer
        // fires).
        delete target.dataset.drawerClosing
        // The drag-release pipeline (or `applyWrapperOpenState` on
        // programmatic close) may have scheduled a deferred
        // wrapper-clear timer via `scheduleWrapperClear`. That
        // timer outlives the dialog mount — it touches the page
        // wrapper, not the drawer — so it must NOT be cancelled
        // here. The original `teardownMount` cancelled it because
        // the dialog owned the wrapper, but on the close-only path
        // we already ran the immediate teardown which left
        // `state.backgroundScale` populated so the timer can fire.
        removeDom()
      }
      target.addEventListener('animationend', onAnimationEnd)
      target.addEventListener('animationcancel', onAnimationEnd)
      const safetyMs = (() => {
        const cs = window.getComputedStyle(target)
        const raw = cs.animationDuration || cs.transitionDuration || '0.5s'
        const n = parseFloat(raw)
        return (Number.isFinite(n) ? n * 1000 : 500) + 100
      })()
      window.setTimeout(onAnimationEnd, safetyMs)
    } else {
      removeDom()
    }
    return
  }

  // Tear down any prior mount before building the new one.
  teardownMount(state)

  // Phase C: programmatic close path. When the drawer is being
  // mounted with `open=false` AND the page wrapper still carries
  // any of the inline styles the drag pipeline writes, we need to
  // animate the wrapper back to NORMAL. The drag-release close
  // path in `onPointerUp` already does this; this branch covers
  // the case where the consumer closed the drawer via a non-drag
  // path (e.g. clicking a custom close button that calls
  // `controller.setOpen(false)`). When the wrapper is already
  // clean we leave it alone — the spec says programmatic
  // open/close must not change the wrapper's visual state.
  if (!open && options.shouldScaleBackground) {
    const wrapper = getWrapperElement()
    if (wrapper && wrapperHasInlineStyles(wrapper)) {
      const baseScale = computeBaseScale(getDirection(options))
      state.backgroundScale = { baseScale, clearTimeout: null }
      applyWrapperOpenState({
        wrapper,
        direction: getDirection(options),
        baseScale,
        clearBackgroundColor: options.setBackgroundColorOnScale === true
      })
      scheduleWrapperClear(wrapper, state)
    }
  }

  // Track when the drawer became open so the drag policy can enforce
  // the 500 ms grace period (the open animation is still running).
  if (open) {
    state.openedAt = performance.now()
  }

  // Phase C: capture the baseScale at open time. The drag pipeline
  // reads `state.backgroundScale.baseScale` on every pointermove, so
  // we need it populated before the first pointerdown can fire.
  // Per spec, the dialog stays NORMAL at open (no inline wrapper
  // styles) — the rest state is applied on the first drag move.
  if (open && options.shouldScaleBackground) {
    state.backgroundScale = {
      baseScale: computeBaseScale(getDirection(options)),
      clearTimeout: null
    }
  }

  const direction = getDirection(options)
  const snapPoints = getSnapPoints(options)
  const activeSnapPoint = getActiveSnapPoint(options)
  const shouldRenderHandle = Boolean(options.handleOnly || options.showHandle)
  const shouldRenderVanillaContent =
    options.title !== undefined || options.description !== undefined || options.content !== undefined
  const shouldRenderOverlay = options.modal !== false

  // --- Trigger button (inside the host) -------------------------------
  if (options.triggerText) {
    const trigger = createEl('button', {
      type: 'button',
      'data-drawer-vanilla-trigger': ''
    })
    trigger.appendChild(document.createTextNode(options.triggerText))
    host.appendChild(trigger)
    state.trigger = trigger
  }

  // --- Overlay -------------------------------------------------------
  if (shouldRenderOverlay) {
    const overlayShouldShow = shouldShowSnapOverlay(snapPoints, options.fadeFromIndex, activeSnapPoint)
    const overlay = createEl('div', {
      'data-drawer-overlay': '',
      'data-state': open ? 'open' : 'closed',
      'data-drawer-snap-points': snapPoints ? 'true' : 'false',
      'data-drawer-snap-points-overlay': overlayShouldShow ? 'true' : 'false',
      'data-drawer-animate': 'true'
    })
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
      'data-drawer-snap-points': snapPoints ? 'true' : 'false',
      'data-drawer-delayed-snap-points': 'false',
      'data-drawer-custom-container': 'false',
      'data-drawer-animate': 'true',
      role: 'dialog',
      'aria-modal': options.modal === false ? 'false' : 'true',
      tabIndex: -1
    })
    if (options.contentClassName) content.className = options.contentClassName
    // Place the drawer id on the [data-drawer] content wrapper for CSS/JS selector compat.
    content.id = id
    if (options.ariaLabel) content.setAttribute('aria-label', options.ariaLabel)
    if (snapPoints) {
      // Write the active snap's RUNTIME offset (the same value the
      // drag pipeline uses for `getSnapDragValue`). The CSS reads
      // `--initial-transform` to drive the open-state transform, so
      // keeping it in offset units ensures the inline drag transform
      // and the at-rest transform stay in the same coordinate system.
      // The default `100%` in the CSS rule is the closed-state fallback
      // and is harmless when a numeric offset is present.
      const initialOffset = activeSnapPoint
        ? getSnapPointOffset({
            snapPoint: activeSnapPoint,
            direction,
            containerSize: getContainerSize()
          })
        : 0
      content.style.setProperty('--initial-transform', `${initialOffset}px`)
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

    // Auto-set id on title/description slots when ariaLabelledBy/ariaDescribedBy
    // is provided but no matching element exists in the caller-supplied HTML.
    // This makes aria-labelledby / aria-describedby point to a real target.
    if (options.ariaLabelledBy) {
      titleEl.id = options.ariaLabelledBy
      content.setAttribute('aria-labelledby', options.ariaLabelledBy)
    } else {
      const autoTitleId = `${id}-title`
      titleEl.id = autoTitleId
      content.setAttribute('aria-labelledby', autoTitleId)
    }
    if (options.ariaDescribedBy) {
      descEl.id = options.ariaDescribedBy
      content.setAttribute('aria-describedby', options.ariaDescribedBy)
    } else {
      const autoDescId = `${id}-description`
      descEl.id = autoDescId
      content.setAttribute('aria-describedby', autoDescId)
    }

    const contentRoot =
      options.content instanceof HTMLElement
        ? options.content
        : typeof options.content === 'function'
          ? options.content()
          : undefined
    buildTitleContent(state, options, contentRoot instanceof HTMLElement ? contentRoot : undefined)
    buildBodyContent(state, options)

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

  attachListeners(state, options, {
    onOpenChange,
    ...(onBuiltInTriggerMouseDown !== undefined ? { onBuiltInTriggerMouseDown } : {}),
    ...(onBuiltInTriggerClick !== undefined ? { onBuiltInTriggerClick } : {}),
    ...(onDragChange !== undefined ? { onDragChange } : {}),
    ...(onReleaseChange !== undefined ? { onReleaseChange } : {}),
    ...(onActiveSnapPointChange !== undefined ? { onActiveSnapPointChange } : {})
  })

  applyOpenState(state, options, open)

  // Phase E: `preventScrollRestoration`. While the drawer is open we
  // disable the browser's automatic scroll restoration so closing
  // the drawer does not jump the page back to its prior scroll
  // position. The value is restored in `teardownMount` from
  // `state.scrollRestorationBackup`. The guard `backup === null`
  // makes the open-then-re-open path idempotent: a second mount
  // (e.g. after `setActiveSnapPoint`) sees the backup already
  // populated and skips the second `scrollRestoration` write, while
  // the prior teardown has already cleared the backup.
  if (open && options.preventScrollRestoration && typeof window !== 'undefined' && window.history) {
    if (state.scrollRestorationBackup === null) {
      const current = window.history.scrollRestoration
      if (current !== 'manual') {
        state.scrollRestorationBackup = current
        window.history.scrollRestoration = 'manual'
      }
    }
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
  if (open && (options.repositionInputs || options.fixed) && typeof window !== 'undefined' && window.visualViewport) {
    const visualViewport = window.visualViewport
    const listenerDirection = getDirection(options)
    // Phase E scope limitation: a dedicated `isMobileFirefox` helper
    // is a follow-up. The in-line user-agent regex keeps the
    // layout math working without an extra module.
    const listenerIsMobileFirefox = /firefox|fxios/i.test(navigator.userAgent)

    const onVisualViewportResize = () => {
      const contentEl = state.content
      if (!contentEl) return

      // Re-read the active snap from the closure-captured `options`
      // so a snap change that did not re-render (e.g. the registry
      // patched `runtime.options` in place) still surfaces here.
      // The registry re-renders on `setActiveSnapPoint`, so a
      // fresh listener is attached with the new value in the
      // common case; this read is the safety net.
      const snapPoints = getSnapPoints(options)
      const activeSnapPoint = getActiveSnapPoint(options)
      let snapPointOffset = 0
      if (snapPoints && activeSnapPoint !== null) {
        snapPointOffset = getSnapPointOffset({
          snapPoint: activeSnapPoint,
          direction: listenerDirection,
          containerSize: getContainerSize()
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
        fixed: options.fixed === true,
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
      if (options.repositionInputs) {
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
    lockBodyScroll()
    if (state.content) focusFirstElement(state.content)
  }
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
