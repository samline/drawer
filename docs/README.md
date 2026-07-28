# Drawer docs

This is the markdown reference for `@samline/drawer` v3.0.0-beta.4, a framework-agnostic vanilla drawer runtime with a root module entrypoint and a `window.Drawer` browser bundle. The same content is served as a Starlight site at [samline.github.io/drawer](https://samline.github.io/drawer); the markdown here is the source of truth.

---

## Index

- [Getting started](getting-started.md) — anatomy of the runtime, observable contract, lifecycle, side-effects, registry helpers.
- [Options](options.md) — every `CommonDrawerOptions` field, with defaults.
- [CSS styling](css-styling.md) — the data-attributes the stylesheet expects, and how to theme it.
- [TypeScript reference](typescript.md) — every exported type, callback signature, and helper return shape.
- [API reference](api/index.md) — one page per public method.
- [Recipes](recipes.md) — end-to-end patterns: nested drawers, snap points, scale background, handle cycle, viewport keyboard.
- [Vanilla](vanilla.md) — the root entrypoint in depth, with the `vanilla` host / dialog / trigger / handle contract.
- [Browser](browser.md) — using `window.Drawer` from a plain `<script>` tag.

---

## What this package is

`@samline/drawer` exposes a single root entrypoint that manages named drawer instances plus a small `window.Drawer` browser bundle. The runtime is built around three ideas:

- **A module-level registry of drawer instances** keyed by `id`. The default instance (no `id`) is the only one most apps need.
- **A vanilla dialog renderer.** Every drawer owns a dedicated `<div data-drawer-vanilla-root>`. Its overlay and `<div data-drawer>` mount only while open or exiting; the optional built-in trigger can remain in the host while closed.
- **Two entrypoints.** `@samline/drawer` (ESM + CJS) for bundlers, and `@samline/drawer/browser` (IIFE) for `<script>` tags. The same surface, no global side-effect from the root entrypoint.

The drag pipeline (Phases A–E in `CHANGELOG.md`) is fully wired: snap points, scale background, handle cycle, viewport/keyboard handling, and the dismiss-on-drag threshold.

---

## When to use each entrypoint

| Situation                                                              | Use                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Modern app with a bundler (Vite, esbuild, Rollup, Webpack, Bun, Astro) | Named exports from `@samline/drawer`                                            |
| Plain HTML page, WordPress, Shopify, classic templates                 | The `@samline/drawer/browser` IIFE through a `<script>` tag                     |
| Type-checking the drawer controller from a CDN script                  | `DrawerApi` from `@samline/drawer/browser`                                      |
| You need multiple independent drawers in the same page                 | `createDrawer` with distinct `id` values; each drawer receives a dedicated host |

---

## File-by-file map

| File                                                               | What is in it                                                                                            |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [getting-started.md](getting-started.md)                           | Concepts, observable contract, lifecycle, registry helpers, side-effect table.                           |
| [options.md](options.md)                                           | Every `CommonDrawerOptions` field with defaults.                                                         |
| [css-styling.md](css-styling.md)                                   | The data-attribute contract the stylesheet expects; theming with CSS variables.                          |
| [typescript.md](typescript.md)                                     | Every exported type, callback signature, helper return shape.                                            |
| [api/index.md](api/index.md)                                       | Overview of the public API.                                                                              |
| [api/create-drawer.md](api/create-drawer.md)                       | The `createDrawer()` factory and the `VanillaDrawerController` it returns.                               |
| [api/configure-drawer.md](api/configure-drawer.md)                 | The `createDrawer` alias.                                                                                |
| [api/get-drawer.md](api/get-drawer.md)                             | The `getDrawer(id?)` inspector.                                                                          |
| [api/get-drawers.md](api/get-drawers.md)                           | The `getDrawers()` registry dump.                                                                        |
| [api/get-parent-drawer.md](api/get-parent-drawer.md)               | The `getParentDrawer(id?)` parent inspector.                                                             |
| [api/get-child-drawers.md](api/get-child-drawers.md)               | The `getChildDrawers(id?)` children inspector.                                                           |
| [api/update-drawer.md](api/update-drawer.md)                       | The `updateDrawer()` patcher.                                                                            |
| [api/open-drawer.md](api/open-drawer.md)                           | The `openDrawer(id?)` helper.                                                                            |
| [api/close-drawer.md](api/close-drawer.md)                         | The `closeDrawer(id?)` helper.                                                                           |
| [api/toggle-drawer.md](api/toggle-drawer.md)                       | The `toggleDrawer(id?)` helper.                                                                          |
| [api/destroy-drawer.md](api/destroy-drawer.md)                     | The `destroyDrawer(id?)` teardown.                                                                       |
| [api/destroy-drawers.md](api/destroy-drawers.md)                   | The `destroyDrawers()` full clear.                                                                       |
| [api/create-drawer-controller.md](api/create-drawer-controller.md) | The `createDrawerController(options?)` headless controller factory.                                      |
| [recipes.md](recipes.md)                                           | Nested drawers, snap points, scale background, handle cycle, viewport keyboard, programmatic open/close. |
| [vanilla.md](vanilla.md)                                           | The root entrypoint in depth, with the vanilla host / dialog / trigger / handle / close-button contract. |
| [browser.md](browser.md)                                           | Using `window.Drawer` from a plain `<script>` tag.                                                       |

---

## Versioning

This documentation matches `@samline/drawer` v3.0.0-beta.4. Earlier releases are tracked in [CHANGELOG.md](../CHANGELOG.md).
