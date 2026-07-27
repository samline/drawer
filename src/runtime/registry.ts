import {
  createDrawerController,
  type CommonDrawerController,
  type CommonDrawerId,
  type CommonDrawerSnapshot
} from '../core'
import { TRANSITIONS } from '../constants'
import { set } from '../helpers'
import { getParentNestedVisualState } from './nested'
import type { VanillaDrawerOptions, VanillaRenderable } from '../vanilla/render'
import { destroyVanillaHost, renderVanillaHost, type VanillaHostState } from '../vanilla/host'

const DEFAULT_DRAWER_ID = 'default'

/**
 * Module-level registry of named drawer instances. Each instance owns:
 *   - the controller (shared observable state from `core/`),
 *   - the resolved host (DOM subtree from `vanilla/host.ts`),
 *   - the latest merged options,
 *   - a cleanup callback for the optional external `triggerElement`.
 *
 * The registry also wires the nested-drawer pipeline
 * (`syncParentNestedTransform`), the open/close animation
 * notification (`notifyOpenStateChange`), and the trigger-element
 * re-binding on every re-render. The drag / snap / scale-background /
 * handle / viewport pipelines live in `runtime/{drag,snap-points,
 * transforms,release,handle,drag-policy,viewport}.ts` and are wired
 * into `vanilla/dialog.ts#attachListeners`. The pointer-swipe intent
 * math in `runtime/pointer.ts` is a planned API and is not wired yet.
 */

export interface VanillaDrawerController extends CommonDrawerController {
  id: CommonDrawerId
  element: HTMLElement | null
  options: VanillaDrawerOptions
  update: (options?: VanillaDrawerOptions) => VanillaDrawerController
  destroy: () => void
}

interface DrawerRuntimeInstance {
  id: CommonDrawerId
  root: VanillaHostState['root']
  element: VanillaHostState['element']
  ownsElement: VanillaHostState['ownsElement']
  controller: CommonDrawerController
  options: VanillaDrawerOptions
  cleanupTriggerElement: (() => void) | null
  /**
   * True after the drawer has been opened at least once in this
   * mount session. Mirrors vaul upstream's `hasBeenOpened` state
   * (see F14 in the forensic audit). Used to gate behavior that
   * should only kick in AFTER the first open — most importantly
   * the `shouldAnimate` ref (F9) that skips the opening animation
   * for `defaultOpen: true` drawers.
   */
  hasBeenOpened: boolean
  /**
   * Pending `onAnimationEnd` callback handle. Tracked so we can
   * cancel the previous one when a new state change fires before
   * the prior `TRANSITIONS.DURATION` has elapsed. Without this,
   * a quick open→close→open sequence would fire three overlapping
   * `onAnimationEnd` callbacks within ~500ms, confusing consumers
   * that use the callback to clean up external state (e.g.
   * removing a `body.modal-open` class). F5/F17 in the audit.
   */
  pendingAnimationEndTimer: ReturnType<typeof setTimeout> | null
}

const drawerInstances = new Map<CommonDrawerId, DrawerRuntimeInstance>()

function getChildDrawerIds(parentId: CommonDrawerId) {
  return Array.from(drawerInstances.entries())
    .filter(([, runtime]) => runtime.options.parentId === parentId)
    .map(([id]) => id)
}

function openAncestorChain(parentId: CommonDrawerId) {
  const parentRuntime = drawerInstances.get(parentId)
  if (!parentRuntime) {
    return
  }

  const nextParentId = parentRuntime.options.parentId
  if (nextParentId) {
    openAncestorChain(nextParentId)
  }

  if (!parentRuntime.controller.getSnapshot().state.isOpen) {
    releaseHiddenFocusBeforeOpen(parentRuntime.options, getRuntimeDrawerElement(parentRuntime))
    parentRuntime.controller.setOpen(true)
    notifyOpenStateChange(parentRuntime, true)
    renderVanillaDrawer(parentRuntime.id)
  }
}

function normalizeDrawerId(id?: CommonDrawerId | null) {
  return id ?? DEFAULT_DRAWER_ID
}

