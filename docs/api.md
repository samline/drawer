# API Reference

`@samline/drawer` is a shared drawer runtime for React, Vue, Svelte, vanilla JS, and browser usage.

## Package Surface

| Entry point | Purpose |
| --- | --- |
| `@samline/drawer` | Main vanilla API and shared mounted host |
| `@samline/drawer/react` | React component adapter |
| `@samline/drawer/browser` | Browser global entry that exposes `window.Drawer` |
| `@samline/drawer/vue` | Vue wrapper over the shared vanilla host |
| `@samline/drawer/svelte` | Svelte action wrapper over the shared vanilla host |
| `@samline/drawer/core` | Shared controller contracts and state primitives |
| `@samline/drawer/styles.css` | Shared styles export |

## Shared Concepts

The package is split into three layers:

1. Shared controller state in `@samline/drawer/core`.
2. A root vanilla entry that mounts one shared drawer host.
3. Framework adapters that either render the full component model directly or synchronize the shared host.

### Shared host behavior

The root entry keeps its state in module scope. Calling `createDrawer()` or `configureDrawer()` updates the same mounted drawer instance instead of creating independent drawers.

Browser, Vue, and Svelte integrations all target that same shared host.

### Renderable values

The vanilla-facing entries accept these values for `title`, `description`, and `content`:

- `string`
- `number`
- `HTMLElement`
- `() => HTMLElement`
- `null`
- `undefined`

Those entries do not accept JSX, Vue VNodes, or Svelte components as render values.

## Shared Controller API

The `@samline/drawer/core` entry exports:

- `CommonDrawerDirection`
- `CommonDrawerSnapPoint`
- `CommonDrawerOptions`
- `CommonDrawerState`
- `CommonDrawerSnapshot`
- `CommonDrawerController`
- `createDrawerController(options?)`

### Common options

These options define the shared drawer state and are accepted by the root API and the controller factory.

| Option | Type | Purpose |
| --- | --- | --- |
| `open` | `boolean` | Controlled open state |
| `defaultOpen` | `boolean` | Initial open state when mounting |
| `dismissible` | `boolean` | Whether escape, overlay press, and drag-close can dismiss the drawer |
| `modal` | `boolean` | Whether outside interaction is blocked |
| `nested` | `boolean` | Marks a drawer as nested inside another drawer |
| `direction` | `top` / `bottom` / `left` / `right` | Drawer direction |
| `snapPoints` | `Array<number | string>` | Snap positions used by draggable drawers |
| `fadeFromIndex` | `number` | Index where background fading begins when using snap points |
| `activeSnapPoint` | `number | string | null` | Controlled active snap point |
| `closeThreshold` | `number` | Drag threshold used to decide dismissal |
| `scrollLockTimeout` | `number` | Delay before drag resumes after scrolling inside content |
| `shouldScaleBackground` | `boolean` | Whether the background scales when the drawer opens |
| `setBackgroundColorOnScale` | `boolean` | Whether body background color is adjusted during scale |
| `handleOnly` | `boolean` | Restrict dragging to `Drawer.Handle` |
| `fixed` | `boolean` | Keep the drawer fixed instead of repositioning it |
| `disablePreventScroll` | `boolean` | Disable drawer-managed document scroll locking |
| `repositionInputs` | `boolean` | Reposition inputs when the keyboard is visible |
| `snapToSequentialPoint` | `boolean` | Prevent skipping snap points on high-velocity swipes |
| `preventScrollRestoration` | `boolean` | Prevent the browser from restoring scroll position |
| `noBodyStyles` | `boolean` | Disable drawer-managed body styles |
| `autoFocus` | `boolean` | Autofocus the drawer content when opened |

### `createDrawerController(options?)`

Creates a shared-state controller without mounting UI.

```ts
import { createDrawerController } from '@samline/drawer/core';

const controller = createDrawerController({
  direction: 'bottom',
  snapPoints: ['148px', '355px', 1],
});

const unsubscribe = controller.subscribe((snapshot) => {
  console.log(snapshot.state.isOpen, snapshot.state.activeSnapPoint);
});

controller.setOpen(true);
controller.setActiveSnapPoint('355px');
unsubscribe();
```

The controller instance exposes:

- `getSnapshot()`
- `setOpen(open)`
- `setActiveSnapPoint(snapPoint)`
- `patch(options)`
- `subscribe(listener)`

## Root Vanilla API

The root entry exports:

- `createDrawer(options?)`
- `configureDrawer(options?)`
- `getDrawer()`
- `destroyDrawer()`
- `createDrawerController(options?)`

### Vanilla options

The root entry accepts the shared options plus these rendering options:

