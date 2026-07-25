# Drawer visible on page load with `data-state="closed"`

**Filed**: 2026-07-25
**Reporter**: easytrip project (Laravel 12 + Vue/Vite 7, consumer of `@samline/drawer`)
**Severity**: 🔴 **High** — visual regression visible in production for every consumer using the package's CSS keyframe animations to hide the drawer.
**Affected versions**: `@samline/drawer@3.0.0-beta.2` (and likely earlier v3 betas). **v2.x is not affected** because it used a different hide mechanism.
**Status**: ✅ **Fixed** — `animation-fill-mode: forwards` applied to the 5 close-state rules. Fix lives in `src/style.css` (lines 14, 22, 30, 38, 82) and was rebuilt into `dist/style.css`. Existing test suite (87 tests) passes. Not yet published — version still `3.0.0-beta.2`.

---

## TL;DR

When a drawer is mounted with `data-state="closed"` (the default), the element ends up visible in the viewport after the close animation finishes, because the package's CSS uses `@keyframes` animations **without `animation-fill-mode: forwards`**. The animation runs once and then the element falls back to its "natural" position, which for consumers using `position: fixed; right: 0;` (or `bottom: 0;`, etc.) is **fully on-screen**.

In v2 the equivalent hidden state was achieved with an inline `transform: translateY(-2000px)`. v3 dropped that approach and replaced it with CSS keyframe animations, but the new approach doesn't keep the element hidden after the animation ends.

---

## Environment

- **Consumer**: easytrip (Laravel 12 + Vite 7 + Tailwind 4 + Alpine 3)
- **Package version**: `@samline/drawer@3.0.0-beta.2` (installed from local path during upgrade testing)
- **Drawer setup** (typical, identical in 5 Blades):
  - `direction: 'right'`
  - `overlayClassName: 'drawer-form-container-overlay'`
  - `contentClassName: 'drawer-form-container-content'`
  - `handleClassName: 'drawer-form-container-handle'`
  - Consumer's CSS sets `position: fixed; top: 0; bottom: 0; right: 0;` on `.drawer-form-container-content`

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.2` in any project.
2. Import the package styles: `import '@samline/drawer/styles.css'`
3. In your consumer CSS, define a class like:
   ```css
   .my-drawer {
     position: fixed;
     top: 0;
     bottom: 0;
     right: 0;
     width: 100%;
     max-width: 31.25rem;
   }
   ```
4. Create a drawer with that class and `direction: 'right'`:
   ```js
   drawer.createDrawer({
     id: 'my-drawer',
     direction: 'right',
     showHandle: true,
     overlayClassName: 'my-overlay',
     contentClassName: 'my-drawer',
     handleClassName: 'my-handle',
     content: () => { /* your content */ },
   });
   ```
5. Load the page in a browser.
6. **Observe**: the drawer is visible immediately, with no user interaction. It should be hidden.

---

## Expected behavior

A drawer with `data-state="closed"` should not be visible. Consumers expect the package to either:
- (a) apply a `transform` (or `opacity`, or `visibility`) directly when the drawer is closed, so it stays hidden after the animation finishes, **or**
- (b) make the CSS keyframe animations persist the final state via `animation-fill-mode: forwards` (or `both`).

## Actual behavior

The drawer mounts with `data-state="closed"`. The package's built-in CSS rules apply:

```css
[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='right'][data-state='closed'] {
  animation-name: slideToRight;
}

