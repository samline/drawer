# Entrypoints and module formats

Choose one JavaScript surface per integration. Every DOM-based surface also needs the separate stylesheet.

## Decision table

| Use case               | Import or asset                      | Global side effect       | CSS                                      |
| ---------------------- | ------------------------------------ | ------------------------ | ---------------------------------------- |
| ESM or TypeScript      | Named exports from `@samline/drawer` | none                     | Import `@samline/drawer/styles.css`.     |
| CommonJS               | `require('@samline/drawer')`         | none                     | Load `dist/style.css` through the build. |
| Namespace in a bundler | `@samline/drawer/browser`            | none                     | Import `@samline/drawer/styles.css`.     |
| No bundler / CDN       | `dist/browser/global.global.js`      | installs `window.Drawer` | Link `dist/style.css` separately.        |
| State only             | `createDrawerController` from root   | none                     | not required                             |

## Root

```ts
import { createDrawer, openDrawer } from '@samline/drawer'
import '@samline/drawer/styles.css'
```

The root exposes individual functions, controllers, types, and runtime constants without installing a global.

## Browser namespace module

```ts
import Drawer, { createDrawer, type DrawerApi } from '@samline/drawer/browser'
import '@samline/drawer/styles.css'

const menu = Drawer.createDrawer({ id: 'menu', title: 'Menu' })
```

The subpath exports the namespace plus individual helpers. Importing it does not install `window.Drawer`.

## Standalone IIFE

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@4.0.1/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@4.0.1/dist/browser/global.global.js"></script>
```

The IIFE installs `window.Drawer`. It does not inject CSS, so the link is required. Pin the version in production.

Both `@samline/drawer/styles.css` and the compatibility alias `@samline/drawer/style.css` resolve to the same file.

## See also

- [Browser / CDN](browser.md)
- [CSS styling](css-styling.md)
- [Getting started](getting-started.md)
