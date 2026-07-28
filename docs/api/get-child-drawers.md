# `getChildDrawers(id?)`

Return the children of a nested drawer.

## Signature

```ts
function getChildDrawers(id?: string | null): VanillaDrawerController[]
```

## Description

`getChildDrawers` walks the registry and returns every live drawer whose `parentId` matches the given `id`, in registry insertion order. The parent itself does not need to be live; the relationship is read from each child's current options. Returns an empty array when no child matches.

The default `id` is `'default'`. Omit the argument to inspect the children of the default instance.

## Parameters

| Name | Type             | Default     | Description                                      |
| ---- | ---------------- | ----------- | ------------------------------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id whose children you want. |

## Returns

`VanillaDrawerController[]` — the live children controllers in insertion order. The array is freshly allocated on every call; mutating it does not affect the registry.

## Example

```ts
import { createDrawer, getChildDrawers, getParentDrawer } from '@samline/drawer'

createDrawer({ id: 'parent', title: 'Parent', content: 'Primary' })
createDrawer({ id: 'child-a', parentId: 'parent', title: 'A', content: 'A' })
createDrawer({ id: 'child-b', parentId: 'parent', title: 'B', content: 'B' })

getChildDrawers('parent').map((d) => d.id) // ['child-a', 'child-b']
getChildDrawers('parent').map((d) => getParentDrawer(d.id)?.id) // ['parent', 'parent']
```

## Related

- [`getParentDrawer(id?)`](get-parent-drawer.md) — return the parent of a nested drawer.
- [`destroyDrawer(id?)`](destroy-drawer.md) — destroying a parent recursively destroys its children.
