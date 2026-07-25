# `toggleDrawer(id?)`

Flip a drawer's open state.

## Signature

```ts
function toggleDrawer(id?: string | null): VanillaDrawerController
```

## Description

`toggleDrawer` reads the current open state of the drawer, inverts it, and writes the new state. The drawer is created if it does not exist (closed by default; the first toggle opens it).

Useful for wiring a single external button to a single drawer without holding a controller reference.

The default `id` is `'default'`. Omit the argument to toggle the default instance.

## Parameters

| Name | Type             | Default     | Description                        |
| ---- | ---------------- | ----------- | ---------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id to toggle. |

## Returns

`VanillaDrawerController` — the controller for the toggled drawer (created if needed).

## Example

```ts
import { toggleDrawer, getDrawer } from '@samline/drawer'

toggleDrawer('filters')
getDrawer('filters')?.getSnapshot().state.isOpen // true
toggleDrawer('filters')
getDrawer('filters')?.getSnapshot().state.isOpen // false

toggleDrawer() // toggle the default instance
```

## Related

- [`openDrawer(id?)`](open-drawer.md) — open a drawer.
- [`closeDrawer(id?)`](close-drawer.md) — close a drawer.
