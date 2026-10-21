---
locale: en
title: 'Lifecycle and state'
description: 'Understand create, open, close and destroy; preserve ownership, subscribe to state and clean up Drawer in partial navigation or SPA views.'
sidebar:
  group: guides
  order: 3
---

Use this guide when the drawer is part of a page, component, or SPA lifecycle. It explains which resources survive a close, which changes rebuild DOM, and when each callback runs.

## The three layers

Each registered drawer has three related layers:

1. **Registry entry** — keyed by `id`; stores options and the controller.
2. **Host** — a persistent `[data-drawer-vanilla-root]` owned by that id.
3. **Visual subtree** — overlay and dialog nodes mounted only while open or finishing the close transition.

This is why `setOpen(false)` and `destroy()` are not interchangeable. Closing preserves identity for the next open. Destroying releases the registry entry, host, triggers, timers, listeners, focus effects, and owned page effects.

## Create, open, close, destroy

```ts
import { createDrawer } from '@samline/drawer'
import '@samline/drawer/styles.css'

const drawer = createDrawer({ id: 'filters', title: 'Filters' })

drawer.setOpen(true) // mounts and opens the visual subtree
drawer.setOpen(false) // starts exit, then removes visual nodes
drawer.destroy() // removes the id and everything it owns
```

| Operation     | Registry entry | Host      | Dialog subtree           | Calls `onClose`           |
| ------------- | -------------- | --------- | ------------------------ | ------------------------- |
| create closed | created        | mounted   | absent                   | no                        |
| open          | preserved      | preserved | mounted                  | no                        |
| close         | preserved      | preserved | removed after transition | yes, before state changes |
| destroy       | removed        | removed   | removed immediately      | no                        |

Creating with `open: true` or `defaultOpen: true` shows the first render without an entrance animation. To animate on page load, create closed and open in a microtask:

```ts
const drawer = createDrawer({ id: 'welcome', title: 'Welcome' })
queueMicrotask(() => drawer.setOpen(true))
```

## Identity and updates

Omitting id creates an independent instance with a generated id. Duplicate explicit ids throw. Repeated getDrawer(id) calls return the identical owned controller.

```ts
const filters = createDrawer({ id: 'filters', title: 'Filters' })
filters.update({ content: buildFilters(), closeButton: true, dismissible: false })
```

There is one shallow update method for state and DOM options. Ids are immutable. Arrays/elements/nested objects replace previous values rather than deep-merging. Use documented clear values, or destroy and explicitly recreate if a setting has no clear operation. Destroyed handles cannot be reused; even a new instance with the same id is independent. `getSnapshot()`, options access, commands and subscriptions on a destroyed handle throw. A DOM controller’s id stays readable and its element is null; repeated destroy is safe.

## Callback order

For a real open-state transition:

```text
close request → onClose() → state update → onOpenChange(false)
             → render/exit → onAnimationEnd(false) after 500 ms
```

`onClose` only runs for an open-to-closed transition. `onOpenChange` sees the new state. `onAnimationEnd` is timer-based, and a newer transition cancels the earlier pending notification. Destroying cancels pending timers.

Drag releases also call `onReleaseChange(open)`. Runtime-driven snap changes call `onActiveSnapPointChange(value)` after the controller updates; a direct `setActiveSnapPoint()` call does not echo that callback.

## Subscribe without leaking

`subscribe()` invokes its listener immediately and after controller publications. Always keep the returned cleanup.

```ts
const drawer = createDrawer({ id: 'cart', title: 'Cart' })
const unsubscribe = drawer.subscribe(snapshot => {
  document.body.dataset.cartOpen = String(snapshot.state.isOpen)
})

const unmount = () => {
  unsubscribe()
  drawer.destroy()
}
```

Treat snapshots and `drawer.options` as read-only views. Mutating them directly bypasses rendering and publication.

## SPA ownership pattern

Create the drawer when the feature mounts and destroy it when the feature unmounts. Avoid document-level click delegation when `triggerElement`, `triggerText`, or `closeButton` can express the same control; those built-ins are rebound and cleaned up by the drawer.

```ts
export const mountCart = (trigger: HTMLElement) => {
  const drawer = createDrawer({
    id: 'cart',
    triggerElement: trigger,
    title: 'Cart',
    closeButton: true,
    content: () => buildCart(),
  })

  return () => drawer.destroy()
}
```

## Related

- [Options](../../reference/configuration/)
- [API reference](../../reference/api/)
- [Recipes: SPA lifecycle](../recipes/#spa--dynamic-mount-and-unmount)
- [TypeScript reference](../../reference/typescript/)
