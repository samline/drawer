---
title: Configuration
description: Every CommonDrawerOptions and VanillaDrawerOptions field accepted by @samline/drawer, with defaults and rationale.
template: doc
sidebar:
  order: 2
---

`createDrawer(options?)` accepts `VanillaDrawerOptions`, which extends the headless `CommonDrawerOptions` state surface with DOM, content, trigger, and class options. Pass only the fields you need.

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'filters',
  direction: 'bottom',
  title: 'Filters',
  content: 'Body',
  closeButton: true
})
```

## Signatures

```ts
interface CommonDrawerOptions {
  id?: CommonDrawerId
  parentId?: CommonDrawerId
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  onAnimationEnd?: (open: boolean) => void
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
  preventCycle?: boolean
}
```

## Common fields

| Field                       | Type                                            | Effective default       | Runtime behavior                                                                                                                                                                                                                         |
| --------------------------- | ----------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                        | `string`                                        | `'default'`             | Registry key. Reusing an id merges options into its existing instance and per-id host.                                                                                                                                                   |
| `parentId`                  | `string`                                        | `undefined`             | Relates a child to a registered parent. Opening a child opens its ancestor chain; closing or destroying a parent closes or recursively destroys its children.                                                                            |
| `open`                      | `boolean`                                       | `undefined`             | Explicit open state. `open` takes precedence over `defaultOpen`. Creating an initially open drawer mounts it without an entrance animation.                                                                                              |
| `defaultOpen`               | `boolean`                                       | `false`                 | Fallback initial state when `open` is `undefined`. An initially open first render also skips the entrance animation; opening a previously closed host animates.                                                                          |
| `onOpenChange`              | `(open: boolean) => void`                       | `undefined`             | Fires after a real open-state transition and after the controller contains the new state. No-op writes do not call it.                                                                                                                   |
| `onClose`                   | `() => void`                                    | `undefined`             | Fires immediately before a `true` to `false` state transition, so the snapshot is still open inside this callback. Destroying an open drawer does not call it.                                                                           |
| `onAnimationEnd`            | `(open: boolean) => void`                       | `undefined`             | Timer-based notification 500 ms after an open-state transition. A newer transition cancels the prior timer, and destroy cancels it. It is not a DOM `animationend` event.                                                                |
| `onActiveSnapPointChange`   | `(snapPoint: number \| string \| null) => void` | `undefined`             | Fires after a runtime-driven snap change from drag release, handle cycling, or the post-close reset to the first snap. Direct `setActiveSnapPoint()` calls do not echo this callback.                                                    |
| `onDragChange`              | `(percentageDragged: number) => void`           | `undefined`             | Fires on accepted pointer moves. The value is normalized against the rendered drawer dimension (or current snap interval) and can exceed `1` when dragged beyond a full dimension.                                                       |
| `onReleaseChange`           | `(open: boolean) => void`                       | `undefined`             | Fires after an accepted drag release: `false` when release closes, `true` when it resets or settles at a snap. Programmatic close and overlay clicks do not fire it.                                                                     |
| `dismissible`               | `boolean`                                       | `true`                  | Enables Escape, overlay mouse-up, drag-close, and last-snap handle dismissal. Programmatic methods and the optional built-in close button can still close when `false`.                                                                  |
| `modal`                     | `boolean`                                       | `true`                  | Modal drawers render an overlay, trap Tab focus, and acquire scroll effects. `false` omits the overlay/focus trap/scroll lock. Neither mode writes `body.style.pointerEvents`.                                                           |
| `nested`                    | `boolean`                                       | `false`                 | Enables nested behavior. The registry sets it to `true` automatically whenever `parentId` is present.                                                                                                                                    |
| `direction`                 | `'top' \| 'bottom' \| 'left' \| 'right'`        | `'bottom'`              | Selects entrance/exit side, close gesture, drag axis, snap math, and scale transform axis. All four directions support drag-to-dismiss.                                                                                                  |
| `snapPoints`                | `Array<number \| string>`                       | `[]`                    | Numbers are fractions of the viewport or custom container (`0.5` is 50%). Strings are parsed as absolute pixel counts (`'120px'` becomes 120); a percent-suffixed string is not percentage math.                                         |
| `fadeFromIndex`             | `number`                                        | last snap index         | First snap index where the overlay is visible. If omitted with snap points, the 3.0.0 release resolves it to `snapPoints.length - 1`.                                                                                                               |
| `activeSnapPoint`           | `number \| string \| null`                      | `snapPoints[0] ?? null` | Current snap value. The controller and runtime update it together; close resets it to the first snap after 500 ms.                                                                                                                       |
| `closeThreshold`            | `number`                                        | `0.25`                  | For snap-free drawers, fraction of the rendered height/width required for a low-velocity release to dismiss. Snap-point releases use the separate snap policy.                                                                           |
| `scrollLockTimeout`         | `number`                                        | `100`                   | Millisecond cooldown after scrollable content blocks a drag, preventing the next pointer gesture from being captured immediately.                                                                                                        |
| `shouldScaleBackground`     | `boolean`                                       | `false`                 | Scales, translates, rounds, and clips the first `[data-drawer-wrapper]` as soon as the drawer opens. Dragging toward close moves it back toward normal.                                                                                  |
| `setBackgroundColorOnScale` | `boolean`                                       | `true`                  | With background scaling, sets the body background black while an owner is open and may write a translucent wrapper background during drag. Pass `false` to opt out of those color writes.                                                |
| `handleOnly`                | `boolean`                                       | `false`                 | Restricts drag starts to the built-in handle and renders that handle even when `showHandle` is omitted.                                                                                                                                  |
| `fixed`                     | `boolean`                                       | `false`                 | When the focused-input viewport pipeline runs, also writes a calculated drawer height. Since `repositionInputs` defaults to `true`, `fixed: true` normally writes both height and bottom offset.                                         |
| `disablePreventScroll`      | `boolean`                                       | `false`                 | Disables the modal body-scroll prevention pipeline (desktop overflow/padding compensation or the iOS touch lock). It does not mean “no body styles”; see `noBodyStyles`.                                                                 |
| `repositionInputs`          | `boolean`                                       | `true`                  | Attaches an open-only `visualViewport.resize` listener when available. Layout changes are focus-gated: a keyboard-producing input, textarea, or editable element must be focused inside the drawer before the opening resize is handled. |
| `snapToSequentialPoint`     | `boolean`                                       | `false`                 | For releases under 40% of the drawer dimension, restricts a high-velocity swipe to the adjacent snap. Longer releases still choose the closest snap and can skip points.                                                                 |
| `preventScrollRestoration`  | `boolean`                                       | `false`                 | Acquires global `history.scrollRestoration = 'manual'` ownership while open. The original value returns after the final owner closes or is destroyed.                                                                                    |
| `noBodyStyles`              | `boolean`                                       | `false`                 | Suppresses scale-background body color and Safari fixed-body positioning. It does not disable the baseline modal scroll lock; use `disablePreventScroll` for that.                                                                       |
| `autoFocus`                 | `boolean`                                       | `false`                 | Opt-in initial focus. `true` focuses the first focusable descendant (or dialog itself); the default does not focus drawer content and may blur an outside trigger before a modal opens.                                                  |
| `preventCycle`              | `boolean`                                       | `false`                 | Disables handle click-to-cycle while retaining handle drag behavior.                                                                                                                                                                     |

## Vanilla-only fields

```ts
interface VanillaDrawerOptions extends CommonDrawerOptions {
  container?: HTMLElement | null
  /** @deprecated Use container. */
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
  closeButton?: boolean | { className?: string; icon?: string | HTMLElement; ariaLabel?: string }
}
```

| Field                       | Type                  | Effective default     | Runtime behavior                                                                                                                                                                                                                               |
| --------------------------- | --------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `container`                 | `HTMLElement \| null` | `document.body`       | Preferred mount target. The runtime appends a dedicated per-id host inside it and uses its bounding rect for snap-point fractions. Multiple drawers sharing a container remain isolated.                                                       |
| `mountElement`              | `HTMLElement \| null` | `undefined`           | Deprecated alias for `container`. `container ?? mountElement ?? document.body` is used, so `container` wins.                                                                                                                                   |
| `triggerElement`            | `HTMLElement \| null` | `undefined`           | Consumer-owned external element whose click opens the id. Its listener persists while closed, rebinds on update, and is removed on destroy.                                                                                                    |
| `triggerText`               | `string`              | `undefined`           | Creates a built-in `<button data-drawer-vanilla-trigger>` in the per-id host. It persists while closed and during exit, updates in place, and is removed when cleared or destroyed.                                                            |
| `showHandle`                | `boolean`             | `false`               | Renders the built-in handle while dialog content is present. `handleOnly` also renders it.                                                                                                                                                     |
| `handleClassName`           | `string`              | `undefined`           | Class assigned to the built-in handle.                                                                                                                                                                                                         |
| `ariaLabel`                 | `string`              | `undefined`           | Sets `aria-label`. Without an explicit title or matching custom labelled node, it is also copied into the title slot as an accessibility proxy and hidden by default.                                                                          |
| `ariaLabelledBy`            | `string`              | `undefined`           | Consumer target id, used unchanged. If `content` does not contain it, the runtime assigns it to the built-in title slot. When omitted, the slot gets `<drawer-id>-title`.                                                                      |
| `ariaDescribedBy`           | `string`              | `undefined`           | Consumer target id, used unchanged. If `content` does not contain it, the runtime assigns it to the built-in description slot. When omitted, the slot gets `<drawer-id>-description`.                                                          |
| `title`                     | `VanillaRenderable`   | `undefined`           | Visible title-slot content unless `titleVisuallyHidden` is true.                                                                                                                                                                               |
| `titleVisuallyHidden`       | `boolean`             | `false` (conditional) | Applies the built-in visually hidden styles. A proxy title promoted from `ariaLabel` auto-hides unless this is explicitly `false`.                                                                                                             |
| `description`               | `VanillaRenderable`   | `undefined`           | Description-slot content.                                                                                                                                                                                                                      |
| `descriptionVisuallyHidden` | `boolean`             | `false`               | Applies the built-in visually hidden styles to the description slot.                                                                                                                                                                           |
| `content`                   | `VanillaRenderable`   | `undefined`           | Main body content. The open dialog skeleton and empty body slot still mount when this is omitted.                                                                                                                                              |
| `overlayClassName`          | `string`              | `undefined`           | Class assigned to the modal overlay.                                                                                                                                                                                                           |
| `contentClassName`          | `string`              | `undefined`           | Class assigned to `[data-drawer]`.                                                                                                                                                                                                             |
| `closeButton`               | `boolean \| object`   | `false`               | Renders `<button data-drawer-close>` after the body. `true` uses class `drawer-close-button`, text icon `xmark`, and label `Close`; an object overrides `className`, `icon`, and `ariaLabel`. Its click stops propagation and closes directly. |

`VanillaRenderable` is `string | number | HTMLElement | (() => HTMLElement) | null | undefined`. Elements are moved into the dialog. A thunk is invoked once per dialog DOM build, so an option update that rebuilds the open subtree can invoke it again.

## Presence and ownership

- Calling `createDrawer()` creates one registered host per id even when closed.
- A closed drawer has no overlay or dialog content. Only the host and optional built-in trigger persist.
- Closing flips mounted nodes to `data-state="closed"`, releases focus/scroll/viewport effects immediately, and removes overlay/content after the exit safety timeout. It does not unregister the id.
- Shared scroll lock, document scroll behavior, history restoration, and scale-background effects are reference-counted or owner-stacked. One drawer closing cannot restore an effect still owned by another.
- The runtime never reads or writes `document.body.style.pointerEvents`.

Numeric defaults are root exports; see [TypeScript → Numeric constants](/drawer/reference/typescript/#numeric-constants).
