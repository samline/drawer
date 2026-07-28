---
title: Browser global
description: Use @samline/drawer without a bundler via the window.Drawer IIFE.
template: doc
sidebar:
  order: 5
---

Use the browser entry when a CDN and a classic script are simpler than a bundler. This page targets the exact `3.0.0` assets.

---

## What it exposes

Loading the browser bundle attaches `window.Drawer` with this API:

- `getParentDrawer`
- `getChildDrawers`
- `openDrawer`
- `closeDrawer`
- `toggleDrawer`
- `updateDrawer`
- `createDrawer`
- `configureDrawer`
- `getDrawer`
- `getDrawers`
- `destroyDrawer`
- `destroyDrawers`
- `createDrawerController`

The IIFE is JavaScript only. It does not contain the runtime stylesheet and does not inject a `<style>` element.

---

## Quick include

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0/dist/browser/global.global.js"></script>
```

:::caution[Pin the version in production]
Keep the CSS and JS URLs pinned to the same exact version. These docs intentionally use `@3.0.0`.
:::

---

## Basic usage

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0/dist/style.css" />

<div data-drawer-wrapper id="app-shell">
  <main>App shell</main>
</div>

<script src="https://unpkg.com/@samline/drawer@3.0.0/dist/browser/global.global.js"></script>
<script>
  window.Drawer.createDrawer({
    id: 'filters',
    triggerText: 'Open drawer',
    showHandle: true,
    direction: 'bottom',
    title: 'Drawer title',
    content: 'Drawer content'
  })
</script>
```

`createDrawer()` registers a closed `filters` instance, creates its dedicated host, and leaves the optional trigger mounted. The overlay and dialog content are created only when the trigger opens the drawer.

---

## Custom HTML content

`title`, `description`, and `content` accept the same `VanillaRenderable` shape as the bundler entry. Build the elements with `document.createElement` and pass them in.

```html
<script>
  const form = document.createElement('form')
  form.id = 'feedback'
  form.innerHTML = `
    <label>Subject <input name="subject" required /></label>
    <label>Message <textarea name="message" required></textarea></label>
    <button type="submit">Send</button>
  `

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const data = new FormData(form)
    console.log('submitted', Object.fromEntries(data))
    window.Drawer.closeDrawer('feedback')
  })

  window.Drawer.createDrawer({
    id: 'feedback',
    title: 'Send feedback',
    content: form,
    closeButton: true
  })
</script>
```

> The browser bundle exposes the same option surface as the root entry. See [Configuration → Renderable content](/drawer/reference/configuration/#renderable-content) for every accepted form.

---

## All methods at a glance

```ts
// Equivalent TypeScript signature of window.Drawer.
interface DrawerApi {
  getParentDrawer: (id?: string | null) => VanillaDrawerController | null
  getChildDrawers: (id?: string | null) => VanillaDrawerController[]
  openDrawer: (id?: string | null) => VanillaDrawerController
  closeDrawer: (id?: string | null) => VanillaDrawerController
  toggleDrawer: (id?: string | null) => VanillaDrawerController
  updateDrawer: (
    idOrOptions?: string | VanillaDrawerOptions | null,
    options?: VanillaDrawerOptions
  ) => VanillaDrawerController
  createDrawer: (options?: VanillaDrawerOptions) => VanillaDrawerController
  configureDrawer: (options?: VanillaDrawerOptions) => VanillaDrawerController
  getDrawer: (id?: string | null) => VanillaDrawerController | null
  getDrawers: () => Record<string, VanillaDrawerController>
  destroyDrawer: (id?: string | null) => void
  destroyDrawers: () => void
  createDrawerController: (options?: CommonDrawerOptions) => CommonDrawerController
}
```

Every method on `window.Drawer` mirrors the named export on the root entry. See [API reference](/drawer/reference/api/) for full per-method documentation.

```html
<script>
  const Drawer = window.Drawer

  // Inspectors.
  const account = Drawer.getDrawer('account') // null until createDrawer runs

  // Mutators.
  Drawer.createDrawer({ id: 'account', content: 'Hello' })
  Drawer.openDrawer('account')
  Drawer.closeDrawer('account')
  Drawer.toggleDrawer('account')
  Drawer.updateDrawer('account', { activeSnapPoint: '420px' })

  // Teardown.
  Drawer.destroyDrawer('account')
  Drawer.destroyDrawers()

  // Headless controller.
  const headless = Drawer.createDrawerController({ id: 'h', defaultOpen: true })
  headless.getSnapshot().state.isOpen // true
</script>
```

---

## Notes

- Loading the script only attaches `window.Drawer`; it does not create a drawer.
- The methods on one loaded IIFE share that bundle's module-level registry. A separately bundled root import is a separate build; do not depend on the two copies sharing instances.
- Each registered id owns a separate `<div data-drawer-vanilla-root="id">`, including when multiple drawers use the same custom `container`.
- Closed drawers use lazy Presence: no overlay or `[data-drawer]` content is mounted initially. During close, those nodes remain for the exit transition and are removed after the safety timeout.
- A built-in `triggerText` button persists while closed. An external `triggerElement` listener also remains bound until it is replaced or the drawer is destroyed.
- `closeDrawer(id)` changes open state but keeps the registry entry, host, and trigger. `destroyDrawer(id)` removes the entry, listeners, host, and owned effects.
- Pass `showHandle` to render the built-in handle in plain HTML or CDN usage. If `handleOnly` is enabled, that handle is rendered automatically.
- Pass `closeButton: true` to render an in-drawer close control.
- Add `data-drawer-wrapper` to the page shell element if `shouldScaleBackground` should scale the app behind the drawer.
- Add `data-drawer-no-drag` to interactive descendants inside custom content when those elements should not start a drawer drag.
- Reusing the same `id` merges options into that registered instance rather than adding another host.
- The runtime never writes `document.body.style.pointerEvents`; application or other modal-library values are preserved.

For bundler code, use root named imports such as `import { createDrawer } from '@samline/drawer'`. There is no `browser` singleton exported from the root package.

---

## TypeScript global type

`DrawerApi` belongs to the browser subpath, not the root type exports. A type-only import is erased from emitted JavaScript and does not load the IIFE:

```ts
import type { DrawerApi } from '@samline/drawer/browser'

declare global {
  interface Window {
    Drawer?: DrawerApi
  }
}
```

---

## Cleanup guidance

The browser entry retains each id until you destroy it. Use explicit teardown when a CMS widget, partial-navigation region, or dynamically rebuilt integration goes away:

```html
<script>
  window.Drawer.createDrawer({
    id: 'settings',
    title: 'Settings',
    content: 'Drawer content'
  })

  window.Drawer.openDrawer('settings')

  function removeSettingsWidget() {
    window.Drawer.destroyDrawer('settings')
  }
</script>
```

Use `destroyDrawer(id)` for one integration and `destroyDrawers()` when the bundle's entire page shell is being torn down or rebuilt. Shared scroll, history, focus, and scale effects restore only when their final owning drawer releases them.

---

## When to use it

- Use it when you need a browser global API.
- Use it for plain HTML pages, embeds, CMS integrations, or demos where a CDN script is simpler than a bundler.
- Use root named exports instead if you control the module graph and do not need `window.Drawer`.
