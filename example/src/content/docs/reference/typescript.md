---
title: TypeScript reference
description: Every exported type, callback signature, and helper return shape in @samline/drawer.
template: doc
sidebar:
  order: 4
---

`@samline/drawer` is written in strict TypeScript. The root entrypoint exports the types below; browser-global typing is intentionally separate.

## Root type exports

```ts
import type {
  CommonDrawerController,
  CommonDrawerDirection,
  CommonDrawerId,
  CommonDrawerOptions,
  CommonDrawerSnapshot,
  CommonDrawerSnapPoint,
  VanillaDrawerController,
  VanillaDrawerOptions,
  VanillaRenderable
} from '@samline/drawer'
```

`CommonDrawerState`, `VanillaCloseButtonOptions`, and `DrawerApi` are not root named type exports. Their usable forms are documented below.

### `CommonDrawerDirection`

```ts
type CommonDrawerDirection = 'top' | 'bottom' | 'left' | 'right'
```

All four values support entrance/exit motion, snap math, and drag-to-dismiss. Closing gestures are up for `top`, down for `bottom`, left for `left`, and right for `right`.

### `CommonDrawerSnapPoint`

```ts
type CommonDrawerSnapPoint = number | string
```

Numbers are fractions of the viewport or custom container. Strings are parsed as absolute pixel counts, so `'120px'` resolves to 120 pixels and `'50%'` is parsed as 50 pixels rather than 50 percent.

### `CommonDrawerId`

```ts
type CommonDrawerId = string
```

The registry key. Reusing an id merges options into the same runtime instance and per-id host.

### `CommonDrawerOptions`

See [Configuration](/drawer/reference/configuration/) for defaults and detailed behavior.

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

### `CommonDrawerSnapshot`

```ts
interface CommonDrawerSnapshot {
  options: CommonDrawerOptions
  state: {
    isOpen: boolean
    activeSnapPoint: CommonDrawerSnapPoint | null
    direction: CommonDrawerDirection
    snapPoints: CommonDrawerSnapPoint[]
    dismissible: boolean
    modal: boolean
  }
}
```

The source names the nested shape `CommonDrawerState`, but the root package does not re-export that name. Derive it without relying on an unavailable import:

```ts
import type { CommonDrawerSnapshot } from '@samline/drawer'

type CommonDrawerState = CommonDrawerSnapshot['state']
```

### `CommonDrawerController`

```ts
interface CommonDrawerController {
  getSnapshot: () => CommonDrawerSnapshot
  setOpen: (open: boolean) => CommonDrawerSnapshot
  setActiveSnapPoint: (snapPoint: CommonDrawerSnapPoint | null) => CommonDrawerSnapshot
  patch: (options: Partial<CommonDrawerOptions>) => CommonDrawerSnapshot
  subscribe: (listener: (snapshot: CommonDrawerSnapshot) => void) => () => void
}
```

- `getSnapshot()` synchronously reads state.
- `setOpen(open)` publishes and returns the resulting snapshot.
- `setActiveSnapPoint(value)` updates the point and returns the snapshot; it does not echo `onActiveSnapPointChange`.
- `patch(options)` shallow-merges options, publishes, and returns the snapshot.
- `subscribe(listener)` invokes the listener immediately and returns an unsubscribe function.

### `VanillaDrawerController`

```ts
interface VanillaDrawerController extends CommonDrawerController {
  id: CommonDrawerId
  element: HTMLElement | null
  options: VanillaDrawerOptions
  update: (options?: VanillaDrawerOptions) => VanillaDrawerController
  destroy: () => void
}
```

- `id` is the normalized registry id.
- `element` is the dedicated `[data-drawer-vanilla-root]` host, not the lazy `[data-drawer]` dialog. It exists while the id is registered in a DOM environment, including while closed, and becomes `null` after destroy.
- `options` is the latest shallow-merged vanilla option object.
- `update(options?)` delegates to `createDrawer({ ...options, id })` and returns a controller wrapper for the same underlying instance.
- `destroy()` delegates to `destroyDrawer(id)`.

`getDrawer()` and `getDrawers()` can return fresh controller wrapper objects. Compare ids or state, not object identity; all wrappers for one live id target the same underlying controller.

