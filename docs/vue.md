# Vue

Use the Vue entry when you want Vue-friendly props and optional plugin installation while still targeting the shared runtime.

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
    document.querySelector('#app-shell')?.setAttribute('data-drawer-wrapper', '');

    return () =>
      h(DrawerRoot, {
        triggerText: 'Open drawer',
        showHandle: true,
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
        showHandle: true,
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

- Pass `id` when the Vue wrapper should own a specific runtime instance.
- Pass `parentId` when the wrapper should behave as a child of another drawer instance.
- Pass `showHandle` when the shared host should render the built-in handle.
- Render `DrawerRoot` once near the part of the app that owns the selected drawer id.
- Install `DrawerPlugin` if you want `DrawerRoot` registered globally and access to `$drawer` or the `drawer:api` injection key.
- Update props reactively to reconfigure the same runtime instance.

If `handleOnly` is enabled, the shared host renders the built-in handle automatically.

If `shouldScaleBackground` is enabled, add `data-drawer-wrapper` to the app shell element that should scale behind the drawer.

If custom content includes controls that should keep their own pointer gestures, add `data-drawer-no-drag` to those elements.

## Lifecycle and Cleanup

- `DrawerRoot` synchronizes props into the shared runtime on mount and on prop updates.
- Unmounting `DrawerRoot` calls `destroyDrawer(id)`, so it should be treated as the owner of the selected runtime instance.

## Integration Notes

- Vue drives the shared mounted host through props instead of rendering a separate Vue-native drawer tree.
- Reusing the same `id` from multiple Vue wrappers intentionally targets the same instance, so ownership should stay clear at the app level.