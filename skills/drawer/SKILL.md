---
name: drawer
description: Integrate @samline/drawer bottom sheets and side panels in HTML, JavaScript, TypeScript, framework components and CMS themes. Use for installation, accessible content, styling, registry queries, gestures and lifecycle; not unrelated navigation libraries.
metadata:
  package: '@samline/drawer'
  package-version: '5.0.0'
---

# Drawer 5

Check the installed version and exports first. This guide targets 5.0.0, whose creation, identity and destruction semantics differ from v4. Publishing the package is a maintainer action; verify CDN availability before choosing remote assets.

## Default integration

Import createDrawer from @samline/drawer, load @samline/drawer/styles.css once, and supply consumer panel positioning/appearance. Keep the returned controller. Use triggerElement for an existing native button and closeButton for an accessible close action. Ordinary framework integration needs no wrapper/adapter or browser namespace.

```js
import { createDrawer } from '@samline/drawer'
import '@samline/drawer/styles.css'
import './drawer.css'

const drawer = createDrawer({
  triggerElement: document.getElementById('open-drawer'),
  title: 'Filters',
  content: 'Choose what you want to see.',
  contentClassName: 'drawer-panel',
  overlayClassName: 'drawer-overlay',
  closeButton: { icon: '×', ariaLabel: 'Close filters' },
  autoFocus: true
})
```

The separate stylesheet supplies fixed positioning, direction-appropriate dimensions, z-index, colors and padding. The package owns movement, gestures, focus, backdrop dismissal and scroll locking. For long content, use a flex panel and a shrinking min-height:0 / overflow-y:auto body; scrolling the positioned panel includes its decorative background extension. Reading-only content needs a keyboard focus target and visible indicator. See the [CSS contract](https://samline.github.io/drawer/docs/reference/css-styling/).

## One owned lifecycle

- createDrawer always creates. Omit id for independent generated ids; explicit ids must be non-empty and unique. Duplicate ids throw. Never recreate to update an existing instance.
- setOpen(true/false) changes visibility. Closing preserves the instance for reopening.
- update(options) shallow-merges state and DOM options; id cannot change. It may rebuild dialog DOM and invoke content factories again.
- setOpen, update and setActiveSnapPoint return snapshots, not a fluent controller. getSnapshot reads options/state; treat them as read-only.
- subscribe notifies immediately and on publications; retain its unsubscribe function.
- Lifecycle callbacks and subscribers may tear down their owner; the runtime stops work for that destroyed instance.
- destroy releases DOM/listeners/subscriptions/timers/effects and unregisters. It is idempotent. Other methods on destroyed handles throw; stale handles cannot recreate or affect a later instance reusing the id.
- createDrawerController is advanced state-only use: no DOM or registry. It supports the same state methods and explicit destroy.

Registry access is optional: getDrawer(id) returns the identical controller or null; getDrawers returns a fresh keyed object containing those stable controllers. Queries never create. getParentDrawer/getChildDrawers inspect nesting. destroyDrawers disposes every registered instance and is appropriate only when the caller owns the whole registry.

Use `container` for custom mounting; the legacy `mountElement` option was removed.

Removed in v5: configureDrawer, openDrawer, closeDrawer, toggleDrawer, updateDrawer, destroyDrawer, patch, browser, newDrawer and available aliases. Use instance methods, native template/HTMLElement content and getDrawers. Do not restore compatibility wrappers or call a removed helper.

## Loading and content

Package / ESM uses named root imports. HTML / CDN loads dist/style.css and dist/browser/global.global.js at the same pinned version, then window.Drawer.createDrawer with the identical options/lifecycle. Do not use async loading without coordinating initialization. The optional /browser module provides a named/default Drawer namespace and the same functions, without installing a global.

Strings are text. For HTML, pass an HTMLElement or a factory cloning a native template. Do not introduce an HTML-string parser around content or pass JSX/VNodes/Svelte snippets. Keep persistent application/form state outside disposable dialog content. Supply meaningful titles/labels and labeled inputs; modal versus non-modal, overlay, autofocus and focus restoration are package-owned behavior.

## Hosts and advanced behavior

Create after client mount and destroy on unmount in React/Vue/Svelte. React effects must survive development setup/cleanup/setup; do not use a shared fixed id for repeated components. Astro creation belongs in browser scripts; client navigation needs page ownership and cleanup. Shopify assets load once, with per-section load/unload cleanup. WordPress assets enqueue with runtime dependencies; declare shortcode/widget/builder scope. Preserve controllers on persisted pagehide and dispose on a real departure.

Snap points use numbers as viewport/container fractions and parseInt strings as pixel offsets; use actual array members for setActiveSnapPoint. Directions are physical. A parentId defines nesting; cycles throw. Preserve pointer, scroll, focus and viewport behavior rather than reimplementing it in a host.

Read [framework/CMS examples](https://samline.github.io/drawer/docs/guides/frameworks/), [controller ownership](https://samline.github.io/drawer/docs/reference/controller/) and the [changelog](https://samline.github.io/drawer/docs/changelog/) when migrating. Execute actual copied files; a type check or screenshot alone does not prove gestures, lifecycle or cleanup. CMS fixtures do not prove a live deployment.
