# `createDrawer(options?)`

Create a named drawer instance, or update an existing one when the same `id` is reused. Returns the controller.

## Signature

```ts
function createDrawer(options?: VanillaDrawerOptions): VanillaDrawerController
```

## Description

`createDrawer` is the canonical entrypoint. It writes the options into the module-level registry, mounts the host element (`<div data-drawer-vanilla-root>`) and the dialog (overlay + content + optional handle + optional built-in trigger) when `open: true`, and returns a `VanillaDrawerController` that exposes the imperative API.

Reusing the same `id` is an update, not a second mount — the existing host is updated in place. The controller returned by `createDrawer` is always the up-to-date controller for that `id`.

The default `id` is `'default'`. Omit `id` to use the default instance.

## Parameters

| Name      | Type                   | Default | Description                                                              |
| --------- | ---------------------- | ------- | ------------------------------------------------------------------------ |
| `options` | `VanillaDrawerOptions` | `{}`    | The drawer's full options surface. See [docs/options.md](../options.md). |

## Returns

`VanillaDrawerController` — the controller for the created or updated drawer. See [docs/typescript.md](../typescript.md#vanilladrawercontroller).

## Example

```ts
import { createDrawer, destroyDrawers } from '@samline/drawer'
import '@samline/drawer/styles.css'

const drawer = createDrawer({
  id: 'filters',
  direction: 'bottom',
  title: 'Filters',
  content: 'Drawer body',
  showHandle: true,
  snapPoints: ['120px', '320px', 1]
})

drawer.setOpen(true)

// ... user interacts ...

destroyDrawers()
```

## Related

- [`configureDrawer(options?)`](configure-drawer.md) — alias.
- [`updateDrawer(idOrOptions?, options?)`](update-drawer.md) — patch an existing drawer's options.
- [`destroyDrawer(id?)`](destroy-drawer.md) — tear down a single drawer.
- [`destroyDrawers()`](destroy-drawers.md) — tear down every live drawer.
