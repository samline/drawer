# Bug: `mouseup` on the overlay accumulates `[data-drawer]` wrappers

**Filed**: 2026-07-25
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: ✅ **Closed** — fixed in v3.0.0-beta.3 (`346aec0` made `teardownMount` symmetric).
**Severity**: High (memory leak + stale DOM references)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.2`
**Fixed in**: `346aec0` ("chore(drawer): port to tsup + vitest + jsdom + prettier 3") made `teardownMount` remove the `state.content` element symmetrically with the `trigger` and `overlay` removal. Combined with the eager-mount pattern of the v3 betas, this prevents the leak.

---

## TL;DR

In the v3.0.0-beta.0 / 3.0.0-beta.1 / 3.0.0-beta.2 line, every `mouseup` on the overlay called `renderVanillaDrawer(id)` unconditionally. The mount path runs `mountVanillaDialog` → `teardownMount`, but `teardownMount` only removed `state.trigger` and `state.overlay` — `state.content` was retained across re-mounts. Each `mouseup` therefore created a fresh `[data-drawer]` wrapper that was never removed, leaking a new DOM node per click and leaving `document.querySelector('[data-drawer]')` pointing at a detached, stale element.

The first part of the fix removes the redundant `renderVanillaDrawer` call in the `onOpenChange` callback. The second part makes `teardownMount` remove the content element. Together they guarantee that repeated `mouseup` events on a closed overlay never accumulate wrappers.

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.2` in any consumer.
2. Create a drawer with `direction: 'right'`, `content: 'body'`.
3. Inspect the DOM: `document.querySelectorAll('[data-drawer]').length` returns 1.
4. Dispatch `mouseup` on the overlay 10 times (e.g. `overlay.dispatchEvent(new MouseEvent('mouseup'))` in the console).
5. Inspect the DOM again.

**Expected**: the count is still 1.
**Actual (pre-fix)**: the count grows to 11. The first 10 wrappers are detached but still in the DOM. `document.querySelector('[data-drawer]')` returns the latest one.

---

## Root cause

The v3 eager-mount overlay has a `mouseup` listener that calls `onOpenChange(false)`. The `onOpenChange` callback in `renderVanillaDrawer` writes the new state into the controller, then **always** calls `renderVanillaDrawer(id)` again, even when the state did not actually change (e.g. the overlay is already closed).

`renderVanillaDrawer` → `renderVanillaHost` → `mountVanillaDialog` → `teardownMount` (clears the previous overlay, trigger, and cleanups) → mount (creates a fresh overlay, trigger, and content).

Pre-fix, `teardownMount` did not remove `state.content`. The old `[data-drawer]` content element was retained, and the new mount appended a fresh one next to it. Over a long session, hundreds of detached wrappers accumulated.

---

## Fix

Two complementary changes, in `runtime/registry.ts` and `vanilla/dialog.ts`:

1. **`runtime/registry.ts#renderVanillaDrawer`**: the `onOpenChange` callback only re-renders when the state actually changed (`previousOpen !== open`).
2. **`vanilla/dialog.ts#teardownMount`**: removes `state.content` together with `state.trigger` and `state.overlay`. `state.content` is also nulled so the next mount does not re-attach a stale listener.

```ts
// runtime/registry.ts (paraphrased)
onOpenChange: (open) => {
  const previousOpen = runtime.controller.getSnapshot().state.isOpen
  runtime.controller.setOpen(open)
  if (previousOpen !== open) {
    notifyOpenStateChange(runtime, open)
    renderVanillaDrawer(id)
  }
}
```

```ts
// vanilla/dialog.ts#teardownMount
if (state.content?.parentNode) state.content.parentNode.removeChild(state.content)
state.content = null
```

---

## Regression test

`test/overlay-mouseup-no-accumulation.test.ts` pins the fix end-to-end:

1. Mount creates exactly one `[data-drawer]` wrapper.
2. After 10 `mouseup` events on the overlay (with microtask yields), the count is still 1.
3. After 5 open/close cycles via overlay click, the count is still 1.
4. The dialog's `data-state` is correctly updated after a dismiss via overlay `mouseup` (proves the dialog re-renders, AND the wrapper count does not leak).

---

## Impact

- **Affected surface**: every consumer running the v3 betas that mounts a drawer with the eager-mount overlay.
- **Severity rationale**: in a long session the DOM grows without bound, the runtime's `document.querySelector` consumers see stale references, and consumers that watch the DOM for changes see spurious mutation events.
- **Detection**: run the runtime test suite (`bun run test` or `bunx vitest run`).
- **Workaround before the fix**: open a drawer's `onOpenChange` callback in the consumer and avoid calling `renderVanillaDrawer` when the state did not change.
