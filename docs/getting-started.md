# Getting started

This page walks through what `@samline/drawer` is, how the runtime is wired, and which side effects each public method produces. Use it as the mental model before you dive into the per-method reference under [`docs/api/`](api/index.md).

---

## When to use this variant

Use the vanilla variant when you work with native HTML pages, embedded scripts, static sites, or applications where you do not need a framework wrapper. This is the primary — and only — runtime entrypoint of `@samline/drawer` since v3.0.0.

If you want a `<script>`-only setup without a bundler, see [docs/browser.md](browser.md).

---

## Anatomy of the runtime

The runtime has three moving parts:

1. **A module-level `drawerInstances` map** (`src/runtime/registry.ts`) — keeps a `Map<id, DrawerRuntimeInstance>` for every drawer you have created. There is exactly one registry shared by every consumer in the page.
2. **A vanilla host + dialog** (`src/vanilla/host.ts` + `src/vanilla/dialog.ts`) — the host owns the mount element (`<div data-drawer-vanilla-root>`), the dialog owns the actual surface (`<div data-drawer>`, `<div data-drawer-overlay>`, optional `<div data-drawer-handle>`). The runtime re-renders the dialog on every state change.
3. **The `createDrawer` factory** (`src/runtime/registry.ts`) — the public surface that the rest of your code talks to. `createDrawer(options?)` and the imperative helpers (`openDrawer`, `closeDrawer`, `getDrawer`, etc.) all hit the registry.

The controller returned by `createDrawer` has a small, focused method surface. Most methods are chainable (mutate the same instance and return it):

```ts
import { createDrawer } from '@samline/drawer'
import '@samline/drawer/styles.css'

const drawer = createDrawer({
  id: 'filters',
  direction: 'bottom',
  title: 'Filters',
  description: 'Refine the result set',
  content: 'Drawer body'
})

drawer.setOpen(true) // open it
drawer.update({ activeSnapPoint: '420px' }) // jump to a snap
drawer.destroy() // tear it down
```

Methods that return data instead of the controller: `drawer.id`, `drawer.options`, `drawer.element`, `drawer.getSnapshot()`.

---

## Observable contract

Once a drawer is created, you can rely on the following behaviour:

- **A `<div data-drawer-vanilla-root>` is appended to `document.body`** (or to your `mountElement` if you provided one). The runtime owns this host and re-renders its children on every state change.
- **A `<div data-drawer>` is mounted inside the host** with the data-attributes the stylesheet reads: `data-state="open" | "closed"`, `data-drawer-direction="top" | "bottom" | "left" | "right"`, `data-drawer-snap-points`, `data-drawer-animate`, plus `role="dialog"`, `aria-modal`, and an `id` matching the drawer's runtime id.
- **A `<div data-drawer-overlay>` is mounted for modal drawers** (default). It carries `data-state` and `data-drawer-snap-points-overlay` for the fade-from-index behaviour.
- **An optional `<div data-drawer-handle>`** is mounted when `handleOnly: true` or `showHandle: true`. Clicking it advances the active snap point (see [recipes](recipes.md)).
- **A built-in `<button data-drawer-vanilla-trigger>`** is mounted when `triggerText` is set. Clicking it opens the drawer.
- **Drag-to-dismiss is wired for every open drawer.** `pointerdown` on the content element starts a drag; the dialog follows the finger. On release, the gesture either closes the drawer (past the 25 % close threshold or above the 0.4 velocity threshold) or snaps back to the open position. The `onDragChange(percentageDragged)` and `onReleaseChange(open)` callbacks fire.
- **Snap points are wired when `snapPoints` is set.** The drawer positions itself at the active snap on open, the drag interpolates between snaps, and the release either snaps to the closest point or closes on high velocity.
- **`shouldScaleBackground: true`** scales the page shell (the element with `data-drawer-wrapper`) while the drawer is dragged. With `setBackgroundColorOnScale: true`, a translucent black background overlays the shell.
- **Nested drawers** declared via `parentId` scale and shift the parent when the child opens (`runtime/nested.ts`). Drag the child and the parent follows along.
- **`window.history.scrollRestoration` is toggled to `'manual'`** when `preventScrollRestoration: true` and restored to its previous value on destroy.
- **`prefers-reduced-motion` is honored in CSS.** The JS still runs the math, but the stylesheet suppresses the animations.

---

## Lifecycle

The recommended flow:

