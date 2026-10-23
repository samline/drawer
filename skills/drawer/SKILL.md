---
name: drawer
description: Integrate @samline/drawer bottom sheets and side panels into websites, plain HTML, CMS templates or framework components. Use for Drawer installation, content, styling, accessible controls, snap points and lifecycle; not unrelated drawer libraries or repository maintenance.
metadata:
  package: '@samline/drawer'
  package-version: '5.0.2'
---

# Drawer

Build against the installed `@samline/drawer` version. This skill describes v5.0.2. Check the dependency version and exports before applying it to another release; read the changelog when migrating v4 code. Preserve the host project's components, colors and lifecycle conventions. Drawer supplies panel behavior and motion; the application supplies useful content and presentation.

## Choose loading, then keep the controller

- **Package / ESM:** install with npm, pnpm, yarn or bun. Import `{ createDrawer }` from `@samline/drawer` and import `@samline/drawer/styles.css` once. Initialize in client code after the trigger exists. ESM/TypeScript and CommonJS are module formats; neither installs `window.Drawer`.
- **HTML / CDN:** load `dist/style.css` with `<link>` and `dist/browser/global.global.js` with `<script>`, then call `window.Drawer.createDrawer(options)`. Keep CSS and JavaScript pinned to the same version. A CDN is file delivery; self-hosting the same files uses the same API. The IIFE exposes `window.Drawer`; “Global” is not a third loading mode. Avoid `async` or a deferred script followed by an immediately executed inline initializer.

For 5.0.2 the documented assets are:

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@5.0.2/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@5.0.2/dist/browser/global.global.js"></script>
```

Verify that the selected release/assets exist before using remote URLs. A repository version or tag does not prove npm/CDN publication. Use the local build when integrating an unpublished release; do not silently load an older version with newer APIs.

The optional `@samline/drawer/browser` module exports the same seven functions and a named/default `Drawer` namespace without installing a global. The root already supports ordinary DOM integration. Load one JavaScript setup and retain one controller per owned panel; do not initialize the same feature through imported and standalone copies.

## Minimal owned integration

Use an existing native button and the host's styling. These three snippets work together in a bundler; the application calls the returned cleanup on unmount or real page departure.

```html
<button id="open-filters" type="button" aria-haspopup="dialog" aria-expanded="false">Open filters</button>
```

```js
import { createDrawer } from '@samline/drawer'
import '@samline/drawer/styles.css'
import './drawer.css'

const setupFilters = (trigger) => {
  const drawer = createDrawer({
    triggerElement: trigger,
    title: 'Filters',
    content: 'Choose a category to narrow your results.',
    contentClassName: 'filters-panel',
    overlayClassName: 'filters-overlay',
    closeButton: { icon: '×', ariaLabel: 'Close filters' },
    autoFocus: true,
    onOpenChange: (open) => trigger.setAttribute('aria-expanded', String(open))
  })

  return () => {
    drawer.destroy()
    trigger.setAttribute('aria-expanded', 'false')
  }
}

