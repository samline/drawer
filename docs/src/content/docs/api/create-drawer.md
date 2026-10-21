---
locale: en
title: 'createDrawer(options?)'
description: 'Create one independent drawer. Omitting id allocates a unique id; duplicate explicit ids throw. Keep the returned controller and call update() for later changes.'
sidebar:
  group: api
  order: 1
---

## Signature

```ts
function createDrawer(options?: VanillaDrawerOptions): VanillaDrawerController
```

## Description

Creation registers one owned instance. Pass `open: true` to start visible, or use its trigger or `setOpen(true)` later. Keep the returned controller for updates and cleanup. A failed initial content factory rolls back registration and partial DOM.

## Returns

An owned controller; see its methods and terminal disposal contract.

## Example

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({ title: 'Filters', content: 'Choose your filters' })
drawer.setOpen(true)
drawer.update({ content: 'Ready to apply' })
drawer.destroy()
```

## Related

- [Controller and registry](../../reference/controller/)
- [Lifecycle and state](../../guides/lifecycle-and-state/)
- [Version 5 changes](../../changelog/)
