# Recipes

End-to-end patterns for the common flows.

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

## Common pitfalls

- **Reusing the same `id` updates the same drawer.** It does not create a second one. If you want a transient second drawer, use a unique id (e.g. `filters-${Date.now()}`) and destroy it on close.
- **Drag intent is axis-gated in every direction.** Top/bottom drawers wait for dominant Y movement; left/right drawers wait for dominant X movement. A perpendicular gesture is rejected before pointer capture. A child with `data-drawer-no-drag` also never starts a drag.
- **A close starts at the current transform.** Programmatic and drag-release closes do not reset to the fully open position before animating to the directional endpoint.
- **Input repositioning requires `window.visualViewport`.** The runtime guards the API and leaves CSS layout alone when it is absent. When present, resize writes remain focus-gated.
- **`setActiveSnapPoint` re-renders the dialog.** If you call it many times in a tick, debounce or only call it on user-driven events.
- **`history.scrollRestoration`** is touched when `preventScrollRestoration: true`. The runtime saves the previous value on open and restores it on close or destroy after the final owner. If it was already `'manual'`, that value remains unchanged.
