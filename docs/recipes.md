# Recipes

End-to-end patterns for the common flows. Every recipe is a runnable TypeScript snippet unless otherwise noted.

- [Custom HTML content](#custom-html-content)
- [Render a pre-built form in a drawer](#render-a-pre-built-form-in-a-drawer)
- [Update content after creation](#update-content-after-creation)
- [Listen to lifecycle callbacks](#listen-to-lifecycle-callbacks)
- [Nested drawers](#nested-drawers)
- [Snap points](#snap-points)
- [Scale background](#scale-background)
- [Handle cycle](#handle-cycle)
- [Viewport keyboard handling](#viewport-keyboard-handling)
- [Built-in close button](#built-in-close-button)
- [Built-in trigger button (no external element)](#built-in-trigger-button-no-external-element)
- [Triggered by an external button](#triggered-by-an-external-button)
- [Programmatic open / close with a controller](#programmatic-open--close-with-a-controller)
- [Imperative helpers (no controller)](#imperative-helpers-no-controller)
- [Custom container](#custom-container)
- [Multiple independent drawers](#multiple-independent-drawers)
- [Subscribe to state changes from a higher-level component](#subscribe-to-state-changes-from-a-higher-level-component)
- [SPA / dynamic mount and unmount](#spa--dynamic-mount-and-unmount)
- [Open immediately on mount with animation](#open-immediately-on-mount-with-animation)
- [Build a sidebar panel with the right direction](#build-a-sidebar-panel-with-the-right-direction)
- [Common pitfalls](#common-pitfalls)

---

## Custom HTML content

The `content` slot accepts strings, numbers, `HTMLElement` instances, and thunks. Pick the form that matches how you build your UI.

```ts
import { createDrawer } from '@samline/drawer'

// 1. Plain text.
createDrawer({ id: 'a', content: 'Hello' })

// 2. Numeric badge as the title.
createDrawer({ id: 'b', title: 3, content: 'Tag' })
```

### Pre-built element

When the consumer already owns the DOM, pass the element directly. The runtime moves it into the dialog body slot.

```ts
import { createDrawer } from '@samline/drawer'

const form = document.createElement('form')
form.id = 'filters'
form.innerHTML = `
  <label>Search <input name="q" /></label>
  <button type="submit">Apply</button>
`

createDrawer({
  id: 'filters',
  title: 'Filters',
  content: form
})
```

> **Move semantics**: the runtime adopts the element. After `destroyDrawer`, the element stays in its previous location and you can keep using it. The same element instance cannot be passed to a second `content` while the first drawer still owns it.

### Lazy thunk

Use a function when the content depends on state that may change, or when you want the runtime to rebuild it every time the dialog subtree is rebuilt (mount on open, rebuild on option-driven remount, re-invoke on every reopen).

```ts
import { createDrawer } from '@samline/drawer'

createDrawer({
  id: 'clock',
  title: 'Current time',
  content: () => {
    const node = document.createElement('p')
    node.className = 'clock'
    node.textContent = new Date().toLocaleTimeString()
    return node
  }
})
```

### Mixed slots

The same rules apply to `title` and `description`. Mix and match per slot.

```ts
import { createDrawer } from '@samline/drawer'

const heading = document.createElement('h2')
heading.textContent = 'Filters'

const helpText = document.createElement('p')
helpText.className = 'hint'
helpText.textContent = 'Refine the result set.'

createDrawer({
  id: 'filters',
  title: heading,
  description: helpText,
  content: () => {
    const body = document.createElement('div')
    body.append(buildFormFields())
    return body
  }
})
```

### Opt descendants out of drag

Add `data-drawer-no-drag` to any element inside `content` that should not start a drawer drag (inputs, scrollable lists, buttons). See [CSS styling](css-styling.md#data-drawer-no-drag--opt-out-marker-for-descendants-consumer-set) for the full marker contract.

```ts
const scrollList = document.createElement('ul')
scrollList.setAttribute('data-drawer-no-drag', '')
scrollList.innerHTML = '<li>One</li><li>Two</li><li>Three</li>'

createDrawer({ id: 'list', content: scrollList })
```

---

## Render a pre-built form in a drawer

This is the typical "drawer that wraps an existing form" pattern. Build the form once, hand the element to the drawer, and let the runtime own the lifecycle.

```html
<button id="open-feedback" type="button">Send feedback</button>
```

```ts
import { createDrawer, destroyDrawer } from '@samline/drawer'

const form = document.createElement('form')
form.id = 'feedback'
form.innerHTML = `
  <label>Subject <input name="subject" required /></label>
  <label>Message <textarea name="message" required></textarea></label>
  <button type="submit">Send</button>
`

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const data = new FormData(form)
  console.log('submitted', Object.fromEntries(data))
  destroyDrawer('feedback')
})

createDrawer({
  id: 'feedback',
  title: 'Send feedback',
  content: form,
  triggerElement: document.getElementById('open-feedback'),
  closeButton: true
})
```

---

## Update content after creation

Use `update()` (or `updateDrawer(id, options)`) to merge new options into a live drawer. The runtime rebuilds the dialog subtree when the renderable slots change, which re-invokes thunks and re-mounts elements.

```ts
import { createDrawer, getDrawer } from '@samline/drawer'

const drawer = createDrawer({ id: 'list', title: 'List' })

// Replace the body with a new pre-built element.
const listA = document.createElement('ul')
listA.innerHTML = '<li>A</li><li>B</li>'

drawer.update({ content: listA })

// Or via the registry helper.
const newBody = document.createElement('div')
newBody.textContent = 'Now showing something else.'
getDrawer('list')?.update({ content: newBody })
```

See [API → updateDrawer](api/update-drawer.md).

---

## Listen to lifecycle callbacks

The runtime exposes seven callbacks. Wire them when you need to mirror the drawer's state into your own store, log, or analytics pipeline.

```ts
import { createDrawer, destroyDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'profile',
  title: 'Profile',

  // Open state changed.
  onOpenChange(open) {
    console.log('isOpen:', open)
  },

  // About to close (snapshot still shows isOpen: true).
  onClose() {
    console.log('about to close')
  },

  // 500 ms after the latest open/close transition.
  onAnimationEnd(open) {
    console.log('animation finished, open:', open)
  },

  // Runtime changed the active snap (drag, handle cycle, post-close reset).
  onActiveSnapPointChange(snapPoint) {
    console.log('snap:', snapPoint)
  },

  // Continuous drag progress.
  onDragChange(percentageDragged) {
    console.log('drag:', percentageDragged.toFixed(2))
  },

  // One-shot after a drag release.
  onReleaseChange(keptOpen) {
    console.log('release kept open:', keptOpen)
  }
})

drawer.setOpen(true)
```

Notes:

- `onClose` only fires on a `true → false` transition; destroying an open drawer does not call it.
- `onAnimationEnd` is a timer-based notification 500 ms after the latest open/close transition, not a `DOM animationend` event.
- `onActiveSnapPointChange` does not echo direct `setActiveSnapPoint()` calls.
- `onReleaseChange` does not fire for programmatic closes or overlay clicks.

---

## Nested drawers

Use `parentId` to relate a child drawer to a parent. The runtime scales and shifts the parent when the child opens, and closes / destroys the child with the parent.

```ts
import { createDrawer, getDrawer, getParentDrawer, getChildDrawers, destroyDrawer } from '@samline/drawer'

const parent = createDrawer({
  id: 'parent',
  direction: 'bottom',
  title: 'Account',
  content: 'Primary drawer body'
})

const child = createDrawer({
  id: 'child',
  parentId: 'parent',
  direction: 'right',
  title: 'Security',
  content: 'Nested drawer body',
  open: true
})

// Both drawers open when you call setOpen on the child.
getParentDrawer('child')?.id // 'parent'
getChildDrawers('parent').map((d) => d.id) // ['child']

// Destroying the parent recursively destroys the child.
destroyDrawer('parent')
getDrawer('child') // null
```

The parent's transform during the child's drag is driven by `runtime/nested.ts#getParentNestedVisualState`. The runtime re-applies the transform on every `onDragChange` of the child.

---

## Snap points

Snap points let the user drag the drawer between pre-defined positions. Numbers are fractions of the viewport or custom container (0–1). Every string is parsed as an absolute integer pixel count, so `'420px'` is 420 px and `'50%'` is 50 px rather than 50 percent.

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'filters',
  direction: 'bottom',
  title: 'Filters',
  content: 'Body',
  snapPoints: ['180px', '420px', 1],
  activeSnapPoint: '180px',
  fadeFromIndex: 1, // overlay fades at the second snap and beyond
  snapToSequentialPoint: false // allow high-velocity skip to the last
})

drawer.setOpen(true)

// Programmatic snap jump:
drawer.setActiveSnapPoint(1) // jump to the last snap (1 = zero translation offset)
drawer.setActiveSnapPoint('420px') // jump to the middle snap
```

### Behavior

- On open, the content positions itself at the active snap's offset.
- During drag, the content interpolates between snaps via `getSnapDragValue(activeOffset, draggedDistance, direction)`.
- On release, `getSnapPointReleaseAction` decides whether to close, snap to a neighbor, or noop (stays put).
- The overlay is hidden below `fadeFromIndex` and visible at that index or above, with opacity interpolated while dragging across the boundary. When omitted, `fadeFromIndex` defaults to the final snap index.
- With `snapToSequentialPoint: true`, a high-velocity release that moved less than 40% of the drawer dimension advances at most one snap. A longer release still settles at the closest snap and may skip points. The default is `false`.

---

## Scale background

When `shouldScaleBackground: true`, the page shell (the element with `data-drawer-wrapper`) scales and shifts while the drag is in progress. The runtime uses `runtime/transforms.ts#getBackgroundDragState` and `getBackgroundResetState` to drive the inline `transform`.

```html
<div data-drawer-wrapper id="app-shell">
  <main>App content</main>
</div>
```

```ts
import { createDrawer } from '@samline/drawer'
import '@samline/drawer/styles.css'

const drawer = createDrawer({
  id: 'filters',
  title: 'Filters',
  content: 'Body',
  shouldScaleBackground: true
})

drawer.setOpen(true)
```

Background-color handling is enabled by default while scaling: the body becomes black while a scale owner is open and the wrapper receives a translucent tint during drag. Set `setBackgroundColorOnScale: false` to disable the color writes, or `noBodyStyles: true` to suppress both those writes and the separate Safari fixed-body helper. The wrapper transform is reset after the final scale owner closes.

---

## Handle cycle

When `handleOnly: true` or `showHandle: true`, the runtime renders a built-in handle inside the dialog. Clicking the handle advances the active snap point via `runtime/handle.ts#getNextHandleState`.

- At any non-last snap, the click moves to the next snap.
- At the last snap with `dismissible: true`, the click closes the drawer.
- At the last snap with `dismissible: false`, the click cycles back to the first snap.
- With no `snapPoints` configured, the click is a noop regardless of `dismissible`.
- When `preventCycle: true`, the click is a noop.
- When a drag is in progress, the click is suppressed.

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'filters',
  title: 'Filters',
  content: 'Body',
  showHandle: true,
  snapPoints: ['120px', '320px', 1],
  handleClassName: 'my-handle'
})
```

The drag is restricted to the handle when `handleOnly: true`. With `showHandle: true`, the handle is visible but the drag can start from anywhere on the content surface.

---

## Viewport keyboard handling

`repositionInputs` is enabled by default. While the drawer is open and `window.visualViewport` exists, the dialog listens for viewport resizes and recomputes layout via `runtime/viewport.ts#getViewportDrivenDrawerLayout`.

- The first resize is ignored unless a text input, textarea, or editable element inside this drawer has focus. Once the keyboard is considered open, later resizes continue to update or restore the layout while it settles.
- `repositionInputs` writes `style.bottom` so the focused input stays above the mobile keyboard. Set it to `false` to opt out.
- `fixed: true` additionally writes `style.height`. Set `repositionInputs: false` when you want the height override without the default offset write.
- `preventScrollRestoration: true` flips `window.history.scrollRestoration` to `'manual'` while open and restores the previous value on close or destroy after the final owner releases it.

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'composer',
  title: 'Compose',
  content: 'Composer form',
  fixed: true,
  preventScrollRestoration: true
})
```

---

## Built-in close button

`closeButton: true` (or an object) renders an in-drawer close control. The button is HMR-safe: the runtime cleans it up on every re-mount.

```ts
import { createDrawer } from '@samline/drawer'

createDrawer({
  id: 'filters',
  content: 'Body',
  closeButton: true
})

// With overrides.
createDrawer({
  id: 'settings',
  content: 'Body',
  closeButton: {
    className: 'absolute top-5 right-5',
    icon: '\u2715', // rendered inside a <span aria-hidden="true">
    ariaLabel: 'Close settings'
  }
})
```

The button's `click` event `stopPropagation()`s so it does not bubble to the content. The defaults are class `drawer-close-button`, icon text `xmark`, and label `Close`. See [TypeScript → Close-button option shape](typescript.md#close-button-option-shape) for the full object contract.

---

## Built-in trigger button (no external element)

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'filters',
  triggerText: 'Open filters',
  title: 'Filters',
  content: 'Body'
})
```

The runtime mounts a `<button data-drawer-vanilla-trigger>` inside the host. The button is removed when the drawer is destroyed.

---

## Triggered by an external button

```html
<button id="open-filters">Open filters</button>
```

```ts
import { createDrawer, destroyDrawer } from '@samline/drawer'

const trigger = document.getElementById('open-filters')

const drawer = createDrawer({
  id: 'filters',
  triggerElement: trigger,
  title: 'Filters',
  content: 'Body'
})

// Replace the trigger later (the runtime rebinds the click listener):
drawer.update({ triggerElement: document.getElementById('open-filters-2') })

// Tear down:
destroyDrawer('filters')
```

The runtime attaches a `click` listener on the trigger element when the drawer is created, and detaches / rebinds it on `update` and `destroy`.

---

## Programmatic open / close with a controller

```ts
import { createDrawer, destroyDrawers } from '@samline/drawer'

const drawer = createDrawer({
  id: 'profile',
  direction: 'bottom',
  title: 'Profile',
  content: 'Drawer body',
  showHandle: true,
  snapPoints: ['120px', '320px', 1],
  activeSnapPoint: '120px'
})

drawer.subscribe((snapshot) => {
  console.log('drawer state:', snapshot.state.isOpen, snapshot.state.activeSnapPoint)
})

drawer.setOpen(true)
// ... user interacts ...
drawer.setActiveSnapPoint(1)
drawer.setOpen(false)

destroyDrawers() // cleanup
```

---

## Imperative helpers (no controller)

For one-off drawers where you do not need to keep the controller around, the imperative helpers cover the common cases.

```ts
import {
  openDrawer,
  closeDrawer,
  toggleDrawer,
  getDrawer,
  getDrawers,
  destroyDrawer,
  destroyDrawers
} from '@samline/drawer'

openDrawer('filters')
closeDrawer('filters')
toggleDrawer('filters')

getDrawer('filters')?.update({ activeSnapPoint: 1 })
getDrawers() // { filters: <controller> }

destroyDrawer('filters')
destroyDrawers() // clear every drawer
```

The helpers all target the same module-level registry as `createDrawer`. Reusing an `id` is an update, not a second mount.

---

## Custom container

Prefer `container` when a drawer belongs inside a specific DOM region. The deprecated `mountElement` alias remains a nullish fallback only.

```html
<div id="drawer-region"></div>
```

```ts
import { createDrawer } from '@samline/drawer'

const container = document.getElementById('drawer-region')
if (!container) throw new Error('Missing drawer region')

createDrawer({ id: 'region-a', container, content: 'A' })
createDrawer({ id: 'region-b', container, content: 'B' })
```

The container receives two dedicated `[data-drawer-vanilla-root]` children, one per id. Fractional snap points use `container.getBoundingClientRect()` rather than the full viewport.

---

## Multiple independent drawers

```ts
import { createDrawer, getDrawers, destroyDrawers } from '@samline/drawer'

createDrawer({ id: 'a', direction: 'bottom', title: 'A', content: 'A' })
createDrawer({ id: 'b', direction: 'right', title: 'B', content: 'B' })

console.log(Object.keys(getDrawers())) // ['a', 'b']

destroyDrawers()
```

Each drawer has its own host and lifecycle. If both use the same custom `container`, the runtime appends two `[data-drawer-vanilla-root]` children; destroying one leaves the other intact. Open order, not creation or update order, determines which drawer handles Escape and owns shared scale state. The IIFE exposes these helpers through `window.Drawer`; the root module does not export a `browser` namespace.

---

## Subscribe to state changes from a higher-level component

```ts
import { createDrawer, destroyDrawer } from '@samline/drawer'

const drawer = createDrawer({ id: 'filters', title: 'Filters', content: 'Body' })

const unsubscribe = drawer.subscribe((snapshot) => {
  // Dispatch a Redux / Zustand / Pinia action, run a useEffect, etc.
  console.log('state changed:', snapshot.state.isOpen)
})

// Later, when the consumer unmounts:
unsubscribe()
destroyDrawer('filters')
```

`getSnapshot()` returns the current snapshot synchronously, which is useful for selectors that read on every render.

---

## SPA / dynamic mount and unmount

Pair `createDrawer` with the consumer's mount / unmount lifecycle. The runtime does not auto-destroy when a controller reference is dropped; its host remains until `drawer.destroy()`, `destroyDrawer(id)`, or `destroyDrawers()` runs.

```ts
function showFilters() {
  const drawer = createDrawer({ id: 'filters', title: 'Filters', content: 'Body' })
  drawer.setOpen(true)
  return () => drawer.destroy() // return the cleanup
}

// In the consumer (React, Vue, Svelte, vanilla — anything):
const close = showFilters()
// ... later:
close()
```

Pair this with the [browser global helpers](getting-started.md#browser-global-helpers) when loading from a `<script>` tag: call `window.Drawer.createDrawer` on show and `window.Drawer.destroyDrawer` on teardown.

---

## Open immediately on mount with animation

Creating a drawer with `open: true` mounts the dialog and skips the entrance animation. To get an animated "open on mount" instead, create the drawer closed and call `setOpen(true)` after the mount is fully wired.

```ts
import { createDrawer } from '@samline/drawer'

const drawer = createDrawer({
  id: 'flash',
  title: 'New message',
  content: 'You have a new reply.'
  // no `open`; the drawer is initially closed and host-only
})

// Defer the open to the next microtask so the runtime can
// finish wiring the dialog subtree before the animation runs.
queueMicrotask(() => drawer.setOpen(true))
```

`defaultOpen: true` is the equivalent when you want to skip the animation entirely (e.g. a flash message that should be visible on every page load).

---

## Build a sidebar panel with the right direction

The runtime owns the slide and drag axis, but the consumer still positions the panel. Use `direction: 'left'` or `'right'` and pair it with a width in your own CSS.

```ts
import { createDrawer } from '@samline/drawer'

createDrawer({
  id: 'side-panel',
  direction: 'right',
  title: 'Filters',
  content: 'Body',
  modal: true,
  dismissible: true,
  showHandle: false
})
```

```css
[data-drawer-direction='right'] {
  width: min(24rem, 90vw);
  right: 0;
  top: 0;
  bottom: 0;
}
```

The drag axis is `x` for `left` / `right` drawers. Perpendicular page scrolls will not start a drawer drag. See [CSS styling → Position all four directions](css-styling.md#position-all-four-directions) for the full CSS shell.

---

## Common pitfalls

- **Reusing the same `id` updates the same drawer.** It does not create a second one. If you want a transient second drawer, use a unique id (e.g. `filters-${Date.now()}`) and destroy it on close.
- **Drag intent is axis-gated in every direction.** Top/bottom drawers wait for dominant Y movement; left/right drawers wait for dominant X movement. A perpendicular gesture is rejected before pointer capture. A child with `data-drawer-no-drag` also never starts a drag.
- **A close starts at the current transform.** Programmatic and drag-release closes do not reset to the fully open position before animating to the directional endpoint.
- **Input repositioning requires `window.visualViewport`.** The runtime guards the API and leaves CSS layout alone when it is absent. When present, resize writes remain focus-gated.
- **`setActiveSnapPoint` re-renders the dialog.** If you call it many times in a tick, debounce or only call it on user-driven events.
- **`history.scrollRestoration`** is touched when `preventScrollRestoration: true`. The runtime saves the previous value on open and restores it on close or destroy after the final owner. If it was already `'manual'`, that value remains unchanged.
- **`HTMLElement` content is moved, not cloned.** Do not append the same element to a second `content` while the first drawer still owns it. Use a thunk if you need a fresh node per open.
- **Thunks re-run on every reopen.** Lazy presence unmounts the dialog subtree on close, so any `() => HTMLElement` is invoked again on the next open. Cache expensive work outside the thunk.
- **Closing is not destroying.** `closeDrawer(id)` keeps the id, host, and trigger; only `destroyDrawer(id)` / `destroyDrawers()` removes the entry.
- **Body pointer events are application-owned.** Drawer open, non-modal open, close, and destroy never write `document.body.style.pointerEvents`.
- **`createDrawerController` is headless.** It publishes snapshots but does not mount DOM and ignores DOM-only options such as `content`, `container`, `triggerElement`, `closeButton`, or class names. Use `createDrawer` for the full vanilla API.
- **Auto-focus is opt-in.** The default is `false`. If your UX depends on focusing an input on open, set `autoFocus: true` or focus the element yourself in `onOpenChange(true)`.