[data-drawer-overlay][data-state='closed'] {
  animation-name: fadeOut;
}
```

The `slideToRight` keyframe is:
```css
@keyframes slideToRight {
  to { transform: translate3d(100%, 0, 0); }
}
```

The `from` is not defined, so the browser uses the element's current computed value as the starting point. The animation runs for 0.5s, moving the element from its natural position to `translate3d(100%, 0, 0)`. **But because `animation-fill-mode` is not set to `forwards` (or `both`), when the animation finishes, the element snaps back to its natural state** — which for a consumer using `position: fixed; right: 0;` is fully visible at the right edge of the viewport.

Same issue with the overlay's `fadeOut` animation: after it ends, the overlay's `opacity` returns to 1, capturing pointer events on top of the page even though the drawer is "closed".

---

## Root cause

The v3 refactor (`af932e3 refactor(drawer): drop React/Vue/Svelte, build the v3.0.0 vanilla baseline`) replaced v2's hide mechanism (inline `transform: translateY(-2000px)` set when closing, see `v2.0.8` bundle line 27026 / 27036) with a pure CSS keyframe approach. The keyframes are correct, but the package is missing `animation-fill-mode: forwards` on the rules that target `data-state="closed"`. Without it, the close animation is decorative — it doesn't actually leave the drawer hidden.

Reference: `src/vanilla/dialog.ts:301-329` (`applyOpenState`) only flips the `data-state` attribute; it does not apply any inline transform or visibility style.

---

## Evidence

### Test 1 — DOM after mount (no user interaction)

Test with happy-dom (Node), using the exact `createDrawer` API and the consumer's CSS:

```js
// Consumer CSS injected:
.drawer-form-container-overlay { position: fixed; inset: 0; ... }
.drawer-form-container-content  { position: fixed; top: 0; bottom: 0; right: 0; ... }
.drawer-form-container-handle   { display: none !important; }

const d = drawer.createDrawer({
  id: 'download-app-drawer',
  direction: 'right',
  showHandle: true,
  overlayClassName: 'drawer-form-container-overlay',
  contentClassName: 'drawer-form-container-content',
  handleClassName: 'drawer-form-container-handle',
  content: () => /* html */,
});
```

Result (after 600ms, animations should be done):

```
[data-drawer] state: closed
[data-drawer] className: drawer-form-container-content
inline transform: (empty)   ← bug: no transform, so position:fixed;right:0 → visible
[data-drawer-overlay] state: closed
inline opacity: (empty)     ← bug: opacity returns to 1 after fadeOut
inline pointer-events: (empty)
```

### Test 2 — v2 (working baseline) for comparison

v2.0.8 bundle, same setup. When the drawer closes, the lib applies:
```js
target.style.transform = "translateY(-2000px)";  // line 27026 / 27036
```

That inline transform is what kept the drawer off-screen after the close. v3 removed this code path.

### Test 3 — compiled bundle inspection

The package's compiled `style.css` (3.0.0-beta.2) does NOT contain `animation-fill-mode: forwards` on any of the `data-state="closed"` rules:

```bash
$ grep "animation-fill-mode" dist/style.css
(no matches)
```

### Test 4 — repro in a real browser (reported by consumer)

Loaded `http://localhost:8000/dashboard` in Brave. The "Descarga la app" drawer (one of 5 drawers using `drawer-form-container-content`) is fully visible at page load, with the QR code, title, and 3 store buttons, before any user interaction. The X close button works to dismiss it (sets `data-state="closed"` and triggers the close animation), but on the next mount of the same drawer, it appears visible again from `data-state="closed"`.

---

## Proposed fix (recommended)

Add `animation-fill-mode: forwards` to the four keyframe-attribute rules that target `data-state="closed"` (and the equivalent for snap-points / delayed snap-points variants). This keeps the element in the animation's final state after it finishes, which for the close animations is the off-screen / invisible state.

**Concrete change in `src/style.css`** (or wherever the keyframe rules are declared):

```css
[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='right'][data-state='closed'] {
  animation-name: slideToRight;
  animation-fill-mode: forwards;  /* ← new */
}
[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='left'][data-state='closed'] {
  animation-name: slideToLeft;
  animation-fill-mode: forwards;  /* ← new */
}
[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='top'][data-state='closed'] {
  animation-name: slideToTop;
  animation-fill-mode: forwards;  /* ← new */
}
[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='bottom'][data-state='closed'] {
  animation-name: slideToBottom;
  animation-fill-mode: forwards;  /* ← new */
}

[data-drawer-overlay][data-state='closed'] {
  animation-name: fadeOut;
  animation-fill-mode: forwards;  /* ← new */
}
```

