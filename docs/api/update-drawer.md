# `updateDrawer(idOrOptions?, options?)`

Merge new options into an existing drawer.

## Signature

```ts
function updateDrawer(
  idOrOptions?: string | VanillaDrawerOptions | null,
  options?: VanillaDrawerOptions
): VanillaDrawerController
```

## Description

`updateDrawer` accepts the new options in two ways:

- `updateDrawer(options)` — shorthand for `updateDrawer(undefined, options)`. Updates the default instance.
- `updateDrawer(id, options)` — updates the drawer for that id.
- `updateDrawer()` — no-op on the default instance.

If the id is not registered, `updateDrawer` is equivalent to `createDrawer` and creates a new drawer. If the id is already registered, the new options are shallow-merged into the existing options and the dialog subtree is reconciled. Closed drawers reconcile the host, the optional built-in trigger, and their presence model. Open drawers reconcile the dialog content (including the body slot, the title slot, the description slot, and the close button) and may rebuild the open subtree when the renderable slots change.

The function always returns a controller facade for the affected id. The facade is bound by id; object identity is not preserved across calls.

The default `id` is `'default'`. Omit the id to update the default instance.

## Parameters

| Name           | Type                              | Default     | Description                                                                                  |
| -------------- | --------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `idOrOptions?` | `string \| VanillaDrawerOptions \| null` | `undefined` | Either the drawer id (with `options` in the second argument) or the full options object. |
| `options?`     | `VanillaDrawerOptions`            | `undefined` | The options to merge. Only used when `idOrOptions` is a string id.                           |

## Returns

`VanillaDrawerController` — a controller facade for the created or updated drawer.

## Example

```ts
import { updateDrawer, getDrawer } from '@samline/drawer'

// Update the default instance.
updateDrawer({ activeSnapPoint: '420px' })

// Update a named instance by id.
updateDrawer('filters', { title: 'Filters', content: 'Body' })

// Use the return value to read state immediately.
const next = updateDrawer('filters', { activeSnapPoint: 1 })
next.getSnapshot().state.activeSnapPoint // 1

// Equivalent via the controller.
getDrawer('filters')?.update({ activeSnapPoint: 1 })
```

## Related

- [`createDrawer(options?)`](create-drawer.md) — the canonical factory.
- [`configureDrawer(options?)`](configure-drawer.md) — alias of `createDrawer`.
- [`getDrawer(id?)`](get-drawer.md) — read the controller for an id.