1. **Create** — call [`createDrawer(options?)`](api/create-drawer.md) with the drawer's initial options. The runtime wires the controller, mounts the host, and renders the dialog in its `closed` state.
2. **Open** — call `drawer.setOpen(true)` or [`openDrawer(id?)`](api/open-drawer.md). The host re-renders the dialog with `data-state="open"`, body scroll is locked if `modal` is not `false`, and the first focusable element receives focus (unless `autoFocus: false`).
3. **Interact** — drag the content, click the handle to cycle snap points, press `Escape` to dismiss, click the overlay to dismiss, or call the imperative helpers to drive the state.
4. **Update** — call `drawer.update(options?)` (or [`updateDrawer(idOrOptions?, options?)`](api/update-drawer.md)) to merge new options into the same instance. The registry re-renders the dialog so the new options take effect.
5. **Close** — call `drawer.setOpen(false)` or [`closeDrawer(id?)`](api/close-drawer.md). The dialog re-renders with `data-state="closed"` and the CSS close animation runs. `onClose()` fires at the start of the close, `onAnimationEnd(false)` fires after `TRANSITIONS.DURATION` (500 ms).
6. **Destroy** — call `drawer.destroy()` or [`destroyDrawer(id?)`](api/destroy-drawer.md) to tear down the host and remove the drawer from the registry. Use [`destroyDrawers()`](api/destroy-drawers.md) to clear every live instance at once.

---

## Side effects per method

Use this as a quick lookup when you need to know what a method will touch.

| Method                                                                                                                            | DOM mutation                                                                          | Subscribers notified   | Body scroll lock                    | Focus                                      |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------- | ------------------------------------------ |
| [`createDrawer(options?)`](api/create-drawer.md)                                                                                  | yes (mounts host + dialog)                                                            | yes (initial snapshot) | only if `open: true` on creation    | n/a                                        |
| [`configureDrawer(options?)`](api/configure-drawer.md)                                                                            | same as `createDrawer`                                                                | yes                    | same                                | same                                       |
| `drawer.setOpen(true \| false)`                                                                                                   | yes (re-renders dialog with new `data-state`)                                         | yes                    | acquired on open, released on close | first focusable on open, previous on close |
| `drawer.setActiveSnapPoint(snap)`                                                                                                 | yes (re-renders dialog at the new offset)                                             | yes                    | unchanged                           | unchanged                                  |
| `drawer.patch(options)` / `drawer.update(options?)`                                                                               | yes (re-renders dialog if anything visible changed)                                   | yes                    | unchanged                           | unchanged                                  |
| `drawer.subscribe(listener)`                                                                                                      | no (callback fires immediately with the current snapshot, then on every state change) | n/a                    | unchanged                           | unchanged                                  |
| `drawer.getSnapshot()`                                                                                                            | no (read-only)                                                                        | no                     | unchanged                           | unchanged                                  |
| `drawer.destroy()`                                                                                                                | yes (removes the host from the DOM)                                                   | n/a                    | released if held                    | released to the previous focus             |
| [`getDrawer(id?)`](api/get-drawer.md) / [`getDrawers()`](api/get-drawers.md)                                                      | no (read-only)                                                                        | no                     | unchanged                           | unchanged                                  |
| [`getParentDrawer(id?)`](api/get-parent-drawer.md) / [`getChildDrawers(id?)`](api/get-child-drawers.md)                           | no (read-only)                                                                        | no                     | unchanged                           | unchanged                                  |
| [`updateDrawer(idOrOptions?, options?)`](api/update-drawer.md)                                                                    | yes (same as `drawer.update`)                                                         | yes                    | unchanged                           | unchanged                                  |
| [`openDrawer(id?)`](api/open-drawer.md) / [`closeDrawer(id?)`](api/close-drawer.md) / [`toggleDrawer(id?)`](api/toggle-drawer.md) | yes (programmatic open/close)                                                         | yes                    | same as `drawer.setOpen`            | same                                       |
| [`destroyDrawer(id?)`](api/destroy-drawer.md)                                                                                     | yes (removes the host)                                                                | n/a                    | released                            | released                                   |
| [`destroyDrawers()`](api/destroy-drawers.md)                                                                                      | yes (removes every host)                                                              | n/a                    | each released per drawer            | each released per drawer                   |
| [`createDrawerController(options?)`](api/create-drawer-controller.md)                                                             | no (no DOM, no host)                                                                  | no                     | no                                  | no                                         |

---

## Recommended usage patterns

