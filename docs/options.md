# Options

`createDrawer(options?)` and the DOM-aware helpers accept `VanillaDrawerOptions`, which extends `CommonDrawerOptions` with rendering and host fields. Pass only what you need; the tables below list the runtime's effective defaults.

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'filters',
  direction: 'bottom',
  dismissible: true,
  modal: true,
  title: 'Filters',
  content: 'Body'
})
```

---

## Signature

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

---

## Field reference

| Field                       | Type                                                 | Default                 | Behaviour                                                                                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                        | `string`                                             | `'default'`             | Named runtime instance id. Reusing an `id` updates the same instance rather than creating a second drawer.                                                                                                                           |
| `parentId`                  | `string`                                             | `undefined`             | Parent runtime instance id. Opening a child opens its ancestor chain first; closing or destroying a parent also closes or destroys its registered children.                                                                          |
| `open`                      | `boolean`                                            | `undefined`             | Controlled open state. A closed drawer keeps its host and optional trigger, but overlay and content are present only while open or exiting.                                                                                          |
| `defaultOpen`               | `boolean`                                            | `false`                 | Initial open state when the drawer is created without `open`. Skips the entrance animation.                                                                                                                                          |
| `onOpenChange`              | `(open: boolean) => void`                            | `undefined`             | Fires when the open state changes through a user or programmatic action.                                                                                                                                                             |
| `onClose`                   | `() => void`                                         | `undefined`             | Fires before the open state changes from `true` to `false`.                                                                                                                                                                          |
| `onAnimationEnd`            | `(open: boolean) => void`                            | `undefined`             | Fires 500 ms after the latest open or close state change. A newer transition cancels the pending callback.                                                                                                                           |
| `onActiveSnapPointChange`   | `(snapPoint: CommonDrawerSnapPoint \| null) => void` | `undefined`             | Fires after an internal drag or handle action changes the active snap point.                                                                                                                                                         |
| `onDragChange`              | `(percentageDragged: number) => void`                | `undefined`             | Fires continuously while an allowed drag moves the content. The value is normalized against the rendered drawer dimension or active snap interval and can exceed 1 beyond that range.                                                |
| `onReleaseChange`           | `(open: boolean) => void`                            | `undefined`             | Fires once after an allowed drag release: `false` when it closes, `true` when it remains open or snaps.                                                                                                                              |
| `dismissible`               | `boolean`                                            | `true`                  | Whether Escape, overlay release, drag-close, and the handle's last-snap cycle can dismiss the drawer.                                                                                                                                |
| `modal`                     | `boolean`                                            | `true`                  | Enables the modal focus trap, overlay, and scroll prevention. The runtime never writes `document.body.style.pointerEvents`; overlay hit testing remains CSS-owned.                                                                   |
| `nested`                    | `boolean`                                            | `false`                 | Marks a drawer as nested. Set automatically when `parentId` is present.                                                                                                                                                              |
| `direction`                 | `'top' \| 'bottom' \| 'left' \| 'right'`             | `'bottom'`              | Controls animation, snap math, and drag axis. All four directions gate pointer capture on dominant movement in the configured axis, so a perpendicular page scroll does not become a drawer drag.                                    |
| `snapPoints`                | `Array<number \| string>`                            | `[]`                    | Snap positions. Numbers are fractions of the viewport or custom container. Every string is parsed as an absolute integer pixel count, so `'120px'` is 120 px and `'50%'` is 50 px. See [recipes](recipes.md#snap-points).            |
| `fadeFromIndex`             | `number`                                             | last snap index         | First snap index where the overlay is visible. When omitted with snap points, resolves to `snapPoints.length - 1`; without snap points it remains undefined.                                                                         |
| `activeSnapPoint`           | `number \| string \| null`                           | `snapPoints[0] ?? null` | Active snap point. Drive it with `drawer.setActiveSnapPoint(value)`.                                                                                                                                                                 |
| `closeThreshold`            | `number`                                             | `0.25`                  | For snap-free drawers, fraction of the rendered drawer dimension that a low-velocity drag must cross to dismiss. Snap-point releases use their separate snap policy.                                                                 |
| `scrollLockTimeout`         | `number`                                             | `100`                   | Millisecond cooldown used by the drag-permission policy after a gesture is blocked by scroll state.                                                                                                                                  |
| `shouldScaleBackground`     | `boolean`                                            | `false`                 | Scales and shifts the `[data-drawer-wrapper]` shell. When multiple drawers scale the same wrapper, the most recently opened owner controls it.                                                                                       |
| `setBackgroundColorOnScale` | `boolean`                                            | `true` while scaling    | Unless explicitly `false`, scaling sets the body background to black while owned and adds a translucent black tint to the wrapper during drag. Original styles return after the final owner closes.                                  |
| `handleOnly`                | `boolean`                                            | `false`                 | Restricts drag starts to the built-in handle and renders that handle automatically.                                                                                                                                                  |
| `fixed`                     | `boolean`                                            | `false`                 | Writes a keyboard-driven height override. It can attach viewport handling even when `repositionInputs` is disabled.                                                                                                                  |
| `disablePreventScroll`      | `boolean`                                            | `false`                 | When `true`, skips the desktop and iOS body-scroll prevention pipeline. It does not disable the separate Safari fixed-position helper or the `html` scroll-behavior override.                                                        |
| `repositionInputs`          | `boolean`                                            | `true`                  | While open, listens to `visualViewport.resize` and writes `style.bottom` only when a text input, textarea, or editable element inside the drawer is focused (or while an already-open keyboard is settling). Set `false` to opt out. |
| `snapToSequentialPoint`     | `boolean`                                            | `false`                 | For releases under 40% of the drawer dimension, limits a high-velocity swipe to the adjacent snap. Longer releases still settle at the closest snap and may skip points.                                                             |
| `preventScrollRestoration`  | `boolean`                                            | `false`                 | Sets `history.scrollRestoration` to `'manual'` while open and restores the prior value on close or destroy, after the final owner releases it.                                                                                       |
| `noBodyStyles`              | `boolean`                                            | `false`                 | Suppresses scale-background color ownership and the Safari fixed-position body helper. It does not disable modal scroll locking (`overflow`, scrollbar compensation, or iOS prevention); use `disablePreventScroll` for that.        |
| `autoFocus`                 | `boolean`                                            | `false`                 | Auto-focus is opt-in. `true` focuses the first focusable child, or the dialog itself when none exists. Without it, modal triggers are blurred before open and Tab still enters the focus trap.                                       |
| `preventCycle`              | `boolean`                                            | `false`                 | Disables the built-in handle's click-to-cycle behavior without disabling handle dragging.                                                                                                                                            |

---

## Vanilla-only options

These DOM renderer options are accepted by the root API and `window.Drawer`; the headless `createDrawerController` uses only `CommonDrawerOptions`. They are layered on top of that interface by `VanillaDrawerOptions`:

| Field                       | Type                  | Default         | Behaviour                                                                                                                                                                                                                                                                                                           |
| --------------------------- | --------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `container`                 | `HTMLElement \| null` | `document.body` | Preferred mount target. The runtime appends a dedicated host for this drawer and uses the container's dimensions for snap math. Multiple drawers can safely share the target.                                                                                                                                       |
| `mountElement`              | `HTMLElement \| null` | `undefined`     | Deprecated alias for `container`. The target resolves as `container ?? mountElement ?? document.body`, so a non-null `container` wins and `container: null` falls through to this alias.                                                                                                                            |
| `triggerElement`            | `HTMLElement \| null` | `undefined`     | Attach a `click` listener to an external element so it opens the drawer.                                                                                                                                                                                                                                            |
| `triggerText`               | `string`              | `undefined`     | Render a built-in `<button data-drawer-vanilla-trigger>` inside the host with the given label.                                                                                                                                                                                                                      |
| `showHandle`                | `boolean`             | `false`         | Render the built-in handle inside the dialog.                                                                                                                                                                                                                                                                       |
| `handleClassName`           | `string`              | `undefined`     | Class name appended to the built-in handle element.                                                                                                                                                                                                                                                                 |
| `ariaLabel`                 | `string`              | `undefined`     | Accessible label for the dialog. Used when no `title` slot is provided.                                                                                                                                                                                                                                             |
| `ariaLabelledBy`            | `string`              | `undefined`     | Consumer-provided label target id, used unchanged. If no matching element exists in `content`, the runtime assigns this id to the built-in title slot. When omitted, that slot receives `<drawer-id>-title`.                                                                                                        |
| `ariaDescribedBy`           | `string`              | `undefined`     | Consumer-provided description target id, used unchanged. If no matching element exists in `content`, the runtime assigns this id to the built-in description slot. When omitted, that slot receives `<drawer-id>-description`.                                                                                      |
| `title`                     | `VanillaRenderable`   | `undefined`     | Drawer title content. Rendered before the body inside the vanilla content wrapper.                                                                                                                                                                                                                                  |
| `titleVisuallyHidden`       | `boolean`             | auto            | Title slot visibility. `true` force-hides the slot. `false` keeps it visible. When `undefined` (the default), the slot is auto-hidden if the title was auto-promoted from `ariaLabel` (the proxy case) and auto-shown when the consumer passed an explicit `title`. Pass `false` to opt out of the proxy auto-hide. |
| `description`               | `VanillaRenderable`   | `undefined`     | Drawer description content. Rendered before the body inside the vanilla content wrapper.                                                                                                                                                                                                                            |
| `descriptionVisuallyHidden` | `boolean`             | `false`         | When `true`, the description slot is rendered with the visually-hidden style.                                                                                                                                                                                                                                       |
| `content`                   | `VanillaRenderable`   | `undefined`     | Main drawer body content. `VanillaRenderable` is `string \| number \| HTMLElement \| (() => HTMLElement) \| null \| undefined`.                                                                                                                                                                                     |
| `overlayClassName`          | `string`              | `undefined`     | Class name appended to the overlay element.                                                                                                                                                                                                                                                                         |
| `contentClassName`          | `string`              | `undefined`     | Class name appended to the content element.                                                                                                                                                                                                                                                                         |
| `closeButton`               | `boolean \| object`   | `undefined`     | Built-in close button. `true` renders a default `<button data-drawer-close>` (class `drawer-close-button`, icon `xmark`, label `Close`). Pass an object to override. The option shape is documented in [TypeScript reference](typescript.md#close-button-option-shape).                                             |

`VanillaRenderable` is the value shape accepted by `title`, `description`, and `content`. It is a `string`, `number`, `HTMLElement`, a thunk that returns an `HTMLElement`, or `null` / `undefined`. The runtime mounts pre-built elements directly and invokes thunks once on render.

---

## Effective defaults at a glance

These are the branches the runtime takes when options are omitted; this is not an exported constant.

```ts
const snapPoints = []
const effectiveDefaults = {
  id: 'default',
  open: undefined,
  defaultOpen: false,
  dismissible: true,
  modal: true,
  nested: false,
  direction: 'bottom',
  snapPoints,
  fadeFromIndex: snapPoints.length > 0 ? snapPoints.length - 1 : undefined,
  activeSnapPoint: snapPoints[0] ?? null,
  closeThreshold: 0.25,
  scrollLockTimeout: 100,
  shouldScaleBackground: false,
  setBackgroundColorOnScale: true, // when shouldScaleBackground is enabled
  handleOnly: false,
  fixed: false,
  disablePreventScroll: false,
  repositionInputs: true,
  snapToSequentialPoint: false,
  preventScrollRestoration: false,
  noBodyStyles: false,
  autoFocus: false,
  preventCycle: false
}
```

The numeric defaults are also re-exported as constants from the package — see [docs/typescript.md](typescript.md#numeric-constants) for the full list.
