# Pointer capture ordering — interactive children + permission check

When the drag pipeline needs `setPointerCapture` to keep the gesture
alive across content boundaries, **always** gate the capture on the
drag-permission check AND on the target not being an interactive
child.

The original order in v3 was:

```
onPointerDown(event) {
  setPointerCapture(content, event.pointerId)   // ← unconditional
  const permission = getDragPermission(…)       // ← too late
  if (!permission.allow) return
  state.drag = { … }
}
```

Two failure modes:
1. `setPointerCapture` redirects subsequent pointer events to the
   capturing element. The browser fires `mouseup` on the capturing
   element, not the original target. The browser does NOT synthesize
   a `click` event on the original target (because mousedown target
   ≠ mouseup target). Result: interactive children (close button,
   links, form inputs) lose their `click` events.
2. A drag can start even when the target is interactive, which
   produces a no-op drag with `draggedDistance = 0`; the release path
   returns `'reset'`.

Correct order:

```
onPointerDown(event) {
  if (isInteractiveChild(event.target, content)) return   // bail out
  const permission = getDragPermission(…)
  if (!permission.allow) return
  setPointerCapture(content, event.pointerId)             // only after we know
  state.drag = { … }
}
```

`isInteractiveChild` must consider:
- `event.target !== content` (the content carries `role="dialog"` and
  `tabindex="-1"` so the role/tabindex heuristics would otherwise
  flag it as interactive).
- `target.tagName ∈ {BUTTON, A, INPUT, SELECT, TEXTAREA, LABEL, IFRAME}`.
- `target.closest('button, a[href], input, select, textarea, label, iframe, [role=…]')`
  for cases where the target is a non-interactive child of an
  interactive parent (e.g. an SVG `<path>` inside a `<button>` —
  `path instanceof HTMLElement` is false, so the tag-name heuristic
  misses it).
- Real browsers deliver `pointerdown` on the deepest element under
  the pointer — the SVG `<path>` inside FontAwesome's `<i>` inside a
  `<button>`. `target instanceof HTMLElement` is also false for SVG
  elements; use `target instanceof Element` instead.

Reference fix in `src/vanilla/dialog.ts#attachListeners#onPointerDown`.
Regression tests in `test/close-button-pointer-capture.test.ts`.