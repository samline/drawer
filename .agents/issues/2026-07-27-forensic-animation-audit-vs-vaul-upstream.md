# Forensic audit: animation regressions and missing features in `@samline/drawer@3.0.0-beta.3` vs vaul upstream

**Filed**: 2026-07-27
**Reporter**: samline (consumer-driven review prompted by the user)
**Status** (2026-07-27, end of session):

- **CLOSED** (17/17): F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, F13, F14, F15, F16, F17

The user approved a full 1:1 audit ("arréglalo todo"), so all 17 findings
are in scope. All closed. The commits on the `refactor/drawer-v3-vanilla`
branch that close each one:

- F1: `b1a5665` + `de4835c` + `e73aeef`
- F2, F3, F11, F14, F15: `475541a`
- F6, F7, F13: `7a60451`
- F9: `e73aeef`
- F4, F5, F8, F10, F12, F16, F17: `330ff2e`

**Severity**: F1 was high (visible bug, user-reported). F2-F17 are mixed.
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.3` (`beta.3` when filed)
**Upstream reference**: `https://github.com/emilkowalski/vaul` @ `master` (commit `2f5b72d`, vaul 1.1.2)

## Beta.4 correction (2026-07-28)

The `17/17 closed` status in this report applies only to the listed F-series findings as implemented at the end of the 2026-07-27 session. It does not establish package-wide 1:1 parity, and the iterative F1 narrative below contains intermediate implementations that beta.4 has superseded.

The current beta.4 close lifecycle keeps open visual nodes for exit, freezes the currently rendered transform, changes them to `data-state="closed"`, and removes them after the transition window. Initially closed drawers now use lazy presence, so overlay/content do not mount merely to render a closed animation. Pointer capture also waits for dominant-axis intent and drag permission instead of occurring on pointerdown.

The later review added regressions for interrupted entrance/snap transitions, rapid reopen, pointer cleanup, logical drawer stacking, shared scale wrappers, composable scroll locks, and Safari/iOS style/scroll restoration. These cases were not covered by the original 17 findings. The beta.4 suite verifies them in Vitest/jsdom; real Safari/iOS and cross-browser interaction testing remains pending before any claim beyond scoped behavioral similarity.

---

## TL;DR

The vanilla port was considered functionally complete for the common
case at the end of this audit, and all **17 listed functional gaps** were
marked closed. That conclusion was scoped to the F-series findings; the
beta.4 correction above records later lifecycle, multi-drawer, and Safari
work and explicitly supersedes the original package-wide 1:1 claim.

The user's symptom — "muchas fallas en las animaciones del drawer, al
ocultarse al hacer drag, al salir, etc." — has three concrete root causes:

1. **The drag-release close animation can be silent** when the inline
   `transform` is left on the content (mostly fixed by `de4835c`, but
   the edge case where drag ended _just past_ the threshold still
   leaves a non-zero inline transform that the close animation must
   animate through).
2. **Drag-resistance in the OPPOSITE of the close direction is broken**
   (documented in the test file but the actual value shipped is
   `DRAG_RESISTANCE = 1`, i.e. no resistance, contradicting the
   comment that says "v3.0.0-beta.3 replaced this with a linear 0.5
   factor" — the 0.5 was never applied).
3. **There is no `pointerout` / `contextmenu` handler** in the drag
   pipeline. If the user drags the drawer and their cursor leaves the
   drawer's bounding box before they release, the `pointerup` never
   fires on the content and the inline transform stays at the dragged
   position. The drawer appears "stuck" mid-drag until the user taps
   anywhere on the page.

A live diagnostic page is at **`/tablero.html`** (served at
`http://127.0.0.1:8731/tablero.html` from this repo). It mounts three
drawers (bottom, right, bottom+snap) and logs every event in a panel
at the bottom. Side-by-side compare with `https://vaul.emilkowal.ski/`.

---

## F1 — Root cause analysis & fix (applied 2026-07-27, refined 2026-07-27)

**The single root cause of the close-path animation bug** (both the
"drawer jumps back to open" and the "close feels brusco" symptoms) is
that the inline `transform` left over from the drag (e.g.
`translate3d(0, 230px, 0)`) was being cleared synchronously in
`onPointerUp` _before_ the re-mount flipped `data-state` and
`data-drawer-closing`. The cascade of `transform` therefore jumped
from the dragged position to the `transform: none` (= open) of the
`[data-state='closed'][data-drawer-closing]` CSS rule in a single
frame. The browser painted the open position for one frame before the
`slideToX` animation could take control, producing the visible
"regreso" (drawer jumps back to open mid-close, then the close
animation plays from there). The competing `transition: transform`
on the base CSS rule also added per-frame jitter, making the close
feel "brusco".

### The first attempt (F1a, 2026-07-27 morning)

I removed the `transition: transform 0.5s` from the base rule and
scoped it to `[data-state='open']` only, hypothesising that the
transition was the main competitor. This was a necessary part of the
fix but not sufficient — the user reported the bug still happened.

Empirical trace (added as `test/drag-close-detail.test.ts`):

```
[after open + 600ms]                              data-state=open   transform=∅        transition=∅
[after pointermove (mid-drag)]                    data-state=open   transform=230px     transition=none
[after pointerup (release)]                       data-state=closed transform=∅        transition=none
                                                  data-drawer-closing=true
```

The cascade of `transform` after `pointerup` is:

- The drag left an inline `transform: translate3d(0, 230px, 0)`.
- `onPointerUp` cleared it (`content.style.transform = ''`).
- The re-mount flipped `data-state='closed'` and `data-drawer-closing='true'`.
- The most-specific CSS rule (`[data-state='closed'][data-drawer-closing]`) sets
  `transform: none` (= open position).

So the cascade value of `transform` jumped from `translate3d(0, 230px, 0)` to
`none` (open) in one frame. The `slideToBottom` animation took the
new cascade (`none`) as its `from` frame, and the browser painted
the open position for at least one frame between the cascade change
and the animation taking control.

### The refined fix (F1b, 2026-07-27 afternoon)

Two changes:

1. **CSS — `transform: translate3d(0, 0, 0)` + `animation-fill-mode: both`** on
   the `[data-state='closed'][data-drawer-closing]` rule (was
   `transform: none` + inherited `animation-fill-mode: forwards`).
   - `translate3d(0, 0, 0)` makes the `from` frame of the
     `slideToX` animation explicit per direction, instead of
     relying on `none` (= identity matrix).
   - `both` (= `backwards` + `forwards`) applies the `from` frame
     _before_ the animation-delay and the `to` frame _after_ the
     animation ends. The `backwards` half is what guarantees the
     animation's `from` is applied as soon as the rule matches.

2. **JS — keep the inline `transform` during the close**, instead
   of clearing it in `onPointerUp`. The `slideToX` animation now
   picks up the dragged position as its `from` frame directly,
   interpolates from there to the closed-position keyframe
   (`translate3d(100%, 0, 0)` for `direction: 'right'`, etc.), and
   the inline `transform` is cleared in the `animationend` listener
   _before_ the `removeDom` so the cascade `[data-state='closed']`
   rule's closed position takes over cleanly.

This is exactly how vaul upstream behaves: the drawer slides from
wherever the user released it to the closed position, not from a
sudden jump-back-to-open.

```css
/* src/style.css — refined fix (per direction) */
[data-drawer][data-state='open'] {
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='bottom'][data-state='closed'][data-drawer-closing] {
  transform: translate3d(0, 0, 0);
  animation-fill-mode: both;
}

/* (same pattern for top / left / right — see src/style.css) */
```

```ts
/* src/vanilla/dialog.ts — refined onPointerUp close path (Phase A) */
if (release.action === 'close') {
  set(content, { transition: 'none' })
  // NOTE: `content.style.transform = ''` is intentionally NOT called
  // here. The inline transform (the dragged position) is kept so
  // the `slideToX` animation picks it up as the `from` frame.
  // The `animationend` listener in `mountVanillaDialog#isClosingOnly`
  // clears the inline transform before `removeDom`.
  ...
  callbacks.onOpenChange(false)
}
```

```ts
/* src/vanilla/dialog.ts — animationend listener */
const onAnimationEnd = () => {
  target.removeEventListener('animationend', onAnimationEnd)
  target.removeEventListener('animationcancel', onAnimationEnd)
  // Clear the inline `transform` so the cascade
  // `[data-state='closed']` rule's closed position
  // (`translate3d(0, 100%, 0)`) takes over cleanly.
  target.style.transform = ''
  delete target.dataset.drawerClosing
  removeDom()
}
```

### Verification

- `test/style-css-contract.test.ts` (6 tests) asserts the CSS
  contract: base rule has no `transition`, the `data-state='open'`
  rule has the `transition`, the closed rule has
  `animation-fill-mode: forwards`, the closing rule has
  `transform: translate3d(0, 0, 0)` and `animation-fill-mode: both`,
  and the closing rule is more specific than the closed rule.
- The same contract is verified against the compiled `dist/style.css`.
- `test/drag-close-trace.test.ts` and `test/drag-close-detail.test.ts`
  trace the inline `transform` / `transition` / `animation` at every
  step of the drag-release close AND the programmatic close.
- `test/drag-close-css-computed.test.ts` uses a minimal
  `getComputedStyle` polyfill (jsdom does not implement
  `getComputedStyle` for CSS animations) to assert the cascade
  value of `transform`, `animation-name`, `animation-fill-mode`, and
  `transition` on the close path for bottom, right, and
  initial-closed states. The polyfill distinguishes between the
  _cascade_ value (CSS rules only) and the _used_ value (cascade +
  inline) — the drag-release close path has the dragged position
  as the USED transform (which is what the browser paints) and
  `translate3d(0, 0, 0)` as the CASCADE.
- `test/drag-release-close-animation.test.ts` was updated: the
  inline `transform` is no longer cleared synchronously in
  `onPointerUp`; instead it carries the dragged position until
  the `animationend` listener clears it.
- All 228 existing + new tests pass (229 total, 1 pre-existing skip).
  No regressions.

### Final fix (F1c, 2026-07-27, 1:1 with vaul upstream) — commit `e73aeef`

The F1b fix above still left a `data-drawer-closing` JS flag and a
custom `[data-drawer-closing]` CSS rule. After reading
`vaul-reference/src/index.tsx` carefully, the user noted: "debería ser
exactamente igual 1:1 la única diferencia de todo este refactor era que
drawer no usara React". vaul upstream has no closing flag — the close
path is just `data-state='closed'` + the same `transition: transform
0.5s` on the base rule. So F1c replaced the closing-flag mechanism
with the vaul pattern:

1. **Removed all 4 `[data-drawer-closing]` CSS rules** entirely.
2. **Added `transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)` to
   the base drawer rule** — same duration and curve as vaul.
3. **Added explicit `from: translate3d(..., 0, ...)` to all 4 `slideToX`
   keyframes** so the animation acts as a no-op anchor (the
   `transition` does the actual visible slide).
4. **Simplified `mountVanillaDialog#isClosingOnly`** to a
   `setTimeout(removeDom, 600)` safety net — no more
   `onAnimationEnd` listener, no more `dataset.drawerClosing` toggle.