function cleanupRuntimeTrigger(runtime: DrawerRuntimeInstance) {
  runtime.cleanupTriggerElement?.()
  runtime.cleanupTriggerElement = null
  // Note: we intentionally do NOT cancel the pending
  // `onAnimationEnd` timer here. `cleanupRuntimeTrigger` is called
  // by `bindTriggerElement`, which fires on EVERY render of the
  // drawer (e.g. when the user calls `setOpen` or `patch`). The
  // animation-end callback is independent of the trigger
  // lifecycle — it should fire after the drawer has visually
  // finished animating, even if the trigger was re-bound in the
  // meantime. The destroy path cancels the timer instead (see
  // `destroyDrawer`).
}

function bindTriggerElement(runtime: DrawerRuntimeInstance) {
  cleanupRuntimeTrigger(runtime)

  const drawerElement = getRuntimeDrawerElement(runtime)
  const cleanups: Array<() => void> = []

  if (!runtime.options.triggerElement) {
    runtime.cleanupTriggerElement = cleanups.length
      ? () => {
          cleanups.forEach((cleanup) => cleanup())
        }
      : null
    return
  }

  const triggerElement = runtime.options.triggerElement
  const handleClick = () => {
    releaseHiddenFocusBeforeOpen(runtime.options, drawerElement)
    runtime.controller.setOpen(true)
    renderVanillaDrawer(runtime.id)
  }

  triggerElement.addEventListener('click', handleClick)
  cleanups.push(() => {
    triggerElement.removeEventListener('click', handleClick)
  })

  runtime.cleanupTriggerElement = () => {
    cleanups.forEach((cleanup) => cleanup())
  }
}

function notifyOpenStateChange(runtime: DrawerRuntimeInstance, open: boolean) {
  runtime.options.onOpenChange?.(open)

  // Track first-open for the F14/F9 parity work (the `shouldAnimate`
  // ref skips the entrance animation on `defaultOpen: true` and
  // other future consumers — e.g. a `usePreventScroll` shim that
  // only kicks in after the first user-driven open).
  if (open) {
    runtime.hasBeenOpened = true
  }

  if (runtime.options.parentId) {
    syncParentNestedTransform(runtime.options.parentId)
  }

  if (!open) {
    getChildDrawerIds(runtime.id).forEach((childId) => {
      const childRuntime = drawerInstances.get(childId)
      if (!childRuntime) {
        return
      }

      const childWasOpen = childRuntime.controller.getSnapshot().state.isOpen
      childRuntime.controller.setOpen(false)
      if (childWasOpen) {
        notifyOpenStateChange(childRuntime, false)
      }
      renderVanillaDrawer(childId)
    })

    runtime.options.onClose?.()
  }

  // F5/F17: cancel the previous `onAnimationEnd` timer before
  // scheduling a new one. Guarantees only the LATEST
  // `onAnimationEnd` fires (matching what consumers expect when
  // they use the callback for external state cleanup).
  if (runtime.pendingAnimationEndTimer !== null) {
    clearTimeout(runtime.pendingAnimationEndTimer)
    runtime.pendingAnimationEndTimer = null
  }
  runtime.pendingAnimationEndTimer = setTimeout(() => {
    runtime.pendingAnimationEndTimer = null
    runtime.options.onAnimationEnd?.(open)
  }, TRANSITIONS.DURATION * 1000)
}

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function isElementInsideDrawer(element: Element | null) {
  let currentElement = element

  while (currentElement) {
    if (currentElement instanceof HTMLElement && currentElement.hasAttribute('data-drawer')) {
      return true
    }

    currentElement = currentElement.parentElement
  }

  return false
}

function releaseHiddenFocusBeforeOpen(options: VanillaDrawerOptions, drawerElement?: HTMLElement | null) {
  if (!canUseDOM() || options.modal === false || options.autoFocus) {
    return
  }

  const activeElement = document.activeElement
  if (!activeElement || activeElement === document.body) {
    return
  }

  const activeElementNode = activeElement as Element & { blur?: () => void }

  if (drawerElement?.contains(activeElementNode) || isElementInsideDrawer(activeElementNode)) {
    return
  }

  if (typeof activeElementNode.blur !== 'function') {
    return
  }

  activeElementNode.blur()
}

