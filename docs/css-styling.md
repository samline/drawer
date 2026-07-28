# CSS styling

`@samline/drawer` ships motion and interaction CSS, not a finished panel theme. Its public styling surface combines data attributes, consumer classes, two internal CSS custom properties, and narrowly scoped inline styles from live runtime math.

---

## Importing the stylesheet

```ts
import '@samline/drawer/styles.css'
```

The IIFE bundle (`@samline/drawer/browser`) is a pure JS bundle — it does **not** include the stylesheet. Link the CSS separately from the browser entry:

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0/dist/browser/global.global.js"></script>
```

The browser bundle only attaches `window.Drawer`. It does not inject any `<style>` element.

---

## Presence and DOM shape

Each registered id owns a dedicated host. Closed overlay/content are absent; only an optional built-in trigger persists. While open, the shape is:

```html
<div data-drawer-vanilla-root="filters">
  <button data-drawer-vanilla-trigger>Open filters</button>     <!-- only if triggerText -->
  <div data-drawer-overlay data-state="open"></div>             <!-- only if modal -->
  <div data-drawer
       data-drawer-id="filters"
       data-state="open"
       data-drawer-direction="bottom"
       data-drawer-snap-points="false"
       data-drawer-delayed-snap-points="false"
       data-drawer-custom-container="false"
       data-drawer-animate="true"
       role="dialog"
       aria-modal="true"
       aria-label="Filters">
    <div data-drawer-handle data-drawer-visible="true">         <!-- only if showHandle or handleOnly -->
      <span data-drawer-handle-hitarea></span>
    </div>
    <div data-drawer-title id="filters-title">…</div>          <!-- only if title / ariaLabel -->
    <div data-drawer-description id="filters-description" hidden>…</div> <!-- only if description -->
    <div data-drawer-vanilla-node>
      <div data-drawer-vanilla-body data-drawer-body>…</div>   <!-- content slot -->
    </div>
    <button data-drawer-close>                                 <!-- only if closeButton -->
      <span data-drawer-close-icon aria-hidden="true">xmark</span>
    </button>
  </div>
