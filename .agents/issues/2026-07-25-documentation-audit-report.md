# `@samline/drawer` — Documentation Audit Report

**Date**: 2026-07-25
**Auditor**: sub-agent (verifier)
**Scope**: `docs/` (the markdown reference; the `example/` Starlight site is being built in parallel)
**Package version**: `3.0.0-beta.3`

---

## Summary

- **Total gaps found**: 21
- **P0 (must fix before stable / before Starlight site consumes)**: 7
- **P1 (should fix)**: 10
- **P2 (nice to have)**: 4

### Headline findings (P0)

1. **`closeButton` is missing from the public docs.** Mentioned only in `README.md`. Not in `options.md`, `typescript.md`, `api/`, or `css-styling.md` — even though it is a real `VanillaDrawerOptions` field that renders a real `[data-drawer-close]` DOM node.
2. **Numeric constants are documented as importable from `@samline/drawer`, but they are not re-exported from the root entrypoint.** `typescript.md` shows `import { TRANSITIONS, VELOCITY_THRESHOLD, CLOSE_THRESHOLD } from '@samline/drawer'`, which fails typecheck and runtime. They live in `src/constants.ts` but are not in the public exports.
3. **`docs/browser.md` and `docs/css-styling.md` claim the IIFE bundle "injects a `<style data-drawer-runtime-styles>` element" — it does not.** The IIFE is a pure JS bundle; CSS is shipped as `dist/style.css` and must be linked separately. The mention in both `docs/browser.md:25` and `docs/css-styling.md:13` is fabricated.
4. **`titleVisuallyHidden` auto-hide behavior (Bug D in v3-vs-v2 audit) is not in `options.md`.** The docs describe only the `true` case, not the auto-hide when the title was promoted from `ariaLabel`.
5. **The closed-overlay `pointer-events: none` rule is not in `docs/css-styling.md`.** It is the central fix for the click-capture regression called out in the v3-vs-v2 audit and is mentioned only in `README.md`.
6. **Six data attributes the runtime writes are not in `docs/css-styling.md`**: `[data-drawer-handle-hitarea]`, `[data-drawer-vanilla-node]`, `[data-drawer-close]`, `[data-drawer-close-icon]`, `[data-drawer-delayed-snap-points]`, `[data-drawer-custom-container]`.
7. **`README.md` has no "What you can build" section** — `forms/README.md` and `notify/README.md` do. See the proposed bullet list in §9.

### Other findings (P1 / P2)

- The README mentions an "Inferred" `pointer-events: none` only in the lifecycle section, never as a CSS contract.
- `onActiveSnapPointChange` is the user's audit item but is **not a public callback** — it is only an internal parameter to `mountVanillaDrawer`. Should be removed from the audit checklist (or noted as "internal").
- The `BORDER_RADIUS` constant is declared in `src/constants.ts` but never used; the docs describe a use that does not exist.
- The `DRAG_CLASS` constant is declared but never added to any element; the class `drawer-dragging` is never set anywhere in code.
- `data-drawer-vanilla-trigger` and `data-drawer-wrapper` are mentioned in passing in `css-styling.md` but not formally documented as part of the contract.

---

## 1. `CommonDrawerOptions` gaps

The full `CommonDrawerOptions` shape is in `src/core/index.ts:7-72`. Every field has a row in `docs/options.md:62-90`. All 29 fields are present.

