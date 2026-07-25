# Vanilla JS

Use the root entry when you want a programmatic API with named instances and shared runtime helpers. This is the primary — and only — runtime entrypoint of `@samline/drawer` since v3.0.0.

If you want a `<script>`-only setup without a bundler, see [docs/browser.md](browser.md).

---

## Install

```bash
bun add @samline/drawer
```

```bash
npm install @samline/drawer
```

```bash
pnpm add @samline/drawer
```

```bash
yarn add @samline/drawer
```

Requires Node 20+ when bundling. Runtime target is ES2020.

---

## Quick Start

```ts
import '@samline/drawer/styles.css'
import { createDrawer } from '@samline/drawer'

document.querySelector('#app-shell')?.setAttribute('data-drawer-wrapper', '')

const drawer = createDrawer({
  id: 'filters',
  triggerText: 'Open drawer',
  showHandle: true,
  direction: 'bottom',
  title: 'Drawer title',
  description: 'Drawer description',
  content: 'Drawer content'
})

drawer.setOpen(true)
```

That quick start renders the built-in trigger inside the vanilla host. If you do not pass `mountElement`, that host is appended to `document.body`. The shared stylesheet provides runtime behavior and the built-in handle, not a finished bottom-sheet theme — use `triggerElement`, `overlayClassName`, and `contentClassName` when you want a fully styled visible shell.

---

## API at a glance

```ts
import {
  createDrawer,
  configureDrawer,
  getDrawer,
  getDrawers,
  getParentDrawer,
  getChildDrawers,
  updateDrawer,
  openDrawer,
  closeDrawer,
  toggleDrawer,
  destroyDrawer,
  destroyDrawers,
  createDrawerController
} from '@samline/drawer'
```

The full per-method reference is under [`docs/api/`](api/index.md).

---

## Common Patterns

- Pass `id` when you need more than the default runtime instance.
- Pass `parentId` when this drawer should follow another drawer's lifecycle.
- Pass `triggerText` to render a built-in button inside the mounted host.
- Pass `triggerElement` when you want an external button and the same custom shell used in the styled example below.
- Pass `showHandle` to render the built-in handle in the mounted host.
- `showHandle` is optional when `handleOnly` is enabled. `handleOnly` already renders the built-in handle and also restricts dragging to that handle.
- Pass `mountElement` when the host should live inside a specific DOM subtree instead of being appended to `document.body`.
- Pass `overlayClassName`, `contentClassName`, and `handleClassName` when you want a visible shell instead of only the shared runtime styles.
- If you enable `handleOnly`, the built-in handle is rendered automatically so the drawer keeps a visible drag affordance.
- If `shouldScaleBackground` is enabled, add `data-drawer-wrapper` to the app shell element that should scale behind the drawer.
- If a child node inside your rendered content should not start a drag gesture, add `data-drawer-no-drag` to that element.
- Use `title` and `description` when a simple heading block above the body content is enough. If your drawer body defines its own card, panel, or header layout, render that heading block inside `content` so it stays inside the same visual shell.
- If the surface should not render any top-level title or description at all, provide `ariaLabel` or `ariaLabelledBy` so the dialog still has an accessible name. Use `ariaDescribedBy` when the accessible description should come from an element inside your custom content. When description is omitted, the mounted host opts out of `aria-describedby` automatically unless you pass `ariaDescribedBy` yourself.
- When you point `ariaLabelledBy` or `ariaDescribedBy` at custom content, make those ids unique per drawer instance. Deriving them from the drawer `id` is a good default.
- Use `update()` or `updateDrawer()` when you want to merge new options into the same instance.

---

## Runtime Helpers

```ts
import { closeDrawer, createDrawer, getChildDrawers, getDrawers, openDrawer } from '@samline/drawer'

createDrawer({ id: 'account', title: 'Account', content: 'Primary drawer' })
createDrawer({ id: 'security', parentId: 'account', title: 'Security', content: 'Nested drawer' })

openDrawer('account')
console.log(Object.keys(getDrawers())) // ['account', 'security']
console.log(getChildDrawers('account').map((drawer) => drawer.id)) // ['security']
closeDrawer('account')
```

---

## Lifecycle and Cleanup

```ts
import { createDrawer, destroyDrawer, getDrawer } from '@samline/drawer'

const drawer = createDrawer({ id: 'draft', title: 'Draft', content: 'Unsaved changes' })

getDrawer()?.setOpen(true)

destroyDrawer('draft')
```

`destroyDrawer` tears down the drawer's host and removes it from the registry. Use `destroyDrawers()` when you want to clear the entire registry.

Treat the vanilla API as an owned lifecycle. If an app creates drawers dynamically, swaps ids, or rebuilds sections of the page over time, the matching runtime instance should be destroyed explicitly so the shared registry can release it.

---

## Integration Notes

- `title`, `description`, and `content` accept strings, numbers, `HTMLElement`, functions returning `HTMLElement`, `null`, or `undefined`.
- Use `ariaLabel` or `ariaLabelledBy` for drawers like galleries or custom shells that should not render a top-level title node.
- `title` and `description` are rendered before `content` inside the shared vanilla content wrapper.
- `@samline/drawer/styles.css` provides the shared runtime animations, transforms, and handle styles. It does not provide a complete overlay or panel theme for your app.
- When `mountElement` is omitted, the vanilla host is created automatically and appended to `document.body`.
- The root entry exposes the mounted shared host through a programmatic API instead of framework-specific component composition.
- Reusing the same `id` updates the same runtime instance. It does not create a second drawer.
