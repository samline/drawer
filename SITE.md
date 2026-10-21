# Drawer website

Landing, Examples and Docs for `@samline/drawer` 5.0.0. The package’s runtime, exports, Node 20+ requirement, README, license and release history remain the package contract. Website tooling requires Node **22.12+**.

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

The combined Pages artifact is `landing/dist/`, including Pagefind search, assets, redirects and both sitemaps. No backend is required. The original Starlight site has been retired after section/fragment reconciliation; its committed Git revision is recorded in the migration manifest. The original Markdown reference remains in Git history; old repository paths point to the maintained collection. Pages builds the combined site.

## Maintain

- `project.config.json` owns site identity, public URL, namespace, accent palette, CDN assets and package version. Keep it aligned with `package.json`. CDN paths are pinned to 5.0.0 and correspond to the package’s real distribution outputs.
- `landing/src/i18n/translations/en/` owns landing copy. Article prose lives in `docs/src/content/docs/`. Shared UI copy lives in `shared/i18n/`.
- `shared/components/Playground.astro` supplies Home, Examples and Docs previews. `shared/i18n/translations/en/demo.ts` owns editable scenario copy, while `shared/lib/demo-source.ts` and `demo-files.ts` generate/format complete and split files for both loading modes. Previews import public APIs, resolved by each app’s Vite aliases to this checkout; never duplicate runtime gestures, focus, animation or locks.
- Examples cover twelve scenarios: four edges, snap points, nesting, forms, scrollable content, modeless overlays, handle-only interaction, live updates and controlled state. Copied browser files require network access for unpkg. Browser tests intercept those exact URLs with the locally built distribution to test reproducibly; they do not establish CDN availability or npm publication.
- `content-audit.json` maps the source documentation, public exports, every option/default/callback, controller members and browser additions to reviewed destinations. `site-tools/doc-migration.json` records corrections and route mappings. Keep both current when APIs change.
- `CHANGELOG.md` remains the single release history, loaded through the docs collection. Preserve breaking-change labels and historical publication distinctions.
- `site-tools/assemble.mjs` merges the apps and preserves old Starlight URLs. Original Markdown reference files remain under `docs/`; do not delete them without a separate migration decision.
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

`site:verify` covers both Astro diagnostics, the 46-component visual contract, formatting, eight tooling tests, alternate root/nested base builds, combined links, and browser regressions. The browser suite verifies themes, responsive/enlarged text, no-JS content, keyboard behavior, exact copying, copied CDN/ESM executions, local fonts, reveal, search and detach/reinsertion cleanup.

## Theme provenance

Adapted from <https://github.com/samline/package-landing-docs.git>, commit `1dee723bd2a83108c3198c3467ac4338e046fcf4`. The original adaptation used the pinned template; the corrective review also updates the canonical template with reusable fixes. The pinned Ticker visual source and reviewed ports are in [SITE-REFERENCE.md](SITE-REFERENCE.md), [SITE-UPSTREAM.md](SITE-UPSTREAM.md) and `design-reference.json`. Preserve the original palette hierarchy, geometry, local WOFF2 fonts and licenses; the user-selected magenta accent is recorded in project.config.json and content-audit.json.themeReview. [SITE-LICENSE.md](SITE-LICENSE.md) covers the imported theme.

Use [the adaptation skill](.agents/skills/package-site/SKILL.md) for future theme work, with [SITE-ADAPTATION.md](SITE-ADAPTATION.md) and [SITE-AGENTS.md](SITE-AGENTS.md). Installed upstream skill provenance is in `.agents/SITE-SKILLS.md` and `site-skills-lock.json`. Existing package agent tools were retained.

## Performance validation

