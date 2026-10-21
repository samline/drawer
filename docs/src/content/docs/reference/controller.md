---
locale: en
title: 'Controller and registry'
titleAccent: 'registry'
description: 'Use one owned controller to open, update and destroy a drawer, with optional registry queries and explicit terminal cleanup.'
sidebar:
  group: reference
  order: 4
---

Keep the controller returned by `createDrawer()`. Use the registry only when another part of the application needs to find that same instance.

## Choose an API

| Need                               | Use                                              |
| ---------------------------------- | ------------------------------------------------ |
| Create a drawer                    | `createDrawer(options)`                          |
| Open or close it                   | `drawer.setOpen(true)` / `drawer.setOpen(false)` |
| Change content or settings         | `drawer.update(options)`                         |
| Remove it                          | `drawer.destroy()`                               |
| Find an existing instance          | `getDrawer(id)`                                  |
| Inspect all registered instances   | `getDrawers()`                                   |
| Dispose a page's complete registry | `destroyDrawers()`                               |

## Vanilla controller

```ts
const drawer = createDrawer({ title: 'Filters', content: 'Choose a category' })
drawer.setOpen(true)
drawer.update({ content: 'Your filters are ready' })
drawer.setOpen(false)
drawer.destroy()
```

Save the controller; an explicit id is optional. Each omitted id is generated independently. An explicit duplicate id throws instead of silently updating another feature's drawer. Use `getDrawer(id)` to retrieve the existing controller or `update()` to change it.

`element` is the persistent host and can be null without a DOM. The visual `[data-drawer]` subtree appears while open or exiting. `options` and snapshots must be treated as read-only.

## Common methods

| Method                      | Result and behavior                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `getSnapshot()`             | Read the current options and state.                                                                                          |
| `setOpen(boolean)`          | Change open state and return the resulting snapshot.                                                                         |
| `update(options)`           | Shallow-merge settings and return the resulting snapshot. DOM controllers also update their content/trigger/render settings. |
| `setActiveSnapPoint(value)` | Set an existing snap value and return the resulting snapshot; does not echo `onActiveSnapPointChange`.                       |
| `subscribe(listener)`       | Notify immediately and on publications; return an unsubscribe function.                                                      |
| `destroy()`                 | Dispose the instance and subscriptions; safe to call again.                                                                  |

There is one update method; `patch()` was removed in v5. An instance id cannot be changed by `update()`. Commands return snapshots rather than a fluent controller.

## Registry inspection

```ts
import { getDrawer, getDrawers } from '@samline/drawer'

const filters = getDrawer('filters') // null when absent
filters?.setOpen(true)
const registeredIds = Object.keys(getDrawers())
```

`getDrawer(id)` requires an explicit id and never creates. Repeated lookups return the identical controller object. `getDrawers()` returns a fresh object keyed by id, containing those same controllers; later registration/removal does not mutate an earlier object's keys. `getParentDrawer(id)` returns a parent or null; `getChildDrawers(id)` returns an array.

## Destruction is final

A destroyed controller cannot recreate a drawer. Its commands, `getSnapshot()`, options access and subscriptions throw. The DOM controller’s id stays readable, its element is null and repeated `destroy()` is harmless. A newly created drawer may reuse the released id, but old handles cannot read, change or destroy the new instance. Reacquire a new controller explicitly.

## Headless controller

Use `createDrawerController()` only for state without DOM, registry, gestures, focus or scrolling effects. It shares `getSnapshot`, `setOpen`, `update`, `setActiveSnapPoint`, `subscribe` and `destroy`.

```ts
const state = createDrawerController({ direction: 'right' })
const stop = state.subscribe(snapshot => renderCustomPanel(snapshot.state))
state.setOpen(true)
stop()
state.destroy()
```

## See also

- [Lifecycle and state](../../guides/lifecycle-and-state/)
- [Complete API](../api/)
- [TypeScript reference](../typescript/)
- [Version 5 breaking changes](../../changelog/)
