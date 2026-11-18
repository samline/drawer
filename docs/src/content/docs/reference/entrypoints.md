---
locale: en
title: 'Entrypoints and module formats'
description: 'Choose ESM, CommonJS or HTML/CDN, understand the optional browser namespace, and load the required stylesheet in the correct order.'
sidebar:
  group: reference
  order: 5
---

Choose one JavaScript surface per integration. Every DOM-based surface also needs the separate stylesheet.

## Decision table

| Use case               | Import or asset                      | Global side effect       | CSS                                      |
| ---------------------- | ------------------------------------ | ------------------------ | ---------------------------------------- |
| ESM or TypeScript      | Named exports from `@samline/drawer` | none                     | Import `@samline/drawer/style.css`.      |
| CommonJS               | `require('@samline/drawer')`         | none                     | Load `dist/style.css` through the build. |
| Namespace in a bundler | `@samline/drawer/browser`            | none                     | Import `@samline/drawer/style.css`.      |
| No bundler / CDN       | `dist/browser/drawer.global.js`      | installs `window.Drawer` | Link `dist/style.css` separately.        |
| State only             | `createDrawerController` from root   | none                     | not required                             |

## Root

```ts
import { createDrawer } from '@samline/drawer'
import '@samline/drawer/style.css'
```

The root exposes individual functions, controllers, types, and runtime constants without installing a global.

## Browser namespace module

```ts
import { Drawer, createDrawer, type DrawerApi } from '@samline/drawer/browser'
import '@samline/drawer/style.css'

const menu = Drawer.createDrawer({ id: 'menu', title: 'Menu' })
```

The subpath exports the namespace plus individual helpers. Importing it does not install `window.Drawer`.

## Standalone IIFE

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@samline/drawer@6.0.1/dist/style.css" />
<script src="https://cdn.jsdelivr.net/npm/@samline/drawer@6.0.1/dist/browser/drawer.global.js"></script>
```

The IIFE installs `window.Drawer`. It does not inject CSS, so the link is required. Pin the version in production.

`@samline/drawer/style.css` and the compatibility alias `@samline/drawer/styles.css` resolve to the same file.

## See also

- [Browser / CDN](../browser/)
- [CSS styling](../css-styling/)
- [Getting started](../../getting-started/)