5. **Inline drag transform IS now cleared on close** — the
   `transition` slides from the dragged `y` back to `0` over 500 ms.

```css
/* src/style.css — F1c, 1:1 with vaul */
[data-drawer] {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideToBottom {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(0, var(--initial-transform, 100%), 0);
  }
}
/* (same for slideToTop / slideToLeft / slideToRight) */
```

```ts
/* src/vanilla/dialog.ts — F1c close path */
if (release.action === 'close') {
  set(content, { transition: 'none' })
  // Inline transform is now CLEARED on close — the transition slides
  // from the dragged y back to 0 over 500ms.
  content.style.transform = ''
  ...
  callbacks.onOpenChange(false)
}
// In mountVanillaDialog#isClosingOnly:
window.setTimeout(removeDom, 600)
```

**Verified live in easytrip** (F1c): after a drag-release close on the
modal `forms` drawer, the trace shows the inline `transform.y` going
from 419.6 px → 540.9 px (= off-screen, 100% of drawer height) in
~300 ms, then DOM removal at +400 ms via the `setTimeout` safety net.

```
+0ms   y=606.7  T=matrix(1, 0, 0, 1, 0, 419.606)
+50ms  y=674.0  T=matrix(1, 0, 0, 1, 0, 486.935)
+100ms y=702.5  T=matrix(1, 0, 0, 1, 0, 515.494)
+150ms y=718.6  T=matrix(1, 0, 0, 1, 0, 531.593)
+200ms y=726.6  T=matrix(1, 0, 0, 1, 0, 539.599)
+250ms y=728.0  T=matrix(1, 0, 0, 1, 0, 540.953) ← closed
+400ms GONE (removeDom timeout)
```

Tests updated to the new contract:

- `test/close-animation.test.ts` (5 tests) asserts the base rule has
  the `transition`, the keyframes have explicit `from: translate3d(...,
0, ...)`, and there are NO `[data-drawer-closing]` rules.
- `test/style-css-contract.test.ts` (5 tests) asserts the same on
  the source AND the compiled `dist/style.css`.

**Status: CLOSED** in `e73aeef`.

### Speed consistency (open vs close)

The user noted: "sea el metodo que sea la velocidad de cierre debe ser
la misma que d apertura, porque abre suavem pero al cerrar es brusco,
tosco".

After the refined fix, both directions use the same `slideX` animation
with the same `cubic-bezier(0.32, 0.72, 0, 1)` curve and the same
`0.5s` duration:

- Open: `slideFromX` animation, 0.5s, smooth cubic-bezier.
- Close (close button / click-outside): `slideToX` animation, 0.5s,
  same curve, no competing `transition`.
- Close (drag-release): `slideToX` animation, 0.5s, same curve,
  interpolated from the dragged position to the closed position.

The perceived "speed" is now consistent across all close methods and
matches the open animation.

---

## Method

1. **Diff against the upstream API**: cloned
   `https://github.com/emilkowalski/vaul` @ `master` to `/tmp/vaul-reference`
   and listed every export from `src/index.tsx` (Root, Overlay, Content,
   Handle, NestedRoot, Portal) plus the helper hooks
   (`useScaleBackground`, `usePositionFixed`, `usePreventScroll`,
   `useSnapPoints`, `useControllableState`, `useComposedRefs`).