| Field                       | Documented?                | Status                                                                                            |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| `id`                        | yes — `docs/options.md:62` | complete                                                                                          |
| `parentId`                  | yes — `docs/options.md:63` | complete                                                                                          |
| `open`                      | yes — `docs/options.md:64` | complete (JSDoc in `core/index.ts:8-37` is more detailed than the doc row, but not contradictory) |
| `defaultOpen`               | yes — `docs/options.md:65` | complete (description is brief; see P2 #1 below)                                                  |
| `onOpenChange`              | yes — `docs/options.md:66` | complete                                                                                          |
| `onClose`                   | yes — `docs/options.md:67` | complete                                                                                          |
| `onAnimationEnd`            | yes — `docs/options.md:68` | complete                                                                                          |
| `onDragChange`              | yes — `docs/options.md:69` | complete                                                                                          |
| `onReleaseChange`           | yes — `docs/options.md:70` | complete                                                                                          |
| `dismissible`               | yes — `docs/options.md:71` | complete                                                                                          |
| `modal`                     | yes — `docs/options.md:72` | complete                                                                                          |
| `nested`                    | yes — `docs/options.md:73` | complete                                                                                          |
| `direction`                 | yes — `docs/options.md:74` | complete                                                                                          |
| `snapPoints`                | yes — `docs/options.md:75` | complete                                                                                          |
| `fadeFromIndex`             | yes — `docs/options.md:76` | complete                                                                                          |
| `activeSnapPoint`           | yes — `docs/options.md:77` | complete                                                                                          |
| `closeThreshold`            | yes — `docs/options.md:78` | complete                                                                                          |
| `scrollLockTimeout`         | yes — `docs/options.md:79` | complete (marked "Reserved / currently inert" — accurate)                                         |
| `shouldScaleBackground`     | yes — `docs/options.md:80` | complete                                                                                          |
| `setBackgroundColorOnScale` | yes — `docs/options.md:81` | complete                                                                                          |
| `handleOnly`                | yes — `docs/options.md:82` | complete                                                                                          |
| `fixed`                     | yes — `docs/options.md:83` | complete                                                                                          |
| `disablePreventScroll`      | yes — `docs/options.md:84` | complete (marked "Reserved / currently inert" — accurate)                                         |
| `repositionInputs`          | yes — `docs/options.md:85` | complete                                                                                          |
| `snapToSequentialPoint`     | yes — `docs/options.md:86` | complete                                                                                          |
| `preventScrollRestoration`  | yes — `docs/options.md:87` | complete                                                                                          |
| `noBodyStyles`              | yes — `docs/options.md:88` | complete                                                                                          |
| `autoFocus`                 | yes — `docs/options.md:89` | complete                                                                                          |
| `preventCycle`              | yes — `docs/options.md:90` | complete                                                                                          |

**Field-level summary: no CommonDrawerOptions field is missing from `options.md`.**

### P2 — minor wording / completeness

- **`defaultOpen` description is misleading.** Current text: "Initial open state when the drawer is created without `open`. Skips the enter animation." But the runtime computes `state.isOpen = Boolean(options.open ?? options.defaultOpen)` (`src/core/index.ts:108`), and the `open: true` path is what skips the enter animation per the JSDoc. Suggested rewording:

  > Default: `false`. When `open` is `undefined`, controls whether the drawer mounts in the open state. **Does not skip the open animation** — that only happens with `open: true` (see [`open`](#open)). The `defaultOpen` path is useful for SSR-friendly initial state where the drawer's open/close animation should still play.

---

## 2. `VanillaDrawerOptions` gaps

`VanillaDrawerOptions` extends `CommonDrawerOptions` and adds 16 fields. The vanilla-only table lives in `docs/options.md:99-115`.

| Field                       | Documented?                 | Status                                                                                                                                                                                                                                          |
| --------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mountElement`              | yes — `docs/options.md:100` | complete                                                                                                                                                                                                                                        |
| `triggerElement`            | yes — `docs/options.md:101` | complete                                                                                                                                                                                                                                        |
| `triggerText`               | yes — `docs/options.md:102` | complete                                                                                                                                                                                                                                        |
| `showHandle`                | yes — `docs/options.md:103` | complete                                                                                                                                                                                                                                        |
| `handleClassName`           | yes — `docs/options.md:104` | complete                                                                                                                                                                                                                                        |
| `ariaLabel`                 | yes — `docs/options.md:105` | **P1 — partial** (no mention of the `ariaLabel → [data-drawer-title]` proxy/auto-hide behaviour; the README covers it but `options.md` does not)                                                                                                |
| `ariaLabelledBy`            | yes — `docs/options.md:106` | complete                                                                                                                                                                                                                                        |
| `ariaDescribedBy`           | yes — `docs/options.md:107` | complete                                                                                                                                                                                                                                        |
| `title`                     | yes — `docs/options.md:108` | complete                                                                                                                                                                                                                                        |
| `titleVisuallyHidden`       | yes — `docs/options.md:109` | **P0 — partial** (no mention of the auto-hide when title is promoted from `ariaLabel`; the README has the full explanation under "Title slot" but `options.md` is silent. This is the same behaviour called out as Bug D in the v3-vs-v2 audit) |
| `description`               | yes — `docs/options.md:110` | complete                                                                                                                                                                                                                                        |
| `descriptionVisuallyHidden` | yes — `docs/options.md:111` | complete                                                                                                                                                                                                                                        |
| `content`                   | yes — `docs/options.md:112` | complete                                                                                                                                                                                                                                        |
| `overlayClassName`          | yes — `docs/options.md:113` | complete                                                                                                                                                                                                                                        |
| `contentClassName`          | yes — `docs/options.md:114` | complete                                                                                                                                                                                                                                        |
| `closeButton`               | **NO**                      | **P0 — missing entirely** (defined in `src/vanilla/render.ts:67-103`; rendered as `<button data-drawer-close>` with `<span data-drawer-close-icon>`; mentioned in `README.md:199-217` only)                                                     |

### P0 — add `closeButton` to `docs/options.md` and `docs/css-styling.md`

**File**: `docs/options.md` (after `contentClassName`, ~line 115)
**File**: `docs/typescript.md` (add a `VanillaCloseButtonOptions` section; see §4)
**File**: `docs/css-styling.md` (add a `[data-drawer-close]` row; see §7)
**File**: `docs/typescript.md` (add `VanillaCloseButtonOptions` to the imports list)

Proposed row for the vanilla-only table:

```md
| `closeButton` | `boolean \| VanillaCloseButtonOptions` | `false` | When set, the package renders a built-in `<button data-drawer-close>` inside the drawer (between the title slot and the body) and wires it to `onOpenChange(false)`. Pass `true` for the default button or an object to override `className`, `icon`, and `ariaLabel`. The button's `click` event does not bubble to the drawer's content. See [docs/typescript.md](./typescript.md#vanillaclosebuttonoptions) for the full type contract. |
```

### P0 — extend `titleVisuallyHidden` row to describe the auto-hide

**File**: `docs/options.md:109`

Current text:

> When `true`, the title slot is rendered with the visually-hidden style (still announced to screen readers).

Proposed replacement (incorporates the auto-hide from `src/vanilla/render.ts:51-65`):

> When `true`, the title slot is rendered with the visually-hidden style (still announced to screen readers). The default is `false`, **but** the package auto-hides the slot when the title was auto-promoted from `ariaLabel` (a "proxy" title) — the proxy is an accessibility target, not visual content. Pass `false` explicitly to override the auto-hide and render the slot visibly even when only `ariaLabel` is set.

### P1 — extend `ariaLabel` row with the proxy/auto-promotion behaviour

**File**: `docs/options.md:105`

Current text:

> Accessible label for the dialog. Used when no `title` slot is provided.

Proposed replacement (incorporates the JSDoc at `src/vanilla/render.ts:38-49`):

> Accessible label for the dialog. When set without a `title`, the package auto-promotes the value into the `[data-drawer-title]` slot for the `aria-labelledby` reference and **auto-hides the slot** (so the a11y text does not leak into the visual drawer). Pass `titleVisuallyHidden: false` to render the slot visibly. Consumers who want a visible title should pass `title: '...'` and use `ariaLabel` for a separate a11y label, or omit `ariaLabel` and rely on the visible title.

---

## 3. Public methods — per-page API reference

All 13 public methods have a `docs/api/<name>.md` page. Every page has `## Signature`, `## Example`, and `## Related` sections.

| Method                   | Has page?                                    | Has signature? | Has example? | Has related? |
| ------------------------ | -------------------------------------------- | -------------- | ------------ | ------------ |
| `createDrawer`           | yes — `docs/api/create-drawer.md`            | yes            | yes          | yes          |
| `configureDrawer`        | yes — `docs/api/configure-drawer.md`         | yes            | yes          | yes          |
| `getDrawer`              | yes — `docs/api/get-drawer.md`               | yes            | yes          | yes          |
| `getDrawers`             | yes — `docs/api/get-drawers.md`              | yes            | yes          | yes          |
| `getParentDrawer`        | yes — `docs/api/get-parent-drawer.md`        | yes            | yes          | yes          |
| `getChildDrawers`        | yes — `docs/api/get-child-drawers.md`        | yes            | yes          | yes          |
| `updateDrawer`           | yes — `docs/api/update-drawer.md`            | yes            | yes          | yes          |
| `openDrawer`             | yes — `docs/api/open-drawer.md`              | yes            | yes          | yes          |
| `closeDrawer`            | yes — `docs/api/close-drawer.md`             | yes            | yes          | yes          |
| `toggleDrawer`           | yes — `docs/api/toggle-drawer.md`            | yes            | yes          | yes          |
| `destroyDrawer`          | yes — `docs/api/destroy-drawer.md`           | yes            | yes          | yes          |
| `destroyDrawers`         | yes — `docs/api/destroy-drawers.md`          | yes            | yes          | yes          |
| `createDrawerController` | yes — `docs/api/create-drawer-controller.md` | yes            | yes          | yes          |

**No public method is missing a dedicated page.** No P0/P1/P2 findings in this section.

---

## 4. Exported types — `docs/typescript.md` coverage

| Type                        | Documented in `typescript.md`?    | Status                                                                                                                                              |
| --------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CommonDrawerDirection`     | yes — `typescript.md:32-36`       | complete                                                                                                                                            |
| `CommonDrawerSnapPoint`     | yes — `typescript.md:39-44`       | complete                                                                                                                                            |
| `CommonDrawerId`            | yes — `typescript.md:47-50`       | complete                                                                                                                                            |
| `CommonDrawerOptions`       | yes — `typescript.md:52-77`       | complete (full interface shown)                                                                                                                     |
| `CommonDrawerState`         | yes — `typescript.md:80-88`       | complete                                                                                                                                            |
| `CommonDrawerSnapshot`      | yes — `typescript.md:91-96`       | complete                                                                                                                                            |
| `CommonDrawerController`    | yes — `typescript.md:113-126`     | complete                                                                                                                                            |
| `VanillaDrawerController`   | yes — `typescript.md:129-144`     | complete (id, element, options, update, destroy — the inherited methods are noted in the lead sentence at `113`)                                    |
| `VanillaDrawerOptions`      | yes — `typescript.md:147-164`     | complete                                                                                                                                            |
| `VanillaRenderable`         | yes — `typescript.md:167-171`     | complete                                                                                                                                            |
| `VanillaCloseButtonOptions` | **NO**                            | **P0 — missing entirely** (defined in `src/vanilla/render.ts:105-114`; the close-button feature is documented in README but not in `typescript.md`) |
| `DrawerApi` (browser)       | partial — `typescript.md:222-247` | **P2** — present but not in the import list at `typescript.md:14-26`; the type itself and the declaration example are correct                       |

### P0 — add `VanillaCloseButtonOptions` to `typescript.md`

**File**: `docs/typescript.md`

Add to the imports list at `typescript.md:14-26`:

```ts
import type {
  // ...existing types...
  VanillaCloseButtonOptions
} from '@samline/drawer'
```

Add a new section after `VanillaRenderable` (after `typescript.md:171`):

````md
### `VanillaCloseButtonOptions`

The shape of the object accepted by `VanillaDrawerOptions.closeButton`. Defined in `src/vanilla/render.ts`.

```ts
interface VanillaCloseButtonOptions {
  className?: string
  icon?: string | HTMLElement
  ariaLabel?: string
}
```

- `className` — class applied to the button. The consumer can use it to position the button (e.g. `absolute top-5 right-5`).
- `icon` — icon content. A string is rendered as text inside a `<span aria-hidden="true">`. An `HTMLElement` is appended as-is. Defaults to the literal `x` glyph.
- `ariaLabel` — accessible label for the button. Defaults to `'Close'`.

The full mount lifecycle of the button is in [docs/options.md](./options.md#vanilla-only-options) under `closeButton`.
````

### P2 — add `DrawerApi` to the import list

**File**: `docs/typescript.md:14-26`

The interface is shown later at `typescript.md:234` but is not in the top-level imports list. Add it for consistency.

---

## 5. Controller methods — coverage in `typescript.md`

`VanillaDrawerController` has 9 members: `id`, `element`, `options`, `getSnapshot`, `setOpen`, `setActiveSnapPoint`, `patch`, `subscribe`, `update`, `destroy`. (`update` and `destroy` are vanilla-only; the others are inherited from `CommonDrawerController`.)

| Member                 | Documented where?                                                    | Status                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `id` (getter)          | `typescript.md:140`                                                  | complete (bullet)                                                                                                                            |
| `element` (getter)     | `typescript.md:141`                                                  | complete (bullet)                                                                                                                            |
| `options` (getter)     | `typescript.md:142`                                                  | complete (bullet)                                                                                                                            |
| `getSnapshot()`        | `typescript.md:118` (in interface) + `255-263` (subscribing section) | complete (shown in interface, then explained in the subscribing section, but not as a bullet under `VanillaDrawerController` — see P2 below) |
| `setOpen()`            | `typescript.md:119` (interface), `126`                               | complete (mentioned at `126` as "return the new snapshot")                                                                                   |
| `setActiveSnapPoint()` | `typescript.md:120` (interface), `126`                               | complete                                                                                                                                     |
| `patch()`              | `typescript.md:121` (interface), `126`                               | complete (mentioned at `126` as "merges the partial into the existing options")                                                              |
| `subscribe()`          | `typescript.md:122` (interface), `126`, `255-263`                    | complete (full subscribe example in the section at `255-263`)                                                                                |
| `update()`             | `typescript.md:135, 143`                                             | complete (bullet)                                                                                                                            |
| `destroy()`            | `typescript.md:136, 144`                                             | complete (bullet)                                                                                                                            |

### P2 — `getSnapshot`/`setOpen`/`setActiveSnapPoint`/`patch` are not bullet-pointed under `VanillaDrawerController`

The bullets at `typescript.md:140-144` cover the vanilla-only extras (`id`, `element`, `options`, `update`, `destroy`) but do not list the inherited methods. The lead sentence at `typescript.md:113` says "extends this with the DOM-aware helpers" which is fine, but readers may want a one-line summary for each inherited method too.

Optional addition to `typescript.md:140-144`:

```md
- `getSnapshot()` — read the current state without subscribing. Returns the same shape as `subscribe` listeners.
- `setOpen(open)` — drive the open state programmatically. Returns the new snapshot. Equivalent to the imperative `openDrawer(id)` / `closeDrawer(id)` helpers.
- `setActiveSnapPoint(snap)` — jump to a snap point. Returns the new snapshot.
- `patch(options)` — merge a partial set of options. Returns the new snapshot. Triggers a re-render.
```

(No P0/P1 here — the interface and the section at `126` already cover these. This is a readability improvement.)

---

## 6. Numeric constants — `docs/typescript.md` coverage

All 9 named constants from `src/constants.ts` are present in the `Numeric constants` table at `docs/typescript.md:197-205`. **However**, the table is followed by an import example that does not work — see P0 below.

| Constant               | Documented? | Value                | Used in source?                                                                                                      | Status                                                                                |
| ---------------------- | ----------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `TRANSITIONS.DURATION` | yes         | `0.5`                | yes — `src/runtime/registry.ts:145`                                                                                  | complete                                                                              |
| `TRANSITIONS.EASE`     | yes         | `[0.32, 0.72, 0, 1]` | yes (CSS / runtime)                                                                                                  | complete                                                                              |
| `VELOCITY_THRESHOLD`   | yes         | `0.4`                | yes (drag pipeline)                                                                                                  | complete                                                                              |
| `CLOSE_THRESHOLD`      | yes         | `0.25`               | yes (drag pipeline)                                                                                                  | complete                                                                              |
| `SCROLL_LOCK_TIMEOUT`  | yes         | `100`                | yes — `src/vanilla/dialog.ts:903`                                                                                    | complete (also: option `scrollLockTimeout` in `CommonDrawerOptions` falls back to it) |
| `BORDER_RADIUS`        | yes         | `8`                  | **NO** — declared in `src/constants.ts:12` but never imported anywhere                                               | **P1 — description in `typescript.md:202` is fabricated**                             |
| `NESTED_DISPLACEMENT`  | yes         | `16`                 | yes — `src/vanilla/dialog.ts`                                                                                        | complete                                                                              |
| `WINDOW_TOP_OFFSET`    | yes         | `26`                 | yes — `src/vanilla/dialog.ts:1692` (passed to `isMobileFirefox` layout helper)                                       | complete                                                                              |
| `DRAG_CLASS`           | yes         | `'drawer-dragging'`  | **NO** — declared in `src/constants.ts:18`, never added to any element, no `drawer-dragging` selector in `style.css` | **P1 — dead code, but docs claim "Reserved"**                                         |

### P0 — constants are not re-exported from `@samline/drawer`

`docs/typescript.md:208-212` shows:

```ts
import { TRANSITIONS, VELOCITY_THRESHOLD, CLOSE_THRESHOLD } from '@samline/drawer'

console.log(TRANSITIONS.DURATION) // 0.5
console.log(VELOCITY_THRESHOLD) // 0.4
console.log(CLOSE_THRESHOLD) // 0.25
```

`src/index.ts:1-22` does not re-export anything from `src/constants.ts`. The dist `index.d.ts` and `index.d.cts` confirm: there is no `TRANSITIONS` export. The import above fails at typecheck and at runtime.

Fixes (pick one):

- **(a) Re-export from the root entrypoint** — add `export { TRANSITIONS, VELOCITY_THRESHOLD, CLOSE_THRESHOLD, SCROLL_LOCK_TIMEOUT, BORDER_RADIUS, NESTED_DISPLACEMENT, WINDOW_TOP_OFFSET, DRAG_CLASS } from './constants'` to `src/index.ts`. This matches the docs and is the more useful path.
- **(b) Update the docs** — change the import in `typescript.md:208` to either import from a deeper path (`@samline/drawer/dist/constants`) or remove the import example entirely. (This is not really a public path, so (a) is the right call.)

### P1 — `BORDER_RADIUS` and `DRAG_CLASS` are dead code

- `BORDER_RADIUS = 8` is declared in `src/constants.ts:12` and never imported anywhere. The description in `typescript.md:202` ("Pixel value the scale-background pipeline uses for the page-shell border-radius at `percentageDragged = 0`") describes a use that does not exist in the source.
- `DRAG_CLASS = 'drawer-dragging'` is declared in `src/constants.ts:18`, but the class is never added to any element by the runtime and the stylesheet has no `[data-drawer].drawer-dragging` rule. The description in `typescript.md:205` is just "Reserved."

**Recommendation**: remove both from `src/constants.ts` AND from the `typescript.md` table (rows `202` and `205`). They are not part of the public contract.

If they need to be kept for forward-compatibility (a planned feature), the docs should make that explicit ("Reserved for the future drag-state class on `[data-drawer]` — currently unused").

---

## 7. Data-attribute contract — coverage in `docs/css-styling.md`

### Attributes in source but missing from `css-styling.md`

| Attribute                         | Where in code                                              | Status                                                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-drawer-handle-hitarea`      | `src/vanilla/dialog.ts:1529`                               | **P0** — undocumented                                                                                                                                                                    |
| `data-drawer-vanilla-node`        | `src/vanilla/dialog.ts:1539`                               | **P0** — undocumented                                                                                                                                                                    |
| `data-drawer-close`               | `src/vanilla/dialog.ts:708`                                | **P0** — undocumented (close-button feature)                                                                                                                                             |
| `data-drawer-close-icon`          | `src/vanilla/dialog.ts:713, 718`                           | **P0** — undocumented                                                                                                                                                                    |
| `data-drawer-delayed-snap-points` | `src/vanilla/dialog.ts:1491` (and `src/style.css:57-71`)   | **P0** — undocumented (set to `'false'` on every mount; the stylesheet expects it for snap-point transforms)                                                                             |
| `data-drawer-custom-container`    | `src/vanilla/dialog.ts:1492` (and `src/style.css:105-107`) | **P0** — undocumented                                                                                                                                                                    |
| `data-drawer-no-drag`             | `src/runtime/drag-policy.ts:71`                            | **P0** — undocumented in `css-styling.md` (it IS mentioned in `recipes.md:328`, `browser.md:73`, `getting-started.md:113`, `vanilla.md:92` — but as a behavior note, not a CSS contract) |

### Attribute in docs but NOT in source

| Attribute                    | Status                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-drawer-runtime-styles` | **P0 — fabricated** — `docs/browser.md:25` and `docs/css-styling.md:13` both claim the IIFE bundle injects a `<style data-drawer-runtime-styles>` element on load. It does not. `dist/browser/global.global.js` has zero occurrences of this attribute, and `src/browser/global.ts:48-66` only assigns `window.Drawer`. The CSS is shipped as `dist/style.css` and must be linked separately. |

### P0 — fix the fabricated `data-drawer-runtime-styles` claim

**File**: `docs/browser.md:24-26` and `docs/css-styling.md:12-15`

Current (incorrect):

> The IIFE bundle (`@samline/drawer/browser`) inlines the stylesheet — when you load the script, the runtime injects a `<style data-drawer-runtime-styles>` element into the page with the same content. You do not need a separate `<link rel="stylesheet">`.

Corrected (per `docs/browser.md:32-33`, which is the right pattern):

> The IIFE bundle is a pure JS bundle — it does **not** include the stylesheet. Link the CSS separately:
>
> ```html
> <link rel="stylesheet" href="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/style.css" />
> <script src="https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js"></script>
> ```
>
> The browser bundle only attaches `window.Drawer` and the JS-side mounts. It does not inject any `<style>` element.

### P0 — document the missing data attributes

**File**: `docs/css-styling.md`

Add to the appropriate section. Proposed additions:

```md
### `[data-drawer-handle-hitarea]` — the handle's touch target

Always mounted alongside `[data-drawer-handle]`. A 44px × 44px (`max(100%, 2.75rem)`) transparent touch target that makes the handle comfortable to hit on touch devices. Does not style — only expands the hit area.

### `[data-drawer-vanilla-node]` — the content node slot

A wrapper that contains the title, description, close button, and body slots. Mounted inside `[data-drawer]` between the handle and the `[data-drawer-vanilla-body]` body slot. Consumers can use it to style the inner card.

### `[data-drawer-close]` — the built-in close button (optional)

Mounted when `closeButton: true` (or an object). The button is wired to `onOpenChange(false)` so it dismisses the drawer without the consumer writing a click listener. The button's `click` event `stopPropagation()`s so it does not bubble to the content.

| Attribute           | Values         | When                      |
| ------------------- | -------------- | ------------------------- |
| `data-drawer-close` | always present | when `closeButton` is set |

The icon is wrapped in `<span data-drawer-close-icon aria-hidden="true">`. The consumer can target the icon via that selector to swap the glyph (e.g. with a CSS `::before` content rule) without touching the button's `aria-label`.

### `data-drawer-delayed-snap-points` and `data-drawer-custom-container`

The runtime sets these to `'false'` on the content wrapper at mount. They exist as part of the contract for parity with the upstream Vaul data-attribute set:

- `data-drawer-delayed-snap-points='false'` — the drawer's snap-point math is computed at open time, not deferred. The stylesheet selectors `[data-drawer-delayed-snap-points='true']` (in `src/style.css:57-71`) target a deferred mode that this package does not enable; the runtime always writes `'false'`.
- `data-drawer-custom-container='false'` — the runtime does not allow the consumer to opt out of the `::after` element the stylesheet adds. The selectors in `src/style.css:105-141` always apply.

These attributes are part of the runtime contract but not user-configurable. Documenting them prevents consumers from being surprised when they inspect the DOM.

### `data-drawer-no-drag` — opt-out marker for descendants

Set on any descendant of `[data-drawer]` that should not start a drag gesture (e.g. an input, a scrollable list, a button). The drag pipeline (`src/runtime/drag-policy.ts:71`) walks up from the pointer target and refuses to start a drag if it finds this attribute on the target or any ancestor. The stylesheet does not style this attribute — it is a behavior marker, not a visual one.
```

### P1 — `data-drawer-vanilla-trigger` and `data-drawer-wrapper` are mentioned but not formally in the contract table

- `data-drawer-vanilla-trigger` appears in the table at `docs/css-styling.md:35-36` (1-line mention). Could expand to a full sub-section like the handle.
- `data-drawer-wrapper` appears in `docs/css-styling.md:122-126` (in the "Scale the page shell" example). The consumer-facing description in `options.md:80` ("the element with `data-drawer-wrapper`") is fine, but `css-styling.md` does not have a dedicated section explaining it is the **consumer's** element, not something the runtime writes.

Optional addition:

```md
### `data-drawer-wrapper` — the consumer's page shell (consumer-set)

This is the only `data-drawer-*` attribute the **consumer** sets. Add it to the page shell that should scale behind the drawer when `shouldScaleBackground: true` is set. The runtime reads it (`src/runtime/registry.ts:155`); it does not write it.
```

### P1 — `pointer-events: none` on the closed overlay

**File**: `docs/css-styling.md`

The `pointer-events: none` rule at `src/style.css:80-91` (on `[data-drawer-overlay][data-state='closed']`) is the central fix for the click-capture regression (Bug C in the v3-vs-v2 audit). The README mentions it at line 147 but `css-styling.md` does not.

Proposed addition (right after the "Disable the close animation" example at `docs/css-styling.md:106`):

````md
### Click-blocking on the closed overlay

The overlay mounts at create time with `data-state="closed"` and `opacity: 0`. Without an explicit `pointer-events` rule, the invisible overlay would still capture clicks (it sits at `position: fixed; inset: 0; z-index: 100` once you set those). The shared stylesheet disables pointer events on the closed state and re-enables them on the open state:

```css
[data-drawer-overlay][data-state='closed'] {
  pointer-events: none;
}
```
````

You usually do not need to override this. If you write your own overlay styles, set `pointer-events: auto` on the open state explicitly so the user can still click the overlay to dismiss.

````

---

## 8. Callback signature drift

The 6 user-audited callback options: `onOpenChange`, `onClose`, `onAnimationEnd`, `onDragChange`, `onReleaseChange`, `onActiveSnapPointChange`.

| Callback                  | Declared in                              | JSDoc signature                       | Docs signature (`options.md`)        | Drift? |
| ------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------------ | ------ |
| `onOpenChange`            | `src/core/index.ts:38`                   | `(open: boolean) => void`             | `(open: boolean) => void`            | none   |
| `onClose`                 | `src/core/index.ts:39`                   | `() => void`                          | `() => void`                         | none   |
| `onAnimationEnd`          | `src/core/index.ts:40`                   | `(open: boolean) => void`             | `(open: boolean) => void`            | none   |
| `onDragChange`            | `src/core/index.ts:41`                   | `(percentageDragged: number) => void` | `(percentageDragged: number) => void`| none   |
| `onReleaseChange`         | `src/core/index.ts:42`                   | `(open: boolean) => void`             | `(open: boolean) => void`            | none   |
| `onActiveSnapPointChange` | `src/vanilla/dialog.ts:102` (NOT in `CommonDrawerOptions` or `VanillaDrawerOptions`) | `(snapPoint: CommonDrawerSnapPoint \| null) => void` | **not in `options.md`**              | **P0 — should be removed from the audit; it is an internal callback, not a public option** |

### P0 — `onActiveSnapPointChange` is not a public option

The audit brief lists `onActiveSnapPointChange` under "callback signatures." The truth is:

- `onActiveSnapPointChange` is **not** part of `CommonDrawerOptions` (`src/core/index.ts:7-72` has no such field) and **not** part of `VanillaDrawerOptions` (`src/vanilla/render.ts:20-103` has no such field).
- It is a parameter on `mountVanillaDialog` (`src/vanilla/dialog.ts:102`) and `mountVanillaDrawer` (`src/vanilla/render.ts:140`), which are internal functions.
- The registry wires it internally at `src/runtime/registry.ts:279` to push the resolved snap point into the controller's `activeSnapPoint` and re-render.

There is no public way for a consumer to subscribe to "the snap point changed mid-drag." If such a feature is desired, it should be added to `CommonDrawerOptions` (probably as `onActiveSnapPointChange?: (snapPoint: CommonDrawerSnapPoint | null) => void`) and threaded through the registry. Until then, the audit should drop this item.

If the maintainer wants to add it as a public option, the path is:
1. Add `onActiveSnapPointChange?: (snapPoint: CommonDrawerSnapPoint | null) => void` to `CommonDrawerOptions` in `src/core/index.ts`.
2. Thread it through the registry (in `src/runtime/registry.ts:202-217`, where the dialog's `onActiveSnapPointChange` callback already routes to the controller's `setActiveSnapPoint` and calls `runtime.options.onActiveSnapPointChange?.(snapPoint)`).

---

## 9. README "What you can build" section

`README.md` does **not** have a "What you can build" section.

Both `forms/README.md:119-128` and `notify/README.md:114-124` have one. They sit between the "Quick Start" / "What this does" block and the "API at a Glance" table.

### P0 — add a "What you can build" section to `README.md`

**File**: `README.md` (insert between the existing `## Quick Start` block at line 88 and `## API at a Glance` at line 140)

Proposed section (parallel in shape to `forms/README.md:119` and `notify/README.md:114`):

```md
## What you can build

- Bottom sheets for mobile-style filters, sort menus, and quick actions.
- Side panels for settings, account, navigation, and cart drawers.
- Modal-style dialogs with snap points (e.g. peek → half → full) for product pickers or composer UIs.
- Nested drawers (a child drawer that follows a parent's lifecycle and scales the parent on drag) for things like "Account → Security" or "Filters → Sort".
- Modal drawers with a `data-drawer-wrapper` page shell that scales behind the drawer while it is open.
- Plain HTML pages, WordPress, Shopify, and classic templates via the `window.Drawer` IIFE bundle (no bundler needed).
- Headless state machines — `createDrawerController(options?)` returns the same observable state without a DOM, useful for tests or custom renderers.
- Mobile-keyboard-aware composers — pair `repositionInputs: true` with `fixed: true` to keep focused inputs above the keyboard.
- Any HMR-heavy Vite setup — the built-in `closeButton: true` option replaces the manual `document.addEventListener('click', ...)` pattern that accumulates stale listeners on hot reload.
````

---

## 10. CDN URL consistency

All 6 CDN URLs in the docs use `3.0.0-beta.3`:

| Location                   | URL                                                                            |
| -------------------------- | ------------------------------------------------------------------------------ |
| `README.md:50`             | `https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js` |
| `README.md:62`             | `https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js` |
| `docs/browser.md:32` (CSS) | `https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/style.css`                |
| `docs/browser.md:33` (JS)  | `https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js` |
| `docs/browser.md:43` (CSS) | `https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/style.css`                |
| `docs/browser.md:44` (JS)  | `https://unpkg.com/@samline/drawer@3.0.0-beta.3/dist/browser/global.global.js` |

`docs/options.md`, `docs/typescript.md`, `docs/getting-started.md`, `docs/vanilla.md`, `docs/recipes.md`, `docs/css-styling.md`, and `docs/api/*` do not mention a specific version in any URL.

**No P0/P1/P2 finding here.** The version is consistent.

Note: the example Starlight site has the same set of URLs (verified by grep on `example/src/content/docs/`). Same consistency.

---

## 11. Cross-doc consistency

### P2 — `mountElement` is not explained anywhere in prose

`docs/options.md:100` has the row:

> `mountElement` | `HTMLElement \| null` | `undefined` | Mount the host into a specific container instead of appending it to `document.body`.

This is the only mention. The `getter` and `getter.element` JSDoc in `src/runtime/registry.ts:18-21, 187-189` describe the same thing in different words. Not a drift — just a thin description.

### P2 — `triggerElement` vs `triggerText` trade-off

`docs/options.md:101-102` lists them as separate rows but does not explain the trade-off (when to use which). The README's "Entrypoints" section and `recipes.md:259-280` cover this in prose. Consider a one-line cross-reference from the table to the recipe.

### P2 — `noBodyStyles` description in `options.md:88` is slightly off

Current:

> When `true`, the runtime does not write `document.body.style.overflow` / `paddingRight` while the drawer is open.

The runtime also uses `body.style.overflow` only as the "modal open" lock (`src/vanilla/dialog.ts:903` mentions `SCROLL_LOCK_TIMEOUT` but I could not find the actual `body.style.overflow` write in this pass — the verification of the lock implementation is out of scope, but the docs should be checked against the actual code path). **This is a research/verify item, not a clear drift.**

### No drift on the major cross-references

- `createDrawer` is described consistently in `getting-started.md`, `options.md`, `typescript.md`, and `api/create-drawer.md`.
- `mountElement` / `triggerElement` / `triggerText` / `showHandle` all cross-reference correctly between `getting-started.md`, `vanilla.md`, `options.md`, and `recipes.md`.
- The lifecycle section (`getting-started.md:79-91`) matches the side-effects table (`getting-started.md:97-110`) matches the `close-drawer.md` description.
- `pointer-events: none` is mentioned in `README.md:147` and in `src/style.css:80-91` but not in `css-styling.md` (covered in §7).

---

## 12. Undocumented v3 features (cross-check against `.agents/issues/2026-07-25-v3-vs-v2-audit.md`)

The audit at `.agents/issues/2026-07-25-v3-vs-v2-audit.md` lists 4 uncommitted changes that need docs:

1. **`pointer-events: none` on the closed overlay** — currently only in `README.md:147` and `src/style.css:80-91`. **Missing from `docs/css-styling.md`** → covered as P0 in §7.
2. **`titleVisuallyHidden` auto-hide when promoted from `ariaLabel`** — `src/vanilla/render.ts:51-65` documents the behavior. The README "Title slot" section (`README.md:181-189`) covers it well. **Missing from `docs/options.md:109`** → covered as P0 in §2.
3. **`closeButton` option** — `src/vanilla/render.ts:67-103` defines it. The README "Built-in close button" section (`README.md:196-217`) covers it. **Missing from `docs/options.md`, `docs/typescript.md`, `docs/css-styling.md`, `docs/api/`.** → covered as P0 in §2 and §7.
4. **Mount-time lifecycle** — `README.md:140-169` has the full "Mount-time Lifecycle" section. Cross-checked; the section already covers the `pointer-events: none` behavior at point 1. **Sufficient.** No gap.

---

## Priority list

### P0 — must fix before the Starlight site consumes the docs

1. **Add `closeButton` to `docs/options.md`** (vanilla-only table) and `VanillaCloseButtonOptions` to `docs/typescript.md`. See §2 and §4.
2. **Fix the `data-drawer-runtime-styles` fabrication** in `docs/browser.md:25` and `docs/css-styling.md:13`. The IIFE does not inject a `<style>` element. See §7.
3. **Fix the constants import** in `docs/typescript.md:208` — `import { TRANSITIONS, … } from '@samline/drawer'` is not in the public exports. Either re-export from `src/index.ts` or rewrite the import example. See §6.
4. **Document the 6 missing data attributes** in `docs/css-styling.md`: `[data-drawer-handle-hitarea]`, `[data-drawer-vanilla-node]`, `[data-drawer-close]`, `[data-drawer-close-icon]`, `[data-drawer-delayed-snap-points]`, `[data-drawer-custom-container]`, and `[data-drawer-no-drag]`. See §7.
5. **Document the `pointer-events: none` rule** on the closed overlay in `docs/css-styling.md` (it is the central fix for the click-capture regression). See §7.
6. **Extend `titleVisuallyHidden` and `ariaLabel` rows** in `docs/options.md` to cover the auto-hide / proxy behaviour (Bug D in the v3-vs-v2 audit). See §2.
7. **Add a "What you can build" section to `README.md`**, parallel to `forms/README.md:119` and `notify/README.md:114`. See §9.

### P1 — should fix

8. **Remove or repurpose `BORDER_RADIUS` and `DRAG_CLASS`** from `src/constants.ts` and `docs/typescript.md` (rows 202 and 205) — both are dead code. See §6.
9. **Document `data-drawer-vanilla-trigger` and `data-drawer-wrapper`** as formal sections in `docs/css-styling.md`. See §7.
10. **Remove `onActiveSnapPointChange` from the audit** — it is an internal parameter, not a public option. Decide whether to make it public (and add it to `CommonDrawerOptions`). See §8.
11. **Document the `data-drawer-vanilla-trigger` semantics** — when it mounts, what it is, when the runtime removes it (it is mentioned in `options.md:102` but not in `css-styling.md` as a contract).
12. **Cross-link the trigger-element trade-off** from `options.md:101-102` to `recipes.md` (the "Triggered by an external button" section).
13. **Cross-link the title-slot auto-hide** from `options.md:109` to the README "Title slot" section, so the same behaviour is not described in two different places with two different depths.
14. **Add a one-line description of the body scroll lock** in `options.md` (where the actual lock lives in code) — currently only mentioned in `getting-started.md`.
15. **Verify the `noBodyStyles` description in `options.md:88`** against the actual `body.style.overflow` write path in `src/vanilla/dialog.ts` (research/verify, not a clear drift).
16. **Add `closeButton` to the README `## API at a Glance` table** — currently the table at `README.md:142-148` lists only methods, not options. (`closeButton` is a VanillaDrawerOptions field, so this is optional.)
17. **Make the v3-vs-v2 audit's Bug F (close button) recommendation** explicit in `docs/api/open-drawer.md` / `docs/api/close-drawer.md` — these pages do not mention the `closeButton` HMR-safety benefit.

### P2 — nice to have

18. **Rephrase `defaultOpen` in `docs/options.md:65`** to make clear that the animation-skip happens on `open: true`, not on `defaultOpen: true`. See §1.
19. **Add `DrawerApi` to the import list** at `docs/typescript.md:14-26`. See §4.
20. **Bullet-list the inherited `CommonDrawerController` methods** under `VanillaDrawerController` in `docs/typescript.md:140-144`. See §5.
21. **Document `data-drawer-vanilla-node`** as a slot the consumer can target for inner-card styling (separate from `[data-drawer-vanilla-body]`, which is the body slot).

---

## Appendix A — Method to verify each gap

The verifier used these checks (not all shown in this report, but reproducible):

- `grep -c "<field>" docs/options.md` — field presence
- `grep -on "data-drawer-…" src/vanilla/dialog.ts | sort -u` — runtime attributes
- `grep -rhEo "data-[a-z-]+" src/ | sort -u` — full attribute inventory
- `grep -c "TRANSITIONS\|…" dist/index.d.ts dist/index.d.cts` — re-exports
- `grep -c "data-drawer-runtime-styles" dist/browser/global.global.js` — verify the IIFE claim
- `grep -c "isMobileFirefox\|…" src/runtime/registry.ts src/vanilla/dialog.ts` — verify constant usage
- `diff <(grep -rhoE "data-[a-z-]+" src/ | sort -u) <(grep -rhoE "data-[a-z-]+" docs/ | sort -u)` — set diff of attributes

---

## Appendix B — Files NOT modified

This audit produced a report only. No `docs/*.md`, `src/**/*.ts`, `README.md`, or `example/**` file was modified.