### `VanillaDrawerOptions`

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
  closeButton?:
    | boolean
    | {
        className?: string
        icon?: string | HTMLElement
        ariaLabel?: string
      }
}
```

`container` is preferred. `mountElement` is deprecated and only used as a fallback when `container` is nullish.

### Close-button object shape

The source interface is named `VanillaCloseButtonOptions`, but that name is not re-exported from the package root. Derive the object branch from `VanillaDrawerOptions`:

```ts
import type { VanillaDrawerOptions } from '@samline/drawer'

type CloseButtonOptions = Exclude<NonNullable<VanillaDrawerOptions['closeButton']>, boolean>

const closeButton: CloseButtonOptions = {
  className: 'drawer-close',
  icon: 'xmark',
  ariaLabel: 'Close filters'
}
```

The defaults are `drawer-close-button`, `xmark`, and `Close` respectively.

### `VanillaRenderable`

```ts
type VanillaRenderable = string | number | HTMLElement | (() => HTMLElement) | null | undefined
```

Strings and numbers become text nodes. An element is moved into the dialog. A thunk is invoked once per dialog DOM build and must return an `HTMLElement`; lazy Presence means closing removes that element and reopening builds the slots again.

## Factory returns

```ts
function createDrawer(options?: VanillaDrawerOptions): VanillaDrawerController
function createDrawerController(options?: CommonDrawerOptions): CommonDrawerController
```

`createDrawer` registers and renders a per-id host. `createDrawerController` is headless: it publishes snapshots but does not mount DOM or run registry lifecycle callbacks/effects.

## Numeric constants

These values are root runtime exports, not type-only declarations:

| Constant               | Value                | Runtime use                                                              |
| ---------------------- | -------------------- | ------------------------------------------------------------------------ |
| `TRANSITIONS.DURATION` | `0.5`                | Transition duration in seconds and lifecycle timer basis.                |
| `TRANSITIONS.EASE`     | `[0.32, 0.72, 0, 1]` | Transform/opacity easing curve.                                          |
| `VELOCITY_THRESHOLD`   | `0.4`                | Velocity threshold used by release decisions.                            |
| `CLOSE_THRESHOLD`      | `0.25`               | Default dismissed fraction of the rendered drawer dimension.             |
| `SCROLL_LOCK_TIMEOUT`  | `100`                | Drag cooldown after scrollable content prevents a gesture.               |
| `BORDER_RADIUS`        | `8`                  | Open-rest page-wrapper radius for background scaling.                    |
| `NESTED_DISPLACEMENT`  | `16`                 | Parent displacement used by nested-drawer transforms.                    |
| `WINDOW_TOP_OFFSET`    | `26`                 | Background base-scale and mobile viewport offset input.                  |
| `DRAG_CLASS`           | `'drawer-dragging'`  | Class added after axis intent is accepted and removed on release/cancel. |

```ts
import { CLOSE_THRESHOLD, TRANSITIONS, VELOCITY_THRESHOLD } from '@samline/drawer'

console.log(TRANSITIONS.DURATION) // 0.5
console.log(VELOCITY_THRESHOLD) // 0.4
console.log(CLOSE_THRESHOLD) // 0.25
```

## Browser global type

`DrawerApi` is exported by the `@samline/drawer/browser` declarations, not by the root entrypoint. Keep the import type-only so no runtime browser bundle is imported:

```ts
import type { DrawerApi } from '@samline/drawer/browser'

declare global {
  interface Window {
    Drawer?: DrawerApi
  }
}

window.Drawer?.createDrawer({ id: 'filters', title: 'Filters', content: 'Body' })
```

The interface uses the same function types as the root named API, including both `updateDrawer(options)` and `updateDrawer(id, options)` forms. There is no root runtime export named `browser` or root type export named `DrawerApi`.

## Subscribing

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({ id: 'filters', title: 'Filters' })
const unsubscribe = drawer.subscribe((snapshot) => {
  console.log('isOpen:', snapshot.state.isOpen)
  console.log('snap:', snapshot.state.activeSnapPoint)
})

unsubscribe()
```

The listener runs immediately and on each controller publication. Use `getSnapshot()` for a synchronous read without subscribing.
