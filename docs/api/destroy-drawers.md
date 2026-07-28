# `destroyDrawers()`

Destroy every live drawer.

## Signature

```ts
function destroyDrawers(): void
```

## Description

`destroyDrawers` removes the host, the optional built-in trigger, the registry entry, and any owned side effects for every registered id. The runtime iterates the live registry, so newly created drawers between calls are not affected (the recommended pattern is to call `destroyDrawers` once at the end of a session).

Each teardown reconciles against the remaining stack. Scale-background, scroll lock, history restoration, focus restoration, and the Safari fixed-body helper release only when their final owner is destroyed.

`destroyDrawers` does not call `onClose()` for any drawer. Pending lifecycle timers for every id are cancelled. The function does not write `document.body.style.pointerEvents`.

## Returns

`void`.

## Example

```ts
import { createDrawer, destroyDrawers } from '@samline/drawer'

createDrawer({ id: 'a', content: 'A' })
createDrawer({ id: 'b', content: 'B' })

destroyDrawers() // removes both ids
```

## Related

- [`destroyDrawer(id?)`](destroy-drawer.md) — destroy a single drawer.
- [`closeDrawer(id?)`](close-drawer.md) — close a drawer but keep the registry entry.
- [Recipes → SPA / dynamic mount and unmount](../recipes.md#spa--dynamic-mount-and-unmount).
