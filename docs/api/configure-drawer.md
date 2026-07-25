# `configureDrawer(options?)`

Alias of [`createDrawer`](create-drawer.md). Kept for intent at the call site.

## Signature

```ts
function configureDrawer(options?: VanillaDrawerOptions): VanillaDrawerController
```

## Description

`configureDrawer` is identical to `createDrawer` in every way — same arguments, same return, same side effects. The two names are kept so the call site can express intent: `createDrawer` reads as "construct a new drawer", `configureDrawer` reads as "tune the existing one" (or "ensure a drawer with this configuration exists").

Both names hit the same module-level registry. The runtime does not track which name was used to create the drawer.

## Example

```ts
import { configureDrawer, getDrawer } from '@samline/drawer'

// Either name works; pick the one that reads better at the call site.
configureDrawer({ id: 'filters', title: 'Filters', content: 'Body' })
getDrawer('filters')?.setOpen(true)
```

## Related

- [`createDrawer(options?)`](create-drawer.md) — the canonical entrypoint.
- [`updateDrawer(idOrOptions?, options?)`](update-drawer.md) — patch options without returning a new controller.
