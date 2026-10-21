---
locale: en
title: 'getParentDrawer(id)'
description: 'Return the stable controller for the registered parent, or null when the child or parent is absent. This query does not create or open any instance.'
sidebar:
  group: api
  order: 9
---

## Signature

```ts
function getParentDrawer(id: string): VanillaDrawerController | null
```

## Description

Nesting is declared with `parentId`. This query returns its registered parent, or `null` when there is no registered parent. It never creates or opens a drawer.

## Returns

The value shown in the signature. Reading the registry has no creation or rendering side effect.

## Example

```ts
import { createDrawer, getParentDrawer } from '@samline/drawer'

const parent = createDrawer({ id: 'filters', title: 'Filters' })
const child = createDrawer({ id: 'details', parentId: parent.id, title: 'Details' })
getParentDrawer(child.id) === parent // true
parent.destroy() // also destroys descendants
```

## Related

- [Controller and registry](../../reference/controller/)
- [Lifecycle and state](../../guides/lifecycle-and-state/)
- [Version 5 changes](../../changelog/)
