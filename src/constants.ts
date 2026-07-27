export const TRANSITIONS = {
  DURATION: 0.5,
  EASE: [0.4, 0, 0.2, 1]
}

export const VELOCITY_THRESHOLD = 0.4

export const CLOSE_THRESHOLD = 0.25

export const SCROLL_LOCK_TIMEOUT = 100

/**
 * Pixel value the scale-background pipeline uses for the page-shell
 * border-radius at `percentageDragged = 0`. The constant is the
 * single source of truth — `runtime/transforms.ts#getBackgroundDragState`
 * and `#getBackgroundResetState` read it instead of hardcoding `8`.
 */
export const BORDER_RADIUS = 8

export const NESTED_DISPLACEMENT = 16

export const WINDOW_TOP_OFFSET = 26

/**
 * Class name the runtime would add to `[data-drawer]` while a drag
 * is in progress. **Reserved for a future enhancement** — the CSS
 * contract currently has no `[data-drawer].drawer-dragging` rule
 * and no code path adds the class. Keep the export so consumers
 * writing a forward-compatible stylesheet can opt in.
 */
export const DRAG_CLASS = 'drawer-dragging'
