---
locale: en
title: 'CSS styling'
description: 'Position and theme Drawer panels using its documented DOM, data attributes and inline-style ownership. Includes all four directions.'
sidebar:
  group: reference
  order: 7
---

`@samline/drawer` ships motion and interaction CSS, not a finished panel theme. Its public styling surface combines data attributes, consumer classes, two internal CSS custom properties, and narrowly scoped inline styles from live runtime math.

<span id="importing-the-stylesheet"></span>

## Load the stylesheet

With a bundler:

```ts
import '@samline/drawer/styles.css'
// Equivalent alias: import '@samline/drawer/style.css'
```

With the 5.0.2 browser bundle, CSS and JavaScript are separate assets:

```html
<link rel="stylesheet" href="https://unpkg.com/@samline/drawer@5.0.2/dist/style.css" />
<script src="https://unpkg.com/@samline/drawer@5.0.2/dist/browser/global.global.js"></script>
```

The IIFE does not inline CSS and never injects `<style data-drawer-runtime-styles>`.

## Presence and DOM shape

Each registered id owns a dedicated host. Closed overlay/content are absent; only an optional built-in trigger persists. While open, the shape is:

```html
<div data-drawer-vanilla-root="filters">
  <button data-drawer-vanilla-trigger>Open filters</button>
  <!-- only if triggerText -->
  <div data-drawer-overlay data-state="open"></div>
  <!-- when overlay resolves true; defaults to modal -->
  <div
    data-drawer
    data-drawer-id="filters"
    data-state="open"
    data-drawer-direction="bottom"
    data-drawer-snap-points="false"
    data-drawer-delayed-snap-points="false"
    data-drawer-custom-container="false"
    data-drawer-animate="true"
    role="dialog"
    aria-modal="true"
    aria-label="Filters"
  >
    <button
      type="button"
      data-drawer-handle
      data-drawer-visible="true"
      aria-label="Change drawer position"
    >
      <!-- only if showHandle or handleOnly -->
      <span data-drawer-handle-hitarea aria-hidden="true"></span>
    </button>
    <div data-drawer-body>
      <div data-drawer-title id="filters-title">…</div>
      <!-- only if title !== undefined -->
      <div data-drawer-description id="filters-description">…</div>
      <!-- only if description !== undefined; visually hidden with inline styles by default -->
      …
      <!-- content -->
    </div>
    <button data-drawer-close>
      <!-- only if closeButton -->
      <span data-drawer-close-icon aria-hidden="true">xmark</span>
    </button>
  </div>
</div>
```

Overlay, handle, trigger, title, description, and close button are conditional. On close, overlay/content remain briefly with `data-state="closed"` for the exit transition, then are removed. The host and trigger remain until destroy.

<span id="data-attribute-contract"></span>

## Runtime attributes

<span id="data-drawer-vanilla-root--the-host"></span>

### `[data-drawer-vanilla-root]`

The runtime creates one host child per id under `container ?? document.body`. Even drawers sharing a custom container get separate hosts and mount state.

| Attribute                  | Value                |
| -------------------------- | -------------------- |
| `data-drawer-vanilla-root` | normalized drawer id |

The host does not receive an HTML `id`; use `[data-drawer-vanilla-root="filters"]` rather than `#filters`.

<span id="data-drawer-vanilla-trigger--the-built-in-trigger-button"></span>

### `[data-drawer-vanilla-trigger]`

Optional `<button type="button">` created by `triggerText`. It persists while closed, is reconciled during an exit, and opens the same id. The runtime removes it when `triggerText` becomes empty or the drawer is destroyed.

<span id="data-drawer-overlay--the-backdrop"></span>

### `[data-drawer-overlay]`

Present drawers render an overlay when `overlay` resolves to `true`. It defaults to the value of `modal`, so modal drawers retain a backdrop by default while modeless drawers can opt in explicitly.

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

<span id="data-drawer--the-dialog-surface"></span>

<span id="data-drawer-delayed-snap-points-and-data-drawer-custom-container--runtime-written-flags"></span>

### `[data-drawer]`

The dialog surface has no HTML `id`. Select one instance with `[data-drawer-id="filters"]`.

