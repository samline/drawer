# `mouseup` on overlay still creates duplicate `[data-drawer]` wrappers — fix 1 is incomplete

**Filed**: 2026-07-25
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Severity**: 🔴 **High** — visible UX bug, DOM bloat, multiple stacked drawer's with conflicting listeners.
**Affected versions**: `@samline/drawer@3.0.0-beta.2` (still present even after the `efad4c0 fix: memory leak, CSS compat, a11y ids, drawer id position` commit).
**Status**: Open — `efad4c0` did not address this case; a follow-up is needed.
**Related**: `2026-07-25-drawer-visible-on-load-with-closed-state.md` (closed by the same `efad4c0` commit), this report.

---

## TL;DR

The memory-leak fix in commit `efad4c0` only addressed one of the two code paths that called `renderVanillaDrawer` per `setOpen` cycle. The path through the overlay's `mouseup` listener is **still calling `renderVanillaDrawer` unconditionally**, which recreates a new `[data-drawer]` content element on every interaction. After 10 `mouseup` events on the overlay, the DOM contains **11** `[data-drawer]` wrappers (1 original + 10 duplicates), each with its own event listeners. Consumers see this as "any click opens the drawer and immediately closes it" or "the drawer doesn't work properly".

---

## The two code paths to `renderVanillaDrawer`

`efad4c0` removed the redundant call in the proxy's `setOpen` (line 837 area in the compiled bundle). The commit message says:

> 1. Fix memory leak: remove redundant renderVanillaDrawer call in setOpen — notifyOpenStateChange already calls it via setTimeout, so the direct call in setOpen was creating a duplicate wrapper per open/close cycle (2 wrappers per cycle = 11 after 5 cycles).

But there is a **second** place that calls `renderVanillaDrawer` per open/close cycle, which the commit did not address: the `onOpenChange` callback passed to `attachListeners` for the overlay's `mouseup` listener (around line 830 in the compiled bundle):

```js
onOpenChange: (open) => {
  const previousOpen = runtime.controller.getSnapshot().state.isOpen;
  runtime.controller.setOpen(open);
  if (previousOpen !== open) {
    notifyOpenStateChange(runtime, open);
  }
  renderVanillaDrawer(id);  // ← this line runs on EVERY mouseup, even when the state didn't change
},
```

The `renderVanillaDrawer(id)` call at the end runs **every** time the overlay's `mouseup` listener fires, regardless of whether the state actually changed. Combined with the fact that `teardownMount` (called inside `mountVanillaDialog` → `renderVanillaHost`) only removes the `trigger` and `overlay` from the DOM, but **not** the previous `content` (it just resets `state.content = null`), the DOM accumulates a new `[data-drawer]` content element on every `mouseup`.

---

## Reproduction

### Test 1 — `mouseup` alone is enough to trigger the leak

```js
// happy-dom
import * as drawer from '@samline/drawer';

const html = '<div><button id="d1-close">x</button></div>';

const d = drawer.createDrawer({
  id: 'd1',
  direction: 'right',
  showHandle: true,
  overlayClassName: 'overlay',
  contentClassName: 'content',
  content: () => { const w = document.createElement('div'); w.innerHTML = html; return w; },
});

// Fire 10 mouseup events on the overlay
for (let i = 1; i <= 10; i++) {
  const overlay = document.querySelector('[data-drawer-overlay]');
  if (overlay) {
    overlay.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }
  await sleep(30);
}

console.log(document.querySelectorAll('[data-drawer]').length);
```

Output:
```
1   ← initial
2   ← after 1 mouseup
6   ← after 5 mouseups
11  ← after 10 mouseups
```

Every `mouseup` on the overlay creates a new `[data-drawer]`, even when the state is already `closed` and `setOpen(false)` is a no-op.

### Test 2 — Real user flow (matches the easytrip header pattern)