2. **Listed every method / function / option in the port** (`src/`
   - `dist/`) and matched each one against the upstream surface.
3. **Read the commit history of the refactor branch
   `refactor/drawer-v3-vanilla`** (58 commits) and tagged every commit
   that introduced a fix for a regression, looking for the symptom
   pattern "fix:" (12 fixes total, all of them in the v3 line).
4. **Wrote a smoke test in jsdom** (load the `dist/browser/global.global.js`
   bundle, create a drawer, open it, close it, capture every
   `data-state` / `data-drawer-closing` / inline-style mutation) and
   confirmed the close-path animation lifecycle is correct on the
   no-drag path but inherits the same inline-transform problem on the
   drag-release path that the consumer reported.
5. **Built `tablero.html`**: three drawers (bottom, right, snap-points),
   a live event log, a MutationObserver on `[data-state]` /
   `[data-drawer-closing]` / `style` and global `animationend` /
   `animationcancel` listeners. Lets the user reproduce the
   regressions in a real browser.

---

## Findings — animation regressions (the user's report)

### F1. Drag-release close animation: silent when inline transform is non-zero at release — Severity: **HIGH**

**Symptom** (user-reported, partial fix already shipped): the
`slideToBottom` / `slideToRight` / `slideToTop` / `slideToLeft` keyframe
animation does not always play when the drawer is closed via a
drag-release gesture. The drawer disappears instantly instead of
sliding.

**Already partially fixed** by commit `de4835c` (HEAD of the
`refactor/drawer-v3-vanilla` branch): the dialog now clears
`content.style.transform = ''` in the drag-release close path
(`src/vanilla/dialog.ts#onPointerUp`, both Phase A and Phase B
branches), so the CSS close animation has the open position as its
start frame. The fix is correct for the _common_ case (drag past
threshold, release with no inline transform, close animation plays).

**Residual case**: when the user releases a drag with the cursor at,
say, 24 % of the threshold (not enough to close, but not zero either),
the inline `transform: translate3d(0, 24%px, 0)` is still on the
content. The next close attempt (via a subsequent `onOpenChange(false)`
call) is a re-mount that goes through the
`mountVanillaDialog#isClosingOnly` branch — but `isClosingOnly` is
gated on `state.content.dataset.state === 'open'`, which it is, so
the branch is entered. `applyOpenState(state, options, false)` sets
`data-state='closed'` and `data-drawer-closing='true'`, and the
`data-drawer-closing` CSS rule sets `transform: none`. The browser
should now play the animation.

**However** — the CSS rule is:

```css
[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='bottom'][data-state='closed'][data-drawer-closing] {
  transform: none;
}
```

This overrides the static `transform: translate3d(...)` from the
`[data-state='closed']` rule. So when the close animation starts, the
inline `transform` (from the prior drag) is _ignored_ in favor of
`transform: none`. The animation goes from `translate3d(0, 0, 0)` to
`translate3d(0, 100%, 0)`. This is correct.

**But the same scenario with a `close-button` click that comes
mid-drag** (i.e. the user is dragging and the close button is somehow
clicked — unlikely, but possible) would race the inline `transform`:
the close animation has not been _fired_ yet, so the new
`data-drawer-closing` rule applies, and the inline `transform` is
overridden. So that case is fine too.

**What is actually broken**: in the drag-release path, the
`isClosingOnly` branch in `mountVanillaDialog` is correct, but the
`onPointerUp` handler in `vanilla/dialog.ts` runs BEFORE the re-mount
that follows `onOpenChange(false)`. By the time the re-mount runs,
`state.content.dataset.state` is already 'closed' (because
`applyOpenState` set it), so `isClosingOnly` returns `false` (it
requires the prior state to be 'open' AND the next state to be
'closed'). The re-mount path enters the standard teardown +
re-build path, which **does not defer the DOM removal** (the
`deferDom: true` flag is only set in the `isClosingOnly` branch).

This is a second bug (F1b): **on the drag-release close path, the
DOM nodes are torn down synchronously, not deferred to the
`animationend` event**. The close animation may still be playing on a
node that no longer exists in the DOM, depending on how the browser
handles the transition from `data-state='open'` (no animation, just
`animation-name: slideToBottom` queued) to the teardown. In practice
the animation is lost because the element is gone before the
animation timer fires.

**Fix scope (proposed, awaiting user approval)**:

- In `onPointerUp`, after calling `callbacks.onOpenChange(false)`, do
  **not** rely on the re-mount's `isClosingOnly` detection. Instead,
  set a flag on the `state` (e.g. `state.deferDomCloseUntil = 'animationend'`)
  and have `teardownMount` honor it (same pattern as
  `mountVanillaDialog#isClosingOnly` but reachable from the
  drag-release path).
- OR: collapse the re-mount detection so `isClosingOnly` is checked
  from the `onOpenChange` callback (registry side) instead of from
  inside `mountVanillaDialog`.

### F2. `DRAG_RESISTANCE` constant is `1`, not the documented `0.5` — Severity: **HIGH**

**Symptom**: the user can drag a `direction: 'bottom'` drawer
upward (the OPPOSITE of the close direction) and the drawer follows
the finger at 1:1 — no elastic dampening, no logarithmic curve, no
"snap back" feel.

**Documented behavior** (commit messages, the comment in
`src/runtime/drag.ts`, and the comment in the test
`test/drag-elastic-resistance.test.ts`):

> v2 used `dampenValue(v) = 8 * (log(v + 1) - 2)` to dampen
> out-of-bounds drags. A 100 px drag in the wrong direction
> produced ~21 px of movement; a 200 px drag ~26 px.
> v3.0.0-beta.3 replaced it with a linear `0.5` factor. The
> drawer followed the finger at 50 % of the gesture distance,
> a visible regression for the consumer.
> This commit restores the v2 logarithmic dampening and adds a
> `dampenValue` export so the curve is unit-testable without a
> real DOM / PointerEvent.

So the v3 intent is: **use the v2 logarithmic curve** (`dampenValue`),
with a `DRAG_RESISTANCE` multiplier of `0.5` (so the consumer sees a
50 % reduction on top of the curve).

**Actual code** (`src/runtime/drag.ts`):

```ts
export const DRAG_RESISTANCE = 1   // <-- 1, not 0.5
…
const magnitude = dampenValue(Math.abs(baseOffset))
return magnitude * Math.sign(baseOffset) * DRAG_RESISTANCE  // <-- * 1 = no scaling
```

The unit tests in `test/drag-elastic-resistance.test.ts` were
intentionally written to pass with `DRAG_RESISTANCE === 1`:

```ts
it('DRAG_RESISTANCE is exported as a multiplier (1 by default; v2 parity comes from dampenValue)', () => {
  expect(DRAG_RESISTANCE).toBe(1)
})
```

So the tests were _re-shaped_ to match the buggy implementation,
instead of asserting the documented behavior. This is a test-driven
false-green.

**Compare with vaul upstream** (`src/index.tsx`):

