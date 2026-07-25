# `createDrawerController(options?)`

Create a headless controller without mounting any DOM.

## Signature

```ts
function createDrawerController(options?: CommonDrawerOptions): CommonDrawerController
```

## Description

`createDrawerController` is the same observable state machine that `createDrawer` uses internally, but without the host / dialog / browser-side-effects. The returned controller exposes `getSnapshot`, `setOpen`, `setActiveSnapPoint`, `patch`, and `subscribe` — the full observable surface — but does not own any DOM.

Useful for:

- **Tests** — assert state transitions without a real DOM.
- **Headless logic** — model drawer state in a server-rendered context or in a worker.
- **Custom renderers** — build your own dialog primitive on top of the same observable state. Subscribe to the controller and re-render your own host when the snapshot changes.

The default `id` is `'default'`. Pass `id` to namespace multiple controllers.

## Parameters

| Name      | Type                  | Default | Description                                                              |
| --------- | --------------------- | ------- | ------------------------------------------------------------------------ |
| `options` | `CommonDrawerOptions` | `{}`    | The drawer's full options surface. See [docs/options.md](../options.md). |

## Returns

`CommonDrawerController` — the headless controller. See [docs/typescript.md](../typescript.md#commondrawercontroller).

## Example

```ts
import { createDrawerController } from '@samline/drawer'

const controller = createDrawerController({
  id: 'headless',
  direction: 'bottom',
  snapPoints: ['120px', '320px', 1]
})

const unsubscribe = controller.subscribe((snapshot) => {
  console.log('state changed:', snapshot.state.isOpen, snapshot.state.activeSnapPoint)
})

controller.setOpen(true)
controller.setActiveSnapPoint(1)

unsubscribe()
```

## Related

- [`createDrawer(options?)`](create-drawer.md) — the DOM-aware entrypoint.
- [`CommonDrawerController`](../typescript.md#commondrawercontroller) — the type returned here.
