# Vue

Use the Vue entry when you want Vue-friendly props and optional plugin installation while still targeting the shared mounted host.

## Install

```bash
bun add @samline/drawer vue
```

## Basic Usage

```ts
import { defineComponent, h } from 'vue';
import { DrawerRoot } from '@samline/drawer/vue';

export default defineComponent({
  setup() {
    return () =>
      h(DrawerRoot, {
        triggerText: 'Open drawer',
        title: 'Drawer title',
        description: 'Drawer description',
        content: 'Drawer content',
        direction: 'bottom',
      });
  },
});
```

## Complete Example

```ts
import { createApp, defineComponent, h, inject, onMounted } from 'vue';
import { DrawerPlugin, DrawerRoot } from '@samline/drawer/vue';

const App = defineComponent({
  setup() {
    const drawerApi = inject<{ getDrawer: () => ReturnType<typeof import('@samline/drawer/vue').getDrawer> }>('drawer:api');

    onMounted(() => {
      drawerApi?.getDrawer()?.setOpen(true);
    });

    return () =>
      h(DrawerRoot, {
        triggerText: 'Open filters',
        title: 'Filters',
        description: 'Adjust the visible results.',
        content: 'Drawer content',
        snapPoints: ['180px', '420px', 1],
        shouldScaleBackground: true,
      });
  },
});

createApp(App).use(DrawerPlugin).mount('#app');
```

## Common Patterns

- Render `DrawerRoot` once near the part of the app that owns the shared drawer.
- Install `DrawerPlugin` if you want `DrawerRoot` registered globally and access to `$drawer` or the `drawer:api` injection key.
- Update props reactively to reconfigure the same shared host.

## Lifecycle and Cleanup

- `DrawerRoot` synchronizes props into the shared host on mount and on prop updates.
- Unmounting `DrawerRoot` calls `destroyDrawer()`, so it should be treated as the owner of the mounted drawer instance.

## Current Limits

- Vue does not render an independent native drawer tree. It drives the shared mounted host from the root entry.
- Because the host is shared, mounting multiple Vue wrappers against the same module instance will overwrite one another's configuration.