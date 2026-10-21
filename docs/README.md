# Drawer documentation

The maintained Drawer 5 documentation is the Astro collection in `src/content/docs/`, published at [samline.github.io/drawer/docs](https://samline.github.io/drawer/docs/). It shares UI, tokens, typography and controls with Home and Examples through `../shared/`.

## Content and ownership

Start with [Getting started](src/content/docs/getting-started.mdx), then [Controller and registry](src/content/docs/reference/controller.md). The public API is `createDrawer`, `createDrawerController`, `getDrawer`, `getDrawers`, `getParentDrawer`, `getChildDrawers` and `destroyDrawers`. Teach the owned controller first; the registry and headless renderer are optional.

Keep options, types, gestures, accessibility, styling, lifecycle, framework/CMS integrations and copied examples synchronized with source. Current documentation must not teach removed v4 mutators or implicit instance recreation. Historical method routes remain hidden migration notes. The root [CHANGELOG](../CHANGELOG.md) supplies release notes, including all breaking changes.

The older Markdown paths in this directory point readers to the collection. Original Starlight content and fragment mappings are tracked against Git evidence in `../site-tools/doc-migration.json`; retain their public destinations when restructuring articles. The old Starlight app is retired.

## Development and validation

Run `npm run site:dev` at the package root. Home uses port 4340 and Docs development uses 4341; production combines both into one site at `/drawer/`. Run `npm run site:check`, `npm run site:test`, `npm run site:build` and `npm run site:test:browser`. The build audits links and all historical fragment destinations. Use `npm run site:format` for shared/Astro formatting.

Drawer 5.0.0 CDN paths describe the prepared release. Until the maintainer publishes it, validate copied recipes against the locally built distribution. Do not report local execution as proof of npm/CDN publication.

Read [AGENTS.md](AGENTS.md) and [SITE-AGENTS.md](../SITE-AGENTS.md) before editing. PageSpeed goals and visual conventions apply to all three destinations; automated accessibility checks are evidence, not certification.
