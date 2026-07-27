# Bug: drawer id collides with inner HTML id (breaks Forms.newForm and similar id lookups)

**Filed**: 2026-07-26
**Reporter**: easytrip project (Laravel 12, consumer of `@samline/drawer`)
**Status**: ✅ **Closed** — fixed in this commit.
**Severity**: High (silently breaks the consumer's form initialization
on `/empresas`; the form's `onAnimationEnd` callback can't bind to the
form because `getElementById` resolves the wrong element)
**Affected versions**: `@samline/drawer@3.0.0-beta.0` … `3.0.0-beta.3`
**Fixed by**: removing the `id` from both the content and the host;
exposing the runtime id as a `data-drawer-id` attribute on the content
(metadata attribute, cannot collide with any element's `id`).

---

## TL;DR

The runtime used to place the drawer's `id` on the `[data-drawer]`
content element for "CSS/JS selector compat". When the consumer's
content HTML contained any element with the same id (the most
common case: a `<form id="myDrawer">` rendered inside the drawer),
`document.getElementById('myDrawer')` returned the drawer's content
`<div>` instead of the form. The form controller (and any other
consumer code that looked up the form by id) silently failed to
bind, and the form's initialization was a no-op.

In the consumer, this manifested as: the `/empresas` contact drawer
opens, but the email pre-fill (from the hero form) does not happen,
the phone format is not applied, the validators are not registered.
The user reports the form is "broken" (no validation, no formatting,
no pre-fill) even though the drawer itself opens.

---

## Steps to reproduce

1. Install `@samline/drawer@3.0.0-beta.3` in any consumer.
2. Create a drawer with content that has an inner element with the
   SAME id as the drawer. The most common pattern: a `<form id="myDrawer">`
   rendered inside the drawer.
3. Open the drawer.
4. In the consumer code, call `document.getElementById('myDrawer')`
   (or any wrapper like `Forms.newForm({ id: 'myDrawer' })` which
   internally does `getElementById`).
5. **Expected**: the form is returned.
6. **Actual (pre-fix)**: the drawer's content `<div>` is returned
   (it comes first in tree order, so `getElementById` resolves to
   it). The form controller binds to the wrong element, the form's
   `state.element` becomes the content div, and
   `getNamedFields(state.element)` finds no `<input name=...>` /
   `<select name=...>` / `<textarea name=...>` at the top level
   (the form is one level deeper, so `querySelectorAll` from the
   div would find them — but `resolveFormElement` rejects the div
   because it is not an `HTMLFormElement`, and returns `null`).

The exact consumer code (easytrip):

```js
window.Drawer.newDrawer({
  id: 'header-contact-drawer-form-header-contact',  // <-- drawer's id
  html: drawerHtml,  // <-- contains <form id="header-contact-drawer-form-header-contact">
  options: { ... }
})
```

And the form blade (rendered into `drawerHtml`):

```blade
<x-form :id="$id" ...>  <-- same id as the drawer
  <input name="email" ... />
  ...
</x-form>
```

`getElementById('header-contact-drawer-form-header-contact')` returns
the drawer's content `<div>` (the outer element) instead of the form.
`Forms.newForm({ id: 'header-contact-drawer-form-header-contact' })`
then creates a controller with `state.element = null` (because the
content div is not an `HTMLFormElement`). `getValue('email')` returns
`undefined`. The pre-fill, validators, and formats are no-ops.

---

## Root cause

`src/vanilla/dialog.ts#mountVanillaDialog` (around line 1799):

```ts
const content = createEl('div', {
  'data-drawer': '',
  // ...
})
// Place the drawer id on the [data-drawer] content wrapper for CSS/JS selector compat.
content.id = id
```

The id is placed on the content for "CSS/JS selector compat" — a
convenience feature so consumers can target the drawer via
`#myDrawer` in CSS. The package's own CSS uses `[data-drawer]`
(which is unique per drawer), so the package does not need the id.
The convenience is the only reason the id is on the content.

When the consumer's content HTML has an element with the same id
(common in form-heavy drawers), the two elements share the id and
`getElementById` resolves the wrong one.

The first attempted fix (placing the id on the host element instead
of the content) did not work: the host is also in the DOM, and
`getElementById` returns the host (which still wins on tree order).
The actual fix is to NOT place the id on either element — use a
metadata attribute (`data-drawer-id`) on the content instead, which
is not an `id` and cannot collide with anything.

---

## Fix

`src/vanilla/dialog.ts#mountVanillaDialog`:

```ts
// (no `content.id = id` anymore)
// (no `host.id = id` anymore either — the host's existing id is preserved)
content.setAttribute('data-drawer-id', id)
```

The consumer migrates to:

- `[data-drawer-id="myDrawer"]` to target the content (replaces `#myDrawer`).
- `[data-drawer-vanilla-root="myDrawer"]` to target the host (this
  attribute was already there).
- `[data-drawer]` to target the content (this attribute was already there).

The `data-drawer-id` attribute is the migration path. It is set on
the content element so the consumer can write a CSS rule like
`[data-drawer-id="myDrawer"] .my-class` to style the drawer.

---

## End-to-end verification

Real Chromium (Playwright) against the consumer's `/empresas` page
(direction: 'right', form has the same id as the drawer):

| field | pre-fix | post-fix |
| ----- | ------- | -------- |
| `cf.element` | `null` (form controller bound to nothing) | `<form id="header-contact-drawer-form-header-contact">` |
| `cf.getValue('email')` | `undefined` | `'test@example.com'` (pre-filled from the hero form) |
| `<input name="email">` value | `''` (empty) | `'test@example.com'` |
| `<input name="phone">` formatter | not applied (controller is `null`) | applied (MX, dashes) |
| Validators registered | none | `email`, `phone`, `rfc`, `tags_number` |

The post-fix behavior matches the v2 vaul behavior the consumer
expects: the form initializes, the email pre-fills, the phone
formats, the validators register.

---

## Regression tests

- `test/drawer-id-collision.test.ts` (5 cases) — static assertions
  on the content's `id` (must be empty), the host's `id` (must be
  empty unless the consumer provided one), the `data-drawer-id`
  attribute on the content, the form/descendant id resolution, and
  the consumer-provided `mountElement` id preservation.

---

## Consumer migration

The consumer does not need to change anything. The form blade still
uses `:id="$id"` (the drawer's id) and the form controller's
`getElementById` now correctly returns the form. The only observable
change for the consumer is that the `id` attribute is no longer on
the drawer's content — if the consumer had any CSS rule targeting
`#myDrawer` for the drawer's content, it would need to be updated to
`[data-drawer-id="myDrawer"]` (or `[data-drawer-vanilla-root="myDrawer"] [data-drawer]`
for the host-relative content). The easytrip consumer does not have
such rules (it uses classNames), so the migration is transparent.
