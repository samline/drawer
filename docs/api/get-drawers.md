# `getDrawers()`

Return every live drawer keyed by id.

## Signature

```ts
function getDrawers(): Record<string, VanillaDrawerController>
```

## Description

`getDrawers` is a read-only inspector. It returns a fresh plain object with one entry per live drawer instance, keyed by `id`. The returned controllers are the same references the registry holds; calling methods on them is the same as calling them on the controllers returned by `createDrawer`.

Use it to enumerate every drawer (for example, to close them all on a navigation event) without keeping your own map.

## Returns

`Record<string, VanillaDrawerController>` — a plain object with one entry per live drawer. The object is freshly allocated on every call; mutations to the object do not affect the registry.

## Example

```ts
import { getDrawers } from '@samline/drawer'

for (const [id, drawer] of Object.entries(getDrawers())) {
  console.log(id, drawer.getSnapshot().state.isOpen)
}

// Close every drawer at once (use destroyDrawers for the full teardown).
for (const drawer of Object.values(getDrawers())) {
  drawer.setOpen(false)
}
```

## Related

- [`getDrawer(id?)`](get-drawer.md) — return a single controller.
- [`destroyDrawers()`](destroy-drawers.md) — full teardown.
