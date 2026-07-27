# Bug: modal drawers leak the `ariaLabel` as a visible title, parpadeo on open, and the close button does not work

**Filed**: 2026-07-25
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: 🟡 **Partially closed** — the title-leak and close-button issues are fixed in this v3.0.0-beta.3 commit. The "parpadeo" under HMR is working as designed and is documented in `README.md → Mount-time Lifecycle`.
**Severity**: Medium (visible bug, but easy to opt out per-call)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.3`
**Fixes in this commit**: title auto-hide (`titleVisuallyHidden` contract), built-in `closeButton` option.

---

## TL;DR

Three related symptoms reported by the easytrip consumer after upgrading to v3:

1. **Title leak** — when the consumer passes `ariaLabel: 'Some App Name'` (e.g. `config('app.name')`) for accessibility, the package auto-promotes that string into the `[data-drawer-title]` slot. The slot has no default visual hiding, so the a11y text leaks visibly at the top of the drawer.
2. **Parpadeo on open under HMR** — Vite's HMR re-runs the consumer's `<script>` on every save. If the script calls `createDrawer({ open: true })`, the drawer re-mounts on every HMR cycle, causing a brief flash.
3. **Close button does not work** — the consumer wrote a manual `document.addEventListener('click', ...)` on `document` to wire the close button. Under HMR, multiple listeners accumulate, each holding a reference to a stale controller. The new controller may be the one that drives the visible drawer, but a stale listener can call `setOpen(false)` on a destroyed controller.

The first and third are fixed in this commit. The second is a working-as-designed behavior change and is documented in the README.

---

## Fix 1 — title leak

The `[data-drawer-title]` slot has two roles:

- **Visible title** — the consumer passed an explicit `title`. The slot renders visibly.
- **Accessibility target** — the consumer passed only `ariaLabel`. The package auto-promotes the `ariaLabel` value into the slot for the `aria-labelledby` reference. The slot is only an a11y target, not visual content.

The new `titleVisuallyHidden` option (and the proxy auto-hide) makes the second case render the slot in a visually-hidden style. The default is `true` for the proxy case; consumers can opt out with `titleVisuallyHidden: false`.

```ts
// Visible title (a heading the user sees)
createDrawer({
  id: 'filters',
  title: 'Filters',
  content: 'Body'
})

// Accessibility-only title (proxy from ariaLabel, auto-hidden)
createDrawer({
  id: 'filters',
  ariaLabel: 'Filters',
  content: 'Body'
})

// Force-hide a visible title (e.g. when the heading is rendered
// inside `content` but the a11y reference is still wanted).
createDrawer({
  id: 'filters',
  title: 'Filters',
  titleVisuallyHidden: true,
  content: '<h1>Filters</h1>'
})
```

See `docs/options.md → title` and `docs/options.md → titleVisuallyHidden` for the full type contract.

---

## Fix 2 — built-in `closeButton` option

The package now ships a built-in close button. Passing `closeButton: true` (or a config object) renders a `<button data-drawer-close>` inside the drawer, wired to `onOpenChange(false)`. The button is removed automatically on re-mount (HMR safety) and on `destroyDrawer`. Its `click` event `stopPropagation()`s so it does not bubble to the drawer's content.

```ts
const drawer = createDrawer({
  id: 'filters',
  content: 'Body',
  closeButton: {
    className: 'absolute top-5 right-5',
    icon: 'xmark', // any string; rendered as <span aria-hidden="true">
    ariaLabel: 'Close'
  }
})
```

The button is removed automatically on re-mount (`teardownMount` handles it) and on `destroyDrawer`.

See `docs/options.md → closeButton` and `docs/css-styling.md → [data-drawer-close]` for the full type contract.

---

## Symptom 2 (parpadeo) — working as designed

The package mounts the overlay at `createDrawer` time. If the consumer passes `open: true`, the drawer is open immediately, with no mount animation. Under Vite HMR, the consumer's script re-runs on every save, re-creates the drawer with `open: true`, and the user sees a brief flash.

**Recommended pattern for "open on mount" dialogs**:

```ts
const drawer = createDrawer({
  id: 'my-drawer'
  // no `open` here — defaults to closed
})

queueMicrotask(() => drawer.setOpen(true))
```

Defer the open to the next microtask so the open animation runs after the mount is fully wired. See `README.md → Mount-time Lifecycle` for the full discussion.

---

## Regression tests

- `test/title-visibility.test.ts` — pins the auto-hide contract for all five cases (proxy-only, explicit title, both, force-hidden, opt-out).
- `test/close-button.test.ts` — pins the close-button lifecycle (default, custom, click, HMR safety, no bubble).
