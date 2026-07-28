# Options

`createDrawer(options?)` and the DOM-aware helpers accept `VanillaDrawerOptions`, which extends `CommonDrawerOptions` with rendering and host fields. Pass only what you need; the tables below list the runtime's effective defaults and show a minimal example for every field.

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

## Renderable content

The `content`, `title`, and `description` slots all accept the same shape: `VanillaRenderable`. Every example in this section uses `content`; the same rules apply to `title` and `description`.

```ts
type VanillaRenderable = string | number | HTMLElement | (() => HTMLElement) | null | undefined
```

| Form             | What happens                                                                                                                                          | Example                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `string`         | Mounted as a text node inside the slot. Safe for plain copy.                                                                                          | `content: 'Drawer body'`                                                 |
| `number`         | Mounted as a text node. Useful for numeric badges.                                                                                                    | `title: 3`                                                               |
| `HTMLElement`    | **Moved** (not cloned) into the slot. The runtime does not own the element; do not append it elsewhere while the drawer owns it.                     | `content: formElement`                                                   |
| `() => HTMLElement` | The thunk is invoked once per dialog DOM build (mount on open, rebuild on option-driven remount) and must return an element. Lazy presence will re-invoke it on every reopen. | `content: () => buildForm()`                                             |
| `null` / `undefined` | Renders nothing for that slot. Useful when the consumer builds the entire shell in their own code.                                                | `description: undefined`                                                 |

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

