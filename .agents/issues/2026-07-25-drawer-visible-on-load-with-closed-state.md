# Bug: drawer visible on page load with `data-state="closed"`

**Filed**: 2026-07-25
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: ✅ **Closed** — fixed in v3.0.0-beta.3 (`3038ab4`).
**Severity**: High (every drawer flashes visibly on page load)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.2`
**Fixed in**: `3038ab4` ("fix(drawer): apply animation-fill-mode forwards to closed-state rules").

---

## TL;DR

In the v3 betas, the CSS `slideToX` and `fadeOut` keyframe animations end at the off-screen state, but without `animation-fill-mode: forwards` the element snaps back to its natural position after the animation completes. Result: every drawer that mounts at `createDrawer` time with `data-state="closed"` was visible on page load, even though the consumer never called `setOpen(true)`.

The fix is a static `animation-fill-mode: forwards` rule on every closed-state animation. The element stays at the animation's end frame (the off-screen / fully-transparent state) instead of bouncing back.

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.2` in any consumer.
2. Create a drawer with `direction: 'bottom'`, no `open` option.
3. Reload the page.

**Expected**: the drawer is closed and not visible.
**Actual (pre-fix)**: the drawer is visible at the bottom of the viewport for a split second, then disappears as the close animation completes and the element settles.

---

## Root cause

The v3 eager-mount pattern creates the dialog (overlay + content + handle) at `createDrawer` time. When the dialog mounts with `data-state="closed"`, the stylesheet kicks off the `slideToX` (for the content) and `fadeOut` (for the overlay) keyframe animations. The animations end at the off-screen / fully-transparent state, but the element's natural rest position is back in view.

Without `animation-fill-mode: forwards`, the element ignores the animation's end frame and renders at its natural rest position. The animation runs, but the element appears to "bounce back" to the on-screen state once the animation completes.

---

## Fix

Add `animation-fill-mode: forwards` to every closed-state rule in `src/style.css`:

```css
[data-drawer-overlay][data-state='closed'] {
  animation-name: fadeOut;
  animation-fill-mode: forwards;
}

[data-drawer][data-state='closed'][data-drawer-direction='bottom'] {
  animation-name: slideToBottom;
  animation-fill-mode: forwards;
}
/* ...and the matching top / left / right rules */
```

The `forwards` keyword tells the browser to keep the element at the animation's last keyframe (the off-screen state) instead of returning to the natural rest position.

---

## Regression test

The CSS contract is covered by the visual integration tests in `test/`. The static rule is also pinned by `test/overlay-closed-pointer-events.test.ts` (the test reads the source stylesheet and asserts the closed-state rule carries `animation-fill-mode: forwards`).

---

## Impact

- **Affected surface**: every consumer running the v3 betas that creates a drawer at page load.
- **Severity rationale**: the visible flash on page load is jarring and looks broken. Consumers that build a drawer-only UI (e.g. a sheet-style mobile page) are most affected.
- **Detection**: open the page in a browser, watch the bottom / right / left of the viewport.
- **Workaround before the fix**: add the `animation-fill-mode: forwards` rule in the consumer's local stylesheet, or call `setOpen(false)` after a microtask delay to ensure the animation has settled.
