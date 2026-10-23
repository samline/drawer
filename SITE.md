# Drawer website

Landing, Examples and Docs for `@samline/drawer` 5.0.2. The package’s runtime, exports, Node 20+ requirement, README, license and release history remain the package contract. Website tooling requires Node **22.12+**.

## Run locally

```sh
bun install --frozen-lockfile
bun run site:dev
```

Open <http://127.0.0.1:4340/drawer/>. Docs runs on 4341 and owns its development module origin; Landing redirects article links there. To exercise generated search and the complete production artifact:

```sh
bun run build
bun run site:build
bun run site:preview
```

- Home: <http://127.0.0.1:4340/drawer/>
- Examples: <http://127.0.0.1:4340/drawer/examples/>
- Docs: <http://127.0.0.1:4340/drawer/docs/>

The combined Pages artifact is `landing/dist/`, including Pagefind search, assets, redirects and both sitemaps. No backend is required. The original Starlight site has been retired after section/fragment reconciliation; its committed Git revision is recorded in the migration manifest. The original Markdown reference remains in Git history; duplicate repository stubs have been retired in favor of the maintained collection. Pages builds the combined site.

## Maintain

- `project.config.json` owns site identity, public URL, namespace, accent palette, CDN assets and package version. Keep it aligned with `package.json`. CDN paths are pinned to 5.0.2 and correspond to the package’s real distribution outputs.
- `landing/src/i18n/translations/en/` owns landing copy. Article prose lives in `docs/src/content/docs/`. Shared UI copy lives in `shared/i18n/`.
- `shared/components/Playground.astro` supplies Home, Examples and Docs previews. `shared/i18n/translations/en/demo.ts` owns editable scenario copy, while `shared/lib/demo-source.ts` and `demo-files.ts` generate/format complete and split files for both loading modes. Previews import public APIs, resolved by each app’s Vite aliases to this checkout; never duplicate runtime gestures, focus, animation or locks.
- Examples cover eighteen useful scenarios; the reset/usefulness audit below defines their content and behavior. Copied browser files require network access for unpkg. Browser tests intercept those exact URLs with the locally built distribution to test reproducibly; they do not establish CDN availability or npm publication.
- `content-audit.json` maps the source documentation, public exports, every option/default/callback, controller members and browser additions to reviewed destinations. `site-tools/doc-migration.json` records corrections and route mappings. Keep both current when APIs change.
- `CHANGELOG.md` remains the single release history, loaded through the docs collection. Preserve breaking-change labels and historical publication distinctions.
- `site-tools/assemble.mjs` merges the apps and preserves old Starlight URLs. Historical source is pinned in Git by content-audit.json and the migration manifest; the collection is the only maintained article tree.
- Website commands use `site:`. Runtime `build`, `test`, `typecheck` and `prepublishOnly` retain their roles. The npm `files: ["dist", "CHANGELOG.md"]` allowlist excludes the website; inspect the archive before publishing.

## Verification

```sh
bun run build
bun run typecheck
bun run test
bun run site:verify
bun run site:check:release
npm pack --dry-run --json
```

`site:verify` covers both Astro diagnostics, the protected component visual contract, formatting, eight tooling tests, alternate root/nested base builds, combined links, and browser regressions. The browser suite verifies themes, responsive/enlarged text, no-JS content, keyboard behavior, exact copying, copied CDN/ESM executions, local fonts, reveal, search and detach/reinsertion cleanup.

## Theme provenance

Adapted from <https://github.com/samline/package-landing-docs.git>, commit `1dee723bd2a83108c3198c3467ac4338e046fcf4`. The original adaptation used the pinned template; the corrective review also updates the canonical template with reusable fixes. The pinned Ticker source is 8a30c9ca8486953fdc2801f0ceff8b17d0cb5615 (local ../ticker); design-reference.json maps immutable component paths and fingerprints. Reviewed ports: a5ed5ae (heading/wrapping), 24b4c19 (fonts/live copying/reserved controls), a4c2899 (arrow setup/mount cleanup/recipe generation), 4d18f4a (CSS-loading/observer reveals/initial tabs) and 8a30c9c (teardown ARIA). Preserve the original palette hierarchy, geometry, local WOFF2 fonts and licenses; the user-selected magenta accent is recorded in project.config.json and content-audit.json.themeReview. [SITE-LICENSE.md](SITE-LICENSE.md) covers the imported theme.

The canonical adaptation skill lives in the companion https://github.com/samline/package-landing-docs repository. Project memory is consolidated in [AGENTS.md](AGENTS.md); generic vendored skill libraries and obsolete audit dumps are retained in Git history rather than duplicated here.

## Performance validation

