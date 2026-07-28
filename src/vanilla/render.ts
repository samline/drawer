// Public types for the vanilla render layer + a small helper that
// mounts a single dialog instance into a host element.
//
// Exposes:
//   - `VanillaRenderable` — the value shape accepted by `title`,
//     `description`, and `content` (string / number / HTMLElement /
//     thunk / nullish).
//   - `VanillaDrawerOptions` — the public option surface, including
//     the framework-agnostic extras (`mountElement`, `triggerElement`,
//     `triggerText`, ARIA wiring, etc.).
//   - `mountVanillaDrawer` — the entrypoint used by the runtime
//     registry to install the dialog DOM, the trigger button, the
//     overlay, the content, and the handle into a host element.
//
// The dialog behavior (focus trap, escape, click-outside, body scroll
// lock) lives in `vanilla/dialog.ts`. The drag / snap / scale-background
// pipeline is wired in Phase A (drag-to-dismiss) and Phase B
// (snap points); see `runtime/*` for the pure math.

import type { CommonDrawerOptions, CommonDrawerSnapPoint } from '../core'
import { mountVanillaDialog } from './dialog'

export type VanillaRenderable = string | number | HTMLElement | (() => HTMLElement) | null | undefined

export interface VanillaDrawerOptions extends CommonDrawerOptions {
  /**
   * Container element the drawer should mount into. Defaults to
   * `document.body`; the host creates a dedicated wrapper
   * `<div data-drawer-vanilla-root>` there.
   *
   * Alias for `mountElement`. Use whichever name you prefer; the
   * other is read as a fallback. The alias exists for backward
   * compat with the v2 / v3 API and to match vaul's naming.
   */
  container?: HTMLElement | null
  /**
   * @deprecated Use `container` instead. Kept for backward compat
   * with the v2 / v3 API. The drawer reads `container ?? mountElement`
   * internally, so a non-null container wins and `container: null`
   * falls through to `mountElement`.
   */
  mountElement?: HTMLElement | null
  triggerElement?: HTMLElement | null
  triggerText?: string
  showHandle?: boolean
  handleClassName?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  /**
   * Optional title for the drawer.
   *
   * Two use cases:
   *
   * - **Visible title**: a heading the user sees inside the drawer.
   *   Pass a string, number, or `HTMLElement` (or a thunk that
   *   returns one). The package renders the value in the
   *   `[data-drawer-title]` slot at the top of the drawer's
   *   content area. Style the slot via the consumer's CSS.
   * - **Accessibility-only title**: pass `ariaLabel` (and not
   *   `title`) and the package auto-promotes the `ariaLabel`
   *   value into the `[data-drawer-title]` slot for the
   *   `aria-labelledby` reference. The package also auto-hides
   *   the slot in that case, because proxy titles are
   *   accessibility targets only — consumers who want a visible
   *   title should put it in the `content` HTML.
   *
   * @see ariaLabel for the accessibility-only case.
   */
  title?: VanillaRenderable
  /**
   * Whether the `[data-drawer-title]` slot should be visually
   * hidden. The default is `false` (visible), unless the title
   * was auto-promoted from `ariaLabel` (a "proxy" title) — in
   * that case the package always hides the slot, because the
   * proxy is an accessibility target, not visual content.
   *
   * Pass `true` to force-hide the title slot (e.g. when
   * rendering your own visible title inside `content` but
   * still keeping the `aria-labelledby` reference).
   *
   * Pass `false` explicitly to override the auto-hide when
   * using a proxy title — the slot will render visibly.
   */
  titleVisuallyHidden?: boolean
  description?: VanillaRenderable
  descriptionVisuallyHidden?: boolean
  content?: VanillaRenderable
  overlayClassName?: string
  contentClassName?: string
  /**
   * Built-in close button. When set, the package renders a
   * `<button data-drawer-close>` inside the drawer (between
   * the title slot and the body) and wires it to the
   * controller's `onOpenChange(false)` so the user can dismiss
   * the drawer without the consumer writing a manual click
   * listener.
   *
   * This eliminates the most common source of HMR-related
   * bugs in consumers (e.g. Vite HMR re-running the
   * consumer's `<script>` and accumulating
   * `document.addEventListener('click', ...)` listeners on
   * `document`).
   *
   * Accepts:
   *
   * - `true` for default behavior: a button with
   *   `className="drawer-close-button"`, an `xmark` icon
   *   (rendered as a `<span aria-hidden="true">` so screen
   *   readers ignore it), and `aria-label="Close"`.
   * - An object to override the defaults. `icon` accepts a
   *   string (rendered as text inside a `<span>`) or a
   *   pre-built `HTMLElement`.
   *
   * The button is removed automatically on re-mount
   * (`teardownMount` handles it) and on `destroyDrawer`.
   *
   * The button's `click` event does not bubble to the
   * drawer's content — it `stopPropagation()`s to avoid
   * triggering any content-level click handlers.
   */
  closeButton?: boolean | VanillaCloseButtonOptions
}

/**
 * Options for the built-in close button. See
 * `VanillaDrawerOptions.closeButton` for the full contract.
 */
export interface VanillaCloseButtonOptions {
  /** Class applied to the button. The consumer can use it to position the button (e.g. `absolute top-5 right-5`). */
  className?: string
  /** Icon content. A string is rendered as text inside a `<span aria-hidden="true">`. An `HTMLElement` is appended as-is. */
  icon?: string | HTMLElement
  /** Accessible label for the button. Defaults to `'Close'`. */
  ariaLabel?: string
}

/**
 * Mount the vanilla dialog into `container`. The host is whatever
 * `vanilla/host.ts` resolved for the drawer (usually a fresh
 * `<div data-drawer-vanilla-root>` appended to `document.body`).
 *
 * Returns the mount context for cleanup; the registry does not
 * need to read the returned DOM but the host does.
 */
export function mountVanillaDrawer(options: {
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
}): void {
  mountVanillaDialog({
    host: options.host,
    id: options.id,
    options: options.options,
    open: options.open,
    ...(options.openOrder !== undefined ? { openOrder: options.openOrder } : {}),
    ...(options.hasBeenOpened !== undefined ? { hasBeenOpened: options.hasBeenOpened } : {}),
    onOpenChange: options.onOpenChange,
    ...(options.onBuiltInTriggerMouseDown !== undefined
      ? { onBuiltInTriggerMouseDown: options.onBuiltInTriggerMouseDown }
      : {}),
    ...(options.onBuiltInTriggerClick !== undefined ? { onBuiltInTriggerClick: options.onBuiltInTriggerClick } : {}),
    ...(options.onDragChange !== undefined ? { onDragChange: options.onDragChange } : {}),
    ...(options.onReleaseChange !== undefined ? { onReleaseChange: options.onReleaseChange } : {}),
    ...(options.onActiveSnapPointChange !== undefined
      ? { onActiveSnapPointChange: options.onActiveSnapPointChange }
      : {})
  })
}
