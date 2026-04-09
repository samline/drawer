# Vanilla JS

Use the root entry when you want a programmatic API with named instances and shared runtime helpers.

## Install

```bash
bun add @samline/drawer
```

## Basic Usage

```ts
import '@samline/drawer/styles.css';
import { createDrawer } from '@samline/drawer';

document.querySelector('#app-shell')?.setAttribute('data-drawer-wrapper', '');

const drawer = createDrawer({
  id: 'filters',
  triggerText: 'Open drawer',
  showHandle: true,
  title: 'Drawer title',
  description: 'Drawer description',
  content: 'Drawer content',
});

drawer.setOpen(true);
```

## Complete Example

```ts
import '@samline/drawer/styles.css';
import { createDrawer } from '@samline/drawer';

const filters = document.createElement('div');
filters.innerHTML = `
  <form>
    <label>
      Category
      <select>
        <option>All</option>
        <option>Open</option>
        <option>Closed</option>
      </select>
    </label>
  </form>
`;

const drawer = createDrawer({
  id: 'filters',
  direction: 'bottom',
  triggerText: 'Open filters',
  showHandle: true,
  title: 'Filters',
  description: 'Adjust the visible results.',
  content: filters,
  snapPoints: ['180px', '420px', 1],
  shouldScaleBackground: true,
});

drawer.subscribe((snapshot) => {
  console.log(snapshot.state.isOpen, snapshot.state.activeSnapPoint);
});

document.querySelector('[data-open-drawer]')?.addEventListener('click', () => {
  drawer.setOpen(true);
});

document.querySelector('[data-expand-drawer]')?.addEventListener('click', () => {
  drawer.update({ activeSnapPoint: 1 });
});
```

## Common Patterns

- Pass `id` when you need more than the default runtime instance.
- Pass `parentId` when this drawer should follow another drawer's lifecycle.
- Pass `triggerText` to render a built-in button.
- Pass `showHandle` to render the built-in handle in the mounted host.
- Pass `triggerElement` to attach an existing element as the external trigger.
- Pass `mountElement` when the host should live inside a specific DOM subtree.
- If you enable `handleOnly`, the built-in handle is rendered automatically so the drawer keeps a visible drag affordance.
- Use `update()` or `updateDrawer()` when you want to merge new options into the same instance.

If `shouldScaleBackground` is enabled, add `data-drawer-wrapper` to the app shell element that should scale behind the drawer.

If a child node inside your rendered content should not start a drag gesture, add `data-drawer-no-drag` to that element.

Use `title` and `description` when a simple heading block above the body content is enough. If your drawer body defines its own card, panel, or header layout, render that heading block inside `content` so it stays inside the same visual shell.

If the surface should not render any top-level title or description at all, provide `ariaLabel` or `ariaLabelledBy` so the dialog still has an accessible name. Use `ariaDescribedBy` when the accessible description should come from an element inside your custom content. When description is omitted, the mounted host opts out of `aria-describedby` automatically unless you pass `ariaDescribedBy` yourself.

## Runtime Helpers

```ts
import {
  closeDrawer,
  createDrawer,
  getChildDrawers,
  getDrawers,
  openDrawer,
} from '@samline/drawer';

createDrawer({ id: 'account', title: 'Account', content: 'Primary drawer' });
createDrawer({ id: 'security', parentId: 'account', title: 'Security', content: 'Nested drawer' });

openDrawer('account');
console.log(Object.keys(getDrawers()));
console.log(getChildDrawers('account').map((drawer) => drawer.id));
closeDrawer('account');
```

## Lifecycle and Cleanup

```ts
import { createDrawer, destroyDrawer, getDrawer } from '@samline/drawer';

createDrawer({ title: 'Draft', content: 'Unsaved changes' });

getDrawer()?.setOpen(true);

destroyDrawer();
```

`destroyDrawer()` tears down the selected instance. Use `destroyDrawers()` when you want to clear the entire runtime registry.

Treat the vanilla API as an owned lifecycle. If an app creates drawers dynamically, swaps ids, or rebuilds sections of the page over time, the matching runtime instance should be destroyed explicitly so the shared registry can release it.

## Integration Notes

- `title`, `description`, and `content` accept strings, numbers, `HTMLElement`, functions returning `HTMLElement`, `null`, or `undefined`.
- Use `ariaLabel` or `ariaLabelledBy` for drawers like galleries or custom shells that should not render a top-level title node.
- `title` and `description` are rendered before `content` inside the shared vanilla content wrapper.
- The root entry exposes the mounted shared host through a programmatic API instead of framework-specific component composition.
- Reusing the same `id` updates the same runtime instance. It does not create a second drawer.