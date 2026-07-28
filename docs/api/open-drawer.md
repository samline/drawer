# `openDrawer(id?)`

Open a drawer.

## Signature

```ts
function openDrawer(id?: string | null): VanillaDrawerController
```

## Description

`openDrawer` is a thin wrapper around `createDrawer({ id, open: true })`. It creates the drawer if it does not exist, or merges `{ open: true }` into the existing options, and returns the controller.

For an existing closed drawer, opening mounts its overlay and content and runs the entrance animation. A newly created drawer is initially open and skips that entrance animation. Opening a nested drawer first opens its registered ancestor chain, then places the child above those ancestors in open order.

Open order changes only on a closed-to-open transition. Calling `openDrawer` for an already-open drawer or updating/remounting it does not promote it above a drawer opened later. The most recently opened drawer is the Escape target; among scale-enabled drawers, the most recently opened owner controls shared scale-background state.

An open modal acquires scroll-prevention and related page-style ownership unless its options opt out. Ownership is reference-counted across drawers, and the runtime never writes `document.body.style.pointerEvents`. Auto-focus remains off unless the drawer was configured with `autoFocus: true`.

The default `id` is `'default'`. Omit the argument to open the default instance.

## Parameters

| Name | Type             | Default     | Description                      |
| ---- | ---------------- | ----------- | -------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id to open. |

## Returns

`VanillaDrawerController` — a controller facade for the opened drawer (created if needed).

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
