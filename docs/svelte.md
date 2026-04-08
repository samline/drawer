# Svelte

Use the Svelte entry when you want a Svelte action or an imperative `mountDrawer()` helper over the shared mounted host.

## Install

```bash
bun add @samline/drawer svelte
```

## Basic Usage

```svelte
<script lang="ts">
  import { drawer } from '@samline/drawer/svelte';

  const options = {
    triggerText: 'Open drawer',
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

- Use the `drawer` action when the Svelte component should own the shared drawer lifecycle.
- Use `mountDrawer()` when you want to mount or refresh the shared host imperatively.
- Use `getDrawer()` to read the current controller and open or reconfigure it from event handlers.

## Lifecycle and Cleanup

- The action calls `createDrawer()` immediately and updates the shared host when its value changes.
- Destroying the action calls `destroyDrawer()`, which tears down the shared host.

## Current Limits

- The Svelte entry does not render a separate Svelte-native drawer implementation.
- As with Vue and the browser entry, it targets the same module-level shared host used by the root package.