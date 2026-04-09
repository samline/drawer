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
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  title?: VanillaRenderable;
  titleVisuallyHidden?: boolean;
  description?: VanillaRenderable;
  descriptionVisuallyHidden?: boolean;
  content?: VanillaRenderable;
  overlayClassName?: string;
  contentClassName?: string;
}

const VISUALLY_HIDDEN_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

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

function VanillaNode({ value, dataAttribute }: { value?: VanillaRenderable; dataAttribute?: string }) {
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

  return <div {...(dataAttribute ? { [dataAttribute]: '' } : {})} ref={ref} />;
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
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    title,
    titleVisuallyHidden,
    description,
    descriptionVisuallyHidden,
    content,
    overlayClassName,
    contentClassName,
    ...drawerOptions
  } = options;

  const rootProps = toReactDrawerProps(drawerOptions, open, onOpenChange, onDragChange, onReleaseChange);
  const shouldRenderHandle = Boolean(drawerOptions.handleOnly || showHandle);
  const shouldRenderVanillaContent = title != null || description != null || content != null;

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
        <ReactDrawer.Content
          className={contentClassName}
          aria-label={title == null ? ariaLabel : undefined}
          aria-labelledby={title == null ? ariaLabelledBy : undefined}
          aria-describedby={description == null ? ariaDescribedBy : undefined}
        >
          {shouldRenderHandle ? <ReactDrawer.Handle className={handleClassName} /> : null}
          {shouldRenderVanillaContent ? (
            <div data-drawer-vanilla-node="">
              {title != null ? (
                <ReactDrawer.Title style={titleVisuallyHidden ? VISUALLY_HIDDEN_STYLE : undefined}>
                  <VanillaNode value={title} />
                </ReactDrawer.Title>
              ) : null}
              {description != null ? (
                <ReactDrawer.Description style={descriptionVisuallyHidden ? VISUALLY_HIDDEN_STYLE : undefined}>
                  <VanillaNode value={description} />
                </ReactDrawer.Description>
              ) : null}
              <VanillaNode value={content} dataAttribute="data-drawer-vanilla-body" />
            </div>
          ) : null}
        </ReactDrawer.Content>
      </ReactDrawer.Portal>
    </ReactDrawer.Root>
  );
}