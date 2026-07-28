# Browser / CDN

Use the browser entry when you want a browser-facing global API from a CDN or plain HTML page. The browser bundle is designed for environments without a bundler and without `script type="module"`.

---

## What It Exposes

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

The IIFE bundle is a pure JS bundle — it does **not** include the stylesheet. Link the CSS separately:

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0/dist/browser/global.global.js"></script>
```

The browser bundle only attaches `window.Drawer`. It does not inject any `<style>` element.

---

## Quick Include

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0/dist/browser/global.global.js"></script>
```

> Pin the version in production. Replace `3.0.0` with the version you ship.

---

## Basic Usage

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0/dist/browser/global.global.js"></script>

<div data-drawer-wrapper id="app-shell">
  <main>App shell</main>
</div>

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

That is the same basic drawer used across the other entrypoints. The browser bundle just reaches it through `window.Drawer`.

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

> The browser bundle exposes the same option surface as the root entry. See [Options → Renderable content](options.md#renderable-content) for every accepted form.

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

Every method on `window.Drawer` mirrors the named export on the root entry. See [API reference](api/index.md) for full per-method documentation.

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

- All methods on one `window.Drawer` namespace use the same registry. The namespace does not expose controllers as keyed properties; use `getDrawer(id)` or `getDrawers()`.
- Loading the script only attaches `window.Drawer`. Calling `createDrawer()` or `configureDrawer()` creates that drawer's dedicated host and optional trigger immediately; overlay and content mount only while open or exiting.
- Treat each browser drawer id as an owned runtime instance. If your page removes that flow, swaps to a new id, or rebuilds the integration dynamically, call `destroyDrawer(id)` or `destroyDrawers()` so the shared registry can release the instance.
- Pass `showHandle` to render the built-in handle in plain HTML or CDN usage. If `handleOnly` is enabled, that handle is rendered automatically.
- Pass `closeButton: true` to render an in-drawer close control.
- Add `data-drawer-wrapper` to the page shell element if `shouldScaleBackground` should scale the app behind the drawer.
- Add `data-drawer-no-drag` to interactive descendants inside custom content when those elements should not start a drawer drag.
- Browser usage is the same mounted-host runtime exposed through `window.Drawer`, so shared options keep the same user-facing drawer behavior as the module entrypoints.
- Reusing the same `id` updates the existing runtime instance bound to that browser namespace. Distinct ids remain isolated, including when their hosts share one custom `container`.

---

## Cleanup Guidance

When browser usage is long-lived, the most important lifecycle rule is that `createDrawer()` is not fire-and-forget. The browser entry stores runtime instances in a shared registry until you destroy them.

```html
<script>
  const drawer = window.Drawer.createDrawer({
    id: 'settings',
    title: 'Settings',
    content: 'Drawer content'
  })

  drawer.setOpen(true)

  window.addEventListener('beforeunload', function () {
    window.Drawer.destroyDrawer('settings')
  })
</script>
```

Use `destroyDrawer(id)` when a specific integration is being replaced. Use `destroyDrawers()` when the whole page shell is being torn down or rebuilt.

---

## TypeScript global type

`DrawerApi` comes from the browser subpath, not the root type exports. A type-only import is erased from emitted JavaScript and does not pull the IIFE into the bundle:

```ts
import type { DrawerApi } from '@samline/drawer/browser'

declare global {
  interface Window {
    Drawer?: DrawerApi
  }
}
```

There is no `browser` singleton exported from the root entrypoint. Importing `@samline/drawer/browser` for the type only does not load the IIFE.

---

## When to Use It

- Use it when you need a browser global API.
- Use it for plain HTML pages, embeds, CMS integrations, or demos where a CDN script is simpler than a bundler.
- Use named exports from the root package if you already control the module graph and do not need a browser global. The root does not export a `browser` namespace.