The [PageSpeed performance contract](AGENTS.md#pagespeed-performance-contract) governs all three surfaces. Goals are 95+ mobile performance, 100 desktop, and 100 accessibility/best practices/SEO. These are targets, not measured results.

On 2026-10-19 the production build was reviewed locally. No controlled Lighthouse median or deployed HTTPS PageSpeed baseline has been measured for this adaptation. No field performance claim is made. Establish separate Home, Examples and representative Docs baselines with three equivalent cold runs before optimizing, recording commit/dirty state, tools, device, throttling, FCP/LCP/TBT/CLS/Speed Index and compressed transfers. Verify the deployed commit and assets before reporting live scores.

The template’s instructional noindex is removed after content review. Compatibility redirects remain noindex with canonical destinations. Local checks do not establish a published deployment; this task does not publish npm or change account settings.

## Source boundaries and intentional corrections

The single maintained article tree is docs/src/content/docs. landing/src/sections owns full page blocks; shared/components owns controls and reusable presentation. shared/styles/theme.css supplies tokens; shared/lib/code-theme.mjs owns Shiki; shared/lib/mount-elements.ts owns mount cleanup. Shared DemoStyles adapts application geometry, not native gestures/animation. DemoOptions/DemoContent/DemoActions and the flow helpers keep options, markup and behavior separate. shared/lib/demo-files.ts formats files once.

Intentional accessibility corrections preserve the visual source: named focusable code groups, wrapping title tracks/breadcrumbs, text-relative footer columns and contextual Header/Button/ThemeToggle selectors for mobile visibility/icon geometry. Magenta was explicitly selected by the maintainer (#a32379 light, #ee9bd2 dark). Fingerprints do not prove useful content or semantic coverage. Font notices and TTF/WOFF2 source provenance remain under shared/assets/fonts; SITE-LICENSE.md preserves theme attribution.

For full framework coverage set DRAWER_FRAMEWORK_NODE_MODULES to an external installation containing the versions pinned in .github/workflows. CI installs them outside this package. React/Vue/Svelte components are compiled and exercised; Shopify Liquid and WordPress PHP fixtures test asset order, independent widgets and cleanup, not hosted deployments.

## Example reset and usefulness audit

| Preset      | Retained state / observation                                      | Playground policy                      |
| ----------- | ----------------------------------------------------------------- | -------------------------------------- |
| bottom      | Checkout selection message outside the panel                      | Optional feedback reset                |
| top         | Selected command message; query itself recreates                  | Optional feedback reset                |
| left        | Selected workspace destination message                            | Optional feedback reset                |
| right       | Shortlist action result                                           | Optional feedback reset                |
| snaps       | Native close timer resets the first snap                          | No checkbox                            |
| nested      | Child closes; parent/child content is recreated on reopen         | No checkbox                            |
| form        | Applied category/sort message; fields themselves recreate         | Optional feedback reset                |
| scroll      | Reading body starts at the top on reopening                       | No checkbox                            |
| nonmodal    | Canvas grid and page-action result                                | Optional feedback reset, also on close |
| handle      | Temporary textarea already recreates empty                        | No checkbox                            |
| update      | Updated options retain title/body and replace the original action | Optional original-content reset        |
| controlled  | Native close timer also resets programmatic snaps                 | No checkbox                            |
| account     | Selected account/workspace action message                         | Optional feedback reset                |
| actions     | Selected file-action message                                      | Optional feedback reset                |
| confirm     | Selected explicit draft action message                            | Optional feedback reset                |
| wizard      | Configuration result; Back/Continue retain inputs only while open | Optional feedback reset                |
| independent | Two independent non-modal panels; notes recreate on reopen        | No checkbox                            |
| styled      | Sample invitation selection outside the custom card               | Optional feedback reset                |

All twelve options default to checked. Completed choice receipts stay visible after closing so the user can read their result; the next opening clears them. The non-modal page action is visible while the inspector remains open, so its feedback can also clear on close. Turning reset off retains application feedback and updated content options and the inspector grid, while ordinary input/search DOM still recreates. Do not confuse input recreation with the absence of external state. Helpers are gallery behavior, not a package API or copied integration requirement.

## Example usefulness audit — 2026-10-21

| Preset      | User task and useful content                                      | Distinct interaction                                                    |
| ----------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| bottom      | Review two bag items, quantities, prices and the $50 subtotal     | Return a checkout selection to the host                                 |
| top         | Find a workspace command by name                                  | Live filtering and an explicit empty state                              |
| left        | Browse project, team and settings destinations                    | Return a navigation intent without leaving context                      |
| right       | Inspect product price, materials, dimensions and capacity         | Return a shortlist selection                                            |
| snaps       | Read the timed stops of a sample day itinerary                    | Reveal more of the itinerary with native snap gestures                  |
| nested      | Compare delivery cost and arrival time without losing the order   | Select in a child, update the parent summary, close only the child      |
| form        | Choose category and sorting criteria                              | Submit real FormData to the host result                                 |
| scroll      | Read an eight-section project hand-off guide                      | Independent reading scroll with reachable close control                 |
| nonmodal    | Inspect a canvas while continuing to use it                       | Toggle a real grid and use the background page action                   |
| handle      | Write a launch-review note beside a concrete checklist            | Edit/select text without content dragging the panel                     |
| update      | Advance a sample order from confirmed to packed                   | Replace title and order information on the same controller              |
| controlled  | Read a fictional boarding pass, boarding time and baggage details | Use visible Compact/Expanded controls, distinct from itinerary gestures |
| account     | Choose personal/team workspace or profile settings                | Return an account/workspace intent                                      |
| actions     | Choose a contextual operation for a named PDF                     | Return a file-action intent                                             |
| confirm     | Decide what to do with an actual sample unsaved launch note       | Explicit save/discard/continue decision; implicit dismissal disabled    |
| wizard      | Choose finish and initials, then review the tote                  | Back/Continue retain values; confirmation returns a local selection     |
| independent | Write project notes alongside an activity log                     | Open/close two unrelated controllers separately                         |
| styled      | Review a fictional team invitation                                | Custom floating geometry, corners and gradient with native behavior     |

Menu, shortlist, checkout and draft choices intentionally return local intents; they do not provision accounts, mutate real files, process payment or save a real draft. The nested delivery selection and canvas grid are actual local UI changes. Keep those distinctions explicit in the guide rather than presenting a receipt as a connected service. Package explanations belong beside the preview or in Docs; panel content should supply the information needed for its task. Do not pad reading examples with repeated paragraphs or reuse the same itinerary for gesture and button demonstrations.

The translated preset separates feature title/description beside the preview from panelTitle/panelDescription inside it. The live controller, reset restoration and copied files consume those same task-specific fields. Delivery choices show both price and arrival estimate before selection.

DemoChoices composes shared Button once for menus and delivery choices. Refresh the child content factory against the current parent body on each open so a reused child cannot update detached content from a previous trial. Inspector state belongs to its own preview root, synchronizes its checkbox on reopen, and follows the existing reset opt-out. Native Drawer still owns snapping, focus, nesting, dismissal and scroll.

## Composed flows and visual freedom — 2026-10-21

The gallery has eighteen presets. Keep the original fifteen keys/order and append wizard, independent and styled. DemoFlowContent composes the same shared Buttons/fields; demo-flow wires the small step flow, while demo-flow-source supplies focused standalone files. The wizard retains input DOM while moving between steps, focuses the new heading and starts fresh after close. Its optional reset controls the external receipt only. Independent panels have no parentId: each owns its controller and survives the other's close; the site cleanup explicitly destroys both and resets both trigger ARIA states. At narrow widths they occupy separate upper/lower regions. Portable CSS must explicitly clear the opposite inset (left:auto for the right panel, right:auto for the left); a base geometry chosen for the first panel must not position the second. Copied-file tests check actual separation as well as independent close/cleanup.

The custom-design example is deliberately an application variant, not a new site design system. It preserves the shared fonts/palette/buttons and native animations while changing geometry, corners and background. A transparent outer floating panel paints its own opaque ::before layer so native inherited ::after extensions remain transparent. Keep native body scrolling and runtime pseudo-elements; do not clip the panel to conceal overflow. Non-snap floating geometry uses a scoped CSS --initial-transform endpoint to carry the native exit fully out of the viewport; never apply that offset override to snap examples. Validate movement as well as reduced-motion layout. The Easytrip registration notice inspired the detached card/composition, not copied markup or another dependency.

For a bounded recipe follow-up, `DRAWER_RECIPE_PRESETS=wizard,independent,styled npm run site:test:browser -- site-e2e/site.spec.ts --grep "all rendered recipes"` executes all twelve loading/file variants of those three recipes and still verifies the full gallery inventory. Unknown preset names fail. CI and the default suite omit that filter and execute all seventy-two variants. Do not describe a filtered run as full-gallery execution.

## Cleanup and release validation — 2026-10-21

Memory is centralized in AGENTS.md and this guide. Removed generic vendored agent libraries, obsolete audit narratives, duplicate app/shared maintenance files, repository documentation stubs and unused inherited Callout/RangeControl components. Preserved public collection routes, Git-backed source hashes, 14 historical articles/157 fragment destinations, licenses, integration skill and active tests. Removed one disabled empty test placeholder; it contained no assertions and provided no coverage. No runtime API was removed by cleanup. Release checks: package build/typecheck and all 345 tests across 48 files passed, with no skipped tests after removing the empty placeholder. The npm smoke test verified ESM/CommonJS/IIFE, types/CSS exports and 25 permitted files. Frozen Bun installation and dependency audit passed with no vulnerabilities. Both Astro checks reported zero errors/warnings/hints; eight Node tooling tests, 45 protected style fingerprints, formatting and alternate / and /tools/widget/ builds passed. The combined build verified 2,684 links across 50 pages and all 14 historical articles/157 fragments. Release evidence also verifies archived source bytes against pinned Git hashes.

The full Chromium run passed 40 tests, including all 72 copied CDN/ESM complete/split variants, React/Vue/Svelte, CMS fixtures, both themes, enlarged text, accessibility, search, local fonts and lifecycle cleanup. Its aggregate scroll test failed at a generic close selector; the diagnostic trace then exhausted the single global timeout. Replaced that aggregate with six route/viewport cases, pinned each opened controller id and required actual DOM removal between attempts. All six cases passed at 320/1440 on Home, Examples and Docs (1.6 minutes), without changing package runtime behavior. This records the full-run plus focused follow-up evidence, not a claim that the final 46-test suite was run locally in one invocation. CI runs the complete final suite.

No new PageSpeed median, real-device Safari/iOS certification or npm publication is claimed. GitHub publication status is checked separately after the authorized push.

## Bun workspace correction — 2026-10-21

The first Pages run passed runtime quality but failed before Astro checking: Bun rewrote internal npm run commands and looked for an app-only check script at the root. Workspace commands now use npm --workspace <app> run <script>, which preserves the owning app under both runners. bun run site:check passed with zero diagnostics after the correction. The workspace correction was tagged v5.0.1 with matching package/site/CDN/skill references; the follow-up below prepares 5.0.2 while preserving both published tags. No runtime API changed. The corrected Bun package build/typecheck/npm smoke test and site build passed: 25 permitted npm files, 2,688 links across 50 pages and all 14 historical articles/157 fragments. Frozen installation and formatting also passed. The full remote workflow validates the final release snapshot.

## Clean-checkout CSS resolution — 2026-10-21

The next Linux job reached the adaptation build and found @samline/drawer/styles.css?inline unresolved. Exact-end stylesheet aliases did not match Vite's query suffix; local package resolution had masked the defect. Both Astro configurations now match the stylesheet prefix at the query/end boundary, preserving ?inline while resolving this checkout's src/style.css. A regression test imports both real app configurations and checks both stylesheet names with plain, ?inline and ?url requests, preventing self-resolution from masking missing aliases. The two alternate builds and all nine Node tooling tests passed after the fix, including the real-config alias regression. Prepared 5.0.2 retains the published earlier tags; tag the exact main commit after package quality and Pages pass, reporting the separate website CI status.

## Fast Pages publication and independent CI — 2026-10-21

The maintainer explicitly rejected blocking publication on the complete browser suite, matching Ticker's existing workflow architecture. deploy.yml now installs the locked workspace, builds the combined artifact, validates generated links/migration and release evidence, then publishes. It does not install Chromium/framework fixtures or run alternate builds and browser regressions. ci.yml preserves every package, app, tooling, alternate-base and browser check on main pushes, pull requests and manual runs, with individual named steps and saved failure diagnostics. CI and Pages run independently; a successful deployment does not claim the separate full suite has completed. The local site:verify command remains the exhaustive check. Pages jobs serialize publication, while obsolete CI runs can cancel each other.

## Browser audit timeout — 2026-10-23

For main commit c427b06, GitHub Pages run 39662338778 published successfully; independent CI run 39662338718 passed package quality and 45 of 46 browser tests. The open-state audit exhausted its shared 180-second timeout while closing the confirmation example after auditing earlier examples. The unchanged test passed locally in 2.3 minutes, including that confirmation action, so this evidence points to accumulated audit time rather than a broken choice button.

The audit now defines one test per preset, retaining both themes, full-document axe checks, the 320px overflow assertion and all fourteen presets. Each uses the existing 60-second test timeout. It pins the opened drawer id and waits for DOM removal before reopening in the other theme; the top example also uses its actual top-panel fragment. All fourteen cases passed locally, taking 8.8–13.4 seconds each. This changes test isolation only; runtime behavior, accessibility rules and the independent Pages/CI workflows are unchanged.

Validation on the local production build with Node 24.14.0, Bun 1.3.14, Playwright 1.62.1 and Chromium: `bun run site:verify` passed both Astro checks, 45 protected design fingerprints, formatting, nine tooling tests, alternate-base builds, 2,694 links across 50 pages, migration evidence and all 59 browser tests in 10.5 minutes, with no skips. The browser run included all 72 copied-file variants and the isolated React/Vue/Svelte and CMS fixtures. `bun run site:check:release` also passed. These results validate the local test change; remote CI and publication status must be checked separately after pushing the correction.
