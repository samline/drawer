import { attachListeners } from './dialog-gestures'
import type { DialogMountState, DialogCallbacks, VanillaDialogOptions } from './dialog-state'
export type { VanillaDialogOptions } from './dialog-state'
import {
  getDirection,
  getClosedTransform,
  getSnapPoints,
  getActiveSnapPoint,
  getFadeFromIndex,
  getContainerSize,
  shouldShowSnapOverlay
} from './dialog-layout'
import {
  getWrapperElement,
  acquireBackgroundScale,
  releaseBackgroundScale,
  restoreBackgroundScale
} from './dialog-background'
import {
  createEl,
  resolveRenderable,
  buildTitleContent,
  buildDescriptionContent,
  normalizeCloseButtonOptions,
  buildCloseButton,
  buildBodyContent
} from './dialog-content'
import {
  acquireModalIsolation,
  registerOpenDialog,
  removeFromOpenDialogStack,
  getTopOpenContent,
  focusFirstElement,
  resolveOpenDialogOrder
} from './dialog-focus'

// Vanilla dialog primitives. Direct DOM manipulation — no framework
// runtime, no virtual DOM, no peer dependencies. The runtime registry
// owns the controller state and delegates side effects (focus, body
// scroll lock, ARIA, animations) to this module through a small
// callback surface.
//
// The CSS contract: every element the stylesheet reads uses a
// `data-drawer*` attribute. The vanilla dialog modules own those selectors; the rest of the package uses
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

import { TRANSITIONS, WINDOW_TOP_OFFSET } from '../constants'
import { isVertical, set } from '../helpers'
import { getSnapPointOffset } from '../runtime/snap-points'
import { getAxisAwareTranslate } from '../runtime/transforms'
import { getViewportDrivenDrawerLayout } from '../runtime/viewport'
import {
  lockDocumentScrollBehavior,
  lockScrollRestoration,
  preventBodyScroll,
  setPositionFixed
} from '../runtime/scroll-lock'
import type { VanillaDrawerOptions } from './render'

