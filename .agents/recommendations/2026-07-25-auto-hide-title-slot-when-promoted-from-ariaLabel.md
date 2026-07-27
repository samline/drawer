# Recommendation: auto-hide the title slot when promoted from `ariaLabel`

**Filed**: 2026-07-25
**Status**: ✅ **Implemented** — the `titleVisuallyHidden` contract ships in v3.0.0-beta.3. The contract is documented in `docs/options.md → title` and `docs/options.md → titleVisuallyHidden`. Regression coverage in `test/title-visibility.test.ts`.

---

## TL;DR

The `[data-drawer-title]` slot has two roles:

- **Visible title** — the consumer passed an explicit `title` option. The slot renders visibly at the top of the drawer.
- **Accessibility target** — the consumer did not pass `title` but did pass `ariaLabel`. The package auto-promotes the `ariaLabel` value into the slot for the `aria-labelledby` reference. The slot is only an a11y target, not visual content.

In v3.0.0-beta.0 / 3.0.0-beta.1 / 3.0.0-beta.2, the second case rendered the slot visibly — a regression from v2, which did not auto-promote at all. Consumers that use `ariaLabel` for accessibility (e.g. `ariaLabel: config('app.name')`) got the text leaked visibly at the top of the drawer.

The fix introduces the `titleVisuallyHidden` option, with a sensible default:

- **Proxy case** (only `ariaLabel` was passed, no `title`): the slot is auto-hidden unless the consumer opts out with `titleVisuallyHidden: false`.
- **Visible case** (an explicit `title` was passed): the slot renders visibly unless the consumer forces it hidden with `titleVisuallyHidden: true`.

The auto-hide uses the same `VISUALLY_HIDDEN_STYLE` constant the `descriptionVisuallyHidden` treatment already used for the description slot, so the two slots are visually consistent.

---

## Why this is the right fix

- **Eliminates the regression.** Consumers that only pass `ariaLabel` get a hidden a11y target by default. No more leaked visible text.
- **Backwards-compatible with the opt-out.** Consumers that want the proxy case to render visibly can pass `titleVisuallyHidden: false`.
- **Symmetric with the description slot.** The `descriptionVisuallyHidden` option already existed for the description slot. The title slot now follows the same contract.
- **Zero new DOM.** The slot is still there — the package just writes the `VISUALLY_HIDDEN_STYLE` rules when the consumer opts in (or when the default applies).

---

## Design

```ts
interface VanillaDrawerOptions {
  /**
   * Optional title for the drawer.
   *
   * - **Visible title**: pass a string, number, `HTMLElement`, or thunk.
   *   The slot renders visibly at the top of the body.
   * - **Accessibility-only title**: pass `ariaLabel` (and not `title`).
   *   The package auto-promotes `ariaLabel` into the slot for the
   *   `aria-labelledby` reference, and auto-hides the slot.
   *
   * @see ariaLabel for the accessibility-only case.
   */
  title?: VanillaRenderable

  /**
   * Whether the `[data-drawer-title]` slot should be visually hidden.
   *
   * - `true` — force-hide the slot (visible title rendered inside `content`).
   * - `false` — keep the slot visible (overrides the proxy auto-hide).
   * - `undefined` — default to the slot's role:
   *   - proxy case (auto-promoted from `ariaLabel`): hidden
   *   - visible case (explicit `title`): visible
   */
  titleVisuallyHidden?: boolean
}
```

### VISUALLY_HIDDEN_STYLE

```ts
const VISUALLY_HIDDEN_STYLE = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0'
} as const
```

Identical to the `descriptionVisuallyHidden` treatment. The screen reader still announces the slot's text; sighted users do not see it.

### Rendered DOM

| Case                                               | Rendered                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `title: 'Filters'` only                            | `<div data-drawer-title>Filters</div>` (no inline style)                           |
| `ariaLabel: 'Filters'` only                        | `<div data-drawer-title style="position: absolute; width: 1px; ...">Filters</div>` |
| `title: 'Filters', titleVisuallyHidden: true`      | `<div data-drawer-title style="position: absolute; width: 1px; ...">Filters</div>` |
| `ariaLabel: 'Filters', titleVisuallyHidden: false` | `<div data-drawer-title>Filters</div>` (no inline style)                           |
| `title: 'A', ariaLabel: 'B'`                       | `<div data-drawer-title>A</div>` (explicit title wins)                             |

---

## Migration path for existing consumers

No migration is required. The default behavior matches what most consumers want (hide the proxy, show the visible). Consumers that relied on the regression (proxy case rendering visibly) opt out with `titleVisuallyHidden: false`.

Consumers that already used `descriptionVisuallyHidden: true` for the description slot will find the title contract is now symmetric.

---

## Trade-offs

- **The slot is never removed from the DOM.** A consumer that wants to assert "no title slot exists" should query for `[data-drawer-title]` and check the `style.position` attribute (or the text content). Asserting the slot's absence is not supported.
- **The proxy case adds an `aria-label` and a visually-hidden `aria-labelledby` reference.** Some screen readers announce both. If a consumer finds this noisy, they should pass an explicit `title` instead of `ariaLabel`.
