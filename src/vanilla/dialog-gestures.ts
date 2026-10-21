import type { VanillaDrawerOptions } from './render'
import type { DialogMountState, DialogCallbacks, DragPointerEvent } from './dialog-state'
import {
  getDirection,
  getSnapPoints,
  getActiveSnapPoint,
  getFadeFromIndex,
  getContainerSize,
  findSnapPointByOffset,
  shouldShowSnapOverlay
} from './dialog-layout'
import { handleDialogKeyDown } from './dialog-focus'
import { applyWrapperDragState, applyBackgroundScaleOpen, isActiveBackgroundScaleOwner } from './dialog-background'
import { CLOSE_THRESHOLD, DRAG_CLASS, SCROLL_LOCK_TIMEOUT, TRANSITIONS, VELOCITY_THRESHOLD } from '../constants'
import { isVertical, set } from '../helpers'
import { getDraggableOffset, getDraggedDistance, getDragPercentage } from '../runtime/drag'
import { getDragPermission, getDragTargetMetadata, type DragTargetMetadata } from '../runtime/drag-policy'
import { getNextHandleState } from '../runtime/handle'
import { getSwipeIntent } from '../runtime/pointer'
import { getDismissibleReleaseResult, getSnapPointReleaseAction } from '../runtime/release'
import {
  getActiveSnapPointIndex,
  getShouldFade,
  getSnapDragValue,
  getSnapPointPercentageDragged,
  getSnapPointsOffset
} from '../runtime/snap-points'
import { getAxisAwareTranslate, getTranslate } from '../runtime/transforms'

function isInteractiveDragTarget(target: Element): boolean {
  const tagName = target.tagName
  if (
    tagName === 'BUTTON' ||
    tagName === 'A' ||
    tagName === 'INPUT' ||
    tagName === 'SELECT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'LABEL' ||
    tagName === 'IFRAME'
  ) {
    return true
  }
  if (target.hasAttribute('role')) {
    const role = target.getAttribute('role')
    if (role && role !== 'presentation' && role !== 'none') {
      return true
    }
  }
  if (target.hasAttribute('tabindex')) {
    const tabIndex = target.getAttribute('tabindex')
    if (tabIndex !== null && tabIndex !== '-1') {
      return true
    }
  }
  // SVG icons inside an interactive parent (e.g. an `<svg>` inside a
  // `<button>`) are not themselves interactive, but they ARE part of
  // an interactive child. Walk up to the closest `<button>`, `<a>`,
  // etc. — if we land on one, the original target is part of an
  // interactive control and the drag pipeline must not capture the
  // pointer.
  const interactiveAncestor = target.closest(
    'button, a[href], input, select, textarea, label, iframe, [role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [role="tab"]'
  )
  return interactiveAncestor !== null
}

