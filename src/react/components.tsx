'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import React from 'react';
import { DrawerContext, useDrawerContext } from '../context';
import '../style.css';
import { usePreventScroll, isInput } from '../use-prevent-scroll';
import { useComposedRefs } from '../use-composed-refs';
import { useSnapPoints } from '../use-snap-points';
import { set, getTranslate, dampenValue, isVertical, reset } from '../helpers';
import {
  TRANSITIONS,
  VELOCITY_THRESHOLD,
  CLOSE_THRESHOLD,
  SCROLL_LOCK_TIMEOUT,
  BORDER_RADIUS,
  NESTED_DISPLACEMENT,
  WINDOW_TOP_OFFSET,
  DRAG_CLASS,
} from '../constants';
import { DrawerDirection, DrawerSnapPoint } from '../types';
import { useControllableState } from '../use-controllable-state';
import { useScaleBackground } from '../use-scale-background';
import { usePositionFixed } from '../use-position-fixed';
import { isIOS, isMobileFirefox } from '../browser-utils';
import { useDrawerRuntime } from '../runtime';
import {
  getDragPercentage,
  getDraggedDistance,
  isDraggingTowardExpandedState,
} from '../runtime/drag';
import { getDismissibleReleaseResult } from '../runtime/release';
import {
  getAxisAwareTranslate,
  getBackgroundDragState,
  getBackgroundResetState,
  getNestedDragTransform,
  getNestedDrawerTransform,
  getScaleTranslateTransform,
} from '../runtime/transforms';
import { getSwipeIntent } from '../runtime/pointer';
import { getViewportDrivenDrawerLayout } from '../runtime/viewport';
import { getNextHandleState } from '../runtime/handle';
import { getDragPermission, type DragScrollableAncestor } from '../runtime/drag-policy';

export interface WithFadeFromProps {
  /**
   * Array of numbers from 0 to 100 that corresponds to % of the screen a given snap point should take up.
   * Should go from least visible. Example `[0.2, 0.5, 0.8]`.
   * You can also use px values, which doesn't take screen height into account.
   */
  snapPoints: DrawerSnapPoint[];
  /**
   * Index of a `snapPoint` from which the overlay fade should be applied. Defaults to the last snap point.
   */
  fadeFromIndex: number;
}

export interface WithoutFadeFromProps {
  /**
   * Array of numbers from 0 to 100 that corresponds to % of the screen a given snap point should take up.
   * Should go from least visible. Example `[0.2, 0.5, 0.8]`.
   * You can also use px values, which doesn't take screen height into account.
   */
  snapPoints?: DrawerSnapPoint[];
  fadeFromIndex?: never;
}

export type DialogProps = {
  activeSnapPoint?: DrawerSnapPoint | null;
  setActiveSnapPoint?: (snapPoint: DrawerSnapPoint | null) => void;
  children?: React.ReactNode;
  open?: boolean;
  /**
   * Number between 0 and 1 that determines when the drawer should be closed.
   * Example: threshold of 0.5 would close the drawer if the user swiped for 50% of the height of the drawer or more.
   * @default 0.25
   */
  closeThreshold?: number;
  /**
   * When `true` the `body` doesn't get any drawer-managed styles assigned.
   */
  noBodyStyles?: boolean;
  onOpenChange?: (open: boolean) => void;
  shouldScaleBackground?: boolean;
  /**
   * When `false` we don't change body's background color when the drawer is open.
   * @default true
   */
  setBackgroundColorOnScale?: boolean;
  /**
   * Duration for which the drawer is not draggable after scrolling content inside of the drawer.
   * @default 500ms
   */
  scrollLockTimeout?: number;
  /**
   * When `true`, don't move the drawer upwards if there's space, but rather only change it's height so it's fully scrollable when the keyboard is open
   */
  fixed?: boolean;
  /**
   * When `true` only allows the drawer to be dragged by the `<Drawer.Handle />` component.
   * @default false
   */
  handleOnly?: boolean;
  /**
   * When `false` dragging, clicking outside, pressing esc, etc. will not close the drawer.
   * Use this in comination with the `open` prop, otherwise you won't be able to open/close the drawer.
   * @default true
   */
  dismissible?: boolean;
  onDrag?: (event: React.PointerEvent<HTMLDivElement>, percentageDragged: number) => void;
  onRelease?: (event: React.PointerEvent<HTMLDivElement>, open: boolean) => void;
  /**
   * When `false` it allows to interact with elements outside of the drawer without closing it.
   * @default true
   */
  modal?: boolean;
  nested?: boolean;
  onClose?: () => void;
  /**
   * Direction of the drawer. Can be `top` or `bottom`, `left`, `right`.
   * @default 'bottom'
   */
  direction?: 'top' | 'bottom' | 'left' | 'right';
  /**
   * Opened by default, skips initial enter animation. Still reacts to `open` state changes
   * @default false
   */
  defaultOpen?: boolean;
  /**
   * When set to `true` prevents scrolling on the document body on mount, and restores it on unmount.
   * @default false
   */
  disablePreventScroll?: boolean;
  /**
   * When `true` the drawer will reposition inputs rather than scroll them into view if the keyboard is in the way.
   * Setting it to `false` will fall back to the default browser behavior.
   * @default true when {@link snapPoints} is defined
   */
  repositionInputs?: boolean;
  /**
   * Disabled velocity based swiping for snap points.
   * This means that a snap point won't be skipped even if the velocity is high enough.
   * Useful if each snap point in a drawer is equally important.
   * @default false
   */
  snapToSequentialPoint?: boolean;
  container?: HTMLElement | null;
  /**
   * Gets triggered after the open or close animation ends, it receives an `open` argument with the `open` state of the drawer by the time the function was triggered.
   * Useful to revert any state changes for example.
   */
  onAnimationEnd?: (open: boolean) => void;
  preventScrollRestoration?: boolean;
  autoFocus?: boolean;
} & (WithFadeFromProps | WithoutFadeFromProps);

