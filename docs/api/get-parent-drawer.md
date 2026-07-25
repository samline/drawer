# `getParentDrawer(id?)`

Return the parent of a nested drawer, or `null` for top-level drawers.

## Signature

```ts
function getParentDrawer(id?: string | null): VanillaDrawerController | null
```

## Description

`getParentDrawer` walks the registry by `id`, reads the drawer's `parentId`, and returns the controller for that parent. Returns `null` if the drawer has no parent, if the parent is not in the registry, or if the drawer itself is not in the registry.

Useful for driving a child's lifecycle from the parent's lifecycle (close / open in lockstep) without threading references.

The default `id` is `'default'`. Omit the argument to inspect the parent of the default instance.

## Parameters

| Name | Type             | Default     | Description                                    |
| ---- | ---------------- | ----------- | ---------------------------------------------- |
| `id` | `string \| null` | `'default'` | The runtime instance id whose parent you want. |

## Returns

`VanillaDrawerController | null` — the parent's controller, or `null` if there is no parent or the parent is not live.

## Example

```ts
import { createDrawer, getParentDrawer, getChildDrawers } from '@samline/drawer'

createDrawer({ id: 'parent', title: 'Parent', content: 'Primary' })
createDrawer({ id: 'child', parentId: 'parent', title: 'Child', content: 'Nested' })

getParentDrawer('child')?.id // 'parent'
getParentDrawer('parent') // null
```

## Related

- [`getChildDrawers(id?)`](get-child-drawers.md) — return the children of a nested drawer.
- [`getDrawer(id?)`](get-drawer.md) — return the controller for a single drawer.
