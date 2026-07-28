# TypeScript reference

`@samline/drawer` is written in strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `verbatimModuleSyntax: true`). The root entrypoint exports the controller, options, snapshot, id, direction, snap-point, and renderable types listed below. Some useful shapes are intentionally available only through an exported type's properties, and `DrawerApi` is exported from the browser subpath rather than the root.

---

## Top-level types

```ts
import type {
  CommonDrawerDirection,
  CommonDrawerSnapPoint,
  CommonDrawerId,
  CommonDrawerOptions,
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

A snap point value. Numbers are interpreted as fractions of the viewport or supplied custom container. Every string is parsed with `parseInt` and treated as an absolute pixel count: `'120px'` resolves to 120 px, `'50%'` resolves to 50 px, and decimal strings are truncated.

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

### Snapshot state shape

The runtime state is available as `CommonDrawerSnapshot['state']`. `CommonDrawerState` is the source-level interface name, but it is not a named root export.

```ts
type DrawerState = CommonDrawerSnapshot['state']

// Equivalent shape:
interface DrawerStateShape {
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
  state: DrawerStateShape
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
- `update(options?)` — merge new options into the same id and re-render. Returns a controller facade for that instance; object identity is not guaranteed across helper calls.
- `destroy()` — alias for `destroyDrawer(id)`.

### `VanillaDrawerOptions`

`CommonDrawerOptions` extended with the vanilla-only host / trigger / handle / content / className options. See [docs/options.md](options.md#vanilla-only-options) for the full list.

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

`container` is the preferred mount target. `mountElement` is deprecated and used as a nullish fallback: the target is `container ?? mountElement ?? document.body`. Every drawer gets its own host inside the target, so multiple drawers can share a container without sharing mount state.

### `VanillaRenderable`

```ts
type VanillaRenderable = string | number | HTMLElement | (() => HTMLElement) | null | undefined
```

The value shape accepted by `title`, `description`, and `content`. Strings and numbers are mounted as text nodes. Pre-built `HTMLElement` instances are mounted directly. Thunks are invoked once on render and the returned `HTMLElement` is mounted. `null` / `undefined` render nothing for that slot.

### Close-button option shape

The source names this object `VanillaCloseButtonOptions`, but that name is not exported from the package root. Derive it from the exported options type when a standalone alias is useful:

```ts
type CloseButtonOptions = Exclude<NonNullable<VanillaDrawerOptions['closeButton']>, boolean>
```

Its equivalent shape is `{ className?: string; icon?: string | HTMLElement; ariaLabel?: string }`.

- `className` — class applied to the button. The consumer can use it to position the button (e.g. `absolute top-5 right-5`).
- `icon` — icon content. A string is rendered as text inside a `<span aria-hidden="true">`. An `HTMLElement` is appended as-is. Defaults to the literal `xmark` text.
- `ariaLabel` — accessible label for the button. Defaults to `'Close'`.

The full mount lifecycle of the button is in [docs/options.md → closeButton](./options.md#vanilla-only-options).

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
| `SCROLL_LOCK_TIMEOUT`  | `100`                | Drag-permission cooldown in milliseconds after a gesture is blocked by scroll state.                        |
| `BORDER_RADIUS`        | `8`                  | Pixel value the scale-background pipeline uses for the page-shell border-radius at `percentageDragged = 0`. |
| `NESTED_DISPLACEMENT`  | `16`                 | Pixel displacement used when an open child scales and shifts its parent drawer.                             |
| `WINDOW_TOP_OFFSET`    | `26`                 | Pixel offset used by scale-background math and the mobile Firefox viewport layout.                          |
| `DRAG_CLASS`           | `'drawer-dragging'`  | Class added after axis intent is accepted and removed on release or cancellation.                           |

```ts
import { TRANSITIONS, VELOCITY_THRESHOLD, CLOSE_THRESHOLD } from '@samline/drawer'

console.log(TRANSITIONS.DURATION) // 0.5
console.log(VELOCITY_THRESHOLD) // 0.4
console.log(CLOSE_THRESHOLD) // 0.25
```

---

## Browser global

The IIFE bundle exports a `Drawer` namespace. `DrawerApi` comes from the browser subpath, not the root entrypoint:

```ts
import type { DrawerApi } from '@samline/drawer/browser'

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
  updateDrawer: (
    idOrOptions?: string | VanillaDrawerOptions | null,
    options?: VanillaDrawerOptions
  ) => VanillaDrawerController
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
