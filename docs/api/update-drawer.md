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

If the drawer already exists, the new options are merged into its current options and the host is reconciled. Closed drawers still contain only their host and optional trigger. Open drawers update or remount their visual nodes as needed without changing their open order.

Changing `open` follows the same presence and ownership behavior as [`openDrawer`](open-drawer.md) or [`closeDrawer`](close-drawer.md). Changing `container` moves this drawer to a new dedicated host in that target and removes only its old host; consumer-owned containers and sibling drawer hosts are preserved. `mountElement` is the deprecated fallback when `container` is not supplied.

If the drawer does not exist, the runtime creates it. The default is closed unless the merged options request `open: true` or `defaultOpen: true`.

The returned facade is bound to the resolved id and reads the current runtime state. Do not rely on controller object identity across helper calls.

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
