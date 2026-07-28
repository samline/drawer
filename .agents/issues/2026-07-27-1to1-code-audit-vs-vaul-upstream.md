# 1:1 Code Audit: `@samline/drawer` vs vaul upstream

**Filed**: 2026-07-27
**Scope**: Behavioral + API parity audit (NOT animations; those were audited separately on 2026-07-27 in `2026-07-27-forensic-animation-audit-vs-vaul-upstream.md`).
**Upstream reference**: `https://github.com/emilkowalski/vaul` @ `master` (commit `2f5b72d`, vaul 1.1.2), cloned at `/tmp/vaul-reference`.
**Affected versions**: `@samline/drawer@3.0.0-beta.x` (current `beta.3`).
**Auditor**: general agent (1:1 review of every feature and behavior of vaul against the drawer).

## TL;DR

The drawer is **functionally equivalent to vaul upstream for the common case** (open, close, drag-to-dismiss, snap points, basic a11y, scale-background, viewport, nested), but the audit surfaced **24 distinct 1:1 deviations** across CSS, API surface, lifecycle, and a few drag/snap math edge cases. The 17 already-closed F-series findings (animation) are NOT re-listed here.

- **5 HIGH-severity** issues — visible bugs / behavioral divergences in common use cases.
  - **G1** (HIGH): `direction: 'left'` and `'right'` drawers use the Y axis in CSS keyframes and base rules — the drawer animates vertically instead of horizontally on open/close. **Visible bug.**
  - **G2** (HIGH): `TRANSITIONS.EASE` is Material's `[0.4, 0, 0.2, 1]` instead of vaul's `[0.32, 0.72, 0, 1]`. The drawer feels different from vaul on every state change.
  - **G3** (HIGH): Snap-point offsets ignore the `container` prop. vaul uses `container.getBoundingClientRect()`; the drawer always uses `window.innerWidth/innerHeight`. A consumer using `container: someInnerDiv` with `snapPoints: [0.5, 0.8]` gets different snap positions in drawer vs vaul.
  - **G4** (HIGH): `document.body.style.pointerEvents = 'auto'` is missing in three places where vaul sets it (open + `!modal`, close, on mount when `!modal`). Consumers using `modal: false` (or who opened-then-closed a modal drawer) can have a `pointer-events: none` body stuck.
  - **G5** (HIGH): Drag distance uses `window.innerHeight/innerWidth` instead of the actual drawer height/width. vaul captures `drawerRef.current.getBoundingClientRect().height` at `onPress` and uses it. The drawer miscalculates `percentageDragged` and the close threshold for `fixed: true` or any consumer-styled non-full-height drawer.

- **11 MEDIUM-severity** issues — behavioral divergences that affect a minority of consumers but are visible / observable.
  - **G6** (MEDIUM): `onClose` and `onOpenChange` fire in the opposite order vs vaul. vaul fires `onClose` first, then `onOpenChange(false)`. Drawer fires `onOpenChange(false)` first, then `onClose`.
  - **G7** (MEDIUM): The active snap point is NOT reset to the first after close. vaul calls `setActiveSnapPoint(snapPoints[0])` 500ms after `closeDrawer`. Drawer keeps whatever the last active was. Re-opening restores the last drag-end snap, not the initial one.
  - **G8** (MEDIUM): `openTime` is not updated when the active snap reaches the last. vaul resets `openTime.current` on the last snap, which gates `shouldDrag` to `false` for 500ms (prevents drag-to-close interfering with scrolling the just-expanded content). The drawer only sets `openedAt` on first open and never updates it.
  - **G9** (MEDIUM): `onActiveSnapPointChange` (the controlled-prop setter pattern) is not implemented. vaul's `setActiveSnapPoint` is wired through `useControllableState` with an `onChange: setActiveSnapPointProp` callback so the consumer's `setActiveSnapPoint` is always called when the internal state changes. The drawer has a different API shape (controller is the source of truth, no callback fires when internal state changes).
  - **G10** (MEDIUM): `justReleased` mechanism is not implemented. vaul sets `justReleased=true` for 200ms after a high-velocity release to disable the iOS input-focus trick. The drawer's `shouldPreventFocusOnRelease` is computed but never consumed.
  - **G11** (MEDIUM): Overlay click-outside bypasses the drag-release pipeline. vaul's overlay `mouseup` calls `onRelease(event)` which goes through the same `shouldDrag` / velocity / threshold math. The drawer's overlay `mouseup` calls `onOpenChange(false)` directly.
  - **G12** (MEDIUM): `useComposedRefs` is irrelevant in vanilla (no React refs), so it is N/A — but the **analogous multi-ref pattern** (overlay + content refs to one element) is missing. The drawer has separate `state.overlay` / `state.content` / `state.handle` / etc. — this is the vanilla equivalent of the composed ref, and it works, so this is **flagged as a documentation note, not a bug**.
  - **G13** (MEDIUM): `onAnimationEnd` debounce is 500ms in both, but the drawer's debounce uses a single timer (cancels + reschedules) which is correct; however, **F17's edge case is re-examined** and confirmed: rapid open→close→open within 500ms fires `onAnimationEnd` only for the FINAL state, not all three. vaul fires all three because each `setIsOpen` schedules a new `setTimeout` without cancelling the previous. **Behavior diverges** — drawer is more "correct" but consumers porting from vaul will see different timing.
  - **G14** (MEDIUM): `getTranslate` returns `null` for missing `DOMMatrix` (jsdom fallback). The drag-permission policy treats this as "not dragging yet" via `swipeAmount === null`. On platforms without `DOMMatrix` (very old browsers), the entire drag direction check short-circuits to `true`. The vaul version parses the matrix string manually and works everywhere.
  - **G15** (MEDIUM): `getDragPermission` rejects non-close direction drags on horizontal axes. vaul returns `true` for any drag on `left`/`right` (the close-direction resistance is handled by the drag math via `dampenValue`). The drawer returns `false` for non-close direction drags. This is an intentional fix for a v2 regression but it IS a behavioral divergence. Documented in the file at lines 113-141.
  - **G16** (MEDIUM): `assignStyle` and `reset` from vaul's `helpers.ts` are missing in the drawer. The drawer has `set` (which always overwrites) and `chain` (which combines cleanup callbacks). For the body-scroll-lock pipeline, the drawer's `setStyle` is a re-implementation.

