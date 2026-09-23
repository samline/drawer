# Accessibility and focus

`@samline/drawer` supplies dialog semantics, focus management, modal isolation, keyboard dismissal, and accessible built-in controls. The application still owns meaningful labels, content order, visible focus styles, and validation or status messages inside the panel.

## Give every drawer a useful name

Prefer a visible `title` when the interface has a heading:

```ts
createDrawer({
  id: 'filters',
  title: 'Filter products',
  description: 'Choose one or more filters, then apply them.',
  content: buildFilterForm()
})
```

The title slot becomes the `aria-labelledby` target. Descriptions are visually hidden by default and become the `aria-describedby` target. Set `descriptionVisuallyHidden: false` when the description should also be visible.

For a drawer without a visible heading, use `ariaLabel`:

```ts
createDrawer({ id: 'quick-actions', ariaLabel: 'Quick actions' })
```

If neither title nor label is supplied, the id is used as a fallback label. That prevents an unnamed dialog but is rarely good user-facing copy.

Use `ariaLabelledBy` or `ariaDescribedBy` when the matching nodes live in custom content. You are responsible for keeping those ids present whenever the dialog is mounted.

## Modal focus ownership

With the default `modal: true`, the drawer:

- mounts an overlay;
- moves focus into the dialog unless `autoFocus: false`;
- traps Tab and Shift+Tab inside;
- isolates background branches with `inert` and `aria-hidden`;
- locks page scroll;
- restores focus when it closes.

`modal: false` omits those modal effects. Use it for a persistent complementary panel, not merely to change the overlay appearance.

When content contains a preferred first control, focus it from application code after opening, or set `autoFocus: false` and manage focus completely. Do not leave a modal drawer open with focus behind it.

## Dismissal is a product decision

`dismissible: true` enables Escape, overlay release, drag-to-close, and dismissal from the last handle state. The built-in close button and programmatic methods can still close a drawer when `dismissible: false`.

For blocking flows, provide an explicit labeled action rather than relying on gesture dismissal:

```ts
createDrawer({
  id: 'terms',
  title: 'Terms of service',
  dismissible: false,
  closeButton: { ariaLabel: 'Close terms' },
  content: buildTerms()
})
```

The built-in handle is a button. Set `handleAriaLabel` to describe what it does in context, especially when snap points make it cycle between heights.

## Interactive content and drag

Inputs, buttons, links, and editable content participate in the drawer's gesture policy. Add `data-drawer-no-drag` around interactions whose horizontal or vertical pointer movement must remain entirely theirs:

```html
<div class="map" data-drawer-no-drag aria-label="Store map"></div>
```

The mobile viewport pipeline is enabled by default through `repositionInputs`. It responds while an input is focused and the visual viewport changes. `fixed: true` also adjusts calculated height; it is not required for basic keyboard repositioning.

## Accessibility checklist

- Use a concise visible `title` or meaningful `ariaLabel`.
- Add `description` only when it adds context beyond the title.
- Keep visible focus indicators in your theme.
- Verify Tab and Shift+Tab wrap inside modal drawers.
- Verify Escape and the close button match the intended dismissal policy.
- Verify focus returns to the trigger after close.
- Test controls inside scrollable and `data-drawer-no-drag` regions with mouse, touch, and keyboard.
- Respect reduced-motion preferences in application overrides.
- Destroy drawers when their owning view unmounts so hidden hosts and triggers do not remain in the accessibility tree.

## Related

- [Options: ARIA and focus fields](../options.md#vanilla-only-options)
- [CSS styling](../css-styling.md)
- [Recipes: external ARIA targets](../recipes.md#external-aria-targets)
