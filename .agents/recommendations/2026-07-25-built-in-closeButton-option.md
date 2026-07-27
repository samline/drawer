# Recommendation: ship a built-in `closeButton` option

**Filed**: 2026-07-25
**Status**: ✅ **Implemented** — the `closeButton` option ships in v3.0.0-beta.3. The option is documented in `docs/options.md → closeButton` and `docs/css-styling.md → [data-drawer-close]`. Regression coverage in `test/close-button.test.ts`.

---

## TL;DR

The most common source of HMR-related bugs in consumers is a manual `document.addEventListener('click', ...)` listener wired to a "close drawer" button. Under Vite HMR, the consumer's `<script>` re-runs on every save, accumulating multiple listeners on `document`, each holding a reference to a (potentially stale) controller. The new controller may be the one that drives the visible drawer, but a stale listener can call `setOpen(false)` on a destroyed controller.

Shipping a built-in `closeButton` option eliminates the pattern entirely. The package renders the button, wires the click to the right controller, and tears the button down on re-mount. Consumers no longer need to write the listener.

---

## Why this is the right fix

- **Eliminates the most common HMR bug.** Consumers do not write `document.addEventListener('click', ...)` anymore. The pattern goes away.
- **Improves accessibility by default.** The button has `aria-label="Close"`, the icon is rendered as a `<span aria-hidden="true">` so screen readers only announce the label, and the button is keyboard-focusable.
- **Improves consistency.** Every consumer that wants a close button uses the same DOM, the same ARIA wiring, and the same focus management. Theming is the consumer's choice.
- **Backwards-compatible.** The default is `closeButton: undefined` (no button rendered). Consumers that already wrote their own button keep it. Consumers that want the new behavior opt in with `closeButton: true`.
- **Tiny footprint.** ~30 lines of code in `vanilla/dialog.ts` (mount path + `teardownMount` cleanup). The `VanillaCloseButtonOptions` type adds three optional fields.

---

## Design

```ts
interface VanillaCloseButtonOptions {
  /** Class applied to the button. The consumer can use it to position the button. */
  className?: string
  /** Icon content. A string is rendered as text inside a `<span aria-hidden="true">`. An `HTMLElement` is appended as-is. */
  icon?: string | HTMLElement
  /** Accessible label for the button. Defaults to `'Close'`. */
  ariaLabel?: string
}

interface VanillaDrawerOptions {
  /**
   * Built-in close button. When set, the package renders a
   * `<button data-drawer-close>` inside the drawer, wired to
   * the controller's `onOpenChange(false)`.
   *
   * - `true` for default behavior: `className="drawer-close-button"`,
   *   an `xmark` icon (rendered as `<span aria-hidden="true">`),
   *   `aria-label="Close"`.
   * - An object to override the defaults.
   */
  closeButton?: boolean | VanillaCloseButtonOptions
}
```

### Rendered DOM

```html
<button type="button" data-drawer-close class="drawer-close-button" aria-label="Close">
  <span data-drawer-close-icon aria-hidden="true">xmark</span>
</button>
```

The button is appended to `[data-drawer]` (alongside the title, description, and body slots). The `click` event `stopPropagation()`s so it does not bubble to the drawer's content.

### Lifecycle

- The button is created by `mountVanillaDialog` when `options.closeButton` is truthy.
- The button is stored in `state.closeButton` so `teardownMount` can null the reference (the actual `removeChild` happens via the `state.content` removal, since the button is appended to `[data-drawer]`).
- On re-mount, the previous button is discarded and a fresh one is created (HMR-safe).
- On `destroyDrawer`, the button is removed together with `[data-drawer]`.

---

## Migration path for existing consumers

Consumers that already wrote their own close button can keep it — the `closeButton` option is opt-in. To migrate:

```ts
// Before
const trigger = document.getElementById('close-button')!
trigger.addEventListener('click', () => closeDrawer('filters'))

// After
createDrawer({
  id: 'filters',
  closeButton: {
    className: 'absolute top-5 right-5',
    icon: 'xmark',
    ariaLabel: 'Close'
  }
})
```

The migration is mostly mechanical: delete the `addEventListener` line, delete the corresponding `removeEventListener` in the cleanup, and pass the styling as `closeButton.className`.

---

## Trade-offs

- **CSS theming is the consumer's responsibility.** The package does not ship a default theme for the close button (no padding, no border, no background). The default `className="drawer-close-button"` is a hook for the consumer's CSS.
- **The icon is a string by default.** A consumer that wants a custom SVG passes an `HTMLElement` via `closeButton.icon`. The element is appended inside the `<span aria-hidden="true">` so screen readers do not announce the icon.
- **No icon font or library is bundled.** The default `"xmark"` string is rendered as plain text. The consumer can replace it with an SVG, a font icon, or any other `HTMLElement`.
