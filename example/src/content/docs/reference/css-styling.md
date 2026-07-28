---
title: CSS styling
description: Style @samline/drawer through its data attributes, classes, and documented runtime inline writes.
template: doc
sidebar:
  order: 6
---

`@samline/drawer` ships motion and interaction CSS, not a finished panel theme. Its public styling surface combines data attributes, consumer classes, two internal CSS custom properties, and narrowly scoped inline styles from live runtime math.

## Load the stylesheet

With a bundler:

```ts
import '@samline/drawer/styles.css'
```

With the 3.0.0 browser bundle, CSS and JavaScript are separate assets:

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@3.0.0/dist/browser/global.global.js"></script>
```

The IIFE does not inline CSS and never injects `<style data-drawer-runtime-styles>`.

## Presence and DOM shape

Each registered id owns a dedicated host. Closed overlay/content are absent; only an optional built-in trigger persists. While open, the shape is:

```html
<div data-drawer-vanilla-root="filters">
  <button data-drawer-vanilla-trigger>Open filters</button>
  <div data-drawer-overlay data-state="open"></div>
  <div data-drawer data-drawer-id="filters" data-state="open" role="dialog">
    <div data-drawer-handle>
      <span data-drawer-handle-hitarea></span>
    </div>
    <div data-drawer-title></div>
    <div data-drawer-description></div>
    <div data-drawer-vanilla-node>
      <div data-drawer-vanilla-body></div>
    </div>
    <button data-drawer-close>
      <span data-drawer-close-icon aria-hidden="true">xmark</span>
    </button>
  </div>
</div>
```

Overlay, handle, trigger, and close button are conditional. On close, overlay/content remain briefly with `data-state="closed"` for the exit transition, then are removed. The host and trigger remain until destroy.

## Runtime attributes

### `[data-drawer-vanilla-root]`

The runtime creates one host child per id under `container ?? mountElement ?? document.body`. Even drawers sharing a custom container get separate hosts and mount state.

| Attribute                  | Value                |
| -------------------------- | -------------------- |
| `data-drawer-vanilla-root` | normalized drawer id |

The host does not receive an HTML `id`; use `[data-drawer-vanilla-root="filters"]` rather than `#filters`.

### `[data-drawer-vanilla-trigger]`

Optional `<button type="button">` created by `triggerText`. It persists while closed, is reconciled during an exit, and opens the same id. The runtime removes it when `triggerText` becomes empty or the drawer is destroyed.

### `[data-drawer-overlay]`

Only modal, present drawers render an overlay.

| Attribute                         | Values               | Meaning                                                                                                                     |
| --------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `data-state`                      | `'open' \| 'closed'` | Open state; closed appears only during exit.                                                                                |
| `data-drawer-snap-points`         | `'true' \| 'false'`  | Whether snap styling is active for the current state.                                                                       |
| `data-drawer-snap-points-overlay` | `'true' \| 'false'`  | Whether the active snap is in the visible overlay range.                                                                    |
| `data-drawer-animate`             | `'true' \| 'false'`  | First open-at-create frame is `false`; later frames/opens become `true`. `false` matches the shared animation opt-out rule. |

The closed overlay has `opacity: 0` and `pointer-events: none`, so the exiting invisible layer cannot block the page:

```css
[data-drawer-overlay][data-state='closed'] {
  opacity: 0;
  pointer-events: none;
}
```

### `[data-drawer]`

The dialog surface has no HTML `id`. Select one instance with `[data-drawer-id="filters"]`.