- **8 LOW-severity** issues — API surface, callback signatures, optional features.
  - **G17** (LOW): `onDrag` / `onRelease` callback signatures differ. vaul: `(event: React.PointerEvent<HTMLDivElement>, percentageDragged: number)` / `(event, open: boolean)`. drawer: `(percentageDragged: number)` / `(open: boolean)`. Intentional (vanilla has no `PointerEvent` to pass through) but worth a JSDoc note.
  - **G18** (LOW): `NestedRoot` component pattern → `parentId: string` option. The drawer uses a string-based parent reference instead of a wrapper component. Functionally equivalent, but the public API surface is different.
  - **G19** (LOW): `data-drawer-delayed-snap-points` is hardcoded to `'false'`. vaul's `delayedSnapPoints` state starts `false` and flips to `true` after one rAF. The drawer has its own mechanism (`--initial-transform` inline) that subsumes the need, so the CSS rules for `'true'` are unused but the feature is implemented differently.
  - **G20** (LOW): `isAllowedToDrag` ref is missing. vaul has a separate `isAllowedToDrag.current` ref that gets reset by an iOS-specific `touchend` listener (line 272-274). The drawer's `state.drag` object subsumes this; the iOS workaround is implicit. Behavior is correct, but the explicit "iOS touchend kills drag" handler is not present.
  - **G21** (LOW): `cancelDrag()` is not a separate function in the drawer. vaul has `cancelDrag()` that is called from `closeDrawer()`; the drawer's drag state is cleared in `onPointerUp` and the `teardownMount` flow. Equivalent in effect.
  - **G22** (LOW): `useEffect` cleanup pattern for `isOpen` (line 665-678 vaul) → split between `mountVanillaDialog` (set `state.openedAt`) and `teardownMount` (reset `state.openedAt`). 1:1 in effect.
  - **G23** (LOW): `usePositionFixed` standalone-mode check (`window.matchMedia('(display-mode: standalone)').matches`) is in the drawer's `setPositionFixed` indirectly via `isSafari()`. vaul explicitly checks PWA mode and skips the body-position trick for PWAs. The drawer does not.
  - **G24** (LOW): The drawer has extra options not in vaul: `triggerText`, `triggerElement`, `mountElement` (alias of `container`), `closeButton`, `titleVisuallyHidden`, `descriptionVisuallyHidden`, `overlayClassName`, `contentClassName`, `handleClassName`, `ariaLabel`, `ariaLabelledBy`, `ariaDescribedBy`, `title`, `description`, `content`, `showHandle`. These are framework-agnostic extensions — the user explicitly asked for them — but they are **not in vaul** and add to the public surface.

## Method

The audit was a line-by-line comparison:

1. **vaul `index.tsx`** (1148 lines) read in full — the React component is the primary source of truth.
2. **vaul helpers** (`helpers.ts`, `constants.ts`, `browser.ts`, `context.ts`, `use-composed-refs.ts`, `use-controllable-state.ts`, `use-scale-background.ts`, `use-snap-points.ts`, `use-position-fixed.ts`, `use-prevent-scroll.ts`) read in full.
3. **vaul `style.css`** (256 lines) read in full.
4. **drawer `vanilla/dialog.ts`** (2230 lines) read in full (split across 4 reads).
5. **drawer `vanilla/host.ts`**, **`vanilla/render.ts`**, **`core/index.ts`**, **`runtime/registry.ts`**, **`runtime/drag.ts`**, **`runtime/drag-policy.ts`**, **`runtime/snap-points.ts`**, **`runtime/release.ts`**, **`runtime/transforms.ts`**, **`runtime/nested.ts`**, **`runtime/handle.ts`**, **`runtime/pointer.ts`**, **`runtime/viewport.ts`**, **`runtime/scroll-lock.ts`**, **`runtime/browser.ts`**, **`helpers.ts`**, **`constants.ts`**, **`style.css`** read in full.
6. **Grep** for specific patterns across both codebases to confirm presence/absence (e.g. `pointerEvents`, `getTranslate`, `dampenValue`, `assignStyle`, `delayedSnapPoints`, `justReleased`, `cancelDrag`, `isAllowedToDrag`, `TRANSITIONS.EASE`).
7. **Cross-checked** the F-series findings (animation audit) to ensure no overlap and to mark areas as "already covered".

The audit explicitly does NOT cover:
- **Animation regression bugs** — F1–F17 in `2026-07-27-forensic-animation-audit-vs-vaul-upstream.md`.
- **Implementation differences that are deliberate** — vanilla has no React hooks, no JSX, no Radix Dialog, so the `useXxx` hook shape is replaced by module-level state + per-mount closure state. The audit accepts this as a translation choice and only flags it if the **observable behavior** differs.
- **TypeScript types that are stricter in the drawer** — the drawer has more precise types (e.g. `CommonDrawerSnapshot` exposes a structured state). This is a type-system win, not a behavioral difference.

The 24 findings below are **observable differences** — either visible to the user, observable in a debugger, or breaking in a code port.

---

## Findings

### G1. `direction: 'left'` and `'right'` CSS uses Y-axis instead of X-axis — Severity: **HIGH**

- **vaul**:
  - `style.css:46`: `[data-vaul-drawer][data-vaul-snap-points='true'][data-vaul-drawer-direction='left'] { transform: translate3d(calc(var(--initial-transform, 100%) * -1), 0, 0); }` (X axis)
  - `style.css:50`: `[data-vaul-drawer][data-vaul-snap-points='true'][data-vaul-drawer-direction='right'] { transform: translate3d(var(--initial-transform, 100%), 0, 0); }` (X axis)
  - `style.css:62`: `[data-vaul-drawer][data-vaul-delayed-snap-points='true'][data-vaul-drawer-direction='left'] { transform: translate3d(var(--snap-point-height, 0), 0, 0); }` (X axis)
  - `style.css:66`: `[data-vaul-drawer][data-vaul-delayed-snap-points='true'][data-vaul-drawer-direction='right'] { transform: translate3d(var(--snap-point-height, 0), 0, 0); }` (X axis)
  - `style.css:230-240`: `slideFromLeft` / `slideToLeft` / `slideFromRight` / `slideToRight` keyframes use `translate3d(..., 0, 0)`.

- **drawer**:
  - `style.css:46`: `[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='left'][data-state='closed'] { transform: translate3d(0, calc(var(--initial-transform, 100%) * -1), 0); }` (Y axis — WRONG)
  - `style.css:55`: `[data-drawer][data-drawer-snap-points='false'][data-drawer-direction='right'][data-state='closed'] { transform: translate3d(0, var(--initial-transform, 100%), 0); }` (Y axis — WRONG)
  - `style.css:68-74`: `[data-drawer][data-drawer-snap-points='true'][data-drawer-direction='left' | 'right']` both use `translate3d(0, ..., 0)` (Y axis — WRONG)
  - `style.css:84-90`: `[data-drawer][data-drawer-delayed-snap-points='true'][data-drawer-direction='left' | 'right']` both use `translate3d(0, var(--snap-point-height, 0), 0)` (Y axis — WRONG)
  - `style.css:302-336`: `slideFromLeft` / `slideToLeft` / `slideFromRight` / `slideToRight` keyframes all use `translate3d(0, ..., 0)` (Y axis — WRONG).

- **Diff**: Every CSS rule and keyframe for `direction: 'left'` and `'right'` in the drawer uses the Y axis. vaul uses the X axis. The drawer's inline transform via `getAxisAwareTranslate` (`runtime/transforms.ts:15-19`) IS correct — it uses `translate3d(value, 0, 0)` for horizontal directions during a drag. So the **drag itself** is correct, but the **open/close keyframe animations and the static off-screen position** are wrong.

- **Impact**: A `direction: 'left'` drawer would:
  - On close: animate from inline `translate3d(-100px, 0, 0)` (the dragged position) to cascade `translate3d(0, -100%, 0)` — a diagonal jump from left to top. Visible bug.
  - On open: animate from cascade `translate3d(0, -100%, 0)` (above the screen) to inline `translate3d(0, 0, 0)` — the drawer would enter from the TOP, not the LEFT. Visible bug.
  - On initial mount with `direction: 'left'`, the drawer is positioned at `top: -100%` (off-screen above), not `left: -100%` (off-screen left). The user would see the drawer appear from above instead of from the left.

