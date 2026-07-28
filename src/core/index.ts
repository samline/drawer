export type CommonDrawerDirection = 'top' | 'bottom' | 'left' | 'right'

export type CommonDrawerSnapPoint = number | string

export type CommonDrawerId = string

export interface CommonDrawerOptions {
  id?: CommonDrawerId
  parentId?: CommonDrawerId
  /**
   * Whether the drawer is open at mount time.
   *
   * - `undefined` (default): the drawer is closed at mount. Call
   *   `setOpen(true)` later to open it. The drawer's open / close
   *   animations run normally.
   * - `true`: the drawer is open immediately when `createDrawer`
   *   runs. No mount animation is shown. Use this for dialogs
   *   that should be visible as soon as they are created (e.g.
   *   a flash message that should show on every page load).
   *   Note: under Vite HMR, the drawer will be re-mounted on
   *   every save, which can cause a brief flash. For dialogs
   *   that should appear on mount but are stable across HMR,
   *   prefer `open: false` + an explicit `setOpen(true)` call
   *   after the drawer is mounted (deferred with
   *   `queueMicrotask` so the open animation runs).
   * - `false`: explicit closed-at-mount. Same as `undefined` —
   *   useful when the consumer wants to be clear about the
   *   initial state.
   *
   * The visual surface uses lazy presence: an initially closed drawer
   * keeps its host and optional trigger, then mounts the overlay and
   * content on first open. Initial open state is still resolved when
   * the controller is created.
   */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  onAnimationEnd?: (open: boolean) => void
  /**
   * G9: 1:1 with vaul upstream — fires when the internal active
   * snap point changes (drag release, handle cycle, or
   * programmatic `setActiveSnapPoint`). The callback signature
   * matches vaul's `setActiveSnapPoint` controlled-prop pattern
   * but flipped: the drawer calls this when it changes the
   * active snap, and the consumer can use it to keep external
   * state in sync.
   */
  onActiveSnapPointChange?: (snapPoint: CommonDrawerSnapPoint | null) => void
  onDragChange?: (percentageDragged: number) => void
  onReleaseChange?: (open: boolean) => void
  dismissible?: boolean
  modal?: boolean
  nested?: boolean
  direction?: CommonDrawerDirection
  snapPoints?: CommonDrawerSnapPoint[]
  fadeFromIndex?: number
  activeSnapPoint?: CommonDrawerSnapPoint | null
  closeThreshold?: number
  scrollLockTimeout?: number
  shouldScaleBackground?: boolean
  setBackgroundColorOnScale?: boolean
  handleOnly?: boolean
  fixed?: boolean
  disablePreventScroll?: boolean
  repositionInputs?: boolean
  snapToSequentialPoint?: boolean
  preventScrollRestoration?: boolean
  noBodyStyles?: boolean
  autoFocus?: boolean
  /**
   * Phase D: when `true`, the built-in `[data-drawer-handle]` element
   * is rendered but its click-to-cycle behavior is disabled. The
   * consumer can still drag from the handle (Phase A pipeline), but
   * clicking it is a no-op. The default is `false` (cycle enabled).
   *
   * Mirrors the React `Drawer.Handle` `preventCycle` prop.
   */
  preventCycle?: boolean
}

export interface CommonDrawerState {
  isOpen: boolean
  activeSnapPoint: CommonDrawerSnapPoint | null
  direction: CommonDrawerDirection
  snapPoints: CommonDrawerSnapPoint[]
  dismissible: boolean
  modal: boolean
}

export interface CommonDrawerSnapshot {
  options: CommonDrawerOptions
  state: CommonDrawerState
}

export interface CommonDrawerController {
  getSnapshot: () => CommonDrawerSnapshot
  setOpen: (open: boolean) => CommonDrawerSnapshot
  setActiveSnapPoint: (snapPoint: CommonDrawerSnapPoint | null) => CommonDrawerSnapshot
  patch: (options: Partial<CommonDrawerOptions>) => CommonDrawerSnapshot
  subscribe: (listener: (snapshot: CommonDrawerSnapshot) => void) => () => void
}

const DEFAULT_OPTIONS: Required<Pick<CommonDrawerOptions, 'direction' | 'dismissible' | 'modal'>> = {
  direction: 'bottom',
  dismissible: true,
  modal: true
}

function toSnapshot(options: CommonDrawerOptions): CommonDrawerSnapshot {
  return {
    options,
    state: {
      isOpen: Boolean(options.open ?? options.defaultOpen),
      activeSnapPoint: options.activeSnapPoint ?? options.snapPoints?.[0] ?? null,
      direction: options.direction ?? DEFAULT_OPTIONS.direction,
      snapPoints: options.snapPoints ?? [],
      dismissible: options.dismissible ?? DEFAULT_OPTIONS.dismissible,
      modal: options.modal ?? DEFAULT_OPTIONS.modal
    }
  }
}

export function createDrawerController(initialOptions: CommonDrawerOptions = {}): CommonDrawerController {
  let options: CommonDrawerOptions = { ...initialOptions }
  let snapshot = toSnapshot(options)
  const listeners = new Set<(snapshot: CommonDrawerSnapshot) => void>()

  function publish() {
    snapshot = toSnapshot(options)
    listeners.forEach((listener) => listener(snapshot))
    return snapshot
  }

  return {
    getSnapshot() {
      return snapshot
    },
    setOpen(open) {
      options = { ...options, open }
      return publish()
    },
    setActiveSnapPoint(activeSnapPoint) {
      options = { ...options, activeSnapPoint }
      return publish()
    },
    patch(nextOptions) {
      options = { ...options, ...nextOptions }
      return publish()
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot)

      return () => {
        listeners.delete(listener)
      }
    }
  }
}
