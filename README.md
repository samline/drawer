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
- [Mount-time Lifecycle](#mount-time-lifecycle)
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

## What You Can Build

- Mobile-style bottom sheets, side panels, and modal dialogs with a typed controller.
- Nested drawer flows (parent → child) where the parent scales and shifts when the child opens.
- Snap-point flows (Spotify-like mini-player, sheet with a handle, drawer with a "show more" anchor).
- Scale-background flows that dim and shift the page shell while the drawer is dragged open.
- Drawers with a built-in handle, built-in trigger button, or built-in close button — no manual `document.addEventListener` boilerplate.
- Browser / CDN / Shopify / WordPress embeds via the `window.Drawer` IIFE bundle.
- HMR-safe SPAs under Vite (use `id` + helper API, not `window.Drawer.available`).
- Drawers that honour the mobile keyboard (`repositionInputs` + `fixed` + `visualViewport`).
- Drawers that opt out of scroll restoration (`preventScrollRestoration: true`).
- Test-friendly flows via the headless `createDrawerController` API (no DOM, no side effects).

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

## Mount-time Lifecycle

Unlike v2, the v3 package mounts the drawer's overlay **at `createDrawer` time**, not when the drawer is first opened. This is a deliberate change to make the package's behavior more predictable and to support features like the mount-time `mouseup` listener for the overlay.

**Implications for consumers:**

1. **The overlay exists on page load**, even if the drawer is closed. The package applies `pointer-events: none` to the closed overlay so it does not capture clicks (see [`src/style.css`](src/style.css) — the `[data-drawer-overlay][data-state="closed"]` rule).
2. **`open: true` at mount means "drawer is open immediately"** — no mount animation runs, and the drawer is visible on page load. For dialogs that should appear on user interaction (e.g. a modal that opens on click), use `open: false` (or omit it) and call `setOpen(true)` later.
3. **HMR considerations**: under Vite HMR, the consumer's script re-runs on every save. If the script creates a drawer with `open: true`, the drawer will be re-opened on every HMR cycle, causing a brief flash. For stable HMR behavior, prefer the `open: false` + `setOpen(true)` pattern (deferred with `queueMicrotask` so the open animation still runs).

**Recommended pattern for "open on mount" dialogs:**

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'my-drawer'
  // no `open` here — defaults to closed
})

// Defer the open to the next microtask so the open animation
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

See [`VanillaCloseButtonOptions`](src/vanilla/render.ts) for the full type contract.

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