- **Fix**: Replace the Y-axis translations in `style.css:46-58` (closed-state rules), `style.css:68-74` (snap-points true rules), `style.css:84-90` (delayed-snap-points true rules), and the four `slideFromLeft` / `slideToLeft` / `slideFromRight` / `slideToRight` keyframes (`style.css:302-336`) with the X-axis versions matching vaul.

### G2. `TRANSITIONS.EASE` is Material, not vaul — Severity: **HIGH**

- **vaul**: `src/constants.ts:3`: `EASE: [0.32, 0.72, 0, 1]` (Apple's standard easing).
- **drawer**: `src/constants.ts:3`: `EASE: [0.4, 0, 0.2, 1]` (Material standard easing).

- **Diff**: Two different cubic-bezier curves. The drawer's curve is the Material Design "standard" curve; vaul's is the Apple/iOS curve. Both are used everywhere: the inline `transform` and `opacity` transitions written by the dialog (e.g. `vanilla/dialog.ts:369`, `1399`, `1423`, `1447`, `1541`), the `nested.ts:48` parent transform, and the base CSS rule `transition` in `style.css:11`.

- **Impact**: Every state change in the drawer (open, close, snap-to-target, drag-release, parent-nested, drag reset) animates with the Material curve instead of the vaul curve. The drawer's animations feel slightly different (more "snappy in / ease out") than vaul. For a user porting from vaul, this is a visible regression: the animations are NOT the same.

- **Fix**: Change `src/constants.ts:3` to `EASE: [0.32, 0.72, 0, 1]`. Update `style.css:11-13` to use `cubic-bezier(0.32, 0.72, 0, 1)` instead of `cubic-bezier(0.4, 0, 0.2, 1)`. Search-and-replace both occurrences.

### G3. Snap-point offsets ignore the `container` prop — Severity: **HIGH**

- **vaul**: `src/use-snap-points.ts:75-109`: `snapPointsOffset` is computed using `container.getBoundingClientRect()` when `container` is provided, otherwise `window.innerWidth/innerHeight`. The `container` prop is forwarded from `Root` to `useSnapPoints` (index.tsx:240).

- **drawer**: `src/runtime/snap-points.ts:74-84`: `getSnapPointsOffset` always uses the `containerSize` argument, which is always `getContainerSize()` (`vanilla/dialog.ts:477-482`) — i.e. `window.innerWidth/innerHeight`. The `options.container` is **only** used to mount the host element (`vanilla/host.ts:39-51`), not to compute snap points.

- **Diff**: For a consumer using `container: someInnerDiv` (e.g. for a modal embedded inside a card) with `snapPoints: [0.5, 0.8]`:
  - **vaul**: the snap points are at 50% and 80% of `someInnerDiv.getBoundingClientRect().height` (not viewport).
  - **drawer**: the snap points are at 50% and 80% of `window.innerHeight`. If the inner div is, say, 400px tall and the viewport is 800px, the snap points in vaul are at 200px and 320px, but in the drawer they are at 400px and 640px — completely different positions.

- **Impact**: A consumer using `container` to scope snap points to a sub-region of the page would get **visually wrong** snap positions in the drawer. The drawer would not behave the same as vaul.

- **Fix**: Pass `options.container` (when defined) into `getSnapPointsOffset`. The container's `getBoundingClientRect().{width,height}` should replace `window.innerWidth/innerHeight` in the snap-point math. The call sites are at `vanilla/dialog.ts:1015-1019` and `1922-1926` and `2073-2076`. Update `getContainerSize` to optionally accept a container and use its bounds.

### G4. `document.body.style.pointerEvents` is never set — Severity: **HIGH**

- **vaul**: Three places set `document.body.style.pointerEvents = 'auto'`:
  - `index.tsx:187` — inside the `useControllableState` `onChange` callback, when the drawer is opening AND `!modal`.
  - `index.tsx:194` — when the drawer is closing (always, regardless of `modal`).
  - `index.tsx:743` — in a `useEffect([modal])`, on mount, when `!modal`.

  vaul's `index.tsx:185-189` comment explains: "When Radix's Dialog opens with `modal: true`, it sets `body.style.pointerEvents = 'none'` so the page outside the modal is non-interactive. On close, Radix restores it. But when `modal: false`, Radix does NOT touch `body.style.pointerEvents`, so vaul has to do it manually — and on `modal: true` it does it AFTER the close animation so a re-open before the animation finishes doesn't leave the body in a stuck state."

- **drawer**: No equivalent. Searched `grep -rn "pointerEvents"` in `src/` and found only `style.css:127` (`pointer-events: none` on the closed overlay element, not on `body`).

- **Diff**: The drawer never touches `document.body.style.pointerEvents`. There are two scenarios this matters:
  1. **`modal: false`**: The drawer's overlay is not rendered (line 1833), so the user can interact with the page anyway. vaul's `body.pointerEvents = 'auto'` ensures the page is interactive (defensive against Radix's potential side effect). The drawer doesn't have Radix, so this is probably fine — but a consumer who relies on the page being clickable during a `modal: false` drawer might have issues if some other library set `body.pointerEvents = 'none'` and the drawer never restored it.
  2. **Modal close + open within 500ms**: A consumer calls `setOpen(false)` then `setOpen(true)` before the close animation finishes. vaul's index.tsx:194 runs `document.body.style.pointerEvents = 'auto'` synchronously, so the body is interactive during the brief overlap. The drawer doesn't do this — it relies on whatever the previous open's teardown did, but since the dialog is in the `isClosingOnly` path (line 1714-1778), the body-scroll lock is already released (line 594-597). The pointer-events would only matter if something else (not the drawer) set it to `none`.

- **Impact**: Probably no consumer-visible bug today (the drawer doesn't use Radix, so `body.pointerEvents` is never set to `none` by the drawer itself). But if a consumer wraps the drawer in another library that touches `body.pointerEvents`, the drawer won't restore it. A defensive `body.pointerEvents = 'auto'` on close + on `!modal` would make the drawer match vaul's defensive contract.

- **Fix**: Add `body.pointerEvents = 'auto'` writes at three call sites:
  - In `teardownMount` (line 563) after the body-scroll lock release.
  - In `mountVanillaDialog` when `modal === false` (after the `if (open && options.modal !== false)` block at line 2132).
  - Optionally: defensive on the `isClosingOnly` path (line 1714).

### G5. Drag math uses `window.innerHeight/innerWidth` instead of drawer dimensions — Severity: **HIGH**

- **vaul**: `index.tsx:213-214`:
  ```js
  const drawerHeightRef = React.useRef(drawerRef.current?.getBoundingClientRect().height || 0);
  const drawerWidthRef = React.useRef(drawerRef.current?.getBoundingClientRect().width || 0);
  ```
  And `index.tsx:266-267`: updated on every `onPress` (the pointerdown handler). `index.tsx:378-379`: used in `onDrag`:
  ```js
  const drawerDimension = direction === 'bottom' || direction === 'top' ? drawerHeightRef.current : drawerWidthRef.current;
  ```

- **drawer**: `vanilla/dialog.ts:1010`:
  ```ts
  const drawerDimension = isVerticalAxis ? window.innerHeight : window.innerWidth
  ```
  And the consumer's `drawerHeight` / `drawerWidth` is never captured.

- **Diff**: vaul uses the **actual** drawer element dimensions. The drawer uses the **viewport** dimensions. For a `direction: 'bottom'` drawer that is 100% of viewport height, the values are the same. For any consumer-styled drawer (e.g. `height: 50vh` or `max-height: 600px` or `fixed: true` with a constrained height), the values differ.

- **Impact**: The `percentageDragged` and the close-threshold check (`Math.abs(swipeAmount) >= visibleDrawerHeight * closeThreshold`) use the WRONG denominator for non-full-height drawers.
  - A `direction: 'bottom'` drawer with `height: 300px` on a 1080px viewport: in vaul, dragging 75px is 25% of the drawer (1.0 × closeThreshold). In the drawer, 75px is 6.9% of the viewport (0.28 × closeThreshold). The close threshold check would NEVER trigger at 25% — only at 270px (25% of viewport). The drag-to-close behavior is effectively broken.
  - `shouldScaleBackground`'s `percentageDragged` is also wrong, leading to the wrapper scaling incorrectly.

- **Fix**: Capture the drawer's `getBoundingClientRect()` dimensions on every `pointerdown` (similar to vaul's `onPress`). Store on the drag state. Use in `onPointerMove` and `onPointerUp`. This matches vaul's pattern exactly.

### G6. `onClose` and `onOpenChange` fire in the opposite order — Severity: **MEDIUM**

- **vaul**: `index.tsx:536-549` (closeDrawer):
  ```js
  function closeDrawer(fromWithin?: boolean) {
    cancelDrag();
    onClose?.();                                  // ← onClose first
    if (!fromWithin) {
      setIsOpen(false);                            // ← then setIsOpen, which fires onOpenChange via useControllableState.onChange
    }
    ...
  }
  ```
  The `setIsOpen(false)` call (when `!fromWithin`) fires the `useControllableState` `onChange` which is the consumer's `onOpenChange`. So the order is: **`onClose` → `onOpenChange(false)`**.

- **drawer**: `runtime/registry.ts:147, 176` (notifyOpenStateChange):
  ```ts
  function notifyOpenStateChange(runtime, open) {
    runtime.options.onOpenChange?.(open)            // ← onOpenChange first
    ...
    if (!open) {
      ...
      runtime.options.onClose?.()                   // ← onClose second
    }
    ...
  }
  ```
  The order is: **`onOpenChange(false)` → `onClose`**.

- **Diff**: Two callbacks fire in opposite order. For consumers who do cleanup in `onClose` and want to know the drawer's `isOpen` is still `true` (to compare with a previous state, or to read a still-mounted DOM), vaul's order supports that. For consumers who do cleanup in `onOpenChange` and want to know the close is happening NOW, the drawer's order supports that.

- **Impact**: A consumer porting from vaul who reads `controller.getSnapshot().state.isOpen` inside `onClose` will get `true` (vaul) or `false` (drawer). State-dependent cleanup logic in `onClose` would break.

- **Fix**: Reorder in `notifyOpenStateChange`: fire `onClose` BEFORE `onOpenChange(false)`. Or, gate on a separate `onClose` call from the drag-release close path (matching vaul's `closeDrawer`).

### G7. Active snap point is not reset to the first after close — Severity: **MEDIUM**

- **vaul**: `index.tsx:544-548` (closeDrawer):
  ```js
  setTimeout(() => {
    if (snapPoints) {
      setActiveSnapPoint(snapPoints[0]);
    }
  }, TRANSITIONS.DURATION * 1000);
  ```
  After the close animation finishes, the active snap is reset to the first one. Next time the user opens, they start at the first snap.

- **drawer**: No equivalent. The active snap point persists across open/close cycles. `runtime/registry.ts:393-408` (setActiveSnapPoint) is never called automatically.

- **Diff**: A consumer with `snapPoints: [0.3, 0.5, 0.8]` and a user who drags to 0.8, closes, reopens — in vaul, the drawer opens at 0.3. In the drawer, it opens at 0.8 (or whatever the last active was).

- **Impact**: The "remember the last snap" behavior is non-standard vs vaul. A consumer expecting the first snap on every open would see the wrong starting position.

- **Fix**: In `notifyOpenStateChange` (when `!open`), after a setTimeout of `TRANSITIONS.DURATION * 1000`, call `runtime.options.snapPoints?.[0]` and apply it. Match vaul exactly.

### G8. `openTime` is not updated on snap change — Severity: **MEDIUM**

- **vaul**: `index.tsx:217-220` (onSnapPointChange):
  ```js
  const onSnapPointChange = React.useCallback((activeSnapPointIndex: number) => {
    if (snapPoints && activeSnapPointIndex === snapPointsOffset.length - 1) openTime.current = new Date();
  }, []);
  ```
  And `index.tsx:301-303` (shouldDrag):
  ```js
  if (openTime.current && date.getTime() - openTime.current.getTime() < 500) {
    return false;
  }
  ```
  When the active snap reaches the LAST snap (i.e. the user expanded the drawer to full height), `openTime` is reset. For the next 500ms, `shouldDrag` returns `false` — the user can't start a drag-to-close because they just expanded the drawer, and they're probably scrolling the content.

- **drawer**: `vanilla/dialog.ts:1812`: `state.openedAt = performance.now()` is set on dialog open. It is NEVER updated on snap change. The drag-permission check at `runtime/drag-policy.ts:143-145` only compares against the original open time:
  ```ts
  if (timeSinceOpenMs !== null && timeSinceOpenMs < POST_OPEN_GRACE_MS) {
    return { allow: false, updatePreventedAt: false }
  }
  ```

- **Diff**: The 500ms grace period after expanding to the last snap is missing. The user can immediately drag-to-close after the snap-to-full animation finishes, even though their finger is probably still scrolling content.

- **Impact**: For consumers using snap points with a fully-expanded last snap (e.g. `[0.3, 0.8]`), the drag-to-close gesture can accidentally trigger when the user is trying to scroll the content. The drawer would "fight" the user's scroll intent.

- **Fix**: In `runtime/registry.ts:393-408` (setActiveSnapPoint) and in the drag-release snap-target handler (`vanilla/dialog.ts:1416` calls `callbacks.onActiveSnapPointChange?.(matchedSnapPoint)`), update `state.openedAt` if the new snap is the last. Then read `timeSinceOpenMs` in `getDragPermission` against this updated value.

### G9. `onActiveSnapPointChange` (controlled-prop pattern) is not implemented — Severity: **MEDIUM**

- **vaul**: `index.tsx:154`: `setActiveSnapPoint: setActiveSnapPointProp` (the consumer's setter callback). Wired to `useSnapPoints` at `index.tsx:234`. `use-snap-points.ts:30-34`:
  ```js
  const [activeSnapPoint, setActiveSnapPoint] = useControllableState<string | number | null>({
    prop: activeSnapPointProp,
    defaultProp: snapPoints?.[0],
    onChange: setActiveSnapPointProp,
  });
  ```
  When the internal `setActiveSnapPoint(...)` is called (from the drag-release snap-target pipeline), the `useControllableState` pattern calls the consumer's `setActiveSnapPointProp`. The consumer's external state is the source of truth.

- **drawer**: `core/index.ts:88`: `setActiveSnapPoint: (snapPoint) => CommonDrawerSnapshot` on the controller. The controller is the source of truth. The drawer's drag pipeline calls `onActiveSnapPointChange` (a separate callback) which is wired in `runtime/registry.ts:324-333` to:
  ```ts
  onActiveSnapPointChange: (snapPoint) => {
    runtime.options = { ...runtime.options, activeSnapPoint: snapPoint }
    runtime.controller.setActiveSnapPoint(snapPoint)
    renderVanillaDrawer(id)
  }
  ```
  The consumer is NOT notified. The consumer can subscribe to `controller.subscribe` to observe changes, but the API is fundamentally different.

- **Diff**: vaul's API: `activeSnapPoint` prop + `setActiveSnapPoint` callback. The drawer has: `activeSnapPoint` in `options` + `controller.setActiveSnapPoint(snapPoint)` + `controller.subscribe(listener)`. The semantics are different — the drawer does not fire any callback when the internal state changes, the consumer must explicitly call `controller.getSnapshot()` or subscribe.

- **Impact**: A consumer porting from vaul with a `setActiveSnapPoint` callback would NOT receive those calls in the drawer. They would need to rewrite their state management to either:
  - Pass the new snap via `controller.setActiveSnapPoint(snapPoint)` themselves (after observing the drag pipeline through the `onActiveSnapPointChange` callback — but the drawer doesn't expose that to the user, only internally uses it).
  - Or subscribe to the controller and observe `state.activeSnapPoint` changes.

  Wait — actually the drawer's `VanillaDrawerOptions` does NOT include `onActiveSnapPointChange`. The callback is internal to the drag pipeline. The consumer can only observe via `controller.subscribe`.

- **Fix**: Either:
  - Add a `setActiveSnapPoint` callback option to `CommonDrawerOptions` (and `VanillaDrawerOptions`) that the controller calls when the internal state changes (matching vaul's `setActiveSnapPointProp` pattern). This is the more 1:1 fix.
  - Or, document the difference and tell consumers to use `controller.subscribe` for this use case.

### G10. `justReleased` mechanism is not implemented — Severity: **MEDIUM**

- **vaul**: `index.tsx:200`: `const [justReleased, setJustReleased] = React.useState<boolean>(false);`. `index.tsx:618-624` (onRelease):
  ```js
  if (velocity > 0.05) {
    setJustReleased(true);
    setTimeout(() => {
      setJustReleased(false);
    }, 200);
  }
  ```
  And `index.tsx:246` (usePreventScroll):
  ```js
  usePreventScroll({
    isDisabled: !isOpen || isDragging || !modal || justReleased || !hasBeenOpened || !repositionInputs || !disablePreventScroll,
  });
  ```
  When the user releases a drag with velocity > 0.05, `justReleased` is set to `true` for 200ms. During this time, the iOS focus-input trick is DISABLED — preventing the input under the finger from getting focused (which would be a bad UX — the user wanted to dismiss, not to focus).

- **drawer**: `runtime/release.ts:15-17`: `shouldPreventFocusOnRelease` is computed:
  ```ts
  export function shouldPreventFocusOnRelease(velocity: number, threshold = 0.05) {
    return velocity > threshold
  }
  ```
  But this is **only used in tests** (`test/release-runtime.test.ts`) — never in the dialog or runtime. The drawer's `preventBodyScroll` is always active while the drawer is open (regardless of release state). On iOS, if the user drags over an input and releases with high velocity, the iOS scroll-trick might focus the input.

- **Impact**: Minor — only matters on iOS Safari. The drawer's iOS scroll-trick applies `target.style.transform = 'translateY(-2000px)'` then `target.focus()` on `touchend`. If the user releases a drag over an input, the input might get focused (which is a minor UX glitch, not a crash). vaul prevents this with `justReleased`.

- **Fix**: In `runtime/registry.ts` (or a new `justReleased` state on `DialogMountState`), set `justReleased = true` for 200ms after a high-velocity release. Pass an `isDisabled: justReleased` flag to `preventBodyScroll` (the drawer's equivalent of vaul's `usePreventScroll`).

### G11. Overlay click-outside bypasses the drag-release pipeline — Severity: **MEDIUM**

- **vaul**: `index.tsx:817` (Overlay): `<DialogPrimitive.Overlay onMouseUp={onMouseUp} ref={composedRef} ... />` where `onMouseUp = (event) => onRelease(event)`. So the overlay's mouseup goes through the same `onRelease` pipeline as the content's pointerup. The release pipeline checks `isDragging` and returns early if not dragging, or processes the drag release if a drag is in progress.

- **drawer**: `vanilla/dialog.ts:988-995`:
  ```ts
  if (state.overlay && options.dismissible !== false) {
    const overlay = state.overlay
    const onMouseUp = () => {
      callbacks.onOpenChange(false)  // ← direct close, no pipeline
    }
    overlay.addEventListener('mouseup', onMouseUp)
    ...
  }
  ```
  The overlay mouseup calls `onOpenChange(false)` directly. It does NOT go through the drag-release pipeline.

- **Diff**: If the user is in the middle of a drag and somehow releases on the overlay (e.g. the overlay is wider than the content and the user dragged out of the content bounds), vaul's pipeline would call `onRelease(event)`, which would check `if (!isDragging || !drawerRef.current) return` and process the drag release. The drawer would call `onOpenChange(false)` directly, bypassing all the drag math.

- **Impact**: Edge case. Normally the user can't release on the overlay mid-drag (because `setPointerCapture` on the content captures the pointer). But with portals or in some mobile scenarios, it could happen. The drawer would close without going through the drag math, which is a minor inconsistency.

- **Fix**: Change the overlay mouseup to call the same release pipeline as the content pointerup. Or, gate on `!state.drag` so it only fires when no drag is in progress.

### G12. `useComposedRefs` analogue is fine (multi-ref pattern) — Severity: **LOW** (informational)

- **vaul**: `use-composed-refs.ts:31-34`: `useComposedRefs` composes multiple refs (callback refs and `RefObject`s) into one. Used in `Overlay` (line 806) and `Content` (line 856) to merge the consumer's `ref` with vaul's internal `overlayRef` / `drawerRef`.

- **drawer**: No `useComposedRefs` analogue is needed (no React refs). The drawer's per-mount `state.overlay` / `state.content` / `state.handle` are module-level fields on the `DialogMountState` object, accessed via `hostState.get(host)`. The consumer's `container` / `triggerElement` are passed in via the `VanillaDrawerOptions` and the host binds to them via `addEventListener` (no ref pattern).

- **Diff**: N/A — different design (vanilla vs React). The drawer's pattern is the correct vanilla equivalent. No fix needed.

- **Note**: This is listed for completeness because the user asked about it. It is NOT a bug.

### G13. `onAnimationEnd` debounce cancels prior timer — Severity: **MEDIUM** (intentional)

- **vaul**: `index.tsx:180-182` (useControllableState.onChange):
  ```js
  setTimeout(() => {
    onAnimationEnd?.(o);
  }, TRANSITIONS.DURATION * 1000);
  ```
  No cancellation. If a state change happens within 500ms, the previous `setTimeout` is NOT cancelled — both will fire, in order.

- **drawer**: `runtime/registry.ts:183-190` (notifyOpenStateChange):
  ```ts
  if (runtime.pendingAnimationEndTimer !== null) {
    clearTimeout(runtime.pendingAnimationEndTimer)
    runtime.pendingAnimationEndTimer = null
  }
  runtime.pendingAnimationEndTimer = setTimeout(() => {
    runtime.pendingAnimationEndTimer = null
    runtime.options.onAnimationEnd?.(open)
  }, TRANSITIONS.DURATION * 1000)
  ```
  Cancels the prior timer.

- **Diff**: Open → close → open within 500ms:
  - vaul: fires `onAnimationEnd(true)` after 500ms (from open), then `onAnimationEnd(false)` 500ms after that (from close), then `onAnimationEnd(true)` 500ms after that (from re-open). Three callbacks, 1500ms total.
  - drawer: fires `onAnimationEnd(true)` once, 500ms after the re-open. One callback.

- **Impact**: The drawer's behavior is more "correct" (only the final state fires). But it's a divergence. A consumer porting from vaul who counts `onAnimationEnd` calls will see fewer callbacks in the drawer.

- **Fix**: This is a deliberate improvement (F5/F17 from the animation audit). Keep the drawer's behavior. Document the difference.

### G14. `getTranslate` returns `null` for missing `DOMMatrix` — Severity: **MEDIUM**

- **vaul**: `helpers.ts:72-88`: parses the matrix string manually using regex:
  ```js
  let mat = transform.match(/^matrix3d\((.+)\)$/);
  if (mat) {
    return parseFloat(mat[1].split(', ')[isVertical(direction) ? 13 : 12]);
  }
  mat = transform.match(/^matrix\((.+)\)$/);
  return mat ? parseFloat(mat[1].split(', ')[isVertical(direction) ? 5 : 4]) : null;
  ```
  Works in any JS environment with regex (no `DOMMatrix` required).

- **drawer**: `runtime/transforms.ts:128-145`:
  ```ts
  if (typeof DOMMatrix === 'undefined') return null
  const transform = window.getComputedStyle(element).transform
  if (!transform || transform === 'none') return null
  const matrix = new DOMMatrix(transform)
  return direction === 'top' || direction === 'bottom' ? matrix.m42 : matrix.m41
  ```
  Returns `null` if `DOMMatrix` is undefined (jsdom 15 and earlier, very old browsers). When `null`, the drag permission gate at `runtime/drag-policy.ts:131-134` short-circuits to `allow: true`:
  ```ts
  if (swipeAmount === null) {
    return { allow: true, updatePreventedAt: false }
  }
  ```
  This means: on a platform without `DOMMatrix`, ANY drag is allowed (the close-direction check is skipped). vaul would correctly check the swipe direction.

- **Impact**: Only matters on very old browsers or test environments without `DOMMatrix`. jsdom 16+ has it. Real browsers since 2017 have it. In practice, this is fine — but it's a behavioral divergence.

- **Fix**: Re-implement `getTranslate` in `runtime/transforms.ts` using regex string parsing (mirror vaul's `helpers.ts:72-88`). This makes the function work in all JS environments.

### G15. Horizontal drag permission is stricter than vaul — Severity: **MEDIUM** (deliberate)

- **vaul**: `index.tsx:296-298` (shouldDrag):
  ```js
  if (direction === 'right' || direction === 'left') {
    return true;
  }
  ```
  Returns `true` for any drag in horizontal directions. The drag math (`dampenValue`) resists the non-close direction.

- **drawer**: `runtime/drag-policy.ts:113-141`:
  ```ts
  if (direction === 'left' || direction === 'right') {
    if (swipeAmount === null) {
      return { allow: true, updatePreventedAt: false }
    }
    const isClosingSwipeOffset =
      direction === 'right' ? swipeAmount < 0 : swipeAmount > 0
    if (isClosingSwipeOffset) {
      return { allow: true, updatePreventedAt: false }
    }
    return { allow: false, updatePreventedAt: false }
  }
  ```
  Rejects non-close-direction drags on horizontal axes at the permission gate.

- **Diff**: vaul allows any drag; the drawer only allows the close direction.

- **Impact**: The user perceives a different drag behavior:
  - In vaul, dragging a `direction: 'right'` drawer to the LEFT starts a drag, and the drawer follows the finger with elastic resistance (`dampenValue`).
  - In the drawer, dragging a `direction: 'right'` drawer to the LEFT does NOT start a drag. The drawer stays at rest. The user can interact with the content instead.

  This is a deliberate fix for a v2 regression (per the file comment). It is NOT a bug.

- **Fix**: This is an intentional divergence. Keep the drawer's stricter behavior. Document in a top-of-file comment that the drawer's behavior is stricter than vaul's for non-close direction drags.

### G16. `assignStyle` and `reset` from vaul's `helpers.ts` are missing — Severity: **MEDIUM**

- **vaul**: `helpers.ts:42-57` (`reset`), `helpers.ts:94-103` (`assignStyle`). Both are used in `use-scale-background.ts:26-46` to set and later restore the page wrapper's styles.

- **drawer**: `helpers.ts:14-25` (`set`) overwrites styles and does NOT save the originals. The drawer's `vanilla/dialog.ts:266-270` has a local `setStyle` that sets a property without restoring (similar to vaul's `set`, not `assignStyle`). The drawer's wrapper pipeline (`runtime/transforms.ts:96-113` + `vanilla/dialog.ts:311-396`) writes inline styles directly and clears them via `wrapper.removeAttribute('style')` on a timer.

- **Diff**: The drawer has a different approach — instead of save-and-restore via `assignStyle`/`reset`, it writes inline styles, animates, and clears the inline style after `TRANSITIONS.DURATION * 1000`. This is functionally equivalent but more wasteful (more DOM writes) and slightly different in edge cases (e.g. concurrent re-opens might race the timer).

- **Impact**: Probably no consumer-visible bug. The `assignStyle`/`reset` pattern is an internal implementation detail.

- **Fix**: Optional. If 1:1 with vaul is desired, port `assignStyle` and `reset` to `src/helpers.ts` and use them in the wrapper pipeline. Otherwise, document the difference.

### G17. `onDrag` and `onRelease` callback signatures differ — Severity: **LOW** (intentional)

- **vaul**: `index.tsx:92-93`:
  ```ts
  onDrag?: (event: React.PointerEvent<HTMLDivElement>, percentageDragged: number) => void;
  onRelease?: (event: React.PointerEvent<HTMLDivElement>, open: boolean) => void;
  ```
  The event is a React synthetic `PointerEvent`.

- **drawer**: `core/index.ts:39-40`:
  ```ts
  onDragChange?: (percentageDragged: number) => void
  onReleaseChange?: (open: boolean) => void
  ```
  No event. The names are also different (`onDrag` vs `onDragChange`, `onRelease` vs `onReleaseChange`).

- **Diff**: Different signature and different name. Intentional (vanilla has no `PointerEvent` to pass through, and the `Change` suffix matches the controller's `subscribe(listener)` pattern).

- **Impact**: Consumers porting from vaul will get a TypeScript error and need to update the callback signature. No runtime bug.

- **Fix**: Document the signature change in a migration guide. The names are different — keep `onDragChange` / `onReleaseChange` (matches the controller API).

### G18. `NestedRoot` component pattern → `parentId: string` option — Severity: **LOW** (intentional)

- **vaul**: `index.tsx:1098-1126` (`NestedRoot`): a React component wrapper that:
  - Sets `nested: true`.
  - Uses `onNestedDrag`, `onNestedOpenChange`, `onNestedRelease` from the parent context.
  - Forwards `onDrag` / `onOpenChange` to the parent.

- **drawer**: `core/index.ts:9`: `parentId?: CommonDrawerId`. The runtime (`runtime/registry.ts:447-449, 478-481`) auto-opens the parent when a child with `parentId` opens, and syncs the parent transform on every state change.

- **Diff**: Different API. vaul: wrap the child in `<Drawer.NestedRoot>` inside the parent. drawer: pass `parentId: 'parent-id'` to the child `createDrawer` call.

- **Impact**: Different code shape, same behavior. Consumers porting from vaul need to rewrite nested drawer setup.

- **Fix**: Document the difference in a migration guide. Keep the `parentId` pattern — it's more idiomatic for a vanilla API.

### G19. `data-drawer-delayed-snap-points` is hardcoded to `'false'` — Severity: **LOW** (intentional)

- **vaul**: `index.tsx:855-893`: `delayedSnapPoints` state starts `false` and flips to `true` after one rAF. The CSS rule `[data-vaul-delayed-snap-points='true']` applies `--snap-point-height` to the drawer.

- **drawer**: `vanilla/dialog.ts:1868`: hardcoded `'data-drawer-delayed-snap-points': 'false'`. The CSS rules for `'true'` are present in `style.css:76-90` but never applied.

- **Diff**: The drawer's snap-point positioning uses a different mechanism — `--initial-transform` is written inline in `mountVanillaDialog` (line 1928):
  ```ts
  content.style.setProperty('--initial-transform', `${initialOffset}px`)
  ```
  This subsumes the `delayed-snap-points` mechanism.

- **Impact**: None — the drawer's mechanism works correctly. The CSS rules for `[data-drawer-delayed-snap-points='true']` are dead code.

- **Fix**: Remove the unused CSS rules (`style.css:76-90`), or wire up the `delayedSnapPoints` state to match vaul (and remove the `--initial-transform` inline write). Either is fine.

### G20. `isAllowedToDrag` ref is missing — Severity: **LOW** (intentional)

- **vaul**: `index.tsx:206`: `const isAllowedToDrag = React.useRef<boolean>(false);`. Set to `true` in `onDrag` (line 397) when `shouldDrag` returns true. Reset to `false` in `cancelDrag` (line 595) and `onRelease` (line 604). The iOS-specific reset: `index.tsx:272-274`:
  ```js
  if (isIOS()) {
    window.addEventListener('touchend', () => (isAllowedToDrag.current = false), { once: true });
  }
  ```
  This handles the case where iOS's `touchend` fires before the drag pipeline's `pointerup` (e.g. when the user scrolls a nested element).

- **drawer**: `runtime/drag-policy.ts:108-141` and `vanilla/dialog.ts:1142-1155`: the drag state is tracked via `state.drag`. Once a drag starts, the drag is "active" until `onPointerUp`. The iOS `touchend` reset is implicit — when `setPointerCapture` releases (on the next pointerup), the listeners are detached.

- **Diff**: The drawer's design subsumes the iOS `touchend` reset because `setPointerCapture` on the content element guarantees all pointer events go to the content. But this only works if the browser supports `setPointerCapture` (which all modern browsers do).

- **Impact**: On platforms where `setPointerCapture` is not honored (very old browsers, some embedded WebViews), the drawer's drag could get stuck. vaul's `isAllowedToDrag.current = false` on iOS touchend is a defensive fallback.

- **Fix**: Add a `window.addEventListener('touchend', () => { ... }, { once: true })` to the iOS branch of `runtime/scroll-lock.ts` (or `runtime/drag-policy.ts`) that resets the drag state. Mirror vaul's pattern at `index.tsx:272-274`.

### G21. `cancelDrag()` is not a separate function — Severity: **LOW** (intentional)

- **vaul**: `index.tsx:591-598`: `cancelDrag()` is called from `closeDrawer()` and the body-position teardown. It clears `isDragging`, `isAllowedToDrag`, and `dragEndTime`.

- **drawer**: No `cancelDrag()`. The equivalent logic is in `onPointerUp` (`vanilla/dialog.ts:1280-1300`) which clears `state.drag` and removes the listeners. And in `teardownMount` (line 613) which resets `state.drag = null`.

- **Diff**: The drawer splits the cancel logic into two places: the release path (on every pointerup) and the teardown path (on close). vaul has a single `cancelDrag` that is called from both paths.

- **Impact**: No behavioral difference in practice. The drawer's split is correct.

- **Fix**: Optional. If a single helper is desired for clarity, extract `cancelDragState(state)` to `runtime/drag.ts` and call it from both `onPointerUp` and `teardownMount`.

### G22. `useEffect` for `isOpen` (openTime / documentElement scrollBehavior) — Severity: **LOW** (informational)

- **vaul**: `index.tsx:665-678`:
  ```js
  React.useEffect(() => {
    if (isOpen) {
      set(document.documentElement, { scrollBehavior: 'auto' });
      openTime.current = new Date();
    }
    return () => {
      reset(document.documentElement, 'scrollBehavior');
    };
  }, [isOpen]);
  ```
  Sets `document.documentElement.scrollBehavior = 'auto'` on open, restores on close.

- **drawer**: No equivalent. The `state.openedAt` is set in `mountVanillaDialog` (line 1812), and the `documentElement.scrollBehavior` is never touched.

- **Diff**: Two divergences: (a) the `scrollBehavior: 'auto'` write is missing, (b) the `openTime` write happens in `mountVanillaDialog` (vanilla equivalent) but the teardown doesn't reset it (well, it does at line 614).

- **Impact**: (a) Probably no consumer-visible impact. `scrollBehavior: 'auto'` ensures that the `window.scrollTo(...)` calls in the iOS focus-trick (`scroll-lock.ts:292`) don't trigger smooth scrolling. If the consumer's CSS sets `scroll-behavior: smooth`, the iOS focus-trick would scroll smoothly instead of instantly. Minor.

- **Fix**: Add `document.documentElement.style.scrollBehavior = 'auto'` on open and restore on close in `mountVanillaDialog` / `teardownMount`. This matches vaul's pattern.

### G23. PWA standalone-mode check is missing — Severity: **LOW**

- **vaul**: `index.tsx:130-138` (usePositionFixed):
  ```js
  if (isOpen) {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    !isStandalone && setPositionFixed();
    ...
  }
  ```
  In PWA standalone mode, the body-position trick is skipped (because PWAs don't have a Safari toolbar collapse issue).

- **drawer**: `runtime/scroll-lock.ts:312-371` (`setPositionFixed`): no PWA check. The body-position trick runs for all Safari browsers, including PWA.

- **Diff**: PWAs on Safari would have the `position: fixed` body trick applied unnecessarily. This is harmless but wasteful (the body styles get set and immediately restored).

- **Impact**: Very minor. PWA users on Safari would see a brief `<body style="position: fixed; ...">` write that gets restored.

- **Fix**: Add the `window.matchMedia('(display-mode: standalone)').matches` check to `setPositionFixed` in `runtime/scroll-lock.ts`. Skip the body-position write when in standalone mode.

### G24. Extra options not in vaul — Severity: **LOW** (intentional)

- **vaul**: ~15 options in the `DialogProps` interface.
- **drawer**: ~30 options in `VanillaDrawerOptions` (extends `CommonDrawerOptions`).

- **Extra options in drawer**:
  - `container` (1:1 with vaul's `container` — same name, same purpose)
  - `mountElement` (legacy alias of `container`)
  - `triggerElement` (external trigger element)
  - `triggerText` (built-in trigger button text)
  - `showHandle` (built-in handle, separate from `handleOnly`)
  - `handleClassName`
  - `ariaLabel` (used for proxy title — see title docs)
  - `ariaLabelledBy`
  - `ariaDescribedBy`
  - `title` (the visible title slot)
  - `titleVisuallyHidden`
  - `description` (the description slot)
  - `descriptionVisuallyHidden`
  - `content` (the body content)
  - `overlayClassName`
  - `contentClassName`
  - `closeButton` (built-in close button)
  - `onDragChange` / `onReleaseChange` (already counted in G17)
  - `parentId` (already counted in G18)
  - `onAnimationEnd` (1:1 with vaul)
  - `onClose` (1:1 with vaul)
  - `onOpenChange` (1:1 with vaul)

- **Diff**: The drawer has significantly more options than vaul. Most are framework-agnostic extensions (built-in trigger, handle, close button, title slot, etc.) that the user explicitly asked for. The user wanted 1:1 behavioral parity, not 1:1 API parity — so the extra options are intentional and OK.

- **Impact**: No consumer-facing impact. The extra options are additive.

- **Fix**: None — these are intentional. The audit is exhaustive so they're listed for completeness.

---

## Summary

| ID | Severity | Title | vaul ref | drawer ref | Status |
|----|----------|-------|----------|------------|--------|
| G1 | HIGH | `direction: 'left'` and `'right'` CSS uses Y-axis | `style.css:46-66, 230-240` | `style.css:46-58, 68-74, 84-90, 302-336` | OPEN |
| G2 | HIGH | `TRANSITIONS.EASE` is Material, not vaul | `constants.ts:3` | `constants.ts:3`; `style.css:11-13` | OPEN |
| G3 | HIGH | Snap-point offsets ignore the `container` prop | `use-snap-points.ts:75-109` | `runtime/snap-points.ts:74-84`; `vanilla/dialog.ts:1015-1019, 1922-1926, 2073-2076` | OPEN |
| G4 | HIGH | `document.body.style.pointerEvents` is never set | `index.tsx:187, 194, 743` | MISSING | OPEN |
| G5 | HIGH | Drag math uses `window.innerHeight/innerWidth` instead of drawer dimensions | `index.tsx:213-214, 266-267, 378-379` | `vanilla/dialog.ts:1010` | OPEN |
| G6 | MEDIUM | `onClose` and `onOpenChange` fire in the opposite order | `index.tsx:536-549` | `runtime/registry.ts:147, 176` | OPEN |
| G7 | MEDIUM | Active snap point is not reset to the first after close | `index.tsx:544-548` | MISSING | OPEN |
| G8 | MEDIUM | `openTime` is not updated on snap change | `index.tsx:217-220, 301-303` | `vanilla/dialog.ts:1812` (read once) | OPEN |
| G9 | MEDIUM | `onActiveSnapPointChange` (controlled-prop pattern) is not implemented | `index.tsx:154, 234`; `use-snap-points.ts:30-34` | `core/index.ts:88` (controller API, different shape) | OPEN |
| G10 | MEDIUM | `justReleased` mechanism is not implemented | `index.tsx:200, 246, 618-624` | `runtime/release.ts:15-17` (computed but unused) | OPEN |
| G11 | MEDIUM | Overlay click-outside bypasses the drag-release pipeline | `index.tsx:817` | `vanilla/dialog.ts:988-995` | OPEN |
| G12 | LOW (info) | `useComposedRefs` analogue is fine (multi-ref pattern) | `use-composed-refs.ts:31-34` | N/A (vanilla) | N/A |
| G13 | MEDIUM | `onAnimationEnd` debounce cancels prior timer | `index.tsx:180-182` | `runtime/registry.ts:183-190` | OPEN (intentional) |
| G14 | MEDIUM | `getTranslate` returns `null` for missing `DOMMatrix` | `helpers.ts:72-88` | `runtime/transforms.ts:128-145` | OPEN |
| G15 | MEDIUM (deliberate) | Horizontal drag permission is stricter than vaul | `index.tsx:296-298` | `runtime/drag-policy.ts:113-141` | OPEN (intentional) |
| G16 | MEDIUM | `assignStyle` and `reset` from vaul's `helpers.ts` are missing | `helpers.ts:42-57, 94-103` | `helpers.ts:14-25` (only `set`) | OPEN (optional) |
| G17 | LOW | `onDrag` / `onRelease` callback signatures differ | `index.tsx:92-93` | `core/index.ts:39-40` | OPEN (intentional) |
| G18 | LOW | `NestedRoot` component pattern → `parentId: string` option | `index.tsx:1098-1126` | `core/index.ts:9`; `runtime/registry.ts:447-481` | OPEN (intentional) |
| G19 | LOW | `data-drawer-delayed-snap-points` is hardcoded to `'false'` | `index.tsx:855-893` | `vanilla/dialog.ts:1868` | OPEN (intentional) |
| G20 | LOW | `isAllowedToDrag` ref is missing (iOS touchend reset) | `index.tsx:206, 272-274` | implicit via `setPointerCapture` | OPEN (defensive) |
| G21 | LOW | `cancelDrag()` is not a separate function | `index.tsx:591-598` | `vanilla/dialog.ts:1280-1300, 613` | OPEN (optional) |
| G22 | LOW | `useEffect` for `isOpen` (openTime / documentElement scrollBehavior) | `index.tsx:665-678` | `vanilla/dialog.ts:1812` (openTime only, no scrollBehavior) | OPEN |
| G23 | LOW | PWA standalone-mode check is missing | `index.tsx:130-138` | `runtime/scroll-lock.ts:312-371` | OPEN |
| G24 | LOW | Extra options not in vaul (additive, not bugs) | N/A | `vanilla/render.ts:25-123` | OPEN (intentional) |

**Totals**:
- 24 findings
- 5 HIGH, 11 MEDIUM, 8 LOW (of which 5 are "intentional" / "informational" / "optional" — i.e. divergences the team should consciously choose to keep or fix)
- 1 N/A (G12, no diff)

**Top 5 most impactful** (for the user's porting-from-vaul use case):
1. **G1** — `direction: 'left'` and `'right'` CSS is broken (visible bug).
2. **G2** — `TRANSITIONS.EASE` divergence (every animation feels different).
3. **G5** — Drag math uses viewport instead of drawer (broken for non-full-height drawers).
4. **G3** — Snap-point offsets ignore `container` (broken for nested-modal use cases).
5. **G4** — `body.style.pointerEvents` is never set (defensive contract violation).

The 5 intentional / informative items (G12, G15, G17, G18, G19, G24) should be **documented in a migration guide** rather than fixed. The remaining 18 findings should be **addressed in priority order**: HIGH first, then MEDIUM, then LOW (defensive).