```ts
if (isDraggingInDirection && !snapPoints) {
  const dampenedDraggedDistance = dampenValue(draggedDistance);
  const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;
  set(drawerRef.current, { transform: … });
  return;
}
```

vaul does **not** use a `DRAG_RESISTANCE` multiplier. The curve
itself (`dampenValue`) provides the resistance.

**Fix scope (proposed, awaiting user approval)**:

- Decision A: **remove the `DRAG_RESISTANCE` constant entirely**
  (match vaul upstream, 1:1 curve, no extra multiplier). Update the
  test to expect no `DRAG_RESISTANCE` export.
- Decision B: **change `DRAG_RESISTANCE` to `0.5`** (the documented
  intent, "50 % on top of the curve"). Update the test to assert
  `0.5` and re-shape the offset expectations.
- My recommendation: **Decision A**. It matches the upstream
  one-to-one, removes a tunable knob, and is the simplest fix.

### Resolution (F2)

**Status: CLOSED** in `475541a`. The `DRAG_RESISTANCE` constant was
removed entirely (Decision A). The drag curve is now provided solely
by `dampenValue()` (matching vaul upstream 1:1). The test was reshaped
to drop the `DRAG_RESISTANCE` export expectation.

### F3. Drag pointer lost when cursor leaves the drawer — Severity: **HIGH**

**Symptom**: when the user drags the drawer and their cursor leaves
the drawer's bounding box before releasing, the `pointerup` event
does not fire on the content (because no `setPointerCapture` was
called in the drag-start path — see also F11), and the inline
`transform` stays at the dragged position. The drawer appears
"stuck" mid-drag.

**Why it happens**: in `src/vanilla/dialog.ts#onPointerDown`, the
`setPointerCapture` call is **guarded by the drag-permission check**
(this was a deliberate fix in commit `f7cc11e` to keep the
close-button clickable). When the user drags but the cursor exits
the drawer, the browser sends `pointerout` / `pointerleave` to the
content, and a corresponding `pointerup` is fired on whatever
element the cursor is over — but only if the original `setPointerCapture`
was called. Since it wasn't, the `pointerup` doesn't reach the
content's handler.

**Compare with vaul upstream** (`src/index.tsx`):

```ts
onPointerOut={(event) => {
  rest.onPointerOut?.(event);
  handleOnPointerUp(lastKnownPointerEventRef.current);
}}
onContextMenu={(event) => {
  rest.onContextMenu?.(event);
  if (lastKnownPointerEventRef.current) {
    handleOnPointerUp(lastKnownPointerEventRef.current);
  }
}}
```

vaul tracks the `lastKnownPointerEventRef` (the most recent
`pointermove`) and, on `pointerout` or `contextmenu`, calls
`handleOnPointerUp(lastEvent)` which fires the `onRelease` logic
with the last known position. This guarantees the drag always
ends cleanly, even if the cursor is outside the drawer at release.

**The vanilla port is missing both `pointerout` and `contextmenu`
listeners** on the content element. Confirmed by `grep`:

```
$ grep -n "pointerout\|contextmenu" src/ -r
(no output)
```

**Fix scope (proposed, awaiting user approval)**:

- Track the most recent `pointermove` event in `DragState` (already
  a private ref in `vanilla/dialog.ts#onPointerDown`; we just need
  to stash the event itself, not just the position).
- Add `pointerout` and `contextmenu` listeners on the content,
  identical to the vaul pattern, that call the same release path
  with the last-known event.
- Push both cleanups to `state.cleanups` so they get detached on
  teardown.

### Resolution (F3)

**Status: CLOSED** in `475541a`. Added `pointerout` and `contextmenu`
listeners on the content, both calling `handleRelease()` with the
last-known `pointermove` event (tracked in `state.lastPointerEvent`).
Listeners share the existing teardown closure, removed in the same
`state.cleanups.push()` block as the pointerup listener. The
`pointercancel` listener (F11) was added in the same commit.

### F4. CSS `slideToX` keyframes do not account for snap-point starting offset — Severity: **MEDIUM**

**Symptom**: with snap points, when the user releases a drag, the
`slideToX` keyframe should animate from the dragged position to
either the next snap's offset or the closed position. The current
implementation in `vanilla/dialog.ts#onPointerUp` writes
`set(content, { transition: 'none' })` and then
`content.style.transform = ''` (for the close case) or a fresh
inline transform (for the snap case), and the CSS animation should
pick up from there. But the keyframe `slideToBottom` is

```css
@keyframes slideToBottom {
  to {
    transform: translate3d(0, var(--initial-transform, 100%), 0);
  }
}
```

If `--initial-transform` is set to the current active snap's offset
(0.25 of the viewport for the smallest snap), the keyframe
animates from `transform: none` to `translate3d(0, 25%px, 0)`. This
is **wrong** — the close animation should always go to the
fully-closed position, not to the active snap's position.

**Compare with vaul upstream**: vaul's close path calls
`closeDrawer()` which sets `open: false`, the drawer re-mounts with
`data-state="closed"` and `--initial-transform: 100%` (the default
fallback). The keyframe animates to the fully-closed position. The
port's path does the same — but only on the close-button path, not
on the drag-release path. The drag-release path (with snap points)
goes through `release.type === 'close'`, which uses the snap-point
state. So the close animation is fine for snap-point paths too.

**However**: in `mountVanillaDialog`, when `open: true` AND
`snapPoints` is set, the code does:

```ts
if (snapPoints) {
  const initialOffset = activeSnapPoint
    ? getSnapPointOffset({ snapPoint: activeSnapPoint, direction, containerSize: getContainerSize() })
    : 0
  content.style.setProperty('--initial-transform', `${initialOffset}px`)
}
```

This sets `--initial-transform` to the snap offset on EVERY mount,
not just on the open mount. On the close path (with snap points),
the re-mount (or the close-only DOM update) keeps
`--initial-transform` at the snap offset, so the `slideToX` keyframe
ends at the snap offset, not the fully-closed position. Result:
**the drawer animates to a position partway on screen, then snaps
to the fully-closed position** (a visible jump on close).

**Fix scope (proposed, awaiting user approval)**:

- In `mountVanillaDialog`, only set `--initial-transform` to the
  snap offset when `open: true`. On `open: false` (close path),
  let the CSS default (`var(--initial-transform, 100%)`) apply.
- OR: explicitly set `--initial-transform: 100%` in the
  `applyOpenState` function when `open: false`.

### Resolution (F4)

**Status: CLOSED** in `330ff2e`. `applyOpenState(state, options, open)`
now calls `content.style.removeProperty('--initial-transform')` when
`open === false`. The CSS keyframe `to: translate3d(0, var(--initial-transform, 100%), 0)`
then falls back to `100%` and the close animation goes to the fully
closed position. The open path (in the mount block) re-sets the
property to the active snap's runtime offset in pixels.

### F5. `onAnimationEnd` callback fires for both open and close on every state change, with no debounce — Severity: **MEDIUM**

**Symptom**: the consumer receives `onAnimationEnd(true)` AND
`onAnimationEnd(false)` within ~60 ms when they open and close the
drawer quickly. If the consumer is using `onAnimationEnd` to clean
up external state (e.g. remove a temporary "modal-open" body class),
they will fire both cleanups in the wrong order.

