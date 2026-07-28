# `createDrawerController(options?)`

Create a headless controller without mounting a DOM host.

## Signature

```ts
function createDrawerController(options?: CommonDrawerOptions): CommonDrawerController
```

## Description

`createDrawerController` builds a `CommonDrawerController` for the supplied options. It is the headless counterpart to `createDrawer`: same observable state, same mutators, same snapshot shape, but no DOM, no built-in trigger, no scale-background, no scroll lock, no history restoration, no focus trap, no body styles.

The factory is useful for:

- **Tests** — drive the controller synchronously and assert on snapshots without a DOM environment.
- **Server-rendered contexts** — model drawer state without a browser.
- **Custom renderers** — build your own dialog primitive on top of the same observable state. Subscribe to the controller and re-render your own host when the snapshot changes.
- **Workers** — share the same `CommonDrawerOptions` surface without the runtime side effects.

`createDrawerController` does not register the id in the module-level registry and is not affected by `getDrawer` / `getDrawers` / `destroyDrawer`. It is also not affected by DOM-only options: `content`, `title`, `description`, `container`, `triggerElement`, `triggerText`, `closeButton`, and every `*ClassName` option are ignored. Pass them only when you want a single options object that can be shared with `createDrawer` later; they will not produce DOM.

## Parameters

| Name      | Type                   | Default | Description                                                                 |
| --------- | ---------------------- | ------- | --------------------------------------------------------------------------- |
| `options` | `CommonDrawerOptions`  | `{}`    | The drawer's full state surface. See [docs/options.md](../options.md).      |

## Returns

`CommonDrawerController` — the headless controller. See [docs/typescript.md](../typescript.md#commondrawercontroller).

## Example

```ts
import { createDrawerController } from '@samline/drawer'

const controller = createDrawerController({
  id: 'filters',
  direction: 'bottom',
  defaultOpen: true,
  snapPoints: ['180px', '420px', 1]
})

controller.getSnapshot().state.isOpen // true
controller.getSnapshot().state.activeSnapPoint // '180px'

const next = controller.setActiveSnapPoint(1)
next.state.activeSnapPoint // 1

const unsubscribe = controller.subscribe((snapshot) => {
  console.log('changed:', snapshot.state.isOpen)
})

controller.setOpen(false)
unsubscribe()
```

## Related

- [`createDrawer(options?)`](create-drawer.md) — the DOM-aware factory.
- [TypeScript → CommonDrawerController](../typescript.md#commondrawercontroller).
- [Options → Common fields](../options.md#common-fields) — every field accepted by `createDrawerController`.
