# Drawer

A universal drawer package with one shared interaction runtime across React, Vue, Svelte, vanilla JS, and browser/CDN usage.

Drawer is inspired by [Vaul](https://github.com/emilkowalski/vaul). The package keeps the original drawer interaction model while making the same user-facing behavior available through different integration styles.

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
  showHandle: true,
  title: 'Drawer title',
  description: 'Drawer description',
  content: 'Drawer content'
})

drawer.setOpen(true)
```

## Choose Your Entrypoint

- Use `@samline/drawer` when you want a programmatic mounted-host API with named instances, imperative helpers, and parent-child coordination.
- Use `@samline/drawer/react` when you want direct JSX composition with `Drawer.Root`, `Drawer.Trigger`, `Drawer.Content`, nested drawers, and the same shared interaction behavior.
- Use `@samline/drawer/browser` when you want the same mounted-host behavior through a browser global API for CDN, embeds, or plain HTML usage.
- Use `@samline/drawer/vue` when you want Vue props and lifecycle around that same mounted-host runtime, plus optional `DrawerPlugin` installation.
- Use `@samline/drawer/svelte` when you want a Svelte action or `mountDrawer()` helper over that same mounted-host runtime.
- Use `@samline/drawer/core` when you only need the controller and snapshot contracts without rendering UI.

All public entrypoints target the same user-facing drawer behavior for shared options. The difference between them is how you integrate the drawer into your app, not the resulting UX.

## Documentation

Use the dedicated docs when you want the full surface area or framework-specific guidance.

- [docs/README.md](docs/README.md)
- [docs/api.md](docs/api.md)
- [docs/vanilla.md](docs/vanilla.md)
- [docs/browser.md](docs/browser.md)
- [docs/react.md](docs/react.md)
- [docs/vue.md](docs/vue.md)
- [docs/svelte.md](docs/svelte.md)

## License

MIT
