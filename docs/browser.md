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
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0-beta.4/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0-beta.4/dist/browser/global.global.js"></script>
```

The browser bundle only attaches `window.Drawer`. It does not inject any `<style>` element.

---

## Quick Include

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0-beta.4/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0-beta.4/dist/browser/global.global.js"></script>
```

> Pin the version in production. Replace `3.0.0-beta.4` with the version you ship.

---

## Basic Usage

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0-beta.4/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0-beta.4/dist/browser/global.global.js"></script>

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

## Notes

- All methods on one `window.Drawer` namespace use the same registry. The namespace does not expose controllers as keyed properties; use `getDrawer(id)` or `getDrawers()`.
- Loading the script only attaches `window.Drawer`. Calling `createDrawer()` or `configureDrawer()` creates that drawer's dedicated host and optional trigger immediately; overlay and content mount only while open or exiting.
- Treat each browser drawer id as an owned runtime instance. If your page removes that flow, swaps to a new id, or rebuilds the integration dynamically, call `destroyDrawer(id)` or `destroyDrawers()` so the shared registry can release the instance.
- Pass `showHandle` to render the built-in handle in plain HTML or CDN usage. If `handleOnly` is enabled, that handle is rendered automatically.
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

## When to Use It

- Use it when you need a browser global API.
- Use it for plain HTML pages, embeds, CMS integrations, or demos where a CDN script is simpler than a bundler.
- Use named exports from the root package if you already control the module graph and do not need a browser global. The root does not export a `browser` namespace.
