# `getChildDrawers(id?)`

Return the children of a nested drawer.

## Signature

```ts
function getChildDrawers(id?: string | null): VanillaDrawerController[]
```

## Description

`getChildDrawers` resolves the children of a drawer by scanning the live registry for instances whose `parentId` matches the queried id. It returns an empty array when:

- The id has not been registered.
- The id has no registered children.

The default `id` is `'default'`. Omit the argument to inspect the default instance.

The returned array is a fresh snapshot. Adding or removing children after the call does not mutate the array.

## Parameters

| Name | Type             | Default     | Description              |
| ---- | ---------------- | ----------- | ------------------------ |
| `id` | `string \| null` | `'default'` | The runtime instance id. |

## Returns

`VanillaDrawerController[]` — controller facades for the direct children, or `[]` when there are none.

## Example

```ts
import { createDrawer, getChildDrawers } from '@samline/drawer'

createDrawer({ id: 'account', title: 'Account' })
createDrawer({ id: 'security', parentId: 'account', title: 'Security' })
createDrawer({ id: 'billing', parentId: 'account', title: 'Billing' })
createDrawer({ id: 'free', parentId: 'security', title: 'Free' })

getChildDrawers('account').map((d) => d.id) // ['security', 'billing']
getChildDrawers('security').map((d) => d.id) // ['free']
getChildDrawers('free') // []
getChildDrawers('missing') // []
```

## Related

- [`getParentDrawer(id?)`](get-parent-drawer.md) — return the parent of a drawer.
- [Recipes → Nested drawers](../recipes.md#nested-drawers).
