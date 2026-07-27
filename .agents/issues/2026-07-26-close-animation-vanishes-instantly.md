# Bug: drawer vanishes instantly on close (no slide-out animation)

**Filed**: 2026-07-26
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: ✅ **Closed** — fixed in this commit.
**Severity**: High (visibly wrong UX; v2 animated both ways)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.3`
**Fixed by**: keeping the existing DOM in place on the open→close
transition (instead of tearing it down and re-mounting), plus a
transient `data-drawer-closing` attribute that overrides the static
off-screen `transform` so the CSS `slideTo{X}` animation has a clean
start frame.

---

## TL;DR

In v2 (React), the close animation played because the drawer element
was kept in the DOM — only the `data-state` attribute changed. v3
rebuilds the DOM on every state change (it tears down and re-mounts in
`mountVanillaDialog` to ensure a clean rebuild when options change).
The rebuild creates the new element with `data-state="closed"` from
the start. The static `transform: translate3d(100%, 0, 0)` rule
(for `direction: 'right'`) immediately positions the element
off-screen — there is nothing for `slideToRight` to interpolate from.
The drawer just disappears.

The fix keeps the existing DOM in place for the trivial
`data-state="open"` → `data-state="closed"` transition. The static
transform is overridden by a transient `data-drawer-closing`
attribute, so the animation has the open position as its start frame.
The DOM is finally torn down on `animationend` (with a safety timeout
for environments where animations don't fire, e.g. jsdom).

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.3` in any consumer.
2. Create a drawer with `direction: 'bottom'` (or any direction).
3. Open the drawer.
4. Click the built-in close button (or press Esc, or drag to close).

**Expected**: the drawer slides back to its closed position over
~500 ms (v2 vaul behaviour; the consumer's CSS already provides
`slideToBottom` / `slideToTop` / `slideToLeft` / `slideToRight`).
**Actual (pre-fix)**: the drawer disappears instantly. No transition.

---

## Root cause

`src/vanilla/dialog.ts#mountVanillaDialog` always calls `teardownMount`
before mounting a new dialog. For the open path:

```
open  → mountVanillaDialog(open=true)
      → teardownMount(closes-and-removes the old "closed" element)
      → build new element with data-state="closed"   ← visible off-screen
      → applyOpenState(open=true) → data-state="open"
      → CSS @keyframes slideFromRight runs (open position → visible)
```

For the close path:

```
close → setOpen(false) → onOpenChange(false) → renderVanillaDrawer
      → mountVanillaDialog(open=false)
      → teardownMount(closes-and-removes the open element)   ← visible drawer gone
      → build new element with data-state="closed"   ← static transform applies
                                                       → off-screen INSTANTLY
```

The static transform `transform: translate3d(var(--initial-transform, 100%), 0, 0)`
in the `[data-state='closed']` CSS rule positions the element
off-screen from the moment it's added to the DOM. The CSS
`animation-name: slideToRight` is also set, but the animation's
`from` value is computed at animation start — which is now the
off-screen position. There is nothing to animate.

(The static transform was added in commit `3038ab4` to fix the
initial-mount flicker. It's still correct for the initial-mount
case — see the "Initial mount" branch below.)

---

## Fix

Two complementary changes:

### 1. Keep the DOM on the trivial open→close transition

`mountVanillaDialog` now detects the trivial case: the existing mount
is `data-state="open"` and the new state is `false`. In that case:

1. The runtime sets `data-drawer-closing='true'` on the content element
   so the CSS `slideTo{X}` animation has a clean start frame.
2. `applyOpenState` flips `data-state` to `"closed"`.
3. Listener teardown, focus restoration, body scroll lock restore,
   history scroll restoration restore — all immediate (so the
   `visualViewport` listener, body scroll lock, etc. behave like v2).
4. DOM removal deferred to `animationend` (with a safety timeout for
   environments without CSS animations).

Every other transition (closed→open, open→open on option change,
destroy) still goes through the standard teardown + re-mount path
because the option set may have changed and the existing elements
no longer reflect the desired DOM contract.

### 2. CSS: drop the static transform during the close animation

`src/style.css` adds a `[data-drawer-closing]` selector on top of
each `[data-state='closed']` rule that overrides the static
off-screen transform. Without this, the `slideTo{X}` animation
interpolates from the off-screen position to itself (no visible
motion).

```css
[data-drawer][...][data-state='closed'][data-drawer-closing] {
  transform: none;
}
```

The runtime clears the flag on `animationend` (or the safety timeout).
The animation's `forwards` fill-mode holds the closed position once
it ends, so the static transform rule takes over again consistently.

### Initial-mount flicker is unaffected

The `[data-drawer-closing]` flag is ONLY set during the
open→close transition, not during the initial mount. A drawer
created with `data-state="closed"` (the common case for
`@samline/drawer@3` eager-mount) keeps the static off-screen
transform, so the flicker fix from commit `3038ab4` still applies.

---

## Regression tests

`test/close-animation.test.ts` (5 cases) pins:

1. `data-drawer-closing` is set on the open→close transition so
   the slide plays.
2. `data-drawer-closing` is NOT set on a drawer mounted closed from
   the start (no flicker regression).
3. The original open animation (slide-from) still works.
4. The flag clears after the safety timeout (jsdom does not run
   CSS animations).
5. The DOM is torn down only after the safety timeout (the close
   animation needs the element to interpolate).

---

## Impact

- **Affected surface**: every consumer. Closing a drawer is the
  second-most-common interaction; a missing animation makes the
  product feel broken.
- **Severity rationale**: every close path was affected. The
  asymmetry with the open animation (which works) is also confusing
  — developers expect both transitions to behave the same way.
- **Detection**: open and close any drawer. The close disappears
  instantly while the open slides in.
- **Workaround before the fix**: in the consumer's CSS, add an
  `animation-fill-mode: backwards` rule on `[data-state='closed']`
  so the animation starts from the open position. Cosmetic only —
  the bug is in the runtime's mount lifecycle, not the CSS.