function getRuntimeDrawerElement(runtime: DrawerRuntimeInstance) {
  if (!runtime.element) {
    return null
  }

  return runtime.element.querySelector('[data-drawer]') as HTMLElement | null
}

function getViewportSizeForDirection(direction: NonNullable<VanillaDrawerOptions['direction']>) {
  if (!canUseDOM()) {
    return 0
  }

  return direction === 'top' || direction === 'bottom' ? window.innerHeight : window.innerWidth
}

function syncParentNestedTransform(parentId: CommonDrawerId, percentageDragged?: number) {
  if (!canUseDOM()) {
    return
  }

  const parentRuntime = drawerInstances.get(parentId)
  if (!parentRuntime) {
    return
  }

  const parentDirection = parentRuntime.options.direction ?? 'bottom'
  const parentElement = getRuntimeDrawerElement(parentRuntime)
  if (!parentElement) {
    return
  }

  const openChildren = getChildDrawerIds(parentId)
    .map((childId) => drawerInstances.get(childId))
    .filter((runtime): runtime is DrawerRuntimeInstance => Boolean(runtime?.controller.getSnapshot().state.isOpen))

  const visualState = getParentNestedVisualState({
    direction: parentDirection,
    viewportSize: getViewportSizeForDirection(parentDirection),
    hasOpenChild: openChildren.length > 0,
    ...(percentageDragged !== undefined ? { percentageDragged } : {})
  })

  set(parentElement, visualState)
}

function renderVanillaDrawer(id: CommonDrawerId) {
  const runtime = drawerInstances.get(id)
  if (!runtime) return null

  const snapshot = runtime.controller.getSnapshot()

  const nextHost = renderVanillaHost({
    host: {
      root: runtime.root,
      element: runtime.element,
      ownsElement: runtime.ownsElement
    },
    id: runtime.id,
    options: runtime.options,
    open: snapshot.state.isOpen,
    onBuiltInTriggerMouseDown: () => {
      releaseHiddenFocusBeforeOpen(runtime.options, getRuntimeDrawerElement(runtime))
    },
    onBuiltInTriggerClick: () => {
      releaseHiddenFocusBeforeOpen(runtime.options, getRuntimeDrawerElement(runtime))
    },
    onOpenChange: (open: boolean) => {
      const previousOpen = runtime.controller.getSnapshot().state.isOpen

      runtime.controller.setOpen(open)

      if (previousOpen !== open) {
        notifyOpenStateChange(runtime, open)
      }

      renderVanillaDrawer(id)
    },
    onDragChange: (percentageDragged: number) => {
      runtime.options.onDragChange?.(percentageDragged)
      if (runtime.options.parentId) {
        syncParentNestedTransform(runtime.options.parentId as CommonDrawerId, percentageDragged)
      }
    },
    onReleaseChange: (open: boolean) => {
      runtime.options.onReleaseChange?.(open)
      if (runtime.options.parentId) {
        syncParentNestedTransform(runtime.options.parentId as CommonDrawerId)
      }
    },
    onActiveSnapPointChange: (snapPoint) => {
      // Phase B: the drag pipeline picked a new active snap from
      // the snap-point release action. Push it through both the
      // controller and `runtime.options` so the re-render reads
      // the new value (the dialog derives `--initial-transform`
      // from `runtime.options.activeSnapPoint`).
      runtime.options = { ...runtime.options, activeSnapPoint: snapPoint }
      runtime.controller.setActiveSnapPoint(snapPoint)
      renderVanillaDrawer(id)
    }
  })

  if (!nextHost) return null

  runtime.root = nextHost.root
  runtime.element = nextHost.element
  runtime.ownsElement = nextHost.ownsElement

  bindTriggerElement(runtime)
  return nextHost.container
}

