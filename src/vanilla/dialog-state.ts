import type { CommonDrawerSnapPoint } from '../core'
import type { VanillaDrawerOptions } from './render'
import type { BackgroundScaleState } from './dialog-background'

/**
 * Minimum attributes a synthetic `Event` must expose for the drag
 * pipeline. Real `PointerEvent` instances satisfy this in browsers;
 * the integration tests in `test/drag-pipeline-integration.test.ts`
 * construct a plain `Event` and attach the geometry fields via
 * `Object.assign` because jsdom does not implement `PointerEvent`.
 */
export interface DragPointerEvent extends Event {
  clientX: number
  clientY: number
  pointerId: number
  pointerType?: string
  button?: number
  relatedTarget?: EventTarget | null
  currentTarget: HTMLElement
  target: EventTarget | null
}

export interface VanillaDialogOptions {
  host: HTMLElement
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
}

/**
 * Per-host drag state. Captured at `pointerdown`, mutated by
 * `pointermove`, and discarded at `pointerup`. Mirrors the `useRef`
 * cluster in the original React component.
 *
 * Phase B uses the snap-point fields when `options.snapPoints` is set:
 * `activeSnapPointOffset` is the runtime offset of the active snap at
 * `pointerdown` time, `activeSnapPointIndex` and `snapPointsOffset`
 * are pre-computed for `getSnapPointReleaseAction`, and `shouldFade`
 * is the `getShouldFade` result for the fade-overlay pipeline.
 */
export interface DragState {
  pointerStart: { x: number; y: number }
  pointerStartTimeStamp: number
  startedAt: number
  draggedDistance: number
  isDraggingDown: boolean
  snapPointOffset: number
  lastTimeDragPrevented: number
  pointerId: number
  /**
   * G5: 1:1 with vaul upstream — the drawer's actual rendered
   * dimensions (height for vertical directions, width for
   * horizontal). Captured at `pointerdown` time via
   * `getBoundingClientRect()` and reused across the entire
   * drag. Used as the denominator for `percentageDragged` and
   * the close-threshold check (vaul: `index.tsx:213-214, 266-267`).
   * Without this, non-full-height drawers (e.g. `height: 300px`
   * or `fixed: true` with a constrained height) would calculate
   * the drag-to-close threshold against the viewport instead of
   * the actual drawer, breaking the gesture.
   */
  drawerHeight: number
  drawerWidth: number
  // Phase B: snap-point context. `null` when no snap points are
  // configured; otherwise the values captured at `pointerdown` and
  // reused across the entire drag.
  activeSnapPointOffset: number | null
  activeSnapPointIndex: number | null
  snapPointsOffset: number[]
  shouldFade: boolean
  lastPointerEvent: DragPointerEvent | null
  reachedIntentBoundary: boolean
  isAllowed: boolean
}

/**
 * Per-host dialog mount state. The host element is reused across
 * `mountVanillaDialog` calls (state changes call it again with the
 * same host); we keep the active overlay / content / trigger
 * references here so we can update them in place instead of
 * rebuilding the tree on every state change.
 */
export interface DialogMountState extends BackgroundScaleState {
  trigger: HTMLButtonElement | null
  cleanupBuiltInTrigger: (() => void) | null
  overlay: HTMLDivElement | null
  content: HTMLDivElement | null
  handle: HTMLButtonElement | null
  title: HTMLDivElement | null
  description: HTMLDivElement | null
  body: HTMLDivElement | null
  /**
   * Built-in close button. Set when `options.closeButton` is truthy
   * and the mount has built the button. `teardownMount` removes it
   * (and the listener it carries) on the next mount. Held here
   * separately from the body / title so the close button's
   * lifecycle is independent of the title / description slots.
   */
  closeButton: HTMLButtonElement | null
  previouslyFocused: HTMLElement | null
  cleanups: Array<() => void>
  options: VanillaDrawerOptions
  mountedOptions: VanillaDrawerOptions | null
  openOrder: number
  hasMounted: boolean
  closeRemovalTimer: number | null
  suppressHandleClick: boolean
  lastTimeDragPrevented: number | null
  /**
   * Restore function returned by `preventBodyScroll()`. Called from
   * `teardownMount` to undo the body-scroll lock. `null` when the
   * drawer was not modal (no lock was applied) or the dialog was
   * not opened yet. Replaces the older `bodyOverflowBackup` /
   * `bodyPaddingRightBackup` pair which only handled desktop
   * browsers. The current pipeline also handles iOS Safari and
   * concurrent owners.
   */
  unlockBodyScroll: (() => void) | null
  restoreBodyPosition: (() => void) | null
  restoreScrollBehavior: (() => void) | null
  openedAt: number | null
  drag: DragState | null
  cleanupDragGesture: (() => void) | null
  // Phase C: background-scale pipeline. `baseScale` is captured at
  // open time so the drag/release math has a single source of truth
  // for the rest-state scale. `clearTimeout` is the pending handle
  // for the `TRANSITIONS.DURATION` deferred clear after a close
  // release; we cancel it on teardown to avoid touching a wrapper
  // that no longer belongs to this drawer.
  // Phase E: viewport / mobile-keyboard pipeline. The
  // `getViewportDrivenDrawerLayout` helper is stateful (it tracks
  // the diff from the initial layout to detect when the mobile
  // keyboard toggles open/closed). The dialog caches the previous
  // values here so the math stays stable across viewport resizes.
  // `activeSnapPointOffset` is also cached so the snap-aware
  // branches of the layout helper see the current snap on every
  // resize (the registry re-renders on `setActiveSnapPoint`, which
  // re-attaches the listener with fresh options).
  keyboardIsOpen: boolean
  previousDiffFromInitial: number
  initialDrawerHeight: number
  activeSnapPointOffset: number
  // Phase E: `history.scrollRestoration` backup. Set to the prior
  // value when `preventScrollRestoration: true` flips it to
  // `'manual'`; cleared in `teardownMount` after restoring. `null`
  // when the dialog never changed the value (e.g. it was already
  // `'manual'` at mount time, or `preventScrollRestoration` is off).
  restoreScrollRestoration: (() => void) | null
  /**
   * G11: `justReleased` ref + timer. Set to `true` in `onPointerUp`
   * when `velocity > 0.05` (high-velocity release). Used by the
   * `preventBodyScroll` gate (G3) to release the body-scroll lock
   * for 200 ms after a fast drag-release, so the next focus event
   * (on an input inside the drawer) does not fight the lock. Reset
   * to `false` after `JUST_RELEASED_TIMEOUT` ms via the stored
   * timer handle (cancelled on teardown to avoid touching a
   * destroyed state).
   */
  justReleased: boolean
  justReleasedTimer: ReturnType<typeof setTimeout> | null
  releaseModalIsolation: (() => void) | null
}

export type DialogCallbacks = {
  onOpenChange: VanillaDialogOptions['onOpenChange']
  onBuiltInTriggerMouseDown?: () => void
  onBuiltInTriggerClick?: () => void
  onDragChange?: (percentageDragged: number) => void
  onReleaseChange?: (open: boolean) => void
  onActiveSnapPointChange?: (snapPoint: CommonDrawerSnapPoint | null) => void
}
