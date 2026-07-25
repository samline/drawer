# `destroyDrawers()`

Destroy every live drawer.

## Signature

```ts
function destroyDrawers(): void
```

## Description

`destroyDrawers` is a bulk teardown. It iterates the registry in insertion order and calls `destroyDrawer` for each. The order is the reverse of the creation order, so a parent is destroyed after its children. After the call, the registry is empty.

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