</div>
```

Overlay, handle, trigger, title, description, and close button are conditional. On close, overlay/content remain briefly with `data-state="closed"` for the exit transition, then are removed. The host and trigger remain until destroy.

---

## Data-attribute contract

The runtime writes the following attributes. They live on the dialog primitives the host mounts under `[data-drawer-vanilla-root]`.

### `[data-drawer-vanilla-root]` — the host

Every drawer gets a dedicated host appended to `document.body` or its preferred `container` (`mountElement` is deprecated). Multiple drawers in one custom container therefore have separate hosts and mount state. The runtime owns the host, not the consumer's container.

| Attribute                  | Values                                 | When                 |
| -------------------------- | -------------------------------------- | -------------------- |
| `data-drawer-vanilla-root` | always present, value is the drawer id | mounts with the host |

The host does not receive an HTML `id`; use `[data-drawer-vanilla-root='my-id']`. This avoids collisions with ids inside consumer content.

### `[data-drawer-vanilla-trigger]` — the built-in trigger button

When `triggerText` is set, the host renders a `<button type="button">` with this attribute as the drawer's built-in trigger. It persists while closed, is reconciled during an exit, and opens the same id. The runtime removes it when `triggerText` becomes empty or the drawer is destroyed.

### `[data-drawer-overlay]` — the modal backdrop

| Attribute                         | Values               | When                                                                                 |
| --------------------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| `data-state`                      | `'open' \| 'closed'` | open state; `closed` appears only during exit                                        |
| `data-drawer-snap-points`         | `'true' \| 'false'`  | whether snap styling is active for the current open state                            |
| `data-drawer-snap-points-overlay` | `'true' \| 'false'`  | whether the active snap is in the visible overlay range                              |
| `data-drawer-animate`             | `'true' \| 'false'`  | runtime animation gate; initially open content starts false, then changes next frame |

An initially closed drawer has no overlay. During close, the overlay remains temporarily with `data-state="closed"` so the exit can finish; the shipped `pointer-events: none` rule prevents that exiting overlay from capturing clicks. Open overlays retain normal hit testing and can dismiss the drawer. The runtime does not write `document.body.style.pointerEvents`.

```css
/* Default closed-overlay guard from the shipped stylesheet. */
[data-drawer-overlay][data-state='closed'] {
  opacity: 0;
  pointer-events: none;
}
```

### `[data-drawer]` — the dialog surface

| Attribute                         | Values                                   | When                                                                                |
| --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `data-state`                      | `'open' \| 'closed'`                     | open/exit state                                                                     |
| `data-drawer-direction`           | `'top' \| 'bottom' \| 'left' \| 'right'` | mirrors the option                                                                  |
| `data-drawer-snap-points`         | `'true' \| 'false'`                      | whether snap transforms are active for the current open state                       |
| `data-drawer-delayed-snap-points` | `'false'`                                | the runtime always writes `'false'`; delayed-snap CSS selectors are not enabled    |
| `data-drawer-custom-container`    | `'true' \| 'false'`                      | `'true'` when a non-null `container` or deprecated `mountElement` is used         |
| `data-drawer-animate`             | `'true' \| 'false'`                      | runtime-controlled CSS animation gate                                               |
| `data-drawer-id`                  | the drawer id (string)                   | always present; identifies the runtime drawer without creating an HTML id collision |
| `role`                            | `'dialog'`                               | always present                                                                      |
| `aria-modal`                      | `'true' \| 'false'`                      | mirrors the `modal` option                                                          |
| `aria-label`                      | string                                   | mirrors `ariaLabel` (or the `id` fallback in the minimalist case); omitted when the consumer passes a visible `title` without `ariaLabel` |
| `aria-labelledby`                 | element id                               | only set when the title slot is mounted (consumer passed a `title`) or when the consumer provides `ariaLabelledBy` |
| `aria-describedby`                | element id                               | only set when the description slot is mounted (consumer passed a `description`) or when the consumer provides `ariaDescribedBy` |
| class `drawer-dragging`           | present while a drag is in progress      | added after axis intent is accepted; removed on release or cancellation            |

Select a single drawer with `[data-drawer-id='my-id']`; the dialog surface has no HTML `id` to avoid collisions with consumer content.

### `[data-drawer-handle]` — the built-in handle (optional)

Mounted when `showHandle: true` or `handleOnly: true`. Clicking it advances the active snap point (or closes the drawer at the last snap when `dismissible: true`).

| Attribute             | Values              | When                               |
| --------------------- | ------------------- | ---------------------------------- |
| `data-drawer-handle`  | always present      | mounts with the handle             |
| `data-drawer-visible` | `'true' \| 'false'` | mirrors `data-state` of the dialog |

### `[data-drawer-handle-hitarea]` — the handle's touch target

Always mounted alongside `[data-drawer-handle]`. A 44px × 44px (`max(100%, 2.75rem)`) transparent touch target that makes the handle comfortable to hit on touch devices. Does not style — only expands the hit area.

### `[data-drawer-body]` — the inner body wrapper

A wrapper inside `[data-drawer]` that contains the title slot (when mounted), the description slot (when mounted), and the consumer-supplied `content` (in that order). The optional close button is appended to `[data-drawer]` after the body. Consumers can use the body wrapper to style the panel (for example, `border-radius`, `background`, or `box-shadow`).

```css
[data-drawer-body] {
  background: #fff;
  border-radius: 1.5rem 1.5rem 0 0;
  padding: 1.5rem;
}
```

### `[data-drawer-title]` — the visible title slot (optional)

Mounted **only** when the consumer passes a `title` option. The slot lives inside `[data-drawer-body]` at the top, is the dialog's `aria-labelledby` target (auto-generated id `<drawer-id>-title` or the consumer's `ariaLabelledBy`), and renders visibly by default. `titleVisuallyHidden: true` is the escape hatch for consumers who render their own visible heading in `content` HTML but still need the slot for the `aria-labelledby` reference.

In the proxy (`ariaLabel` only) and minimalist (no `title` / `description` / `ariaLabel`) cases, the slot is NOT mounted. The dialog's accessible name comes from `aria-label` instead (set from `ariaLabel` or the `id` fallback).

### `[data-drawer-description]` — the accessible description slot (optional)

Mounted **only** when the consumer passes a `description` option. The slot lives inside `[data-drawer-body]` after the title slot (when both are present), is the dialog's `aria-describedby` target (auto-generated id `<drawer-id>-description` or the consumer's `ariaDescribedBy`), and is auto-hidden by default (the description is an a11y target, not visual content). `descriptionVisuallyHidden: false` is the escape hatch for a visible description.

In the no-description case, the slot is NOT mounted and the `aria-describedby` attribute is OMITTED entirely (rather than pointing at a non-existent target).

### `[data-drawer-close]` — built-in close button

Rendered inside `[data-drawer]` when `options.closeButton` is `true` or a close-button options object. Default class is `drawer-close-button`, default icon is `xmark` (rendered inside a `<span data-drawer-close-icon aria-hidden="true">`), default `aria-label` is `Close`. The button's `click` event `stopPropagation()`s so it does not bubble to the drawer's content. The button is removed on re-mount and on `destroyDrawer` (HMR-safe).

### `[data-drawer-vanilla-node]` and `[data-drawer-vanilla-body]`

The vanilla compatibility wrapper around the body slot. The body is always created while the dialog is mounted, even when `content` is omitted, so the slot exists for slot consumers that append children imperatively.

### `data-drawer-delayed-snap-points` and `data-drawer-custom-container` — runtime-written flags

The runtime writes both compatibility flags on the dialog at mount:

- `data-drawer-delayed-snap-points='false'` — the drawer's snap-point math is computed at open time, not deferred. The stylesheet selectors that target the deferred mode (in `src/style.css`) never match in this package; the runtime always writes `'false'`.
- `data-drawer-custom-container='true'` when a non-null `container` (or deprecated `mountElement`) is used; otherwise it is `'false'`. The shipped `::after` extension applies only when this flag is false.

These attributes are part of the runtime contract but not user-configurable. Documenting them prevents surprises when consumers inspect the DOM.

### `data-drawer-no-drag` — opt-out marker for descendants (consumer-set)

This is the only `data-drawer-*` attribute the **consumer** sets on a descendant of the drawer. Add it to any element (input, button, scrollable list) that should not start a drag gesture. The drag pipeline walks up from the pointer target and refuses to start a drag if it finds this attribute on the target or any ancestor. The stylesheet does not style this attribute — it is a behavior marker, not a visual one.

```html
<button data-drawer-no-drag>Click me without dragging the drawer</button>
```

### `data-drawer-wrapper` — the consumer's page shell (consumer-set)

This is the only `data-drawer-*` attribute the **consumer** sets on a non-descendant. Add it to the page shell that should scale behind the drawer when `shouldScaleBackground: true` is set. The runtime reads it; it does not write it.

```html
<div data-drawer-wrapper id="app-shell">
  <main>Application</main>
