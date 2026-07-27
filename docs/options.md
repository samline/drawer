# Options

`createDrawer(options?)` (and every other public entrypoint) accepts a `CommonDrawerOptions` object. Every field has a default — pass only what you need.

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

| Field                       | Type                                     | Default                 | Behaviour                                                                                                                                                                                                                |
| --------------------------- | ---------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                        | `string`                                 | `'default'`             | Named runtime instance id. Reusing an `id` updates the same instance rather than creating a second drawer.                                                                                                               |
| `parentId`                  | `string`                                 | `undefined`             | Parent runtime instance id. Use when one drawer should behave as a child of another (closing the parent closes the registered children, destroying the parent recursively destroys them).                                |
| `open`                      | `boolean`                                | `undefined`             | Controlled open state. The dialog mounts closed unless `open: true` is set; changes after creation drive `drawer.setOpen` semantics.                                                                                     |
| `defaultOpen`               | `boolean`                                | `false`                 | Initial open state when the drawer is created without `open`. Skips the enter animation.                                                                                                                                 |
| `onOpenChange`              | `(open: boolean) => void`                | `undefined`             | Fires when the drawer's open state changes — user-driven (drag, escape, overlay click) or programmatic (`setOpen`, `openDrawer`, etc.).                                                                                  |
| `onClose`                   | `() => void`                             | `undefined`             | Fires after the drawer's open state goes `true → false` (programmatic or user-driven).                                                                                                                                   |
| `onAnimationEnd`            | `(open: boolean) => void`                | `undefined`             | Fires after the open or close CSS transition completes (default 500 ms). The argument is the new state.                                                                                                                  |
| `onDragChange`              | `(percentageDragged: number) => void`    | `undefined`             | Fires continuously while the user drags the content. `percentageDragged` is a value between 0 and 1, where 0 is at-rest and 1 is the full drawer dimension dragged.                                                      |
| `onReleaseChange`           | `(open: boolean) => void`                | `undefined`             | Fires once when the user releases the drag. The argument is the resolved action — `false` if the drawer closed, `true` if it stayed open (reset or snapped).                                                             |
| `dismissible`               | `boolean`                                | `true`                  | Whether escape, overlay press, drag-close, and the handle's last-snap cycle can dismiss the drawer. Set `false` to require programmatic open/close.                                                                      |
| `modal`                     | `boolean`                                | `true`                  | Whether the drawer blocks interaction with the rest of the page. `modal: false` opens a non-modal drawer that coexists with the page.                                                                                    |
| `nested`                    | `boolean`                                | `false`                 | Marks a drawer as nested inside another. `nested: true` is set automatically when `parentId` is set; you usually do not need to pass it directly.                                                                        |
| `direction`                 | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'`              | Direction of the drawer. Affects the open animation, the drag axis, and the snap-point math.                                                                                                                             |
| `snapPoints`                | `Array<number \| string>`                | `[]`                    | Snap positions. Numbers are interpreted as fractions of the viewport (0.5 = 50 %); strings with `'%'` are treated as a percentage and the rest as pixels. See [recipes](recipes.md#snap-points) for end-to-end patterns. |
| `fadeFromIndex`             | `number`                                 | `undefined`             | Index of the snap point at which the overlay starts to fade. When the drawer is at `snapPoints[fadeFromIndex]` or higher, the overlay's opacity transitions from full to transparent.                                    |
| `activeSnapPoint`           | `number \| string \| null`               | `snapPoints[0] ?? null` | Controlled active snap point. Drive it with `drawer.setActiveSnapPoint(value)`.                                                                                                                                          |
| `closeThreshold`            | `number`                                 | `0.25`                  | Fraction of the drawer dimension the user must drag past for release to dismiss the drawer.                                                                                                                              |
| `scrollLockTimeout`         | `number`                                 | `100`                   | Reserved for the scroll-lock interaction. Currently inert — the runtime honors the touch-action / drag-permission policy without scheduling a timeout.                                                                   |
| `shouldScaleBackground`     | `boolean`                                | `false`                 | When `true`, the page shell (the element with `data-drawer-wrapper`) scales and shifts while the drag is in progress, using the `NESTED_DISPLACEMENT`-based math.                                                        |
| `setBackgroundColorOnScale` | `boolean`                                | `false`                 | When `true` (and `shouldScaleBackground: true`), a translucent black `background-color` overlays the page shell while the drag is in progress.                                                                           |
| `handleOnly`                | `boolean`                                | `false`                 | Restricts the drag so it can only start from the built-in handle. The runtime still renders the handle automatically — you do not need to add `showHandle: true` here.                                                   |
| `fixed`                     | `boolean`                                | `false`                 | When `true`, the drawer height changes (instead of repositioning) when the mobile keyboard opens. Honored by the `repositionInputs` pipeline.                                                                            |
| `disablePreventScroll`      | `boolean`                                | `false`                 | Reserved. Currently inert — the runtime does not touch the document's scroll behavior beyond the `body.style.overflow = 'hidden'` lock while the drawer is open.                                                         |
| `repositionInputs`          | `boolean`                                | `false`                 | When `true`, the dialog listens to `window.visualViewport.resize` and applies `style.bottom` so focused inputs stay visible when the mobile keyboard opens.                                                              |
| `snapToSequentialPoint`     | `boolean`                                | `false`                 | When `true`, a high-velocity swipe can only move to the next snap point (not skip to the last or the first).                                                                                                             |
| `preventScrollRestoration`  | `boolean`                                | `false`                 | When `true`, the runtime flips `window.history.scrollRestoration` to `'manual'` while the drawer is mounted and restores the previous value on destroy.                                                                  |
| `noBodyStyles`              | `boolean`                                | `false`                 | When `true`, the runtime does not write `document.body.style.overflow` / `paddingRight` while the drawer is open. Use this when your app manages body styles itself.                                                     |
| `autoFocus`                 | `boolean`                                | `true`                  | When `true`, the first focusable element inside the dialog receives focus on open. Set `false` to keep the focused element where it was.                                                                                 |
| `preventCycle`              | `boolean`                                | `false`                 | When `true`, the built-in handle's click-to-cycle behavior is disabled. The handle still renders and is still draggable.                                                                                                 |

---

## Vanilla-only options

These options are only meaningful from the root vanilla entrypoint (`@samline/drawer`). They are layered on top of `CommonDrawerOptions` by the `VanillaDrawerOptions` interface in `src/vanilla/render.ts`:

| Field                       | Type                                   | Default     | Behaviour                                                                                                                                                                                                                                                                                                           |
| --------------------------- | -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mountElement`              | `HTMLElement \| null`                  | `undefined` | Mount the host into a specific container instead of appending it to `document.body`.                                                                                                                                                                                                                                |
| `triggerElement`            | `HTMLElement \| null`                  | `undefined` | Attach a `click` listener to an external element so it opens the drawer.                                                                                                                                                                                                                                            |
| `triggerText`               | `string`                               | `undefined` | Render a built-in `<button data-drawer-vanilla-trigger>` inside the host with the given label.                                                                                                                                                                                                                      |
| `showHandle`                | `boolean`                              | `false`     | Render the built-in handle inside the dialog.                                                                                                                                                                                                                                                                       |
| `handleClassName`           | `string`                               | `undefined` | Class name appended to the built-in handle element.                                                                                                                                                                                                                                                                 |
| `ariaLabel`                 | `string`                               | `undefined` | Accessible label for the dialog. Used when no `title` slot is provided.                                                                                                                                                                                                                                             |
| `ariaLabelledBy`            | `string`                               | `undefined` | ID of an element that labels the dialog. The runtime auto-generates an id on the title slot when this is provided.                                                                                                                                                                                                  |
| `ariaDescribedBy`           | `string`                               | `undefined` | ID of an element that describes the dialog. The runtime auto-generates an id on the description slot when this is provided.                                                                                                                                                                                         |
| `title`                     | `VanillaRenderable`                    | `undefined` | Drawer title content. Rendered before the body inside the vanilla content wrapper.                                                                                                                                                                                                                                  |
| `titleVisuallyHidden`       | `boolean`                              | auto        | Title slot visibility. `true` force-hides the slot. `false` keeps it visible. When `undefined` (the default), the slot is auto-hidden if the title was auto-promoted from `ariaLabel` (the proxy case) and auto-shown when the consumer passed an explicit `title`. Pass `false` to opt out of the proxy auto-hide. |
| `description`               | `VanillaRenderable`                    | `undefined` | Drawer description content. Rendered before the body inside the vanilla content wrapper.                                                                                                                                                                                                                            |
| `descriptionVisuallyHidden` | `boolean`                              | `false`     | When `true`, the description slot is rendered with the visually-hidden style.                                                                                                                                                                                                                                       |
| `content`                   | `VanillaRenderable`                    | `undefined` | Main drawer body content. `VanillaRenderable` is `string \| number \| HTMLElement \| (() => HTMLElement) \| null \| undefined`.                                                                                                                                                                                     |
| `overlayClassName`          | `string`                               | `undefined` | Class name appended to the overlay element.                                                                                                                                                                                                                                                                         |
| `contentClassName`          | `string`                               | `undefined` | Class name appended to the content element.                                                                                                                                                                                                                                                                         |
| `closeButton`               | `boolean \| VanillaCloseButtonOptions` | `undefined` | Built-in close button. `true` renders a default `<button data-drawer-close>` (class `drawer-close-button`, icon `xmark`, label `Close`). Pass an object to override. The button is removed on re-mount and on `destroyDrawer`.                                                                                      |

`VanillaRenderable` is the value shape accepted by `title`, `description`, and `content`. It is a `string`, `number`, `HTMLElement`, a thunk that returns an `HTMLElement`, or `null` / `undefined`. The runtime mounts pre-built elements directly and invokes thunks once on render.

---

## Defaults at a glance

```ts
const DEFAULT_DRAWER_OPTIONS = {
  id: 'default',
  open: undefined,
  defaultOpen: false,
  dismissible: true,
  modal: true,
  nested: false,
  direction: 'bottom',
  snapPoints: [],
  fadeFromIndex: undefined,
  activeSnapPoint: null,
  closeThreshold: 0.25,
  scrollLockTimeout: 100,
  shouldScaleBackground: false,
  setBackgroundColorOnScale: false,
  handleOnly: false,
  fixed: false,
  disablePreventScroll: false,
  repositionInputs: false,
  snapToSequentialPoint: false,
  preventScrollRestoration: false,
  noBodyStyles: false,
  autoFocus: true,
  preventCycle: false
}
```

The numeric defaults are also re-exported as constants from the package — see [docs/typescript.md](typescript.md#numeric-constants) for the full list.
