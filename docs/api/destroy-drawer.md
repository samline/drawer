# `destroyDrawer(id?)`

Destroy a single drawer and remove it from the registry.

## Signature

```ts
function destroyDrawer(id?: string | null): void
```

## Description

`destroyDrawer` tears down the drawer's host element (if the runtime owns it), removes the drawer from the registry, and recursively destroys any children (drawers whose `parentId` matches the destroyed id).

Body scroll is released if the destroyed drawer held the lock. The `data-drawer-wrapper` page shell is reset to its normal state. `window.history.scrollRestoration` is restored to its previous value if the destroyed drawer had `preventScrollRestoration: true`.

After `destroyDrawer`, `getDrawer(id)` returns `null` and the id is free to be reused by a future `createDrawer` call.

The default `id` is `'default'`. Omit the argument to destroy the default instance.

## Parameters

| Name | Type             | Default     | Description                         |
| ---- | ---------------- | ----------- | ----------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id to destroy. |

## Returns

`void` — the function is fire-and-forget. There is no signal back from the destroy; the next `getDrawer(id)` will return `null` if the destroy succeeded.

## Example

```ts
import { createDrawer, destroyDrawer, getDrawer } from '@samline/drawer'

createDrawer({ id: 'filters', title: 'Filters', content: 'Body' })
getDrawer('filters') // <controller>
destroyDrawer('filters')
getDrawer('filters') // null
```

## Related

- [`destroyDrawers()`](destroy-drawers.md) — destroy every live drawer.
- [`drawer.destroy()`](../typescript.md#vanilladrawercontroller) — the same teardown on an already-held controller.
