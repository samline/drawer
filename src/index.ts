import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  createDrawerController,
  type CommonDrawerController,
  type CommonDrawerOptions,
  type CommonDrawerSnapshot,
  type CommonDrawerDirection,
  type CommonDrawerSnapPoint,
} from './core';
import { VanillaDrawerRenderer, type VanillaDrawerOptions, type VanillaRenderable } from './vanilla/render';

export interface VanillaDrawerController extends CommonDrawerController {
  element: HTMLElement | null;
  options: VanillaDrawerOptions;
  update: (options?: VanillaDrawerOptions) => VanillaDrawerController;
  destroy: () => void;
}

let vanillaDrawerRoot: Root | null = null;
let vanillaDrawerElement: HTMLElement | null = null;
let vanillaDrawerController: CommonDrawerController | null = null;
let vanillaDrawerOptions: VanillaDrawerOptions = {};
let cleanupTriggerElement: (() => void) | null = null;

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getVanillaContainer() {
  if (!canUseDOM()) return null;

  if (vanillaDrawerOptions.mountElement) {
    return vanillaDrawerOptions.mountElement;
  }

  if (vanillaDrawerElement?.isConnected) {
    return vanillaDrawerElement;
  }

  const existing = document.querySelector<HTMLElement>('[data-drawer-vanilla-root]');
  if (existing) {
    vanillaDrawerElement = existing;
    return existing;
  }

  const element = document.createElement('div');
  element.dataset.drawerVanillaRoot = '';
  document.body.appendChild(element);
  vanillaDrawerElement = element;
  return element;
}

function bindTriggerElement() {
  cleanupTriggerElement?.();
  cleanupTriggerElement = null;

  if (!vanillaDrawerController || !vanillaDrawerOptions.triggerElement) {
    return;
  }

  const triggerElement = vanillaDrawerOptions.triggerElement;
  const handleClick = () => {
    vanillaDrawerController?.setOpen(true);
    renderVanillaDrawer();
  };

  triggerElement.addEventListener('click', handleClick);
  cleanupTriggerElement = () => {
    triggerElement.removeEventListener('click', handleClick);
  };
}

function renderVanillaDrawer() {
  if (!vanillaDrawerController) return null;

  const container = getVanillaContainer();
  if (!container) return null;

  if (vanillaDrawerElement !== container) {
    vanillaDrawerRoot?.unmount();
    vanillaDrawerRoot = null;
    vanillaDrawerElement = container;
  }

  if (!vanillaDrawerRoot) {
    vanillaDrawerRoot = createRoot(container);
  }

  const snapshot = vanillaDrawerController.getSnapshot();

  vanillaDrawerRoot.render(
    React.createElement(VanillaDrawerRenderer, {
      options: vanillaDrawerOptions,
      open: snapshot.state.isOpen,
      onOpenChange: (open: boolean) => {
        vanillaDrawerController?.setOpen(open);
        renderVanillaDrawer();
      },
    }),
  );

  bindTriggerElement();
  return container;
}

function buildVanillaController(controller: CommonDrawerController): VanillaDrawerController {
  return {
    getSnapshot: controller.getSnapshot,
    subscribe: controller.subscribe,
    setOpen(open) {
      const snapshot = controller.setOpen(open);
      renderVanillaDrawer();
      return snapshot;
    },
    setActiveSnapPoint(snapPoint) {
      const snapshot = controller.setActiveSnapPoint(snapPoint);
      renderVanillaDrawer();
      return snapshot;
    },
    patch(options) {
      const snapshot = controller.patch(options);
      renderVanillaDrawer();
      return snapshot;
    },
    element: vanillaDrawerElement,
    options: vanillaDrawerOptions,
    update(options: VanillaDrawerOptions = {}) {
      vanillaDrawerOptions = { ...vanillaDrawerOptions, ...options };
      controller.patch(vanillaDrawerOptions);
      renderVanillaDrawer();
      return buildVanillaController(controller);
    },
    destroy() {
      destroyDrawer();
    },
  };
}

export function createDrawer(options: VanillaDrawerOptions = {}) {
  vanillaDrawerOptions = { ...vanillaDrawerOptions, ...options };

  if (!vanillaDrawerController) {
    vanillaDrawerController = createDrawerController(vanillaDrawerOptions);
  } else {
    vanillaDrawerController.patch(vanillaDrawerOptions);
  }

  renderVanillaDrawer();

  return buildVanillaController(vanillaDrawerController);
}

export function configureDrawer(options: VanillaDrawerOptions = {}) {
  return createDrawer(options);
}

export function getDrawer() {
  if (!vanillaDrawerController) {
    return null;
  }

  return buildVanillaController(vanillaDrawerController);
}

export function destroyDrawer() {
  cleanupTriggerElement?.();
  cleanupTriggerElement = null;
  vanillaDrawerRoot?.unmount();
  vanillaDrawerRoot = null;

  if (vanillaDrawerElement && !vanillaDrawerOptions.mountElement && vanillaDrawerElement.parentNode) {
    vanillaDrawerElement.parentNode.removeChild(vanillaDrawerElement);
  }

  vanillaDrawerElement = null;
  vanillaDrawerController = null;
  vanillaDrawerOptions = {};
}

export type {
  CommonDrawerController,
  CommonDrawerDirection,
  CommonDrawerOptions,
  CommonDrawerSnapshot,
  CommonDrawerSnapPoint,
  VanillaDrawerOptions,
  VanillaRenderable,
};

export { createDrawerController } from './core';