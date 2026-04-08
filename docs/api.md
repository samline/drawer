# API Reference

`@samline/drawer` exposes a vanilla-first package surface with framework-specific secondary entrypoints.

## Package Surface

| Entry point | Purpose |
| --- | --- |
| `@samline/drawer` | Primary vanilla entry |
| `@samline/drawer/react` | Explicit React adapter |
| `@samline/drawer/browser` | Browser global entry exposing the vanilla API on `window.Drawer` |
| `@samline/drawer/vue` | Vue wrapper over the vanilla drawer host |
| `@samline/drawer/svelte` | Svelte action-style wrapper over the vanilla drawer host |
| `@samline/drawer/core` | Shared contracts and controller primitives |
| `@samline/drawer/styles.css` | Shared styles export |

## Shared Contracts

The `@samline/drawer/core` entry currently exports:

- `CommonDrawerDirection`
- `CommonDrawerSnapPoint`
- `CommonDrawerOptions`
- `CommonDrawerState`
- `CommonDrawerSnapshot`
- `CommonDrawerController`
- `createDrawerController(options?)`

## Tooling

The package runtime and tests target Bun and Vitest.

- Use Bun to install dependencies and run package scripts.
- Use Vitest for automated tests.
- The previous Playwright-based browser suite is no longer the active test runner.

## Vanilla Surface

The root entry currently exports:

- `createDrawer(options?)`
- `configureDrawer(options?)`
- `getDrawer()`
- `destroyDrawer()`
- `createDrawerController(options?)`

This is the package's primary entrypoint.

### Vanilla options

The root entry accepts the shared drawer options plus vanilla-first render options:

- `mountElement`
- `triggerElement`
- `triggerText`
- `title`
- `description`
- `content`
- `overlayClassName`
- `contentClassName`

The current implementation mounts the drawer UI through the React adapter internally while keeping the root API framework-agnostic at the call site.

## React Surface

The React adapter preserves the established composition model:

- `Drawer.Root`
- `Drawer.NestedRoot`
- `Drawer.Content`
- `Drawer.Overlay`
- `Drawer.Trigger`
- `Drawer.Portal`
- `Drawer.Handle`
- `Drawer.Close`
- `Drawer.Title`
- `Drawer.Description`

The React adapter is intentionally secondary to the root vanilla API.

## Browser Surface

The browser entry assigns the vanilla API to `window.Drawer`.

```html
<script type="module">
  import '@samline/drawer/browser';

  console.log(window.Drawer);
</script>
```

## Vue Surface

The Vue entry currently exposes:

- `DrawerRoot`
- `DrawerPlugin`
- `createDrawer`
- `destroyDrawer`
- `getDrawer`

It mounts and synchronizes the same shared vanilla drawer host used by the root package.

## Svelte Surface

The Svelte entry currently exposes:

- `drawer`
- `DrawerRoot`
- `mountDrawer`
- `createDrawer`
- `destroyDrawer`
- `getDrawer`

It also drives the shared vanilla drawer host rather than reimplementing the runtime.