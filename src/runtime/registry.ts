import {
  createDrawerController,
  type CommonDrawerController,
  type CommonDrawerId,
  type CommonDrawerSnapshot,
} from '../core';
import { TRANSITIONS } from '../constants';
import { set } from '../helpers';
import { getParentNestedVisualState } from './nested';
import type { VanillaDrawerOptions, VanillaRenderable } from '../vanilla/render';
import { destroyVanillaHost, renderVanillaHost, type VanillaHostState } from '../vanilla/host';

const DEFAULT_DRAWER_ID = 'default';

export interface VanillaDrawerController extends CommonDrawerController {
  id: CommonDrawerId;
  element: HTMLElement | null;
  options: VanillaDrawerOptions;
  update: (options?: VanillaDrawerOptions) => VanillaDrawerController;
  destroy: () => void;
}

interface DrawerRuntimeInstance {
  id: CommonDrawerId;
  root: VanillaHostState['root'];
  element: VanillaHostState['element'];
  ownsElement: VanillaHostState['ownsElement'];
  controller: CommonDrawerController;
  options: VanillaDrawerOptions;
  cleanupTriggerElement: (() => void) | null;
}

const drawerInstances = new Map<CommonDrawerId, DrawerRuntimeInstance>();

function getChildDrawerIds(parentId: CommonDrawerId) {
  return Array.from(drawerInstances.entries())
    .filter(([, runtime]) => runtime.options.parentId === parentId)
    .map(([id]) => id);
}

function openAncestorChain(parentId: CommonDrawerId) {
  const parentRuntime = drawerInstances.get(parentId);
  if (!parentRuntime) {
    return;
  }

  const nextParentId = parentRuntime.options.parentId;
  if (nextParentId) {
    openAncestorChain(nextParentId);
  }

  if (!parentRuntime.controller.getSnapshot().state.isOpen) {
    releaseHiddenFocusBeforeOpen(parentRuntime.options);
    parentRuntime.controller.setOpen(true);
    notifyOpenStateChange(parentRuntime, true);
    renderVanillaDrawer(parentRuntime.id);
  }
}

function normalizeDrawerId(id?: CommonDrawerId | null) {
  return id ?? DEFAULT_DRAWER_ID;
}

function cleanupRuntimeTrigger(runtime: DrawerRuntimeInstance) {
  runtime.cleanupTriggerElement?.();
  runtime.cleanupTriggerElement = null;
}

function bindTriggerElement(runtime: DrawerRuntimeInstance) {
  cleanupRuntimeTrigger(runtime);

  if (!runtime.options.triggerElement) {
    return;
  }

  const triggerElement = runtime.options.triggerElement;
  const handleClick = () => {
    releaseHiddenFocusBeforeOpen(runtime.options);
    runtime.controller.setOpen(true);
    renderVanillaDrawer(runtime.id);
  };

  triggerElement.addEventListener('click', handleClick);
  runtime.cleanupTriggerElement = () => {
    triggerElement.removeEventListener('click', handleClick);
  };
}

function notifyOpenStateChange(runtime: DrawerRuntimeInstance, open: boolean) {
  runtime.options.onOpenChange?.(open);

  if (runtime.options.parentId) {
    syncParentNestedTransform(runtime.options.parentId);
  }

  if (!open) {
    getChildDrawerIds(runtime.id).forEach((childId) => {
      const childRuntime = drawerInstances.get(childId);
      if (!childRuntime) {
        return;
      }

      const childWasOpen = childRuntime.controller.getSnapshot().state.isOpen;
      childRuntime.controller.setOpen(false);
      if (childWasOpen) {
        notifyOpenStateChange(childRuntime, false);
      }
      renderVanillaDrawer(childId);
    });

    runtime.options.onClose?.();
  }

  setTimeout(() => {
    runtime.options.onAnimationEnd?.(open);
  }, TRANSITIONS.DURATION * 1000);
}

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function releaseHiddenFocusBeforeOpen(options: VanillaDrawerOptions) {
  if (!canUseDOM() || options.modal === false || options.autoFocus) {
    return;
  }

  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement) || activeElement === document.body) {
    return;
  }

  activeElement.blur();
}

function getRuntimeDrawerElement(runtime: DrawerRuntimeInstance) {
  if (!runtime.element) {
    return null;
  }

  return runtime.element.querySelector('[data-drawer]') as HTMLElement | null;
}