| Attribute                         | Values                                   | Meaning                                                                                                                                         |
| --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-drawer-id`                  | drawer id                                | Stable instance metadata without an HTML-id collision.                                                                                          |
| `data-state`                      | `'open' \| 'closed'`                     | Open/exit state.                                                                                                                                |
| `data-drawer-direction`           | `'top' \| 'bottom' \| 'left' \| 'right'` | Motion, drag, and snap direction.                                                                                                               |
| `data-drawer-snap-points`         | `'true' \| 'false'`                      | Whether snap-point transforms are active.                                                                                                       |
| `data-drawer-delayed-snap-points` | `'false'`                                | Beta.4 computes the initial snap immediately; the shipped `'true'` CSS selectors are not enabled by the runtime.                                |
| `data-drawer-custom-container`    | `'true' \| 'false'`                      | `true` when a non-null `container` or deprecated `mountElement` is used. The default-only `::after` extension is omitted for custom containers. |
| `data-drawer-animate`             | `'true' \| 'false'`                      | Shared CSS animation gate.                                                                                                                      |
| `role`                            | `'dialog'`                               | Always present while the dialog is mounted.                                                                                                     |
| `aria-modal`                      | `'true' \| 'false'`                      | Mirrors `modal`.                                                                                                                                |
| `aria-label`                      | string                                   | Present when `ariaLabel` is supplied.                                                                                                           |
| `aria-labelledby`                 | element id                               | Custom target or generated title-slot id.                                                                                                       |
| `aria-describedby`                | element id                               | Custom target or generated description-slot id.                                                                                                 |

After axis intent is accepted, the runtime adds the exported `drawer-dragging` class and removes it on release/cancel.

### Handle and hit area

`[data-drawer-handle]` mounts for `showHandle` or `handleOnly` and carries `data-drawer-visible="true|false"`. Its `[data-drawer-handle-hitarea]` child expands the touch target to at least 44 by 44 pixels; fine pointers use the handle's own bounds.

Clicking the handle advances snap points. At the final snap it closes when dismissible or cycles to the first when not dismissible. With no snap points it is a no-op. `preventCycle` disables click behavior without disabling drag.

### Content slots

- `[data-drawer-title]` and `[data-drawer-description]` are always created with an open dialog, even when empty, so ARIA references have stable targets.
- `[data-drawer-vanilla-node]` is the compatibility wrapper around the body slot only.
- `[data-drawer-vanilla-body]` receives `content`.
- `[data-drawer-close]` is the optional built-in close button; `[data-drawer-close-icon]` wraps its string or element icon and is `aria-hidden`.

An `ariaLabel` promoted into an otherwise empty title slot is visually hidden by default. Explicit title content remains visible unless `titleVisuallyHidden: true` is set.

## Consumer markers

### `[data-drawer-wrapper]`

This marker is consumer-authored. Add it to the page shell that `shouldScaleBackground` should affect. The runtime uses the first match from `document.querySelector` and does not create the wrapper.

```html
<div data-drawer-wrapper>
  <main>Application</main>
</div>
```

### `[data-drawer-no-drag]`

Add this behavior marker to a descendant whose target or subtree must not start a drawer drag. It is useful for custom interactive or scrollable regions; the shared CSS does not style it.

## Position all four directions

The package provides direction-aware transforms but intentionally does not position or color the panel. A minimal four-direction shell can start here:

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

## Inline writes

Not every live effect can be expressed by static CSS. Beta.4 writes and later restores these values:

| Target                     | Runtime writes                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `[data-drawer]`            | `transform`/`transition` during drag, snap changes, and exit seeding; `--initial-transform`; keyboard-driven `bottom`/`height`. |
| `[data-drawer-overlay]`    | Inline `opacity`/`transition` while dragging across the fade range and while settling.                                          |
| `[data-drawer-wrapper]`    | Scale/translate, border radius, overflow, transform origin, transition properties, and optional drag background color.          |
| `document.body`            | Modal scroll-lock styles; Safari fixed-position styles; black scale-background color by default.                                |
| `document.documentElement` | `scroll-behavior: auto` while a modal owner is open.                                                                            |
| `window.history`           | `scrollRestoration = 'manual'` when requested.                                                                                  |

The runtime never writes `document.body.style.pointerEvents`. Existing application or modal-library values remain untouched.

## Scale ownership

`shouldScaleBackground: true` applies the wrapper's scaled open-rest state immediately on open, not only after the first drag. `setBackgroundColorOnScale` is on by default, so the body becomes black while a scale owner is open unless that option is `false` or `noBodyStyles` is true.

Scale state is owner-stacked per wrapper. The most recently opened owner controls the transform; closing it reapplies the previous open owner's direction/state. Original wrapper styles return after the final owner closes and its transition completes. Body background ownership is shared globally across wrapper groups, so one drawer cannot restore the body color while another still needs it.

The body scroll lock, HTML scroll behavior, and optional history restoration are also shared/ref-counted across open drawers.

## Notes

- The shared stylesheet includes open/close keyframes, snap selectors, overlay fade behavior, the handle, and the default `::after` panel extension. Supply your own geometry and theme.
- `--initial-transform` is written by the runtime for snap offsets and removed before exit; close seeding uses an inline `transform`. `--snap-point-height` exists only as a fallback in the disabled delayed-snap CSS selectors; the 3.0.0 JavaScript does not write it.
- Custom classes (`overlayClassName`, `contentClassName`, `handleClassName`, and `closeButton.className`) are the safest instance-specific styling hooks.
- Do not remove the closed-overlay `pointer-events: none` behavior when overriding selectors.