export function Root({
  open: openProp,
  onOpenChange,
  children,
  onDrag: onDragProp,
  onRelease: onReleaseProp,
  snapPoints,
  shouldScaleBackground = false,
  setBackgroundColorOnScale = true,
  closeThreshold = CLOSE_THRESHOLD,
  scrollLockTimeout = SCROLL_LOCK_TIMEOUT,
  dismissible = true,
  handleOnly = false,
  fadeFromIndex = snapPoints && snapPoints.length - 1,
  activeSnapPoint: activeSnapPointProp,
  setActiveSnapPoint: setActiveSnapPointProp,
  fixed,
  modal = true,
  onClose,
  nested,
  noBodyStyles = false,
  direction = 'bottom',
  defaultOpen = false,
  disablePreventScroll = true,
  snapToSequentialPoint = false,
  preventScrollRestoration = false,
  repositionInputs = true,
  onAnimationEnd,
  container,
  autoFocus = false,
}: DialogProps) {
  const [isOpen = false, setIsOpen] = useControllableState({
    defaultProp: defaultOpen,
    prop: openProp,
    onChange: (o: boolean) => {
      onOpenChange?.(o);

      if (!o && !nested) {
        restorePositionSetting();
      }

      setTimeout(() => {
        onAnimationEnd?.(o);
      }, TRANSITIONS.DURATION * 1000);

      if (o && !modal) {
        if (typeof window !== 'undefined') {
          window.requestAnimationFrame(() => {
            document.body.style.pointerEvents = 'auto';
          });
        }
      }

      if (!o) {
        // This will be removed when the exit animation ends (`500ms`)
        document.body.style.pointerEvents = 'auto';
      }
    },
  });
  const [hasBeenOpened, setHasBeenOpened] = React.useState<boolean>(false);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [justReleased, setJustReleased] = React.useState<boolean>(false);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const openTime = React.useRef<Date | null>(null);
  const dragStartTime = React.useRef<Date | null>(null);
  const dragEndTime = React.useRef<Date | null>(null);
  const lastTimeDragPrevented = React.useRef<Date | null>(null);
  const isAllowedToDrag = React.useRef<boolean>(false);
  const nestedOpenChangeTimer = React.useRef<NodeJS.Timeout | null>(null);
  const pointerStart = React.useRef(0);
  const keyboardIsOpen = React.useRef(false);
  const shouldAnimate = React.useRef(!defaultOpen);
  const previousDiffFromInitial = React.useRef(0);
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const drawerHeightRef = React.useRef(drawerRef.current?.getBoundingClientRect().height || 0);
  const drawerWidthRef = React.useRef(drawerRef.current?.getBoundingClientRect().width || 0);
  const initialDrawerHeight = React.useRef(0);

  const onSnapPointChange = React.useCallback((activeSnapPointIndex: number) => {
    // Change openTime ref when we reach the last snap point to prevent dragging for 500ms incase it's scrollable.
    if (snapPoints && activeSnapPointIndex === snapPointsOffset.length - 1) openTime.current = new Date();
  }, []);

  const {
    activeSnapPoint,
    activeSnapPointIndex,
    setActiveSnapPoint,
    onRelease: onReleaseSnapPoints,
    snapPointsOffset,
    onDrag: onDragSnapPoints,
    shouldFade,
    getPercentageDragged: getSnapPointsPercentageDragged,
  } = useSnapPoints({
    snapPoints,
    activeSnapPointProp,
    setActiveSnapPointProp,
    drawerRef,
    fadeFromIndex,
    overlayRef,
    onSnapPointChange,
    direction,
    container,
    snapToSequentialPoint,
  });

  usePreventScroll({
    isDisabled:
      !isOpen || isDragging || !modal || justReleased || !hasBeenOpened || !repositionInputs || !disablePreventScroll,
  });

  const { restorePositionSetting } = usePositionFixed({
    isOpen,
    modal,
    nested: nested ?? false,
    hasBeenOpened,
    preventScrollRestoration,
    noBodyStyles,
  });

  const { controller, snapshot: runtimeSnapshot } = useDrawerRuntime({
    open: isOpen,
    defaultOpen,
    dismissible,
    modal,
    nested,
    direction,
    snapPoints,
    fadeFromIndex,
    activeSnapPoint,
    closeThreshold,
    scrollLockTimeout,
    shouldScaleBackground,
    setBackgroundColorOnScale,
    handleOnly,
    fixed,
    disablePreventScroll,
    repositionInputs,
    snapToSequentialPoint,
    preventScrollRestoration,
    noBodyStyles,
    autoFocus,
  });

  function getScale() {
    return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
  }

  function onPress(event: React.PointerEvent<HTMLDivElement>) {
    if (!dismissible && !snapPoints) return;
    if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) return;

    drawerHeightRef.current = drawerRef.current?.getBoundingClientRect().height || 0;
    drawerWidthRef.current = drawerRef.current?.getBoundingClientRect().width || 0;
    setIsDragging(true);
    dragStartTime.current = new Date();

    // iOS doesn't trigger mouseUp after scrolling so we need to listen to touched in order to disallow dragging
    if (isIOS()) {
      window.addEventListener('touchend', () => (isAllowedToDrag.current = false), { once: true });
    }
    // Ensure we maintain correct pointer capture even when going outside of the drawer
    (event.target as HTMLElement).setPointerCapture(event.pointerId);

    pointerStart.current = isVertical(direction) ? event.pageY : event.pageX;
  }

  function shouldDrag(el: EventTarget, isDraggingInDirection: boolean) {
    let element = el as HTMLElement;
    const swipeAmount = drawerRef.current ? getTranslate(drawerRef.current, direction) : null;
    const date = new Date();
    const ancestors: DragScrollableAncestor[] = [];

    // Keep climbing up the DOM tree as long as there's a parent
    while (element) {
      ancestors.push({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        scrollTop: element.scrollTop,
        role: element.getAttribute('role'),
      });

      // Move up to the parent element
      element = element.parentNode as HTMLElement;
    }

    const result = getDragPermission({
      targetTagName: (el as HTMLElement).tagName,
      hasNoDragAttribute:
        (el as HTMLElement).hasAttribute('data-vaul-no-drag') || Boolean((el as HTMLElement).closest('[data-vaul-no-drag]')),
      direction,
      timeSinceOpenMs: openTime.current ? date.getTime() - openTime.current.getTime() : null,
      swipeAmount,
      hasHighlightedText: Boolean(window.getSelection()?.toString()),
      timeSinceLastPreventedMs: lastTimeDragPrevented.current ? date.getTime() - lastTimeDragPrevented.current.getTime() : null,
      scrollLockTimeout,
      isDraggingInDirection,
      ancestors,
    });

    if (result.updatePreventedAt) {
      lastTimeDragPrevented.current = date;
    }

    return result.allow;
  }

  function onDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!drawerRef.current) {
      return;
    }

    // We need to know how much of the drawer has been dragged in percentages so that we can transform background accordingly
    if (isDragging) {
      const draggedDistance = getDraggedDistance({
        pointerStart: pointerStart.current,
        currentPointer: isVertical(direction) ? event.pageY : event.pageX,
        direction,
      });
      const isDraggingInDirection = isDraggingTowardExpandedState(draggedDistance);

      // Pre condition for disallowing dragging in the close direction.
      const noCloseSnapPointsPreCondition = snapPoints && !dismissible && !isDraggingInDirection;

      // Disallow dragging down to close when first snap point is the active one and dismissible prop is set to false.
      if (noCloseSnapPointsPreCondition && activeSnapPointIndex === 0) return;

      // We need to capture last time when drag with scroll was triggered and have a timeout between
      const absDraggedDistance = Math.abs(draggedDistance);
      const wrapper = document.querySelector('[data-vaul-drawer-wrapper]');
      const drawerDimension =
        direction === 'bottom' || direction === 'top' ? drawerHeightRef.current : drawerWidthRef.current;

      // Calculate the percentage dragged, where 1 is the closed position
      const snapPointPercentageDragged = getSnapPointsPercentageDragged(absDraggedDistance, isDraggingInDirection);
      const { percentageDragged } = getDragPercentage({
        draggedDistance,
        drawerDimension,
        snapPointPercentageDragged,
      });

      // Disallow close dragging beyond the smallest snap point.
      if (noCloseSnapPointsPreCondition && percentageDragged >= 1) {
        return;
      }

      if (!isAllowedToDrag.current && !shouldDrag(event.target, isDraggingInDirection)) return;
      drawerRef.current.classList.add(DRAG_CLASS);
      // If shouldDrag gave true once after pressing down on the drawer, we set isAllowedToDrag to true and it will remain true until we let go, there's no reason to disable dragging mid way, ever, and that's the solution to it
      isAllowedToDrag.current = true;
      set(drawerRef.current, {
        transition: 'none',
      });

      set(overlayRef.current, {
        transition: 'none',
      });

      if (snapPoints) {
        onDragSnapPoints({ draggedDistance });
      }

      // Run this only if snapPoints are not defined or if we are at the last snap point (highest one)
      if (isDraggingInDirection && !snapPoints) {
        const dampenedDraggedDistance = dampenValue(draggedDistance);

        const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * (direction === 'bottom' || direction === 'right' ? 1 : -1);
        set(drawerRef.current, {
          transform: getAxisAwareTranslate(direction, translateValue),
        });
        return;
      }

      const opacityValue = 1 - percentageDragged;

      if (shouldFade || (fadeFromIndex && activeSnapPointIndex === fadeFromIndex - 1)) {
        onDragProp?.(event, percentageDragged);

        set(
          overlayRef.current,
          {
            opacity: `${opacityValue}`,
            transition: 'none',
          },
          true,
        );
      }

      if (wrapper && overlayRef.current && shouldScaleBackground) {
        const { scaleValue, borderRadiusValue, translateValue } = getBackgroundDragState({
          baseScale: getScale(),
          percentageDragged,
        });

        set(
          wrapper,
          {
            borderRadius: `${borderRadiusValue}px`,
            transform: getScaleTranslateTransform({ direction, scale: scaleValue, translate: `${translateValue}px` }),
            transition: 'none',
          },
          true,
        );
      }

      if (!snapPoints) {
        const translateValue = absDraggedDistance * (direction === 'bottom' || direction === 'right' ? 1 : -1);

        set(drawerRef.current, {
          transform: getAxisAwareTranslate(direction, translateValue),
        });
      }
    }
  }

  React.useEffect(() => {
    window.requestAnimationFrame(() => {
      shouldAnimate.current = true;
    });
  }, []);

  React.useEffect(() => {
    function onVisualViewportChange() {
      if (!drawerRef.current || !repositionInputs) return;

      const focusedElement = document.activeElement as HTMLElement;
      if (isInput(focusedElement) || keyboardIsOpen.current) {
        const drawerHeight = drawerRef.current.getBoundingClientRect().height || 0;
        const offsetFromTop = drawerRef.current.getBoundingClientRect().top;
        const activeSnapPointOffset =
          snapPoints && snapPoints.length > 0 && snapPointsOffset && activeSnapPointIndex
            ? snapPointsOffset[activeSnapPointIndex] || 0
            : undefined;

        const layout = getViewportDrivenDrawerLayout({
          visualViewportHeight: window.visualViewport?.height || 0,
          totalHeight: window.innerHeight,
          drawerHeight,
          offsetFromTop,
          fixed,
          previousDiffFromInitial: previousDiffFromInitial.current,
          keyboardIsOpen: keyboardIsOpen.current,
          initialDrawerHeight: initialDrawerHeight.current,
          activeSnapPointOffset,
          isMobileFirefox: Boolean(isMobileFirefox()),
          windowTopOffset: WINDOW_TOP_OFFSET,
        });

        initialDrawerHeight.current = layout.nextInitialDrawerHeight;
        previousDiffFromInitial.current = layout.diffFromInitial;
        keyboardIsOpen.current = layout.nextKeyboardIsOpen;

        if (layout.height !== null) {
          drawerRef.current.style.height = layout.height;
        }

        drawerRef.current.style.bottom = layout.bottom;
      }
    }

    window.visualViewport?.addEventListener('resize', onVisualViewportChange);
    return () => window.visualViewport?.removeEventListener('resize', onVisualViewportChange);
  }, [activeSnapPointIndex, snapPoints, snapPointsOffset]);

  function closeDrawer(fromWithin?: boolean) {
    cancelDrag();
    onClose?.();

    if (!fromWithin) {
      setIsOpen(false);
    }

    setTimeout(() => {
      if (snapPoints) {
        setActiveSnapPoint(snapPoints[0]);
      }
    }, TRANSITIONS.DURATION * 1000); // seconds to ms
  }

  function resetDrawer() {
    if (!drawerRef.current) return;
    const wrapper = document.querySelector('[data-vaul-drawer-wrapper]');
    const currentSwipeAmount = getTranslate(drawerRef.current, direction);

    set(drawerRef.current, {
      transform: 'translate3d(0, 0, 0)',
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
    });

    set(overlayRef.current, {
      transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      opacity: '1',
    });

    // Don't reset background if swiped upwards
    if (shouldScaleBackground && currentSwipeAmount && currentSwipeAmount > 0 && isOpen) {
      const backgroundResetState = getBackgroundResetState({
        direction,
        baseScale: getScale(),
      });

      set(
        wrapper,
        {
          ...backgroundResetState,
          transitionProperty: 'transform, border-radius',
          transitionDuration: `${TRANSITIONS.DURATION}s`,
          transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
        },
        true,
      );
    }
  }

  function cancelDrag() {
    if (!isDragging || !drawerRef.current) return;

    drawerRef.current.classList.remove(DRAG_CLASS);
    isAllowedToDrag.current = false;
    setIsDragging(false);
    dragEndTime.current = new Date();
  }

  function onRelease(event: React.PointerEvent<HTMLDivElement> | null) {
    if (!isDragging || !drawerRef.current) return;

    drawerRef.current.classList.remove(DRAG_CLASS);
    isAllowedToDrag.current = false;
    setIsDragging(false);
    dragEndTime.current = new Date();
    const swipeAmount = getTranslate(drawerRef.current, direction);

    if (!event || !shouldDrag(event.target, false) || !swipeAmount || Number.isNaN(swipeAmount)) return;

    if (dragStartTime.current === null) return;

    const timeTaken = dragEndTime.current.getTime() - dragStartTime.current.getTime();
    const distMoved = pointerStart.current - (isVertical(direction) ? event.pageY : event.pageX);
    const velocity = Math.abs(distMoved) / timeTaken;

    if (snapPoints) {
      const directionMultiplier = direction === 'bottom' || direction === 'right' ? 1 : -1;
      onReleaseSnapPoints({
        draggedDistance: distMoved * directionMultiplier,
        closeDrawer,
        velocity,
        dismissible,
      });
      onReleaseProp?.(event, true);
      return;
    }

    const visibleDrawerHeight = Math.min(drawerRef.current.getBoundingClientRect().height ?? 0, window.innerHeight);
    const visibleDrawerWidth = Math.min(drawerRef.current.getBoundingClientRect().width ?? 0, window.innerWidth);

    const releaseResult = getDismissibleReleaseResult({
      direction,
      distMoved,
      velocity,
      velocityThreshold: VELOCITY_THRESHOLD,
      swipeAmount,
      drawerDimension: direction === 'left' || direction === 'right' ? visibleDrawerWidth : visibleDrawerHeight,
      closeThreshold,
    });

    if (releaseResult.shouldPreventFocus) {
      // `justReleased` is needed to prevent the drawer from focusing on an input when the drag ends, as it's not the intent most of the time.
      setJustReleased(true);

      setTimeout(() => {
        setJustReleased(false);
      }, 200);
    }

    if (releaseResult.action === 'close') {
      closeDrawer();
      onReleaseProp?.(event, false);
      return;
    }

    onReleaseProp?.(event, true);
    resetDrawer();
  }

  React.useEffect(() => {
    // Trigger enter animation without using CSS animation
    if (isOpen) {
      set(document.documentElement, {
        scrollBehavior: 'auto',
      });

      openTime.current = new Date();
    }

    return () => {
      reset(document.documentElement, 'scrollBehavior');
    };
  }, [isOpen]);

  function onNestedOpenChange(o: boolean) {
    const { transform } = getNestedDrawerTransform({
      direction,
      isOpen: o,
      viewportSize: window.innerWidth,
      displacement: NESTED_DISPLACEMENT,
    });

    if (nestedOpenChangeTimer.current) {
      window.clearTimeout(nestedOpenChangeTimer.current);
    }

    set(drawerRef.current, {
      transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      transform,
    });

    if (!o && drawerRef.current) {
      nestedOpenChangeTimer.current = setTimeout(() => {
        const translateValue = getTranslate(drawerRef.current as HTMLElement, direction);
        set(drawerRef.current, {
          transition: 'none',
          transform: getAxisAwareTranslate(direction, translateValue ?? 0),
        });
      }, 500);
    }
  }

  function onNestedDrag(_event: React.PointerEvent<HTMLDivElement>, percentageDragged: number) {
    if (percentageDragged < 0) return;

    const { transform } = getNestedDragTransform({
      direction,
      viewportSize: window.innerWidth,
      displacement: NESTED_DISPLACEMENT,
      percentageDragged,
    });

    set(drawerRef.current, {
      transform,
      transition: 'none',
    });
  }

  function onNestedRelease(_event: React.PointerEvent<HTMLDivElement>, o: boolean) {
    const dim = isVertical(direction) ? window.innerHeight : window.innerWidth;
    const { transform } = getNestedDrawerTransform({
      direction,
      isOpen: o,
      viewportSize: dim,
      displacement: NESTED_DISPLACEMENT,
    });

    if (o) {
      set(drawerRef.current, {
        transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
        transform,
      });
    }
  }

  React.useEffect(() => {
    if (!modal) {
      // Need to do this manually unfortunately
      window.requestAnimationFrame(() => {
        document.body.style.pointerEvents = 'auto';
      });
    }
  }, [modal]);

  return (
    <DialogPrimitive.Root
      defaultOpen={defaultOpen}
      onOpenChange={(open) => {
        if (!dismissible && !open) return;
        if (open) {
          setHasBeenOpened(true);
        } else {
          closeDrawer(true);
        }

        setIsOpen(open);
      }}
      open={isOpen}
      modal={modal}
    >
      <DrawerContext.Provider
        value={{
          controller,
          runtimeSnapshot,
          activeSnapPoint,
          snapPoints,
          setActiveSnapPoint,
          drawerRef,
          overlayRef,
          onOpenChange,
          onPress,
          onRelease,
          onDrag,
          dismissible,
          shouldAnimate,
          handleOnly,
          isOpen,
          isDragging,
          shouldFade,
          closeDrawer,
          onNestedDrag,
          onNestedOpenChange,
          onNestedRelease,
          keyboardIsOpen,
          modal,
          snapPointsOffset,
          activeSnapPointIndex,
          direction,
          shouldScaleBackground,
          setBackgroundColorOnScale,
          noBodyStyles,
          container,
          autoFocus,
        }}
      >
        {children}
      </DrawerContext.Provider>
    </DialogPrimitive.Root>
  );
}