```js
// Setup: easytrip wrapper (window.Drawer.newDrawer) + global click listener
// that calls drawer.setOpen(true) when [data-drawer-open] is clicked.

// 5 cycles of: trigger.click() → overlay.mouseup
// Expected: 1 wrapper total (one drawer, no accumulation).
// Actual: 8 wrappers (1 + 7 from 5 cycles × ~1.4 renders each on average).
```

Output (from the failing test):
```
mount: 1 [data-drawer]
after click open: 1
after click overlay (close): 2     ← +1
after click open: 2
after click overlay (close): 3     ← +1
5 more cycles: 8 total              ← +5
```

The drawer ends up with 8 stacked `[data-drawer]` content elements, all with `data-state="closed"`. When the user clicks the trigger, the `setOpen(true)` call from the easytrip listener changes the controller's internal state to `true` but **does not render** (the `setOpen` proxy only calls `notifyOpenStateChange`, no direct render). The DOM still shows all 8 wrappers as `data-state="closed"`. The next mouseup / interaction triggers a render that applies the current (true) state — but immediately after, more state changes from the same interaction flip it back. The result is the user-perceived "click → open → close" cycle that looks like the drawer isn't responding.

---

## Root cause

In `src/runtime/registry.ts` (or wherever the `onOpenChange` callback is built), the callback for the overlay's `mouseup` listener unconditionally calls `renderVanillaDrawer(id)`. This call is the second redundant render that the `efad4c0` commit did not remove. Combined with the fact that `teardownMount` does not remove the previous `[data-drawer]` from the DOM (only the `trigger` and `overlay`), each render leaves the previous content behind.

### Reference: `teardownMount` (file: `src/vanilla/dialog.ts:196-225`)

```js
function teardownMount(state) {
  for (const cleanup of state.cleanups) cleanup();
  state.cleanups = [];
  if (state.trigger && document.activeElement === state.trigger) {
    if (typeof state.trigger.blur === 'function') state.trigger.blur();
  }
  if (state.trigger?.parentNode) state.trigger.parentNode.removeChild(state.trigger);
  if (state.overlay?.parentNode) state.overlay.parentNode.removeChild(state.overlay);
  state.trigger = null;
  state.overlay = null;
  state.content = null;        // ← resets the reference, but the DOM element is NOT removed
  state.handle = null;
  state.title = null;
  state.description = null;
  state.body = null;
  // ... focus / scroll lock restoration
}
```

The `state.content = null` line zeroes the reference in the state but does **not** call `state.content?.parentNode?.removeChild(state.content)`. So the previous `[data-drawer]` element stays in the DOM as a zombie, and the next `mountVanillaDialog` appends a new one.

---

## Proposed fix (two parts)

### Part 1: remove the redundant `renderVanillaDrawer` call in the overlay's `onOpenChange` callback

In `src/runtime/registry.ts` (the function that builds the `onOpenChange` callback passed to `mountVanillaDrawer` / `renderVanillaHost`):

```js
onOpenChange: (open) => {
  const previousOpen = runtime.controller.getSnapshot().state.isOpen;
  runtime.controller.setOpen(open);
  if (previousOpen !== open) {
    notifyOpenStateChange(runtime, open);
  }
  // renderVanillaDrawer(id);   // ← remove this line (matches the fix from efad4c0 applied to the proxy's setOpen)
},
```

This is the same kind of redundant call that `efad4c0` already removed from the proxy's `setOpen`. With it removed, the only path to re-render is the state-change listener (and `setActiveSnapPoint` / parent transforms, which already gate on actual changes).

### Part 2 (recommended): make `teardownMount` actually remove the old `content` from the DOM

Even with Part 1, future regressions are likely if anyone adds another unconditional render. The cleaner fix is to make `teardownMount` symmetric — remove all child elements it created, not just `trigger` and `overlay`:

