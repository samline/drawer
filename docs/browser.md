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
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@2.0.3/dist/style.css">
<script src="https://unpkg.com/@samline/drawer@2.0.3/dist/browser/index.js"></script>
```

## Complete Example

```html
  <link rel="stylesheet" href="https://unpkg.com/@samline/drawer@2.0.3/dist/style.css">
  <script src="https://unpkg.com/@samline/drawer@2.0.3/dist/browser/index.js"></script>

<div data-drawer-wrapper>
  <main>App shell</main>
</div>

<button id="open-settings" type="button">Settings</button>

<script>
  const trigger = document.getElementById('open-settings')

  window.Drawer.createDrawer({
    id: 'settings',
    triggerElement: trigger,
    showHandle: true,
    title: 'Settings',
    description: 'Control your workspace preferences.',
    content: function () {
      const wrapper = document.createElement('div')
      wrapper.textContent = 'Drawer content rendered from the browser entry.'
      return wrapper
    },
    direction: 'right'
  })

  window.Drawer.getDrawer('settings')?.subscribe(function (snapshot) {
    console.log('open:', snapshot.state.isOpen)
  })
</script>
```

## Styled Bottom Sheet Example

If you want the browser entry to look like a polished bottom-sheet demo, keep the drawer imperative and style the host yourself.

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@2.0.3/dist/style.css">
<script src="https://unpkg.com/@samline/drawer@2.0.3/dist/browser/index.js"></script>

<style>
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #f8fafc;
    color: #111827;
  }

  .page-shell {
    min-height: 100vh;
    padding: 24px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  }

  .drawer-demo-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0 16px;
    border: 0;
    border-radius: 9999px;
    background: #ffffff;
    color: #111827;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    cursor: pointer;
  }

  .drawer-demo-overlay {
    background: rgba(0, 0, 0, 0.4);
  }

  .drawer-demo-content {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: fit-content;
    margin-top: 6rem;
    display: flex;
    flex-direction: column;
    border-radius: 10px 10px 0 0;
    background: #e5e7eb;
    outline: none;
  }

  .drawer-demo-panel {
    flex: 1;
    padding: 16px;
    border-radius: 10px 10px 0 0;
    background: #ffffff;
  }

  .drawer-demo-footer {
    margin-top: auto;
    padding: 16px;
    border-top: 1px solid #e5e7eb;
    background: #f3f4f6;
  }

  .drawer-demo-links {
    display: flex;
    justify-content: flex-end;
    gap: 24px;
    max-width: 28rem;
    margin: 0 auto;
    font-size: 12px;
  }

  .drawer-demo-links a {
    color: #4b5563;
    text-decoration: none;
  }
</style>

<div class="page-shell" data-drawer-wrapper>
  <button id="open-drawer" class="drawer-demo-trigger" type="button">Open Drawer</button>
</div>

<script>
  const trigger = document.getElementById('open-drawer')

  window.Drawer.createDrawer({
    id: 'styled-sheet',
    triggerElement: trigger,
    direction: 'bottom',
    shouldScaleBackground: true,
    showHandle: true,
    overlayClassName: 'drawer-demo-overlay fixed inset-0',
    contentClassName: 'drawer-demo-content',
    handleClassName: 'mt-4',
    ariaLabelledBy: 'styled-sheet-title',
    ariaDescribedBy: 'styled-sheet-description',
    content: function () {
      const wrapper = document.createElement('div')
      wrapper.innerHTML = `
        <div class="drawer-demo-panel">
          <div class="mx-auto mb-8 h-1.5 w-12 rounded-full bg-gray-300"></div>
          <div style="max-width: 28rem; margin: 0 auto;">
            <h2 id="styled-sheet-title" style="margin: 0 0 16px; font-size: 30px; line-height: 36px; font-weight: 700; letter-spacing: -0.02em; color: #111827;">
              A controlled drawer.
            </h2>
            <p id="styled-sheet-description" style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 28px;">
              This mirrors the Vaul demo structure using the browser entry and plain HTML instead of React components.
            </p>
            <p style="margin: 0 0 8px; color: #374151;">
              Use the browser API to keep the drawer state imperative while still controlling the visual shell yourself.
            </p>
            <p style="margin: 0 0 8px; color: #374151;">
              The drawer can still react to external controls through <code>triggerElement</code>, <code>openDrawer</code>,
              and <code>updateDrawer</code>.
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
    },
  })
</script>
```

Key points for this style:

- Use `triggerElement` if you want a real button outside the drawer to open it.
- Use `direction: 'bottom'` for a sheet that slides up from the bottom.
- Use `showHandle: true` so the browser host renders the built-in handle.
- Use `overlayClassName` and `contentClassName` to match the demo layout.
- Put the visible heading and supporting copy inside `content` when you need exact control over the internal panel layout.
- Use `ariaLabelledBy` and `ariaDescribedBy` when the accessible heading and description come from elements inside your custom content.
- Add `data-drawer-wrapper` to the page shell when you enable `shouldScaleBackground`.

If the browser drawer is something like a gallery or a fully custom surface with no top-level heading block, use `ariaLabel` instead of `title`. When no description is provided, the browser host opts out of `aria-describedby` automatically unless you pass `ariaDescribedBy` yourself.

## When to Use It

- Use it when you need a browser global API.
- Use it for plain HTML pages, embeds, CMS integrations, or demos where a CDN script is simpler than a bundler.
- Use the root package instead if you already control the module graph and do not need a browser global.

## Notes

- The browser bundle targets the same shared runtime registry as the root package.
- Loading the script only attaches `window.Drawer`. A drawer is mounted lazily when you call `createDrawer()` or `configureDrawer()`.
- Pass `showHandle` to render the built-in handle in plain HTML or CDN usage. If `handleOnly` is enabled, that handle is rendered automatically.
- Add `data-drawer-wrapper` to the page shell element if `shouldScaleBackground` should scale the app behind the drawer.
- Add `data-drawer-no-drag` to interactive descendants inside custom content when those elements should not start a drawer drag.
- Browser usage is the same mounted-host runtime exposed through `window.Drawer`, so shared options keep the same user-facing drawer behavior as the module entrypoints.
- Reusing the same `id` updates the existing runtime instance bound to that browser namespace.