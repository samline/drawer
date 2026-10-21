---
locale: en
title: 'getChildDrawers(id)'
description: 'Return an array of stable controllers whose parentId matches the explicit id. An absent parent yields an empty array unless children were explicitly registered with that parentId. Queries never create instances.'
sidebar:
  group: api
  order: 10
---

## Signature

```ts
function getChildDrawers(id: string): VanillaDrawerController[]
```

## Description

Returns the direct registered children of the supplied id, including closed instances. It does not recursively flatten descendants or create anything. Destroying a parent also destroys its owned descendants.

## Returns

The value shown in the signature. Reading the registry has no creation or rendering side effect.

## Example

```ts
import { createDrawer, getChildDrawers } from '@samline/drawer'

const parent = createDrawer({ id: 'filters', title: 'Filters' })
const child = createDrawer({ id: 'details', parentId: parent.id, title: 'Details' })
getChildDrawers(parent.id)[0] === child // true
parent.destroy()
```

## Related

- [Controller and registry](../../reference/controller/)
- [Lifecycle and state](../../guides/lifecycle-and-state/)
- [Version 5 changes](../../changelog/)
