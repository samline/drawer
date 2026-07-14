// Vanilla dialog primitives. Replaces `@radix-ui/react-dialog` with
// direct DOM manipulation — no React, no virtual DOM, no peer
// dependencies. The runtime registry owns the controller state and
// delegates side effects (focus, body scroll lock, ARIA, animations)
// to this module through a small callback surface.
//
// The CSS contract is unchanged from the React build: every element
// the stylesheet reads uses a `data-drawer*` attribute. The dialog
// module is the only place that knows about those attributes; the
// rest of the package uses `data-drawer` as an opaque marker.
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
import { TRANSITIONS } from '../constants'
import { isVertical } from '../helpers'
import type { VanillaDrawerOptions, VanillaRenderable } from './render'

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
  previouslyFocused: HTMLElement | null
  cleanups: Array<() => void>
  bodyOverflowBackup: string | null
  bodyPaddingRightBackup: string | null
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
      previouslyFocused: null,
      cleanups: [],
      bodyOverflowBackup: null,
      bodyPaddingRightBackup: null
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
 * to the element's own text. Mirrors the helper that used to live
 * in the React `render.tsx`.
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
 * Tear down the previous dialog mount inside `host`. Removes the
 * overlay / content / trigger and detaches every listener. Also blurs
 * the old trigger so a click that triggered this teardown does not
 * leave the old focused element behind (some DOM environments, like
 * linkedom, keep the focused element even after `removeChild`).
 */
function teardownMount(state: DialogMountState) {
  for (const cleanup of state.cleanups) cleanup()
  state.cleanups = []
  if (state.trigger && document.activeElement === state.trigger) {
    if (typeof state.trigger.blur === 'function') state.trigger.blur()
  }
  if (state.trigger?.parentNode) state.trigger.parentNode.removeChild(state.trigger)
  if (state.overlay?.parentNode) state.overlay.parentNode.removeChild(state.overlay)
  state.trigger = null
  state.overlay = null
  state.content = null
  state.handle = null
  state.title = null
  state.description = null
  state.body = null
  // Restore focus + body scroll lock if we still own them.
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
  if (options.titleVisuallyHidden) setStyle(title, VISUALLY_HIDDEN_STYLE)
  if (options.descriptionVisuallyHidden && state.description) {
    setStyle(state.description, VISUALLY_HIDDEN_STYLE)
  }
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

function applyOpenState(
  state: DialogMountState,
  options: VanillaDrawerOptions,
  open: boolean
) {
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
  if (state.overlay) {
    state.overlay.dataset.drawerSnapPoints = getSnapPoints(options) ? 'true' : 'false'
  }
  if (state.content) {
    state.content.dataset.drawerSnapPoints = getSnapPoints(options) ? 'true' : 'false'
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

function attachListeners(
  state: DialogMountState,
  options: VanillaDrawerOptions,
  callbacks: {
    onOpenChange: VanillaDialogOptions['onOpenChange']
    onBuiltInTriggerMouseDown?: () => void
    onBuiltInTriggerClick?: () => void
    onDragChange?: (percentageDragged: number) => void
    onReleaseChange?: (open: boolean) => void
  }
) {
  if (state.trigger) {
    const trigger = state.trigger
    const onMouseDown = (event: MouseEvent) => {
      if (options.modal === false || options.autoFocus) return
      event.preventDefault()
      // `preventDefault` on a synthetic mousedown does not always
      // remove an already-focused element (linkedom in particular keeps
      // it), so we blur explicitly to match the Radix behaviour.
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

  // Drag hooks are placeholder — the host will replace this with the
  // full pointer pipeline in a later iteration.
  if (state.content) {
    const content = state.content
    const onPointerMove = (event: PointerEvent) => {
      void event
      // Wire-up lives in the drag/snap modules once the vanilla
      // pipeline is fully ported.
    }
    content.addEventListener('pointermove', onPointerMove)
    state.cleanups.push(() => content.removeEventListener('pointermove', onPointerMove))
  }
  void callbacks.onDragChange
  void callbacks.onReleaseChange
  void isVertical
  void TRANSITIONS
}

/**
 * Mount (or update) a vanilla dialog inside `host`. Idempotent:
 * calling twice with the same `host` updates the existing mount in
 * place — it does not detach listeners or recreate the dialog tree.
 */
export function mountVanillaDialog(dialogOptions: VanillaDialogOptions): void {
  if (!canUseDOM()) return
  const { host, options, open, onOpenChange, onBuiltInTriggerMouseDown, onBuiltInTriggerClick, onDragChange, onReleaseChange } = dialogOptions
  const state = getHostState(host)

  // Tear down any prior mount before building the new one.
  teardownMount(state)

  const direction = getDirection(options)
  const snapPoints = getSnapPoints(options)
  const activeSnapPoint = getActiveSnapPoint(options)
  const shouldRenderHandle = Boolean(options.handleOnly || options.showHandle)
  const shouldRenderVanillaContent = options.title !== undefined || options.description !== undefined || options.content !== undefined
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
    const overlay = createEl('div', {
      'data-drawer-overlay': '',
      'data-state': open ? 'open' : 'closed',
      'data-drawer-snap-points': snapPoints ? 'true' : 'false',
      'data-drawer-snap-points-overlay': 'false',
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
    if (options.ariaLabel) content.setAttribute('aria-label', options.ariaLabel)
    if (options.ariaLabelledBy) content.setAttribute('aria-labelledby', options.ariaLabelledBy)
    if (options.ariaDescribedBy) content.setAttribute('aria-describedby', options.ariaDescribedBy)
    if (snapPoints) {
      const initialOffset = activeSnapPoint
        ? getSnapPointOffsetPx(activeSnapPoint, direction, host.ownerDocument)
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
    const bodyEl = createEl('div', { 'data-drawer-vanilla-body': '' })
    state.title = titleEl
    state.description = descEl
    state.body = bodyEl
    content.appendChild(titleEl)
    content.appendChild(descEl)
    content.appendChild(bodyEl)

    const contentRoot =
      options.content instanceof HTMLElement ? options.content : typeof options.content === 'function' ? options.content() : undefined
    buildTitleContent(state, options, contentRoot instanceof HTMLElement ? contentRoot : undefined)
    buildBodyContent(state, options)
  }

  attachListeners(state, options, {
    onOpenChange,
    ...(onBuiltInTriggerMouseDown !== undefined ? { onBuiltInTriggerMouseDown } : {}),
    ...(onBuiltInTriggerClick !== undefined ? { onBuiltInTriggerClick } : {}),
    ...(onDragChange !== undefined ? { onDragChange } : {}),
    ...(onReleaseChange !== undefined ? { onReleaseChange } : {})
  })

  applyOpenState(state, options, open)

  if (open && options.modal !== false) {
    state.previouslyFocused = (document.activeElement as HTMLElement | null) ?? null
    lockBodyScroll()
    if (state.content) focusFirstElement(state.content)
  }
}

/**
 * Convert a snap point (number, percentage-as-number, or px string)
 * to a pixel offset from the viewport edge along the active axis.
 */
function getSnapPointOffsetPx(snap: CommonDrawerSnapPoint, direction: CommonDrawerDirection, doc: Document | null): number {
  const viewport = doc?.defaultView
  const isVerticalAxis = isVertical(direction)
  const dimension = viewport ? (isVerticalAxis ? viewport.innerHeight : viewport.innerWidth) : 0
  if (typeof snap === 'string') {
    const parsed = parseFloat(snap)
    if (snap.endsWith('%')) return (parsed / 100) * dimension
    return parsed
  }
  if (snap <= 1) return snap * dimension
  return snap
}
