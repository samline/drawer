---
locale: en
title: 'createDrawerController(options?)'
description: 'Create state without registry, DOM, focus, scroll locking or gestures. Keep its controller and explicitly dispose subscriptions/state when its owner leaves. Use createDrawer for a working browser dialog.'
sidebar:
  group: api
  order: 13
---

## Signature

```ts
function createDrawerController(options?: CommonDrawerOptions): CommonDrawerController
```

## Description

This advanced factory owns observable state only. It does not register an id or render a dialog. Supply your own renderer and effects, unsubscribe listeners on teardown and call `destroy()` when its owner leaves.

## Returns

An owned controller; see its methods and terminal disposal contract.

## Example

```ts
import { createDrawerController } from '@samline/drawer'

const state = createDrawerController({ direction: 'right' })
const unsubscribe = state.subscribe(snapshot => console.log(snapshot.state.isOpen))
state.setOpen(true)
state.update({ modal: false })
unsubscribe()
state.destroy()
```

## Related

- [Controller and registry](../../reference/controller/)
- [Lifecycle and state](../../guides/lifecycle-and-state/)
- [Version 5 changes](../../changelog/)
