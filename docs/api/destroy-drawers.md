# `destroyDrawers()`

Destroy every live drawer.

## Signature

```ts
function destroyDrawers(): void
```

## Description

`destroyDrawers` snapshots registry ids in insertion order and calls `destroyDrawer` for each. Each call recursively destroys that drawer's current descendants first; ids already removed by a parent's recursive teardown become no-ops later in the snapshot. There is no separate global reverse-creation ordering. After the call, the registry is empty.

Each drawer removes only its dedicated host, so consumer-owned custom containers remain. Reference-counted scroll, focus, history, Safari, and scale-background ownership is released per drawer; original shared styles are restored after the final owner is gone. Destroy remains immediate and does not run close exits.

Useful for "close everything" hooks (navigation, logout, route change) without enumerating the ids yourself. Pair with `getDrawers()` if you need to inspect before tearing down.

## Returns

`void` — the function is fire-and-forget. After the call, `getDrawers()` returns `{}`.

## Example

```ts
import { destroyDrawers, getDrawers } from '@samline/drawer'

console.log(Object.keys(getDrawers())) // ['a', 'b', 'c']
destroyDrawers()
console.log(Object.keys(getDrawers())) // []
```

## Related

- [`destroyDrawer(id?)`](destroy-drawer.md) — destroy a single drawer.
- [`getDrawers()`](get-drawers.md) — read the live drawers.
