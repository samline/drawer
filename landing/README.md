# Landing and Examples

These are one product surface. src/layouts/Main.astro composes shared metadata/fonts/theme, Header and Footer. Complete blocks are in src/sections; the shared Playground appears on Home, Examples and a Docs article. It imports Drawer’s public API from this checkout and demonstrates real bottom sheets, all four edges, snaps and nesting. Home keeps four independent scenarios in shared Tabs.

Editable interface/content copy is in src/i18n/translations/en. The project config owns identity, version, URLs and accents. Section/Box own layout; never add competing gutters or maximum widths.

From the root: npm run site:dev for two-origin development; npm run site:build && npm run site:preview for the production artifact and indexed Docs. Shared primitives live in ../shared; do not duplicate them here.

The combined build assembles Docs, local fonts, social artwork, robots and the merged sitemap into dist. CI validates the resulting site before Pages deployment. Read ../SITE-AGENTS.md and ../SITE-ADAPTATION.md for coverage and publication rules.

Follow the root [PageSpeed performance contract](../SITE-AGENTS.md#pagespeed-performance-contract) for targets, asset/loading conventions, layout stability, measurement evidence and publication verification. Keep this policy linked when replicating the theme.

The new site serves at `/drawer/` on port 4340; Docs development owns port 4341 with an owning-origin redirect. Browser examples are pinned to 5.0.0 and tested against the locally built distribution. See [SITE.md](../SITE.md) for the audit, validation commands and source revision.

Home advertises language/framework hosts separately from distribution modes and links to the framework guide. Get started compares concise initialization snippets; full runnable files live in Docs. Examples covers twelve task/interaction variants through the shared Playground, not twelve independently styled pages.

## Integration and identity parity — 2026-10-20

Keep Framework integrations as a first-class guide for packages that support browser hosts. Provide real React/Vue/Svelte component lifecycle examples and Astro, Shopify and WordPress guidance when applicable; omit unsupported claims rather than inventing adapters. FrameworkExamples composes shared Tabs/CodeFiles and receives source groups; it must not contain one package's API. CMS examples need single asset loading, independent instances, host lifecycle cleanup and explicit support scope. Compile copied framework files and execute CMS output; Liquid/PHP fixtures are not real hosted deployments.

Use manifest.npmName for shared header/menu/footer branding and manifest.name for editorial copy. Preserve Ticker's original Hero compatibility composition: language/host labels with its existing wrapping and gaps. Do not add an unapproved extra Hero CTA merely to link integration guidance; use the existing onboarding/sidebar destinations. Check rendered identity, DOM composition and narrow/enlarged-text geometry as well as style fingerprints.
