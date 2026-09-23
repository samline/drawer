---
title: Gestures and snap points
description: Tune direction-aware dragging, snap ordering, handle behavior, nested drawers, and scaled backgrounds.
template: doc
---

The same pointer pipeline powers bottom sheets, top trays, and left or right side panels. Direction chooses the axis and close direction; snap points choose the stable positions along that axis.

## Start with a predictable model

```ts
const player = createDrawer({
  id: 'player',
  direction: 'bottom',
  showHandle: true,
  snapPoints: ['96px', '420px', 1],
  activeSnapPoint: '96px',
  fadeFromIndex: 1,
  snapToSequentialPoint: true,
  content: buildPlayer()
})
```

Numbers are container fractions (`1` is fully open). Strings are parsed as pixel counts with `parseInt`, so use pixel strings such as `'420px'`. `'50%'` becomes `50px` and `'1rem'` becomes `1px`; they are not evaluated as CSS lengths.

:::caution[Keep values ordered and exact]
List finite, unique points from the smallest visible state to the largest. `activeSnapPoint` uses strict equality, so pass the exact number or string stored in `snapPoints`.
:::

## Snap lifecycle

- The first point is the initial default.
- A drag release selects a point or closes from the first point when dismissal is allowed.
- `snapToSequentialPoint: true` restricts one release to an adjacent point.
- Clicking the built-in handle cycles forward through points; `preventCycle: true` disables the click while preserving drag.
- Closing resets the active point to the first entry after the 500 ms exit transition.
- `fadeFromIndex` is the first point at which the overlay is visible; it defaults to the last point.

Use `onActiveSnapPointChange` to synchronize runtime-selected points with external state:

```ts
createDrawer({
  id: 'player',
  snapPoints: ['96px', '420px', 1],
  onActiveSnapPointChange(value) {
    localStorage.setItem('player-snap', String(value))
  }
})
```

Direct `controller.setActiveSnapPoint(value)` updates the controller but deliberately does not echo this callback.

## Drag permission

| Need                                                 | Use                                        |
| ---------------------------------------------------- | ------------------------------------------ |
| Drag only from the handle                            | `handleOnly: true`                         |
| Keep a slider, map, or canvas gesture independent    | `data-drawer-no-drag` on it or an ancestor |
| Prevent handle click from cycling snaps              | `preventCycle: true`                       |
| Require more travel before a snap-free drawer closes | Increase `closeThreshold`                  |
| Delay capture after content scrolling blocks a drag  | Increase `scrollLockTimeout`               |

```html
<div data-drawer-no-drag>
  <input type="range" min="0" max="100" aria-label="Volume" />
</div>
```

The pointer pipeline waits for axis intent before it captures. Scrollable descendants keep their own scroll until the runtime determines the drawer gesture can take over.

## Nested drawers

Use `parentId`; do not set `nested` by itself. Opening a child opens its ancestor chain. Closing a parent closes descendants, and destroying a parent recursively destroys them.

```ts
const account = createDrawer({ id: 'account', title: 'Account' })

const security = createDrawer({
  id: 'security',
  parentId: 'account',
  title: 'Security'
})
```

Self-references and indirect id cycles throw a `TypeError`.

## Scale the page behind the drawer

```html
<main data-drawer-wrapper>...</main>
```

```ts
createDrawer({
  id: 'menu',
  shouldScaleBackground: true,
  setBackgroundColorOnScale: true
})
```

The first wrapper receives inline transform, radius, overflow, and transition styles. Concurrent drawers share ownership; the original inline styles return after the final owner releases them. Pass `setBackgroundColorOnScale: false` when your application owns the page colors.

## Related

- [Configuration: gesture fields](/drawer/reference/configuration/#common-fields)
- [Recipes: snap points](/drawer/reference/examples/#recipe-snap-points)
- [Recipes: nested drawers](/drawer/reference/examples/#recipe-nested-drawers)
- [Styling: scale ownership](/drawer/reference/css-styling/#scale-ownership)
