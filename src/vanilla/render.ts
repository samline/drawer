// Public types for the vanilla render layer + a small helper that
// mounts a single dialog instance into a host element.
//
// This module is the vanilla equivalent of the old `render.tsx`. It
// exposes:
//   - `VanillaRenderable` — the value shape accepted by `title`,
//     `description`, and `content` (string / number / HTMLElement /
//     thunk / nullish).
//   - `VanillaDrawerOptions` — the public option surface, including
//     the framework-agnostic extras (`mountElement`, `triggerElement`,
//     `triggerText`, ARIA wiring, etc.).
//   - `mountVanillaDialog` — the entrypoint used by the runtime
//     registry to install the dialog DOM, the trigger button, the
//     overlay, the content, and the handle into a host element.
//
// The actual dialog behavior (focus trap, escape, click-outside,
// body scroll lock, drag-to-dismiss, snap points, handle cycle, etc.)
// lives in `vanilla/dialog.ts`. The split mirrors the React build
// where `react/components.tsx` owned the dialog primitives and
// `vanilla/render.tsx` was the consumer-facing adapter.

import type { CommonDrawerOptions } from '../core'
import { mountVanillaDialog } from './dialog'

export type VanillaRenderable = string | number | HTMLElement | (() => HTMLElement) | null | undefined

export interface VanillaDrawerOptions extends CommonDrawerOptions {
  mountElement?: HTMLElement | null
  triggerElement?: HTMLElement | null
  triggerText?: string
  showHandle?: boolean
  handleClassName?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  title?: VanillaRenderable
  titleVisuallyHidden?: boolean
  description?: VanillaRenderable
  descriptionVisuallyHidden?: boolean
  content?: VanillaRenderable
  overlayClassName?: string
  contentClassName?: string
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
  onBuiltInTriggerMouseDown?: () => void
  onBuiltInTriggerClick?: () => void
  onOpenChange: (open: boolean) => void
  onDragChange?: (percentageDragged: number) => void
  onReleaseChange?: (open: boolean) => void
}): void {
  mountVanillaDialog({
    host: options.host,
    id: options.id,
    options: options.options,
    open: options.open,
    onOpenChange: options.onOpenChange,
    ...(options.onBuiltInTriggerMouseDown !== undefined
      ? { onBuiltInTriggerMouseDown: options.onBuiltInTriggerMouseDown }
      : {}),
    ...(options.onBuiltInTriggerClick !== undefined
      ? { onBuiltInTriggerClick: options.onBuiltInTriggerClick }
      : {}),
    ...(options.onDragChange !== undefined ? { onDragChange: options.onDragChange } : {}),
    ...(options.onReleaseChange !== undefined ? { onReleaseChange: options.onReleaseChange } : {})
  })
}
