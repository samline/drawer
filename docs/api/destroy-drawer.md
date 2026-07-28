# `destroyDrawer(id?)`

Destroy a single drawer and remove it from the registry.

## Signature

```ts
function destroyDrawer(id?: string | null): void
```

## Description

`destroyDrawer` immediately tears down the drawer's dedicated host, removes the drawer from the registry, and recursively destroys any children whose `parentId` matches the destroyed id. Destroy is immediate teardown, not a close transition: it does not keep exit nodes mounted or initiate open/close lifecycle callbacks.

For a custom `container`, only the per-drawer host is removed. The consumer-owned container and hosts belonging to other drawer ids remain intact.

Focus and page effects are ownership-aware. Destroy releases only this drawer's body-scroll, `html` scroll-behavior, history restoration, Safari body-position, and scale-background ownership. Shared styles are restored only after the final owner releases them; when the newest scale owner is destroyed, the previous owner's state is reapplied. The runtime does not own `document.body.style.pointerEvents`.

After `destroyDrawer`, `getDrawer(id)` returns `null` and the id is free to be reused by a future `createDrawer` call.

The default `id` is `'default'`. Omit the argument to destroy the default instance.

## Parameters

| Name | Type             | Default     | Description                         |
| ---- | ---------------- | ----------- | ----------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id to destroy. |

## Returns

`void` — the function is fire-and-forget. Destroying an unknown id is a no-op; after a live instance is destroyed, `getDrawer(id)` returns `null`.

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
