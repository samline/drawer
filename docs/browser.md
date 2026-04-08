# Browser

Use the browser entry when you want the root API on `window.Drawer` without importing modules throughout your app.

## Install

```bash
bun add @samline/drawer
```

## Basic Usage

```html
<script type="module">
  import '@samline/drawer/browser';

  const drawer = window.Drawer.createDrawer({
    triggerText: 'Open drawer',
    title: 'Drawer title',
    content: 'Drawer content'
  });

  drawer.setOpen(true);
</script>
```

## What It Exposes

The browser entry assigns this API to `window.Drawer`:

- `createDrawer`
- `configureDrawer`
- `getDrawer`
- `destroyDrawer`
- `createDrawerController`

## Complete Example

```html
<button id="open-settings" type="button">Settings</button>

<script type="module">
  import '@samline/drawer/browser';

  const trigger = document.getElementById('open-settings');

  window.Drawer.createDrawer({
    triggerElement: trigger,
    title: 'Settings',
    description: 'Control your workspace preferences.',
    content: () => {
      const wrapper = document.createElement('div');
      wrapper.textContent = 'Drawer content rendered from the browser entry.';
      return wrapper;
    },
    direction: 'right'
  });
  
  window.Drawer.getDrawer()?.subscribe((snapshot) => {
    console.log('open:', snapshot.state.isOpen);
  });
</script>
```

## When to Use It

- Use it for browser-only integrations or demos where a global namespace is simpler than repeated imports.
- Use the root package instead if you already control the module graph and do not need `window.Drawer`.

## Notes

- Importing `@samline/drawer/browser` does not auto-mount a drawer. The namespace is registered immediately, but the shared host is only created after calling `createDrawer()` or `configureDrawer()`.
- The browser entry drives the same shared mounted host as the root package.