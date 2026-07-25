# Changelog

All notable changes to `@samline/drawer` are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Status**: pre-`3.0.0` — the package is in **beta** until the drag pipeline ships in full. Pre-release versions of `3.0.0-beta.*` are tracking-only tags (no npm release) until the v3.0.0 stable cuts.

## [Unreleased]

## [3.0.0-beta.3] — 2026-07-25

The third beta of the v3.0.0 line. This release focuses on completing the drag pipeline that was deferred during the React→vanilla refactor (`v3.0.0-beta.0`), plus a tooling and cleanup pass to align with the `@samline/forms` and `@samline/notify` conventions.

### Added (drag pipeline)

- **Phase A — drag-to-dismiss.** Wired the pointer-event pipeline (`pointerdown` / `pointermove` / `pointerup`) on the dialog content element. Honors the close threshold (default 25 % of the drawer dimension) and the velocity threshold (default 0.4) to decide between close and reset. Calls `onDragChange(percentageDragged)` while the drag is in progress and `onReleaseChange(open)` on release. Respects the `data-drawer-no-drag` opt-out and the 500 ms grace period after opening.
- **Phase B — snap points.** When `snapPoints` is set, the dialog positions itself at the active snap's offset on open, the drag interpolates between snaps via `getSnapDragValue`, and the release calls `getSnapPointReleaseAction` to close, snap, or noop. Honors `fadeFromIndex` (overlay fades at the configured snap), `snapToSequentialPoint` (one snap at a time on high velocity), and `activeSnapPoint` updates via the new `onActiveSnapPointChange` callback.
- **Phase C — shouldScaleBackground + setBackgroundColorOnScale.** When `shouldScaleBackground: true`, the page wrapper (`[data-drawer-wrapper]`) scales down and shifts while the drag is in progress, using `getBackgroundDragState` and `getBackgroundResetState` from the runtime math. Resets to the normal state on close-release, and to the open-state rest on reset-release. Direction-aware viewport size. `setBackgroundColorOnScale: true` overlays a translucent black background on the wrapper during the drag.
- **Phase D — handle cycle.** Clicking the built-in `[data-drawer-handle]` advances the active snap point via `getNextHandleState`. At the last snap with `dismissible: true`, closes the drawer; with `dismissible: false`, cycles back to the first snap. New `CommonDrawerOptions.preventCycle` option disables the click-to-cycle behavior. Drag-in-progress suppresses the handle click.
- **Phase E — viewport keyboard + preventScrollRestoration.** When `repositionInputs: true` or `fixed: true`, the dialog attaches a `window.visualViewport.resize` listener that calls `getViewportDrivenDrawerLayout` and applies `style.bottom` / `style.height` accordingly. `preventScrollRestoration: true` toggles `window.history.scrollRestoration` between `'manual'` and `'auto'` across the open/destroy lifecycle. The destroy path now also tears the dialog down via the new `destroyVanillaDialog` so the cleanup array is consumed on destroy (not just on close).

### Added (tooling)

- `tsup.config.ts` — 2 entries: `index` (ESM + CJS + d.ts) and `browser/global` (IIFE). Replaces the custom bunchee + esbuild + linkedom scripts (`scripts/build.mjs`, `scripts/sync-dist.mjs`).
- `vitest.config.ts` — `jsdom` environment with `url: 'http://localhost/'`. Replaces the per-test `vi.stubGlobal('window', ...)` + `linkedom` boilerplate.
- `src/browser/global.ts` (new) — the IIFE entry. Single source of truth for `window.Drawer` and `globalThis.Drawer` assignment.
- `src/browser/index.ts` (rewritten) — pure module barrel, no `globalThis` side-effects. The `sideEffects: false` declaration on the root entrypoint is now honest.

### Changed (tooling)

