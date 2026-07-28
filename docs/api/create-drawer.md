# `createDrawer(options?)`

Create a named drawer instance, or update an existing one when the same `id` is reused. Returns the controller.

## Signature

```ts
function createDrawer(options?: VanillaDrawerOptions): VanillaDrawerController
```

## Description

`createDrawer` is the canonical entrypoint. It writes the options into the module-level registry and immediately mounts a dedicated host (`<div data-drawer-vanilla-root="id">`) in `document.body` or the preferred `container`. An optional built-in trigger also mounts immediately.

Overlay, dialog content, handle, and content slots use lazy presence. They are absent while initially closed, mount on open, remain temporarily with `data-state="closed"` during exit, and are then removed. The host and optional trigger remain until destroy. `open: true` or `defaultOpen: true` mounts the dialog immediately without an entrance animation.

Reusing the same `id` is an update, not a second mount. The host is reused while its mount target is unchanged, and an existing controller facade continues to resolve the current runtime state for that id. Distinct ids always receive distinct hosts, including when they share one custom container.

The default `id` is `'default'`. Omit `id` to use the default instance.

## Parameters

| Name      | Type                   | Default | Description                                                              |
| --------- | ---------------------- | ------- | ------------------------------------------------------------------------ |
| `options` | `VanillaDrawerOptions` | `{}`    | The drawer's full options surface. See [docs/options.md](../options.md). |

## Returns

`VanillaDrawerController` — the controller for the created or updated drawer. See [docs/typescript.md](../typescript.md#vanilladrawercontroller).

The controller is bound by id rather than by object identity. Calls such as `createDrawer`, `getDrawer`, and `updateDrawer` may return different facade objects for the same live instance.

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
- [Options](../options.md) — every field with defaults and examples.
- [Recipes → Custom HTML content](../recipes.md#custom-html-content) — string / element / thunk patterns for `content`.
