---
title: Entrypoints and module formats
description: Choose the root module, browser namespace module, or standalone global IIFE and load the matching stylesheet.
template: doc
---

The package exposes module entrypoints plus a standalone script build. All DOM variants require the separate stylesheet.

## Decision table

| Use case                       | Import or asset                        | Global side effect       | CSS                                       |
| ------------------------------ | -------------------------------------- | ------------------------ | ----------------------------------------- |
| ESM or TypeScript app          | Named exports from `@samline/drawer`   | none                     | Import `@samline/drawer/styles.css`.      |
| CommonJS app                   | `require('@samline/drawer')`           | none                     | Load `dist/style.css` through your build. |
| Browser namespace in a bundler | `@samline/drawer/browser`              | none                     | Import `@samline/drawer/styles.css`.      |
| No bundler / CDN               | `dist/browser/global.global.js`        | installs `window.Drawer` | Link `dist/style.css` separately.         |
| State only, custom renderer    | `createDrawerController` from the root | none                     | not required                              |

## Root entrypoint

```ts
import { createDrawer, destroyDrawer, openDrawer, type VanillaDrawerOptions } from '@samline/drawer'
import '@samline/drawer/styles.css'
```

The root exports individual helpers, controllers, types, and runtime constants. It does not install a global.

```js title="CommonJS"
const { createDrawer } = require('@samline/drawer')

const drawer = createDrawer({ id: 'menu', title: 'Menu' })
```

## Browser namespace module

The `/browser` subpath exports a default `Drawer` namespace, the named namespace, and individual helpers. Importing it does not install `window.Drawer`.

```ts
import Drawer, { createDrawer, type DrawerApi } from '@samline/drawer/browser'
import '@samline/drawer/styles.css'

const menu = Drawer.createDrawer({ id: 'menu', title: 'Menu' })
console.log(createDrawer === Drawer.createDrawer)
```

## Standalone IIFE

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@4.0.1/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@4.0.1/dist/browser/global.global.js"></script>
<script>
  window.Drawer.createDrawer({
    id: 'menu',
    triggerText: 'Open menu',
    title: 'Menu'
  })
</script>
```

Pin the package version in production. The IIFE is JavaScript only: it does not inject styles and cannot be tree-shaken.

## Stylesheet aliases

Both package exports resolve to the same file:

```ts
import '@samline/drawer/styles.css' // preferred documentation spelling
import '@samline/drawer/style.css' // compatibility alias
```

The shipped CSS owns states, transitions, gesture affordances, and default structural behavior. Your application should still define size, position, color, spacing, radius, and stacking for its design.

## Related

- [Browser / CDN reference](/drawer/reference/browser/)
- [Getting started](/drawer/getting-started/)
- [CSS styling](/drawer/reference/css-styling/)
