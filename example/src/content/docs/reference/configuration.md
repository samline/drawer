---
title: Configuration
description: Every CommonDrawerOptions and VanillaDrawerOptions field accepted by @samline/drawer, with defaults, behaviour, and an example per row.
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

## Renderable content

The `content`, `title`, and `description` slots all accept the same shape: `VanillaRenderable`. Every example in this section uses `content`; the same rules apply to `title` and `description`.

```ts
type VanillaRenderable = string | number | HTMLElement | (() => HTMLElement) | null | undefined
```

| Form                | What happens                                                                                                                                                                  | Example                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `string`            | Mounted as a text node inside the slot. Safe for plain copy.                                                                                                                  | `content: 'Drawer body'`     |
| `number`            | Mounted as a text node. Useful for numeric badges.                                                                                                                            | `title: 3`                   |
| `HTMLElement`       | **Moved** (not cloned) into the slot. The runtime does not own the element; do not append it elsewhere while the drawer owns it.                                              | `content: formElement`       |
| `() => HTMLElement` | The thunk is invoked once per dialog DOM build (mount on open, rebuild on option-driven remount) and must return an element. Lazy presence will re-invoke it on every reopen. | `content: () => buildForm()` |
| `undefined`         | Omits title/description slots and renders no body content.                                                                                                                    | `description: undefined`     |
| `null`              | Renders no content, but `title: null` or `description: null` still creates an empty ARIA-referenced slot. Prefer omission when no slot should exist.                          | `content: null`              |

```ts
import { createDrawer } from '@samline/drawer'

// 1. Plain string.
createDrawer({ id: 'a', content: 'Hello' })

// 2. Number.
createDrawer({ id: 'b', title: 3, content: 'Tag' })

// 3. Pre-built element (moved into the dialog).
const form = document.createElement('form')
form.innerHTML = '<input name="q" /><button>Search</button>'
createDrawer({ id: 'c', content: form })

// 4. Lazy thunk — re-invoked each time the dialog subtree is rebuilt.
createDrawer({
  id: 'd',
  content: () => {
    const node = document.createElement('div')
    node.className = 'lazy'
    node.textContent = new Date().toLocaleTimeString()
    return node
  }
})

// 5. Empty body. The [data-drawer-body] wrapper still mounts.
createDrawer({ id: 'e' })
```

Notes:

- **Move semantics**: when you pass an `HTMLElement`, the runtime adopts it. Closing or destroying removes its ancestor subtree, so the element becomes detached from the document but remains available through your JavaScript reference. Reappend it yourself before reuse. Do not pass one connected instance to two drawers.
- **Lazy presence**: the dialog subtree is unmounted on close, so a thunk re-runs every time the user reopens. Use this to refresh dynamic content, or capture expensive work outside the thunk.
- **Factory return**: a thunk must return an `HTMLElement`. A different return value does not throw; it renders no content.
- **`data-drawer-body`**: `content` is mounted directly into `[data-drawer-body]`. The body wrapper is always created while the dialog is mounted; title and description slots are conditional children of it.
- **Drag opt-out**: any descendant inside the content can opt out of starting a drawer drag with `data-drawer-no-drag`.