The [PageSpeed performance contract](SITE-AGENTS.md#pagespeed-performance-contract) governs all three surfaces. Goals are 95+ mobile performance, 100 desktop, and 100 accessibility/best practices/SEO. These are targets, not measured results.

On 2026-10-19 the production build was reviewed locally. No controlled Lighthouse median or deployed HTTPS PageSpeed baseline has been measured for this adaptation. No field performance claim is made. Establish separate Home, Examples and representative Docs baselines with three equivalent cold runs before optimizing, recording commit/dirty state, tools, device, throttling, FCP/LCP/TBT/CLS/Speed Index and compressed transfers. Verify the deployed commit and assets before reporting live scores.

The template’s instructional noindex is removed after content review. Compatibility redirects remain noindex with canonical destinations. Local checks do not establish a published deployment; this task does not publish npm or change account settings.

## Recorded checks — 2026-10-19

Node 24.14.0 and Bun 1.3.14, local production build, uncommitted adaptation:

- Both Astro diagnostics: zero errors, warnings or hints; original 46-component style fingerprints passed.
- Website tooling: six tests passed; alternate identity builds and link audits passed at `/` and `/tools/widget/`.
- Browser: all 20 Chromium checks passed, including both themes, 320–1440 and 200% root text, no JavaScript, clipboard fallback, source execution in all twelve example/setup combinations, search, focus and scope reinsertion. Automated axe results cover representative pages in both themes, not a complete accessibility certification.
- Runtime: typecheck and build passed; 332 Vitest tests passed with one pre-existing skip.
- `site:check:release`, package formatting and `git diff --check` passed. The npm dry-run contained only runtime distribution, package manifest, README and license; no website content.
- No commit, push, npm publication or deployment was performed. PageSpeed remains unmeasured.

## Corrective review — 2026-10-19

The maintainer selected magenta: light `#a32379`, dark `#ee9bd2`. A higher-specificity custom semantic palette now survives later base-CSS delivery; surfaces, tabs, focus, hero halo and syntax keywords follow that choice. Geometry, Inter/Instrument Serif/JetBrains Mono, shared primitives, motion and the 46 protected style fingerprints remain the Ticker reference.

Home now has four independent real Drawer scenarios in shared Tabs. Examples and Docs reuse the same preview for six scenarios (bottom/top/left/right/snaps/nesting), without neutral-counter Reset controls. The native package still owns triggers, gestures, animation, focus and scroll locks. DemoCode supplies actual ESM and CDN files through the same CodeFiles/CodeFrame/CopyButton. The execution suite reads those rendered sources and runs all 24 recipe × loading mode × split/complete combinations, bundling the actual ESM files with Vite instead of manufacturing them from CDN code.

Getting started is focused on installation and working files. The former extensive runtime material is preserved in `guides/runtime-contract.md`, with existing installation fragment destinations retained. Docs overview reuses shared CardGrid/LinkCard and the explicit `@samline/` + serif `drawer` title. API navigation follows a deliberate usage order. Browser metadata, layout and automated accessibility coverage now discovers every maintained article, rather than checking only a selected list.

Two Astro development compilers need separate module origins. `site:dev` uses supervised foreground servers; landing article links redirect to Docs on 4341, and Docs Home/Examples links use landingHref to return to 4340. The production preview and Pages artifact stay on one origin. Browser regression runs use port 4348 so an existing development server cannot be mistaken for the built site. Search indexing remains a production-build feature.

The template and its versioned package-site skill contain the same general fixes: confirm missing accent preferences, record their source, do not treat inherited defaults as approval, distinguish style fingerprints from composition/content review, retain useful multi-scenario previews, and test each actual copied loading mode. No package runtime or release version was changed in this review. PageSpeed medians and deployment remain unmeasured/unperformed.

## Corrective validation — 2026-10-20

Both Astro applications passed with zero diagnostics, eight site-tooling tests passed, and all 23 Chromium browser tests passed. The combined production build verified 2,969 links across 49 pages. Browser coverage includes every maintained article, both themes, 320–1440 layouts, enlarged text, expanded source files, native Drawer cleanup, search and exact clipboard output. All 24 rendered CDN/ESM split/complete recipe combinations executed successfully. Automated accessibility checks are regression evidence, not a complete accessibility certification.

The custom-accent regression checks computed colors after later base-style delivery. The narrow code disclosure was also checked manually at 320 CSS pixels: the page remained 320 pixels wide while code retained its own horizontal scrolling. PageTitle descriptions and API breadcrumbs wrap without changing the shared typography scale; these bounded accessibility exceptions are recorded in the design reference.

Formatting, the 46-component style contract, release-content checks and alternate root/nested adaptation builds passed. Both pinned CDN assets returned HTTP 200. The npm dry-run contains 24 runtime-only files. Existing runtime-test results above belong to the original adaptation; this corrective review does not claim a fresh run of that suite, a PageSpeed measurement, npm publication or deployment. The pre-existing uncommitted Drawer adaptation remains reviewable locally.

## Second content and migration review — 2026-10-20

Compatibility distinguishes JavaScript/TypeScript and React/Vue/Svelte/Astro/CMS hosts from ESM/CommonJS or HTML/CDN delivery. The framework guide describes direct DOM ownership instead of inventing framework adapters. Its actual React, Vue and Svelte components have an optional compiler/execution browser suite; set DRAWER_FRAMEWORK_NODE_MODULES to a temporary npm installation containing react, react-dom, vue and svelte. CI installs pinned test-only versions outside the package workspace and enables this suite. These dependencies are not website hydration or runtime dependencies.

The gallery now has twelve previews: the four edges, snap points, nesting, filters, long independently scrolling content, non-modal inspection, handle-only dragging, live content updates and programmatic snap sizing. Home, Docs and Examples reuse the same component. Step 3 on Home compares equivalent short JavaScript initialization snippets; complete documents and split files remain in the linked first-steps guide.

The original example/src/content/docs Starlight application contained 14 articles. Every article/section was reconciled against current source, public types and maintained API pages; 157 original heading fragments have recorded generated destinations. Historical hashes are checked through the pinned Git revision, and each generated fragment is validated in the combined build. Compatibility redirects consult that map even when a fragment moved to another article. Old versions, inaccurate default-focus/return-shape claims and stale application-only wording were corrected rather than copied. Requirements, browser-registry separation and callback distinctions are explicit in the current docs. The obsolete example/ application is removed at the maintainer's request; the runtime and unrelated package sources remain.

Second review validation: both Astro applications passed with zero errors, warnings or hints; eight website-tooling tests passed. The complete Chromium suite passed all 29 tests with the optional React/Vue/Svelte dependencies enabled (no skipped framework tests). This includes all 48 rendered recipe × loading-mode × split/complete executions and accessibility checks of the six new open interaction states at 320 in both themes. After simplifying redundant generated options and updating metadata, the six affected browser checks passed again, including all 48 executions and actual framework components. Narrow/enlarged-text and full-page automated accessibility checks cover every maintained article; these are regression checks, not an assistive-technology certification.

The combined production artifact verifies 3,144 links across 50 pages. The migration check verifies original Git hashes for 14 Starlight articles and all 157 generated fragment destinations; browser checks exercise cross-article redirects and the former documentation-overview fragments now handled specifically from Home. The obsolete application and its lockfile/configuration are removed. The original package's source Markdown under docs/ remains as migration evidence; only the new collection is deployed.

The final npm dry-run still contains 24 runtime-only files. No runtime API/version, npm publication or deployment was changed. No new controlled PageSpeed measurement or native mobile-keyboard device run was performed. React/Vue/Svelte examples were compiled and exercised in Chromium, including React's StrictMode cleanup, rather than inferred from screenshots. Final formatting and the release-content checks are recorded with the same site state.

## Integration and identity parity — 2026-10-20

Keep Framework integrations as a first-class guide for packages that support browser hosts. Provide real React/Vue/Svelte component lifecycle examples and Astro, Shopify and WordPress guidance when applicable; omit unsupported claims rather than inventing adapters. FrameworkExamples composes shared Tabs/CodeFiles and receives source groups; it must not contain one package's API. CMS examples need single asset loading, independent instances, host lifecycle cleanup and explicit support scope. Compile copied framework files and execute CMS output; Liquid/PHP fixtures are not real hosted deployments.

Use manifest.npmName for shared header/menu/footer branding and manifest.name for editorial copy. Preserve Ticker's original Hero compatibility composition: language/host labels with its existing wrapping and gaps. Do not add an unapproved extra Hero CTA merely to link integration guidance; use the existing onboarding/sidebar destinations. Check rendered identity, DOM composition and narrow/enlarged-text geometry as well as style fingerprints.

Validation for the 2026-10-20 integration/identity pass: site:check reports zero Astro diagnostics and preserved reference styles. Eight site Node tests, all 32 browser tests, release evidence checks and the combined build passed (3,153 links across 50 pages; 14 original articles and 157 historical fragments retained). The browser run includes 48 rendered recipe mode/file combinations, compiled React/Vue/Svelte components, Liquid-rendered Shopify sections and PHP-linted/executed WordPress shortcode/enqueue fixtures. CMS fixtures test real runtime assets, dependencies, independent widgets and cleanup; they do not claim a live store or WordPress deployment. The npm package runtime/API was not changed.

## Bottom-sheet scroll and Overview icons — 2026-10-20

Overview glyphs now match code ownership, focus containment, lifecycle, four edges, nesting and snap stops using the existing SVG style. The package runtime and public API are unchanged. DemoStyles, generated recipe/framework CSS and CMS files scroll only the content body, avoiding the runtime background extension as an empty scroll range. Reading-only examples expose a named keyboard focus target. Full-height snap examples reserve the runtime offset in their visible flex content budget.

Validation: zero Astro diagnostics, formatting passed, eight Node tests passed, alternate-package builds passed at both / and /tools/widget/, and the combined artifact verified 3,156 links across 50 pages plus all 14 historical articles/157 fragment destinations. All 33 browser tests passed, including 48 copied recipe mode/file combinations, React/Vue/Svelte and CMS integrations, short/long scroll ownership on Home/Examples/Docs at 320 and 1440, native PageDown scrolling, both themes, open-state accessibility and close/focus behavior. In the local mobile browser, the short sheet's reading body measured 232px tall with a matching 232px scroll height. These are layout/behavior checks, not a new PageSpeed benchmark or a physical iOS device certification.

## Drawer 5 integration review — 2026-10-20

The site now dogfoods local public root imports through explicit Vite/TypeScript aliases instead of depending on published v4 runtime behavior. Mobile menus and search pass native cloned template elements to createDrawer and dispose their own controller. The public integration skill lives in skills/drawer/SKILL.md and is served by /drawer/skills/drawer/SKILL.md. Package publication is not performed by a website build.

The major release removes redundant mutators, aliases and implicit resurrection. Update content-audit.json against actual exports after API changes; keep removed exports as migration evidence rather than current capabilities. Preserve all 14 original Starlight articles and 157 fragment destinations through Git-backed mapping, including old overview anchors next to their useful replacement. Do not replace the package-facing root README with site maintenance notes.

The runtime-only `npm run test:package` gate checks ESM/CommonJS/IIFE APIs, owned identity/cleanup, required exported files and the real npm manifest. It also runs during prepublishOnly.

## Drawer 5 completion — 2026-10-20

The complete v5 runtime and consumer migration passed package build, strict TypeScript (including unused symbols), 345 Vitest tests with one pre-existing skipped test, and formatting. Both Astro apps had zero diagnostics; all 46 protected component style contracts and eight website Node tests passed. The combined build verified 2,661 links across 50 pages and all 14 historical Starlight articles / 157 fragment destinations. Alternate package builds passed at both `/` and `/tools/widget/`.

All 33 Chromium browser tests passed against the completed production build. Coverage includes twelve copied recipes × two loading modes × separate/complete files, compiled React/Vue/Svelte integrations, Shopify/Liquid and WordPress/PHP fixtures, both themes, all-page automated accessibility, enlarged/mobile layout, keyboard, no-JavaScript, copy feedback and modal reconnection. CMS fixtures are not proof of a hosted deployment; automated accessibility is not certification. Home, Examples and Docs were also inspected visually, including Docs in both themes.

The real npm manifest contains 25 allowed runtime/public-guide files. `test:package` checks ESM, CommonJS, IIFE, exported types/CSS, independent identity and terminal cleanup; CI and prepublishOnly run it. A separate temporary installation of the packed artifact passed a TypeScript consumer and owned-controller lifecycle check. Frozen Bun installation made no changes. The public skill passed validation and matches the generated download exactly.

All source, documentation, examples, skill, release notes and maintenance lessons target 5.0.0. No npm publication, external deployment or new PageSpeed/performance benchmark was performed. The module extraction improves ownership and readability; no measured speedup is claimed. The companion template records the general lessons while keeping its currently published runtime dependency.

The final CI audit found affected transitive development tools. Root overrides align Vite to 8.3.4 and source-map-js to the compatible fixed 1.2.2 series; these are tooling resolutions, not runtime dependencies. The final frozen lock contains no runtime dependencies or framework peers, with a regression guarding that contract. Bun audit reports no vulnerabilities; the same audit of the companion template was already clean. See [the Vite advisory](https://github.com/advisories/GHSA-698v-4r3x-3vcv) and [the source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). Runtime, type, package and combined site checks passed again after the correction. No remote release is implied by those local checks.

After the tooling patch, all eight affected browser checks passed again: compiled framework/CMS integrations, all 48 copied recipe variants, Pagefind search and shared highlighting. The final id/element-after-destroy clarification also passed its focused lifecycle regression.

Authored staged files pass whitespace checks. Imported upstream skill sources and original font-license notices retain their original bytes, including their upstream trailing spaces; those vendor paths are excluded from that whitespace-only check rather than rewritten.
