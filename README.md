# Drawer

A universal drawer package. Built for teams who need Vaul quality and API, but require seamless integration across multiple frameworks.

Drawer is a package inspired by [Vaul](https://github.com/emilkowalski/vaul). The intention is to complement that work and experiment with a shared runtime for React, Vue, Svelte, vanilla JS, and browser usage.

## Table of Contents

- [Installation](#installation)
- [Entrypoints](#entrypoints)
- [Quick Start](#quick-start)
- [Choose Your Entrypoint](#choose-your-entrypoint)
- [Documentation](#documentation)
- [License](#license)

## Installation

```bash
npm install @samline/drawer
```

```bash
bun add @samline/drawer
```

## Entrypoints

| Entrypoint                   | Use                                                             |
| ---------------------------- | --------------------------------------------------------------- |
| `@samline/drawer`            | Main vanilla API and shared drawer runtime with named instances |
| `@samline/drawer/react`      | React component adapter                                         |
| `@samline/drawer/browser`    | Browser global entry for CDN or plain HTML usage                |
| `@samline/drawer/vue`        | Vue wrapper over the shared runtime                             |
| `@samline/drawer/svelte`     | Svelte action wrapper over the shared runtime                   |
| `@samline/drawer/core`       | Shared controller contracts and state primitives                |
| `@samline/drawer/styles.css` | Shared styles export                                            |

## Quick Start

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  direction: 'bottom',
  dismissible: true,
  triggerText: 'Open drawer',
  title: 'Drawer title',
  description: 'Drawer description',
  content: 'Drawer content'
})

drawer.setOpen(true)
```

## Choose Your Entrypoint

- Use `@samline/drawer` when you want a simple programmatic API with named instances, imperative helpers, and parent-child coordination.
- Use `@samline/drawer/react` when you want the full component model with `Drawer.Root`, `Drawer.Trigger`, `Drawer.Content`, nested drawers, and the same imperative helpers.
- Use `@samline/drawer/browser` when you want a browser global API for CDN, embeds, or plain HTML usage.
- Use `@samline/drawer/vue` when you want a Vue wrapper that syncs props into the shared runtime and optionally installs `DrawerPlugin`.
- Use `@samline/drawer/svelte` when you want a Svelte action or a programmatic `mountDrawer` helper over the shared runtime.
- Use `@samline/drawer/core` when you only need the controller and snapshot contracts without rendering UI.

## Documentation

Use the dedicated docs when you want the full surface area or framework-specific guidance.

- [docs/README.md](docs/README.md)
- [docs/api.md](docs/api.md)
- [docs/vanilla.md](docs/vanilla.md)
- [docs/browser.md](docs/browser.md)
- [docs/react.md](docs/react.md)
- [docs/vue.md](docs/vue.md)
- [docs/svelte.md](docs/svelte.md)

## CDN

Drawer ships a browser bundle for CDN and plain HTML usage through `dist/browser/index.js`.

That build attaches `window.Drawer` and can be used without a bundler.

## License

MIT
