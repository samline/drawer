# Vanilla JS

Use the root entry when you want one shared mounted drawer with a programmatic API.

## Install

```bash
bun add @samline/drawer
```

## Basic Usage

```ts
import { createDrawer } from '@samline/drawer';

const drawer = createDrawer({
  triggerText: 'Open drawer',
  title: 'Drawer title',
  description: 'Drawer description',
  content: 'Drawer content',
});

drawer.setOpen(true);
```

## Complete Example

```ts
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
  direction: 'bottom',
  triggerText: 'Open filters',
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

- Pass `triggerText` to render a built-in button.
- Pass `triggerElement` to attach an existing element as the external trigger.
- Pass `mountElement` when the host should live inside a specific DOM subtree.
- Use `update()` when you want to merge new options into the same shared host.

## Lifecycle and Cleanup

```ts
import { createDrawer, destroyDrawer, getDrawer } from '@samline/drawer';

createDrawer({ title: 'Draft', content: 'Unsaved changes' });

getDrawer()?.setOpen(true);

destroyDrawer();
```

`destroyDrawer()` unmounts the shared host and clears the stored options.

## Current Limits

- The root entry manages a single shared drawer instance per module.
- `title`, `description`, and `content` accept strings, numbers, `HTMLElement`, functions returning `HTMLElement`, `null`, or `undefined`.
- The current root renderer uses the React adapter internally while keeping the public API framework-agnostic.