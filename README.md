# Drawer

> A small, framework-free drawer runtime for vanilla JS and direct browser usage.

> It binds to a host element, keeps drawer state in sync with the DOM, runs the drag / snap / scale pipeline, and ships a typed controller for the consumer.

---

## Table of Contents

- [Installation](#installation)
- [CDN / Browser](#cdn--browser)
- [Entrypoints](#entrypoints)
- [Quick Start](#quick-start)
- [What You Can Build](#what-you-can-build)
- [API at a Glance](#api-at-a-glance)
- [Presence and Mount Lifecycle](#presence-and-mount-lifecycle)
- [Title and Close Button](#title-and-close-button)
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
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0/dist/browser/global.global.js"></script>
```

> Pin the version in production. Replace `3.0.0` with the version you ship.

The browser bundle exposes a single global: `window.Drawer`.

```html
<form id="contact-form">
  <button id="open-drawer" type="button">Open</button>
</form>

<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0/dist/browser/global.global.js"></script>
<script>
  window.Drawer.createDrawer({
    id: 'demo',
    triggerElement: document.getElementById('open-drawer'),
    direction: 'bottom',
    title: 'Demo',
    content: 'Hello from the browser'
  })
</script>
```

The methods on `window.Drawer` share a module-level registry keyed by `id`. Controllers are not stored as properties on the namespace; inspect them with `window.Drawer.getDrawer(id)` or `window.Drawer.getDrawers()`. `window.Drawer.destroyDrawer(id)` tears down the matching instance and removes it from that registry.

See [docs/browser.md](docs/browser.md) for the full browser surface.

---

## Entrypoints

| Entrypoint                | When to use                                                                  |
| ------------------------- | ---------------------------------------------------------------------------- |
| `@samline/drawer`         | Main vanilla API for bundlers, ESM, or CJS consumers.                        |
| `@samline/drawer/browser` | Pre-bundled IIFE that registers `window.Drawer` for direct `<script>` usage. |

The root entrypoint does not export a `browser` namespace. Bundled applications should import the named registry helpers from `@samline/drawer`; the browser entry is the IIFE that attaches `window.Drawer`.

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
- Positions the content at the `180px` snap on open; the user can drag to `420px` or the zero-offset snap represented by numeric `1`.
- Locks body scroll while the drawer is open (because `modal` defaults to `true`).

---

## What You Can Build

- Mobile-style bottom sheets, side panels, and modal dialogs with a typed controller.
- Nested drawer flows (parent → child) where the parent scales and shifts when the child opens.
- Snap-point flows (Spotify-like mini-player, sheet with a handle, drawer with a "show more" anchor).
- Scale-background flows that dim and shift the page shell while the drawer is dragged open.
- Drawers with a built-in handle, built-in trigger button, or built-in close button — no manual `document.addEventListener` boilerplate.
- Browser / CDN / Shopify / WordPress embeds via the `window.Drawer` IIFE bundle.
- HMR-safe SPAs under Vite using stable ids and explicit teardown.
- Drawers that honour the mobile keyboard through the default-enabled, focus-gated `repositionInputs` pipeline (`fixed` is optional).
- Drawers that opt out of scroll restoration (`preventScrollRestoration: true`).
- Test-friendly flows via the headless `createDrawerController` API (no DOM, no side effects).

---

## API at a Glance

The runtime is built around one factory plus a focused set of helpers. State mutators return snapshots, `update` returns a controller for the same id, and each registry helper's return shape is documented in the per-method reference.

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

## Presence and Mount Lifecycle

`createDrawer` immediately creates a dedicated `<div data-drawer-vanilla-root>` for that drawer in `document.body` or its `container`. An optional built-in trigger is also rendered immediately. Each drawer gets its own host, including drawers that share the same custom container.

The visual dialog uses lazy presence:

1. **Initially closed drawers have no overlay or content in the DOM.** `[data-drawer-overlay]`, `[data-drawer]`, the handle, and the content slots mount only when the drawer opens.
2. **Closing keeps the overlay and content present for the exit.** Their state changes to `closed`, the animation starts from the current rendered transform, and the nodes are removed after the 500 ms transition plus a 100 ms safety window. The host and optional trigger remain until destroy.
3. **`open: true` at creation means "open immediately."** The dialog is visible without an entrance animation. For an animated programmatic open, create it closed and call `setOpen(true)` after mount.
4. **HMR considerations:** if consumer code recreates a drawer with `open: true`, it is opened again on every HMR run. Prefer the closed-then-open pattern when that flash is undesirable.

**Recommended pattern for "open on mount" dialogs:**

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'my-drawer'
  // no `open` here; defaults to closed
})

// Defer open to the next microtask so the entrance animation
// runs after the mount is fully wired.
queueMicrotask(() => drawer.setOpen(true))
```

See [`CommonDrawerOptions.open`](src/core/index.ts) for the full type contract.

## Title and Close Button

The package ships two convenience slots that cover the most common consumer needs.

### Title slot

The `[data-drawer-title]` slot has two roles:

- **Visible title** — pass a string or `HTMLElement` to the `title` option. The package renders it visibly at the top of the drawer body.
- **Accessibility target** — when only `ariaLabel` is provided (no `title`), the package auto-promotes the `ariaLabel` value into the title slot for the `aria-labelledby` reference, and **auto-hides the slot** so the a11y text does not leak visually into the drawer. Pass an explicit `titleVisuallyHidden: false` to opt out of the auto-hide.

```ts
import { createDrawer } from '@samline/drawer'

// Visible title (a heading the user sees)
createDrawer({
  id: 'filters',
  title: 'Filters',
  content: 'Body'
})

// Accessibility-only title (proxy from ariaLabel, auto-hidden)
createDrawer({
  id: 'filters',
  ariaLabel: 'Filters',
  content: 'Body'
})
```

### Built-in close button

Pass `closeButton: true` (or a config object) and the package renders a `<button data-drawer-close>` inside the drawer, wired to `onOpenChange(false)`. This eliminates the need to write a manual `document.addEventListener('click', ...)` listener (which accumulates on Vite HMR cycles and triggers stale-controller bugs).

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'filters',
  content: 'Body',
  closeButton: {
    className: 'absolute top-5 right-5',
    icon: 'xmark', // any string; rendered as <span aria-hidden="true">
    ariaLabel: 'Close'
  }
})
```

The button is removed automatically on re-mount (HMR safety) and on `destroyDrawer`. Its `click` event `stopPropagation()`s so it does not bubble to the drawer's content.

See the [close-button option shape](docs/typescript.md#close-button-option-shape). It is part of `VanillaDrawerOptions`, not a named root type export.

---

## Documentation

Full API reference, guides, and examples are available in [`docs/`](docs/README.md).

| Doc                                                | Purpose                                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [docs/README.md](docs/README.md)                   | Overview, anatomy, and entrypoint selection.                                                         |
| [docs/getting-started.md](docs/getting-started.md) | Concepts, observable contract, lifecycle, side-effect table, registry helpers.                       |
| [docs/options.md](docs/options.md)                 | Every `CommonDrawerOptions` field, with defaults.                                                    |
| [docs/css-styling.md](docs/css-styling.md)         | The data-attribute contract the stylesheet expects.                                                  |
| [docs/typescript.md](docs/typescript.md)           | Exported types, callback signatures, helper return shapes, and non-exported option shapes.           |
| [docs/api/index.md](docs/api/index.md)             | One page per public method.                                                                          |
| [docs/recipes.md](docs/recipes.md)                 | End-to-end patterns: nested drawers, snap points, scale background, handle cycle, viewport keyboard. |
| [docs/browser.md](docs/browser.md)                 | Using `window.Drawer` with a plain `<script>` tag.                                                   |
| [docs/vanilla.md](docs/vanilla.md)                 | The root entrypoint (vanilla JS) in depth.                                                           |
| [CHANGELOG.md](CHANGELOG.md)                       | Version history.                                                                                     |

---

## License

MIT