export function attachListeners(state: DialogMountState, options: VanillaDrawerOptions, callbacks: DialogCallbacks) {
  if (state.content) {
    const content = state.content
    const onKeyDown = (event: KeyboardEvent) =>
      handleDialogKeyDown(state, content, options, event, callbacks.onOpenChange)
    document.addEventListener('keydown', onKeyDown)
    state.cleanups.push(() => document.removeEventListener('keydown', onKeyDown))
  }

  if (state.overlay && options.dismissible !== false) {
    const overlay = state.overlay
    const onMouseUp = () => {
      // G11: 1:1 with vaul upstream — vaul routes the overlay's
      // mouseup through the same release pipeline as the
      // content's pointerup (`index.tsx:817`: `onMouseUp={onRelease}`).
      // The drawer's content captures the pointer via
      // `setPointerCapture`, so the overlay's mouseup is a
      // rare edge case (only fires when the pointer capture
      // is broken or the drawer is rendered into a portal
      // that escapes the capture). To match vaul's contract
      // without reaching into the content's private
      // `onPointerUp` closure, we guard on `state.drag`:
      // when a drag is in progress, the content's own
      // `onPointerUp` (which fires via the captured pointer)
      // handles the release math; we skip the overlay close
      // to avoid double-firing. When no drag is in progress,
      // we close directly.
      if (!state.drag) {
        callbacks.onOpenChange(false)
      }
    }
    overlay.addEventListener('mouseup', onMouseUp)
    state.cleanups.push(() => overlay.removeEventListener('mouseup', onMouseUp))
  }

  // Drag pipeline:
  //   Phase A — drag-to-dismiss with no snap points, no scale
  //     background, no handle cycle, no viewport.
  //   Phase B — snap-point math when `options.snapPoints` is set:
  //     the dialog tracks the active snap, positions the drawer at
  //     `getSnapDragValue(activeOffset, draggedDistance)`, calls
  //     `getSnapPointReleaseAction` on release, and forwards the
  //     matched snap value through `onActiveSnapPointChange` so the
  //     registry can call `controller.setActiveSnapPoint`.
  if (state.content) {
    const content = state.content
    const direction = getDirection(options)
    const isVerticalAxis = isVertical(direction)
    const closeThreshold = options.closeThreshold ?? CLOSE_THRESHOLD
    const scrollLockTimeout = options.scrollLockTimeout ?? SCROLL_LOCK_TIMEOUT

    const onPointerDown = (rawEvent: Event) => {
      const event = rawEvent as DragPointerEvent
      const dragOptions = state.options
      if (event.button !== undefined && event.button !== 0) return
      if (state.drag || state.cleanupDragGesture) return

      // Beta.4 fix: the previous implementation
      // called `setPointerCapture` BEFORE the drag-permission check.
      // Once `content` captured the pointer, all subsequent pointer
      // events for that pointer id were redirected to `content`, so
      // the browser fired `mouseup` (and therefore `click`) on
      // `content` instead of the original target. Result: clicking
      // the built-in close button (`[data-drawer-close]`), a link,
      // a form input, or any other interactive child of the drawer
      // did not trigger the child's `click` handler. The pointer
      // capture is now taken ONLY when the drag pipeline actually
      // starts a drag, and never on a target the consumer expects to
      // receive its own clicks.
      //
      // We also bail out before the drag pipeline is even consulted
      // when the pointerdown landed on an interactive CHILD of the
      // drawer (button, input, select, textarea, link, the close
      // button itself, or any element explicitly opted out via
      // `data-drawer-no-drag`). Without this, a tap on the close
      // button started a no-op drag with `draggedDistance = 0`, the
      // release path returned `'reset'`, and the drawer stayed
      // open.
      //
      // The check deliberately excludes the drawer itself
      // (`event.target === content`): the content carries
      // `role="dialog"` and `tabindex="-1"` so it is keyboard-
      // focusable, but it is the drag handle, not an interactive
      // child. A drag MUST start when the user grabs the content
      // background.
      const eventTarget = event.target as Element | null
      if (
        dragOptions.handleOnly === true &&
        !(eventTarget instanceof Element && eventTarget.closest('[data-drawer-handle]'))
      ) {
        return
      }
      if (dragOptions.dismissible === false && !getSnapPoints(dragOptions)?.length) return
      const isInteractiveChild =
        eventTarget instanceof Element &&
        eventTarget !== content &&
        !eventTarget.closest('[data-drawer-handle]') &&
        (isInteractiveDragTarget(eventTarget) || Boolean(eventTarget.closest('[data-drawer-close]')))

      if (isInteractiveChild) {
        return
      }

      const metadata: DragTargetMetadata = getDragTargetMetadata(event.target, content)
      const timeSinceOpenMs = state.openedAt !== null ? performance.now() - state.openedAt : null
      // `swipeAmount: null` lets the drag policy treat this as a
      // fresh pointerdown. The remaining fields (highlighted text,
      // last-prevented time, direction consistency) are inert here
      // but the policy signature requires them; we forward the
      // conservative defaults.
      const permission = getDragPermission({
        targetTagName: metadata.targetTagName,
        hasNoDragAttribute: metadata.hasNoDragAttribute,
        direction: getDirection(dragOptions),
        timeSinceOpenMs,
        swipeAmount: null,
        hasHighlightedText: false,
        timeSinceLastPreventedMs: null,
        scrollLockTimeout: dragOptions.scrollLockTimeout ?? scrollLockTimeout,
        isDraggingInDirection: false,
        ancestors: metadata.ancestors
      })

      if (!permission.allow) {
        if (permission.updatePreventedAt) {
          state.lastTimeDragPrevented = performance.now()
        }
        return
      }

      // G5: 1:1 with vaul upstream — capture the drawer's actual
      // rendered dimensions at pointerdown so the drag math
      // (percentageDragged, close threshold) uses the real
      // drawer size instead of the viewport. Without this, a
      // consumer with a non-full-height drawer (e.g. `height:
      // 300px` or `fixed: true` with a constrained height) would
      // miscalculate the drag-to-close threshold.
      const contentRect = content.getBoundingClientRect()
      const fallbackVertical = isVerticalAxis ? window.innerHeight : window.innerWidth
      const currentSnapPoints = getSnapPoints(dragOptions)
      const currentActiveSnapPoint = getActiveSnapPoint(dragOptions)
      const currentSnapPointsOffset = getSnapPointsOffset({
        ...(currentSnapPoints !== undefined ? { snapPoints: currentSnapPoints } : {}),
        direction,
        containerSize: getContainerSize(dragOptions.container ?? null)
      })
      const currentActiveSnapPointIndex = getActiveSnapPointIndex({
        ...(currentSnapPoints !== undefined ? { snapPoints: currentSnapPoints } : {}),
        activeSnapPoint: currentActiveSnapPoint
      })
      const currentActiveSnapPointOffset =
        currentActiveSnapPointIndex !== null && currentActiveSnapPointIndex >= 0
          ? (currentSnapPointsOffset[currentActiveSnapPointIndex] ?? null)
          : null
      const gestureFadeFromIndex = getFadeFromIndex(dragOptions)
      const currentShouldFade = getShouldFade({
        ...(currentSnapPoints !== undefined ? { snapPoints: currentSnapPoints } : {}),
        ...(gestureFadeFromIndex !== undefined ? { fadeFromIndex: gestureFadeFromIndex } : {}),
        activeSnapPoint: currentActiveSnapPoint
      })
      state.drag = {
        pointerStart: { x: event.clientX, y: event.clientY },
        pointerStartTimeStamp: event.timeStamp || performance.now(),
        startedAt: performance.now(),
        draggedDistance: 0,
        isDraggingDown: false,
        snapPointOffset: 0,
        lastTimeDragPrevented: 0,
        pointerId: event.pointerId,
        // Fallback to the viewport when the drawer is not laid out
        // (jsdom tests where `getBoundingClientRect` returns 0,0).
        // vaul falls back to `window.innerWidth/Height` in the
        // `useRef` initializers at `index.tsx:213-214` for the same
        // reason.
        drawerHeight: contentRect.height > 0 ? contentRect.height : fallbackVertical,
        drawerWidth: contentRect.width > 0 ? contentRect.width : fallbackVertical,
        activeSnapPointOffset: currentActiveSnapPointOffset,
        activeSnapPointIndex: currentActiveSnapPointIndex,
        snapPointsOffset: currentSnapPointsOffset,
        shouldFade: currentShouldFade,
        lastPointerEvent: null,
        reachedIntentBoundary: false,
        isAllowed: false
      }

      // F3 / F11: stash the most recent pointermove so the synthetic
      // release listeners (`pointerout`, `contextmenu`,
      // `pointercancel`, see below) can replay the last known
      // gesture position when the real `pointerup` never reaches
      // the content (cursor off the drawer, OS interruption,
      // long-press context menu, etc.).
      let lastPointerMove: DragPointerEvent | null = null
      let pointerCaptured = false

      const onPointerMove = (moveRaw: Event) => {
        const moveEvent = moveRaw as DragPointerEvent
        const drag = state.drag
        if (!drag || moveEvent.pointerId !== drag.pointerId) return
        lastPointerMove = moveEvent
        drag.lastPointerEvent = moveEvent
        const currentPointer = isVerticalAxis ? moveEvent.clientY : moveEvent.clientX
        const draggedDistance = getDraggedDistance({
          pointerStart: isVerticalAxis ? drag.pointerStart.y : drag.pointerStart.x,
          currentPointer,
          direction
        })
        const absDraggedDistance = Math.abs(draggedDistance)
        const isDraggingDown =
          direction === 'bottom' || direction === 'right' ? draggedDistance < 0 : draggedDistance > 0

        if (!drag.reachedIntentBoundary) {
          const delta = {
            x: moveEvent.clientX - drag.pointerStart.x,
            y: moveEvent.clientY - drag.pointerStart.y
          }
          const threshold = moveEvent.pointerType === 'touch' ? 10 : 2
          const intent = getSwipeIntent({
            delta,
            direction,
            threshold,
            wasBeyondThePoint: false
          })
          if (!intent.isAllowed) {
            if (Math.abs(delta.x) > threshold || Math.abs(delta.y) > threshold) {
              state.drag = null
              cleanupGestureListeners()
            }
            return
          }
          if (!intent.reachedIntentBoundary) return

          const liveOptions = state.options
          const timeSinceLastPreventedMs =
            state.lastTimeDragPrevented === null ? null : performance.now() - state.lastTimeDragPrevented
          const movePermission = getDragPermission({
            targetTagName: metadata.targetTagName,
            hasNoDragAttribute: metadata.hasNoDragAttribute,
            direction,
            timeSinceOpenMs: state.openedAt === null ? null : performance.now() - state.openedAt,
            swipeAmount: getTranslate(content, direction) ?? 0,
            hasHighlightedText: Boolean(window.getSelection()?.toString()),
            timeSinceLastPreventedMs,
            scrollLockTimeout: liveOptions.scrollLockTimeout ?? scrollLockTimeout,
            isDraggingInDirection: draggedDistance > 0,
            ancestors: metadata.ancestors
          })
          if (!movePermission.allow) {
            if (movePermission.updatePreventedAt) state.lastTimeDragPrevented = performance.now()
            state.drag = null
            cleanupGestureListeners()
            return
          }

          drag.reachedIntentBoundary = true
          drag.isAllowed = true
          content.classList.add(DRAG_CLASS)
          const capture = content.setPointerCapture
          if (typeof capture === 'function') {
            try {
              capture.call(content, moveEvent.pointerId)
              pointerCaptured = true
            } catch {
              // The pointer may already have been released by the browser.
            }
          }
        }

        if (!drag.isAllowed) return

        // Phase B: when snap points are configured, the inline
        // transform follows `getSnapDragValue` (offset, not value).
        // The percentage reported to the parent is the snap-point
        // percentage so the nested-drawer transform tracks the
        // active snap rather than the raw pixel drag.
        const hasSnapPoints = drag.snapPointsOffset.length > 0 && drag.activeSnapPointOffset !== null
        const snapPointPercentageDragged = hasSnapPoints
          ? getSnapPointPercentageDragged({
              ...(currentSnapPoints !== undefined ? { snapPoints: currentSnapPoints } : {}),
              activeSnapPointIndex: drag.activeSnapPointIndex,
              snapPointsOffset: drag.snapPointsOffset,
              ...(gestureFadeFromIndex !== undefined ? { fadeFromIndex: gestureFadeFromIndex } : {}),
              shouldFade: drag.shouldFade,
              absDraggedDistance,
              isDraggingDown
            })
          : null
        const { percentageDragged } = getDragPercentage({
          draggedDistance,
          drawerDimension: isVerticalAxis ? drag.drawerHeight : drag.drawerWidth,
          snapPointPercentageDragged
        })

        state.drag = {
          ...drag,
          draggedDistance,
          isDraggingDown
        }

        // Phase A: the snap-free path delegates the
        // `draggableOffset` math to `getDraggableOffset`, which
        // applies elastic resistance when the user drags in the
        // OPPOSITE of the close direction (e.g. dragging a
        // `direction='right'` drawer to the left). The drawer
        // still moves but at `DRAG_RESISTANCE` (0.5) of the
        // gesture distance, matching the v2 vaul library and
        // Safari's scroll-bounce. The close direction has no
        // resistance so the close-threshold / velocity math stays
        // predictable. Phase B replaces this with the snap drag
        // value.
        const draggableOffset = hasSnapPoints
          ? getSnapDragValue({
              activeSnapPointOffset: drag.activeSnapPointOffset ?? 0,
              draggedDistance,
              direction
            })
          : getDraggableOffset({ direction, draggedDistance })
        set(content, {
          transform: getAxisAwareTranslate(direction, draggableOffset),
          transition: 'none'
        })

        // Phase B: fade the overlay while dragging in close direction
        // so it lightens as the user drags toward the closed position.
        // Mirrors vaul upstream: the fade runs whenever `shouldFade`
        // is true, which is the case both for snap-point drawers at
        // the `fadeFromIndex` snap AND for snap-free drawers (the
        // overlay always fades during the drag-to-dismiss gesture).
        // Outside the fade window the CSS rule keeps the overlay
        // hidden; we skip the inline write so the CSS transition
        // stays in charge.
        if (
          state.overlay &&
          draggedDistance < 0 &&
          (drag.shouldFade || drag.activeSnapPointIndex === (gestureFadeFromIndex ?? -1) - 1)
        ) {
          set(state.overlay, {
            opacity: `${Math.max(0, Math.min(1, 1 - percentageDragged))}`,
            transition: 'none'
          })
        }

        // Phase C: scale the page wrapper along the drag. We look
        // up the wrapper on every move (cheap query) and forward
        // the percentage to `applyWrapperDragState` which writes
        // `transition: 'none'` so the inline transform is instant
        // and tracks the finger. The wrapper's CSS transition is
        // re-enabled on release by the release handlers below.
        const scaleOwner = state.backgroundScale
        if (scaleOwner && isActiveBackgroundScaleOwner(scaleOwner)) {
          applyWrapperDragState({
            wrapper: scaleOwner.group.wrapper,
            baseScale: scaleOwner.baseScale,
            percentageDragged,
            direction,
            setBackgroundColorOnScale:
              dragOptions.setBackgroundColorOnScale !== false && dragOptions.noBodyStyles !== true
          })
        }

        callbacks.onDragChange?.(percentageDragged)
      }

      const settleOverlay = () => {
        if (!state.overlay) return
        const liveOptions = state.options
        const overlayVisible = shouldShowSnapOverlay(
          getSnapPoints(liveOptions),
          getFadeFromIndex(liveOptions),
          getActiveSnapPoint(liveOptions)
        )
        set(state.overlay, {
          opacity: overlayVisible ? '1' : '0',
          transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
        })
      }

      const settleBackgroundScale = () => {
        const owner = state.backgroundScale
        if (owner && isActiveBackgroundScaleOwner(owner)) applyBackgroundScaleOpen(owner)
      }

      const onPointerUp = (upRaw: Event) => {
        const upEvent = upRaw as DragPointerEvent
        const drag = state.drag
        if (drag && upEvent.pointerId !== undefined && upEvent.pointerId !== drag.pointerId) return
        state.drag = null
        cleanupGestureListeners()
        if (!drag || !drag.isAllowed) return

        state.suppressHandleClick = true
        window.setTimeout(() => {
          state.suppressHandleClick = false
        }, 0)

        const releasedPointer = isVerticalAxis ? upEvent.clientY : upEvent.clientX
        const draggedDistance = getDraggedDistance({
          pointerStart: isVerticalAxis ? drag.pointerStart.y : drag.pointerStart.x,
          currentPointer: releasedPointer,
          direction
        })
        const now = performance.now()
        const velocity = Math.abs(draggedDistance) / Math.max(now - drag.startedAt, 1)

        // G11: high-velocity releases set `justReleased = true` for
        // 200 ms. The `preventBodyScroll` gate (G3) reads this and
        // releases the body-scroll lock so the next focus event on
        // an input inside the drawer does not fight the lock.
        // 1:1 with vaul upstream's `setJustReleased(true)` +
        // 200ms `setTimeout(setJustReleased(false))` in `onRelease`.
        if (velocity > 0.05) {
          state.justReleased = true
          if (state.justReleasedTimer !== null) {
            clearTimeout(state.justReleasedTimer)
          }
          state.justReleasedTimer = setTimeout(() => {
            state.justReleased = false
            state.justReleasedTimer = null
          }, 200)
        }

        const hasSnapPoints = drag.snapPointsOffset.length > 0 && drag.activeSnapPointOffset !== null

        if (hasSnapPoints) {
          // Phase B release: delegate to `getSnapPointReleaseAction`.
          // The helper decides whether the gesture should close,
          // jump to a different snap, or settle on the closest one.
          // The target offset is mapped back to a snap-point value
          // via `findSnapPointByOffset`; on `close` we just call
          // `onOpenChange(false)`. `snapToSequentialPoint` is
          // forwarded so high-velocity flings stay one snap at a
          // time when the consumer opts in.
          const release = getSnapPointReleaseAction({
            ...(gestureFadeFromIndex !== undefined ? { fadeFromIndex: gestureFadeFromIndex } : {}),
            direction,
            activeSnapPointOffset: drag.activeSnapPointOffset,
            activeSnapPointIndex: drag.activeSnapPointIndex,
            snapPointsOffset: drag.snapPointsOffset,
            snapPointsCount: drag.snapPointsOffset.length,
            draggedDistance,
            velocity,
            dismissible: dragOptions.dismissible !== false,
            ...(dragOptions.snapToSequentialPoint !== undefined
              ? { snapToSequentialPoint: dragOptions.snapToSequentialPoint }
              : {}),
            velocityThreshold: VELOCITY_THRESHOLD,
            viewportSize: isVerticalAxis ? drag.drawerHeight : drag.drawerWidth
          })

          if (release.type === 'close') {
            set(content, { transition: 'none' })
            // Keep the release transform. The close mount samples the
            // rendered position, then transitions from there to the
            // direction's closed endpoint without an open-position jump.
            callbacks.onOpenChange(false)
            callbacks.onReleaseChange?.(false)
            return
          }

          if (release.type === 'snap' && typeof release.targetOffset === 'number') {
            const matchedSnapPoint = findSnapPointByOffset(
              currentSnapPoints,
              drag.snapPointsOffset,
              release.targetOffset
            )
            if (matchedSnapPoint !== null) {
              // Forward the new active snap to the registry, which
              // calls `controller.setActiveSnapPoint` and re-renders
              // the dialog. The re-render refreshes `--initial-transform`
              // so the drawer sits at the new snap. We also write
              // the inline transform as a fallback for the
              // pre-render frame.
              set(content, {
                transform: getAxisAwareTranslate(direction, release.targetOffset),
                transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
              })
              // Phase C: settle the wrapper on its rest state with
              // the CSS transition enabled so the visual change
              // from the drag state to `baseScale` is animated.
              settleBackgroundScale()
              callbacks.onActiveSnapPointChange?.(matchedSnapPoint)
              // G8: 1:1 with vaul upstream — when the user snaps
              // to the LAST snap, extend the post-open grace
              // period (vaul: `index.tsx:217-220`). The user just
              // expanded the drawer to full height and is
              // probably scrolling content, not trying to
              // drag-to-close. Without this, the grace period
              // expires 500ms after the initial open and a
              // follow-up scroll can be hijacked as a drag.
              if (currentSnapPoints && matchedSnapPoint === currentSnapPoints[currentSnapPoints.length - 1]) {
                state.openedAt = performance.now()
              }
            } else {
              // No matching snap (degenerate viewport). Reset the
              // inline transform so the drawer stays at the active
              // snap.
              set(content, {
                transform: getAxisAwareTranslate(direction, drag.activeSnapPointOffset ?? 0),
                transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
              })
              settleBackgroundScale()
            }
            settleOverlay()
            callbacks.onReleaseChange?.(true)
            return
          }

          // `type: 'noop'` — drag was inconclusive (no snap points,
          // no offset target). Reset the inline transform so the
          // drawer stays at the active snap.
          set(content, {
            transform: getAxisAwareTranslate(direction, drag.activeSnapPointOffset ?? 0),
            transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
          })
          settleBackgroundScale()
          settleOverlay()
          callbacks.onReleaseChange?.(true)
          return
        }

        // Phase A release: no snap points, delegate to the
        // dismissible release helper.
        const release = getDismissibleReleaseResult({
          direction,
          distMoved: draggedDistance,
          velocity,
          velocityThreshold: VELOCITY_THRESHOLD,
          swipeAmount: draggedDistance,
          drawerDimension: isVerticalAxis ? drag.drawerHeight : drag.drawerWidth,
          closeThreshold
        })

        if (release.action === 'close') {
          set(content, { transition: 'none' })
          // Keep the release transform. The close mount samples the
          // rendered position, then transitions from there to the
          // direction's closed endpoint without an open-position jump.
          callbacks.onOpenChange(false)
          callbacks.onReleaseChange?.(false)
          return
        }

        // Snap back to the open position. The CSS provides the
        // `transform` transition, but the dialog itself is re-mounted
        // by the registry on state change; the inline transition here
        // covers the in-place reset path (no re-render because the
        // drawer stays open).
        set(content, {
          transform: getAxisAwareTranslate(direction, 0),
          transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`
        })
        // Phase C: settle the wrapper on its rest state with the
        // CSS transition enabled so the visual change from the drag
        // state to `baseScale` is animated.
        settleBackgroundScale()
        settleOverlay()
        callbacks.onReleaseChange?.(true)
      }

      // F3 / F11: vaul upstream tracks the most recent `pointermove`
      // event and replays the release path on `pointerout`,
      // `contextmenu`, and `pointercancel`. Without these, dragging
      // off the drawer's bounding box (or triggering a long-press
      // context menu on iOS) leaves the inline transform stuck at
      // the last drag position because the browser never fires a
      // `pointerup` on the content element. The `pointerout` /
      // `contextmenu` / `pointercancel` listeners replay the last
      // known `pointermove` through the same `onPointerUp` handler.
      const onPointerOut = (synthetic: Event) => {
        const drag = state.drag
        if (!drag) return
        const pointerEvent = synthetic as DragPointerEvent
        if (pointerEvent.pointerId !== undefined && pointerEvent.pointerId !== drag.pointerId) return
        const relatedTarget = pointerEvent.relatedTarget
        if (relatedTarget instanceof Node && content.contains(relatedTarget)) return
        if (typeof content.hasPointerCapture === 'function' && content.hasPointerCapture(drag.pointerId)) {
          return
        }
        if (typeof synthetic.preventDefault === 'function') {
          synthetic.preventDefault()
        }
        onPointerUp(lastPointerMove ?? (synthetic as DragPointerEvent))
      }
      const onContextMenu = (synthetic: Event) => {
        if (!state.drag) return
        if (typeof synthetic.preventDefault === 'function') {
          synthetic.preventDefault()
        }
        onPointerUp(lastPointerMove ?? (synthetic as DragPointerEvent))
      }
      const onPointerCancel = (synthetic: Event) => {
        const drag = state.drag
        if (!drag) return
        const pointerEvent = synthetic as DragPointerEvent
        if (pointerEvent.pointerId !== undefined && pointerEvent.pointerId !== drag.pointerId) return
        const resetEvent = {
          clientX: drag.pointerStart.x,
          clientY: drag.pointerStart.y,
          pointerId: drag.pointerId,
          target: synthetic.target,
          currentTarget: content
        } as unknown as DragPointerEvent
        onPointerUp(resetEvent as unknown as Event)
      }

      const cleanupGestureListeners = () => {
        content.removeEventListener('pointermove', onPointerMove)
        content.removeEventListener('pointerup', onPointerUp)
        content.removeEventListener('pointerout', onPointerOut)
        content.removeEventListener('contextmenu', onContextMenu)
        content.removeEventListener('pointercancel', onPointerCancel)
        if (pointerCaptured && typeof content.releasePointerCapture === 'function') {
          try {
            if (typeof content.hasPointerCapture !== 'function' || content.hasPointerCapture(event.pointerId)) {
              content.releasePointerCapture(event.pointerId)
            }
          } catch {
            // Pointer capture may already have been released implicitly.
          }
        }
        pointerCaptured = false
        content.classList.remove(DRAG_CLASS)
        if (state.cleanupDragGesture === cleanupGestureListeners) {
          state.cleanupDragGesture = null
        }
      }

      content.addEventListener('pointermove', onPointerMove)
      content.addEventListener('pointerup', onPointerUp)
      content.addEventListener('pointerout', onPointerOut)
      content.addEventListener('contextmenu', onContextMenu)
      content.addEventListener('pointercancel', onPointerCancel)
      state.cleanupDragGesture = cleanupGestureListeners
    }

    content.addEventListener('pointerdown', onPointerDown)
    state.cleanups.push(() => content.removeEventListener('pointerdown', onPointerDown))
  }

  // Phase D: handle cycle. When the consumer enables
  // `handleOnly: true` or `showHandle: true`, the dialog mounts a
  // built-in `[data-drawer-handle]` element. Clicking it should
  // advance the drawer to the next snap point, or close it (when
  // `dismissible: true`) at the last snap. The math is delegated
  // to `getNextHandleState` (pure helper in `runtime/handle.ts`);
  // the dialog only dispatches the result.
  //
  // Preconditions (enforced here, not in the helper):
  //   1. The drawer must be open. The handle element is in the
  //      DOM at all times (the CSS does not `display: none` it on
  //      close), so a click on a closed drawer's handle would
  //      otherwise fire. We read the content's `data-state` (set
  //      by `applyOpenState`) to gate the dispatch.
  //   2. Drag-priority. While `state.drag` is non-null the click
  //      must not cycle. We pass `isDragging: state.drag !== null`
  //      to the helper, which returns `{ type: 'noop' }`.
  //
  // Long-press is intentionally NOT implemented in Phase D
  // (documented in the deliverable). `shouldCancelInteraction` is
  // hard-coded to `false`. A future phase can wire a pointerdown
  // timer on the handle that flips it to `true` before the click
  // handler fires.
  if (state.handle) {
    const handle = state.handle
    const onHandleClick = () => {
      if (state.content?.dataset.state !== 'open') return
      if (state.suppressHandleClick) return

      const liveOptions = state.options
      const handleSnapPoints = getSnapPoints(liveOptions)
      const handleActiveSnapPoint = getActiveSnapPoint(liveOptions)
      const result = getNextHandleState({
        isDragging: state.drag !== null,
        preventCycle: liveOptions.preventCycle === true,
        shouldCancelInteraction: false,
        ...(handleSnapPoints !== undefined ? { snapPoints: handleSnapPoints } : {}),
        activeSnapPoint: handleActiveSnapPoint,
        dismissible: liveOptions.dismissible !== false
      })

      if (result.type === 'close') {
        callbacks.onOpenChange(false)
        return
      }
      if (result.type === 'snap') {
        // `result.snapPoint` is `null` when the helper cycles past
        // the last snap with `dismissible: false` (length-1 snap
        // list, or a last-snap where the next index is out of
        // bounds). Forward `null` so the registry clears the
        // active snap; the drawer stays open and renders the
        // first snap's offset (via `getActiveSnapPoint`'s fallback
        // in `core/index.ts`).
        callbacks.onActiveSnapPointChange?.(result.snapPoint)
        // G8: 1:1 with vaul upstream — handle-cycle that reaches
        // the last snap also extends the post-open grace period.
        const handleSnapPoints = getSnapPoints(liveOptions)
        if (handleSnapPoints && result.snapPoint === handleSnapPoints[handleSnapPoints.length - 1]) {
          state.openedAt = performance.now()
        }
        return
      }
      // `type: 'noop'` — drag in progress, `preventCycle` is on,
      // no snap points configured with `dismissible: true`, or
      // the active snap is not in the snap-points list. Do
      // nothing.
    }
    handle.addEventListener('click', onHandleClick)
    state.cleanups.push(() => handle.removeEventListener('click', onHandleClick))
  }
}