| Attribute                         | Values                                   | Meaning                                                                                                            |
| --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `data-drawer-id`                  | drawer id                                | Stable instance metadata without an HTML-id collision.                                                             |
| `data-state`                      | `'open' \| 'closed'`                     | Open/exit state.                                                                                                   |
| `data-drawer-direction`           | `'top' \| 'bottom' \| 'left' \| 'right'` | Motion, drag, and snap direction.                                                                                  |
| `data-drawer-snap-points`         | `'true' \| 'false'`                      | Whether snap-point transforms are active.                                                                          |
| `data-drawer-delayed-snap-points` | `'false'`                                | 5.0.2 computes the initial snap immediately; the shipped `'true'` CSS selectors are not enabled by the runtime.    |
| `data-drawer-custom-container`    | `'true' \| 'false'`                      | `true` when a non-null `container` is used. The default-only `::after` extension is omitted for custom containers. |
| `data-drawer-animate`             | `'true' \| 'false'`                      | Shared CSS animation gate.                                                                                         |
| `role`                            | `'dialog'`                               | Always present while the dialog is mounted.                                                                        |
| `aria-modal`                      | `'true' \| 'false'`                      | Mirrors `modal`.                                                                                                   |
| `aria-label`                      | string                                   | Explicit `ariaLabel`, or the drawer id when no title and no explicit label are supplied.                           |
| `aria-labelledby`                 | element id                               | Custom target or generated title-slot id.                                                                          |
| `aria-describedby`                | element id                               | Custom target or generated description-slot id.                                                                    |

After axis intent is accepted, the runtime adds the exported `drawer-dragging` class and removes it on release/cancel.

<span id="data-drawer-handle--the-built-in-handle-optional"></span>

<span id="data-drawer-handle-hitarea--the-handles-touch-target"></span>

### Handle and hit area

`[data-drawer-handle]` mounts for `showHandle` or `handleOnly` and carries `data-drawer-visible="true|false"`. Its `[data-drawer-handle-hitarea]` child expands the touch target to at least 44 by 44 pixels; fine pointers use the handle's own bounds.

Clicking the handle advances snap points. At the final snap it closes when dismissible or cycles to the first when not dismissible. With no snap points it is a no-op. `preventCycle` disables click behavior without disabling drag.

<span id="data-drawer-body--the-inner-body-wrapper"></span>

<span id="data-drawer-title--the-visible-title-slot-optional"></span>

<span id="data-drawer-description--the-accessible-description-slot-optional"></span>

<span id="data-drawer-close--built-in-close-button"></span>

<span id="data-drawer-vanilla-node-and-data-drawer-vanilla-body"></span>

### Content slots

