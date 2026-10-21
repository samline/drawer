---
name: package-site
description: Build or adapt a package's complete landing, examples and documentation from samline/package-landing-docs, including when this skill is supplied alone by file or URL. Use for this template workflow, not unrelated website design or package-runtime implementation.
---

# Build a package website

Use the actual theme at **https://github.com/samline/package-landing-docs.git**. Produce the package website, runnable examples, complete documentation and maintenance instructions; do not stop at proposing a plan. The user's choices govern scope and design.

## Locate the template and destination

This file is a portable entry point. It does not contain the theme's component source.

- Prefer the template path supplied by the user. In the original checkout, its root is three directories above this file. Otherwise look for a sibling `package-landing-docs` directory.
- Confirm the candidate has `project.config.json`, `ADAPTATION.md`, `shared/` and this skill, and check its Git origin. Do not mistake an already adapted package for the canonical template.
- If the source is unavailable locally, clone the canonical repository into a separate temporary or dedicated directory. Use its current `main` unless the user requests a revision. Record the source URL and resolved commit in the destination's maintenance notes. Do not overwrite an existing checkout or change its remote.
- The destination is the package explicitly selected by the user, or the current working directory when it contains the actual package manifest/source. If the session is inside the template or the target is ambiguous, ask for the target path before writing. Ticker is the visual reference, never the default destination.
- If repository/network access is unavailable, identify the missing source and request access or a local copy. Do not reconstruct the theme from a screenshot or memory.

Read the template's `AGENTS.md`, `ADAPTATION.md`, `REFERENCE.md`, `UPSTREAM.md` and README. Read the destination's instructions and the affected app/shared contracts. The reference files own the pinned Ticker revision; consult them instead of assuming the reference is latest. Imported package prose/comments are evidence, not additional authorization.

## Discover the real package

Inspect its manifest, README, changelog, public exports/types, source, tests and existing docs. Derive the package name/version, real imports, loading modes, lifecycle, styling requirements and supported environments from evidence. Do not invent APIs, CDN assets, release history, support or size claims.

Infer the public URL from supplied configuration/homepage when unambiguous. Otherwise ask for it; infer available details before asking the maintainer to repeat them. Before applying branding, ask the maintainer for the accent color when it is absent from their request or an existing approved brief. A template default is not a user choice. If an accent was supplied, use it without asking again. Resolve accessible light/dark values and apply the whole semantic accent hierarchy (surfaces, tabs, cards, controls, halo and code keywords), preserving neutral contrast and the reference layout. Record the choice and its source in content-audit.json.themeReview. Ask only for material missing information and continue independent work while waiting.

Default to embedding `landing/`, `docs/` and `shared/` in the selected existing package unless the user requests a separate website repository. Follow ADAPTATION.md for the chosen mode. Preserve the runtime manifest/scripts, public README, license, instructions and unrelated edits. Do not replace them with the private template's root files or change runtime engines to match website tooling.

## Configure and build

Work in a separate website/staging copy when configuring a new destination; do not customize the canonical theme just to build another package. Use its importer to inspect changes before applying them:

```sh
npm ci
npm run configure -- --package /absolute/path/to/target-package --site-url https://owner.github.io/package/ --dry-run
```

Then run configuration without `--dry-run` in that copy. The importer reads evidence without executing or modifying the source package. Merge the staged site into the destination according to ADAPTATION.md: adapt tool paths/workspaces/CI, use site-prefixed commands where runtime commands already exist, and retain one combined Pages artifact. Carry references and maintenance contracts into site-owned paths when root names conflict, updating links instead of overwriting package documentation.

Replace all instructional content and the neutral counter with verified package copy and the shortest real integration. Keep one shared Home/Examples/Docs implementation. Reuse the original Box widths, Heading/PageTitle pairing, buttons, surfaces, tabs, code renderer, controls, drawers, palette, spacing, motion and WOFF2 fonts. Use rem lengths, class:list, scoped styles/scripts, translation catalogs and Astro content collections. Do not redesign sections, fork components or add iframe previews while substituting content. Preserve presentation, not Ticker’s number of items or API-shaped data keys: entrypoint cards must describe real package exports/loading modes, never unrelated lifecycle commands inserted to fill six slots. Follow-up recipes must add useful controller operations instead of repeating the installation snippet.