function getViewportSizeForDirection(direction: NonNullable<VanillaDrawerOptions['direction']>) {
  if (!canUseDOM()) {
    return 0;
  }

  return direction === 'top' || direction === 'bottom' ? window.innerHeight : window.innerWidth;
}

function syncParentNestedTransform(parentId: CommonDrawerId, percentageDragged?: number) {
  if (!canUseDOM()) {
    return;
  }

  const parentRuntime = drawerInstances.get(parentId);
  if (!parentRuntime) {
    return;
  }

  const parentDirection = parentRuntime.options.direction ?? 'bottom';
  const parentElement = getRuntimeDrawerElement(parentRuntime);
  if (!parentElement) {
    return;
  }

  const openChildren = getChildDrawerIds(parentId)
    .map((childId) => drawerInstances.get(childId))
    .filter((runtime): runtime is DrawerRuntimeInstance => Boolean(runtime?.controller.getSnapshot().state.isOpen));

  const visualState = getParentNestedVisualState({
    direction: parentDirection,
    viewportSize: getViewportSizeForDirection(parentDirection),
    hasOpenChild: openChildren.length > 0,
    percentageDragged,
  });

  set(
    parentElement,
    visualState,
    true,
  );
}

function renderVanillaDrawer(id: CommonDrawerId) {
  const runtime = drawerInstances.get(id);
  if (!runtime) return null;

  const snapshot = runtime.controller.getSnapshot();

  const nextHost = renderVanillaHost({
    host: {
      root: runtime.root,
      element: runtime.element,
      ownsElement: runtime.ownsElement,
    },
    id: runtime.id,
    options: runtime.options,
    open: snapshot.state.isOpen,
    onOpenChange: (open: boolean) => {
      const previousOpen = runtime.controller.getSnapshot().state.isOpen;

      if (open) {
        releaseHiddenFocusBeforeOpen(runtime.options);
      }

      runtime.controller.setOpen(open);

      if (previousOpen !== open) {
        notifyOpenStateChange(runtime, open);
      }

      renderVanillaDrawer(id);
    },
    onDragChange: runtime.options.parentId
      ? (percentageDragged: number) => {
          syncParentNestedTransform(runtime.options.parentId as CommonDrawerId, percentageDragged);
        }
      : undefined,
    onReleaseChange: runtime.options.parentId
      ? () => {
          syncParentNestedTransform(runtime.options.parentId as CommonDrawerId);
        }
      : undefined,
  });

  if (!nextHost) return null;

  runtime.root = nextHost.root;
  runtime.element = nextHost.element;
  runtime.ownsElement = nextHost.ownsElement;

  bindTriggerElement(runtime);
  return nextHost.container;
}

function buildVanillaController(id: CommonDrawerId): VanillaDrawerController {
  return {
    get id() {
      return id;
    },
    getSnapshot() {
      const runtime = drawerInstances.get(id);
      if (!runtime) {
        return createDrawerController({ id }).getSnapshot();
      }

      return runtime.controller.getSnapshot();
    },
    subscribe(listener) {
      const runtime = drawerInstances.get(id);
      if (!runtime) {
        listener(createDrawerController({ id }).getSnapshot());
        return () => {};
      }

      return runtime.controller.subscribe(listener);
    },
    setOpen(open) {
      const runtime = drawerInstances.get(id);
      if (!runtime) {
        return createDrawer({ id, open }).getSnapshot();
      }

      if (open) {
        releaseHiddenFocusBeforeOpen(runtime.options);
      }

      const previousOpen = runtime.controller.getSnapshot().state.isOpen;
      const snapshot = runtime.controller.setOpen(open);

      if (previousOpen !== open) {
        notifyOpenStateChange(runtime, open);
      }

      renderVanillaDrawer(id);
      return snapshot;
    },
    setActiveSnapPoint(snapPoint) {
      const runtime = drawerInstances.get(id);
      if (!runtime) {
        return createDrawer({ id, activeSnapPoint: snapPoint }).getSnapshot();
      }

      const snapshot = runtime.controller.setActiveSnapPoint(snapPoint);
      renderVanillaDrawer(id);
      return snapshot;
    },
    patch(options) {
      const runtime = drawerInstances.get(id);
      if (!runtime) {
        return createDrawer({ ...options, id }).getSnapshot();
      }

      const previousOpen = runtime.controller.getSnapshot().state.isOpen;
      runtime.options = { ...runtime.options, ...options, id };
      const snapshot = runtime.controller.patch(runtime.options);

      if (typeof runtime.options.open === 'boolean' && previousOpen !== snapshot.state.isOpen) {
        notifyOpenStateChange(runtime, snapshot.state.isOpen);
      }

      renderVanillaDrawer(id);
      return snapshot;
    },
    get element() {
      return drawerInstances.get(id)?.element ?? null;
    },
    get options() {
      return drawerInstances.get(id)?.options ?? { id };
    },
    update(options: VanillaDrawerOptions = {}) {
      return createDrawer({ ...options, id });
    },
    destroy() {
      destroyDrawer(id);
    },
  };
}

