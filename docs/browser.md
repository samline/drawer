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

The IIFE bundle inlines the runtime stylesheet — when the script loads, the runtime injects a `<style data-drawer-runtime-styles>` element into the page. You do not need a separate `<link rel="stylesheet">`.

---

## Quick Include

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js"></script>
```

> Pin the version in production. Replace `3.0.0-beta.3` with the version you ship.

---

## Basic Usage

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js"></script>

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

- The browser bundle targets the same shared runtime registry as the root package.
- Loading the script only attaches `window.Drawer`. A drawer is mounted lazily when you call `createDrawer()` or `configureDrawer()`.
- Treat each browser drawer id as an owned runtime instance. If your page removes that flow, swaps to a new id, or rebuilds the integration dynamically, call `destroyDrawer(id)` or `destroyDrawers()` so the shared registry can release the instance.
- Pass `showHandle` to render the built-in handle in plain HTML or CDN usage. If `handleOnly` is enabled, that handle is rendered automatically.
- Add `data-drawer-wrapper` to the page shell element if `shouldScaleBackground` should scale the app behind the drawer.
- Add `data-drawer-no-drag` to interactive descendants inside custom content when those elements should not start a drawer drag.
- Browser usage is the same mounted-host runtime exposed through `window.Drawer`, so shared options keep the same user-facing drawer behavior as the module entrypoints.
- Reusing the same `id` updates the existing runtime instance bound to that browser namespace.

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
- Use the root package instead if you already control the module graph and do not need a browser global.