See [Recipes → Custom HTML content](/drawer/reference/examples/#recipe-custom-html-content) for end-to-end patterns.

## Common fields

Every field on `CommonDrawerOptions`. The example column shows the smallest realistic usage of the field.

| Field                       | Type                                            | Effective default       | Runtime behavior                                                                                                                                                                                                                         | Example                                       |
| --------------------------- | ----------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `id`                        | `string`                                        | `'default'`             | Registry key. Reusing an id merges options into its existing instance and per-id host.                                                                                                                                                   | `id: 'filters'`                               |
| `parentId`                  | `string`                                        | `undefined`             | Relates a child to a registered parent. Opening a child opens its ancestor chain; closing or destroying a parent closes or recursively destroys its children. Self-references and indirect cycles throw a `TypeError`.                   | `parentId: 'account'`                         |
| `open`                      | `boolean`                                       | `undefined`             | Explicit open state. `open` takes precedence over `defaultOpen`. Creating an initially open drawer mounts it without an entrance animation.                                                                                              | `open: true`                                  |
| `defaultOpen`               | `boolean`                                       | `false`                 | Fallback initial state when `open` is `undefined`. An initially open first render also skips the entrance animation; opening a previously closed host animates.                                                                          | `defaultOpen: true`                           |
| `onOpenChange`              | `(open: boolean) => void`                       | `undefined`             | Fires after a real open-state transition and after the controller contains the new state. No-op writes do not call it.                                                                                                                   | `onOpenChange(open) { log(open) }`            |
| `onClose`                   | `() => void`                                    | `undefined`             | Fires immediately before a `true` to `false` state transition, so the snapshot is still open inside this callback. Destroying an open drawer does not call it.                                                                           | `onClose() { cleanup() }`                     |
| `onAnimationEnd`            | `(open: boolean) => void`                       | `undefined`             | Timer-based notification 500 ms after an open-state transition. A newer transition cancels the prior timer, and destroy cancels it. It is not a DOM `animationend` event.                                                                | `onAnimationEnd(open) { log(open) }`          |
| `onActiveSnapPointChange`   | `(snapPoint: number \| string \| null) => void` | `undefined`             | Fires after a runtime-driven snap change from drag release, handle cycling, or the post-close reset to the first snap. Direct `setActiveSnapPoint()` calls do not echo this callback.                                                    | `onActiveSnapPointChange(s) { setSnap(s) }`   |
| `onDragChange`              | `(percentageDragged: number) => void`           | `undefined`             | Fires on accepted pointer moves. The value is normalized against the rendered drawer dimension (or current snap interval) and can exceed `1` when dragged beyond a full dimension.                                                       | `onDragChange(p) { setDragProgress(p) }`      |
| `onReleaseChange`           | `(open: boolean) => void`                       | `undefined`             | Fires after an accepted drag release: `false` when release closes, `true` when it resets or settles at a snap. Programmatic close and overlay clicks do not fire it.                                                                     | `onReleaseChange(keptOpen) { log(keptOpen) }` |
| `dismissible`               | `boolean`                                       | `true`                  | Enables Escape, overlay mouse-up, drag-close, and last-snap handle dismissal. Programmatic methods and the optional built-in close button can still close when `false`.                                                                  | `dismissible: false`                          |
| `modal`                     | `boolean`                                       | `true`                  | Modal drawers render an overlay, trap focus, isolate background branches with `inert`/`aria-hidden`, and acquire scroll effects. `false` omits those behaviors. Neither mode writes `body.style.pointerEvents`.                          | `modal: false`                                |
| `nested`                    | `boolean`                                       | `false`                 | Internal nested-layout flag. `createDrawer()` and `update()` set it automatically when `parentId` exists. Set `parentId` to establish a relationship; `nested: true` alone does not create one.                                          | `nested: true`                                |
| `direction`                 | `'top' \| 'bottom' \| 'left' \| 'right'`        | `'bottom'`              | Selects entrance/exit side, close gesture, drag axis, snap math, and scale transform axis. All four directions support drag-to-dismiss.                                                                                                  | `direction: 'right'`                          |
| `snapPoints`                | `Array<number \| string>`                       | `[]`                    | Numbers are container fractions (`0.5` is 50%). Strings use `parseInt` as pixels: `'120.9px'` becomes `120`, `'50%'` becomes `50px`, and `'1rem'` becomes `1px`. Values are not validated; use finite, ordered, unique values.           | `snapPoints: ['180px', '420px', 1]`           |
| `fadeFromIndex`             | `number`                                        | last snap index         | First snap index where the overlay is visible. If omitted with snap points, the 4.0.1 release resolves it to `snapPoints.length - 1`.                                                                                                    | `fadeFromIndex: 1`                            |
| `activeSnapPoint`           | `number \| string \| null`                      | `snapPoints[0] ?? null` | Current snap value. Use an exact member of `snapPoints`; values are matched with strict equality and are not validated. A non-member disables normal release/cycle indexing. Close resets it to the first snap after 500 ms.             | `activeSnapPoint: '180px'`                    |
| `closeThreshold`            | `number`                                        | `0.25`                  | For snap-free drawers, fraction of the rendered height/width required for a low-velocity release to dismiss. Snap-point releases use the separate snap policy.                                                                           | `closeThreshold: 0.5`                         |
| `scrollLockTimeout`         | `number`                                        | `100`                   | Millisecond cooldown after scrollable content blocks a drag, preventing the next pointer gesture from being captured immediately.                                                                                                        | `scrollLockTimeout: 200`                      |
| `shouldScaleBackground`     | `boolean`                                       | `false`                 | Scales, translates, rounds, and clips the first `[data-drawer-wrapper]` as soon as the drawer opens. Dragging toward close moves it back toward normal.                                                                                  | `shouldScaleBackground: true`                 |
| `setBackgroundColorOnScale` | `boolean`                                       | `true`                  | With background scaling, sets the body background black while an owner is open and may write a translucent wrapper background during drag. Pass `false` to opt out of those color writes.                                                | `setBackgroundColorOnScale: false`            |
| `handleOnly`                | `boolean`                                       | `false`                 | Restricts drag starts to the built-in handle and renders that handle even when `showHandle` is omitted.                                                                                                                                  | `handleOnly: true`                            |
| `fixed`                     | `boolean`                                       | `false`                 | When the focused-input viewport pipeline runs, also writes a calculated drawer height. Since `repositionInputs` defaults to `true`, `fixed: true` normally writes both height and bottom offset.                                         | `fixed: true`                                 |
| `disablePreventScroll`      | `boolean`                                       | `false`                 | Disables the modal body-scroll prevention pipeline (desktop overflow/padding compensation or the iOS touch lock). It does not mean "no body styles"; see `noBodyStyles`.                                                                 | `disablePreventScroll: true`                  |
| `repositionInputs`          | `boolean`                                       | `true`                  | Attaches an open-only `visualViewport.resize` listener when available. Layout changes are focus-gated: a keyboard-producing input, textarea, or editable element must be focused inside the drawer before the opening resize is handled. | `repositionInputs: false`                     |
| `snapToSequentialPoint`     | `boolean`                                       | `false`                 | For releases under 40% of the drawer dimension, restricts a high-velocity swipe to the adjacent snap. Longer releases still choose the closest snap and can skip points.                                                                 | `snapToSequentialPoint: true`                 |
| `preventScrollRestoration`  | `boolean`                                       | `false`                 | Acquires global `history.scrollRestoration = 'manual'` ownership while open. The original value returns after the final owner closes or is destroyed.                                                                                    | `preventScrollRestoration: true`              |
| `noBodyStyles`              | `boolean`                                       | `false`                 | Suppresses scale-background body color and Safari fixed-body positioning. It does not disable the baseline modal scroll lock; use `disablePreventScroll` for that.                                                                       | `noBodyStyles: true`                          |
| `autoFocus`                 | `boolean`                                       | `false`                 | Modal focus always moves inside. `false` focuses the dialog; `true` focuses the first visible focusable descendant and falls back to the dialog.                                                                                         | `autoFocus: true`                             |
| `preventCycle`              | `boolean`                                       | `false`                 | Disables handle click-to-cycle while retaining handle drag behavior.                                                                                                                                                                     | `preventCycle: true`                          |

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
  handleAriaLabel?: string
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

| Field                       | Type                  | Effective default          | Runtime behavior                                                                                                                                                                                                                               | Example                                                   |
| --------------------------- | --------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `container`                 | `HTMLElement \| null` | `document.body`            | Preferred mount target. The runtime appends a dedicated per-id host inside it and uses its bounding rect for snap-point fractions. Multiple drawers sharing a container remain isolated.                                                       | `container: document.getElementById('region')`            |
| `mountElement`              | `HTMLElement \| null` | `undefined`                | Deprecated alias for `container`. `container ?? mountElement ?? document.body` is used, so `container` wins.                                                                                                                                   | `mountElement: legacyContainer`                           |
| `triggerElement`            | `HTMLElement \| null` | `undefined`                | Consumer-owned external element whose click opens the id. Its listener persists while closed, rebinds on update, and is removed on destroy. The runtime does not add `aria-controls` or `aria-expanded`; manage those attributes if needed.    | `triggerElement: document.getElementById('open-filters')` |
| `triggerText`               | `string`              | `undefined`                | Creates a built-in `<button data-drawer-vanilla-trigger>` in the per-id host. It persists while closed and during exit, updates in place, and is removed when cleared or destroyed.                                                            | `triggerText: 'Open filters'`                             |
| `showHandle`                | `boolean`             | `false`                    | Renders the built-in handle while dialog content is present. `handleOnly` also renders it.                                                                                                                                                     | `showHandle: true`                                        |
| `handleClassName`           | `string`              | `undefined`                | Class assigned to the built-in handle.                                                                                                                                                                                                         | `handleClassName: 'my-handle'`                            |
| `handleAriaLabel`           | `string`              | `'Change drawer position'` | Accessible name assigned to the keyboard-operable handle button.                                                                                                                                                                               | `handleAriaLabel: 'Resize filters'`                       |
| `ariaLabel`                 | `string`              | drawer id when no `title`  | Sets `aria-label`. When both `title` and `ariaLabel` are absent, the normalized drawer id is used so the dialog is always named. It does not create a proxy title slot.                                                                        | `ariaLabel: 'Filters'`                                    |
| `ariaLabelledBy`            | `string`              | generated with `title`     | Used unchanged. With `title`, the runtime assigns this id to the built-in title slot; without `title`, you must provide that id elsewhere in your content/document. If omitted with a title, `<drawer-id>-title` is generated.                 | `ariaLabelledBy: 'filters-title'`                         |
| `ariaDescribedBy`           | `string`              | generated with description | Used unchanged. With `description`, the runtime assigns this id to that slot; without a description, you must provide the target. If omitted with a description, `<drawer-id>-description` is generated.                                       | `ariaDescribedBy: 'filters-desc'`                         |
| `title`                     | `VanillaRenderable`   | `undefined`                | Visible title-slot content unless `titleVisuallyHidden` is true. See [Renderable content](#renderable-content).                                                                                                                                | `title: 'Filters'`                                        |
| `titleVisuallyHidden`       | `boolean`             | `false`                    | Applies the built-in visually hidden inline styles to an existing title slot. It has no effect when `title` is omitted.                                                                                                                        | `titleVisuallyHidden: true`                               |
| `description`               | `VanillaRenderable`   | `undefined`                | Description-slot content. See [Renderable content](#renderable-content).                                                                                                                                                                       | `description: 'Refine the result set'`                    |
| `descriptionVisuallyHidden` | `boolean`             | `true`                     | Applies the built-in visually hidden styles to the description slot.                                                                                                                                                                           | `descriptionVisuallyHidden: false`                        |
| `content`                   | `VanillaRenderable`   | `undefined`                | Main body content. The open dialog skeleton and empty body slot still mount when this is omitted. See [Renderable content](#renderable-content).                                                                                               | `content: formElement`                                    |
| `overlayClassName`          | `string`              | `undefined`                | Class assigned to the modal overlay.                                                                                                                                                                                                           | `overlayClassName: 'drawer-overlay'`                      |
| `contentClassName`          | `string`              | `undefined`                | Class assigned to `[data-drawer]`.                                                                                                                                                                                                             | `contentClassName: 'drawer-panel'`                        |
| `closeButton`               | `boolean \| object`   | `false`                    | Renders `<button data-drawer-close>` after the body. `true` uses class `drawer-close-button`, text icon `xmark`, and label `Close`; an object overrides `className`, `icon`, and `ariaLabel`. Its click stops propagation and closes directly. | `closeButton: { className: 'absolute top-5 right-5' }`    |

`VanillaRenderable` is `string | number | HTMLElement | (() => HTMLElement) | null | undefined`. Elements are moved into the dialog. A thunk is invoked once per dialog DOM build, so an option update that rebuilds the open subtree can invoke it again.

## Updating and clearing options

Options are shallow-merged. `drawer.patch()` accepts only common options and returns a snapshot; `drawer.update()` and `updateDrawer()` accept vanilla options and return a controller. While open, only `open`, `activeSnapPoint`, and callback changes can reconcile without rebuilding the dialog. Other changes tear down and rebuild the open subtree, which can re-run content thunks, detach supplied elements, and move focus.

Optional fields do not share one universal reset value, especially with TypeScript's `exactOptionalPropertyTypes`. Supported explicit clears include:

| Option                            | Clear with                                                   |
| --------------------------------- | ------------------------------------------------------------ |
| `triggerElement`, `container`     | `null`                                                       |
| `content`, `title`, `description` | `null` (note that null title/description retain empty slots) |
| `snapPoints`                      | `[]`                                                         |
| `activeSnapPoint`                 | `null`                                                       |
| `triggerText`, class names        | `''`                                                         |
| `closeButton`                     | `false`                                                      |

There is no typed generic “unset” operation for every shallow-merged optional field, including `parentId`. If an integration must remove such a stored option, destroy and recreate that id with the desired configuration.

### Close-button option shape

The object passed to `closeButton` has its own option surface, exported only via the `VanillaDrawerOptions` type (the source name `VanillaCloseButtonOptions` is not a root type export).

| Field       | Type                    | Default                                                           | Example                               |
| ----------- | ----------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| `className` | `string`                | `'drawer-close-button'`                                           | `className: 'absolute top-5 right-5'` |
| `icon`      | `string \| HTMLElement` | `'xmark'` (rendered as text inside a `<span aria-hidden="true">`) | `icon: '✕'` or `icon: xmarkElement`   |
| `ariaLabel` | `string`                | `'Close'`                                                         | `ariaLabel: 'Close filters'`          |

The button's `click` event `stopPropagation()`s so it does not bubble to the drawer's content. The button is removed on re-mount and on `destroyDrawer`.

## Presence and ownership

- Calling `createDrawer()` creates one registered host per id even when closed.
- A closed drawer has no overlay or dialog content. Only the host and optional built-in trigger persist.
- Closing flips mounted nodes to `data-state="closed"`, releases focus/scroll/viewport effects immediately, and removes overlay/content after the exit safety timeout. It does not unregister the id.
- Shared scroll lock, document scroll behavior, history restoration, and scale-background effects are reference-counted or owner-stacked. One drawer closing cannot restore an effect still owned by another.
- The runtime never reads or writes `document.body.style.pointerEvents`.
- During the 600 ms closing window, updates reconcile the persistent trigger but do not fully rebuild the exiting dialog. Apply structural updates before closing or after reopening.
- A retained controller is an id facade, not a permanently dead object. After `destroy()`, calling one of its mutators creates that id again; discard stale facades during cleanup.

Numeric defaults are root exports; see [TypeScript → Numeric constants](/drawer/reference/typescript/#numeric-constants).
