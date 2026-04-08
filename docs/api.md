# API Reference

`@samline/drawer` is a shared drawer runtime for React, Vue, Svelte, vanilla JS, and browser usage.

## Package Surface

| Entry point | Purpose |
| --- | --- |
| `@samline/drawer` | Main vanilla API and shared runtime registry |
| `@samline/drawer/react` | React component adapter |
| `@samline/drawer/browser` | Browser global entry for CDN or plain HTML usage |
| `@samline/drawer/vue` | Vue wrapper over the shared runtime |
| `@samline/drawer/svelte` | Svelte action wrapper over the shared runtime |
| `@samline/drawer/core` | Shared controller contracts and state primitives |
| `@samline/drawer/styles.css` | Shared styles export |

## Shared Concepts

The package is split into three layers:

1. Shared controller state in `@samline/drawer/core`.
2. A root vanilla entry that manages named runtime instances.
3. Framework adapters that either render the full component model directly or synchronize that runtime.

### Shared runtime behavior

The root entry keeps its state in module scope, but it no longer limits you to one drawer. Calling `createDrawer()` or `configureDrawer()` without an `id` targets the default instance. Passing `id` creates or updates a specific named instance.

Browser, Vue, Svelte, and the React imperative exports all target that same shared runtime.

### Hierarchy behavior

Use `parentId` when one drawer should behave as a child of another runtime instance.

- Closing a parent closes its registered children.
- Destroying a parent recursively destroys its children.
- `getParentDrawer()` and `getChildDrawers()` let every adapter query the same relationship graph.

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
| `id` | `string` | Named runtime instance id. Defaults to `default` |
| `parentId` | `string` | Parent runtime instance id used for nested relationships |
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
| `onOpenChange` | `(open: boolean) => void` | Called when the shared runtime open state changes |
| `onClose` | `() => void` | Called after a drawer closes |
| `onAnimationEnd` | `(open: boolean) => void` | Called after the open or close transition duration |
| `onDragChange` | `(percentageDragged: number) => void` | Called while drag progress changes |
| `onReleaseChange` | `(open: boolean) => void` | Called after release resolves to open or closed |

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
- `getDrawer(id?)`
- `getDrawers()`
- `getParentDrawer(id?)`
- `getChildDrawers(id?)`
- `updateDrawer(idOrOptions?, options?)`
- `openDrawer(id?)`
- `closeDrawer(id?)`
- `toggleDrawer(id?)`
- `destroyDrawer(id?)`
- `destroyDrawers()`
- `createDrawerController(options?)`

### Vanilla options

The root entry accepts the shared options plus these rendering options:

| Option | Type | Purpose |
| --- | --- | --- |
| `mountElement` | `HTMLElement | null` | Mount the drawer host into a specific container |
| `triggerElement` | `HTMLElement | null` | Attach an external click trigger |
| `triggerText` | `string` | Render a built-in trigger button |
| `showHandle` | `boolean` | Render the built-in drawer handle in non-React entries |
| `handleClassName` | `string` | Extra class for the built-in non-React handle |
| `title` | `VanillaRenderable` | Drawer title content |
| `description` | `VanillaRenderable` | Drawer description content |
| `content` | `VanillaRenderable` | Main drawer body content |
| `overlayClassName` | `string` | Extra class for the overlay |
| `contentClassName` | `string` | Extra class for the content root |

### `createDrawer(options?)`

Creates or updates a named runtime instance and returns a controller with DOM-aware helpers.

```ts
import { createDrawer } from '@samline/drawer';

const drawer = createDrawer({
  id: 'filters',
  triggerText: 'Open filters',
  showHandle: true,
  title: 'Filters',
  description: 'Refine the result set',
  content: 'Drawer body',
  snapPoints: ['180px', '420px', 1],
});

drawer.setOpen(true);
drawer.update({ activeSnapPoint: '420px' });
```

The returned controller includes the shared controller methods plus:

- `id` — runtime instance id.
- `element` — current host element when mounted.
- `options` — latest merged options passed to the root entry.
- `update(options?)` — merge new options into the same instance and rerender.
- `destroy()` — alias for `destroyDrawer(id)`.

### `configureDrawer(options?)`