const hostState = new WeakMap<HTMLElement, DialogMountState>()
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
      justReleasedTimer: null,
      releaseModalIsolation: null
    }
    hostState.set(host, state)
  }
  return state
}

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
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
    void event
    callbacks.onBuiltInTriggerMouseDown?.()
  }
  const onClick = () => {
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

/**
 * Detach listeners and release page-level ownership for a mount.
 * Full teardown also removes its DOM; `deferDom` keeps the closing
 * visual nodes until the exit timeout removes them.
 */
function teardownMount(state: DialogMountState, opts: { deferDom?: boolean } = {}) {
  if (!opts.deferDom) cancelCloseRemoval(state)
  removeFromOpenDialogStack(state)
  state.releaseModalIsolation?.()
  state.releaseModalIsolation = null
  // Step 1 — run every cleanup callback registered on the state.
  // This detaches every event listener the mount installed (visualViewport
  // resize, scroll restoration, overlay mouseup, keydown, pointerdown,
  // pointermove, pointerup, handle click, etc.) and clears the
  // cleanup array. After this returns, no listener owned by this
  // dialog will fire on subsequent events.
  //
  // F18 (memory hygiene): each cleanup runs inside its own try-catch.
  // A `removeEventListener` on a null or detached element throws
  // `TypeError: Cannot read properties of null`; in a partial-teardown
  // race (e.g. close + reopen during the 600 ms removeDom safety
  // window), one such throw used to abort the for-loop, leave the
  // remaining cleanups un-run, AND prevent the `state.cleanups = []`
  // write. The orphaned listeners retained `state` via closure
  // capture until the next `destroyDrawer` or page reload.
  for (const cleanup of state.cleanups) {
    try {
      cleanup()
    } catch (error) {
      // F18: log in development for consumer-side diagnostics; the
      // bug is usually an external DOM removal racing the teardown.
      // Production swallows to avoid breaking the rest of the
      // teardown path (which still has to release the body scroll
      // lock, focus, and history.scrollRestoration below).
      if (typeof console !== 'undefined') {
        console.warn('[@samline/drawer] cleanup threw during teardownMount:', error)
      }
    }
  }
  state.cleanups = []
  try {
    state.cleanupDragGesture?.()
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.warn('[@samline/drawer] cleanupDragGesture threw during teardownMount:', error)
    }
  }
  state.cleanupDragGesture = null
  try {
    state.cleanupBuiltInTrigger?.()
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.warn('[@samline/drawer] cleanupBuiltInTrigger threw during teardownMount:', error)
    }
  }
  state.cleanupBuiltInTrigger = null

  // Step 2 — restore the page-level side-effects we own (focus,
  // body scroll lock, history scroll restoration, viewport state).
  if (state.trigger && document.activeElement === state.trigger) {
    if (typeof state.trigger.blur === 'function') state.trigger.blur()
  }
  const otherOpenDrawer = getTopOpenContent()
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
    state.content.dataset.drawerCustomContainer = options.container ? 'true' : 'false'
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
    containerSize: getContainerSize(options.container ?? null)
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
function isKeyboardInput(element: Element | null): boolean {
  if (element instanceof HTMLTextAreaElement) return true
  if (element instanceof HTMLElement && element.isContentEditable) return true
  if (!(element instanceof HTMLInputElement)) return false
  return !new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']).has(
    element.type
  )
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
  const resolvedOpenOrder = open ? resolveOpenDialogOrder(openOrder, state.openOrder) : null
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
  const shouldRenderOverlay = options.overlay ?? options.modal !== false
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
      'data-drawer-custom-container': options.container ? 'true' : 'false',
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
              containerSize: getContainerSize(options.container ?? null)
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
      const handle = createEl('button', {
        type: 'button',
        'data-drawer-handle': '',
        'data-drawer-visible': open ? 'true' : 'false',
        'aria-label': options.handleAriaLabel ?? 'Change drawer position'
      })
      if (options.handleClassName) handle.className = options.handleClassName
      const hitArea = createEl('span', { 'data-drawer-handle-hitarea': '', 'aria-hidden': 'true' })
      handle.appendChild(hitArea)
      content.appendChild(handle)
      state.handle = handle
    }

    // Conditional slots: `[data-drawer-title]` and
    // `[data-drawer-description]` only mount when the consumer
    // actually has content for them. The minimalist fallback
    // (and the proxy `ariaLabel` case) relies on `aria-label`
    // alone for the accessible name, so the title slot is
    // unnecessary there. Same for the description slot: when
    // no description is provided, neither the slot nor
    // `aria-describedby` is needed.
    const hasTitle = options.title !== undefined
    const hasDescription = options.description !== undefined

    let titleEl: HTMLDivElement | null = null
    let descEl: HTMLDivElement | null = null
    if (hasTitle) {
      titleEl = createEl('div', { 'data-drawer-title': '' })
    }
    if (hasDescription) {
      descEl = createEl('div', { 'data-drawer-description': '' })
    }

    // The simplified body wrapper. The title and description
    // slots (when present) are children of the body so consumer
    // CSS can target the `[data-drawer-body]` subtree as a
    // single visual unit. Order inside the body: title →
    // description → consumer content.
    const bodyEl = createEl('div', { 'data-drawer-body': '' })
    state.title = titleEl
    state.description = descEl
    state.body = bodyEl
    if (titleEl) bodyEl.appendChild(titleEl)
    if (descEl) bodyEl.appendChild(descEl)
    content.appendChild(bodyEl)

    const resolvedBodyContent = resolveRenderable(options.content)

    // Default-props: when the consumer passed neither `title`
    // nor `ariaLabel`, auto-assign `ariaLabel = id` so the
    // dialog always has an accessible name. The fallback is
    // exposed via `aria-label` only (no `aria-labelledby`,
    // because the title slot is not rendered in this case).
    const resolvedAriaLabel = options.ariaLabel ?? (!hasTitle ? id : undefined)

    // Title wiring. The title slot exists only when the
    // consumer passed a visible `title`. When it does, the
    // slot is the `aria-labelledby` target (auto-generated id
    // or the consumer's `ariaLabelledBy` id). When the
    // consumer passed only `ariaLabelledBy` (without `title`),
    // no slot is created and the consumer is responsible for
    // the labelledby target in their content.
    if (titleEl) {
      if (options.ariaLabelledBy) {
        titleEl.id = options.ariaLabelledBy
      } else {
        titleEl.id = `${id}-title`
      }
      content.setAttribute('aria-labelledby', titleEl.id)
    } else if (options.ariaLabelledBy) {
      content.setAttribute('aria-labelledby', options.ariaLabelledBy)
    }
    // If neither titleEl nor ariaLabelledBy, no `aria-labelledby`
    // is set — the dialog relies on `aria-label` (from
    // `resolvedAriaLabel`) for the accessible name.

    // Description wiring. Mirrors the title: the slot exists
    // only when the consumer passed a `description`. The
    // `aria-describedby` attribute is OMITTED when no slot
    // exists and no `ariaDescribedBy` is provided, so a11y
    // linters don't see a reference to a missing target.
    if (descEl) {
      if (options.ariaDescribedBy) {
        descEl.id = options.ariaDescribedBy
      } else {
        descEl.id = `${id}-description`
      }
      content.setAttribute('aria-describedby', descEl.id)
    } else if (options.ariaDescribedBy) {
      content.setAttribute('aria-describedby', options.ariaDescribedBy)
    }

    // `aria-label` is set on the content whenever a resolved
    // `ariaLabel` exists — either the consumer passed it
    // explicitly, or the minimalist fallback assigned it to
    // the drawer id. This is the primary accessible name
    // source when no `aria-labelledby` is in play (the
    // title-slot case relies on `aria-labelledby` instead).
    if (resolvedAriaLabel) content.setAttribute('aria-label', resolvedAriaLabel)

    buildTitleContent(state, options)
    buildDescriptionContent(state, options)
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
  if (options.modal !== false) {
    state.releaseModalIsolation = acquireModalIsolation(state, host)
  }
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
          containerSize: getContainerSize(liveOptions.container ?? null)
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
    // Modal dialogs always receive initial focus so assistive
    // technology announces them. `autoFocus` controls whether that
    // focus advances to the first control or stays on the dialog.
    if (state.content) {
      if (options.autoFocus === true) focusFirstElement(state.content)
      else state.content.focus()
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
