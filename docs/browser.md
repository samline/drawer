# Browser / CDN

Use the browser entry when you want a browser-facing global API from a CDN or plain HTML page.

The browser bundle is designed for environments without a bundler and without `script type="module"`.

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

## Quick Include

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js"></script>
```

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
    description: 'Drawer description',
    content: 'Drawer content'
  })
</script>
```

That is the same basic drawer used across the other entrypoints. The browser bundle just reaches it through `window.Drawer`.

## Styled Bottom Sheet Example

If you want the browser entry to look like a polished bottom-sheet demo, keep the drawer imperative and style the host yourself.

In the styled example below, `showHandle` is omitted on purpose. The browser mounted host already renders the built-in handle when `handleOnly` is `true`, so adding `showHandle: true` there would be redundant. Keep `showHandle` for cases where you want the handle visible without restricting drag to the handle only.

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js"></script>

<div data-drawer-wrapper id="app-shell">
  <main>App shell</main>
  <button id="open-drawer" class="drawer-demo-trigger" type="button">Open drawer</button>
</div>

<style>
  .drawer-demo-trigger {
    appearance: none;
    background: #111827;
    border: 0;
    border-radius: 9999px;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    padding: 12px 18px;
  }

  .drawer-demo-overlay {
    background: rgba(0, 0, 0, 0.8);
    z-index: 100;
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  .drawer-demo-content {
    background: #f3f4f6;
    border-radius: 40px 40px 0 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    height: fit-content;
    left: 0;
    margin-top: 6rem;
    outline: none;
    position: fixed;
    right: 0;
    z-index: 100;
  }

  .drawer-custom-handle {
    margin: 12px auto;
    height: 8px;
    width: 48px;
    border-radius: 9999px;
    background-color: #ec4899;
    cursor: pointer;
  }

  .drawer-demo-panel {
    background: #ffffff;
    border-radius: 40px 40px 0 0;
    flex: 1;
    padding: 40px 20px;
  }

  .drawer-inner-container {
    max-width: 28rem;
    margin: 0 auto;
  }

  .drawer-title {
    margin: 0 0 16px;
    font-size: 30px;
    line-height: 36px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #111827;
  }

  .drawer-description {
    margin: 0 0 16px;
    color: #4b5563;
    font-size: 16px;
    line-height: 28px;
  }

  .drawer-text {
    margin: 0 0 8px;
    color: #374151;
  }

  .drawer-demo-footer {
    background: #f3f4f6;
    border-top: 1px solid #e5e7eb;
    margin-top: auto;
    padding: 20px;
  }

  .drawer-demo-links {
    display: flex;
    font-size: 12px;
    gap: 24px;
    justify-content: flex-end;
    margin: 0 auto;
    max-width: 28rem;
  }

  .drawer-demo-links a {
    color: #4b5563;
    text-decoration: none;
  }
</style>

<script>
  const trigger = document.getElementById('open-drawer')
  const drawerId = 'controlled-drawer'
  const titleId = `${drawerId}-title`
  const descriptionId = `${drawerId}-description`

  window.Drawer.createDrawer({
    id: drawerId,
    triggerElement: trigger,
    direction: 'bottom',
    handleOnly: true,
    overlayClassName: 'drawer-demo-overlay',
    contentClassName: 'drawer-demo-content',
    handleClassName: 'drawer-custom-handle',
    ariaLabelledBy: titleId,
    ariaDescribedBy: descriptionId,
    content: function () {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = `
      <div class="drawer-demo-panel">
        <div class="drawer-inner-container">
          <h2 id="${titleId}" class="drawer-title">
            A controlled drawer.
          </h2>
          <p id="${descriptionId}" class="drawer-description">
            This mirrors the same bottom-sheet demo across every framework adapter.
          </p>
          <p class="drawer-text">
            Use the same overlay, panel, and handle styles so the drawer looks identical no matter which adapter mounts it.
          </p>
          <p class="drawer-text">
            Only the integration syntax changes. The visible result, copy, and layout stay the same.
          </p>
        </div>
      </div>
      <div class="drawer-demo-footer">
        <div class="drawer-demo-links">
          <a href="https://github.com/samline/drawer" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://github.com/samline/drawer/issues" target="_blank" rel="noreferrer">Issues</a>
        </div>
      </div>
    `
      return wrapper
    }
  })
</script>
```

Key points for this style:

- Use `triggerElement` if you want a real button outside the drawer to open it.
- Use `direction: 'bottom'` for a sheet that slides up from the bottom.
- Use `handleOnly: true` when you want the built-in handle rendered automatically and dragging restricted to that affordance.
- Use `showHandle: true` when you want the built-in handle visible but still want drag gestures to start from the full drawer surface.
- Use `overlayClassName` and `contentClassName` to match the demo layout.
- Put the visible heading and supporting copy inside `content` when you need exact control over the internal panel layout.
- Use `ariaLabelledBy` and `ariaDescribedBy` when the accessible heading and description come from elements inside your custom content.
- Add `data-drawer-wrapper` to the page shell when you enable `shouldScaleBackground`.

If the browser drawer is something like a gallery or a fully custom surface with no top-level heading block, use `ariaLabel` instead of `title`. When no description is provided, the browser host opts out of `aria-describedby` automatically unless you pass `ariaDescribedBy` yourself.

When you point `ariaLabelledBy` or `ariaDescribedBy` at elements inside custom content, make those ids unique per drawer instance. Deriving them from the drawer `id` keeps multiple browser drawers on the same page safe.

## When to Use It

- Use it when you need a browser global API.
- Use it for plain HTML pages, embeds, CMS integrations, or demos where a CDN script is simpler than a bundler.
- Use the root package instead if you already control the module graph and do not need a browser global.

## Notes

- The browser bundle targets the same shared runtime registry as the root package.
- Loading the script only attaches `window.Drawer`. A drawer is mounted lazily when you call `createDrawer()` or `configureDrawer()`.
- Treat each browser drawer id as an owned runtime instance. If your page removes that flow, swaps to a new id, or rebuilds the integration dynamically, call `destroyDrawer(id)` or `destroyDrawers()` so the shared registry can release the instance.
- Pass `showHandle` to render the built-in handle in plain HTML or CDN usage. If `handleOnly` is enabled, that handle is rendered automatically.
- Add `data-drawer-wrapper` to the page shell element if `shouldScaleBackground` should scale the app behind the drawer.
- Add `data-drawer-no-drag` to interactive descendants inside custom content when those elements should not start a drawer drag.
- Browser usage is the same mounted-host runtime exposed through `window.Drawer`, so shared options keep the same user-facing drawer behavior as the module entrypoints.
- Reusing the same `id` updates the existing runtime instance bound to that browser namespace.

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