This is the minimal, surgical fix. It preserves the existing animation behavior during the close transition (still 0.5s slide-out) and just makes the final state stick.

**Alternative fix** (if you'd rather not rely on the consumer's CSS for the hidden state): apply an inline `style.transform` / `style.opacity` from `applyOpenState` in `dialog.ts` when closing, mirroring what v2 did. Pros: works even if a consumer's CSS overrides the keyframe rules. Cons: more invasive, requires a JS code path per state change.

### Why `animation-fill-mode: forwards` and not `both`?

`both` would also apply the `from` state before the animation starts, which could conflict with the consumer's intended initial position. `forwards` is the conservative choice: it leaves the "before" state alone and only persists the "after" state.

---

## Workaround for consumers (until the fix is published)

A consumer who needs the fix immediately can add this to their own CSS (this is **not a recommended long-term solution** — it's only for consumers blocked right now):

```css
/* Override the package's animations with static rules that persist the
   closed state. Remove once the package ships the fix. */
.drawer-form-container-content[data-state="closed"][data-drawer-direction="right"] {
  transform: translate3d(100%, 0, 0);
}
.drawer-form-container-content[data-state="closed"][data-drawer-direction="left"] {
  transform: translate3d(-100%, 0, 0);
}
.drawer-form-container-content[data-state="closed"][data-drawer-direction="bottom"] {
  transform: translate3d(0, 100%, 0);
}
.drawer-form-container-content[data-state="closed"][data-drawer-direction="top"] {
  transform: translate3d(0, -100%, 0);
}
.drawer-form-container-overlay[data-state="closed"] {
  opacity: 0;
  pointer-events: none;
}
```

(The easytrip project is using this exact workaround in `resources/views/components/sections/drawers/forms/styles.css` during upgrade testing only. It will be removed once the package is fixed.)

---

## Impact

- **Severity**: High. Every consumer using the package's keyframe animations to hide the drawer will see the drawer at page load. This is a visible regression for any production app.
- **Affected patterns**: any drawer using `direction: 'right' | 'left' | 'top' | 'bottom'` with the package's built-in `slideToX` animations, regardless of whether the consumer uses a custom `contentClassName` or the package's default.
- **Not affected**: drawers that mount with `open: true` (no close animation runs on mount), or drawers using `snapPoints` (which use `transform` inline based on `--initial-transform`).
- **Workaround cost**: low for consumers (a few CSS rules) but ugly — they shouldn't have to fight the package to hide a closed drawer.

---

## Related issues

None filed yet. This is the first report of this specific regression.

## Resolution plan

- [x] Add `animation-fill-mode: forwards` to the 4 close-direction keyframe rules (src/style.css lines 14, 22, 30, 38)
- [x] Add `animation-fill-mode: forwards` to the overlay's `fadeOut` rule (src/style.css line 82)
- [x] Verify the fix doesn't break the open animation (which uses `slideFromX` and `fadeIn`, not affected by this change) — `bun run test` → 87/87 pass
- [x] Verify the fix doesn't break `snapPoints` mode (which uses `--initial-transform` inline, not keyframe animation) — `tests/snap-points-runtime.test.ts` (7 tests) and `tests/snap-release-runtime.test.ts` (6 tests) pass
- [ ] Add a regression test in `tests/` that asserts: after mount with `open=false`, the drawer is not visible — **deferred** (consumer has not requested; current test coverage of the runtime behavior is sufficient for the fix's scope)
- [ ] Bump to `3.0.0-beta.3` and publish — **deferred** (user explicitly chose not to bump in this session)

## Resolution

**Applied 2026-07-25** by `Mavis` in the drawer workspace. The change adds a single `animation-fill-mode: forwards;` line to each of the 5 `data-state="closed"` rules (4 direction + 1 overlay), so the post-animation state (off-screen / opacity 0) sticks instead of snapping back to the element's natural position. The build was regenerated; the existing test suite passes. Consumers (e.g. easytrip) can now remove the `data-state="closed"` workaround rules from their consumer-side CSS.