- `package.json`:
  - `sideEffects: false` at the root entrypoint (the IIFE bundle stays side-effectful via `./browser`).
  - `engines.node >=20`, `publishConfig` set, `prepublishOnly` script.
  - `exports` simplified to `.`, `./browser`, `./styles.css`. The `react`, `vue`, `svelte`, `core` subpaths are removed (the legacy `core` is reachable through tree-shaking on the root entry).
  - Scripts: `clean`, `build`, `dev`, `typecheck`, `test`, `test:watch`, `format`, `format:check`, `prepublishOnly`. `bun` is no longer the runtime; `bunx vitest` and `bunx tsup` replace the custom `bun scripts/build.mjs` workflow.
  - `devDependencies` updated: removed `bunchee`, `esbuild`, `linkedom`; added `jsdom`, `tsup`, `vitest@^3.1.1`, `prettier@^3.3.0`. Bumped `typescript` and `@types/node` to match `forms` and `notify`.
- `.github/workflows/tag-release.yml` removed. The publish flow is now `npm publish` (manual), matching `forms` and `notify`.
- `.gitignore`, `.npmignore`, `.prettierrc.js` ported to the `forms` / `notify` conventions. `prettier@3` deprecation warnings resolved (dropped `jsxBracketSameLine`).
- Browser bundle URL: `dist/browser/index.js` → `dist/browser/global.global.js` (tsup default). Unpkg URLs in `docs/` updated accordingly.

### Changed (cleanup)

- `src/browser-utils.ts` (88 lines, unused) deleted.
- `src/types.ts` (redundant `DrawerDirection` / `DrawerSnapPoint` / `SnapPoint` aliases) deleted.
- `src/helpers.ts` reduced from 130 LoC to ~30 LoC. Removed `isInView`, `reset`, `getTranslate`, `dampenValue`, `assignStyle`, `chain`, and the `cache` WeakMap from `set`. Kept `set` and `isVertical`. The two `@ts-ignore` comments in `getTranslate` are gone with the function.
- `src/runtime/*.ts` got module-level docstrings explaining what each pure-math helper does and whether it is currently wired into the dialog. No signature changes.
- Comments mentioning the legacy React build are removed from the source (the `data-drawer-vanilla-*` data-attribute contract is no longer framed as a "replacement for Radix"; it is the contract).

### Fixed

- `runtime/registry.ts#setOpen` now calls `renderVanillaDrawer(id)` after `notifyOpenStateChange`. Previously a programmatic `drawer.setOpen(true)` updated the controller's snapshot but never re-rendered the dialog DOM, leaving the `data-state="closed"` attribute stale until the next user-driven event. The trigger-click path still re-renders correctly; the programmatic path now matches.
- `vanilla/dialog.ts#teardownMount` now removes the `state.content` element from the DOM (along with `state.trigger` and `state.overlay`). Previously the content node was retained across re-mounts, leaking DOM nodes and leaving the `document.querySelector('[data-drawer]')` consumers pointing at a detached, stale element. Verified by the new `vanilla root entry > updates data-state on the dialog when opened programmatically` test.
- Browser bundle path corrected: `dist/browser/global.global.js` is the actual emitted file (was `dist/browser/index.js` under the bunchee pipeline).
- `docs/{api,browser}.md` CDN URLs and version references swept from `@3.0.0-beta` to `@3.0.0-beta.3`. The `dist/browser/index.js` references in `docs/api.md` and `docs/browser.md` are replaced with `dist/browser/global.global.js`.

### Removed

- `.github/workflows/tag-release.yml` — auto-publish on tag push. The user publishes manually.
- `scripts/build.mjs` and `scripts/sync-dist.mjs` — replaced by `tsup.config.ts`.
- `bun.lockb` — binary lockfile. `bun.lock` (text) is the new lockfile when `bun install` is used.
- Subpath exports `./react`, `./vue`, `./svelte` from `package.json#exports` (the source for these was already deleted in `v3.0.0-beta.0` but the exports and the `docs/{react,vue,svelte}.md` still promised them).

