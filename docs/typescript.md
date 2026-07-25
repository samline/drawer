# TypeScript reference

`@samline/drawer` is written in strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `verbatimModuleSyntax: true`). Every public type is exported from the root entrypoint.

---

## Top-level types

```ts
import type {
  CommonDrawerDirection,
  CommonDrawerSnapPoint,
  CommonDrawerId,
  CommonDrawerOptions,
  CommonDrawerState,
  CommonDrawerSnapshot,
  CommonDrawerController,
  VanillaDrawerController,
  VanillaDrawerOptions,
  VanillaRenderable
} from '@samline/drawer'
```

### `CommonDrawerDirection`

```ts
type CommonDrawerDirection = 'top' | 'bottom' | 'left' | 'right'
```

The four directions a drawer can slide from / to.

### `CommonDrawerSnapPoint`

```ts
type CommonDrawerSnapPoint = number | string
```

A snap point value. Numbers are interpreted as fractions of the viewport (0–1). Strings with a `'%'` suffix are treated as a percentage of the viewport. Any other string is parsed as a pixel value (e.g. `'120px'`).

### `CommonDrawerId`

```ts
type CommonDrawerId = string
```

The runtime instance id. Reusing an `id` updates the same drawer.

### `CommonDrawerOptions`

The full options surface — see [docs/options.md](options.md) for the field-by-field reference.

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

### `CommonDrawerState`

The runtime state derived from the controller's options.

```ts
interface CommonDrawerState {
  isOpen: boolean
  activeSnapPoint: CommonDrawerSnapPoint | null
  direction: CommonDrawerDirection
  snapPoints: CommonDrawerSnapPoint[]
  dismissible: boolean
  modal: boolean
}
```

### `CommonDrawerSnapshot`

The full controller snapshot.

```ts
interface CommonDrawerSnapshot {
  options: CommonDrawerOptions
  state: CommonDrawerState
}
```

### `CommonDrawerController`

The headless controller interface. The `VanillaDrawerController` returned by `createDrawer` extends this with the DOM-aware helpers (`element`, `update`, `destroy`).

```ts
interface CommonDrawerController {
  getSnapshot: () => CommonDrawerSnapshot
  setOpen: (open: boolean) => CommonDrawerSnapshot
  setActiveSnapPoint: (snapPoint: CommonDrawerSnapPoint | null) => CommonDrawerSnapshot
  patch: (options: Partial<CommonDrawerOptions>) => CommonDrawerSnapshot
  subscribe: (listener: (snapshot: CommonDrawerSnapshot) => void) => () => void
}
```

`setOpen` and `setActiveSnapPoint` return the new snapshot. `patch` merges the partial into the existing options. `subscribe` registers a listener; the returned function unsubscribes it.

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

- `id` — the runtime instance id.
- `element` — the current host element (`<div data-drawer-vanilla-root>`) when mounted, or `null` after `destroy()`.
- `options` — the latest merged options passed to the root entrypoint.
- `update(options?)` — merge new options into the same instance and re-render. Returns the same controller.
- `destroy()` — alias for `destroyDrawer(id)`.

### `VanillaDrawerOptions`