export const Overlay = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  function ({ ...rest }, ref) {
    const { overlayRef, snapPoints, onRelease, shouldFade, isOpen, modal, shouldAnimate } = useDrawerContext();
    const composedRef = useComposedRefs(ref, overlayRef);
    const hasSnapPoints = snapPoints && snapPoints.length > 0;
    const onMouseUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => onRelease(event), [onRelease]);

    // Overlay is the component that is locking scroll, removing it will unlock the scroll without having to dig into Radix's Dialog library
    if (!modal) {
      return null;
    }

    return (
      <DialogPrimitive.Overlay
        onMouseUp={onMouseUp}
        ref={composedRef}
        data-vaul-overlay=""
        data-vaul-snap-points={isOpen && hasSnapPoints ? 'true' : 'false'}
        data-vaul-snap-points-overlay={isOpen && shouldFade ? 'true' : 'false'}
        data-vaul-animate={shouldAnimate?.current ? 'true' : 'false'}
        {...rest}
      />
    );
  },
);

Overlay.displayName = 'Drawer.Overlay';

export type ContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>;

export const Content = React.forwardRef<HTMLDivElement, ContentProps>(function (
  { onPointerDownOutside, style, onOpenAutoFocus, ...rest },
  ref,
) {
  const {
    drawerRef,
    onPress,
    onRelease,
    onDrag,
    keyboardIsOpen,
    snapPointsOffset,
    activeSnapPointIndex,
    modal,
    isOpen,
    direction,
    snapPoints,
    container,
    handleOnly,
    shouldAnimate,
    autoFocus,
  } = useDrawerContext();
  // Needed to use transition instead of animations
  const [delayedSnapPoints, setDelayedSnapPoints] = React.useState(false);
  const composedRef = useComposedRefs(ref, drawerRef);
  const pointerStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const lastKnownPointerEventRef = React.useRef<React.PointerEvent<HTMLDivElement> | null>(null);
  const wasBeyondThePointRef = React.useRef(false);
  const hasSnapPoints = snapPoints && snapPoints.length > 0;
  useScaleBackground();

  React.useEffect(() => {
    if (hasSnapPoints) {
      window.requestAnimationFrame(() => {
        setDelayedSnapPoints(true);
      });
    }
  }, []);

  function handleOnPointerUp(event: React.PointerEvent<HTMLDivElement> | null) {
    pointerStartRef.current = null;
    wasBeyondThePointRef.current = false;
    onRelease(event);
  }

  return (
    <DialogPrimitive.Content
      data-vaul-drawer-direction={direction}
      data-vaul-drawer=""
      data-vaul-delayed-snap-points={delayedSnapPoints ? 'true' : 'false'}
      data-vaul-snap-points={isOpen && hasSnapPoints ? 'true' : 'false'}
      data-vaul-custom-container={container ? 'true' : 'false'}
      data-vaul-animate={shouldAnimate?.current ? 'true' : 'false'}
      {...rest}
      ref={composedRef}
      style={
        snapPointsOffset && snapPointsOffset.length > 0
          ? ({
              '--snap-point-height': `${snapPointsOffset[activeSnapPointIndex ?? 0]!}px`,
              ...style,
            } as React.CSSProperties)
          : style
      }
      onPointerDown={(event) => {
        if (handleOnly) return;
        rest.onPointerDown?.(event);
        pointerStartRef.current = { x: event.pageX, y: event.pageY };
        onPress(event);
      }}
      onOpenAutoFocus={(e) => {
        onOpenAutoFocus?.(e);

        if (!autoFocus) {
          e.preventDefault();
        }
      }}
      onPointerDownOutside={(e) => {
        onPointerDownOutside?.(e);

        if (!modal || e.defaultPrevented) {
          e.preventDefault();
          return;
        }

        if (keyboardIsOpen.current) {
          keyboardIsOpen.current = false;
        }
      }}
      onFocusOutside={(e) => {
        if (!modal) {
          e.preventDefault();
          return;
        }
      }}
      onPointerMove={(event) => {
        lastKnownPointerEventRef.current = event;
        if (handleOnly) return;
        rest.onPointerMove?.(event);
        if (!pointerStartRef.current) return;
        const yPosition = event.pageY - pointerStartRef.current.y;
        const xPosition = event.pageX - pointerStartRef.current.x;

        const swipeStartThreshold = event.pointerType === 'touch' ? 10 : 2;
        const delta = { x: xPosition, y: yPosition };

        const { isAllowed, reachedIntentBoundary } = getSwipeIntent({
          delta,
          direction,
          threshold: swipeStartThreshold,
          wasBeyondThePoint: wasBeyondThePointRef.current,
        });

        if (reachedIntentBoundary) {
          wasBeyondThePointRef.current = true;
        }

        const isAllowedToSwipe = isAllowed;
        if (isAllowedToSwipe) onDrag(event);
        else if (Math.abs(xPosition) > swipeStartThreshold || Math.abs(yPosition) > swipeStartThreshold) {
          pointerStartRef.current = null;
        }
      }}
      onPointerUp={(event) => {
        rest.onPointerUp?.(event);
        pointerStartRef.current = null;
        wasBeyondThePointRef.current = false;
        onRelease(event);
      }}
      onPointerOut={(event) => {
        rest.onPointerOut?.(event);
        handleOnPointerUp(lastKnownPointerEventRef.current);
      }}
      onContextMenu={(event) => {
        rest.onContextMenu?.(event);
        if (lastKnownPointerEventRef.current) {
          handleOnPointerUp(lastKnownPointerEventRef.current);
        }
      }}
    />
  );
});