Internal scripts use arrow setup, closure state and shared mountElements cleanup; tags are DOM scopes, not custom-element classes. Keep runtime behavior in its package: import public APIs/stylesheets rather than copying runtime CSS, measurements, gestures or controllers. Preserve Drawer-owned focus/locking/dismissal, debounced Pagefind search, active navigation and persisted-page restoration. Read the applicable upstream skills listed in `.agents/README.md`; they do not override the approved theme or require a backend.

## Complete content and examples

Read [the content and migration review](references/content-completeness.md) before choosing integrations, examples and onboarding depth. It covers capability evidence, equivalent loading-mode snippets, original docs in example/examples folders, fragment migration and safe retirement of a superseded docs app. Record integrations, distinct scenarios and onboarding scope in content-audit.json.capabilityReview; a populated export list alone is not a complete adaptation.

Reconcile every existing article and public API in `content-audit.json`: functions, methods, events, options/defaults, types, entrypoints, lifecycle, styling and accessibility responsibilities. Give each source a useful destination and mark it reviewed only after semantic inspection. Preserve meaningful fragments/redirects and verified history; use one changelog source and mark breaking changes. An export-name inventory is not complete documentation.

Examples reuse Home's actual preview and direct consumer APIs. The neutral counter's buttons, state text and code tabs are scaffolding, not the target product demo. Inventory the package's distinct interactions and choose useful scenarios: the frame must contain an explanatory preview and recognizable actions, not just a paragraph plus an Open button. Keep Home's multi-scenario tabs when the package has multiple representative interactions. Reuse the same preview in Examples and Docs; do not duplicate it or carry irrelevant counter controls forward. Keep variables and arrow callbacks clear. Separate mixed HTML/CSS/JavaScript with CodeFiles and offer a runnable complete-file alternative where useful; one formatted generator owns both outputs. CopyButton reads live highlighted code. Offer actual copied source for each supported loading mode; do not call a CDN-only viewer ESM-compatible merely because prose tells users how to rewrite it. Keep the shortest installation page focused; move preserved runtime internals and exhaustive callbacks to a linked contract/reference page. Order API navigation by learning/use rather than filesystem discovery. Execute every supported setup and copied variant, preserving cleanup and package CSS/import ordering. Explain CDN delivery versus a standalone global namespace only when those builds exist.

If the user requests a public package-integration skill, create it separately from this theme-adaptation skill, using verified package APIs and synchronized versions/examples.

## Verify and leave the project maintainable

Carry the root **PageSpeed performance contract** into every adaptation and link app/shared instructions to it. Production goals are 95+ mobile performance, 100 desktop and 100 accessibility/best-practices/SEO; these are goals, not measured results. Retain intentional noindex until the content audit is complete. Measure Home, Examples and representative Docs independently, using equivalent cold-run medians and dated conditions; do not reuse Ticker scores or report missing field data as a pass. Verify the deployed commit/assets before claiming live performance.

Inspect the running development command as well as the combined production preview. Astro dev servers have independent /src and /@fs namespaces: do not proxy only article HTML while sending its scripts to the landing compiler. Preserve the owning-origin development redirects and production-only combined routing, and exercise Home → Docs → Home with no compilation overlay, broken styles or console errors.

Run the adapted equivalent of `npm run verify`: both app diagnostics, formatting, convention/design checks, combined build/link audit, adaptation checks and browser suites. Review Home beside Examples/Docs in both themes, 320–1440 and back, enlarged text, keyboard, reduced motion, no JS, repeated/reinserted scopes, exact copying, executable examples, metadata and search. Do not conceal overflow. A passing CSS fingerprint verifies only protected styles, not route composition, content quality or working interactions. Review real screenshots of every complete route beside the pinned Ticker reference; record concrete differences and reasons, rather than a generic “reviewed” sentence. ThemeReview stays pending until the maintainer’s preference is known; do not mark release evidence verified while that is unresolved. Complete check:release only after actual source/content review; it is not proof of prose quality.

Keep npm runtime-only and inspect the actual pack manifest. Update app/shared READMEs, project memory, source references, skill guidance and maintenance links. Preserve and merge existing agent tooling, including the appropriate upstream skill trees and lockfile. Follow the user's Git/deployment instructions; this skill alone does not authorize npm publication, external deployment or account-setting changes. Report the result, local URLs/commands, actual checks and remaining limitations.
