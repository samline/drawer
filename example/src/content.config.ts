// src/content.config.ts
//
// Content-collections configuration for Starlight. The schema below
// mirrors the official defaults so every frontmatter field has
// proper type-checking under `astro check`.
//
// If you need extra frontmatter fields (e.g. `version`, `since`, etc.)
// extend the `docsSchema()` call — see:
// https://starlight.astro.build/reference/frontmatter/#customize-frontmatter-schema

import { defineCollection } from 'astro:content';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema(),
	}),
	i18n: defineCollection({
		loader: i18nLoader(),
		schema: i18nSchema(),
	}),
};
