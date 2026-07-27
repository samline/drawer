# Bug: overlay flickers on every page load (snap-points-overlay specificity tie)

**Filed**: 2026-07-26
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: ✅ **Closed** — fixed in this commit.
**Severity**: Medium (cosmetic but visible on every page that mounts
drawers on load)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.3`
(the flicker was supposed to be fixed by `3038ab4` and `94a1943`,
but the fix was incomplete because it didn't account for a
later rule with the same specificity)

---

## TL;DR

The package's `[data-drawer-overlay][data-state='closed'] { opacity:
0 }` rule and the package's
`[data-drawer-overlay][data-drawer-snap-points-overlay='true'] {
opacity: 1 }` rule both have specificity `(0,2,0)` (two attribute
selectors). When specificity ties, the LATER rule wins. The runtime
sets `data-drawer-snap-points-overlay='true'` on every drawer that
doesn't have snap points (which is the consumer's case — they're not
using snap points), so the snap-points-overlay rule wins and the
overlay starts at `opacity: 1`. The `fadeOut` animation (with
`forwards` fill-mode) then fades it to `opacity: 0` over 0.5s —
the visible flicker on every page load.

The fix duplicates `data-drawer-overlay` in the closed-state selector
to push its specificity to `(0,3,0)`, which beats the snap-points-
overlay rule regardless of source order.

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.3` in any consumer.
2. Create a drawer without `snapPoints` (the common case).
3. Mount the drawer at page load (the eager-mount pattern: just
   call `createDrawer({…})` and the dialog mounts with
   `data-state='closed'`).
4. Reload the page.

**Expected**: the overlay is invisible from the very first paint
(commit `3038ab4` documented this).
**Actual**: the overlay fades in from `opacity: 1` to `opacity: 0`
over 0.5s on every page load — visible as a flicker that draws the
eye to the bottom/right/left of the viewport before disappearing.

---

## Root cause

`src/vanilla/dialog.ts#applyOpenState` sets the overlay's
`data-drawer-snap-points-overlay` attribute based on
`shouldShowSnapOverlay(snapPoints, fadeFromIndex, activeSnapPoint)`:

```ts
function shouldShowSnapOverlay(
  snapPoints: CommonDrawerSnapPoint[] | undefined,
  ...
): boolean {
  if (!snapPoints || snapPoints.length === 0) return true
  // …
}
```

For a drawer with no snap points (the default), `shouldShowSnapOverlay`
returns `true`, so `data-drawer-snap-points-overlay='true'` is set
on every mount.

`src/style.css` has these two rules (in this order):

```css
[data-drawer-overlay][data-state='closed'] {
  opacity: 0;
  …
}

[data-drawer-overlay][data-drawer-snap-points-overlay='true'] {
  opacity: 1;
}
```

Both have specificity `(0,2,0)`. The snap-points-overlay rule is
declared later, so it wins. The overlay starts at `opacity: 1`.

The animation `fadeOut` (declared on the closed-state rule) then runs
from the default `opacity: 1` to `opacity: 0` over 0.5s, with
`forwards` fill-mode keeping the element at `opacity: 0` once it
ends. The visible result is a 0.5s fade from visible to invisible
on every page load — the flicker.

The commit `3038ab4` documented the intent ("apply
animation-fill-mode: forwards") but only fixed part of the issue:
the animation's end frame holds the closed state, but the start
frame was still wrong because the static `opacity: 0` was overridden
by the later snap-points-overlay rule.

The commit `94a1943` added the static `opacity: 0` to the closed
rule to address the bug, but didn't account for the snap-points-
overlay rule winning on specificity tie.

---

## Fix

Add a specificity-boosted companion selector to the closed-state
rule in `src/style.css`:

```css
[data-drawer-overlay][data-state='closed'] {
  opacity: 0;
  …
}

[data-drawer-overlay][data-drawer-overlay][data-state='closed'] {
  /* Specificity (0,3,0): beats the (0,2,0) snap-points-overlay
     rule below regardless of source order. */
  opacity: 0;
  pointer-events: none;
}
```

The companion duplicates `data-drawer-overlay` (a valid CSS
attribute selector — browsers accept duplicated attribute
selectors in a list). Specificity becomes `(0,3,0)`, which beats
the snap-points-overlay rule's `(0,2,0)`.

Visual effect is identical to the base rule — the only difference
is the selector specificity. We deliberately do NOT include the
animation here (it's only on the base closed rule) so the animation
runs from `opacity: 0` → `opacity: 0` and produces no flicker; the
static `opacity: 0` from the boost rule keeps the overlay invisible
from the very first paint.

---

## Regression tests

`test/overlay-flicker.test.ts` (2 cases):

1. The closed-state rule has a specificity-boosted companion
   selector (`[data-drawer-overlay][data-drawer-overlay][data-state='closed']`).
2. The boost does NOT include the open state — it only applies to
   `data-state='closed'`, so the snap-points-overlay rule still
   wins for the open state.

jsdom does not resolve CSS specificity, so the test is a
static-source check. The runtime behaviour is verified
end-to-end in the consumer's browser (Playwright + real Chromium).

---

## End-to-end verification

In the consumer's browser, after the fix, the first 30+ animation
frames of every page load show:

```
t=4,   opacity=0, pointer-events=none, dataState=closed, data-drawer-snap-points-overlay=true
t=20,  opacity=0, pointer-events=none, dataState=closed, data-drawer-snap-points-overlay=true
t=36,  opacity=0, pointer-events=none, dataState=closed, data-drawer-snap-points-overlay=true
…
```

The overlay is invisible from the very first frame. The flicker
is gone.

---

## Impact

- **Affected surface**: every consumer that mounts drawers on page
  load (the common eager-mount pattern). With v3.0.0-beta.0 and
  later, drawers are mounted at `createDrawer` time rather than
  on first open, so the flicker happens on every page load.
- **Severity rationale**: the flicker is visible but brief (0.5s)
  and only on initial mount. It does not block interactions, but
  it draws the eye to the drawer area and feels broken.
- **Detection**: open any page that mounts a drawer on load and
  watch the corners of the viewport.
- **Workaround before the fix**: in the consumer's CSS, add
  `[data-drawer-overlay][data-state='closed'] { opacity: 0 !important; pointer-events: none !important; }`.
  Cosmetic only — the bug is in the package's CSS specificity.