# Bug: overlay with `data-state="closed"` captures every click on the page

**Filed**: 2026-07-25
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: ✅ **Closed** — fixed in v3.0.0-beta.3 (`3038ab4` follow-up, plus a CSS rule added in the consumer's local workspace and adopted upstream in this commit).
**Severity**: High (every page click is captured by an invisible overlay)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.2`
**Fixed in**: the v3.0.0-beta.3 CSS rule that ships in `src/style.css`.

---

## TL;DR

The v3 drawer mounts the overlay element at `createDrawer` time (not at first open, like v2). With `data-state="closed"` the overlay is invisible (`opacity: 0` after the `fadeOut` animation), but its default `pointer-events: auto` still lets it capture clicks. Because the consumer's CSS positions the overlay at `position: fixed; inset: 0; z-index: 100`, the invisible overlay covers the entire viewport and intercepts every click on the page. Headers, footers, and any other content with a `z-index` below 100 become unresponsive.

The fix is a static `pointer-events: none` rule on the closed-state overlay, so the overlay only captures clicks when `data-state="open"`.

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.2` in any consumer.
2. Create a drawer with `direction: 'bottom'` and the consumer's standard CSS (`position: fixed; inset: 0; z-index: 100` on the overlay).
3. Do not call `setOpen(true)` — leave the drawer closed.
4. Click anywhere on the page.

**Expected**: the click reaches the underlying element (header, button, link, etc.).
**Actual**: the click is captured by the invisible overlay. No handler fires. The browser still shows the cursor as a pointer, but no element is "clicked" in the JavaScript sense.

---

## Root cause

The package switched from v2's "lazy mount" (overlay only mounted on first open) to v3's "eager mount" (overlay mounted at `createDrawer` time, alongside the dialog). The eager mount is deliberate — it lets the runtime attach the `mouseup` dismiss listener from the start, and it keeps the package's behavior predictable.

The eager mount, however, ships the overlay with `data-state="closed"` from page load. The CSS `fadeOut` keyframe lands on `opacity: 0`, but the element is still in the DOM and still has the default `pointer-events: auto`. At `position: fixed; inset: 0; z-index: 100`, the element is a full-viewport click trap.

`animation-fill-mode: forwards` (added in `3038ab4`) fixes the visual symptom (the overlay stays at the `fadeOut` end state, not at the natural rest state). It does not fix the click-trap — the overlay is still there, just invisible.

---

## Fix

Add the static rule to `src/style.css`:

```css
[data-drawer-overlay][data-state='closed'] {
  animation-name: fadeOut;
  animation-fill-mode: forwards;
  pointer-events: none;
}
```

The `auto` default is restored as soon as `data-state="open"` flips, so the user can still click the overlay to dismiss the drawer.

The consumer's first workaround was to add the same rule in the consumer's local stylesheet. The package picked it up in this commit so the fix ships to every consumer.

---

## Regression test

`test/overlay-closed-pointer-events.test.ts` pins the fix:

1. The closed-state rule in the source stylesheet carries `pointer-events: none`.
2. The open-state rule does NOT carry `pointer-events: none` (so the user can still click to dismiss).
3. When the dialog mounts with `data-state="closed"`, `getComputedStyle(overlay).pointerEvents === 'none'`.

---

## Impact

- **Affected surface**: every consumer running the v3 betas with the eager-mount overlay.
- **Severity rationale**: clicks on the entire page become unresponsive as soon as a drawer is created, even if it is closed. Any consumer that creates a drawer on page load (the common pattern for a "open on click" trigger) is broken until the rule is added.
- **Detection**: easy — the consumer's existing click handlers stop firing on page load.
- **Workaround before the fix**: add the `pointer-events: none` rule in the consumer's local stylesheet, or add `pointer-events: none` to the consumer's closed-state overlay CSS.

---

## Workaround history

- Consumer's local stylesheet (pre-fix): added the rule in `resources/css/drawer.css` as a temporary patch.
- Package (post-fix): the rule ships in `src/style.css` and is part of the published stylesheet.