### Internal — test coverage

- `129 passed | 1 skipped (130)` from `bunx vitest run`. The skipped test is the pre-existing `it.skip('prevents built-in trigger focus on mouse down when modal focus release is required', ...)` in `test/browser.test.ts` — jsdom does not enforce `defaultPrevented` semantics on synthetic events, and the runtime ships a separate focus model; the skip is intentional.
- New tests:
  - `test/drag-pipeline-integration.test.ts` — 6 tests (Phase A).
  - `test/drag-snap-points-integration.test.ts` — 8 tests (Phase B).
  - `test/drag-scale-background-integration.test.ts` — 8 tests (Phase C).
  - `test/drag-handle-cycle-integration.test.ts` — 8 tests (Phase D).
  - `test/drag-viewport-keyboard-integration.test.ts` — 9 tests (Phase E, plus a `MockVisualViewport` polyfill for jsdom).
  - `test/vanilla-entry.test.ts > updates data-state on the dialog when opened programmatically` — the regression test for the two bugs above.

### Versioning note

`3.0.0-beta.3` is a **pre-release** of the v3.0.0 line. The previous `3.0.0-beta.0` (React→vanilla baseline, `af932e3`), `3.0.0-beta.1` (version bump on the pre-Phase-A vanilla build, `e1b91fa`), and `3.0.0-beta.2` (memory-leak / CSS / a11y fixes, `6e2dc55`) are all retroactive tags — none of them was published to npm. The next npm release will be `3.0.0` once the remaining docs/AGENTS pass lands (see [Unreleased]).

## [3.0.0-beta.2] — 2026-07-15

> Retroactive tag. Never published to npm. Captures the pre-`3.0.0-beta.3` working tree.

### Fixed

- Memory leak in the vanilla host: each `createDrawer` mounted a fresh `<div data-drawer-vanilla-root>` but `destroyDrawer` left the host orphaned. Added the explicit `nextElement.parentNode.removeChild(nextElement)` in `renderVanillaHost` when the host element changes.
- CSS `data-state="closed"` animation got cut off because `animation-fill-mode: forwards` was missing. Applied to the five `slideTo{Bottom,Top,Left,Right}` and `fadeOut` rules. (See `.agents/issues/2026-07-25-drawer-visible-on-load-with-closed-state.md` for the post-bug-report write-up.)
- A11y ids: `[data-drawer-title]` and `[data-drawer-description]` slots get a generated `id` when `ariaLabelledBy` / `ariaDescribedBy` is provided, so the `aria-labelledby` / `aria-describedby` attributes point to a real target.

### Versioning note

`3.0.0-beta.2` never bumped the drawer id position; the slot id format is `${drawer.id}-title` / `${drawer.id}-description`, unique per instance.

## [3.0.0-beta.1] — 2026-07-14

> Retroactive tag. Never published to npm. Captures the pre-`3.0.0-beta.2` working tree.

### Changed

- Version bumped to `3.0.0-beta.1` (no functional change over `3.0.0-beta.0`; this was a placeholder bump while the pre-existing React build was being torn out).

## [3.0.0-beta.0] — 2026-07-13

> Retroactive tag. Never published to npm. Captures the React→vanilla refactor.

### Changed

Major rewrite of `@samline/drawer`. The package is now a **framework-agnostic, vanilla-only** drawer runtime with a single root entrypoint and a `window.Drawer` browser bundle. All previous multi-framework subpaths (`react`, `vue`, `svelte`) are removed.

