# Drawer

A universal drawer package with one shared interaction runtime across React, Vue, Svelte, vanilla JS, and browser/CDN usage.

Drawer is inspired by [Vaul](https://github.com/emilkowalski/vaul) [Docs](https://vaul.emilkowal.ski). The package keeps the original drawer interaction model while making the same user-facing behavior available through different integration styles.

## Installation

```bash
npm install @samline/drawer
```

```bash
bun add @samline/drawer
```

## Quick Start

```ts
import '@samline/drawer/styles.css'
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  direction: 'bottom',
  dismissible: true,
  triggerText: 'Open drawer',
  showHandle: true,
  ariaLabel: 'Filters drawer',
  content: 'Drawer content'
})

drawer.setOpen(true)
```

That quick start renders the built-in trigger inside the vanilla host. If you do not pass `mountElement`, that host is appended to `document.body`. The shared stylesheet provides runtime behavior and the built-in handle, not a finished bottom-sheet theme, so use `triggerElement`, `overlayClassName`, and `contentClassName` when you want a fully styled visible shell. See [docs/vanilla.md](docs/vanilla.md) for the complete styled example.

## Entrypoints

- `@samline/drawer`: vanilla API and shared runtime helpers
- `@samline/drawer/react`: React component API
- `@samline/drawer/browser`: browser global for CDN or plain HTML
- `@samline/drawer/vue`: Vue wrapper over the shared runtime
- `@samline/drawer/svelte`: Svelte action and helpers
- `@samline/drawer/core`: controller and snapshot contracts only
- `@samline/drawer/styles.css`: shared styles

## Full Docs

Use docs/ when you want the full API surface, lifecycle notes, runtime attributes, and framework-specific guidance.

- [docs/README.md](docs/README.md)
- [docs/api.md](docs/api.md)
- [docs/vanilla.md](docs/vanilla.md)
- [docs/browser.md](docs/browser.md)
- [docs/react.md](docs/react.md)
- [docs/vue.md](docs/vue.md)
- [docs/svelte.md](docs/svelte.md)

## Notes

- All entrypoints target the same user-facing drawer behavior for shared options.
- When `shouldScaleBackground` is enabled, add `data-drawer-wrapper` to the app shell element that should scale.
- When a child control should not start dragging, add `data-drawer-no-drag` to that element.
- The public DOM contract uses `data-drawer-*` attributes.

## License

MIT