Content.displayName = 'Drawer.Content';

export type HandleProps = React.ComponentPropsWithoutRef<'div'> & {
  preventCycle?: boolean;
};

const LONG_HANDLE_PRESS_TIMEOUT = 250;
const DOUBLE_TAP_TIMEOUT = 120;

export const Handle = React.forwardRef<HTMLDivElement, HandleProps>(function (
  { preventCycle = false, children, ...rest },
  ref,
) {
  const {
    closeDrawer,
    isDragging,
    snapPoints,
    activeSnapPoint,
    setActiveSnapPoint,
    dismissible,
    handleOnly,
    isOpen,
    onPress,
    onDrag,
  } = useDrawerContext();

  const closeTimeoutIdRef = React.useRef<number | null>(null);
  const shouldCancelInteractionRef = React.useRef(false);

  function handleStartCycle() {
    // Stop if this is the second click of a double click
    if (shouldCancelInteractionRef.current) {
      handleCancelInteraction();
      return;
    }
    window.setTimeout(() => {
      handleCycleSnapPoints();
    }, DOUBLE_TAP_TIMEOUT);
  }

  function handleCycleSnapPoints() {
    // Make sure to clear the timeout id if the user releases the handle before the cancel timeout
    handleCancelInteraction();

    const nextState = getNextHandleState({
      isDragging,
      preventCycle,
      shouldCancelInteraction: shouldCancelInteractionRef.current,
      snapPoints: snapPoints ?? undefined,
      activeSnapPoint,
      dismissible,
    });

    if (nextState.type === 'noop') {
      return;
    }

    if (nextState.type === 'close') {
      closeDrawer();
      return;
    }

    setActiveSnapPoint(nextState.snapPoint);
  }

  function handleStartInteraction() {
    closeTimeoutIdRef.current = window.setTimeout(() => {
      // Cancel click interaction on a long press
      shouldCancelInteractionRef.current = true;
    }, LONG_HANDLE_PRESS_TIMEOUT);
  }

  function handleCancelInteraction() {
    if (closeTimeoutIdRef.current) {
      window.clearTimeout(closeTimeoutIdRef.current);
    }
    shouldCancelInteractionRef.current = false;
  }

  return (
    <div
      onClick={handleStartCycle}
      onPointerCancel={handleCancelInteraction}
      onPointerDown={(e) => {
        if (handleOnly) onPress(e);
        handleStartInteraction();
      }}
      onPointerMove={(e) => {
        if (handleOnly) onDrag(e);
      }}
      // onPointerUp is already handled by the content component
      ref={ref}
      data-vaul-drawer-visible={isOpen ? 'true' : 'false'}
      data-vaul-handle=""
      aria-hidden="true"
      {...rest}
    >
      {/* Expand handle's hit area beyond what's visible to ensure a 44x44 tap target for touch devices */}
      <span data-vaul-handle-hitarea="" aria-hidden="true">
        {children}
      </span>
    </div>
  );
});

