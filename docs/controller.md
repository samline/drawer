# Controller and registry

`createDrawer()` returns a `VanillaDrawerController`. Id-based helpers operate on that same registered instance, so applications can use an owned controller locally and registry helpers in distant handlers.

## Choose an API

| Need                               | Preferred API                                                |
| ---------------------------------- | ------------------------------------------------------------ |
| A component owns one drawer        | Keep the controller returned by `createDrawer()`.            |
| A distant handler knows only an id | `openDrawer(id)`, `closeDrawer(id)`, or `toggleDrawer(id)`.  |
| Inspect registered instances       | `getDrawer(id)` or `getDrawers()`.                           |
| Update content or vanilla options  | `controller.update(options)` or `updateDrawer(id, options)`. |
| Update common headless state       | `controller.patch(options)`.                                 |
| Remove an instance                 | `controller.destroy()` or `destroyDrawer(id)`.               |
| Model state without DOM            | `createDrawerController(options)`.                           |

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

`element` is the persistent host, not necessarily the `[data-drawer]` dialog. It can be `null` without a DOM; closed drawers keep the host while visual nodes are absent.

```ts
const drawer = createDrawer({ id: 'filters', title: 'Filters' })

drawer.setOpen(true)
drawer.update({ content: buildFilters() })
console.log(drawer.getSnapshot().state.isOpen)
drawer.destroy()
```

## Common methods

| Method                      | Important behavior                                                      |
| --------------------------- | ----------------------------------------------------------------------- |
| `getSnapshot()`             | Pure read; does not publish or render.                                  |
| `setOpen(open)`             | Updates and publishes open state; the vanilla wrapper synchronizes DOM. |
| `setActiveSnapPoint(value)` | Updates controller state without calling `onActiveSnapPointChange`.     |
| `patch(options)`            | Shallow-merges `CommonDrawerOptions` and publishes.                     |
| `subscribe(listener)`       | Calls immediately, then after controller publications; returns cleanup. |

Treat `options`, snapshots, and their nested values as read-only. Mutating them in place bypasses rendering and subscriber publication.

## Headless controller

`createDrawerController()` has no registry, DOM, focus, animation, or scroll side effects:

```ts
const state = createDrawerController({ direction: 'right' })
const stop = state.subscribe((snapshot) => renderCustomPanel(snapshot.state))
state.setOpen(true)
stop()
```

## See also

- [Lifecycle and state](guides/lifecycle-and-state.md)
- [Complete API](api/index.md)
- [TypeScript reference](typescript.md)