export function createDrawer(options: VanillaDrawerOptions = {}) {
  const id = normalizeDrawerId(options.id);
  const existing = drawerInstances.get(id);
  const previousOpen = existing?.controller.getSnapshot().state.isOpen;
  const nextOptions = { ...existing?.options, ...options, id };

  if (nextOptions.parentId) {
    nextOptions.nested = true;
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
    });
  } else {
    existing.options = nextOptions;
    const snapshot = existing.controller.patch(nextOptions);

    if (typeof nextOptions.open === 'boolean' && previousOpen !== snapshot.state.isOpen) {
      notifyOpenStateChange(existing, snapshot.state.isOpen);
    }
  }

  if (nextOptions.open && !previousOpen) {
    releaseHiddenFocusBeforeOpen(nextOptions);
  }

  renderVanillaDrawer(id);

  if (nextOptions.parentId && nextOptions.open) {
    openAncestorChain(nextOptions.parentId);
    syncParentNestedTransform(nextOptions.parentId);
  }

  return buildVanillaController(id);
}

export function configureDrawer(options: VanillaDrawerOptions = {}) {
  return createDrawer(options);
}

export function getDrawer(id?: CommonDrawerId | null) {
  const drawerId = normalizeDrawerId(id);

  if (!drawerInstances.has(drawerId)) {
    return null;
  }

  return buildVanillaController(drawerId);
}

export function getDrawers() {
  return Object.fromEntries(Array.from(drawerInstances.keys(), (id) => [id, buildVanillaController(id)]));
}

export function getParentDrawer(id?: CommonDrawerId | null) {
  const drawer = getDrawer(id);
  const parentId = drawer?.options.parentId;
  return parentId ? getDrawer(parentId) : null;
}

export function getChildDrawers(id?: CommonDrawerId | null) {
  const drawerId = normalizeDrawerId(id);
  return getChildDrawerIds(drawerId).map((childId) => buildVanillaController(childId));
}

export function updateDrawer(idOrOptions?: CommonDrawerId | VanillaDrawerOptions | null, options: VanillaDrawerOptions = {}) {
  if (typeof idOrOptions === 'object' && idOrOptions !== null) {
    return createDrawer(idOrOptions);
  }

  const drawerId = normalizeDrawerId(idOrOptions as CommonDrawerId | null | undefined);
  return createDrawer({ ...options, id: drawerId });
}

export function openDrawer(id?: CommonDrawerId | null) {
  return createDrawer({ id: normalizeDrawerId(id), open: true });
}

export function closeDrawer(id?: CommonDrawerId | null) {
  return createDrawer({ id: normalizeDrawerId(id), open: false });
}

export function toggleDrawer(id?: CommonDrawerId | null) {
  const drawerId = normalizeDrawerId(id);
  const current = getDrawer(drawerId);
  const nextOpen = !current?.getSnapshot().state.isOpen;
  return createDrawer({ id: drawerId, open: nextOpen });
}

export function destroyDrawer(id?: CommonDrawerId | null) {
  const drawerId = normalizeDrawerId(id);
  const runtime = drawerInstances.get(drawerId);
  if (!runtime) {
    return;
  }

  const parentId = runtime.options.parentId;

  getChildDrawerIds(drawerId).forEach((childId) => {
    destroyDrawer(childId);
  });

  cleanupRuntimeTrigger(runtime);
  const nextHost = destroyVanillaHost({
    root: runtime.root,
    element: runtime.element,
    ownsElement: runtime.ownsElement,
  });
  runtime.root = nextHost.root;
  runtime.element = nextHost.element;
  runtime.ownsElement = nextHost.ownsElement;
  runtime.options = { id: drawerId };
  drawerInstances.delete(drawerId);

  if (parentId) {
    syncParentNestedTransform(parentId);
  }
}

export function destroyDrawers() {
  Array.from(drawerInstances.keys()).forEach((id) => {
    destroyDrawer(id);
  });
}

export type { CommonDrawerId, CommonDrawerSnapshot, VanillaDrawerOptions, VanillaRenderable };