Handle.displayName = 'Drawer.Handle';

export function NestedRoot({ onDrag, onOpenChange, open: nestedIsOpen, ...rest }: DialogProps) {
  const { onNestedDrag, onNestedOpenChange, onNestedRelease } = useDrawerContext();

  if (!onNestedDrag) {
    throw new Error('Drawer.NestedRoot must be placed in another drawer');
  }

  return (
    <Root
      nested
      open={nestedIsOpen}
      onClose={() => {
        onNestedOpenChange(false);
      }}
      onDrag={(e, p) => {
        onNestedDrag(e, p);
        onDrag?.(e, p);
      }}
      onOpenChange={(o) => {
        if (o) {
          onNestedOpenChange(o);
        }
        onOpenChange?.(o);
      }}
      onRelease={onNestedRelease}
      {...rest}
    />
  );
}

type PortalProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>;

export function Portal(props: PortalProps) {
  const context = useDrawerContext();
  const { container = context.container, ...portalProps } = props;

  return <DialogPrimitive.Portal container={container} {...portalProps} />;
}

export const Drawer = {
  Root,
  NestedRoot,
  Content,
  Overlay,
  Trigger: DialogPrimitive.Trigger,
  Portal,
  Handle,
  Close: DialogPrimitive.Close,
  Title: DialogPrimitive.Title,
  Description: DialogPrimitive.Description,
};
