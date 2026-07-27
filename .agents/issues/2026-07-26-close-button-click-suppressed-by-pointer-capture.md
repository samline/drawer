# Bug: built-in close button does not respond to clicks

**Filed**: 2026-07-26
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: ✅ **Closed** — fixed in this commit.
**Severity**: High (close button visibly broken across every modal drawer)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.3`
**Fixed by**: reordering `setPointerCapture` and adding an interactive-child guard.

---

## TL;DR

The vanilla dialog's `onPointerDown` called `setPointerCapture(content, …)`
**before** the drag-permission check, and unconditionally for every
pointerdown that landed on the content subtree. With the pointer
captured by `content`, the browser redirected `mouseup` (and therefore
`click`) to `content` instead of the original target. The close button
received no `click` event, so its `onOpenChange(false)` listener never
fired. Tapping the close button started a no-op drag with
`draggedDistance = 0`; the release path returned `'reset'`; the drawer
stayed open.

The fix:
1. Bails out of `onPointerDown` **before** `setPointerCapture` when the
   target is an interactive child of the drawer (button, link, form
   field, the `[data-drawer-close]` element itself, or any element
   whose closest ancestor is one of those). The pointer is never
   captured, so the browser fires `click` on the original target.
2. Moves `setPointerCapture` **after** the drag-permission check, so
   the capture only takes effect when a drag actually starts.

The drag pipeline still works: clicking the content background
(non-interactive area) still captures the pointer and starts a drag,
because the interactive-child check explicitly excludes
`event.target === content`.

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.3` in any consumer.
2. Create a drawer with `closeButton: { … }` (the built-in option) and
   `direction: 'right'` (or any direction).
3. Open the drawer by clicking the trigger.
4. Click the built-in close button.

**Expected**: the drawer closes (controller reports `isOpen === false`,
DOM `[data-state="closed"]`).
**Actual (pre-fix)**: nothing happens. The controller still reports
`isOpen === true`. No errors.

---

## Root cause

The v3 dialog mounts at `createDrawer` time (eager mount, see
`.agents/issues/2026-07-25-drawer-visible-on-load-with-closed-state.md`).
When the user taps the close button, the dialog's pointer pipeline
fires:

```
content → pointerdown (target = <svg> inside <button data-drawer-close>)
       ↓ bubble
content → setPointerCapture(content, pointerId)
       ↓
       // permission check happens here, AFTER capture
       getDragPermission(…) → { allow: true }   // for 'right' direction
       state.drag = { … }
       addEventListener('pointermove', …)
       addEventListener('pointerup', …)
```

Once `content` captures the pointer, all subsequent pointer events for
that pointer id are redirected to `content` — even if the user
releases over a different element. `mouseup` fires on `content`, not
on `<button>`. The browser does not synthesize a `click` event on the
button because the mousedown target (button) ≠ mouseup target
(content). The click event is dispatched on the common ancestor
(`content`), where the close button's listener does not exist.

The overlay's `mouseup` listener is a separate handler on the
**overlay** (a sibling of `content`), and `mouseup` on `content` does
not bubble to the overlay — so the overlay's "click outside to close"
path doesn't fire either. End result: nothing closes the drawer.

---

## Fix

Two changes in `src/vanilla/dialog.ts#attachListeners#onPointerDown`:

```ts
const onPointerDown = (rawEvent: Event) => {
  const event = rawEvent as DragPointerEvent

  // 1. Bail out BEFORE capturing the pointer when the target is an
  //    interactive child of the drawer.
  const eventTarget = event.target as Element | null
  const isInteractiveChild =
    eventTarget instanceof Element &&
    eventTarget !== content &&
    (isInteractiveDragTarget(eventTarget) ||
      Boolean(eventTarget.closest('[data-drawer-close]')))

  if (isInteractiveChild) {
    return
  }

  // … permission check …

  // 2. setPointerCapture only AFTER the permission check passes.
  const capture = event.currentTarget?.setPointerCapture
  if (typeof capture === 'function') {
    try {
      capture.call(event.currentTarget, event.pointerId)
    } catch { /* pointer already released */ }
  }

  state.drag = { … }
  // … attach pointermove / pointerup listeners …
}
```

And a new helper `isInteractiveDragTarget(target: Element)` in the
same file. The helper handles both the "this element IS interactive"
case (button, input, a, …) and the "this element is part of an
interactive child" case (an SVG icon inside a button), because real
browsers deliver `pointerdown` on the deepest element under the
pointer — for a FontAwesome `<i>` inside `<button>`, that's the `<i>`'s
`<svg>` `<path>`, which is NOT an `HTMLElement` instance.

```ts
function isInteractiveDragTarget(target: Element): boolean {
  const tagName = target.tagName
  if (tagName === 'BUTTON' || tagName === 'A' || tagName === 'INPUT' ||
      tagName === 'SELECT' || tagName === 'TEXTAREA' ||
      tagName === 'LABEL' || tagName === 'IFRAME') {
    return true
  }
  if (target.hasAttribute('role')) {
    const role = target.getAttribute('role')
    if (role && role !== 'presentation' && role !== 'none') {
      return true
    }
  }
  if (target.hasAttribute('tabindex')) {
    const tabIndex = target.getAttribute('tabindex')
    if (tabIndex !== null && tabIndex !== '-1') {
      return true
    }
  }
  // SVG icons inside an interactive parent (e.g. an `<svg>` inside a
  // `<button>`) are not themselves interactive, but they ARE part of
  // an interactive child.
  const interactiveAncestor = target.closest(
    'button, a[href], input, select, textarea, label, iframe, [role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [role="tab"]'
  )
  return interactiveAncestor !== null
}
```

The `eventTarget !== content` clause is critical: the content carries
`role="dialog"` and `tabindex="-1"`, so without the equality guard the
helper would treat the content itself as interactive and the drag
pipeline would never start. The drag MUST start when the user grabs
the content background.

---

## Regression tests

`test/close-button-pointer-capture.test.ts` pins five end-to-end
scenarios:

1. Click on the built-in close button → `setOpen(false)` fires,
   `data-state` becomes `closed`.
2. Click on the content background (no interactive children) → drag
   still starts.
3. Click on a form input inside the drawer → no drag, no inline
   transform on the content.
4. Click on a link inside the drawer → no drag.
5. Pointerdown on a `[data-drawer-no-drag]` child → no drag, no
   pointer capture, no inline transform.

---

## Impact

- **Affected surface**: every consumer that uses the built-in
  `closeButton` option (the recommended pattern documented in
  `docs/options.md`). Also affects any drawer that contains form
  inputs, links, or any other interactive child the consumer expects
  to be clickable.
- **Severity rationale**: the close button is the canonical way to
  dismiss a modal drawer. Without it, the user can only dismiss by
  clicking the overlay (which doesn't work because the overlay is a
  sibling of `content`, not an ancestor of the close button — see
  the root cause above) or by dragging past the close threshold.
- **Detection**: open the drawer, click the close button, observe
  that the drawer stays open.
- **Workaround before the fix**: do not use the built-in
  `closeButton`; instead, in the consumer's `<script>`, attach a
  `document.addEventListener('click', (e) => { … })` and call
  `closeDrawer(id)` on the matching target. The HMR caveat from
  the original audit still applies — multiple listeners accumulate.