`CommonDrawerOptions` extended with the vanilla-only host / trigger / handle / content / className options. See [docs/options.md](options.md#vanilla-only-options) for the full list.

```ts
interface VanillaDrawerOptions extends CommonDrawerOptions {
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
```

### `VanillaRenderable`

```ts
type VanillaRenderable = string | number | HTMLElement | (() => HTMLElement) | null | undefined
```

The value shape accepted by `title`, `description`, and `content`. Strings and numbers are mounted as text nodes. Pre-built `HTMLElement` instances are mounted directly. Thunks are invoked once on render and the returned `HTMLElement` is mounted. `null` / `undefined` render nothing for that slot.

---

## Controller

The vanilla `createDrawer(options?)` factory returns a `VanillaDrawerController`. The headless `createDrawerController(options?)` factory returns a `CommonDrawerController` with no DOM awareness.

```ts
function createDrawer(options?: VanillaDrawerOptions): VanillaDrawerController
function createDrawerController(options?: CommonDrawerOptions): CommonDrawerController
```

---

## Numeric constants

The numeric defaults used by the runtime live in `src/constants.ts` and are re-exported as plain numbers from the root entrypoint. Use them when you want to reason about timing without re-deriving values.

| Constant               | Default              | Meaning                                                                                                     |
| ---------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `TRANSITIONS.DURATION` | `0.5`                | CSS transition duration in seconds.                                                                         |
| `TRANSITIONS.EASE`     | `[0.32, 0.72, 0, 1]` | CSS `cubic-bezier()` ease curve.                                                                            |
| `VELOCITY_THRESHOLD`   | `0.4`                | Minimum velocity (px / ms) for a release to dismiss the drawer.                                             |
| `CLOSE_THRESHOLD`      | `0.25`               | Minimum fraction of the drawer dimension the user must drag past for release to dismiss.                    |
| `SCROLL_LOCK_TIMEOUT`  | `100`                | Reserved for the scroll-lock interaction (currently inert).                                                 |
| `BORDER_RADIUS`        | `8`                  | Pixel value the scale-background pipeline uses for the page-shell border-radius at `percentageDragged = 0`. |
| `NESTED_DISPLACEMENT`  | `16`                 | Pixel displacement the scale-background pipeline uses to compute the base scale.                            |
| `WINDOW_TOP_OFFSET`    | `26`                 | Pixel offset the mobile-keyboard layout uses for `isMobileFirefox` (reserved).                              |
| `DRAG_CLASS`           | `'drawer-dragging'`  | Reserved.                                                                                                   |

```ts
import { TRANSITIONS, VELOCITY_THRESHOLD, CLOSE_THRESHOLD } from '@samline/drawer'

console.log(TRANSITIONS.DURATION) // 0.5
console.log(VELOCITY_THRESHOLD) // 0.4
console.log(CLOSE_THRESHOLD) // 0.25
```

---

## Browser global

The IIFE bundle exports a `Drawer` namespace. Type it from the root entrypoint:

```ts
import type { DrawerApi } from '@samline/drawer'

declare global {
  interface Window {
    Drawer?: DrawerApi
  }
}

window.Drawer?.createDrawer({ id: 'filters', title: 'Filters', content: 'Body' })
```

```ts
interface DrawerApi {
  getParentDrawer: (id?: string | null) => VanillaDrawerController | null
  getChildDrawers: (id?: string | null) => VanillaDrawerController[]
  openDrawer: (id?: string | null) => VanillaDrawerController
  closeDrawer: (id?: string | null) => VanillaDrawerController
  toggleDrawer: (id?: string | null) => VanillaDrawerController
  updateDrawer: (id?: string | null, options?: VanillaDrawerOptions) => VanillaDrawerController
  createDrawer: (options?: VanillaDrawerOptions) => VanillaDrawerController
  configureDrawer: (options?: VanillaDrawerOptions) => VanillaDrawerController
  getDrawer: (id?: string | null) => VanillaDrawerController | null
  getDrawers: () => Record<string, VanillaDrawerController>
  destroyDrawer: (id?: string | null) => void
  destroyDrawers: () => void
  createDrawerController: (options?: CommonDrawerOptions) => CommonDrawerController
}
```

---

## Subscribing to state changes

The controller is observable. `subscribe` fires the listener immediately with the current snapshot, then on every subsequent state change.

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({ id: 'filters', title: 'Filters' })

const unsubscribe = drawer.subscribe((snapshot) => {
  console.log('isOpen:', snapshot.state.isOpen)
  console.log('snap:', snapshot.state.activeSnapPoint)
})

// Later, when the subscriber is no longer needed:
unsubscribe()
```

`getSnapshot()` returns the current snapshot without subscribing — useful for read-only consumers.
