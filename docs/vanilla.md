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

That basic example proves the runtime, but it does not ship a finished bottom-sheet theme. `triggerText` renders a built-in button inside the mounted host, and when `mountElement` is omitted that host is appended to `document.body`. That is why the trigger can appear at the end of the page while the drawer state changes in the DOM but the surface still looks mostly unstyled.

If you want the vanilla entry to look like a polished drawer demo, keep the runtime API and add your own shell styles with `triggerElement`, `overlayClassName`, and `contentClassName`.

## Styled Complete Example

```html
<div data-drawer-wrapper id="app-shell">
  <main>App shell</main>
  <button id="open-filters" class="drawer-demo-trigger" type="button">Open filters</button>
</div>
```

```css
.drawer-demo-trigger {
  border: 0;
  border-radius: 9999px;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  padding: 12px 18px;
}

.drawer-demo-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.68);
}

.drawer-demo-content {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 101;
  display: flex;
  flex-direction: column;
  background: #e5e7eb;
  border-radius: 24px 24px 0 0;
  min-height: 320px;
  max-height: calc(100vh - 24px);
  outline: none;
}

.drawer-demo-handle {
  margin: 12px auto;
  height: 6px;
  width: 48px;
  border-radius: 9999px;
  background: #0f172a;
  opacity: 0.2;
}

.drawer-demo-panel {
  flex: 1;
  border-radius: 24px 24px 0 0;
  background: #ffffff;
  padding: 32px 20px 24px;
  overflow: auto;
}

.drawer-demo-inner {
  margin: 0 auto;
  max-width: 28rem;
}

.drawer-demo-title {
  margin: 0 0 12px;
  color: #111827;
  font-size: 1.875rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.drawer-demo-description {
  margin: 0 0 20px;
  color: #4b5563;
  line-height: 1.7;
}

.drawer-demo-field {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
  color: #111827;
  font-weight: 600;
}

.drawer-demo-field select,
.drawer-demo-field input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
  color: #111827;
  font: inherit;
  padding: 12px 14px;
}

.drawer-demo-footer {
  border-top: 1px solid #d1d5db;
  background: #e5e7eb;
  padding: 20px;
}

.drawer-demo-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin: 0 auto;
  max-width: 28rem;
}

.drawer-demo-actions button {
  border: 0;
  border-radius: 9999px;
  cursor: pointer;
  font: inherit;
  padding: 10px 16px;
}

.drawer-demo-secondary {
  background: #cbd5e1;
  color: #0f172a;
}

.drawer-demo-primary {
  background: #111827;
  color: #ffffff;
}
```

```ts
import '@samline/drawer/styles.css';
import { createDrawer } from '@samline/drawer';

const trigger = document.getElementById('open-filters');

if (!(trigger instanceof HTMLElement)) {
  throw new Error('Missing #open-filters trigger element.');
}

const panel = document.createElement('div');
panel.innerHTML = `
  <div class="drawer-demo-panel">
    <div class="drawer-demo-inner">
      <h2 id="filters-title" class="drawer-demo-title">Filters</h2>
      <p id="filters-description" class="drawer-demo-description">
        Adjust the visible results without leaving the current screen.
      </p>
      <label class="drawer-demo-field">
        Category
        <select data-drawer-no-drag>
          <option>All</option>
          <option>Open</option>
          <option>Closed</option>
        </select>
      </label>
      <label class="drawer-demo-field">
        Search
        <input data-drawer-no-drag type="text" placeholder="Filter by keyword" />
      </label>
    </div>
  </div>
  <div class="drawer-demo-footer">
    <div class="drawer-demo-actions">
      <button class="drawer-demo-secondary" data-close-drawer type="button">Cancel</button>
      <button class="drawer-demo-primary" data-close-drawer type="button">Apply</button>
    </div>
  </div>
`;

const drawer = createDrawer({
  id: 'filters',
  direction: 'bottom',
  triggerElement: trigger,
  showHandle: true,
  handleClassName: 'drawer-demo-handle',
  overlayClassName: 'drawer-demo-overlay',
  contentClassName: 'drawer-demo-content',
  ariaLabelledBy: 'filters-title',
  ariaDescribedBy: 'filters-description',
  content: panel,
  shouldScaleBackground: true,
});

drawer.subscribe((snapshot) => {
  console.log(snapshot.state.isOpen, snapshot.state.activeSnapPoint);
});

panel.querySelector('[data-close-drawer]')?.addEventListener('click', () => {
  drawer.setOpen(false);
});
```

If you later add `snapPoints` to a vanilla drawer, make sure the drawer shell is tall enough to reach those positions. Snap point offsets are measured from the viewport size, not from the content's natural height, so a short panel can end up fully off-screen while the overlay still opens.

## Common Patterns

- Pass `id` when you need more than the default runtime instance.
- Pass `parentId` when this drawer should follow another drawer's lifecycle.
- Pass `triggerText` to render a built-in button inside the mounted host.
- Pass `showHandle` to render the built-in handle in the mounted host.
- Pass `triggerElement` when the trigger should stay in your own DOM tree.
- Pass `mountElement` when the host should live inside a specific DOM subtree instead of being appended to `document.body`.
- Pass `overlayClassName`, `contentClassName`, and `handleClassName` when you want a visible shell instead of only the shared runtime styles.
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
- `@samline/drawer/styles.css` provides the shared runtime animations, transforms, and handle styles. It does not provide a complete overlay or panel theme for your app.
- When `mountElement` is omitted, the vanilla host is created automatically and appended to `document.body`.
- The root entry exposes the mounted shared host through a programmatic API instead of framework-specific component composition.
- Reusing the same `id` updates the same runtime instance. It does not create a second drawer.