| Option | Type | Purpose |
| --- | --- | --- |
| `mountElement` | `HTMLElement | null` | Mount the shared host into a specific container |
| `triggerElement` | `HTMLElement | null` | Attach an external click trigger |
| `triggerText` | `string` | Render a built-in trigger button |
| `title` | `VanillaRenderable` | Drawer title content |
| `description` | `VanillaRenderable` | Drawer description content |
| `content` | `VanillaRenderable` | Main drawer body content |
| `overlayClassName` | `string` | Extra class for the overlay |
| `contentClassName` | `string` | Extra class for the content root |

### `createDrawer(options?)`

Creates or updates the shared mounted drawer host and returns a controller with DOM-aware helpers.

```ts
import { createDrawer } from '@samline/drawer';

const drawer = createDrawer({
  triggerText: 'Open filters',
  title: 'Filters',
  description: 'Refine the result set',
  content: 'Drawer body',
  snapPoints: ['180px', '420px', 1],
});

drawer.setOpen(true);
drawer.update({ activeSnapPoint: '420px' });
```

The returned controller includes the shared controller methods plus:

- `element` — current host element when mounted.
- `options` — latest merged options passed to the root entry.
- `update(options?)` — merge new options into the shared host and rerender.
- `destroy()` — alias for `destroyDrawer()`.

### `configureDrawer(options?)`

Alias of `createDrawer()`. Use whichever name reads better in your codebase.

### `getDrawer()`

Returns the current mounted controller or `null` if the shared host has not been created yet.

### `destroyDrawer()`

Unmounts the shared host, removes the generated mount element when Drawer created it, and clears the module-level controller state.

## React API

The React entry exports the full component model through `Drawer`:

- `Drawer.Root`
- `Drawer.NestedRoot`
- `Drawer.Trigger`
- `Drawer.Portal`
- `Drawer.Overlay`
- `Drawer.Content`
- `Drawer.Handle`
- `Drawer.Close`
- `Drawer.Title`
- `Drawer.Description`

### `Drawer.Root`

`Drawer.Root` supports the shared drawer options and React-specific behavior such as:

- `onOpenChange`
- `onDrag`
- `onRelease`
- `onClose`
- `setActiveSnapPoint`
- `container`
- `onAnimationEnd`

Use it when you want the original component composition model instead of the mounted shared host.

### `Drawer.NestedRoot`

`Drawer.NestedRoot` must be rendered inside another drawer. It forwards nested drag and release behavior to the parent drawer context.

### React example

```tsx
import { Drawer } from '@samline/drawer/react';

export function Example() {
  return (
    <Drawer.Root shouldScaleBackground snapPoints={['155px', '500px', 1]}>
      <Drawer.Trigger>Open drawer</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content>
          <Drawer.Handle />
          <Drawer.Title>Filters</Drawer.Title>
          <Drawer.Description>Adjust the visible results.</Drawer.Description>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

## Vue API

The Vue entry exports:

- `DrawerRoot`
- `DrawerPlugin`
- `createDrawer`
- `destroyDrawer`
- `getDrawer`

`DrawerRoot` mirrors the vanilla options as Vue props and synchronizes them into the shared host on mount and on prop changes.

`DrawerPlugin` registers `DrawerRoot`, exposes `$drawer` on `app.config.globalProperties`, and provides `drawer:api` for dependency injection.

Unmounting `DrawerRoot` destroys the shared host.

## Svelte API

The Svelte entry exports:

- `drawer`
- `DrawerRoot`
- `mountDrawer`
- `createDrawer`
- `destroyDrawer`
- `getDrawer`

`drawer` is a Svelte action that marks the host node, synchronizes options into the shared host, and destroys the host when the action is torn down.

`mountDrawer(options?)` is the imperative helper when you want the same behavior without attaching an action in markup.

## Browser Global API

The browser entry exposes `window.Drawer` with this shape:

```ts
window.Drawer = {
  createDrawer,
  configureDrawer,
  getDrawer,
  destroyDrawer,
  createDrawerController,
}
```

Importing `@samline/drawer/browser` only registers that namespace. It does not auto-mount a drawer until you call one of the root methods.

```html
<script type="module">
  import '@samline/drawer/browser';

  const drawer = window.Drawer.createDrawer({
    triggerText: 'Open drawer',
    title: 'Drawer title',
    content: 'Drawer content'
  });

  drawer.setOpen(true);
</script>
```

## Constraints and Caveats

- The root, browser, Vue, and Svelte entries currently render through the React adapter internally, even though their call sites stay framework-agnostic.
- The shared mounted host is a singleton per module. Reconfiguring it in one place affects every wrapper using that same module instance.
- Vue and Svelte wrappers destroy the shared host when they unmount, so they should be treated as ownership points for the mounted drawer.
- Use `@samline/drawer/react` when you need multiple drawers with independent component trees or nested drawer composition.