- Pass `id` when you need more than the default runtime instance. Reusing an `id` updates the same instance; it does not create a second drawer.
- Pass `parentId` when this drawer should follow another drawer's lifecycle. Closing the parent closes the registered children; destroying the parent recursively destroys them. See [recipes](recipes.md#nested-drawers).
- Pass `triggerText` to render a built-in button inside the mounted host. Pass `triggerElement` instead when you want an external button in your own DOM tree.
- Pass `showHandle: true` to render the built-in handle but still allow drag to start from the full drawer surface. Use `handleOnly: true` to also restrict the drag to the handle.
- Pass `mountElement` when the host should live inside a specific DOM subtree instead of being appended to `document.body`.
- Use `title` and `description` for a simple heading block above the body. When your drawer has its own card / panel / header layout, render the heading inside `content` instead.
- Use `drawer.subscribe(snapshot => …)` when a higher-level component (router, store, view layer) needs to react to the whole drawer state.
- Use `drawer.patch(options)` (or `drawer.update(options?)`) to merge new options into the same instance without losing the controller.
- Use `drawer.setOpen(false)` or `closeDrawer(id)` to dismiss, and `drawer.destroy()` to release the host.
- When `shouldScaleBackground: true`, add `data-drawer-wrapper` to the page shell element that should scale behind the drawer.
- When a child element should not start a drag, add `data-drawer-no-drag` to it.
- When `preventScrollRestoration: true`, the runtime flips `history.scrollRestoration` to `'manual'` while the drawer is mounted; the previous value is restored on destroy.

---

## Browser registry helpers

The browser IIFE bundle ships a single global (`window.Drawer`) that wraps the same surface as the named exports. The same shape is available from the vanilla entrypoint as a module-level singleton called `browser`:

```ts
import { browser } from '@samline/drawer'
import '@samline/drawer/styles.css'

window.MyDrawer = { ...browser }

window.MyDrawer.createDrawer({ id: 'filters', title: 'Filters', content: 'Body' })
window.MyDrawer.openDrawer('filters')
window.MyDrawer.destroyDrawers()
```

`browser` is an object you can spread into your own globals or use directly. Because it shares the same module-level `drawerInstances` map as the named exports, every spread behaves the same — `window.MyDrawer.createDrawer({})` and `createDrawer({})` end up calling the same factory and updating the same DOM host.

If you need multiple independent registries, use the named exports with distinct `id` values.

```ts
import { createDrawer, getDrawer } from '@samline/drawer'

const account = createDrawer({ id: 'account', title: 'Account', content: 'Primary drawer' })
const security = createDrawer({ id: 'security', parentId: 'account', title: 'Security', content: 'Nested drawer' })

getDrawer('security')?.setOpen(true) // opens both (account first because security is nested)
```

---

## Submission examples

### Programmatic open / close with a controller

```ts
import { createDrawer, destroyDrawers } from '@samline/drawer'

const drawer = createDrawer({
  id: 'profile',
  direction: 'bottom',
  title: 'Profile',
  content: 'Drawer body',
  showHandle: true,
  snapPoints: ['120px', '320px', 1],
  activeSnapPoint: '120px'
})

drawer.subscribe((snapshot) => {
  console.log('drawer state:', snapshot.state.isOpen, snapshot.state.activeSnapPoint)
})

drawer.setOpen(true)
// ... user interacts ...
drawer.setActiveSnapPoint(1)
drawer.setOpen(false)

destroyDrawers() // cleanup
```

### Nested drawer

```ts
import { createDrawer, getParentDrawer, getChildDrawers } from '@samline/drawer'

const parent = createDrawer({ id: 'parent', title: 'Parent', content: 'Primary' })
const child = createDrawer({
  id: 'child',
  parentId: 'parent',
  title: 'Child',
  content: 'Nested',
  open: true
})

console.log(getParentDrawer('child')?.id) // 'parent'
console.log(getChildDrawers('parent').map((d) => d.id)) // ['child']
```

---

## Next steps

- Need a full options reference? See [docs/options.md](options.md).
- Looking up the exact signature of a method? See [docs/api/index.md](api/index.md).
- Working with the type system? See [docs/typescript.md](typescript.md).
- Want end-to-end patterns? See [docs/recipes.md](recipes.md).
- Want the stylesheet contract? See [docs/css-styling.md](css-styling.md).
- Working with the IIFE bundle? See [docs/browser.md](browser.md).
