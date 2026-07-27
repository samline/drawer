---
title: CSS styling
description: Theme @samline/drawer by overriding the data-attribute contract the stylesheet reads.
template: doc
sidebar:
  order: 6
---

`@samline/drawer` ships a single shared stylesheet (`@samline/drawer/styles.css`) that drives every open / close / drag / snap / scale animation. The stylesheet is data-attribute-driven: every visual effect is keyed off a `data-*` attribute the runtime writes on the dialog DOM, so you can theme the drawer by overriding those attributes in your own CSS.

---

## Importing the stylesheet

```ts
import '@samline/drawer/styles.css'
```

The IIFE bundle (`@samline/drawer/browser`) inlines the stylesheet — when you load the script, the runtime injects a `<style data-drawer-runtime-styles>` element into the page with the same content. You do not need to import anything from the browser entry.

---

## Data-attribute contract

The runtime writes the following attributes. They live on the dialog primitives the host mounts under `[data-drawer-vanilla-root]`.

### `[data-drawer-vanilla-root]` — the host

The host element is appended to `document.body` (or to your `mountElement`). The runtime owns its lifecycle. You usually do not need to style it; the children carry the visual contract.

| Attribute                  | Values                                 | When                 |
| -------------------------- | -------------------------------------- | -------------------- |
| `data-drawer-vanilla-root` | always present, value is the drawer id | mounts with the host |
| `id`                       | the drawer id (string)                 | mounts with the host |

### `[data-drawer-vanilla-trigger]` — the built-in trigger button

When `triggerText` is set, the host renders a `<button>` with this attribute as the drawer's built-in trigger. Clicking it opens the drawer.

### `[data-drawer-overlay]` — the modal backdrop

| Attribute                         | Values               | When                                                                                |
| --------------------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| `data-state`                      | `'open' \| 'closed'` | updated on every `setOpen`                                                          |
| `data-drawer-snap-points`         | `'true' \| 'false'`  | mirrors the option                                                                  |
| `data-drawer-snap-points-overlay` | `'true' \| 'false'`  | true when the overlay should fade based on the active snap (`fadeFromIndex` is set) |
| `data-drawer-animate`             | `'true' \| 'false'`  | `true` by default; set to `false` to disable the CSS animations                     |

### `[data-drawer]` — the dialog surface

| Attribute                         | Values                                   | When                                                                                                        |
| --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `data-state`                      | `'open' \| 'closed'`                     | updated on every `setOpen`                                                                                  |
| `data-drawer-direction`           | `'top' \| 'bottom' \| 'left' \| 'right'` | mirrors the option                                                                                          |
| `data-drawer-snap-points`         | `'true' \| 'false'`                      | mirrors the option                                                                                          |
| `data-drawer-snap-points-overlay` | `'true' \| 'false'`                      | true when the overlay should fade                                                                           |
| `data-drawer-animate`             | `'true' \| 'false'`                      | `true` by default; set to `false` to disable the CSS animations                                             |
| `role`                            | `'dialog'`                               | always present                                                                                              |
| `aria-modal`                      | `'true' \| 'false'`                      | mirrors the `modal` option                                                                                  |
| `id`                              | the drawer id (string)                   | always present; used as the `aria-labelledby` / `aria-describedby` target if those options are not provided |
| `aria-label`                      | string                                   | when `ariaLabel` option is set                                                                              |
| `aria-labelledby`                 | string id                                | auto-generated or mirrored from `ariaLabelledBy`                                                            |
| `aria-describedby`                | string id                                | auto-generated or mirrored from `ariaDescribedBy`                                                           |

### `[data-drawer-handle]` — the built-in handle (optional)

Mounted when `showHandle: true` or `handleOnly: true`. Clicking it advances the active snap point (or closes the drawer at the last snap when `dismissible: true`).

| Attribute             | Values              | When                               |
| --------------------- | ------------------- | ---------------------------------- |
| `data-drawer-handle`  | always present      | mounts with the handle             |
| `data-drawer-visible` | `'true' \| 'false'` | mirrors `data-state` of the dialog |

### `[data-drawer-title]` and `[data-drawer-description]` — accessible slots

Auto-generated when `ariaLabelledBy` / `ariaDescribedBy` is provided, or always present when `title` / `description` slots are used. The runtime assigns them ids (`<drawer-id>-title` and `<drawer-id>-description` by default) and points the dialog's `aria-labelledby` / `aria-describedby` at them.

### `[data-drawer-vanilla-body]` — the body slot

Renders the `content` value (string / number / HTMLElement / thunk). Always present when `content`, `title`, or `description` is set.

---

## Theming

Override any of the data-attribute selectors in your own stylesheet. The runtime does not write inline styles for the visual surface — it only writes the data-attributes and the transform during a drag.

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

[data-drawer-vanilla-root] [data-drawer-animate='true'][data-state='open'][data-drawer-direction='bottom'] {
  animation: drawer-slide-from-bottom 0.5s cubic-bezier(0.32, 0.72, 0, 1) forwards;
}
```

### Disable the close animation

```css
[data-drawer-animate='false'] {
  animation: none !important;
}
```

### Scale the page shell behind the drawer

When `shouldScaleBackground: true`, the page shell — the element with `data-drawer-wrapper` — receives an inline `transform: scale(...)` while the drag is in progress. Pair it with a transition for a smooth feel:

```css
[data-drawer-wrapper] {
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
  transform-origin: top;
}
```

### Snap-point overlay fade

When `fadeFromIndex` is set, the stylesheet handles the overlay's opacity transition based on the active snap. The runtime writes `data-drawer-snap-points-overlay="true"` on the overlay; the CSS below matches the original Vaul visual:

```css
[data-drawer-overlay][data-drawer-snap-points='true'] {
  opacity: 1;
  transition: opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}
```

---

## Notes

- The runtime never sets `style.background` or other visual properties on the dialog surface. Theming is always through the data-attribute contract.
- The shared stylesheet does not ship a finished overlay or panel theme. It only ships the open / close / drag / snap / scale animations. Pair it with your own component CSS for the visual shell.
- `animation-fill-mode: forwards` is set on the closed-state animations so the final frame is held (the drawer does not bounce back to open at the end of the close).
- The drag-pipeline transform is written inline on the content element during a drag. The stylesheet does not need to know about it — the runtime tears the inline transform down on release.
