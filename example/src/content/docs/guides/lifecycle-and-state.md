---
title: Lifecycle and state
description: Understand registry identity, lazy presence, callback order, updates, subscriptions, and safe SPA cleanup.
template: doc
---

Each registered drawer has three related layers: a registry entry keyed by `id`, a persistent `[data-drawer-vanilla-root]` host, and a visual subtree that exists only while the drawer is open or finishing its exit transition.

That distinction explains the most important lifecycle rule: **close preserves an instance; destroy releases it**.

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

:::tip[Choose ownership before implementation]
Create the drawer when its page or component mounts, and destroy it when that owner unmounts. Reopening is a state change; navigating away from the feature is usually teardown.
:::

## Identity and updates

The default id is `'default'`. Calling `createDrawer()` again with the same id shallow-merges options into the registered instance; it does not create another drawer.

```ts
const filters = createDrawer({ id: 'filters', title: 'Filters' })

filters.update({ content: buildFilters(), closeButton: true })
filters.patch({ dismissible: false })
```

| Method                      | Accepts                        | Renders DOM               | Best for                                            |
| --------------------------- | ------------------------------ | ------------------------- | --------------------------------------------------- |
| `update(options)`           | `VanillaDrawerOptions`         | yes                       | Content, triggers, classes, and any runtime option. |
| `patch(options)`            | `Partial<CommonDrawerOptions>` | no direct vanilla rebuild | Headless/controller state changes.                  |
| `setOpen(open)`             | `boolean`                      | yes                       | Open and close transitions.                         |
| `setActiveSnapPoint(value)` | snap value or `null`           | controller publication    | Externally controlled snap state.                   |

Arrays, elements, and option objects are replaced by the shallow merge. There is no generic typed “unset” for every optional field. Use a documented clear value—such as `[]`, `null`, `''`, or `false`—or destroy and recreate the id.

## Callback order

For a real close transition:

```text
close request → onClose() → state update → onOpenChange(false)
             → render/exit → onAnimationEnd(false) after 500 ms
```

- `onClose` sees the still-open snapshot and does not run for `destroy()`.
- `onOpenChange` sees the new state and is skipped for no-op writes.
- `onAnimationEnd` is timer-based. A newer transition cancels the earlier pending callback.
- `onReleaseChange(open)` belongs to accepted drag releases, not programmatic close or overlay clicks.
- `onActiveSnapPointChange(value)` belongs to runtime-driven snap changes. Direct `setActiveSnapPoint()` calls do not echo it.

## Subscribe without leaking

`subscribe()` invokes its listener immediately, then after controller publications. Keep the returned cleanup and treat snapshots as read-only.

```ts
const cart = createDrawer({ id: 'cart', title: 'Cart' })
const unsubscribe = cart.subscribe((snapshot) => {
  document.body.dataset.cartOpen = String(snapshot.state.isOpen)
})

function unmount() {
  unsubscribe()
  cart.destroy()
}
```

## SPA pattern

Prefer drawer-owned controls over document-level delegation. `triggerElement`, `triggerText`, and `closeButton` are rebound and cleaned up with their owner.

```ts
export function mountCart(trigger: HTMLElement) {
  const drawer = createDrawer({
    id: 'cart',
    triggerElement: trigger,
    title: 'Cart',
    closeButton: true,
    content: () => buildCart()
  })

  return () => drawer.destroy()
}
```

## Related

- [Controller reference](/drawer/reference/controller/)
- [Configuration](/drawer/reference/configuration/)
- [API lifecycle contract](/drawer/reference/api/#lifecycle-contract)
- [Recipes: SPA cleanup](/drawer/reference/examples/#recipe-spa--dynamic-mount-and-unmount)
