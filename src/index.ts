import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  createDrawerController,
  type CommonDrawerController,
  type CommonDrawerId,
  type CommonDrawerOptions,
  type CommonDrawerSnapshot,
  type CommonDrawerDirection,
  type CommonDrawerSnapPoint,
} from './core';
import { TRANSITIONS } from './constants';
import { VanillaDrawerRenderer, type VanillaDrawerOptions, type VanillaRenderable } from './vanilla/render';

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
  root: Root | null;
  element: HTMLElement | null;
  ownsElement: boolean;
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

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function normalizeDrawerId(id?: CommonDrawerId | null) {
  return id ?? DEFAULT_DRAWER_ID;
}

function getVanillaContainer(runtime: DrawerRuntimeInstance) {
  if (!canUseDOM()) return null;

  if (runtime.options.mountElement) {
    return {
      container: runtime.options.mountElement,
      ownsElement: false,
    };
  }

  if (runtime.element?.isConnected) {
    return {
      container: runtime.element,
      ownsElement: runtime.ownsElement,
    };
  }

  const element = document.createElement('div');
  element.dataset.drawerVanillaRoot = runtime.id;
  document.body.appendChild(element);
  return {
    container: element,
    ownsElement: true,
  };
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

function renderVanillaDrawer(id: CommonDrawerId) {
  const runtime = drawerInstances.get(id);
  if (!runtime) return null;

  const nextContainer = getVanillaContainer(runtime);
  if (!nextContainer?.container) return null;

  if (runtime.element !== nextContainer.container) {
    runtime.root?.unmount();

    if (runtime.ownsElement && runtime.element?.parentNode) {
      runtime.element.parentNode.removeChild(runtime.element);
    }

    runtime.root = null;
    runtime.element = nextContainer.container;
    runtime.ownsElement = nextContainer.ownsElement;
  }

  if (!runtime.root) {
    runtime.root = createRoot(nextContainer.container);
  }

  const snapshot = runtime.controller.getSnapshot();

  runtime.root.render(
    React.createElement(VanillaDrawerRenderer, {
      options: runtime.options,
      open: snapshot.state.isOpen,
      onOpenChange: (open: boolean) => {
        const previousOpen = runtime.controller.getSnapshot().state.isOpen;
        runtime.controller.setOpen(open);

        if (previousOpen !== open) {
          notifyOpenStateChange(runtime, open);
        }

        renderVanillaDrawer(id);
      },
    }),
  );

  bindTriggerElement(runtime);
  return nextContainer.container;
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

  renderVanillaDrawer(id);

  if (nextOptions.parentId && nextOptions.open) {
    const parentRuntime = drawerInstances.get(nextOptions.parentId);
    if (parentRuntime && !parentRuntime.controller.getSnapshot().state.isOpen) {
      parentRuntime.controller.setOpen(true);
      notifyOpenStateChange(parentRuntime, true);
      renderVanillaDrawer(parentRuntime.id);
    }
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

  getChildDrawerIds(drawerId).forEach((childId) => {
    destroyDrawer(childId);
  });

  cleanupRuntimeTrigger(runtime);
  runtime.root?.unmount();
  runtime.root = null;

  if (runtime.ownsElement && runtime.element?.parentNode) {
    runtime.element.parentNode.removeChild(runtime.element);
  }

  runtime.element = null;
  runtime.options = { id: drawerId };
  drawerInstances.delete(drawerId);
}

export function destroyDrawers() {
  Array.from(drawerInstances.keys()).forEach((id) => {
    destroyDrawer(id);
  });
}

export type {
  CommonDrawerId,
  CommonDrawerController,
  CommonDrawerDirection,
  CommonDrawerOptions,
  CommonDrawerSnapshot,
  CommonDrawerSnapPoint,
  VanillaDrawerOptions,
  VanillaRenderable,
};

export { createDrawerController } from './core';