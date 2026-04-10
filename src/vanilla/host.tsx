import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { VanillaDrawerRenderer, type VanillaDrawerOptions } from './render';

export interface VanillaHostState {
  root: Root | null;
  element: HTMLElement | null;
  ownsElement: boolean;
}

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function resolveVanillaContainer(state: VanillaHostState, id: string, mountElement?: HTMLElement | null) {
  if (!canUseDOM()) {
    return null;
  }

  if (mountElement) {
    return {
      container: mountElement,
      ownsElement: false,
    };
  }

  if (state.element?.isConnected) {
    return {
      container: state.element,
      ownsElement: state.ownsElement,
    };
  }

  const element = document.createElement('div');
  element.dataset.drawerVanillaRoot = id;
  document.body.appendChild(element);

  return {
    container: element,
    ownsElement: true,
  };
}

export function renderVanillaHost({
  host,
  id,
  options,
  open,
  onBuiltInTriggerMouseDown,
  onBuiltInTriggerClick,
  onOpenChange,
  onDragChange,
  onReleaseChange,
}: {
  host: VanillaHostState;
  id: string;
  options: VanillaDrawerOptions;
  open: boolean;
  onBuiltInTriggerMouseDown?: () => void;
  onBuiltInTriggerClick?: () => void;
  onOpenChange: (open: boolean) => void;
  onDragChange?: (percentageDragged: number) => void;
  onReleaseChange?: (open: boolean) => void;
}) {
  const nextContainer = resolveVanillaContainer(host, id, options.mountElement);
  if (!nextContainer?.container) {
    return null;
  }

  let nextRoot = host.root;
  let nextElement = host.element;
  let nextOwnsElement = host.ownsElement;

  if (nextElement !== nextContainer.container) {
    nextRoot?.unmount();

    if (nextOwnsElement && nextElement?.parentNode) {
      nextElement.parentNode.removeChild(nextElement);
    }

    nextRoot = null;
    nextElement = nextContainer.container;
    nextOwnsElement = nextContainer.ownsElement;
  }

  if (!nextRoot) {
    nextRoot = createRoot(nextContainer.container);
  }

  nextRoot.render(
    React.createElement(VanillaDrawerRenderer, {
      options,
      open,
      onBuiltInTriggerMouseDown,
      onBuiltInTriggerClick,
      onOpenChange,
      onDragChange,
      onReleaseChange,
    }),
  );

  return {
    root: nextRoot,
    element: nextElement,
    ownsElement: nextOwnsElement,
    container: nextContainer.container,
  };
}

export function destroyVanillaHost(host: VanillaHostState) {
  host.root?.unmount();

  if (host.ownsElement && host.element?.parentNode) {
    host.element.parentNode.removeChild(host.element);
  }

  return {
    root: null,
    element: null,
    ownsElement: false,
  };
}