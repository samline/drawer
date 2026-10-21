# Shared website foundations

The single source for Box, Section, Heading/PageTitle, buttons/links/cards, Tabs/TabPanel, CodeFrame/CodeFiles/CopyButton, Theme, DrawerStyles, Installer and Playground. Apps compile these sources directly; no published UI package or copied component tree is needed.

styles/theme.css owns palette/font/spacing/focus/motion/breakpoint tokens. SiteHead resolves configured accents and composes Fonts. Fonts serves the local Inter, Instrument Serif and JetBrains Mono WOFF2 faces with two heading preloads; TTF inputs remain separate for social rendering. lib/code-theme.mjs is the only Shiki theme. i18n owns shared control messages and editable Drawer demo copy. Namespace theme storage per configured project.

Components keep scoped CSS, processed scripts and lifecycle cleanup. DrawerStyles adapts vendor CSS inside native scope; Drawer owns actual gestures, animation, focus and locking. Reuse complete implementations rather than copies of their CSS.

Run the root npm run site:verify after shared changes. Read ../SITE-ADAPTATION.md before moving these foundations into a package.

Interactive roots register arrow functions through lib/mount-elements.ts and return cleanup; tags are DOM scopes, not custom elements. CopyButton reads live code from its frame; only command controls pass explicit text. lib/demo-source.ts generates consumer markup, geometry and behavior; lib/demo-files.ts formats the complete and split outputs. lib/site-build.mjs is the shared CSS inlining policy. See ../SITE-UPSTREAM.md for reviewed commits and ../SITE-AGENTS.md for lifecycle/loading contracts.

Follow the root [PageSpeed performance contract](../SITE-AGENTS.md#pagespeed-performance-contract) for targets, asset/loading conventions, layout stability, measurement evidence and publication verification. Keep this policy linked when replicating the theme.

Drawer-specific consumer geometry lives in `DemoStyles.astro`; motion comes from the public package stylesheet. `demo.ts` defines translated bottom/top/left/right/snap/nested scenarios. `DemoCode` shares real loading-mode tabs across all destinations; generated scripts and styles remain build-only in lib/demo-source.ts. Keep preview options, formatted outputs and execution checks synchronized. Never move package implementation into the theme.

DemoOptions defines only verified scenario options; DemoContent owns reusable authored form/scroll/action markup, DemoActions owns application actions, and the native package retains focus, gestures, sizing and locks. DemoSource/DemoFiles generate focused copied files; FrameworkExamples uses the same CodeFiles renderer and shared panel stylesheet without styling the host app body. Do not add duplicate configuration keys or synthesize test output from another loading mode.

## Integration and identity parity — 2026-10-20

Keep Framework integrations as a first-class guide for packages that support browser hosts. Provide real React/Vue/Svelte component lifecycle examples and Astro, Shopify and WordPress guidance when applicable; omit unsupported claims rather than inventing adapters. FrameworkExamples composes shared Tabs/CodeFiles and receives source groups; it must not contain one package's API. CMS examples need single asset loading, independent instances, host lifecycle cleanup and explicit support scope. Compile copied framework files and execute CMS output; Liquid/PHP fixtures are not real hosted deployments.

Use manifest.npmName for shared header/menu/footer branding and manifest.name for editorial copy. Preserve Ticker's original Hero compatibility composition: language/host labels with its existing wrapping and gaps. Do not add an unapproved extra Hero CTA merely to link integration guidance; use the existing onboarding/sidebar destinations. Check rendered identity, DOM composition and narrow/enlarged-text geometry as well as style fingerprints.

## Drawer content scrolling — 2026-10-20

The panel background pseudo-element extends beyond bottom/right edges for dragging. Making the panel itself overflow:auto turns this decorative extension into a large empty scroll range. Keep the positioned flex panel overflow visible and put min-height:0, flex:0 1 auto and overflow-y:auto on its body. Keep handle/title/close controls outside the scrolling body. Synchronize live preview CSS and generated complete/split/framework/CMS examples; do not disable runtime pseudo-elements or recreate gesture math. Test short content without excess scroll and actually scroll long content in its owning body, then close and restore focus. Icon glyphs must match adapted feature copy; retaining a predecessor's unrelated icons is not design parity.

Reading-only scroll areas also need a reachable focus target, an accessible name and a visible focus indicator. Validate PageDown/arrow-key scrolling in the owning body; an axe check and programmatically setting scrollTop are complementary checks, not substitutes for keyboard interaction.

The full-height bottom snap examples reserve the current runtime-provided `--initial-transform` offset as bottom padding while open. This keeps the flex body's scroll viewport inside the visible sheet, including compact snaps. The runtime still owns and writes the offset; the site does not measure it or compute snap positions. This is coupled to the pinned 5.0.0 styling contract and must be reviewed with package changes. Copied CSS and the live preview follow the same geometry. Temporary adaptation builds read historical migration evidence from the source Git checkout through DRAWER_MIGRATION_SOURCE_ROOT; generated routes and fragments are still checked in the temporary artifact.
