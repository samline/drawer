---
title: Accessibility and focus
description: Name dialogs, manage focus, choose dismissal behavior, and make draggable content work with keyboard and touch.
template: doc
---

`@samline/drawer` provides dialog semantics, modal focus ownership, keyboard dismissal, background isolation, and accessible built-in controls. Your application owns meaningful copy, logical content order, visible focus styles, and any status or validation messages inside the drawer.

## Name and describe the dialog

Prefer a visible title when the interface has a heading:

```ts
createDrawer({
  id: 'filters',
  title: 'Filter products',
  description: 'Choose one or more filters, then apply them.',
  content: buildFilterForm()
})
```

The title becomes the `aria-labelledby` target. The description becomes the `aria-describedby` target and is visually hidden by default. Set `descriptionVisuallyHidden: false` when it should also be visible.

For a drawer without a visible heading, use `ariaLabel`:

```ts
createDrawer({ id: 'quick-actions', ariaLabel: 'Quick actions' })
```

If neither value is supplied, the id is used as an accessible-label fallback. That avoids an unnamed dialog but is rarely ideal user-facing copy.

Use `ariaLabelledBy` or `ariaDescribedBy` when the matching node lives inside custom content. Your integration must keep that id present whenever the dialog is mounted.

## Modal focus ownership

With the default `modal: true`, the drawer:

- mounts an overlay;
- moves focus inside unless `autoFocus: false`;
- traps Tab and Shift+Tab;
- isolates background branches with `inert` and `aria-hidden`;
- locks page scroll;
- restores focus after close.

`modal: false` omits those modal effects. Use it for a genuinely non-modal complementary panel, not merely to hide an overlay.

:::caution[Custom focus management]
If you set `autoFocus: false`, move focus intentionally when a modal drawer opens. Leaving keyboard focus behind an active modal produces a broken interaction even when the panel looks correct.
:::

## Dismissal and controls

`dismissible: true` enables Escape, overlay release, drag-to-close, and dismissal from the final handle state. A built-in close button or programmatic method can still close when `dismissible: false`.

```ts
createDrawer({
  id: 'terms',
  title: 'Terms of service',
  dismissible: false,
  closeButton: { ariaLabel: 'Close terms' },
  content: buildTerms()
})
```

The snap-point handle is a button. Set `handleAriaLabel` to describe its action in context, especially when clicking cycles through panel heights.

## Interactive draggable content

Add `data-drawer-no-drag` around a control whose pointer movement must remain entirely its own, such as a slider, map, canvas, or signature pad:

```html
<div class="map" data-drawer-no-drag aria-label="Store map"></div>
```

The mobile viewport pipeline is enabled through `repositionInputs` by default. It responds while a control is focused and the visual viewport changes. `fixed: true` additionally writes a calculated drawer height; it is not required for basic keyboard repositioning.

## Verification checklist

- Use a concise visible `title` or meaningful `ariaLabel`.
- Add `description` only when it adds context beyond the title.
- Keep visible focus indicators in application CSS.
- Verify Tab and Shift+Tab wrap inside modal drawers.
- Verify Escape and the close button match the intended dismissal policy.
- Verify focus returns to the trigger after close.
- Test scrollable and `data-drawer-no-drag` content with keyboard, mouse, and touch.
- Preserve reduced-motion preferences in theme overrides.
- Destroy the drawer when its owning view unmounts.

## Related

- [Configuration: ARIA and focus fields](/drawer/reference/configuration/#vanilla-only-fields)
- [Styling and DOM contract](/drawer/reference/css-styling/)
- [Recipes: external ARIA targets](/drawer/reference/examples/#recipe-external-aria-targets)
