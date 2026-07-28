# `getDrawer(id?)`

Return the controller for a drawer, or `null` if it has not been created.

## Signature

```ts
function getDrawer(id?: string | null): VanillaDrawerController | null
```

## Description

`getDrawer` is a read-only inspector. It does not create a drawer — if the id has not been registered, the function returns `null`. The returned wrapper targets the same underlying instance but is not guaranteed to have object identity with a wrapper returned earlier.

Use `getDrawer` to:

- Read the current snapshot (`getSnapshot()`).
- Subscribe to state changes (`subscribe()`).
- Update the drawer (`update()`) without first reaching for `createDrawer`.
- Destroy the drawer (`destroy()`).

The default `id` is `'default'`. Omit the argument to inspect the default instance.

## Parameters

| Name | Type             | Default     | Description              |
| ---- | ---------------- | ----------- | ------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id. |

## Returns

`VanillaDrawerController | null` — a controller facade for the id, or `null` if it has not been registered.

## Example

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

## Related

- [`getDrawers()`](get-drawers.md) — return every live drawer.
- [`createDrawer(options?)`](create-drawer.md) — create or update a drawer.
- [`destroyDrawer(id?)`](destroy-drawer.md) — remove a drawer from the registry.
