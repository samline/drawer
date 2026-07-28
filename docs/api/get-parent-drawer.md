# `getParentDrawer(id?)`

Return the parent of a nested drawer, or `null` for top-level drawers.

## Signature

```ts
function getParentDrawer(id?: string | null): VanillaDrawerController | null
```

## Description

`getParentDrawer` resolves the parent of a nested drawer by looking up the `parentId` option against the live registry. It returns `null` when:

- The id has not been registered.
- The id has no `parentId` option.
- The id has a `parentId` that does not match a registered drawer.

The default `id` is `'default'`. Omit the argument to inspect the default instance.

Use this helper to walk the nested hierarchy from the child upward.

## Parameters

| Name | Type             | Default     | Description              |
| ---- | ---------------- | ----------- | ------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id. |

## Returns

`VanillaDrawerController | null` — a controller facade for the parent, or `null` when there is none.

## Example

```ts
import { createDrawer, getParentDrawer } from '@samline/drawer'

createDrawer({ id: 'account', title: 'Account' })
createDrawer({ id: 'security', parentId: 'account', title: 'Security' })

getParentDrawer('security')?.id // 'account'
getParentDrawer('account') // null — top-level drawer
getParentDrawer('missing') // null — id not registered
```

## Related

- [`getChildDrawers(id?)`](get-child-drawers.md) — return the children of a drawer.
- [Recipes → Nested drawers](../recipes.md#nested-drawers).
