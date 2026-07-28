---
title: API reference
description: Method-by-method reference for @samline/drawer.
template: doc
sidebar:
  order: 3
---

The public API of `@samline/drawer@3.0.0`. DOM-aware functions use one module-level registry; `createDrawerController` is the separate headless state factory.

The runtime is built around `id`. Reusing an id merges into its registered instance and dedicated host rather than creating another host.

:::tip[Reading the signatures]
Most registry mutators return a controller. `destroyDrawer()` and `destroyDrawers()` return `void`; inspectors return controllers or collections, and `subscribe()` returns an unsubscribe function.
:::

## Factory

- [`createDrawer(options?)`](#createdraweroptions) — create or update a named drawer instance and return its controller.
- [`configureDrawer(options?)`](#configuredraweroptions) — alias of `createDrawer` kept for intent.

## Inspectors

- [`getDrawer(id?)`](#getdrawerid) — return the controller for a drawer, or `null` if it has not been created.
- [`getDrawers()`](#getdrawers) — return every live drawer keyed by id.
- [`getParentDrawer(id?)`](#getparentdrawerid) — return the parent of a nested drawer, or `null` for top-level drawers.
- [`getChildDrawers(id?)`](#getchilddrawersid) — return the children of a nested drawer.

## Mutators

- [`updateDrawer(idOrOptions?, options?)`](#updatedraweridoroptions-options) — merge new options into an existing drawer.
- [`openDrawer(id?)`](#opendrawerid) — open a drawer.
- [`closeDrawer(id?)`](#closedrawerid) — close a drawer.
- [`toggleDrawer(id?)`](#toggledrawerid) — toggle a drawer's open state.
- [`destroyDrawer(id?)`](#destroydrawerid) — destroy a single drawer and remove it from the registry.
- [`destroyDrawers()`](#destroydrawers) — destroy every live drawer.

## Headless

- [`createDrawerController(options?)`](#createdrawercontrolleroptions) — create a controller without mounting a DOM host. Useful for tests, headless logic, or building a different renderer on top of the same observable state.

## Lifecycle contract

- `createDrawer()` registers the id and creates a dedicated `[data-drawer-vanilla-root="id"]` host immediately in a DOM environment.
- Closed state uses lazy Presence: no overlay or `[data-drawer]` dialog is mounted initially. An optional built-in trigger remains in the host.
- Opening mounts overlay/content. A drawer created initially open skips its entrance animation; opening a previously closed registered host animates.
- Closing keeps overlay/content in `data-state="closed"` for the exit transition, releases focus/scroll/viewport effects immediately, and removes those nodes after the 600 ms safety timeout. The registry entry, host, and trigger remain.
- Destroying removes the registry entry, trigger listeners, owned host, pending lifecycle timers, and this drawer's effect ownership. It does not call `onClose` first.
- Shared scroll locks, document scroll behavior, history restoration, focus stack, and scale-background effects compose across ids. A closing drawer cannot restore an effect another open drawer still owns.
- The runtime never writes `document.body.style.pointerEvents`.

---

## Per-method summaries

Each method below documents the full signature, parameters, return shape, behaviour, runnable example, and related methods.

### Factory

#### `createDrawer(options?)`

Create a named drawer instance, or update an existing one when the same `id` is reused. Returns the controller.

**Signature**

```ts
function createDrawer(options?: VanillaDrawerOptions): VanillaDrawerController
```

**Description**

`createDrawer` is the canonical entrypoint. It stores options in the module-level registry and resolves one owned host for the id under `container ?? mountElement ?? document.body`. `container` is preferred and `mountElement` is deprecated.

The optional built-in trigger is reconciled in that host even while closed. Overlay and dialog content mount only when open, remain during the exit transition, and are absent again after close. Reusing the same id is an update; option changes may update the open nodes in place or rebuild that id's dialog subtree, but do not add another host.

The default `id` is `'default'`. Omit `id` to use the default instance.

**Parameters**

| Name      | Type                   | Default | Description                                                             |
| --------- | ---------------------- | ------- | ----------------------------------------------------------------------- |
| `options` | `VanillaDrawerOptions` | `{}`    | The drawer's full options surface. See [Configuration](configuration/). |

**Returns**

`VanillaDrawerController` — a controller wrapper for the created or updated id. See [TypeScript → `VanillaDrawerController`](typescript/#vanilladrawercontroller).

**Example**

```ts
import { createDrawer, destroyDrawers } from '@samline/drawer'
import '@samline/drawer/styles.css'

const drawer = createDrawer({
  id: 'filters',
  direction: 'bottom',
  title: 'Filters',
  content: 'Drawer body',
  showHandle: true,
  snapPoints: ['120px', '320px', 1]
})

drawer.setOpen(true)

// ... user interacts ...

destroyDrawers()
```

**Related**

- [`configureDrawer(options?)`](#configuredraweroptions) — alias.
- [`updateDrawer(idOrOptions?, options?)`](#updatedraweridoroptions-options) — patch an existing drawer's options.
- [`destroyDrawer(id?)`](#destroydrawerid) — tear down a single drawer.
- [`destroyDrawers()`](#destroydrawers) — tear down every live drawer.

#### `configureDrawer(options?)`

Alias of [`createDrawer`](#createdraweroptions). Kept for intent at the call site.

**Signature**

```ts
function configureDrawer(options?: VanillaDrawerOptions): VanillaDrawerController
```

**Description**

`configureDrawer` is identical to `createDrawer` in every way — same arguments, same return, same side effects. The two names are kept so the call site can express intent: `createDrawer` reads as "construct a new drawer", `configureDrawer` reads as "tune the existing one" (or "ensure a drawer with this configuration exists").

Both names hit the same module-level registry. The runtime does not track which name was used to create the drawer.

**Parameters**

| Name      | Type                   | Default | Description                                                             |
| --------- | ---------------------- | ------- | ----------------------------------------------------------------------- |
| `options` | `VanillaDrawerOptions` | `{}`    | The drawer's full options surface. See [Configuration](configuration/). |

**Returns**

`VanillaDrawerController` — the controller for the created or updated drawer.

**Example**

```ts
import { configureDrawer, getDrawer } from '@samline/drawer'

// Either name works; pick the one that reads better at the call site.
configureDrawer({ id: 'filters', title: 'Filters', content: 'Body' })
getDrawer('filters')?.setOpen(true)
```

**Related**

- [`createDrawer(options?)`](#createdraweroptions) — the canonical entrypoint.
- [`updateDrawer(idOrOptions?, options?)`](#updatedraweridoroptions-options) — patch options and return a controller facade for the same id.

### Inspectors

#### `getDrawer(id?)`

Return the controller for a drawer, or `null` if it has not been created.

**Signature**

```ts
function getDrawer(id?: string | null): VanillaDrawerController | null
```

**Description**

`getDrawer` is a read-only inspector. It does not create a drawer — if the id has not been registered, the function returns `null`. The returned wrapper targets the same underlying instance but is not guaranteed to have object identity with a wrapper returned earlier.

Use `getDrawer` to:

- Read the current snapshot (`getSnapshot()`).
- Subscribe to state changes (`subscribe()`).
- Update the drawer (`update()`) without first reaching for `createDrawer`.
- Destroy the drawer (`destroy()`).

The default `id` is `'default'`. Omit the argument to inspect the default instance.

**Parameters**

| Name | Type             | Default     | Description              |
| ---- | ---------------- | ----------- | ------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id. |

**Returns**

`VanillaDrawerController | null` — a controller facade for the id, or `null` if it has not been registered.

**Example**

```ts
import { createDrawer, getDrawer, destroyDrawer } from '@samline/drawer'

// Returns null when the id has not been registered.
getDrawer('filters') // null

createDrawer({ id: 'filters', title: 'Filters' })

// Returns a controller facade.
getDrawer('filters')?.getSnapshot().state.isOpen // false
getDrawer('filters')?.setOpen(true)
getDrawer('filters')?.update({ title: 'Filters (updated)' })
getDrawer('filters')?.destroy()

getDrawer('filters') // null again
```

**Related**

- [`getDrawers()`](#getdrawers) — return every live drawer.
- [`createDrawer(options?)`](#createdraweroptions) — create or update a drawer.
- [`destroyDrawer(id?)`](#destroydrawerid) — remove a drawer from the registry.

#### `getDrawers()`

Return every live drawer keyed by id.

**Signature**

```ts
function getDrawers(): Record<string, VanillaDrawerController>
```

**Description**

`getDrawers` is a read-only inspector. It returns a fresh plain object with one controller wrapper per registered drawer, keyed by `id`. Calling a wrapper targets the same underlying state as `createDrawer`, but wrapper object identity is not stable.

Use it to enumerate every drawer (for example, to close them all on a navigation event) without keeping your own map.

**Returns**

`Record<string, VanillaDrawerController>` — a plain object with one entry per live drawer. The object is freshly allocated on every call; mutations to the object do not affect the registry.

**Example**

```ts
import { getDrawers } from '@samline/drawer'

for (const [id, drawer] of Object.entries(getDrawers())) {
  console.log(id, drawer.getSnapshot().state.isOpen)
}

// Close every drawer at once (use destroyDrawers for the full teardown).
for (const drawer of Object.values(getDrawers())) {
  drawer.setOpen(false)
}
```

**Related**

- [`getDrawer(id?)`](#getdrawerid) — return a single controller.
- [`destroyDrawers()`](#destroydrawers) — full teardown.

#### `getParentDrawer(id?)`

Return the parent of a nested drawer, or `null` for top-level drawers.

**Signature**

```ts
function getParentDrawer(id?: string | null): VanillaDrawerController | null
```

**Description**

`getParentDrawer` walks the registry by `id`, reads the drawer's `parentId`, and returns the controller for that parent. Returns `null` if the drawer has no parent, if the parent is not in the registry, or if the drawer itself is not in the registry.

Useful for driving a child's lifecycle from the parent's lifecycle (close / open in lockstep) without threading references.

The default `id` is `'default'`. Omit the argument to inspect the parent of the default instance.

**Parameters**

| Name | Type             | Default     | Description                                    |
| ---- | ---------------- | ----------- | ---------------------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id whose parent you want. |

**Returns**

`VanillaDrawerController | null` — the parent's controller, or `null` if there is no parent or the parent is not live.

**Example**

```ts
import { createDrawer, getParentDrawer, getChildDrawers } from '@samline/drawer'

createDrawer({ id: 'parent', title: 'Parent', content: 'Primary' })
createDrawer({ id: 'child', parentId: 'parent', title: 'Child', content: 'Nested' })

getParentDrawer('child')?.id // 'parent'
getParentDrawer('parent') // null
```

**Related**

- [`getChildDrawers(id?)`](#getchilddrawersid) — return the children of a nested drawer.
- [`getDrawer(id?)`](#getdrawerid) — return the controller for a single drawer.

#### `getChildDrawers(id?)`

Return the children of a nested drawer.

**Signature**

```ts
function getChildDrawers(id?: string | null): VanillaDrawerController[]
```

**Description**

`getChildDrawers` walks the registry and returns every drawer whose `parentId` matches the given id, in registry insertion order. It can return children even if no parent instance is currently registered; the relationship is stored on each child.

The default `id` is `'default'`. Omit the argument to inspect the children of the default instance.

**Parameters**

| Name | Type             | Default     | Description                                      |
| ---- | ---------------- | ----------- | ------------------------------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id whose children you want. |

**Returns**

`VanillaDrawerController[]` — the live children controllers in insertion order. The array is freshly allocated on every call; mutating it does not affect the registry.

**Example**

```ts
import { createDrawer, getChildDrawers, getParentDrawer } from '@samline/drawer'

createDrawer({ id: 'parent', title: 'Parent', content: 'Primary' })
createDrawer({ id: 'child-a', parentId: 'parent', title: 'A', content: 'A' })
createDrawer({ id: 'child-b', parentId: 'parent', title: 'B', content: 'B' })

getChildDrawers('parent').map((d) => d.id) // ['child-a', 'child-b']
getChildDrawers('parent').map((d) => getParentDrawer(d.id)?.id) // ['parent', 'parent']
```

**Related**

- [`getParentDrawer(id?)`](#getparentdrawerid) — return the parent of a nested drawer.
- [`destroyDrawer(id?)`](#destroydrawerid) — destroying a parent recursively destroys its children.

### Mutators

#### `updateDrawer(idOrOptions?, options?)`

Merge new options into an existing drawer.

**Signature**

```ts
function updateDrawer(
  idOrOptions?: string | VanillaDrawerOptions | null,
  options?: VanillaDrawerOptions
): VanillaDrawerController
```

**Description**

`updateDrawer` accepts two calling conventions:

- `updateDrawer(options)` — the `options` object includes an `id`. Equivalent to `createDrawer(options)`.
- `updateDrawer(id, options)` — the `id` is the first argument, the partial options are the second. Equivalent to `createDrawer({ ...options, id })`.

If the drawer already exists, the options are shallow-merged and the host/dialog contract is reconciled. If it does not exist, the runtime registers it and creates its per-id host; overlay/content still follow lazy Presence.

The controller returned is always the up-to-date controller for the resolved `id`.

**Parameters**

| Name          | Type                                     | Default     | Description                                                            |
| ------------- | ---------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `idOrOptions` | `string \| VanillaDrawerOptions \| null` | `'default'` | The id (string) or the full options (object) for the drawer to update. |
| `options`     | `VanillaDrawerOptions`                   | `{}`        | The partial options to merge when the first argument is a string id.   |

**Returns**

`VanillaDrawerController` — the controller for the updated drawer.

**Example**

```ts
import { createDrawer, updateDrawer, getDrawer } from '@samline/drawer'

// Two-argument form: id first, options second.
createDrawer({ id: 'filters', title: 'Filters', content: 'Body' })
updateDrawer('filters', { activeSnapPoint: 1, direction: 'right' })

// Single-argument form: options with id inside.
updateDrawer({ id: 'filters', dismissible: false })

// Single-argument on the default instance (id is 'default').
updateDrawer({ open: true })
getDrawer()?.getSnapshot().state.isOpen // true
```

**Related**

- [`createDrawer(options?)`](#createdraweroptions) — the canonical entrypoint.
- [`drawer.update(options?)`](typescript/#vanilladrawercontroller) — the same merge on an already-held controller.

#### `openDrawer(id?)`

Open a drawer.

**Signature**

```ts
function openDrawer(id?: string | null): VanillaDrawerController
```

**Description**

`openDrawer` is a thin wrapper around `createDrawer({ id, open: true })`. It creates the per-id host and open dialog if needed, or merges `{ open: true }` into an existing instance, and returns a controller wrapper.

For an existing closed drawer, opening mounts its overlay and content and runs the entrance animation. A newly created drawer is initially open and skips that entrance animation. Opening a nested drawer first opens its registered ancestor chain, then places the child above those ancestors in open order.

The default `id` is `'default'`. Omit the argument to open the default instance.

**Parameters**

| Name | Type             | Default     | Description                      |
| ---- | ---------------- | ----------- | -------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id to open. |

**Returns**

`VanillaDrawerController` — the controller for the opened drawer (created if needed).

**Example**

```ts
import { openDrawer, getDrawer } from '@samline/drawer'

openDrawer('filters')
getDrawer('filters')?.getSnapshot().state.isOpen // true

openDrawer() // open the default instance
```

**Related**

- [`closeDrawer(id?)`](#closedrawerid) — close a drawer.
- [`toggleDrawer(id?)`](#toggledrawerid) — flip a drawer's open state.
- [`createDrawer(options?)`](#createdraweroptions) — for full control over the options.

#### `closeDrawer(id?)`

Close a drawer.

**Signature**

```ts
function closeDrawer(id?: string | null): VanillaDrawerController
```

**Description**

`closeDrawer` is a thin wrapper around `createDrawer({ id, open: false })`. For an unknown id it registers a closed instance with an empty host and no overlay/content. For an open id it starts the close lifecycle and returns a controller wrapper.

On a real open-to-closed transition, `onClose()` fires before state changes; then the controller updates and `onOpenChange(false)` fires. Scroll/focus/viewport effects release synchronously. Existing overlay/content flip to `data-state="closed"`, `onAnimationEnd(false)` fires from the latest-state timer after 500 ms, and the nodes are removed after the 600 ms safety timeout. With snap points, the active point resets to the first after 500 ms.

The default `id` is `'default'`. Omit the argument to close the default instance.

**Parameters**

| Name | Type             | Default     | Description                       |
| ---- | ---------------- | ----------- | --------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id to close. |

**Returns**

`VanillaDrawerController` — the controller for the closed drawer (created if needed).

**Example**

```ts
import { closeDrawer, getDrawer } from '@samline/drawer'

closeDrawer('filters')
getDrawer('filters')?.getSnapshot().state.isOpen // false

closeDrawer() // close the default instance
```

**Related**

- [`openDrawer(id?)`](#opendrawerid) — open a drawer.
- [`toggleDrawer(id?)`](#toggledrawerid) — flip a drawer's open state.
- [`destroyDrawer(id?)`](#destroydrawerid) — full teardown.

#### `toggleDrawer(id?)`

Flip a drawer's open state.

**Signature**

```ts
function toggleDrawer(id?: string | null): VanillaDrawerController
```

**Description**

`toggleDrawer` reads the current open state of the drawer, inverts it, and writes the new state. The drawer is created if it does not exist (closed by default; the first toggle opens it).

Useful for wiring a single external button to a single drawer without holding a controller reference.

The default `id` is `'default'`. Omit the argument to toggle the default instance.

**Parameters**

| Name | Type             | Default     | Description                          |
| ---- | ---------------- | ----------- | ------------------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id to toggle.   |

**Returns**

`VanillaDrawerController` — a controller facade for the toggled drawer (created if needed).

**Example**

```ts
import { toggleDrawer } from '@samline/drawer'

document.getElementById('toggle-filters')?.addEventListener('click', () => {
  toggleDrawer('filters')
})

toggleDrawer() // toggle the default instance
```

**Related**

- [`openDrawer(id?)`](#opendrawerid) — open a drawer.
- [`closeDrawer(id?)`](#closedrawerid) — close a drawer.
- [`getDrawer(id?)`](#getdrawerid) — read the current snapshot before deciding.

#### `destroyDrawer(id?)`

Destroy a single drawer and remove it from the registry.

**Signature**

```ts
function destroyDrawer(id?: string | null): void
```

**Description**

`destroyDrawer` removes the host, the optional built-in trigger, the registry entry, and any owned side effects for one id. Destroying a parent recursively destroys its registered children. Destroying an id that has not been registered is a no-op.

Unlike `closeDrawer(id)`, `destroyDrawer(id)` does not call `onClose()` first. Pending lifecycle timers (`onAnimationEnd`, post-close snap reset) for that id are cancelled. Owned side effects — scale-background transform, scroll lock, history restoration, focus restoration, Safari fixed-body helper — are released only when their final owner is destroyed.

`destroyDrawer` does not write `document.body.style.pointerEvents`. Any values the runtime writes there are app-owned.

The default `id` is `'default'`. Omit the argument to destroy the default instance.

**Parameters**

| Name | Type             | Default     | Description              |
| ---- | ---------------- | ----------- | ------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id. |

**Returns**

`void`.

**Example**

```ts
import { createDrawer, destroyDrawer, getDrawer } from '@samline/drawer'

const drawer = createDrawer({ id: 'filters', title: 'Filters' })
drawer.setOpen(true)

// Tear down the drawer.
destroyDrawer('filters')

getDrawer('filters') // null
```

**Related**

- [`destroyDrawers()`](#destroydrawers) — destroy every live drawer.
- [`closeDrawer(id?)`](#closedrawerid) — close a drawer but keep the registry entry.

#### `destroyDrawers()`

Destroy every live drawer.

**Signature**

```ts
function destroyDrawers(): void
```

**Description**

`destroyDrawers` removes the host, the optional built-in trigger, the registry entry, and any owned side effects for every registered id. The runtime iterates the live registry, so newly created drawers between calls are not affected (the recommended pattern is to call `destroyDrawers` once at the end of a session).

Each teardown reconciles against the remaining stack. Scale-background, scroll lock, history restoration, focus restoration, and the Safari fixed-body helper release only when their final owner is destroyed.

`destroyDrawers` does not call `onClose()` for any drawer. Pending lifecycle timers for every id are cancelled. The function does not write `document.body.style.pointerEvents`.

**Returns**

`void`.

**Example**

```ts
import { createDrawer, destroyDrawers } from '@samline/drawer'

createDrawer({ id: 'a', content: 'A' })
createDrawer({ id: 'b', content: 'B' })

destroyDrawers() // removes both ids
```

**Related**

- [`destroyDrawer(id?)`](#destroydrawerid) — destroy a single drawer.
- [`closeDrawer(id?)`](#closedrawerid) — close a drawer but keep the registry entry.

### Headless

#### `createDrawerController(options?)`

Create a headless controller without mounting a DOM host.

**Signature**

```ts
function createDrawerController(options?: CommonDrawerOptions): CommonDrawerController
```

**Description**

`createDrawerController` builds a `CommonDrawerController` for the supplied options. It is the headless counterpart to `createDrawer`: same observable state, same mutators, same snapshot shape, but no DOM, no built-in trigger, no scale-background, no scroll lock, no history restoration, no focus trap, no body styles.

The factory is useful for:

- **Tests** — drive the controller synchronously and assert on snapshots without a DOM environment.
- **Server-rendered contexts** — model drawer state without a browser.
- **Custom renderers** — build your own dialog primitive on top of the same observable state. Subscribe to the controller and re-render your own host when the snapshot changes.
- **Workers** — share the same `CommonDrawerOptions` surface without the runtime side effects.

`createDrawerController` does not register the id in the module-level registry and is not affected by `getDrawer` / `getDrawers` / `destroyDrawer`. It is also not affected by DOM-only options: `content`, `title`, `description`, `container`, `triggerElement`, `triggerText`, `closeButton`, and every `*ClassName` option are ignored. Pass them only when you want a single options object that can be shared with `createDrawer` later; they will not produce DOM.

**Parameters**

| Name      | Type                   | Default | Description                                                                 |
| --------- | ---------------------- | ------- | --------------------------------------------------------------------------- |
| `options` | `CommonDrawerOptions`  | `{}`    | The drawer's full state surface. See [Configuration](configuration/).      |

**Returns**

`CommonDrawerController` — the headless controller. See [TypeScript → CommonDrawerController](typescript/#commondrawercontroller).

**Example**

```ts
import { createDrawerController } from '@samline/drawer'

const controller = createDrawerController({
  id: 'filters',
  direction: 'bottom',
  defaultOpen: true,
  snapPoints: ['180px', '420px', 1]
})

controller.getSnapshot().state.isOpen // true
controller.getSnapshot().state.activeSnapPoint // '180px'

const next = controller.setActiveSnapPoint(1)
next.state.activeSnapPoint // 1

const unsubscribe = controller.subscribe((snapshot) => {
  console.log('changed:', snapshot.state.isOpen)
})

controller.setOpen(false)
unsubscribe()
```

**Related**

- [`createDrawer(options?)`](#createdraweroptions) — the DOM-aware factory.
- [TypeScript → CommonDrawerController](typescript/#commondrawercontroller).
- [Configuration → Common fields](configuration/#common-fields) — every field accepted by `createDrawerController`.
