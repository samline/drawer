---
locale: en
title: 'getDrawers()'
description: 'Return a fresh object keyed by registered ids. Each value is the exact controller originally returned by createDrawer. The object keys are a snapshot; controllers remain the live owned instances.'
sidebar:
  group: api
  order: 8
---

## Signature

```ts
function getDrawers(): Record<string, VanillaDrawerController>
```

## Description

The returned object is a snapshot of registry keys. Its values are live, stable controllers; later creation or removal does not change the earlier object’s keys. Prefer an owned controller for ordinary component work.

## Returns

The value shown in the signature. Reading the registry has no creation or rendering side effect.

## Example

```ts
import { createDrawer, getDrawers } from '@samline/drawer'

const drawer = createDrawer({ id: 'filters', title: 'Filters' })
const all = getDrawers()
all.filters === drawer // true
drawer.destroy()
getDrawers() // {}
// all still has its old key, but its controller is terminal.
```

## Related

- [Controller and registry](../../reference/controller/)
- [Lifecycle and state](../../guides/lifecycle-and-state/)
- [Version 5 changes](../../changelog/)
