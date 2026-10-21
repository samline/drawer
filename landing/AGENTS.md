Home and Examples use the same layout, headers, footer, controls and preview. Read ../SITE-AGENTS.md and README.md. Complete blocks belong in src/sections, integrations in src/components, route composition in src/pages. UI copy belongs in src/i18n/translations. Do not recreate Docs shell or package runtime behavior here.

Visual reference: samline/ticker at 8a30c9ca8486953fdc2801f0ceff8b17d0cb5615, local sibling ../ticker. Read SITE-REFERENCE.md and design-reference.json at this repository root. Preserve the original design, not merely similar colors. Before changing a shape, spacing, type scale, animation or component composition, consult the mapped original source; do not simplify or redesign while substituting package content.

Follow the root upstream synchronization contract: arrow setup/mountElements cleanup, live code copying, WOFF2 Fonts, shared CSS-loading policy and delayed-control/reveal regressions. Do not restore custom-element classes, copied runtime CSS or duplicate source strings.

Follow the root [PageSpeed performance contract](../SITE-AGENTS.md#pagespeed-performance-contract) for targets, asset/loading conventions, layout stability, measurement evidence and publication verification. Keep this policy linked when replicating the theme.

## Integration and identity parity — 2026-10-20

Keep Framework integrations as a first-class guide for packages that support browser hosts. Provide real React/Vue/Svelte component lifecycle examples and Astro, Shopify and WordPress guidance when applicable; omit unsupported claims rather than inventing adapters. FrameworkExamples composes shared Tabs/CodeFiles and receives source groups; it must not contain one package's API. CMS examples need single asset loading, independent instances, host lifecycle cleanup and explicit support scope. Compile copied framework files and execute CMS output; Liquid/PHP fixtures are not real hosted deployments.

Use manifest.npmName for shared header/menu/footer branding and manifest.name for editorial copy. Preserve Ticker's original Hero compatibility composition: language/host labels with its existing wrapping and gaps. Do not add an unapproved extra Hero CTA merely to link integration guidance; use the existing onboarding/sidebar destinations. Check rendered identity, DOM composition and narrow/enlarged-text geometry as well as style fingerprints.

Follow the root Drawer 5 ownership contract: use public createDrawer with native content, retain the exact controller and destroy that owner directly. Do not use removed browser.newDrawer/available or id-based mutators. This checkout aliases public runtime/CSS imports to local source so site tests exercise the release being prepared. Retired helper articles are migration notes hidden from current navigation; do not silently remove their public routes or fragments.
