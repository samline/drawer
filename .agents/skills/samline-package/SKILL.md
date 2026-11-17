---
name: samline-package
description: Conventions for creating, changing, testing and releasing any @samline/* package (drawer, notify, ticker, forms, formatter, autocomplete, counter, reveal, scroll-spy, scroll-to, horizontal-scroll, is-visible, debounce, string, theme, internal). Use before editing a package's source, manifest, tests, README, site or changelog, before adding a new package, and before a release.
---

# @samline package conventions

Apply these rules in every @samline repository. The repository's own `AGENTS.md` adds package-specific memory; when the two disagree, ask the maintainer.

## Before changing code

1. Read the package README, `AGENTS.md`, tests and `CHANGELOG.md`.
2. Check whether a sibling package already solves the problem (registry: `repos.json` in the hub, or the list in this skill's description).
3. Reuse primitives instead of re-implementing them: `@samline/internal` (auto-init, `data-*` readers, `resolveElements`, `isBrowser`, reduced motion), `@samline/is-visible` (IntersectionObserver pool), `@samline/debounce` (timing). Install the published versions from npm (`pnpm add -D @samline/<primitive>`); never link, alias or import a local checkout of a sibling repository. To use an unreleased change, the primitive is released first. `tsup.config.ts` bundles them with `noExternal: [/^@samline\//]` and `dts: { resolve: noExternal }`.

## Package manager

- Install with pnpm: `pnpm install`, `pnpm add -D <pkg>`, `pnpm install --frozen-lockfile` in CI, `pnpm exec <bin>`. Only `pnpm-lock.yaml` is committed; `packageManager` pins pnpm.
- Run with Bun: `bun run <script>` for build, tests, checks and release. Never `bun install`, `bun add`, `npm install` or `yarn`.
- `pnpm-workspace.yaml` keeps `minimumReleaseAgeExclude: ['@samline/*']` and the `allowBuilds` allowlist (esbuild). Never add a `preinstall` script to a published package.

## Shape

- `src/index.ts` is side-effect free. `src/core/` has no DOM. `src/vanilla/` owns DOM controllers. `src/browser/global.ts` builds `dist/browser/<name>.global.js`, exposes named members on `window.<PascalName>` (when that name is a JavaScript or DOM built-in such as `String`, use a plain non-colliding word such as `Strings`; never a `Samline` prefix in any public name) and auto-inits unless the script tag has `data-manual`.
- Declarative API: `data-<name>` plus `data-<name>-<option>`; attributes win over options; state in `data-<name>-state`.
- Controllers return a cleanup or `{ refresh, destroy }`; `destroy` is idempotent and restores the original markup.
- Arrow functions and closures; no classes, no `this`. TypeScript strict with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- No DOM at import; no-ops without a DOM. Respect `prefers-reduced-motion`. Content visible without JS.

## Tests and checks

- Unit tests in `test/` (Vitest + jsdom), thresholds 90/95/95/95.
- Browser tests in `tests/e2e/` against `dist/` in Chromium, Firefox and WebKit; copyable site examples run in `tests/e2e/examples.spec.ts`.
- `bun run check` must pass before you say a change is done. Report failures with their output.

## Docs

- Public text in English. README follows the canonical structure (Installation, Quick start, Capabilities, API at a glance, Documentation, Changelog, AI agent skill, License).
- A public API change updates source, tests, README, site docs and examples, and `skills/<name>/SKILL.md` in the same change.
- CDN URLs pin an exact version on jsDelivr.

## Releases

- Add a Keep a Changelog entry under `## Unreleased` for every user-facing change, with the right semver impact.
- Release: bump version everywhere it is pinned (package.json, project.config.json, SKILL.md `package-version`, CDN URLs), `bun run check`, commit `chore(release): x.y.z`, tag `vx.y.z`. The maintainer publishes with `bun run release`. CI never publishes; never add `--provenance`.
- Never add AI attribution to commits, tags or pull requests. Ask before pushing, creating repositories or publishing.
