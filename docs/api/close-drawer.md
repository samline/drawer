# `closeDrawer(id?)`

Close a drawer.

## Signature

```ts
function closeDrawer(id?: string | null): VanillaDrawerController
```

## Description

`closeDrawer` is a thin wrapper around `drawer.setOpen(false)`. It creates the drawer if it does not exist (in the closed state) or merges `{ open: false }` into the existing options, and returns the controller.

For an open drawer, closing flips the visual nodes to `data-state="closed"`, releases shared scroll / focus / viewport effects immediately, and removes overlay and content after the exit transition. The registry entry, host, and optional built-in trigger remain. The runtime fires `onClose()` before the state change and `onAnimationEnd(false)` 500 ms later, unless a newer transition supersedes the timer.

Closing a parent closes its registered children. Closing a child leaves its parent open. Closing a drawer with `dismissible: false` is allowed — programmatic methods and the optional built-in close button can still close it; only user-driven dismissal (Escape, overlay release, drag-close, last-snap handle cycle) is blocked.

The default `id` is `'default'`. Omit the argument to close the default instance.

## Parameters

| Name | Type             | Default     | Description                       |
| ---- | ---------------- | ----------- | --------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id to close. |

## Returns

`VanillaDrawerController` — a controller facade for the closed drawer (created if needed).

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
- [`destroyDrawer(id?)`](destroy-drawer.md) — remove the drawer from the registry.