</div>
```

---

## Theming

Override any of the data-attribute selectors in your own stylesheet. The runtime also writes targeted inline transforms, snap offsets, overlay opacity, transition state, and viewport keyboard offsets while those behaviors are active.

### Bottom sheet with a rounded panel

```css
[data-drawer-vanilla-root] [data-drawer] {
  background: #f3f4f6;
  border-radius: 40px 40px 0 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  height: fit-content;
  left: 0;
  margin-top: 6rem;
  outline: none;
  position: fixed;
  right: 0;
  z-index: 100;
}

[data-drawer-vanilla-root] [data-drawer-overlay] {
  background: rgba(0, 0, 0, 0.8);
  inset: 0;
  position: fixed;
  z-index: 100;
}
```

### Disable the close animation

```css
[data-drawer-animate='false'] {
  animation: none !important;
}
```

### Scale the page shell behind the drawer

When `shouldScaleBackground: true`, the page shell — the element with `data-drawer-wrapper` — receives an inline scale/translate transform while open and follows drag progress. Pair it with a transition for a smooth feel:

```css
[data-drawer-wrapper] {
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
  transform-origin: top;
}
```

### Snap-point overlay fade

With snap points, the stylesheet handles the overlay's opacity transition around `fadeFromIndex`. The option defaults to the final snap index, and the runtime writes `data-drawer-snap-points-overlay="true"` when the active snap is in the visible range:

```css
[data-drawer-overlay][data-drawer-snap-points='true'] {
  opacity: 1;
  transition: opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}
