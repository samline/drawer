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

## Complete Example

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer/dist/style.css">
<script src="https://unpkg.com/@samline/drawer/dist/browser/index.js"></script>
```

## Complete Example

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer/dist/style.css">
<button id="open-settings" type="button">Settings</button>

<script src="https://unpkg.com/@samline/drawer/dist/browser/index.js"></script>
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

## When to Use It

- Use it when you need a browser global API.
- Use it for plain HTML pages, embeds, CMS integrations, or demos where a CDN script is simpler than a bundler.
- Use the root package instead if you already control the module graph and do not need a browser global.

## Notes

- The browser bundle targets the same shared runtime registry as the root package.
- Loading the script only attaches `window.Drawer`. A drawer is mounted lazily when you call `createDrawer()` or `configureDrawer()`.
- Pass `showHandle` to render the built-in handle in plain HTML or CDN usage. If `handleOnly` is enabled, that handle is rendered automatically.
- Browser usage is the same mounted-host runtime exposed through `window.Drawer`, so shared options keep the same user-facing drawer behavior as the module entrypoints.