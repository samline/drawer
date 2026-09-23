# Drawer docs

This is the markdown reference for `@samline/drawer` v4.0.1, a framework-agnostic vanilla drawer runtime with module entrypoints and a `window.Drawer` browser bundle. The same content is served as a Starlight site at [samline.github.io/drawer](https://samline.github.io/drawer).

---

## Index

### Learn

- [Getting started](getting-started.md) — installation, first drawer, anatomy of the runtime, and the shortest path to a working integration.
- [Lifecycle and state](guides/lifecycle-and-state.md) — ids, lazy presence, open vs. close vs. destroy, callbacks, updates, subscriptions, and SPA cleanup.
- [Gestures and snap points](guides/gestures-and-snap-points.md) — direction-aware drag behavior, ordered snap points, handle cycling, thresholds, nested drawers, and background scaling.
- [Accessibility and focus](guides/accessibility-and-focus.md) — accessible names and descriptions, modal focus ownership, dismissal, controls inside draggable content, and testing.
- [Recipes](recipes.md) — end-to-end patterns: custom HTML content, nested drawers, snap points, scale background, handle cycle, viewport keyboard, programmatic open/close, multiple drawers, SPA lifecycle, common pitfalls.

### Reference

- [Controller and registry](controller.md) — instance methods, id-based helpers, return values, headless state, and synchronization rules.
- [Entrypoints and module formats](entrypoints.md) — ESM, CommonJS, browser namespace, standalone IIFE, and stylesheet exports.
- [Options](options.md) — every `CommonDrawerOptions` and `VanillaDrawerOptions` field with defaults, behaviour, and an example for every row. Includes the dedicated [Renderable content](options.md#renderable-content) section for `string` / `number` / `HTMLElement` / `() => HTMLElement` slots.
- [CSS styling](css-styling.md) — every runtime data-attribute, the consumer markers (`data-drawer-wrapper`, `data-drawer-no-drag`), inline writes, scale ownership, position all four directions.
- [TypeScript reference](typescript.md) — every exported type, callback signature, helper return shape, numeric constant, browser global type.
- [API reference](api/index.md) — one page per public method (`createDrawer`, `configureDrawer`, `createDrawerController`, `openDrawer`, `closeDrawer`, `toggleDrawer`, `updateDrawer`, `getDrawer`, `getDrawers`, `getParentDrawer`, `getChildDrawers`, `destroyDrawer`, `destroyDrawers`).
- [Vanilla](vanilla.md) — the root entrypoint in depth, with the `vanilla` host / dialog / trigger / handle / close-button contract.
- [Browser](browser.md) — using `window.Drawer` from a plain `<script>` tag.

---

## What this package is

`@samline/drawer` exposes a single root entrypoint that manages named drawer instances plus a small `window.Drawer` browser bundle. The runtime is built around three ideas:

- **A module-level registry of drawer instances** keyed by `id`. The default instance (no `id`) is the only one most apps need.
- **A vanilla dialog renderer.** Every drawer owns a dedicated `<div data-drawer-vanilla-root>`. Its overlay and `<div data-drawer>` mount only while open or exiting; the optional built-in trigger can remain in the host while closed.
- **Module and CDN entrypoints.** `@samline/drawer` exposes individual ESM/CJS helpers, `@samline/drawer/browser` exposes an ESM/CJS namespace, and `dist/browser/global.global.js` is the IIFE for classic `<script>` tags.

The drag pipeline (Phases A–E in `CHANGELOG.md`) is fully wired: snap points, scale background, handle cycle, viewport/keyboard handling, and the dismiss-on-drag threshold.

---

## When to use each entrypoint

| Situation                                                              | Use                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Modern app with a bundler (Vite, esbuild, Rollup, Webpack, Bun, Astro) | Named exports from `@samline/drawer`                                            |
| Plain HTML page, WordPress, Shopify, classic templates                 | The `dist/browser/global.global.js` IIFE through a `<script>` tag               |
| Type-checking the drawer controller from a CDN script                  | `DrawerApi` from `@samline/drawer/browser`                                      |
| You need multiple independent drawers in the same page                 | `createDrawer` with distinct `id` values; each drawer receives a dedicated host |

---

## File-by-file map

| File                                                                     | What is in it                                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [getting-started.md](getting-started.md)                                 | Concepts, observable contract, lifecycle, registry helpers, side-effect table.                                                                                                                                         |
| [guides/lifecycle-and-state.md](guides/lifecycle-and-state.md)           | Registry identity, lazy presence, callbacks, update semantics, subscriptions, and teardown.                                                                                                                            |
| [guides/gestures-and-snap-points.md](guides/gestures-and-snap-points.md) | Drag intent, direction, snap-point units and ordering, handle behavior, nesting, and scaled backgrounds.                                                                                                               |
| [guides/accessibility-and-focus.md](guides/accessibility-and-focus.md)   | Dialog naming, descriptions, focus ownership, dismissal controls, drag opt-outs, and an accessibility checklist.                                                                                                       |
| [controller.md](controller.md)                                           | Controller properties and methods, registry-helper equivalents, return behavior, subscriptions, and headless usage.                                                                                                    |
| [entrypoints.md](entrypoints.md)                                         | Module-format decision table, package subpaths, global behavior, and stylesheet requirements.                                                                                                                          |
| [options.md](options.md)                                                 | Every `CommonDrawerOptions` and `VanillaDrawerOptions` field with defaults, behaviour, and an example per row.                                                                                                         |
| [recipes.md](recipes.md)                                                 | Custom HTML content, renderable slots, lifecycle callbacks, nested drawers, snap points, scale background, handle cycle, viewport keyboard, programmatic open/close, multiple drawers, SPA lifecycle, common pitfalls. |
| [css-styling.md](css-styling.md)                                         | The data-attribute contract the stylesheet expects; theming with CSS variables; inline writes; scale ownership; position all four directions.                                                                          |
| [typescript.md](typescript.md)                                           | Every exported type, callback signature, helper return shape, numeric constant, browser global type.                                                                                                                   |
| [api/index.md](api/index.md)                                             | Overview of the public API.                                                                                                                                                                                            |
| [api/create-drawer.md](api/create-drawer.md)                             | The `createDrawer()` factory and the `VanillaDrawerController` it returns.                                                                                                                                             |
| [api/configure-drawer.md](api/configure-drawer.md)                       | The `createDrawer` alias.                                                                                                                                                                                              |
| [api/get-drawer.md](api/get-drawer.md)                                   | The `getDrawer(id?)` inspector.                                                                                                                                                                                        |
| [api/get-drawers.md](api/get-drawers.md)                                 | The `getDrawers()` registry dump.                                                                                                                                                                                      |
| [api/get-parent-drawer.md](api/get-parent-drawer.md)                     | The `getParentDrawer(id?)` parent inspector.                                                                                                                                                                           |
| [api/get-child-drawers.md](api/get-child-drawers.md)                     | The `getChildDrawers(id?)` children inspector.                                                                                                                                                                         |
| [api/update-drawer.md](api/update-drawer.md)                             | The `updateDrawer()` patcher.                                                                                                                                                                                          |
| [api/open-drawer.md](api/open-drawer.md)                                 | The `openDrawer(id?)` helper.                                                                                                                                                                                          |
| [api/close-drawer.md](api/close-drawer.md)                               | The `closeDrawer(id?)` helper.                                                                                                                                                                                         |
| [api/toggle-drawer.md](api/toggle-drawer.md)                             | The `toggleDrawer(id?)` helper.                                                                                                                                                                                        |
| [api/destroy-drawer.md](api/destroy-drawer.md)                           | The `destroyDrawer(id?)` teardown.                                                                                                                                                                                     |
| [api/destroy-drawers.md](api/destroy-drawers.md)                         | The `destroyDrawers()` full clear.                                                                                                                                                                                     |
| [api/create-drawer-controller.md](api/create-drawer-controller.md)       | The `createDrawerController(options?)` headless controller factory.                                                                                                                                                    |
| [vanilla.md](vanilla.md)                                                 | The root entrypoint in depth, with the vanilla host / dialog / trigger / handle / close-button contract.                                                                                                               |
| [browser.md](browser.md)                                                 | Using `window.Drawer` from a plain `<script>` tag.                                                                                                                                                                     |

---

## Versioning

This documentation matches `@samline/drawer` v4.0.1. Earlier releases and the v3-to-v4 migration notes are tracked in [CHANGELOG.md](../CHANGELOG.md).