```

### Position all four directions

The package provides direction-aware transforms but intentionally does not position the panel. A minimal four-direction shell:

```css
[data-drawer-overlay] {
  background: rgb(15 23 42 / 60%);
  inset: 0;
  position: fixed;
  z-index: 100;
}

[data-drawer] {
  background: #fff;
  box-sizing: border-box;
  outline: none;
  position: fixed;
  z-index: 101;
}

[data-drawer-direction='bottom'] {
  border-radius: 1.5rem 1.5rem 0 0;
  bottom: 0;
  left: 0;
  right: 0;
}

[data-drawer-direction='top'] {
  border-radius: 0 0 1.5rem 1.5rem;
  left: 0;
  right: 0;
  top: 0;
}

[data-drawer-direction='left'] {
  bottom: 0;
  left: 0;
  top: 0;
  width: min(24rem, 90vw);
}

[data-drawer-direction='right'] {
  bottom: 0;
  right: 0;
  top: 0;
  width: min(24rem, 90vw);
}
```

The shared keyframes use the Y axis for `top`/`bottom` and X axis for `left`/`right`. Close-direction drag follows the same four sides.

---

## Inline writes

Not every live effect can be expressed by static CSS. The runtime writes and later restores these values:

| Target                     | Runtime writes                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `[data-drawer]`            | `transform` / `transition` during drag, snap changes, and exit seeding; `--initial-transform`; keyboard-driven `bottom` / `height`. |
| `[data-drawer-overlay]`    | Inline `opacity` / `transition` while dragging across the fade range and while settling.                                          |
| `[data-drawer-wrapper]`    | Scale / translate, border radius, overflow, transform origin, transition properties, and optional drag background color.          |
| `document.body`            | Modal scroll-lock styles; Safari fixed-position styles; black scale-background color by default.                                |
| `document.documentElement` | `scroll-behavior: auto` while a modal owner is open.                                                                            |
| `window.history`           | `scrollRestoration = 'manual'` when requested.                                                                                  |

The runtime never writes `document.body.style.pointerEvents`. Existing application or modal-library values remain untouched.

---

## Scale ownership

`shouldScaleBackground: true` applies the wrapper's scaled open-rest state immediately on open, not only after the first drag. `setBackgroundColorOnScale` is on by default, so the body becomes black while a scale owner is open unless that option is `false` or `noBodyStyles` is true.

Scale state is owner-stacked per wrapper. The most recently opened owner controls the transform; closing it reapplies the previous open owner's direction/state. Original wrapper styles return after the final owner closes and its transition completes. Body background ownership is shared globally across wrapper groups, so one drawer cannot restore the body color while another still needs it.

The body scroll lock, HTML scroll behavior, and optional history restoration are also shared / ref-counted across open drawers.

---

## Notes

- The shared stylesheet includes open/close keyframes, snap selectors, overlay fade behavior, the handle, and the default `::after` panel extension. Supply your own geometry and theme.
- `--initial-transform` is written by the runtime for snap offsets and removed before exit; close seeding uses an inline `transform`. `--snap-point-height` exists only as a fallback in the disabled delayed-snap CSS selectors; the runtime does not write it.
- Custom classes (`overlayClassName`, `contentClassName`, `handleClassName`, and `closeButton.className`) are the safest instance-specific styling hooks.
- Do not remove the closed-overlay `pointer-events: none` behavior when overriding selectors.
- The runtime also adds the exported `drawer-dragging` class to `[data-drawer]` while a drag is in progress. Target it from your stylesheet to disable selection or change the cursor.
