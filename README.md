# @samline/drawer

Accessible bottom sheets and side panels for JavaScript, TypeScript and browser-based frameworks. No framework runtime or peer dependency required.

[Demo](https://samline.github.io/drawer/) · [Examples](https://samline.github.io/drawer/examples/) · [Documentation](https://samline.github.io/drawer/docs/) · [Changelog](CHANGELOG.md)

## Installation

```sh
npm install @samline/drawer
```

pnpm, Bun and Yarn can install the same package. Package tooling requires Node.js 20+; browser output targets ES2020.

## Quick start

Create a trigger, load the runtime stylesheet and give the panel its own positioning and appearance. Keep the returned controller: it owns opening, updates and cleanup.

```html
<button id="open-filters" type="button" aria-haspopup="dialog">Open filters</button>
```

```js
import { createDrawer } from '@samline/drawer'
import '@samline/drawer/styles.css'
import './drawer.css'

const drawer = createDrawer({
  triggerElement: document.getElementById('open-filters'),
  title: 'Filters',
  content: 'Choose what you want to see.',
  contentClassName: 'drawer-panel',
  overlayClassName: 'drawer-overlay',
  closeButton: { icon: '×', ariaLabel: 'Close filters' },
  autoFocus: true
})
```

```css
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgb(0 0 0 / 45%);
}
.drawer-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-height: 90dvh;
  padding: 1.5rem;
  border-radius: 1.5rem 1.5rem 0 0;
  background: white;
  color: #24212b;
}
.drawer-panel [data-drawer-body] {
  flex: 0 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.drawer-panel [data-drawer-close] {
  flex-shrink: 0;
  margin: 0.75rem 0 0 auto;
}
```

The trigger opens the drawer; Escape, the backdrop and the close button dismiss it. Programmatic actions use the same owned instance:

```js
drawer.setOpen(true)
drawer.update({ content: 'Your filters are ready.' })
drawer.setOpen(false)
// When the owning component or page leaves:
drawer.destroy()
```

## One lifecycle

- Each `createDrawer()` creates an independent instance. Omitted ids are generated; supply an id only for explicit lookup or parent relationships.
- Explicit duplicate ids throw. Use `drawer.update()` to change an existing instance.
- Closing preserves the instance for reopening; destroying releases its registry entry, listeners, subscriptions, timers and owned effects.
- Destruction is final: stale handles cannot recreate a drawer or affect a new instance with the same id. Repeated `destroy()` is harmless; other methods on a destroyed controller throw.
- `setOpen()`, `update()` and `setActiveSnapPoint()` return the resulting snapshot. `subscribe()` fires immediately and returns an unsubscribe function.

## Registry queries

```js
import { createDrawer, getDrawer, getDrawers, destroyDrawers } from '@samline/drawer'

const filters = createDrawer({ id: 'filters', title: 'Filters' })
getDrawer('filters') === filters // true
getDrawer('missing') // null; does not create
Object.keys(getDrawers()) // ['filters']
// On whole-application teardown, when you own every registered instance:
destroyDrawers()
```

`getDrawers()` returns a fresh object containing the same stable controller objects. `getParentDrawer(id)` and `getChildDrawers(id)` inspect nested relationships. Prefer a local controller when a component already owns it.

## Content and accessibility

Strings are plain text. Pass an HTMLElement or a factory returning one for custom UI; native templates are useful when fresh DOM is needed on each open. Keep persistent form data in application state. Supply an accessible title or label, label your inputs and provide a usable close action. Reading-only scroll regions need a named keyboard focus target. See [content, styling and accessibility](https://samline.github.io/drawer/docs/reference/configuration/).

## Capabilities

- Top, bottom, left and right panels, with matching consumer CSS.
- Native pointer dragging, handle-only dragging, snap points and programmatic snap selection.
- Modal focus containment, Escape/backdrop dismissal, background isolation and focus restoration.
- Independent non-modal panels and optional overlays.
- Parent/child drawers, shared scroll ownership and optional background scaling.
- Focus-gated mobile keyboard positioning and viewport handling.
- Dynamic content, lifecycle callbacks and observable state.

[Working examples](https://samline.github.io/drawer/examples/) include forms, long content, nested panels and controlled snap sizes. [Framework integrations](https://samline.github.io/drawer/docs/guides/frameworks/) covers React, Vue, Svelte, Astro, Shopify and WordPress using this same API.

## HTML / CDN

Load matching versioned runtime CSS and JavaScript, then replace the import with `window.Drawer.createDrawer`. Keep the same panel stylesheet and controller lifecycle.

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@5.0.1/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@5.0.1/dist/browser/global.global.js"></script>
```

Use local `dist` files before publishing the new version. ESM/CommonJS are module formats; CDN or self-hosted files are delivery choices. The optional `@samline/drawer/browser` module exports a `Drawer` namespace with the same functions and no global side effect.

## State without DOM

`createDrawerController()` is the advanced state-only API. It does not register, render, trap focus or lock scrolling. Its `setOpen`, `update`, `setActiveSnapPoint`, `getSnapshot`, `subscribe` and `destroy` methods follow the same state/disposal contract.

## TypeScript

The package includes declarations. Import `VanillaDrawerOptions`/`VanillaDrawerController` for DOM integrations and `CommonDrawerOptions`/`CommonDrawerController` for state-only work. The [TypeScript reference](https://samline.github.io/drawer/docs/reference/typescript/) lists snapshot, direction, content, snap point and callback types.

## Upgrading to v5

V5 removes redundant factories and id-based mutators, unifies updates, makes creation explicit and destruction terminal. See [Breaking changes and replacements](CHANGELOG.md) before upgrading v4 code. Historical method URLs explain their replacement.

## Agent integration

The [Drawer skill](https://samline.github.io/drawer/skills/drawer/SKILL.md) describes v5 integration, lifecycle, content and host ownership. Pass it to an agent or install it using a skills-compatible tool. Verify the installed package version before applying its guidance.

## License

MIT — [LICENSE.md](LICENSE.md).
