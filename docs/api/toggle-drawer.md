# `toggleDrawer(id?)`

Flip a drawer's open state.

## Signature

```ts
function toggleDrawer(id?: string | null): VanillaDrawerController
```

## Description

`toggleDrawer` reads the current snapshot for the id and calls `setOpen` with the opposite value. If the drawer is currently open, it closes; if it is currently closed (or has not been created), it opens. The new controller is returned.

`toggleDrawer` is convenient for click handlers that should do "the right thing" without inspecting state first. For more control, read the snapshot with `getDrawer(id)?.getSnapshot().state.isOpen` and call `setOpen` directly.

The default `id` is `'default'`. Omit the argument to toggle the default instance.

## Parameters

| Name | Type             | Default     | Description                          |
| ---- | ---------------- | ----------- | ------------------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id to toggle.   |

## Returns

`VanillaDrawerController` — a controller facade for the toggled drawer (created if needed).

## Example

```ts
import { toggleDrawer } from '@samline/drawer'

document.getElementById('toggle-filters')?.addEventListener('click', () => {
  toggleDrawer('filters')
})

toggleDrawer() // toggle the default instance
```

## Related

- [`openDrawer(id?)`](open-drawer.md) — open a drawer.
- [`closeDrawer(id?)`](close-drawer.md) — close a drawer.
- [`getDrawer(id?)`](get-drawer.md) — read the current snapshot before deciding.
