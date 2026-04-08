# Svelte

Use the Svelte entry when you want a Svelte action or an imperative `mountDrawer()` helper over the shared runtime.

## Install

```bash
bun add @samline/drawer svelte
```

## Basic Usage

```svelte
<script lang="ts">
  import { drawer } from '@samline/drawer/svelte';

  if (typeof document !== 'undefined') {
    document.querySelector('#app-shell')?.setAttribute('data-drawer-wrapper', '');
  }

  const options = {
    triggerText: 'Open drawer',
    showHandle: true,
    title: 'Drawer title',
    description: 'Drawer description',
    content: 'Drawer content',
    direction: 'bottom'
  };
</script>

<span use:drawer={options} hidden aria-hidden="true" />
```

## Complete Example

```svelte
<script lang="ts">
  import { drawer, mountDrawer, getDrawer } from '@samline/drawer/svelte';

  const options = {
    triggerText: 'Open filters',
    showHandle: true,
    title: 'Filters',
    description: 'Adjust the visible results.',
    content: 'Drawer content',
    snapPoints: ['180px', '420px', 1],
    shouldScaleBackground: true
  };

  function openFromCode() {
    mountDrawer(options);
    getDrawer()?.setOpen(true);
  }
</script>

<button type="button" on:click={openFromCode}>Open from code</button>
<span use:drawer={options} hidden aria-hidden="true" />
```

## Common Patterns

- Pass `id` when the Svelte component should own a specific runtime instance.
- Pass `parentId` when the action should behave as a child drawer.
- Pass `showHandle` when the shared host should render the built-in handle.
- Use the `drawer` action when the Svelte component should own the selected drawer lifecycle.
- Use `mountDrawer()` when you want to mount or refresh the same instance imperatively.
- Use `getDrawer()` to read the current controller and open or reconfigure it from event handlers.

If `handleOnly` is enabled, the shared host renders the built-in handle automatically.

If `shouldScaleBackground` is enabled, add `data-drawer-wrapper` to the app shell element that should scale behind the drawer.

If custom content includes controls that should keep their own pointer gestures, add `data-drawer-no-drag` to those elements.

## Lifecycle and Cleanup

- The action calls `createDrawer()` immediately and updates the selected runtime instance when its value changes.
- Destroying the action calls `destroyDrawer(id)`, which tears down that instance.

## Integration Notes

- The Svelte entry drives the shared mounted host through an action or `mountDrawer()` helper instead of rendering a separate Svelte-native drawer tree.
- As with Vue and the browser entry, it targets the same shared runtime used by the root package.