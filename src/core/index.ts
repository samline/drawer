export type CommonDrawerDirection = 'top' | 'bottom' | 'left' | 'right';

export type CommonDrawerSnapPoint = number | string;

export type CommonDrawerId = string;

export interface CommonDrawerOptions {
  id?: CommonDrawerId;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onAnimationEnd?: (open: boolean) => void;
  onDragChange?: (percentageDragged: number) => void;
  onReleaseChange?: (open: boolean) => void;
  dismissible?: boolean;
  modal?: boolean;
  nested?: boolean;
  direction?: CommonDrawerDirection;
  snapPoints?: CommonDrawerSnapPoint[];
  fadeFromIndex?: number;
  activeSnapPoint?: CommonDrawerSnapPoint | null;
  closeThreshold?: number;
  scrollLockTimeout?: number;
  shouldScaleBackground?: boolean;
  setBackgroundColorOnScale?: boolean;
  handleOnly?: boolean;
  fixed?: boolean;
  disablePreventScroll?: boolean;
  repositionInputs?: boolean;
  snapToSequentialPoint?: boolean;
  preventScrollRestoration?: boolean;
  noBodyStyles?: boolean;
  autoFocus?: boolean;
}

export interface CommonDrawerState {
  isOpen: boolean;
  activeSnapPoint: CommonDrawerSnapPoint | null;
  direction: CommonDrawerDirection;
  snapPoints: CommonDrawerSnapPoint[];
  dismissible: boolean;
  modal: boolean;
}

export interface CommonDrawerSnapshot {
  options: CommonDrawerOptions;
  state: CommonDrawerState;
}

export interface CommonDrawerController {
  getSnapshot: () => CommonDrawerSnapshot;
  setOpen: (open: boolean) => CommonDrawerSnapshot;
  setActiveSnapPoint: (snapPoint: CommonDrawerSnapPoint | null) => CommonDrawerSnapshot;
  patch: (options: Partial<CommonDrawerOptions>) => CommonDrawerSnapshot;
  subscribe: (listener: (snapshot: CommonDrawerSnapshot) => void) => () => void;
}

const DEFAULT_OPTIONS: Required<Pick<CommonDrawerOptions, 'direction' | 'dismissible' | 'modal'>> = {
  direction: 'bottom',
  dismissible: true,
  modal: true,
};

function toSnapshot(options: CommonDrawerOptions): CommonDrawerSnapshot {
  return {
    options,
    state: {
      isOpen: Boolean(options.open ?? options.defaultOpen),
      activeSnapPoint: options.activeSnapPoint ?? options.snapPoints?.[0] ?? null,
      direction: options.direction ?? DEFAULT_OPTIONS.direction,
      snapPoints: options.snapPoints ?? [],
      dismissible: options.dismissible ?? DEFAULT_OPTIONS.dismissible,
      modal: options.modal ?? DEFAULT_OPTIONS.modal,
    },
  };
}

export function createDrawerController(initialOptions: CommonDrawerOptions = {}): CommonDrawerController {
  let options: CommonDrawerOptions = { ...initialOptions };
  let snapshot = toSnapshot(options);
  const listeners = new Set<(snapshot: CommonDrawerSnapshot) => void>();

  function publish() {
    snapshot = toSnapshot(options);
    listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }

  return {
    getSnapshot() {
      return snapshot;
    },
    setOpen(open) {
      options = { ...options, open };
      return publish();
    },
    setActiveSnapPoint(activeSnapPoint) {
      options = { ...options, activeSnapPoint };
      return publish();
    },
    patch(nextOptions) {
      options = { ...options, ...nextOptions };
      return publish();
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}