---
locale: en
title: 'HTML / CDN'
titleAccent: 'CDN'
description: 'Load Drawer from HTML/CDN with the same owned-controller API as package imports, native templates and explicit lifecycle cleanup.'
sidebar:
  group: reference
  order: 8
---

Use **HTML / CDN** when your page does not use a bundler. The standalone script installs `window.Drawer`; it exposes the same seven functions as package imports.

## What It Exposes

`createDrawer`, `createDrawerController`, `getDrawer`, `getDrawers`, `getParentDrawer`, `getChildDrawers` and `destroyDrawers`. There is no automatic mount or registry discovery from arbitrary HTML.

## Quick Include

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@5.0.2/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@5.0.2/dist/browser/global.global.js"></script>
```

Pin matching JavaScript and CSS versions. These release URLs require the maintainer to publish 5.0.2; when developing before publication, serve the local dist files. The script must load before initialization. A deferred external script followed by an immediately executing inline initializer does not guarantee that order.

## Basic Usage

Copy the complete [first integration](../../getting-started/#copy-the-files), including its panel stylesheet. Its only JavaScript difference from ESM is how the factory is loaded:

```js
const drawer = window.Drawer.createDrawer({
  triggerElement: document.getElementById('open-drawer'),
  title: 'Account',
  content: 'Account details',
  contentClassName: 'demo-drawer',
  overlayClassName: 'demo-overlay',
  closeButton: true,
})
drawer.setOpen(true)
```

## Custom HTML content

Pass an HTMLElement or a factory that clones a template; strings are plain text. Keep application state outside disposable dialog DOM when edits must survive a close.

```js
const template = document.getElementById('account-content')
const account = window.Drawer.createDrawer({
  title: 'Account',
  content: () => template.content.firstElementChild.cloneNode(true),
  contentClassName: 'demo-drawer',
  overlayClassName: 'demo-overlay',
  closeButton: true,
})
```

Use trusted template markup and escape untrusted values before placing them into HTML. The removed `newDrawer({html})` helper is unnecessary with native templates.

## All methods at a glance

```js
const drawer = window.Drawer.createDrawer({ id: 'account', title: 'Account' })
drawer.setOpen(true)
drawer.update({ content: 'Updated details' })
window.Drawer.getDrawer('account') === drawer // true
window.Drawer.getDrawers().account === drawer // true
drawer.setOpen(false)
drawer.destroy()
window.Drawer.getDrawer('account') // null
```

Use `getDrawers()` rather than the removed `available` alias. Queries never create. Duplicate explicit creation throws, and destroyed handles cannot recreate or affect a newly reused id.

## Notes

The optional module `@samline/drawer/browser` exports `Drawer` and a default namespace plus the same individual functions. It does not install a global. Prefer ordinary root imports when you do not need a namespace. ESM/CommonJS are module formats; CDN/self-hosted are delivery choices, not additional APIs or ownership modes.

## Compatibility

Runtime targets ES2020 with Pointer Events, pointer capture and modal isolation through inert/aria-hidden. Create DOM instances after client mount. `createDrawerController()` is the state-only alternative; it creates no registry entry or DOM host.

## Cleanup Guidance

Destroy each owned instance when its component or section leaves. Preserve instances on persisted pagehide for browser history restoration; clean up on a real departure.

```js
window.addEventListener('pagehide', event => {
  if (!event.persisted) drawer.destroy()
})
```

## TypeScript global type

```ts
import type { DrawerApi } from '@samline/drawer/browser'
declare global {
  interface Window {
    Drawer?: DrawerApi
  }
}
```

## When to Use It

Use the standalone script for plain HTML, Shopify, WordPress or server-rendered templates. [Framework integrations](../../guides/frameworks/) supplies host lifecycle examples; the [changelog](../../changelog/) explains v4 replacements.
