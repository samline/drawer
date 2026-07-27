# Bug: drawer does not slide out on drag-release close (vanishes instantly)

**Filed**: 2026-07-26
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: ✅ **Closed** — fixed in this commit.
**Severity**: High (visibly wrong UX; v2 animated both ways)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.3`
**Fixed by**: clearing the inline `transform` style on the content
in the drag-release close path (both Phase A and Phase B), so the
CSS close animation has the open position as its start frame.

---

## TL;DR

Closing a drawer via a drag-down (or drag-right / drag-up / drag-left)
release did not visibly play the CSS `slideToBottom` / `slideToRight` /
etc. animation. The drawer just disappeared. Closing via the built-in
close button (or via `Escape`, or via the `onClick` on the close icon)
still worked — that path went through the
`mountVanillaDialog#isClosingOnly` branch and the slide played.

The asymmetry was the bug. Both paths set `data-state='closed'` and
`data-drawer-closing='true'`, but the drag-release path also left an
inline `transform: translate3d(0, dragY, 0)` on the content. The CSS
animation interpolates from the current computed transform to the
closed-position keyframe. With the inline transform in place, the
animation usually started at a position already past the closed
position, so the slide was invisible.

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.3` in any consumer.
2. Create a drawer with `direction: 'bottom'` (or any direction).
3. Open the drawer.
4. Drag down past the close threshold (25 % of the drawer dimension)
   and release.
5. **Expected**: the drawer slides back to its closed position over
   ~500 ms (same effect as the close button).
6. **Actual (pre-fix)**: the drawer disappears instantly. The
   transition is silent — the user has no feedback that the gesture
   was accepted.

---

## Root cause

`src/vanilla/dialog.ts#onPointerUp` (the `pointerup` handler in
`attachListeners`):

```ts
if (release.action === 'close') {
  set(content, { transition: 'none' })  // <-- disables the CSS transition
  // ... wrapper cleanup ...
  callbacks.onOpenChange(false)
  return
}
```

`onPointerMove` writes the inline transform on every move:

```ts
set(content, {
  transform: getAxisAwareTranslate(direction, draggableOffset),
  transition: 'none'
})
```

so the content has an inline `transform: translate3d(0, dragY, 0)`
at release time. `set(content, { transition: 'none' })` then keeps
the inline `transition: 'none'` (it was already `none` from the
move) and adds nothing new.

`callbacks.onOpenChange(false)` triggers
`notifyOpenStateChange(runtime, false)` → `renderVanillaDrawer(runtime.id)`,
which re-enters `mountVanillaDialog` with `open=false`. That branch
sees `isClosingOnly = true` and:

1. `applyOpenState(state, options, false)` sets `data-state='closed'`.
2. `state.content.dataset.drawerClosing = 'true'` — the CSS rule
   `[data-drawer][data-state='closed'][data-drawer-closing]` sets
   `transform: none` (open position), so the close animation
   `slideToBottom` has a clean start frame.

But the inline `transform: translate3d(0, dragY, 0)` overrides the
CSS rule. The animation interpolates from the inline transform to
the closed-position keyframe. For most realistic drags (dragged
past the closed position), the inline transform is already off-
screen, so the animation moves the drawer from `dragY` (e.g. 466 px)
to `100%` (e.g. 700 px) — a ~234 px movement that is already past
the visible viewport. The user sees no visible motion.

The close-button path does not have this problem because no drag
has happened — the inline transform is empty and the CSS
`data-drawer-closing` rule's `transform: none` is the actual
start frame.

---

## Fix

Clear the inline `transform` on the content before calling
`onOpenChange(false)`. The CSS `data-drawer-closing` rule's
`transform: none` then provides the open position as the animation
start frame — exactly the same starting point the close-button path
uses.

The same fix applies to the Phase B (snap-points) drag-release
close path; both branches in `onPointerUp` now set
`content.style.transform = ''` before the `onOpenChange(false)` call.

The snap-back path (drag below threshold, drawer stays open) is
unchanged: it intentionally sets the inline transform + transition
so the visible snap-back animation runs. The `transition: 'none'`
that the close path sets inline is preserved (the close animation
is independent of the `transition` property, so disabling the
transition does not affect the animation).

---

## End-to-end verification

Real Chromium (Playwright) against the consumer's `/registrarse`
modal (direction: 'bottom'):

| frame | pre-fix `transform` | post-fix `transform` |
| ----- | ------------------ | -------------------- |
| end of drag | `matrix(1,0,0,1,0,466)` (inline, 466 px) | `matrix(1,0,0,1,0,466)` (inline, 466 px) |
| just after `pointerup` | `matrix(1,0,0,1,0,466)` (inline still there) | `matrix(1,0,0,1,0,0)` (inline cleared → CSS `transform: none` = open position) |
| 100 ms after `pointerup` | `matrix(1,0,0,1,0,478)` (only 12 px movement) | `matrix(1,0,0,1,0,131)` (131 px movement, animation running visibly) |
| 500 ms after `pointerup` | off-screen | off-screen (animation complete) |

The post-fix `matrix(1,0,0,1,0,131)` after 100 ms is consistent
with `slideToBottom`'s `cubic-bezier(0.32, 0.72, 0, 1)` curve
(running 18.7 % of the distance at t=0.2). The pre-fix 12 px
movement was an artifact of the animation interpolating from
466 px (off-screen) to 700 px (closed position) — most of the
movement was invisible because the drawer was already off-screen.

---

## Regression tests

- `test/drag-release-close-animation.test.ts` (4 cases) — static
  assertions on `content.style.transform` after the drag-release
  close path, covering `direction: 'bottom'`, `direction: 'right'`,
  the snap-points close path, and the snap-back path (which still
  sets the inline transform for the visible snap-back).
