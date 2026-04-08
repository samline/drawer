import React from 'react';

import { Drawer as ReactDrawer, type DialogProps } from '../react/components';
import type { CommonDrawerOptions } from '../core';

export type VanillaRenderable = string | number | HTMLElement | (() => HTMLElement) | null | undefined;

export interface VanillaDrawerOptions extends CommonDrawerOptions {
  mountElement?: HTMLElement | null;
  triggerElement?: HTMLElement | null;
  triggerText?: string;
  showHandle?: boolean;
  handleClassName?: string;
  title?: VanillaRenderable;
  description?: VanillaRenderable;
  content?: VanillaRenderable;
  overlayClassName?: string;
  contentClassName?: string;
}

function toReactDrawerProps(
  options: CommonDrawerOptions,
  open: boolean,
  onOpenChange: NonNullable<DialogProps['onOpenChange']>,
  internalOnDragChange?: (percentageDragged: number) => void,
  internalOnReleaseChange?: (open: boolean) => void,
): DialogProps {
  const { id: _id, parentId: _parentId, onDragChange, onReleaseChange, ...drawerOptions } = options;

  const baseProps = {
    ...drawerOptions,
    open,
    onOpenChange,
    onDrag:
      onDragChange || internalOnDragChange
        ? (_event: React.PointerEvent<HTMLDivElement>, percentageDragged: number) => {
            internalOnDragChange?.(percentageDragged);
            onDragChange?.(percentageDragged);
          }
        : undefined,
    onRelease:
      onReleaseChange || internalOnReleaseChange
        ? (_event: React.PointerEvent<HTMLDivElement>, nextOpen: boolean) => {
            internalOnReleaseChange?.(nextOpen);
            onReleaseChange?.(nextOpen);
          }
        : undefined,
  };

  if (drawerOptions.snapPoints) {
    return {
      ...baseProps,
      snapPoints: drawerOptions.snapPoints,
      fadeFromIndex: drawerOptions.fadeFromIndex ?? drawerOptions.snapPoints.length - 1,
    };
  }

  return {
    ...baseProps,
    snapPoints: undefined,
    fadeFromIndex: undefined,
  };
}

function VanillaNode({ value }: { value?: VanillaRenderable }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.innerHTML = '';

    if (value instanceof HTMLElement) {
      element.appendChild(value);
      return;
    }

    if (typeof value === 'function') {
      const result = value();
      if (result instanceof HTMLElement) {
        element.appendChild(result);
      }
    }
  }, [value]);

  if (typeof value === 'string' || typeof value === 'number') {
    return <>{value}</>;
  }

  if (value == null) {
    return null;
  }

  return <div data-drawer-vanilla-node="" ref={ref} />;
}

export function VanillaDrawerRenderer({
  options,
  open,
  onOpenChange,
  onDragChange,
  onReleaseChange,
}: {
  options: VanillaDrawerOptions;
  open: boolean;
  onOpenChange: NonNullable<DialogProps['onOpenChange']>;
  onDragChange?: (percentageDragged: number) => void;
  onReleaseChange?: (open: boolean) => void;
}) {
  const {
    mountElement: _mountElement,
    triggerElement: _triggerElement,
    triggerText,
    showHandle,
    handleClassName,
    title,
    description,
    content,
    overlayClassName,
    contentClassName,
    ...drawerOptions
  } = options;

  const rootProps = toReactDrawerProps(drawerOptions, open, onOpenChange, onDragChange, onReleaseChange);
  const shouldRenderHandle = Boolean(drawerOptions.handleOnly || showHandle);

  return (
    <ReactDrawer.Root {...rootProps}>
      {triggerText ? (
        <ReactDrawer.Trigger asChild>
          <button type="button" data-drawer-vanilla-trigger="">
            {triggerText}
          </button>
        </ReactDrawer.Trigger>
      ) : null}
      <ReactDrawer.Portal>
        <ReactDrawer.Overlay className={overlayClassName} />
        <ReactDrawer.Content className={contentClassName}>
          {shouldRenderHandle ? <ReactDrawer.Handle className={handleClassName} /> : null}
          {title != null ? (
            <ReactDrawer.Title>
              <VanillaNode value={title} />
            </ReactDrawer.Title>
          ) : null}
          {description != null ? (
            <ReactDrawer.Description>
              <VanillaNode value={description} />
            </ReactDrawer.Description>
          ) : null}
          <VanillaNode value={content} />
        </ReactDrawer.Content>
      </ReactDrawer.Portal>
    </ReactDrawer.Root>
  );
}