# Gestures and snap points

The interaction model is direction-aware: the same pointer pipeline handles bottom sheets, top trays, and left or right side panels. This guide explains the values that most affect how the gesture feels.

## A useful baseline

```ts
const drawer = createDrawer({
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

Numbers are fractions of the container (`1` is fully open). Strings are parsed as pixel counts with `parseInt`; use pixel strings such as `'420px'`. Percentage and rem strings are not CSS lengths here: `'50%'` becomes `50px` and `'1rem'` becomes `1px`.

## Order points from closed to open

Keep points finite, unique, and ordered from the smallest visible state to the largest:

```ts
snapPoints: ['96px', '420px', 1]
```

The runtime uses strict equality to find `activeSnapPoint`, so pass the exact array member. After close, the active point resets to the first entry after the exit transition.

`fadeFromIndex` selects the first snap at which the overlay is visible. Its default is the last point. In the example above, the overlay begins to fade in at `'420px'`.

## Drag permission

- Drag follows the configured axis and only captures after pointer intent is clear.
- `handleOnly: true` restricts starts to the built-in handle and ensures the handle is rendered.
- `data-drawer-no-drag` on a descendant prevents controls such as sliders, maps, and drawing surfaces from starting a drawer drag.
- Scrollable descendants keep their own scroll until the runtime determines the drawer gesture can take over. `scrollLockTimeout` controls the cooldown after a blocked attempt.

```html
<div data-drawer-no-drag>
  <input type="range" min="0" max="100" />
</div>
```

## Release behavior

Without snap points, a release dismisses when velocity or dragged distance passes the policy. `closeThreshold` is the low-velocity distance fraction of the rendered drawer dimension.

With snap points, release chooses a snap or closes from the first point when `dismissible` is enabled. `snapToSequentialPoint: true` limits one release to an adjacent point; without it, a fast gesture can skip points.

The handle cycles through snap points when clicked. `preventCycle: true` keeps handle dragging but disables click-to-cycle.

## Nested drawers

Use `parentId` to establish the relationship. Opening a child opens its ancestor chain; closing a parent closes its descendants; destroying a parent recursively destroys them. The runtime derives `nested` automatically.

```ts
const account = createDrawer({ id: 'account', title: 'Account' })

const security = createDrawer({
  id: 'security',
  parentId: 'account',
  title: 'Security'
})
```

Ids cannot form a self-reference or indirect cycle. Invalid relationships throw a `TypeError`.

## Scale the page shell

Mark one page wrapper and enable scaling on the drawer:

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

Scaling writes inline transform, radius, overflow, and transition styles to the first wrapper. Concurrent drawers share ownership; original inline styles are restored when the last owner releases it. Set `setBackgroundColorOnScale: false` to keep control of page colors.

## Related

- [Options: gesture fields](../options.md#common-fields)
- [Recipes: snap points](../recipes.md#snap-points)
- [Recipes: nested drawers](../recipes.md#nested-drawers)
- [CSS styling: scale ownership](../css-styling.md#scale-ownership)