- `[data-drawer-body]` is always created. Its children are the optional title, optional description, and resolved consumer content, in that order.
- `[data-drawer-title]` exists only when `title !== undefined`; `[data-drawer-description]` exists only when `description !== undefined`. Passing `null` creates an empty slot, while omission does not.
- The old `[data-drawer-vanilla-node]` and `[data-drawer-vanilla-body]` wrappers do not exist in 5.0.2. Target `[data-drawer-body]` instead. See [Configuration → Renderable content](../configuration/#renderable-content).
- `[data-drawer-close]` is the optional built-in close button; `[data-drawer-close-icon]` wraps its string or element icon and is `aria-hidden`.

`titleVisuallyHidden` and `descriptionVisuallyHidden` apply inline visually-hidden styles rather than the HTML `hidden` attribute. `ariaLabel` does not create a proxy title slot.

## Consumer markers

<span id="data-drawer-wrapper--the-consumers-page-shell-consumer-set"></span>

### `[data-drawer-wrapper]`

This marker is consumer-authored. Add it to the page shell that `shouldScaleBackground` should affect. The runtime uses the first match from `document.querySelector` and does not create the wrapper.

```html
<div data-drawer-wrapper>
  <main>Application</main>
</div>
```

<span id="data-drawer-no-drag--opt-out-marker-for-descendants-consumer-set"></span>

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

## Scroll only the content

Keep the positioned panel separate from its scrollable body. The runtime extends the panel background with an absolutely positioned `::after` during drag; putting `overflow: auto` on the panel itself makes that extension part of the scroll range, even for a short sheet.

```css
.my-drawer {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-height: 90dvh;
}

.my-drawer [data-drawer-body] {
  flex: 0 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.my-drawer [data-drawer-title],
.my-drawer [data-drawer-close],
.my-drawer [data-drawer-handle] {
  flex-shrink: 0;
}
```

Add your panel positioning, padding and colors as usual. Leave panel overflow visible, keep close/handle controls outside the scrolling body, and let short content keep its natural height. Long content then scrolls inside `[data-drawer-body]`. Give a reading-only content element `tabindex="0"`, an accessible region name and a visible focus indicator so keyboard users can reach it and scroll with PageDown/arrow keys; existing interactive content can supply its own focus targets. Test actual keyboard scrolling; do not remove the runtime background extension or add fixed filler height to conceal the issue. See the [working examples](../../guides/examples/).

## Inline writes

Not every live effect can be expressed by static CSS. 5.0.2 writes and later restores these values:

| Target                     | Runtime writes                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `[data-drawer]`            | `transform`/`transition` during drag, snap changes, and exit seeding; `--initial-transform`; keyboard-driven `bottom`/`height`. |
| `[data-drawer-overlay]`    | Inline `opacity`/`transition` while dragging across the fade range and while settling.                                          |
| `[data-drawer-wrapper]`    | Scale/translate, border radius, overflow, transform origin, transition properties, and optional drag background color.          |
| `document.body`            | Modal scroll-lock styles; Safari fixed-position styles; black scale-background color by default.                                |
| `document.documentElement` | `scroll-behavior: auto` while a modal owner is open.                                                                            |
| `window.history`           | `scrollRestoration = 'manual'` when requested.                                                                                  |

The runtime never writes `document.body.style.pointerEvents`. Existing application or modal-library values remain untouched.

Nested children also write `transform` and `transition` directly on the parent `[data-drawer]`. The final reset is an explicit scale-1 transform, not restoration of a consumer's previous inline transform. Put application transforms on an inner wrapper when using nested drawers.

## Scale ownership

`shouldScaleBackground: true` applies the wrapper's scaled open-rest state immediately on open, not only after the first drag. `setBackgroundColorOnScale` is on by default, so the body becomes black while a scale owner is open unless that option is `false` or `noBodyStyles` is true.

Scale state is owner-stacked per wrapper. The most recently opened owner controls the transform; closing it reapplies the previous open owner's direction/state. Original wrapper styles return after the final owner closes and its transition completes. Body background ownership is shared globally across wrapper groups, so one drawer cannot restore the body color while another still needs it.

The body scroll lock, HTML scroll behavior, and optional history restoration are also shared/ref-counted across open drawers.

## Notes

- The shared stylesheet includes open/close keyframes, snap selectors, overlay fade behavior, the handle, and the default `::after` panel extension. Supply your own geometry and theme.
- Its global keyframe names are `drawer-overlay-fade-in`, `drawer-overlay-fade-out`, `slideFromBottom`, `slideToBottom`, `slideFromTop`, `slideToTop`, `slideFromLeft`, `slideToLeft`, `slideFromRight`, and `slideToRight`. Avoid redefining those names globally.
- Direction selectors set `touch-action` for gesture arbitration; fine pointers also disable text selection on draggable surfaces. Preserve those rules if you replace the package stylesheet.
- `--initial-transform` is written by the runtime for snap offsets and removed before exit; close seeding uses an inline `transform`. `--snap-point-height` exists only as a fallback in the disabled delayed-snap CSS selectors; the 5.0.2 JavaScript does not write it.
- Custom classes (`overlayClassName`, `contentClassName`, `handleClassName`, and `closeButton.className`) are the safest instance-specific styling hooks.
- Do not remove the closed-overlay `pointer-events: none` behavior when overriding selectors.
- The runtime adds the exported `drawer-dragging` class to `[data-drawer]` while a drag is in progress. Target it from your stylesheet to disable selection or change the cursor.

## Floating cards and inset panels

The [custom-design example](../../guides/examples/#a-custom-visual-design) keeps the native controller and animations but uses a constrained floating card instead of an edge-to-edge sheet. `contentClassName` scopes its corners, width and gradient. An application `::before` layer paints the card on a transparent panel, so the native inherited `::after` background extension stays transparent; content still scrolls in the native body. No runtime pseudo-element or gesture logic is removed.

For these **non-snap** inset examples, the CSS declaration `--initial-transform: 100dvh` (vertical) or `100dvw` (horizontal) gives the native entrance/exit animation enough travel to leave the viewport. This overrides the stylesheet's panel-size fallback; it is not a custom animation. Do not apply this preset to snap drawers: their runtime computes and owns snap offsets. Never replace the panel's `transform` with centering transforms; use CSS insets and auto margins, as the example does.

## Theming

Override any of the data-attribute selectors in your own stylesheet. The runtime also writes targeted inline transforms, snap offsets, overlay opacity, transition state, and viewport keyboard offsets while those behaviors are active.

### Bottom sheet with a rounded panel

```css
[data-drawer-vanilla-root] [data-drawer] {
  background: #f3f4f6;
  border-radius: 2.5rem 2.5rem 0 0;
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