Alias of `createDrawer()`. Use whichever name reads better in your codebase.

### `getDrawer(id?)`

Returns the controller for the requested instance or `null` if it has not been created yet.

### Runtime helpers

Use these helpers when you want to work imperatively without holding onto the controller reference:

- `getDrawers()` returns every live instance keyed by id.
- `getParentDrawer(id?)` returns the parent controller for the selected instance.
- `getChildDrawers(id?)` returns child controllers for the selected instance.
- `updateDrawer(idOrOptions?, options?)` updates an instance by id, or accepts a full options object.
- `openDrawer(id?)`, `closeDrawer(id?)`, and `toggleDrawer(id?)` mutate open state directly.
- `destroyDrawer(id?)` tears down one instance.
- `destroyDrawers()` tears down every live instance.

## React API

The React entry exports the full component model through `Drawer` and also re-exports the shared imperative runtime helpers:

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
- `createDrawer`
- `getDrawer`
- `getDrawers`
- `getParentDrawer`
- `getChildDrawers`
- `updateDrawer`
- `openDrawer`
- `closeDrawer`
- `toggleDrawer`
- `destroyDrawer`
- `destroyDrawers`
- `createDrawerController`

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
- `configureDrawer`
- `getDrawer`
- `getDrawers`
- `getParentDrawer`
- `getChildDrawers`
- `updateDrawer`
- `openDrawer`
- `closeDrawer`
- `toggleDrawer`
- `destroyDrawer`
- `destroyDrawers`
- `createDrawerController`

`DrawerRoot` mirrors the vanilla options as Vue props and synchronizes them into the shared runtime on mount and on prop changes.

Pass `showHandle` when the built-in shared host should render the default handle. If `handleOnly` is enabled, the built-in handle is rendered automatically so the drawer remains draggable from a visible affordance.

`DrawerPlugin` registers `DrawerRoot`, exposes `$drawer` on `app.config.globalProperties`, and provides `drawer:api` for dependency injection.

Unmounting `DrawerRoot` destroys the specific runtime instance selected by `id`.

## Svelte API

The Svelte entry exports:

- `drawer`
- `DrawerRoot`
- `mountDrawer`
- `createDrawer`
- `configureDrawer`
- `getDrawer`
- `getDrawers`
- `getParentDrawer`
- `getChildDrawers`
- `updateDrawer`
- `openDrawer`
- `closeDrawer`
- `toggleDrawer`
- `destroyDrawer`
- `destroyDrawers`
- `createDrawerController`

`drawer` is a Svelte action that marks the host node, synchronizes options into the shared runtime, and destroys the selected instance when the action is torn down.

Use `showHandle` when the shared host should render the built-in handle. As with the root and Vue entries, enabling `handleOnly` also renders that handle automatically.

`mountDrawer(options?)` is the imperative helper when you want the same behavior without attaching an action in markup.

## Browser Global API

The browser entry exposes `window.Drawer` with this shape:

```ts
window.Drawer = {
  getParentDrawer,
  getChildDrawers,
  openDrawer,
  closeDrawer,
  toggleDrawer,
  updateDrawer,
  createDrawer,
  configureDrawer,
  getDrawer,
  getDrawers,
  destroyDrawer,
  destroyDrawers,
  createDrawerController,
}
```

Loading `dist/browser/index.js` in a browser attaches that namespace. It does not auto-mount a drawer until you call one of the root methods.

```html
<script src="https://unpkg.com/@samline/drawer/dist/browser/index.js"></script>
<script>
  const drawer = window.Drawer.createDrawer({
    triggerText: 'Open drawer',
    showHandle: true,
    title: 'Drawer title',
    content: 'Drawer content'
  });

  drawer.setOpen(true);
</script>
```

## Constraints and Caveats

- The root, browser, Vue, and Svelte entries currently render through the React adapter internally, even though their call sites stay framework-agnostic.
- Named instances share one runtime registry per module instance. Reusing the same `id` from different wrappers targets the same drawer on purpose.
- Vue and Svelte wrappers destroy the selected runtime instance when they unmount, so they should be treated as ownership points for that `id`.
- Use `@samline/drawer/react` when you need multiple drawers with independent component trees or nested drawer composition.