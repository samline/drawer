# `openDrawer(id?)`

Open a drawer.

## Signature

```ts
function openDrawer(id?: string | null): VanillaDrawerController
```

## Description

`openDrawer` is a thin wrapper around `createDrawer({ id, open: true })`. It creates the drawer if it does not exist, or merges `{ open: true }` into the existing options, and returns the controller.

The default `id` is `'default'`. Omit the argument to open the default instance.

## Parameters

| Name | Type             | Default     | Description                      |
| ---- | ---------------- | ----------- | -------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id to open. |

## Returns

`VanillaDrawerController` — the controller for the opened drawer (created if needed).

## Example

```ts
import { openDrawer, getDrawer } from '@samline/drawer'

openDrawer('filters')
getDrawer('filters')?.getSnapshot().state.isOpen // true

openDrawer() // open the default instance
```

## Related

- [`closeDrawer(id?)`](close-drawer.md) — close a drawer.
- [`toggleDrawer(id?)`](toggle-drawer.md) — flip a drawer's open state.
- [`createDrawer(options?)`](create-drawer.md) — for full control over the options.
