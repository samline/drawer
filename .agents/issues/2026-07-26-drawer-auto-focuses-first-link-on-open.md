# Bug: drawer auto-focuses the first focusable descendant on open

**Filed**: 2026-07-26
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: ✅ **Closed** — fixed in this commit.
**Severity**: Medium (visible UX regression: a link in the drawer
appears "highlighted" on open, looks like a stray hover/focus)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.3`
**Fixed by**: making initial focus opt-in via `options.autoFocus: true`
(v2 default was to NOT auto-focus).

---

## TL;DR

v3's `mountVanillaDialog` always called `focusFirstElement(content)`
when the drawer opened, which focused the FIRST focusable
descendant of the drawer body. For drawers whose first focusable is
a link (e.g. the consumer's support drawer, whose WhatsApp phone
link is the first anchor), the drawer appeared to "highlight" the
link on open — surprising users who hadn't clicked anything yet.

v2's default was the opposite: by default, the trigger was blurred
before opening and the dialog body was NOT auto-focused — focus
stayed on `document.body` (or the trigger) and the user could Tab
into the content. Auto-focus was opt-in via `autoFocus: true`.

The fix preserves v2's default: `focusFirstElement` is only called
when `options.autoFocus === true`. The existing
`releaseHiddenFocusBeforeOpen` helper (called by the registry
before mount, gated on `!options.autoFocus`) already blurs the
trigger, so the dialog never appears focused inside.

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.3` in any consumer.
2. Create a drawer whose first focusable descendant is a link (e.g.
   the consumer's `support-drawer`, whose WhatsApp phone link is
   the first `<a>` inside the drawer body).
3. Open the drawer.

**Expected**: the drawer opens, focus stays where it was (or falls
back to `document.body`). The first link is NOT highlighted.
**Actual (pre-fix)**: the first link receives focus on open. The
browser draws its focus ring and the user's screen reader jumps to
the link — looks like a stray hover or accidental focus.

---

## Root cause

`src/vanilla/dialog.ts#mountVanillaDialog`:

```ts
if (open && options.modal !== false) {
  state.previouslyFocused = ...
  lockBodyScroll()
  if (state.content) focusFirstElement(state.content)
}
```

`focusFirstElement` queries for any focusable descendant (`a[href]`,
`input`, `button`, etc.) and focuses the first match. For the
consumer's `support-drawer` the first match is the WhatsApp
`tel:` link.

In v2 (`v2.0.8`), the equivalent code only auto-focused when
`autoFocus === true`:

```ts
autoFocus = false,  // default
```

with a separate `releaseHiddenFocusBeforeOpen` callback that blurred
the trigger when `autoFocus` was false. v2's default behaviour was
to NOT move focus into the dialog.

The v3 vanilla baseline kept the auto-focus unconditional — the
`releaseHiddenFocusBeforeOpen` helper exists but the runtime then
counter-balances it by immediately focusing the first child.

---

## Fix

`src/vanilla/dialog.ts#mountVanillaDialog`:

```ts
if (open && options.modal !== false) {
  state.previouslyFocused = ...
  lockBodyScroll()
  if (options.autoFocus === true && state.content) {
    focusFirstElement(state.content)
  }
}
```

Initial focus is now opt-in. Consumers who want the old v3
behaviour can pass `autoFocus: true` in their `createDrawer({...})`
options. Consumers who don't (the default, matching v2) get the
no-focus-on-open behaviour they expect.

`releaseHiddenFocusBeforeOpen` is unchanged — it still blurs the
trigger when `autoFocus` is false, so the dialog never appears to
"steal" focus on open. The focus trap (`trapFocus` on Tab /
Shift+Tab) is unchanged — focus still stays inside the dialog
while it is open, so keyboard users can navigate within the dialog
via Tab.

---

## Regression tests

`test/focus-management.test.ts` (5 cases):

1. The drawer's first focusable (an anchor) does NOT receive focus
   on open (v2 default).
2. The drawer's first focusable (an input) does NOT receive focus
   on open when `autoFocus` is unset.
3. With `autoFocus: true`, the first focusable (input) IS focused.
4. With `autoFocus: true` and an anchor before a button, the
   anchor IS focused (the first focusable wins).
5. With `autoFocus: true` and no focusable descendants, the dialog
   body itself receives focus (`tabIndex = -1` set on the body).

---

## End-to-end verification

In the consumer's browser (Playwright + real Chromium, `localhost:8000/tablero`):

Before the fix:
```
After setOpen(true) on support-drawer:
activeElement.tag = 'A'
activeElement.href = 'https://wa.me/525568268329'
activeElement.text = 'Whatsapp 55 8268 6329'
activeIsInDrawer = true
```

After the fix:
```
After setOpen(true) on support-drawer:
activeElement.tag = 'BODY'
activeIsInDrawer = false
```

The first link is no longer auto-focused. The drawer opens
without visually "highlighting" any element.

---

## Impact

- **Affected surface**: every consumer whose drawer's first
  focusable descendant is a link, button, or form field. Common
  case for support / contact drawers (the WhatsApp / phone links
  are usually the first interactive elements).
- **Severity rationale**: the user sees a focus ring on a link
  they haven't clicked. It's visually distracting but does not
  block interactions. Screen-reader users hear the link
  announced on every drawer open, which is noisy.
- **Detection**: open any drawer whose first focusable is a link,
  inspect the focused element.
- **Workaround before the fix**: in the consumer's CSS, add a
  `* { outline: none; }` rule (also removes keyboard focus
  indicators — bad for accessibility). Cosmetic only — the bug
  is in the package's runtime.