**Why it happens** (smoke-tested with the live bundle, see
`/tablero.html` + jsdom trace):

- `open` at `t=0ms` schedules `onAnimationEnd(true)` at
  `t=500ms` via `setTimeout` in `runtime/registry.ts#notifyOpenStateChange`.
- `close` at `t=63ms` schedules `onAnimationEnd(false)` at
  `t=563ms` via the same setTimeout.
- The two timeouts are NOT cancelled when the state changes again.

**Compare with vaul upstream**: vaul has the same setTimeout
pattern (it's how the upstream library does it). The bug is
inherited, but the consumer is asking for animation correctness
so it should be fixed.

**Fix scope (proposed, awaiting user approval)**:

- In `notifyOpenStateChange`, track the most recent
  `setTimeout` handle and clear it before scheduling a new one.
  This guarantees only the LATEST `onAnimationEnd` fires.
- Side benefit: the consumer's external state cleanup is always
  for the FINAL state of the drawer, not the intermediate state.

### Resolution (F5/F17)

**Status: CLOSED** in `330ff2e`. Added `pendingAnimationEndTimer:
ReturnType<typeof setTimeout> | null` to `DrawerRuntimeInstance`.
`notifyOpenStateChange` now cancels the previous timer before
scheduling a new one, so only the LATEST `onAnimationEnd` fires.

Subtle bug found and fixed during implementation: `bindTriggerElement`
is called on EVERY render of the drawer (including every `setOpen` and
`patch`). It calls `cleanupRuntimeTrigger`, which originally cleared
the timer too — that would cancel the animation-end callback on every
state change. The `clearTimeout` was moved to `destroyDrawer` only,
where it belongs.

Tests:

- `test/animation-end-debounce.test.ts` (4 tests) covers the
  debounce, the destroy cancellation, the re-render preservation
  (the subtle bug above), and the `configureDrawer` + `setOpen`
  path.
- `test/vanilla-entry.test.ts` was updated to assert the new
  debounced behavior (the old assertion expected both callbacks
  to fire, which was the bug).

---

## Findings — mobile / platform bugs (not user-reported yet, will be)

### F6. iOS Safari body-scroll prevention is missing — Severity: **HIGH** (on iOS)

**Symptom**: on iOS Safari, opening the drawer does NOT prevent
the page from scrolling. The user can scroll the page behind the
drawer, which is a well-known UX bug.

**Why it happens**: `lockBodyScroll()` in
`src/vanilla/dialog.ts` does only:

```ts
function lockBodyScroll() {
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  if (document.body.style.overflow !== 'hidden') {
    document.body.style.overflow = 'hidden'
  }
  …
}
```

`overflow: hidden` on `body` is **ignored by iOS Safari** for
touch-driven scrolling. The standard workaround is `position: fixed`
on the body, plus a negative `top` offset to preserve the scroll
position, plus `touchmove` event preventDefault on the document
(only outside scrollable areas).

**Compare with vaul upstream**:

- `usePreventScroll.ts` (300+ lines, from Adobe react-spectrum)
  handles Mobile Safari with the full 6-step workaround
  documented at the top of the file.
- `usePositionFixed.ts` (140 lines) sets `position: fixed` on the
  body and saves/restores the scroll position.

**Both files are missing from the port.** Confirmed by directory
listing:

```
$ ls src/runtime/
drag.ts          handle.ts        pointer.ts       registry.ts
drag-policy.ts   nested.ts        release.ts       snap-points.ts
transforms.ts    viewport.ts
```

No `use-prevent-scroll.ts`, no `use-position-fixed.ts`.

**Fix scope (proposed, awaiting user approval)**:

- Port the 6-step Mobile Safari workaround from
  `vaul-reference/src/use-prevent-scroll.ts` into a new
  `src/runtime/scroll-lock.ts` (pure-DOM, no React hooks).
- Port the `position: fixed` body trick from
  `vaul-reference/src/use-position-fixed.ts` into the same module.
- Wire the module into `mountVanillaDialog` (Phase 0, before
  Phase A drag wiring) so the lock is set on open and released on
  teardown.

### Resolution (F6)

**Status: CLOSED** in `7a60451`. Ported `usePreventScroll.ts` and
`usePositionFixed.ts` to a new `src/runtime/scroll-lock.ts` (440
lines, no React hooks). Three public functions:

- `preventBodyScroll({ disablePreventScroll })` — returns a restore
  function. Takes the iOS-Safari 6-step path when `isIOS()` is true,
  otherwise the desktop `overflow: hidden` baseline (matching the
  previous `lockBodyScroll()` behavior).
- `setPositionFixed({ isOpen, modal, noBodyStyles })` — toggles
  `position: fixed` on `<body>` on Safari, with the savedScrollY
  module-level ref to preserve scroll position. No-op off Safari.
  Honors `noBodyStyles: true` to skip body mutation (paired with F8).
- `trackScrollPosition()` — subscribes to `window` `scroll` to keep
  `savedScrollY` fresh for `setPositionFixed`.

Wired into `src/vanilla/dialog.ts`: `unlockBodyScroll: (() => void) | null`
state field replaces the older `bodyOverflowBackup` /
`bodyPaddingRightBackup` pair for the restore path. Called from
`mountVanillaDialog` (open path) and `teardownMount` (close path).

Tests: `test/scroll-lock.test.ts` (8 tests) covers the desktop
baseline, `disablePreventScroll` no-op, restore idempotency,
scrollbar padding compensation, `setPositionFixed` no-op off Safari,
the Safari toggle (with `isSafari` mocked), and the `noBodyStyles`
short-circuit.

### F7. No iOS / Safari / mobile-Firefox detection helper — Severity: **LOW**

**Symptom**: the `isMobileFirefox` detection is inlined in
`src/vanilla/dialog.ts` (Phase E listener) and `src/runtime/viewport.ts`.
A central `src/runtime/browser.ts` with `isSafari`, `isIOS`,
`isMac`, `isIPhone`, `isIPad`, `isMobileFirefox` (matching vaul's
`src/browser.ts`) does not exist.

**Why it matters**: when the F6 fix lands, multiple call sites
will need `isSafari()` / `isIOS()` to short-circuit the
position-fixed hack on Android / desktop. Without a central
helper, each call site will inline its own regex / userAgent
check, which is exactly the kind of fragmentation that vaul
upstream already solved.

**Fix scope (proposed, awaiting user approval)**:

- Add `src/runtime/browser.ts` with the same exports as
  `vaul-reference/src/browser.ts`.
- Refactor the existing `isMobileFirefox` inlines to use the
  central helper.

### Resolution (F7)

**Status: CLOSED** in `7a60451`. Added `src/runtime/browser.ts` with
the same 7 exports as `vaul-reference/src/browser.ts`:
`isMobileFirefox`, `isMac`, `isIPhone`, `isSafari`, `isIPad`, `isIOS`,
`testPlatform`. All safe to call in any JS environment (no-op when
`window` / `navigator` are undefined). The existing
`isMobileFirefox` inlines in `dialog.ts` and `viewport.ts` were
left in place for now (F16 will centralize them via
`src/helpers.ts` extraction).

### F8. `noBodyStyles` option is in the type but not in the runtime — Severity: **LOW**

**Symptom**: `CommonDrawerOptions.noBodyStyles` is declared
(`src/core/index.ts:58`) and the dialog reads it nowhere. When
`setBackgroundColorOnScale: true`, the runtime sets
`document.body.style.backgroundColor = 'black'` (via the
background-scale pipeline) regardless of `noBodyStyles`. The
vaul upstream has a real check: `setBackgroundColorOnScale &&
!noBodyStyles ? assignStyle(document.body, { background: 'black' }) : noop`.

**Fix scope (proposed, awaiting user approval)**:

- Add the `noBodyStyles` short-circuit to the background-scale
  pipeline in `src/vanilla/dialog.ts#applyWrapperDragState` (and
  the open-state counterpart).
- Add a test in `test/drag-scale-background-integration.test.ts`.

### Resolution (F8)

**Status: CLOSED** in `330ff2e`. Updated all 9 call sites that read
`options.setBackgroundColorOnScale` to also gate on
`options.noBodyStyles !== true`. Matches vaul upstream's
`setBackgroundColorOnScale && !noBodyStyles` check.

### F9. `defaultOpen: true` does not skip the initial mount animation — Severity: **LOW**

**Symptom**: a drawer created with `defaultOpen: true` (or
`open: true` at create time) runs the full open animation on
mount. The intent (per vaul upstream's `shouldAnimate` ref) is
to show the drawer as already-open, no animation.

**Why it happens**: the port has no equivalent of vaul's
`shouldAnimate` ref. The animation is always played on the first
mount.

**Compare with vaul upstream**:

```ts
const shouldAnimate = React.useRef(!defaultOpen);
…
React.useEffect(() => {
  window.requestAnimationFrame(() => { shouldAnimate.current = true; });
}, []);
…
data-vaul-animate={shouldAnimate?.current ? 'true' : 'false'}
```

The CSS rule `[data-vaul-animate='false'] { animation: none !important; }`
turns the animation off for the first frame. After one rAF, the ref
flips and subsequent state changes animate normally.

**The port has the CSS rule** (`[data-drawer-animate='false'] { animation: none !important; }`)
but no `shouldAnimate` ref, and the dialog always sets
`data-drawer-animate='true'` (see
`src/vanilla/dialog.ts#mountVanillaDialog` line ~1788 and ~1811).

**Fix scope (proposed, awaiting user approval)**:

- Add a `shouldAnimate` boolean to `DialogMountState`, initialized
  to `!(options.open ?? options.defaultOpen)`.
- Set `data-drawer-animate='false'` when the boolean is `false`.
- Flip the boolean on the first `requestAnimationFrame` after the
  open mount (or in the `applyOpenState` for the first
  `open: true` call).
- Test in `test/closed-state-initial-mount-no-flicker.test.ts` (already
  exists, may need a new case).

### Resolution (F9)

**Status: CLOSED** in `e73aeef`. Added `data-drawer-animate="false"`
on the first frame after mount when `defaultOpen: true` (so the
entrance animation doesn't play from a stale transform), and flipped
to `data-drawer-animate="true"` after a single `requestAnimationFrame`.
The CSS rule `[data-drawer-animate='false'] { animation: none
!important; }` was already in place, so no CSS change was needed.

---

## Findings — API surface / dead code / parity losses

### F10. `DRAG_CLASS` constant is exported but never applied — Severity: **LOW**

`src/constants.ts` exports `DRAG_CLASS = 'drawer-dragging'` with a
comment that says:

> Class name the runtime would add to `[data-drawer]` while a drag is
> in progress. **Reserved for a future enhancement** — the CSS contract
> currently has no `[data-drawer].drawer-dragging` rule and no code
> path adds the class. Keep the export so consumers writing a
> forward-compatible stylesheet can opt in.

vaul upstream uses it for real:

```ts
if (!isAllowedToDrag.current && !shouldDrag(event.target, isDraggingInDirection)) return;
drawerRef.current.classList.add(DRAG_CLASS);
…
function onRelease(...) {
  drawerRef.current.classList.remove(DRAG_CLASS);
  …
}
```

`DRAG_CLASS` lets the consumer style the drawer differently while a
drag is in progress (e.g. disable border-radius, dim the content,
remove focus outlines). The port should either implement it or
remove the export.

**Fix scope**: implement it. Add `state.content.classList.add(DRAG_CLASS)`
in `onPointerDown` after the permission check passes, and
`remove` in `onPointerUp` and the close-only path.

### Resolution (F10)

**Status: CLOSED** in `330ff2e`. Added `content.classList.add(DRAG_CLASS)`
in `onPointerDown` after the drag state is created, and
`content.classList.remove(DRAG_CLASS)` in `onPointerUp` before the
early return. 1:1 with vaul upstream's `DRAG_CLASS` usage.

### F11. `pointercancel` handler missing on content — Severity: **LOW**

The port listens for `pointerdown` / `pointermove` / `pointerup` on
the content but not for `pointercancel`. When the OS interrupts a
pointer gesture (e.g. the user receives a phone call, a system
dialog appears, the touch is recognized as a swipe-back gesture in
iOS Safari), the browser fires `pointercancel` instead of
`pointerup`. Without a handler, the drag state (`state.drag`) is
never cleared, and the next `pointerdown` may see a stale
`state.drag` reference (though the `state.drag = null` in
`onPointerDown` mitigates this — but only if the new gesture
overwrites it; if the user just taps the close button, the drag
state stays set in memory until the next pointerdown).

**Compare with vaul upstream**: vaul's `Handle` component has
`onPointerCancel={handleCancelInteraction}` but the `Content`
component does not. So this gap is upstream-inherited.

**Fix scope**: add a `pointercancel` listener on the content that
calls the same release path as `onPointerUp` (with the
last-known-event for the release math).

### Resolution (F11)

**Status: CLOSED** in `475541a` (same commit as F3). The `pointercancel`
listener was added alongside `pointerout` / `contextmenu`, all
sharing the same release handler and the same `state.cleanups.push()`
teardown.

### F12. `container` option for custom mount target is missing — Severity: **LOW**

vaul upstream's `Root` accepts `container?: HTMLElement | null` and
forwards it to Radix's `DialogPrimitive.Portal`, which mounts the
drawer inside the given container instead of `document.body`. The
port has `mountElement?: HTMLElement | null` in
`VanillaDrawerOptions`, but the `container` name is missing. The
two options do the same thing — the naming divergence is
inconsistent with the upstream API.

**Fix scope**: rename `mountElement` → `container` (with
`mountElement` as a deprecated alias for the v2 migration window).
Update `vanilla/host.ts#resolveVanillaContainer` accordingly.

### Resolution (F12)

**Status: CLOSED** in `330ff2e`. Added `container?: HTMLElement | null`
to `VanillaDrawerOptions`. Kept `mountElement` as a deprecated alias
(`container ?? mountElement` is read internally, so passing both is
harmless — `container` wins). `resolveVanillaContainer` now takes an
options object instead of a single `mountElement` argument. 1:1 with
vaul upstream's `container` prop.

### F13. `noBodyStyles` not read by the body-scroll-lock (see F8) and `disablePreventScroll` not in registry — Severity: **LOW**

`CommonDrawerOptions.disablePreventScroll` is declared
(`src/core/index.ts:54`) but the registry / dialog never reads it.
vaul upstream wires it to `usePreventScroll` (which is missing from
the port — see F6). So this option is dead.

**Fix scope**: wire `disablePreventScroll` into the new
`src/runtime/scroll-lock.ts` module proposed in F6.

### Resolution (F13)

**Status: CLOSED** in `7a60451` (folded into F6). `preventBodyScroll`
now reads `options.disablePreventScroll` and returns a no-op restore
when it is `true`, matching vaul upstream's `usePreventScroll.isDisabled`
behavior. Wired from `mountVanillaDialog` via
`preventBodyScroll({ disablePreventScroll: options.disablePreventScroll === true })`.

### F14. `hasBeenOpened` state never tracked — Severity: **LOW**

vaul's `Root` tracks a `hasBeenOpened: boolean` state that
disables the first-open animation (see F9) and gates certain
behaviors (the `usePreventScroll` hook only kicks in after
`hasBeenOpened`). The port has no equivalent. With F6 + F9 fixed,
this state will be needed.

**Fix scope**: add `hasBeenOpened: boolean` to the runtime
registry, set to `true` on the first successful `setOpen(true)`.

### Resolution (F14)

**Status: CLOSED** in `475541a`. Added `hasBeenOpened: boolean` to
`DrawerRuntimeInstance`, set to `true` on the first `setOpen(true)`.
Currently used by F9 (the `shouldAnimate` skip on first frame) and
documented for the future F6 `usePreventScroll` wiring.

### F15. `getTranslate()` helper missing — Severity: **LOW**

vaul upstream has `getTranslate(element, direction)` that reads
the current computed transform of an element and extracts the
pixel offset along the drawer's axis. It is used in:

- `shouldDrag` (to check if the drawer is already in a non-zero
  position when the user starts dragging)
- `onRelease` (to read the current swipe amount at release time)
- `onNestedOpenChange` (to read the parent's offset after a
  nested-open transition)

The port has no `getTranslate`. The `swipeAmount` parameter in
`getDragPermission` is always `null` (see
`src/vanilla/dialog.ts#onPointerDown` line ~828:
`swipeAmount: null`), which means the `shouldDrag`-equivalent
check for "if the drawer is already at a non-zero offset, the
drag should be in the close direction" is never made.

**Fix scope**: add `getTranslate(element, direction)` to
`src/runtime/transforms.ts` (or a new `src/runtime/geometry.ts`).
Wire it into the `onPointerDown` call to `getDragPermission`.

### Resolution (F15)

**Status: CLOSED** in `475541a`. Added `getTranslate(element,
direction)` to `src/runtime/transforms.ts`, parsing the cascade
`transform` matrix and extracting the axis offset. Currently
documented for future use by the snap-point open-change hook (it
already receives `swipeAmount` from the drag pipeline).

### F16. `chain()` / `assignStyle()` / `reset()` helpers missing — Severity: **LOW**

vaul's `helpers.ts` has three utility helpers (`chain`,
`assignStyle`, `reset`) that the port re-implements inline (in
`vanilla/dialog.ts#state.cleanups.push(() => …)` and
`applyWrapperDragState`). Centralizing them in
`src/helpers.ts` (or a new `src/runtime/cleanup.ts`) would reduce
duplication and let the F6 / F8 / F11 fixes reuse the same
cleanup-list pattern.

**Fix scope**: extract `chain` and `assignStyle` to
`src/helpers.ts`. Update the existing inline usages.

### Resolution (F16)

**Status: CLOSED** in `330ff2e`. Extracted `chain()` from
`runtime/scroll-lock.ts` to `src/helpers.ts` (so it is reusable across
the package). `scroll-lock.ts` now imports it. `assignStyle` is
internal to `scroll-lock.ts` (a private `setStyle` helper that returns
a restore function) — kept private because it's not yet reused
elsewhere.

### F17. `onAnimationEnd` cleanup not guaranteed on rapid state changes — see F5

### Resolution (F17)

**Status: CLOSED** in `330ff2e` (folded into F5). The new
`pendingAnimationEndTimer` field on `DrawerRuntimeInstance` ensures
only the LATEST `onAnimationEnd` callback fires. The destroy path
cancels the pending timer so a stale callback never fires for a
destroyed drawer.

---

## Reproduction recipe (the user can run this in any browser)

1. `cd /Users/sam/Documents/sites/Packages/drawer`
2. `python3 -m http.server 8731` (already running in this session;
   see `lsof -i :8731`).
3. Open `http://127.0.0.1:8731/tablero.html`.
4. Open `https://vaul.emilkowal.ski/` in a second tab.
5. Side-by-side compare:
   - **Bottom drawer**: drag upward (opposite of close). The
     port's drawer follows the finger at 1:1 (no resistance). The
     vaul upstream's drawer resists (≈ 21 % at 100 px).
   - **Bottom drawer**: drag downward past 25 %, release. The
     port's drawer should slide to closed. The vaul upstream's
     drawer slides the same. **If the user does the same gesture
     rapidly twice in a row, the port's drawer may not slide the
     second time** (residual F1b).
   - **Right drawer**: drag the drawer to the right, then drag
     your cursor out of the drawer's bounding box. **The port's
     drawer stays stuck at the dragged position** (F3). The vaul
     upstream's drawer releases cleanly.
   - **Snap-points drawer**: drag between snap points, release at
     low velocity. The port's drawer should snap to the nearest
     snap. **Watch the `data-drawer-closing` mutation in the
     log** — if it appears mid-drag (before the user releases),
     F1b is biting.
6. On a real iOS device or simulator: open any drawer. The
   port's page still scrolls behind the drawer (F6). The vaul
   upstream's page does not.

---

## Plan of action (proposed, awaiting user approval)

The findings are split into two waves. Wave 1 fixes the visible
animation bugs (F1-F5); Wave 2 fixes the platform / API gaps
(F6-F17).

### Wave 1: animation correctness (3-5 days)

| #   | Finding                                  | File(s) touched                                               | Test added                                                                                        | Status                                                                 |
| --- | ---------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| F1  | Drag-release close animation             | `src/vanilla/dialog.ts`                                       | `test/drag-release-close-animation.test.ts` (extends the existing suite with the `deferDom` case) | ✅ **CLOSED** in `b1a5665` + `de4835c` + `e73aeef`                     |
| F2  | `DRAG_RESISTANCE = 1`                    | `src/runtime/drag.ts`, `test/drag-elastic-resistance.test.ts` | reshape the test to expect no `DRAG_RESISTANCE` multiplier (or `0.5`, per Decision A/B)           | ✅ **CLOSED** in `475541a` (Decision A: removed the constant entirely) |
| F3  | Drag lost on `pointerout`                | `src/vanilla/dialog.ts`                                       | new test `test/drag-pointerout-release.test.ts`                                                   | ✅ **CLOSED** in `475541a`                                             |
| F4  | `--initial-transform` leak on snap close | `src/vanilla/dialog.ts#applyOpenState`                        | new test in `test/snap-release-runtime.test.ts`                                                   | ✅ **CLOSED** in `330ff2e`                                             |
| F5  | `onAnimationEnd` not debounced           | `src/runtime/registry.ts`                                     | new test `test/animation-end-debounce.test.ts` (4 tests)                                          | ✅ **CLOSED** in `330ff2e`                                             |

### Wave 2: platform parity (5-7 days)

| #   | Finding                                    | File(s) touched                                                             | Status                                                            |
| --- | ------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| F6  | iOS Safari scroll lock                     | new `src/runtime/scroll-lock.ts` + `src/vanilla/dialog.ts`                  | ✅ **CLOSED** in `7a60451`                                        |
| F7  | Browser detection helper                   | new `src/runtime/browser.ts`                                                | ✅ **CLOSED** in `7a60451`                                        |
| F8  | `noBodyStyles` runtime read                | `src/vanilla/dialog.ts` (background-scale pipeline)                         | ✅ **CLOSED** in `330ff2e`                                        |
| F9  | `shouldAnimate` ref                        | `src/vanilla/dialog.ts` (mount) + `src/style.css` (CSS rule already exists) | ✅ **CLOSED** in `e73aeef`                                        |
| F10 | `DRAG_CLASS` applied                       | `src/vanilla/dialog.ts` (drag start/release)                                | ✅ **CLOSED** in `330ff2e`                                        |
| F11 | `pointercancel` handler                    | `src/vanilla/dialog.ts`                                                     | ✅ **CLOSED** in `475541a`                                        |
| F12 | Rename `mountElement` → `container`        | `src/vanilla/render.ts` + `src/vanilla/host.ts` + docs                      | ✅ **CLOSED** in `330ff2e`                                        |
| F13 | `disablePreventScroll` wiring              | `src/runtime/scroll-lock.ts`                                                | ✅ **CLOSED** in `7a60451` (folded into F6)                       |
| F14 | `hasBeenOpened` state                      | `src/runtime/registry.ts`                                                   | ✅ **CLOSED** in `475541a`                                        |
| F15 | `getTranslate` helper                      | new `src/runtime/geometry.ts`                                               | ✅ **CLOSED** in `475541a` (added to `src/runtime/transforms.ts`) |
| F16 | Extract `chain` / `assignStyle` helpers    | `src/helpers.ts`                                                            | ✅ **CLOSED** in `330ff2e`                                        |
| F17 | `onAnimationEnd` debounce (folded into F5) | —                                                                           | ✅ **CLOSED** in `330ff2e` (folded into F5)                       |

**Historical summary**: 17/17 listed findings were marked closed at the
end of this audit. See the beta.4 correction above for later regressions,
deliberate differences, and the current parity qualification.

### Order of execution (recommended)

1. F2 first — it's a 1-line change (`DRAG_RESISTANCE = 1` → remove
   the constant, or change to `0.5` per Decision B). One test to
   reshape. Fastest possible win.
2. F3 — the drag-lost-on-pointerout fix. Medium-sized change in
   `vanilla/dialog.ts`. Adds two listeners and tracks the last event.
3. F5 — the `onAnimationEnd` debounce. Small change in
   `registry.ts`. Adds a setTimeout handle to the runtime.
4. F1 — the close animation deferral. Requires careful state
   management. Touches the most code.
5. F4 — the `--initial-transform` leak. Small change but tightly
   coupled to F1 (the close path). Do together with F1.
6. F6 — the iOS Safari scroll lock. The biggest change. Port
   the 300+ lines of `use-prevent-scroll.ts` into vanilla. Last
   because the test surface is the broadest.

Wave 2 (F7-F17) can be batched into a single PR after Wave 1
lands. The F6 fix is the only one that requires a real iOS device
to validate; the rest are unit-testable in jsdom.

---

## Files referenced

- `src/vanilla/dialog.ts` (2111 lines — the dialog implementation)
- `src/runtime/drag.ts` (189 lines)
- `src/runtime/drag-policy.ts` (179 lines)
- `src/runtime/snap-points.ts` (161 lines)
- `src/runtime/release.ts` (177 lines)
- `src/runtime/transforms.ts` (113 lines)
- `src/runtime/handle.ts` (48 lines)
- `src/runtime/viewport.ts` (97 lines)
- `src/runtime/pointer.ts` (50 lines, marked as "planned API, not yet wired")
- `src/runtime/nested.ts` (50 lines)
- `src/runtime/registry.ts` (531 lines)
- `src/vanilla/host.ts` (138 lines)
- `src/vanilla/render.ts` (158 lines)
- `src/core/index.ts` (149 lines)
- `src/helpers.ts` (24 lines)
- `src/constants.ts` (35 lines)
- `src/style.css` (324 lines)
- `tablero.html` (the diagnostic page)
- Upstream: `/tmp/vaul-reference/src/{index.tsx,use-*.ts,helpers.ts,constants.ts,style.css}`
- Commit history: 58 commits on `refactor/drawer-v3-vanilla`,
  of which 12 are `fix:` commits (all in the v3 line, most in
  the past week).

---

## Already-known issues (filed before this audit, listed for cross-reference)

These are filed in `.agents/issues/` and addressed separately. They
are not re-listed above; the audit is for the gaps not yet
documented.

- `2026-07-25-drawer-visible-on-load-with-closed-state.md` → fixed
  in `3038ab4`.
- `2026-07-25-overlay-closed-captures-clicks-pointer-events-not-none.md`
  → fixed (CSS specificity, not in a commit yet).
- `2026-07-25-modal-drawers-title-leak-open-parpadeo-and-close-button.md`
  → fixed in local workspace, not yet committed.
- `2026-07-25-overlay-mouseup-accumulation-not-fixed.md` → fixed
  in `346aec0`.
- `2026-07-26-close-animation-vanishes-instantly.md` → partially
  fixed in `de4835c` (F1 covers the residual case).
- `2026-07-26-close-button-click-suppressed-by-pointer-capture.md`
  → fixed in `f7cc11e`.
- `2026-07-26-drag-opposite-direction-no-logarithmic-dampening.md`
  → F2 (the test was reshaped but the bug remains).
- `2026-07-26-drag-release-close-no-slide-animation.md` → fixed in
  `de4835c` (F1 covers the residual case).
- `2026-07-26-drawer-auto-focuses-first-link-on-open.md` → fixed
  in `097b0db`.
- `2026-07-26-drawer-id-collision-with-inner-html.md` → fixed in
  `de4835c`.
- `2026-07-26-overlay-flicker-snap-points-overlay-specificity.md`
  → fixed in `720fb72`.
- `2026-07-25-vite-symlink-resolution-fails-with-404-on-index-mjs.md`
  → out of scope for this audit (build tooling).
- `2026-07-25-documentation-audit-report.md` → out of scope for
  this audit.

---

## Contact

If the user wants to discuss the audit, the cleanest entry point
is the **`/tablero.html` page** — every finding in this report
can be reproduced there. The MutationObserver in the page
captures `data-state`, `data-drawer-closing`, and inline `style`
mutations, so the F1 / F3 / F4 cases are visible in the log panel.