function buildVanillaController(id: CommonDrawerId): VanillaDrawerController {
  return {
    get id() {
      return id
    },
    getSnapshot() {
      const runtime = drawerInstances.get(id)
      if (!runtime) {
        return createDrawerController({ id }).getSnapshot()
      }

      return runtime.controller.getSnapshot()
    },
    subscribe(listener) {
      const runtime = drawerInstances.get(id)
      if (!runtime) {
        listener(createDrawerController({ id }).getSnapshot())
        return () => {}
      }

      return runtime.controller.subscribe(listener)
    },
    setOpen(open) {
      const runtime = drawerInstances.get(id)
      if (!runtime) {
        return createDrawer({ id, open }).getSnapshot()
      }

      if (open) {
        releaseHiddenFocusBeforeOpen(runtime.options, getRuntimeDrawerElement(runtime))
      }

      const previousOpen = runtime.controller.getSnapshot().state.isOpen
      const snapshot = runtime.controller.setOpen(open)

      if (previousOpen !== open) {
        notifyOpenStateChange(runtime, open)
        // Re-render so the dialog DOM reflects the new `data-state`,
        // `aria-modal`, body-scroll lock, and focus. The internal
        // `renderVanillaDrawer's onOpenChange` callback also renders
        // when the user clicks the trigger; that path produces a
        // second render with the same state, which is a no-op.
        renderVanillaDrawer(id)
      }

      return snapshot
    },
    setActiveSnapPoint(snapPoint) {
      const runtime = drawerInstances.get(id)
      if (!runtime) {
        return createDrawer({ id, activeSnapPoint: snapPoint }).getSnapshot()
      }

      // Keep `runtime.options` in sync with the controller so the
      // next render reads the new active snap from a single source
      // of truth. The dialog derives the inline `--initial-transform`
      // from `runtime.options.activeSnapPoint`; without this sync
      // the re-render would write the stale snap's offset.
      runtime.options = { ...runtime.options, activeSnapPoint: snapPoint }
      const snapshot = runtime.controller.setActiveSnapPoint(snapPoint)
      renderVanillaDrawer(id)
      return snapshot
    },
    patch(options) {
      const runtime = drawerInstances.get(id)
      if (!runtime) {
        return createDrawer({ ...options, id }).getSnapshot()
      }

      const previousOpen = runtime.controller.getSnapshot().state.isOpen
      runtime.options = { ...runtime.options, ...options, id }
      const snapshot = runtime.controller.patch(runtime.options)

      if (typeof runtime.options.open === 'boolean' && previousOpen !== snapshot.state.isOpen) {
        notifyOpenStateChange(runtime, snapshot.state.isOpen)
      }

      renderVanillaDrawer(id)
      return snapshot
    },
    get element() {
      return drawerInstances.get(id)?.element ?? null
    },
    get options() {
      return drawerInstances.get(id)?.options ?? { id }
    },
    update(options: VanillaDrawerOptions = {}) {
      return createDrawer({ ...options, id })
    },
    destroy() {
      destroyDrawer(id)
    }
  }
}

export function createDrawer(options: VanillaDrawerOptions = {}) {
  const id = normalizeDrawerId(options.id)
  const existing = drawerInstances.get(id)
  const previousOpen = existing?.controller.getSnapshot().state.isOpen
  const nextOptions = { ...existing?.options, ...options, id }

  if (nextOptions.parentId) {
    nextOptions.nested = true
  }

  if (!existing) {
    drawerInstances.set(id, {
      id,
      root: null,
      element: null,
      ownsElement: false,
      controller: createDrawerController(nextOptions),
      options: nextOptions,
      cleanupTriggerElement: null,
      hasBeenOpened: false,
      pendingAnimationEndTimer: null
    })
  } else {
    existing.options = nextOptions
    const snapshot = existing.controller.patch(nextOptions)

    if (typeof nextOptions.open === 'boolean' && previousOpen !== snapshot.state.isOpen) {
      notifyOpenStateChange(existing, snapshot.state.isOpen)
    }
  }

  if (nextOptions.open && !previousOpen) {
    releaseHiddenFocusBeforeOpen(nextOptions, existing ? getRuntimeDrawerElement(existing) : null)
  }

  renderVanillaDrawer(id)

  if (nextOptions.parentId && nextOptions.open) {
    openAncestorChain(nextOptions.parentId)
    syncParentNestedTransform(nextOptions.parentId)
  }

  return buildVanillaController(id)
}