- Single public surface: `createDrawer`, `configureDrawer`, `getDrawer`, `getDrawers`, `getParentDrawer`, `getChildDrawers`, `updateDrawer`, `openDrawer`, `closeDrawer`, `toggleDrawer`, `destroyDrawer`, `destroyDrawers`, `createDrawerController`. The `Drawer` namespace mirrors the imperative surface in the browser bundle.
- ESM + CJS + IIFE + `.d.ts` via `bunchee` + a custom `scripts/sync-dist.mjs`. `dist/` ships `index.js`, `index.cjs`, `browser/index.js`, `style.css`, and matching `.d.ts` files.
- `sideEffects: false` at the root entrypoint; consumers who want `window.Drawer` import `@samline/drawer/browser` instead.
- Test suite rewritten in vitest under `tests/` (15 files, 87 tests).
- Docs reorganized: split `docs/api.md` into per-function pages under `docs/api/`, plus `getting-started`, `options`, `recipes`, `css-styling`, `typescript`. `docs/browser.md` rewritten for the IIFE bundle. (`docs/{react,vue,svelte}.md` were also removed; this CHANGELOG entry covers the deletion.)
- The CSS contract is unchanged: every element the stylesheet reads uses a `data-drawer*` attribute. The visual treatment is identical to the React build.

### Removed

- `src/react/`, `src/vue/`, `src/svelte/` — all wrapper code.
- `src/use-*.ts` — all six React hooks (`composedRefs`, `controllableState`, `positionFixed`, `preventScroll`, `scaleBackground`, `snapPoints`).
- `src/context.ts` — React `DrawerContext`.
- `src/noinfer.d.ts`, `src/scheduler-tracing.d.ts` — React-only type shims.
- `src/runtime/index.ts` — the `useDrawerRuntime` React hook (the `runtime/*` pure helpers stayed).
- `@radix-ui/react-dialog`, `react`, `react-dom`, `scheduler` deps; `react`, `react-dom`, `vue`, `svelte` peerDeps from `package.json`.

### Internal — runtime helpers (kept)

The pure math helpers survived the refactor unchanged. They live under `src/runtime/` and were the seed for the Phase A–E drag pipeline that ships in `3.0.0-beta.3`:

- `runtime/drag.ts` — `getDragDirectionMultiplier`, `getDraggedDistance`, `isDraggingTowardExpandedState`, `getDragPercentage`, `isReleaseTowardExpandedState`, `shouldCloseDrawerOnRelease`.
- `runtime/snap-points.ts` — `getActiveSnapPointIndex`, `getShouldFade`, `getSnapPointOffset`, `getSnapPointsOffset`, `getSnapDragValue`, `getClosestSnapPoint`, `getSnapPointPercentageDragged`.
- `runtime/transforms.ts` — `getAxisAwareTranslate`, `getScaleTranslateTransform`, `getNestedDrawerTransform`, `getNestedDragTransform`, `getBackgroundDragState`, `getBackgroundResetState`.
- `runtime/release.ts` — `shouldPreventFocusOnRelease`, `getReleaseAction`, `getDismissibleReleaseResult`, `getSnapPointReleaseAction`.
- `runtime/handle.ts` — `getNextHandleState`.
- `runtime/pointer.ts` — `getSwipeIntent`.
- `runtime/drag-policy.ts` — `getDragTargetMetadata`, `getDragPermission`.
- `runtime/viewport.ts` — `getKeyboardOpenState`, `getViewportDrivenDrawerLayout`.
- `runtime/nested.ts` — `getParentNestedVisualState`.

All were unit-tested in `v3.0.0-beta.0` and remained the contract for the drag pipeline wired in `3.0.0-beta.3`.

### Versioning note

`3.0.0-beta.0` is a **deliberate reset**, not a minor bump. The pre-`3.0.0` series was the multi-framework build. Anything that imported `@samline/drawer/react`, `/vue`, or `/svelte` must migrate to the vanilla API.

---

## [2.0.8] — 2026-07-09

> Pre-vanilla-release. The last `2.0.x` before the React→vanilla refactor.

The `2.0.x` line carried the React/Vue/Svelte wrappers. Tagged but not retroactively detailed here. See the `v2.0.8` git tag for the diff.
