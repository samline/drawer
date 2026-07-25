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

`updateDrawer` accepts two calling conventions:

- `updateDrawer(options)` — the `options` object includes an `id`. Equivalent to `createDrawer(options)`.
- `updateDrawer(id, options)` — the `id` is the first argument, the partial options are the second. Equivalent to `createDrawer({ ...options, id })`.

If the drawer already exists, the new options are merged into the existing controller's options. The dialog re-renders so the new options take effect. If the drawer does not exist, the runtime creates it.

The controller returned is always the up-to-date controller for the resolved `id`.

## Parameters

| Name          | Type                                     | Default     | Description                                                            |
| ------------- | ---------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `idOrOptions` | `string \| VanillaDrawerOptions \| null` | `'default'` | The id (string) or the full options (object) for the drawer to update. |
| `options`     | `VanillaDrawerOptions`                   | `{}`        | The partial options to merge when the first argument is a string id.   |

## Returns

`VanillaDrawerController` — the controller for the updated drawer.

## Example

```ts
import { createDrawer, updateDrawer, getDrawer } from '@samline/drawer'

// Two-argument form: id first, options second.
createDrawer({ id: 'filters', title: 'Filters', content: 'Body' })
updateDrawer('filters', { activeSnapPoint: 1, direction: 'right' })

// Single-argument form: options with id inside.
updateDrawer({ id: 'filters', dismissible: false })

// Single-argument on the default instance (id is 'default').
updateDrawer({ open: true })
getDrawer()?.getSnapshot().state.isOpen // true
```

## Related

- [`createDrawer(options?)`](create-drawer.md) — the canonical entrypoint.
- [`drawer.update(options?)`](../typescript.md#vanilladrawercontroller) — the same merge on an already-held controller.
