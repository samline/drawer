---
locale: en
title: 'getDrawer(id)'
description: 'Look up an explicit id without creating anything. Returns the stable registered controller or null. Repeated reads return the same object until it is destroyed.'
sidebar:
  group: api
  order: 7
---

## Signature

```ts
function getDrawer(id: string): VanillaDrawerController | null
```

## Description

Pass the id chosen at creation. Missing ids return `null`; this lookup has no mount, focus or scroll side effects. Use optional chaining when the instance may already have been destroyed.

## Returns

The value shown in the signature. Reading the registry has no creation or rendering side effect.

## Example

```ts
import { createDrawer, getDrawer } from '@samline/drawer'

const drawer = createDrawer({ id: 'filters', title: 'Filters' })
getDrawer('filters') === drawer // true
getDrawer('missing') // null
drawer.destroy()
getDrawer('filters') // null
```

## Related

- [Controller and registry](../../reference/controller/)
- [Lifecycle and state](../../guides/lifecycle-and-state/)
- [Version 5 changes](../../changelog/)
