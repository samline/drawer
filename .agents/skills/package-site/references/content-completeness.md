# Package content and migration review

A theme adaptation needs a capability review as well as a source/API inventory. Record the result in `content-audit.json.capabilityReview`; leave it pending until evidence and useful destinations exist.

## Integrations and vocabulary

Separate these concepts: language (JavaScript/TypeScript), framework or host (React/Vue/Svelte/Astro/CMS), module format (ESM/CommonJS), delivery (npm/CDN/self-hosted), and runtime namespace. Do not replace a consumer-facing compatibility row with only distribution labels. Claim only integrations supported by the package's actual browser/server boundaries. Explain whether a framework has an adapter or uses the ordinary DOM API; show mount/update/unmount ownership and avoid sharing one DOM subtree between two renderers. Link visible compatibility claims to useful guidance, and compile/execute copied framework code when provided.

## Distinct use cases

Build a small matrix of capability → user task → working example → expected observable result. Four directions or cosmetic variants may be useful, but do not substitute for different interactions. For a dialog package, possibilities include forms, independent scrolling, non-modal inspection, nested flows, explicit sizing and dynamic updates. Another package needs its own inventory, not this exact list or a fixed example count. Reuse the Home preview across destinations, explain intentional interaction differences, and execute actual copied files in every advertised loading mode. A static screenshot or an API-name inventory cannot prove those flows.

## Onboarding depth

Keep install, minimal markup/styles and initialization as separate steps. Loading-mode tabs must show equivalent initialization scope: do not compare a short ESM call against a complete HTML/CSS/JS document. Keep complete/split runnable files in a labeled viewer or linked first-steps guide. Verify switching modes does not unexpectedly expand the whole page, and explain stylesheet/script order. Preserve code highlighting, exact copying and the package's accessible controls.

## Existing documentation

Find original docs wherever the repository keeps them, including `example/src/content/docs`, `examples/`, historical docs and exported declarations. The importer's recursive scan is discovery, not proof of migration. Inventory every article, major section, public fragment and meaningful recipe, then reconcile semantics with current source/types/tests. Old prose may contain stale versions, wrong defaults, return types or focus behavior; preserve information by correcting it, not by copying errors.

Record each old route/fragment and its actual generated destination. Check generated anchors and redirects, including fragments that moved to another article. Keep Git revision/path and content hashes for retired sources. Remove the previous Starlight application only after this review and the user's authorized migration scope support retirement; remove its build references too. Do not retain a duplicate application merely as evidence when the committed Git history already preserves it. Do not delete unrelated package examples.

## Completion evidence

Review full routes and open interactive states in both themes, narrow/desktop and enlarged text. Check named controls, focus return, validation/status announcements, scrollable code/panels and non-modal differences. Verify unique page titles/descriptions, one charset/viewport, canonical/social URLs, valid structured data, sitemap and historical routes. Automated axe and source hashes supplement semantic review; neither replaces it. Record actual tests and limitations, then synchronize the skill, project memory, app/shared notes and capability inventory.
