---
title: Controller and registry
description: Choose controller methods or registry helpers, understand their return values, and keep state synchronized.
template: doc
---

`createDrawer()` returns a `VanillaDrawerController`, while the package also exposes id-based registry helpers. They operate on the same instance; choose the style that best matches ownership in your application.

## Decision table

| Need                                     | Preferred API                                                   |
| ---------------------------------------- | --------------------------------------------------------------- |
| A component owns one drawer              | Keep the controller returned by `createDrawer()`.               |
| A distant event handler knows only an id | Use `openDrawer(id)`, `closeDrawer(id)`, or `toggleDrawer(id)`. |
| Inspect one or all registered instances  | `getDrawer(id)` or `getDrawers()`.                              |
| Update DOM content or vanilla options    | `controller.update(options)` or `updateDrawer(id, options)`.    |
| Update headless common state             | `controller.patch(options)`.                                    |
| Remove an owned instance                 | `controller.destroy()` or `destroyDrawer(id)`.                  |
| Model state without DOM                  | `createDrawerController(options)`.                              |

## Vanilla controller

```ts
interface VanillaDrawerController extends CommonDrawerController {
  id: string
  element: HTMLElement | null
  options: VanillaDrawerOptions
  update(options?: VanillaDrawerOptions): VanillaDrawerController
  destroy(): void
}
```

`element` is the registry-owned host, not necessarily the `[data-drawer]` dialog. It can be `null` during SSR. Closed drawers keep the host while lazy visual nodes are absent.

```ts
const drawer = createDrawer({ id: 'filters', title: 'Filters' })

drawer.setOpen(true)
drawer.update({ content: buildFilters() })

const snapshot = drawer.getSnapshot()
console.log(snapshot.state.isOpen)

drawer.destroy()
```

## Common controller methods

| Method                      | Result               | Important behavior                                                                 |
| --------------------------- | -------------------- | ---------------------------------------------------------------------------------- |
| `getSnapshot()`             | current snapshot     | Pure read; does not publish or render.                                             |
| `setOpen(open)`             | new snapshot         | Publishes even for direct controller calls; vanilla wrapper also synchronizes DOM. |
| `setActiveSnapPoint(value)` | new snapshot         | Does not call `onActiveSnapPointChange`.                                           |
| `patch(options)`            | new snapshot         | Shallow-merges `CommonDrawerOptions` and publishes.                                |
| `subscribe(listener)`       | unsubscribe function | Calls the listener immediately, then on publications.                              |

Do not mutate `options`, snapshots, or nested arrays in place. They are exposed for inspection, not as an alternate write API.

## Registry helpers

All helpers normalize an omitted id to `'default'`.

```ts
import { closeDrawer, destroyDrawer, getDrawer, openDrawer, toggleDrawer, updateDrawer } from '@samline/drawer'

openDrawer('filters')
updateDrawer('filters', { title: 'Product filters' })
toggleDrawer('filters')
closeDrawer('filters')
destroyDrawer('filters')
```

Mutators return the matching controller or `null` when the id is not registered. `getDrawers()` returns a new array of controller wrappers. Parent and child inspectors follow `parentId` relationships.

## Headless controller

`createDrawerController()` has no DOM, registry, animation, focus, or scroll side effects. It is useful for adapters and tests that need the state contract only.

```ts
const state = createDrawerController({
  direction: 'right',
  dismissible: false
})

const stop = state.subscribe((snapshot) => {
  renderCustomPanel(snapshot.state)
})

state.setOpen(true)
stop()
```

## Related

- [Lifecycle and state](/drawer/guides/lifecycle-and-state/)
- [Full API reference](/drawer/reference/api/)
- [TypeScript shapes](/drawer/reference/typescript/)