// 5. Empty.
createDrawer({ id: 'e' /* no content slot — slot still mounts, body is empty */ })
```

Notes:

- **Move semantics**: when you pass an `HTMLElement`, the runtime adopts it. After `destroyDrawer`, the element is left in the host's previous location; you can keep using it as a normal DOM node, but you cannot pass the same instance to a second `content` while the first drawer still owns it.
- **Lazy presence**: the dialog subtree is unmounted on close, so a thunk re-runs every time the user reopens. Use this to refresh dynamic content, or capture expensive work outside the thunk.
- **`data-drawer-body`**: `content` is mounted into `[data-drawer-vanilla-body]` inside `[data-drawer]`. The body slot is always created while the dialog is mounted, even when `content` is omitted.
- **Drag opt-out**: any descendant inside the content can opt out of starting a drawer drag with `data-drawer-no-drag`.

See [Recipes → Custom HTML content](recipes.md#custom-html-content) for end-to-end patterns.

---

## Field reference

### Common fields

Every field on `CommonDrawerOptions`. The example column shows the smallest realistic usage of the field.

| Field                       | Type                                                 | Default                 | Behaviour                                                                                                                                                                                                                            | Example                                                                              |
| --------------------------- | ---------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `id`                        | `string`                                             | `'default'`             | Named runtime instance id. Reusing an `id` updates the same instance rather than creating a second drawer.                                                                                                                           | `id: 'filters'`                                                                      |
| `parentId`                  | `string`                                             | `undefined`             | Parent runtime instance id. Opening a child opens its ancestor chain first; closing or destroying a parent also closes or destroys its registered children.                                                                          | `parentId: 'account'`                                                               |
| `open`                      | `boolean`                                            | `undefined`             | Controlled open state. A closed drawer keeps its host and optional trigger, but overlay and content are present only while open or exiting.                                                                                          | `open: true`                                                                         |
| `defaultOpen`               | `boolean`                                            | `false`                 | Initial open state when the drawer is created without `open`. Skips the entrance animation.                                                                                                                                          | `defaultOpen: true`                                                                  |
| `onOpenChange`              | `(open: boolean) => void`                            | `undefined`             | Fires when the open state changes through a user or programmatic action.                                                                                                                                                             | `onOpenChange(open) { log(open) }`                                                  |
| `onClose`                   | `() => void`                                         | `undefined`             | Fires before the open state changes from `true` to `false`.                                                                                                                                                                          | `onClose() { cleanup() }`                                                            |
| `onAnimationEnd`            | `(open: boolean) => void`                            | `undefined`             | Fires 500 ms after the latest open or close state change. A newer transition cancels the pending callback.                                                                                                                           | `onAnimationEnd(open) { log(open) }`                                                |
| `onActiveSnapPointChange`   | `(snapPoint: CommonDrawerSnapPoint \| null) => void` | `undefined`             | Fires after an internal drag or handle action changes the active snap point.                                                                                                                                                         | `onActiveSnapPointChange(s) { setSnap(s) }`                                         |
| `onDragChange`              | `(percentageDragged: number) => void`                | `undefined`             | Fires continuously while an allowed drag moves the content. The value is normalized against the rendered drawer dimension or active snap interval and can exceed 1 beyond that range.                                                | `onDragChange(p) { setDragProgress(p) }`                                            |
| `onReleaseChange`           | `(open: boolean) => void`                            | `undefined`             | Fires once after an allowed drag release: `false` when it closes, `true` when it remains open or snaps.                                                                                                                              | `onReleaseChange(keptOpen) { log(keptOpen) }`                                       |
| `dismissible`               | `boolean`                                            | `true`                  | Whether Escape, overlay release, drag-close, and the handle's last-snap cycle can dismiss the drawer.                                                                                                                                | `dismissible: false`                                                                 |
| `modal`                     | `boolean`                                            | `true`                  | Enables the modal focus trap, overlay, and scroll prevention. The runtime never writes `document.body.style.pointerEvents`; overlay hit testing remains CSS-owned.                                                                   | `modal: false`                                                                       |
| `nested`                    | `boolean`                                            | `false`                 | Marks a drawer as nested. Set automatically when `parentId` is present.                                                                                                                                                              | `nested: true`                                                                       |
| `direction`                 | `'top' \| 'bottom' \| 'left' \| 'right'`             | `'bottom'`              | Controls animation, snap math, and drag axis. All four directions gate pointer capture on dominant movement in the configured axis, so a perpendicular page scroll does not become a drawer drag.                                    | `direction: 'right'`                                                                 |
| `snapPoints`                | `Array<number \| string>`                            | `[]`                    | Snap positions. Numbers are fractions of the viewport or custom container. Every string is parsed as an absolute integer pixel count, so `'120px'` is 120 px and `'50%'` is 50 px. See [recipes](recipes.md#snap-points).            | `snapPoints: ['180px', '420px', 1]`                                                 |
| `fadeFromIndex`             | `number`                                             | last snap index         | First snap index where the overlay is visible. When omitted with snap points, resolves to `snapPoints.length - 1`; without snap points it remains undefined.                                                                         | `fadeFromIndex: 1`                                                                   |
| `activeSnapPoint`           | `number \| string \| null`                           | `snapPoints[0] ?? null` | Active snap point. Drive it with `drawer.setActiveSnapPoint(value)`.                                                                                                                                                                 | `activeSnapPoint: '180px'`                                                           |
| `closeThreshold`            | `number`                                             | `0.25`                  | For snap-free drawers, fraction of the rendered drawer dimension that a low-velocity drag must cross to dismiss. Snap-point releases use their separate snap policy.                                                                 | `closeThreshold: 0.5`                                                                |
| `scrollLockTimeout`         | `number`                                             | `100`                   | Millisecond cooldown used by the drag-permission policy after a gesture is blocked by scroll state.                                                                                                                                  | `scrollLockTimeout: 200`                                                             |
| `shouldScaleBackground`     | `boolean`                                            | `false`                 | Scales and shifts the `[data-drawer-wrapper]` shell. When multiple drawers scale the same wrapper, the most recently opened owner controls it.                                                                                       | `shouldScaleBackground: true`                                                        |
| `setBackgroundColorOnScale` | `boolean`                                            | `true` while scaling    | Unless explicitly `false`, scaling sets the body background to black while owned and adds a translucent black tint to the wrapper during drag. Original styles return after the final owner closes.                                  | `setBackgroundColorOnScale: false`                                                  |
| `handleOnly`                | `boolean`                                            | `false`                 | Restricts drag starts to the built-in handle and renders that handle automatically.                                                                                                                                                  | `handleOnly: true`                                                                   |
| `fixed`                     | `boolean`                                            | `false`                 | Writes a keyboard-driven height override. It can attach viewport handling even when `repositionInputs` is disabled.                                                                                                                  | `fixed: true`                                                                        |
| `disablePreventScroll`      | `boolean`                                            | `false`                 | When `true`, skips the desktop and iOS body-scroll prevention pipeline. It does not disable the separate Safari fixed-position helper or the `html` scroll-behavior override.                                                        | `disablePreventScroll: true`                                                        |
| `repositionInputs`          | `boolean`                                            | `true`                  | While open, listens to `visualViewport.resize` and writes `style.bottom` only when a text input, textarea, or editable element inside the drawer is focused (or while an already-open keyboard is settling). Set `false` to opt out. | `repositionInputs: false`                                                           |
| `snapToSequentialPoint`     | `boolean`                                            | `false`                 | For releases under 40% of the drawer dimension, limits a high-velocity swipe to the adjacent snap. Longer releases still settle at the closest snap and may skip points.                                                             | `snapToSequentialPoint: true`                                                       |
| `preventScrollRestoration`  | `boolean`                                            | `false`                 | Sets `history.scrollRestoration` to `'manual'` while open and restores the prior value on close or destroy, after the final owner releases it.                                                                                       | `preventScrollRestoration: true`                                                    |
| `noBodyStyles`              | `boolean`                                            | `false`                 | Suppresses scale-background color ownership and the Safari fixed-position body helper. It does not disable modal scroll locking (`overflow`, scrollbar compensation, or iOS prevention); use `disablePreventScroll` for that.        | `noBodyStyles: true`                                                                 |
| `autoFocus`                 | `boolean`                                            | `false`                 | Auto-focus is opt-in. `true` focuses the first focusable child, or the dialog itself when none exists. Without it, modal triggers are blurred before open and Tab still enters the focus trap.                                       | `autoFocus: true`                                                                    |
| `preventCycle`              | `boolean`                                            | `false`                 | Disables the built-in handle's click-to-cycle behavior without disabling handle dragging.                                                                                                                                            | `preventCycle: true`                                                                 |

### Vanilla-only options

These DOM renderer options are accepted by the root API and `window.Drawer`; the headless `createDrawerController` uses only `CommonDrawerOptions`. They are layered on top of that interface by `VanillaDrawerOptions`.

| Field                       | Type                  | Default         | Behaviour                                                                                                                                                                                                                                                                                                           | Example                                                                                |
| --------------------------- | --------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `container`                 | `HTMLElement \| null` | `document.body` | Preferred mount target. The runtime appends a dedicated host for this drawer and uses the container's dimensions for snap math. Multiple drawers can safely share the target.                                                                                                                                       | `container: document.getElementById('region')`                                         |
| `mountElement`              | `HTMLElement \| null` | `undefined`     | Deprecated alias for `container`. The target resolves as `container ?? mountElement ?? document.body`, so a non-null `container` wins and `container: null` falls through to this alias.                                                                                                                            | `mountElement: legacyContainer`                                                        |
| `triggerElement`            | `HTMLElement \| null` | `undefined`     | Attach a `click` listener to an external element so it opens the drawer.                                                                                                                                                                                                                                            | `triggerElement: document.getElementById('open-filters')`                              |
| `triggerText`               | `string`              | `undefined`     | Render a built-in `<button data-drawer-vanilla-trigger>` inside the host with the given label.                                                                                                                                                                                                                      | `triggerText: 'Open filters'`                                                          |
| `showHandle`                | `boolean`             | `false`         | Render the built-in handle inside the dialog.                                                                                                                                                                                                                                                                       | `showHandle: true`                                                                     |
| `handleClassName`           | `string`              | `undefined`     | Class name appended to the built-in handle element.                                                                                                                                                                                                                                                                 | `handleClassName: 'my-handle'`                                                         |
| `ariaLabel`                 | `string`              | `undefined`     | Accessible label for the dialog. Used when no `title` slot is provided.                                                                                                                                                                                                                                             | `ariaLabel: 'Filters'`                                                                 |
| `ariaLabelledBy`            | `string`              | auto            | Consumer-provided label target id, used unchanged. If no matching element exists in `content`, the runtime assigns this id to the built-in title slot. When omitted, that slot receives `<drawer-id>-title`.                                                                                                        | `ariaLabelledBy: 'filters-title'`                                                      |
| `ariaDescribedBy`           | `string`              | auto            | Consumer-provided description target id, used unchanged. If no matching element exists in `content`, the runtime assigns this id to the built-in description slot. When omitted, that slot receives `<drawer-id>-description`.                                                                                      | `ariaDescribedBy: 'filters-desc'`                                                      |
| `title`                     | `VanillaRenderable`   | `undefined`     | Drawer title content. Rendered before the body inside the vanilla content wrapper. See [Renderable content](#renderable-content).                                                                                                                                                                                  | `title: 'Filters'`                                                                     |
| `titleVisuallyHidden`       | `boolean`             | auto            | Title slot visibility. `true` force-hides the slot. `false` keeps it visible. When `undefined` (the default), the slot is auto-hidden if the title was auto-promoted from `ariaLabel` (the proxy case) and auto-shown when the consumer passed an explicit `title`. Pass `false` to opt out of the proxy auto-hide. | `titleVisuallyHidden: true`                                                            |
| `description`               | `VanillaRenderable`   | `undefined`     | Drawer description content. Rendered before the body inside the vanilla content wrapper. See [Renderable content](#renderable-content).                                                                                                                                                                            | `description: 'Refine the result set'`                                                 |
| `descriptionVisuallyHidden` | `boolean`             | `true`          | When `true`, the description slot is rendered with the visually-hidden style.                                                                                                                                                                                                                                       | `descriptionVisuallyHidden: false`                                                     |
| `content`                   | `VanillaRenderable`   | `undefined`     | Main drawer body content. See [Renderable content](#renderable-content).                                                                                                                                                                                                                                            | `content: formElement`                                                                 |
| `overlayClassName`          | `string`              | `undefined`     | Class name appended to the overlay element.                                                                                                                                                                                                                                                                         | `overlayClassName: 'drawer-overlay'`                                                   |
| `contentClassName`          | `string`              | `undefined`     | Class name appended to the content element.                                                                                                                                                                                                                                                                         | `contentClassName: 'drawer-panel'`                                                     |
| `closeButton`               | `boolean \| object`   | `undefined`     | Built-in close button. `true` renders a default `<button data-drawer-close>` (class `drawer-close-button`, icon `xmark`, label `Close`). Pass an object to override. The option shape is documented in [TypeScript reference](typescript.md#close-button-option-shape).                                             | `closeButton: { className: 'absolute top-5 right-5' }`                                |

`VanillaRenderable` is the value shape accepted by `title`, `description`, and `content`. It is a `string`, `number`, `HTMLElement`, a thunk that returns an `HTMLElement`, or `null` / `undefined`. The runtime mounts pre-built elements directly and invokes thunks once per dialog DOM build.

### Close-button option shape

The object passed to `closeButton` has its own option surface, exported only via the `VanillaDrawerOptions` type (the source name `VanillaCloseButtonOptions` is not a root type export).

| Field       | Type                | Default       | Example                                                |
| ----------- | ------------------- | ------------- | ------------------------------------------------------ |
| `className` | `string`            | `'drawer-close-button'` | `className: 'absolute top-5 right-5'`         |
| `icon`      | `string \| HTMLElement` | `'xmark'` (rendered as text inside a `<span aria-hidden="true">`) | `icon: '\u2715'` or `icon: xmarkElement` |
| `ariaLabel` | `string`            | `'Close'`     | `ariaLabel: 'Close filters'`                           |

The button's `click` event `stopPropagation()`s so it does not bubble to the drawer's content. The button is removed on re-mount and on `destroyDrawer`.

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
  preventCycle: false,
  container: undefined,
  mountElement: undefined,
  triggerElement: undefined,
  triggerText: undefined,
  showHandle: false,
  handleClassName: undefined,
  ariaLabel: undefined,
  ariaLabelledBy: undefined,
  ariaDescribedBy: undefined,
  title: undefined,
  titleVisuallyHidden: undefined, // auto
  description: undefined,
  descriptionVisuallyHidden: true, // default behavior is to hide the slot
  content: undefined,
  overlayClassName: undefined,
  contentClassName: undefined,
  closeButton: undefined
}
```

---

## See also

- [TypeScript reference](typescript.md) — every type, callback, and helper return shape.
- [Recipes](recipes.md#custom-html-content) — Custom HTML content patterns.
- [CSS styling](css-styling.md) — the data-attribute contract for theming.
- [Getting started](getting-started.md) — observable contract, lifecycle, side effects.
