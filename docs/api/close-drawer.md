# `closeDrawer(id?)`

Close a drawer.

## Signature

```ts
function closeDrawer(id?: string | null): VanillaDrawerController
```

## Description

`closeDrawer` is a thin wrapper around `createDrawer({ id, open: false })`. It creates the drawer if it does not exist (closed by default), or merges `{ open: false }` into the existing options, and returns the controller.

The dialog re-renders with `data-state="closed"` and the CSS close animation runs. `onClose()` fires at the start of the close, `onAnimationEnd(false)` fires after `TRANSITIONS.DURATION` (500 ms by default).

The default `id` is `'default'`. Omit the argument to close the default instance.

## Parameters

| Name | Type             | Default     | Description                       |
| ---- | ---------------- | ----------- | --------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id to close. |

## Returns

`VanillaDrawerController` — the controller for the closed drawer (created if needed).

## Example

```ts
import { closeDrawer, getDrawer } from '@samline/drawer'

closeDrawer('filters')
getDrawer('filters')?.getSnapshot().state.isOpen // false

closeDrawer() // close the default instance
```

## Related

- [`openDrawer(id?)`](open-drawer.md) — open a drawer.
- [`toggleDrawer(id?)`](toggle-drawer.md) — flip a drawer's open state.
- [`destroyDrawer(id?)`](destroy-drawer.md) — full teardown.
