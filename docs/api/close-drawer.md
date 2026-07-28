# `closeDrawer(id?)`

Close a drawer.

## Signature

```ts
function closeDrawer(id?: string | null): VanillaDrawerController
```

## Description

`closeDrawer` is a thin wrapper around `createDrawer({ id, open: false })`. It creates the drawer if it does not exist (closed by default), or merges `{ open: false }` into the existing options, and returns the controller.

Closing an open drawer freezes its current computed or inline transform, changes its overlay and content to `data-state="closed"`, and animates from that visible position to the directional closed endpoint. This applies during entrance, at a snap point, and after a drag, so the drawer does not jump back to fully open before exiting. Visual nodes are removed after the 500 ms transition plus a 100 ms safety window; the host and optional trigger remain.

Listeners, focus, and shared page-effect ownership are released when close begins. Another open drawer keeps any scroll lock, `html` scroll behavior, history restoration, Safari positioning, or scale state it still owns. `document.body.style.pointerEvents` is never changed.

Closing a parent also closes its registered descendants. Closing a child leaves its parent open. `onClose()` fires before the state change, and `onAnimationEnd(false)` fires after 500 ms unless a newer transition cancels it.

The default `id` is `'default'`. Omit the argument to close the default instance.

## Parameters

| Name | Type             | Default     | Description                       |
| ---- | ---------------- | ----------- | --------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id to close. |

## Returns

`VanillaDrawerController` — a controller facade for the closed drawer (created if needed). For a previously unknown id, only the dedicated host is mounted; there is no hidden overlay or content.

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
