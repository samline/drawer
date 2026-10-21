---
locale: en
title: 'destroyDrawers()'
description: "Destroy all currently registered drawers, including descendants. Cleanup releases each instance's DOM, listeners, timers, subscriptions and shared-effect ownership. Repeated calls are safe. Headless controllers are independent and need their own destroy()."
sidebar:
  group: api
  order: 12
---

## Signature

```ts
function destroyDrawers(): void
```

## Description

Use only when the caller owns the entire registry, such as application shutdown or test cleanup. A component should call its own `drawer.destroy()` instead, leaving other components intact.

## Returns

void; disposal is immediate and does not call onClose first.

## Example

```ts
import { createDrawer, destroyDrawers, getDrawers } from '@samline/drawer'

createDrawer({ id: 'a', title: 'A' })
createDrawer({ id: 'b', title: 'B' })
destroyDrawers()
getDrawers() // {}
```

## Related

- [Controller and registry](../../reference/controller/)
- [Lifecycle and state](../../guides/lifecycle-and-state/)
- [Version 5 changes](../../changelog/)
