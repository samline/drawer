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
  /**
   * Accessible name for the dialog. Three cases:
   *
   * - The consumer passes a value AND no explicit `title`:
   *   the value is set as `aria-label` on the dialog. No
   *   title slot is mounted. This is the recommended path
   *   when the consumer wants a screen-reader-friendly
   *   name but no visible heading.
   * - The consumer passes a value AND a `title`: the visible
   *   title wins in the title slot (which is the
   *   `aria-labelledby` target), and the dialog's
   *   `aria-label` is set to this value in parallel as a
   *   fallback for AT that ignores the reference.
   * - The consumer passes nothing: the package auto-assigns
   *   `ariaLabel = id` so the dialog always has an accessible
   *   name. `aria-label = id` is set, no `aria-labelledby`.
   */
  ariaLabel?: string
  /**
   * Optional override for the labelledby target id. When set
   * AND no `title` is provided, the dialog's `aria-labelledby`
   * points at this id (the consumer is responsible for the
   * matching element in their `content`).
   *
   * When set AND a `title` is also provided, the title slot
   * is stamped with this id and becomes the `aria-labelledby`
   * target.
   */
  ariaLabelledBy?: string
  /**
   * Optional override for the describedby target id. When
   * set AND no `description` is provided, the dialog's
   * `aria-describedby` points at this id (the consumer is
   * responsible for the matching element in their `content`).
   *
   * When set AND a `description` is also provided, the
   * description slot is stamped with this id and becomes the
   * `aria-describedby` target.
   */
  ariaDescribedBy?: string
  /**
   * Optional title for the drawer.
   *
   * When the consumer passes a `title`, the package renders
   * the value inside the `[data-drawer-title]` slot at the
   * top of the drawer's body (visibly by default), and the
   * slot becomes the dialog's `aria-labelledby` target.
   * Pass a string, number, or `HTMLElement` (or a thunk that
   * returns one).
   *
   * When the consumer does NOT pass a `title`, the slot is
   * NOT mounted. The dialog's accessible name comes from
   * `aria-label` (set from `ariaLabel` or the `id` fallback)
   * — see `ariaLabel`.
   *
   * The visible title wins over `ariaLabel` when both are
   * provided: the slot renders the visible title text and
   * `aria-label` is set in parallel as a fallback for AT.
   */
  title?: VanillaRenderable
  /**
   * Force the `[data-drawer-title]` slot to be visually
   * hidden.
   *
   * Rarely needed, kept for retro-compat. The only use case
   * is when the consumer passes an explicit `title` but
   * wants it hidden (e.g. they render their own visible
   * heading in `content` HTML but still need the slot for
   * the `aria-labelledby` reference). Pass `true` to hide,
   * `false` to keep visible (default is `false`).
   */
  titleVisuallyHidden?: boolean
  /**
   * Optional description for the drawer. When set, the
   * package renders the value inside the
   * `[data-drawer-description]` slot (auto-hidden by
   * default — the slot is an `aria-describedby` target,
   * not visual content) and the slot becomes the dialog's
   * `aria-describedby` target.
   *
   * When the consumer does NOT pass a `description`, the
   * slot is NOT mounted and the `aria-describedby`
   * attribute is OMITTED entirely. Consumers who used to
   * pass `description: '...'` +
   * `descriptionVisuallyHidden: true` only to silence a11y
   * warnings can now drop both props.
   */
  description?: VanillaRenderable
  /**
   * Force the `[data-drawer-description]` slot to be
   * visible.
   *
   * Rarely needed, kept for retro-compat. Pass `false` to
   * keep the slot visible (default is `true` — the slot is
   * auto-hidden because the description is an a11y target,
   * not visual content).
   */
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
