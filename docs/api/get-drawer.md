# `getDrawer(id?)`

Return the controller for a drawer, or `null` if it has not been created.

## Signature

```ts
function getDrawer(id?: string | null): VanillaDrawerController | null
```

## Description

`getDrawer` is a read-only inspector. It does not create a drawer — if the id has not been created, the function returns `null`. Use it to look up a controller from a non-React consumer (event handlers, route guards, promise resolvers) without having to thread the controller reference around.

The default `id` is `'default'`. Omit the argument to inspect the default instance.

## Parameters

| Name | Type             | Default     | Description              |
| ---- | ---------------- | ----------- | ------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id. |

## Returns

`VanillaDrawerController | null` — the controller for the live instance, or `null` if the drawer has not been created (or has been destroyed).

## Example

```ts
import { getDrawer } from '@samline/drawer'

const drawer = getDrawer('filters')
if (drawer) {
  drawer.setOpen(true)
}

// The default instance:
const fallback = getDrawer() // same as getDrawer('default')
```

## Related

- [`getDrawers()`](get-drawers.md) — return every live drawer keyed by id.
- [`getParentDrawer(id?)`](get-parent-drawer.md) — return the parent of a nested drawer.
- [`getChildDrawers(id?)`](get-child-drawers.md) — return the children of a nested drawer.
