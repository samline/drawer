# Drawer

> A small, framework-free drawer runtime for vanilla JS and direct browser usage.

> It binds to a host element, keeps drawer state in sync with the DOM, runs the drag / snap / scale pipeline, and ships a typed controller for the consumer.

---

## Table of Contents

- [Installation](#installation)
- [CDN / Browser](#cdn--browser)
- [Entrypoints](#entrypoints)
- [Quick Start](#quick-start)
- [API at a Glance](#api-at-a-glance)
- [Documentation](#documentation)
- [License](#license)

---

## Installation

```bash
npm install @samline/drawer
```

```bash
pnpm add @samline/drawer
```

```bash
bun add @samline/drawer
```

```bash
yarn add @samline/drawer
```

Requires Node 20+ when bundling. Runtime target is ES2020.

---

## CDN / Browser

Use the browser build when you do not have a bundler and need to run the package directly in HTML, Shopify, WordPress, or any traditional template.

```html
<script src="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js"></script>
```

> Pin the version in production. Replace `3.0.0-beta.3` with the version you ship.

The browser bundle exposes a single global: `window.Drawer`.

```html
<form id="contact-form">
  <button id="open-drawer" type="button">Open</button>
</form>

<script src="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js"></script>
<script>
  const drawer = window.Drawer.createDrawer({
    id: 'demo',
    triggerElement: document.getElementById('open-drawer'),
    direction: 'bottom',
    title: 'Demo',
    content: 'Hello from the browser'
  })

  document.getElementById('open-drawer').addEventListener('click', function () {
    drawer.setOpen(true)
  })
</script>
```

The browser surface keeps a small registry under `window.Drawer`, keyed by the `id` you pass to `window.Drawer.createDrawer`. Each successful `createDrawer` call stores the returned controller there, and `window.Drawer.destroyDrawer(id)` calls `destroy()` and removes the entry. Use `window.Drawer.createDrawer` directly when you need the factory without the registry side-effect.

See [docs/browser.md](docs/browser.md) for the full browser surface.

---

## Entrypoints

| Entrypoint                | When to use                                                                  |
| ------------------------- | ---------------------------------------------------------------------------- |
| `@samline/drawer`         | Main vanilla API for bundlers, ESM, or CJS consumers.                        |
| `@samline/drawer/browser` | Pre-bundled IIFE that registers `window.Drawer` for direct `<script>` usage. |

The root entrypoint also exports `browser`, the same `{ createDrawer, openDrawer, … }` surface as the IIFE but as a module-level singleton (no `globalThis` side-effect). Use it from a bundler when you want the registry helpers without the IIFE — see [docs/vanilla.md](docs/vanilla.md#runtime-helpers).

---

## Quick Start

```ts
import { createDrawer } from '@samline/drawer'
import '@samline/drawer/styles.css'

const drawer = createDrawer({
  id: 'filters',
  direction: 'bottom',
  title: 'Filters',
  content: 'Filter body',
  showHandle: true,
  snapPoints: ['180px', '420px', 1],
  activeSnapPoint: '180px'
})

drawer.setOpen(true)
```

What this does:

- Binds a controller to the id `filters`. Reusing the id is an update, not a second mount.
- Mounts the dialog in the bottom direction with the open transition.
- Renders the built-in handle. Clicking the handle advances the active snap point.
- Positions the content at the `180px` snap on open; the user can drag to `420px` or the full viewport.
- Locks body scroll while the drawer is open (because `modal` defaults to `true`).

---

## API at a Glance

The runtime is built around one factory plus a focused set of helpers. Most methods are chainable; the imperative helpers are fire-and-forget.

| Group                   | Methods                                                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Factory                 | [`createDrawer`](docs/api/create-drawer.md) · [`configureDrawer`](docs/api/configure-drawer.md) · [`createDrawerController`](docs/api/create-drawer-controller.md)                        |
| Inspectors              | [`getDrawer`](docs/api/get-drawer.md) · [`getDrawers`](docs/api/get-drawers.md) · [`getParentDrawer`](docs/api/get-parent-drawer.md) · [`getChildDrawers`](docs/api/get-child-drawers.md) |
| Mutators                | [`updateDrawer`](docs/api/update-drawer.md) · [`openDrawer`](docs/api/open-drawer.md) · [`closeDrawer`](docs/api/close-drawer.md) · [`toggleDrawer`](docs/api/toggle-drawer.md)           |
| Teardown                | [`destroyDrawer`](docs/api/destroy-drawer.md) · [`destroyDrawers`](docs/api/destroy-drawers.md)                                                                                           |
| Properties (controller) | `id` · `element` · `options`                                                                                                                                                              |
| Lifecycle (controller)  | `setOpen` · `setActiveSnapPoint` · `patch` · `update` · `subscribe` · `getSnapshot` · `destroy`                                                                                           |

See the full per-method reference in [`docs/api/`](docs/api/index.md).

---

## Documentation

Full API reference, guides, and examples are available in [`docs/`](docs/README.md).

| Doc                                                | Purpose                                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [docs/README.md](docs/README.md)                   | Overview, anatomy, and entrypoint selection.                                                         |
| [docs/getting-started.md](docs/getting-started.md) | Concepts, observable contract, lifecycle, side-effect table, registry helpers.                       |
| [docs/options.md](docs/options.md)                 | Every `CommonDrawerOptions` field, with defaults.                                                    |
| [docs/css-styling.md](docs/css-styling.md)         | The data-attribute contract the stylesheet expects.                                                  |
| [docs/typescript.md](docs/typescript.md)           | Every exported type, callback signature, and helper return shape.                                    |
| [docs/api/index.md](docs/api/index.md)             | One page per public method.                                                                          |
| [docs/recipes.md](docs/recipes.md)                 | End-to-end patterns: nested drawers, snap points, scale background, handle cycle, viewport keyboard. |
| [docs/browser.md](docs/browser.md)                 | Using `window.Drawer` with a plain `<script>` tag.                                                   |
| [docs/vanilla.md](docs/vanilla.md)                 | The root entrypoint (vanilla JS) in depth.                                                           |
| [CHANGELOG.md](CHANGELOG.md)                       | Version history.                                                                                     |

---

## License

MIT