export function configureDrawer(options: VanillaDrawerOptions = {}) {
  return createDrawer(options)
}

export function getDrawer(id?: CommonDrawerId | null) {
  const drawerId = normalizeDrawerId(id)

  if (!drawerInstances.has(drawerId)) {
    return null
  }

  return buildVanillaController(drawerId)
}

export function getDrawers() {
  return Object.fromEntries(Array.from(drawerInstances.keys(), (id) => [id, buildVanillaController(id)]))
}

export function getParentDrawer(id?: CommonDrawerId | null) {
  const drawer = getDrawer(id)
  const parentId = drawer?.options.parentId
  return parentId ? getDrawer(parentId) : null
}

export function getChildDrawers(id?: CommonDrawerId | null) {
  const drawerId = normalizeDrawerId(id)
  return getChildDrawerIds(drawerId).map((childId) => buildVanillaController(childId))
}

export function updateDrawer(
  idOrOptions?: CommonDrawerId | VanillaDrawerOptions | null,
  options: VanillaDrawerOptions = {}
) {
  if (typeof idOrOptions === 'object' && idOrOptions !== null) {
    return createDrawer(idOrOptions)
  }

  const drawerId = normalizeDrawerId(idOrOptions as CommonDrawerId | null | undefined)
  return createDrawer({ ...options, id: drawerId })
}

export function openDrawer(id?: CommonDrawerId | null) {
  return createDrawer({ id: normalizeDrawerId(id), open: true })
}

export function closeDrawer(id?: CommonDrawerId | null) {
  return createDrawer({ id: normalizeDrawerId(id), open: false })
}

export function toggleDrawer(id?: CommonDrawerId | null) {
  const drawerId = normalizeDrawerId(id)
  const current = getDrawer(drawerId)
  const nextOpen = !current?.getSnapshot().state.isOpen
  return createDrawer({ id: drawerId, open: nextOpen })
}

export function destroyDrawer(id?: CommonDrawerId | null) {
  const drawerId = normalizeDrawerId(id)
  const runtime = drawerInstances.get(drawerId)
  if (!runtime) {
    return
  }

  const parentId = runtime.options.parentId

  getChildDrawerIds(drawerId).forEach((childId) => {
    destroyDrawer(childId)
  })

  cleanupRuntimeTrigger(runtime)
  // F5/F17: cancel the pending `onAnimationEnd` callback on
  // destroy. Without this, a destroy → reopen sequence would
  // fire a stale callback for the destroyed drawer. We do this
  // here (in the destroy path) instead of in
  // `cleanupRuntimeTrigger` because that helper is also called
  // by `bindTriggerElement` on every render, and clearing the
  // timer there would cancel the animation-end callback on
  // every state change.
  if (runtime.pendingAnimationEndTimer !== null) {
    clearTimeout(runtime.pendingAnimationEndTimer)
    runtime.pendingAnimationEndTimer = null
  }
  const nextHost = destroyVanillaHost({
    root: runtime.root,
    element: runtime.element,
    ownsElement: runtime.ownsElement
  })
  runtime.root = nextHost.root
  runtime.element = nextHost.element
  runtime.ownsElement = nextHost.ownsElement
  runtime.options = { id: drawerId }
  drawerInstances.delete(drawerId)

  if (parentId) {
    syncParentNestedTransform(parentId)
  }
}

export function destroyDrawers() {
  Array.from(drawerInstances.keys()).forEach((id) => {
    destroyDrawer(id)
  })
}

export type { CommonDrawerId, CommonDrawerSnapshot, VanillaDrawerOptions, VanillaRenderable }