```js
function teardownMount(state) {
  for (const cleanup of state.cleanups) cleanup();
  state.cleanups = [];
  if (state.trigger && document.activeElement === state.trigger) {
    if (typeof state.trigger.blur === 'function') state.trigger.blur();
  }
  if (state.trigger?.parentNode) state.trigger.parentNode.removeChild(state.trigger);
  if (state.overlay?.parentNode) state.overlay.parentNode.removeChild(state.overlay);
  if (state.content?.parentNode) state.content.parentNode.removeChild(state.content);  // ← new
  state.trigger = null;
  state.overlay = null;
  state.content = null;
  state.handle = null;
  state.title = null;
  state.description = null;
  state.body = null;
  // ... rest unchanged
}
```

This makes the mount lifecycle explicit: every `mountVanillaDialog` either reuses the existing `[data-drawer-vanilla-root]` (and replaces its children) or creates a fresh one. The DOM state is always consistent with the JS state.

---

## Why `efad4c0` didn't catch this

The commit message describes the test as "5 cycles → 11 wrappers". The fix removed the redundant call in `setOpen` so the count went down to 1 per cycle. But the test that was used to verify the fix was almost certainly the same as in `tests/`: calling `d.setOpen(true)` followed by `d.setOpen(false)` directly, which does **not** exercise the `mouseup` overlay listener. A test that simulates real user interaction (clicking the trigger and dismissing via the overlay) would have caught this.

Suggested regression test for the fix:

```js
// tests/vanilla-host-mouseup-leak.test.ts (or similar)
test('repeated mouseup on overlay does not accumulate [data-drawer] wrappers', async () => {
  const d = createDrawer({ id: 't', content: '<div>x</div>', /* ... */ });
  for (let i = 0; i < 10; i++) {
    const overlay = document.querySelector('[data-drawer-overlay]');
    overlay?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
  }
  expect(document.querySelectorAll('[data-drawer]').length).toBe(1);
});
```

---

## Workaround for consumers (until the fix is published)

There is **no safe** consumer-side workaround — the only way to avoid the leak is to never trigger the overlay's `mouseup` listener, which means never using `dismissible: true` (the default) and never clicking outside the drawer. Both options break the expected UX.

A consumer could:

- (a) Set `dismissible: false` on every drawer to disable the click-outside-to-close behavior. This stops the leak (no `mouseup` listener attached), but the close button is the only way to close the drawer.
- (b) Patch the package locally (`file:` or `link:` install) and apply the Part 1 + Part 2 fix in `src/`. Then hard-refresh after each `bun install` / re-render.

The easytrip project is currently blocked on this fix and is using option (a) as a temporary measure for the drawers that have been verified broken. This is **not** a long-term solution.

---

## Impact

- **Severity**: High. Every interaction with a drawer that has `dismissible: true` (the default) leaks a `[data-drawer]` into the DOM and adds a corresponding set of event listeners. After 10 interactions, the consumer has 11 stacked drawers in their DOM, each with their own body-scroll lock state, focus management, and click handlers.
- **Affected patterns**: every consumer that opens and closes a drawer via overlay click. This is the default UX pattern for mobile-friendly drawers.
- **Not affected**: drawers that are only ever opened programmatically (no overlay click) — but that is the minority case.
- **Performance**: linearly-growing memory + linearly-growing event listener count per open/close cycle. On a heavy usage session (50+ opens) this can produce a noticeable slowdown and an actual memory leak.

---

## Related issues

- `2026-07-25-drawer-visible-on-load-with-closed-state.md` — closed by the same `efad4c0` commit (CSS animation fix, separate concern).

## Resolution plan

- [ ] Remove the redundant `renderVanillaDrawer(id)` call in the overlay's `onOpenChange` callback (Part 1 of the fix).
- [ ] Make `teardownMount` actually remove the old `[data-drawer]` content from the DOM (Part 2 of the fix).
- [ ] Add a regression test that simulates real user interaction (click + mouseup) and asserts no DOM accumulation.
- [ ] Re-verify the original 5-cycle memory-leak test still passes.
- [ ] Bump to `3.0.0-beta.3` and publish.
