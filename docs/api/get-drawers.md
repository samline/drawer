# `getDrawers()`

Return every live drawer keyed by id.

## Signature

```ts
function getDrawers(): Record<string, VanillaDrawerController>
```

## Description

`getDrawers` is a read-only inspector. It returns a fresh object whose keys are the registered ids and whose values are controller facades. Adding or removing ids after the call does not mutate the returned object.

The returned facades target the same underlying instances but are not guaranteed to have object identity with each other or with wrappers from `createDrawer` / `getDrawer` / `updateDrawer`.

## Returns

`Record<string, VanillaDrawerController>` — every live drawer keyed by id. The object is a snapshot; later `createDrawer` / `destroyDrawer` calls do not mutate it.

## Example

```ts
import { createDrawer, getDrawers, destroyDrawers } from '@samline/drawer'

createDrawer({ id: 'a', content: 'A' })
createDrawer({ id: 'b', content: 'B' })

const live = getDrawers()
console.log(Object.keys(live)) // ['a', 'b']

live.a.setOpen(true)
live.b.setOpen(true)

destroyDrawers()

// The previously returned object still resolves through `setOpen` /
// `getSnapshot` calls on each facade, but the registry is empty:
// a fresh `getDrawers()` returns `{}`.
getDrawers() // {}
```

## Related

- [`getDrawer(id?)`](get-drawer.md) — return a single controller by id.
- [`createDrawer(options?)`](create-drawer.md) — create or update a drawer.
- [`destroyDrawers()`](destroy-drawers.md) — clear the registry.
