# `destroyDrawer(id?)`

Destroy a single drawer and remove it from the registry.

## Signature

```ts
function destroyDrawer(id?: string | null): void
```

## Description

`destroyDrawer` removes the host, the optional built-in trigger, the registry entry, and any owned side effects for one id. Destroying a parent recursively destroys its registered children. Destroying an id that has not been registered is a no-op.

Unlike `closeDrawer(id)`, `destroyDrawer(id)` does not call `onClose()` first. Pending lifecycle timers (`onAnimationEnd`, post-close snap reset) for that id are cancelled. Owned side effects — scale-background transform, scroll lock, history restoration, focus restoration, Safari fixed-body helper — are released only when their final owner is destroyed.

`destroyDrawer` does not write `document.body.style.pointerEvents`. Any values the runtime writes there are app-owned.

The default `id` is `'default'`. Omit the argument to destroy the default instance.

## Parameters

| Name | Type             | Default     | Description              |
| ---- | ---------------- | ----------- | ------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id. |

## Returns

`void`.

## Example

```ts
import { createDrawer, destroyDrawer, getDrawer } from '@samline/drawer'

const drawer = createDrawer({ id: 'filters', title: 'Filters' })
drawer.setOpen(true)

// Tear down the drawer.
destroyDrawer('filters')

getDrawer('filters') // null
```

## Related

- [`destroyDrawers()`](destroy-drawers.md) — destroy every live drawer.
- [`closeDrawer(id?)`](close-drawer.md) — close a drawer but keep the registry entry.
- [Recipes → SPA / dynamic mount and unmount](../recipes.md#spa--dynamic-mount-and-unmount).
