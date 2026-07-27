// astro.config.mjs
//
// This file glues Astro + Starlight together. All package-specific
// settings live in `site.config.mjs` — DO NOT edit values here.
//
// To customise your docs site:
//   1. Open  site.config.mjs  in the project root.
//   2. Change title / description / site / base / editLinkBaseUrl.
//   3. Populate content in `src/content/docs/`.
//
// Read the agent instructions in  AGENTS.md  for a full workflow.

import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import siteConfig from './site.config.mjs';

export default defineConfig({
	// `site` and `base` come straight from site.config.mjs so the same
	// template works for every package in the monorepo. Just edit the
	// values in site.config.mjs and commit — GitHub Actions will take
	// care of the rest.
	site: siteConfig.site,
	base: siteConfig.base,

	integrations: [
		starlight({
			title: siteConfig.title,
			description: siteConfig.description,

			// "Edit this page" → points to the source file on GitHub.
			editLink: { baseUrl: siteConfig.editLinkBaseUrl },

			// If the user defined a sidebar, use it; otherwise let
			// Starlight auto-generate one from src/content/docs/.
			...(siteConfig.sidebar.length > 0
				? { sidebar: siteConfig.sidebar }
				: {}),

			social: siteConfig.social,
			defaultLocale: siteConfig.defaultLocale,
			locales: siteConfig.locales,

			// Project-level custom stylesheet — safe place for tweaks.
			customCss: ['./src/styles/custom.css'],

			// Practical defaults for documentation sites.
			lastUpdated: true,
			pagination: true,
			// pagefind is also enabled by default for site search.
			head: [
				{
					tag: 'meta',
					attrs: { name: 'viewport', content: 'width=device-width' },
				},
			],
		}),
	],
});
