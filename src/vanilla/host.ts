// Vanilla host: manages the mount target element for a drawer instance.
// The host is a small container `<div data-drawer-vanilla-root>`
// appended to `document.body` (or a caller-provided `container`) that
// holds the rendered dialog DOM and the trigger button when one is needed.

import type { CommonDrawerSnapPoint } from '../core'
import { destroyVanillaDialog } from './dialog'
import type { VanillaDrawerOptions } from './render'
import { mountVanillaDrawer } from './render'

export interface VanillaHostState {
  root: HTMLElement | null
  element: HTMLElement | null
  ownsElement: boolean
}

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * Resolve the container element for a drawer host. Reuses the existing
 * element when it's still connected; otherwise creates a fresh `<div>`
 * owned by this drawer and appends it to `document.body` or the caller's
 * `container`. A dedicated host is required even for custom containers:
 * using the container itself as the host made two drawers share one
 * `DialogMountState`, so mounting either drawer destroyed the other.
 *
 * `container` is the preferred target and `mountElement` is the legacy
 * nullish fallback kept for backward compatibility.
 */
function resolveVanillaContainer(
  state: VanillaHostState,
  id: string,
  options: { container?: HTMLElement | null; mountElement?: HTMLElement | null }
): { container: HTMLElement; ownsElement: boolean } | null {
  if (!canUseDOM()) return null

  const target = options.container ?? options.mountElement ?? document.body

  if (state.element?.isConnected && state.element.parentElement === target) {
    return { container: state.element, ownsElement: state.ownsElement }
  }

  if (state.element) {
    destroyVanillaDialog(state.element)
    if (state.ownsElement && state.element.parentNode) {
      state.element.parentNode.removeChild(state.element)
    }
  }

  const element = document.createElement('div')
  element.dataset.drawerVanillaRoot = id
  target.appendChild(element)
  return { container: element, ownsElement: true }
}

/**
 * Render the vanilla dialog for `id` into the resolved container.
 * Returns the updated host state plus the resolved container, or `null`
 * if no DOM is available (e.g. server-side import).
 */
export function renderVanillaHost({
  host,
  id,
  options,
  open,
  openOrder,
  hasBeenOpened,
  onBuiltInTriggerMouseDown,
  onBuiltInTriggerClick,
  onOpenChange,
  onDragChange,
  onReleaseChange,
  onActiveSnapPointChange
}: {
  host: VanillaHostState
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
}): { root: HTMLElement | null; element: HTMLElement | null; ownsElement: boolean; container: HTMLElement } | null {
  const nextContainer = resolveVanillaContainer(host, id, {
    ...(options.container !== undefined ? { container: options.container } : {}),
    ...(options.mountElement !== undefined ? { mountElement: options.mountElement } : {})
  })
  if (!nextContainer) return null

  let nextRoot = host.root
  let nextElement = host.element
  let nextOwnsElement = host.ownsElement

  if (nextElement !== nextContainer.container) {
    if (nextOwnsElement && nextElement?.parentNode) {
      nextElement.parentNode.removeChild(nextElement)
    }
    nextRoot = null
    nextElement = nextContainer.container
    nextOwnsElement = nextContainer.ownsElement
  }

  if (!nextRoot) {
    nextRoot = nextContainer.container
  }

  mountVanillaDrawer({
    host: nextContainer.container,
    id,
    options,
    open,
    ...(openOrder !== undefined ? { openOrder } : {}),
    ...(hasBeenOpened !== undefined ? { hasBeenOpened } : {}),
    onOpenChange,
    ...(onBuiltInTriggerMouseDown !== undefined ? { onBuiltInTriggerMouseDown } : {}),
    ...(onBuiltInTriggerClick !== undefined ? { onBuiltInTriggerClick } : {}),
    ...(onDragChange !== undefined ? { onDragChange } : {}),
    ...(onReleaseChange !== undefined ? { onReleaseChange } : {}),
    ...(onActiveSnapPointChange !== undefined ? { onActiveSnapPointChange } : {})
  })

  return {
    root: nextRoot,
    element: nextElement,
    ownsElement: nextOwnsElement,
    container: nextContainer.container
  }
}

/**
 * Tear down the vanilla host: remove the container if we own it.
 * Idempotent — calling on a host without an element is a no-op.
 *
 * Phase E: also runs the dialog-level teardown (via
 * `destroyVanillaDialog`) before removing the host element. The
 * dialog owns the `visualViewport.resize` listener and the
 * `history.scrollRestoration` backup; both need a teardown pass
 * when the host is destroyed without a prior `setOpen(false)` —
 * the destroy path skips the re-mount that would normally drive
 * `teardownMount` from the top of the next `mountVanillaDialog`
 * call.
 */
export function destroyVanillaHost(host: VanillaHostState): VanillaHostState {
  if (host.element) {
    destroyVanillaDialog(host.element)
  }
  if (host.ownsElement && host.element?.parentNode) {
    host.element.parentNode.removeChild(host.element)
  }
  return { root: null, element: null, ownsElement: false }
}