const trigger = document.querySelector('#open-filters')
const cleanupFilters = trigger ? setupFilters(trigger) : () => {}
// Call cleanupFilters() from the owning component's teardown.
```

```css
.filters-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgb(0 0 0 / 45%);
}
.filters-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 101;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-height: 90dvh;
  padding: 1.5rem;
  border-radius: 1.5rem 1.5rem 0 0;
  background: white;
  color: #24212b;
}
.filters-panel [data-drawer-body] {
  flex: 0 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.filters-panel [data-drawer-close] {
  flex-shrink: 0;
  margin: 0.75rem 0 0 auto;
}
```

For HTML / CDN, keep the markup, application CSS and setup code, replace the imports with `const { createDrawer } = window.Drawer`, and run the setup after the runtime script and markup. Use the site's theme tokens instead of the example colors when integrating an existing design.

`triggerElement` owns the opening click listener. Do not add a second click handler for the same action. If the application owns `aria-expanded`, synchronize it through `onOpenChange` or an immediate subscription and reset it explicitly during cleanup: `destroy()` does not emit `onOpenChange(false)`.

## Controller and identity contract

- `createDrawer(options)` always creates. Omitted ids are independently generated; explicit ids must be non-empty and unique. Duplicate ids throw. Keep the controller instead of creating another on every click.
- `drawer.setOpen(true)` / `setOpen(false)` opens/closes that instance. Closing preserves it for reopening; dialog content and overlay are removed after the exit transition.
- `drawer.update(options)` shallow-merges state and DOM settings without changing identity. Only open/snap/callback changes can reconcile without rebuilding an open dialog. Other changes may recreate content and move focus.
- `setOpen`, `update` and `setActiveSnapPoint` return snapshots, not a fluent controller. `getSnapshot()` reads options/state; treat snapshots and `options` as read-only.
- `subscribe(listener)` fires immediately and on publications and returns an unsubscribe function. Consumer callbacks can synchronously destroy their owner; application code must not keep issuing commands after its own teardown.
- `destroy()` releases owned DOM, listeners, subscriptions, timers and effects and unregisters the instance. It is terminal and idempotent. Other methods, snapshot reads and options access on destroyed handles throw. Stale handles cannot operate on a replacement reusing that id.

Optional registry queries do not create anything: `getDrawer(id)` returns the identical controller or `null`; `getDrawers()` returns a fresh keyed object containing the stable controllers. `getParentDrawer(id)` and `getChildDrawers(id)` inspect nesting. `destroyDrawers()` disposes the complete registry; use it only when the caller owns every registered instance. A component normally calls its own controller's `destroy()`.

`createDrawerController()` is advanced state-only use: the same state/update/subscription/disposal contract, without DOM, registry, focus, gestures or scroll effects. It is not a shortcut for a complete accessible dialog.

Removed in v5: `configureDrawer`, `openDrawer`, `closeDrawer`, `toggleDrawer`, `updateDrawer`, `destroyDrawer`, `patch`, `browser`, `newDrawer`, `available` and `mountElement`. Use controller methods, registry queries and `container`; do not invent compatibility wrappers or framework-adapter entrypoints.

## Content and accessible interaction

Strings are text. For markup, pass an `HTMLElement` or a zero-argument factory returning one, such as a native template clone. Elements are moved into the dialog. Factories run per dialog build, including structural updates; reopening recreates factory-produced fields. Do not pass HTML strings, JSX, VNodes or Svelte snippets as content. Store persistent application data outside disposable panel DOM.

Keep form submission, search, wizard steps and useful result messages in the application. Read inputs with ordinary DOM/FormData APIs and use the retained controller to close or update. Namespace application hooks such as `data-filters-apply`; package `data-drawer-*` attributes describe runtime behavior and styling. When binding content listeners, make their lifetime match that content build and clean up external listeners/timers/subscriptions at owner teardown.

Supply a meaningful title or explicit accessible label, label fields and give actions native named buttons. The description is visually hidden by default; use `descriptionVisuallyHidden: false` when it should be visible. Reading-only scroll content needs a labelled focusable region and a visible focus indicator; test keyboard scrolling. Avoid duplicate ids when a template can mount in several independent drawers.

Drawer owns focus containment, Escape/backdrop dismissal, background isolation, focus restoration, pointer gestures, animation, viewport handling and scroll locking. Do not add a second focus trap, body lock or custom swipe system. `autoFocus` is opt-in; choose it deliberately for an immediately usable modal. `modal: false` leaves the background interactive and defaults to no overlay. A non-dismissible confirmation still needs explicit accessible actions that call `setOpen(false)`.

## Geometry, scrolling and snap points

Load package CSS for every loading mode. It supplies motion and interaction rules, not fixed positioning, dimensions, stacking or theme colors. Prefer instance-specific `contentClassName`, `overlayClassName`, `handleClassName` and `closeButton.className` hooks.

- `direction` is physical: `top`, `bottom`, `left` or `right`. Match consumer insets, dimensions and corners to the direction. When sharing geometry across opposing sides, clear the opposite inset rather than inheriting both.
- Keep panel overflow visible and scroll its shrinking `min-height: 0` flex body. The runtime's `::after` background extension otherwise creates a false scroll range. Keep close/handle controls reachable; do not remove native pseudo-elements to hide overflow.
- Preserve runtime transforms, transitions, overlay opacity, snap offsets and keyboard positioning. Put application transforms on an inner wrapper. Use insets and auto margins for floating cards rather than centering transforms on the panel.
- `snapPoints` numbers are viewport/container fractions; strings use integer pixel offsets, not arbitrary CSS lengths. Pass an actual configured member to `setActiveSnapPoint`, for example `snapPoints: [0.45, 1]` with `setActiveSnapPoint(1)`. The runtime resets snaps after closing; do not add a competing reset timer or recalculate offsets.
- `handleOnly` keeps dragging on the native handle. `data-drawer-no-drag` opts consumer subtrees out of dragging. Preserve normal input interaction and perpendicular page scrolling.
- `parentId: parent.id` creates nesting; cycles throw. Refresh reused child content against the current parent's DOM. Unrelated panels omit `parentId`, close independently and each require cleanup.
- Custom mounting uses `container`. Background scaling uses a consumer-authored `[data-drawer-wrapper]` page shell. Keep shared lock/scale ownership in the runtime rather than imitating it through application body styles.

For floating non-snap cards or keyboard-sensitive layouts, read the maintained CSS and viewport guidance before changing runtime endpoints. Do not apply a non-snap offset override to snap drawers.

## Framework and CMS ownership

Use the [framework integrations guide](https://samline.github.io/drawer/docs/guides/frameworks/) for concrete React, Vue, Svelte, Astro, Shopify and WordPress examples. These hosts use the public API, not invented adapters.

Create after client mount and destroy on unmount. React development effects must survive setup/cleanup/setup; repeated components should not share a fixed id. Keep framework-owned DOM and runtime-owned content boundaries explicit; a DOM factory is not a framework rendering adapter. Use framework portals/rendering APIs only with deliberate mount/unmount ownership.

In Astro, initialize in a processed browser script with instance-local queries and cleanup for client navigation. In standalone page cleanup, preserve controllers/listeners on `pagehide` when `event.persisted` is true; dispose on real departure or application unmount. Write direct controller calls with descriptive variables and arrow callbacks; do not add classes, `this`, a generic option parser or command-event layer solely to initialize a panel.

Shopify loads shared runtime assets once and initializes/disposes each section on section load/unload. WordPress enqueues runtime and integration assets with explicit dependencies and a declared shortcode/widget/builder scope. Dynamic navigation and builders need their actual host lifecycle. Fixture execution does not prove a live store/plugin deployment.

## Verify the integration

Exercise opening, explicit close, Escape/backdrop policy, focus restoration, keyboard interaction, content updates and teardown/recreation. Check narrow/wide layouts, long content, both host themes, enlarged text and reduced motion. For gestures, nesting, snap points or independent panels, test the actual requested behavior rather than relying on screenshots or a type check. Confirm the page keeps its scroll position and that teardown releases owned effects and ARIA state.

The gallery provides HTML, CSS and JavaScript tabs plus Complete file in both loading modes. Copy all three sibling files together or use the complete alternative; execute the result with matching assets. Network interception with local builds proves local integration, not npm/CDN publication.

Read only the maintained reference relevant to the task:

- [Installation](https://samline.github.io/drawer/docs/getting-started/)
- [Options and renderable content](https://samline.github.io/drawer/docs/reference/configuration/)
- [Controller and registry](https://samline.github.io/drawer/docs/reference/controller/)
- [CSS and runtime ownership](https://samline.github.io/drawer/docs/reference/css-styling/)
- [Lifecycle and state](https://samline.github.io/drawer/docs/guides/lifecycle-and-state/)
- [Framework and CMS integrations](https://samline.github.io/drawer/docs/guides/frameworks/)
- [Working examples and complete files](https://samline.github.io/drawer/examples/)
- [Changelog and migration](https://samline.github.io/drawer/docs/changelog/)

Verify contracts against the installed release instead of borrowing APIs from Ticker, Vaul or another drawer library.
