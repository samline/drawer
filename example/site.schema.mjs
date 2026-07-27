// site.schema.mjs
//
// Type-safe validation for the values declared in `site.config.mjs`.
// The exported `defineSiteConfig()` helper:
//   • gives you editor autocompletion for every supported field
//   • fails loudly at config-load time if a value is missing/wrong
//
// You don't need to edit this file unless you want to extend the
// supported configuration surface.

import { z } from 'astro/zod';

/**
 * JSDoc typedef used by `site.config.mjs`. The actual shape comes
 * from `defineSiteConfig()`'s return value, which is inferred from
 * the Zod schema below — there's nothing else to import.
 *
 * @typedef {{
 *   title: string,
 *   description: string,
 *   site: string,
 *   base: string,
 *   editLinkBaseUrl: string,
 *   sidebar: Array<unknown>,
 *   social: Array<{ icon: string, label: string, href: string }>,
 *   defaultLocale: string,
 *   locales: Record<string, { label: string, lang?: string, dir?: 'ltr' | 'rtl' }>,
 * }} SiteConfig
 */

const SidebarItemSchema = z.union([
	// Plain string shorthand:    'getting-started'
	z.string(),
	// Explicit object with slug, label, link, group, or autogenerate.
	z.object({
		label: z.string().optional(),
		link: z.string().optional(),
		slug: z.string().optional(),
		badge: z.string().optional(),
		collapsed: z.boolean().optional(),
		items: z.array(z.lazy(() => SidebarItemSchema)).optional(),
		autogenerate: z
			.object({
				directory: z.string(),
				collapsed: z.boolean().optional(),
			})
			.optional(),
	}),
]);

const SocialLinkSchema = z.object({
	icon: z.string(),
	label: z.string(),
	href: z.url(),
});

const LocaleSchema = z.object({
	label: z.string(),
	lang: z.string().optional(),
	dir: z.enum(['ltr', 'rtl']).optional(),
});

const SiteConfigSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	site: z.url(),
	base: z.string().regex(/^\/[a-zA-Z0-9_\-./]*$/, {
		message: '`base` must start with `/` and contain no trailing slash',
	}),
	editLinkBaseUrl: z.url(),
	sidebar: z.array(SidebarItemSchema),
	social: z.array(SocialLinkSchema),
	defaultLocale: z.string().min(2),
	locales: z.record(z.string(), LocaleSchema),
});

/**
 * Validates and returns the provided site config, normalised so
 * `astro.config.mjs` can rely on every field being present.
 *
 * @param {unknown} raw
 * @returns {SiteConfig}
 */
export function defineSiteConfig(raw) {
	const parsed = SiteConfigSchema.parse(raw);

	// "Not-yet-configured" detection: the template ships with
	// `YOUR_GITHUB_USERNAME` / `YOUR_PACKAGE_NAME` placeholders. Until
	// the user replaces them, we want `npm run dev` to work out of
	// the box. We detect placeholders and fall back to a local server
	// on root, then return normalised values for everything else.
	const hasPlaceholder =
		parsed.site.includes('YOUR_GITHUB_USERNAME') ||
		parsed.base.includes('YOUR_PACKAGE_NAME') ||
		parsed.editLinkBaseUrl.includes('YOUR_GITHUB_USERNAME') ||
		parsed.editLinkBaseUrl.includes('YOUR_PACKAGE_NAME');

	const site = hasPlaceholder
		? 'http://localhost:4321'
		: parsed.site.replace(/\/$/, '');

	let base = parsed.base;
	if (!base.startsWith('/')) base = `/${base}`;
	if (base !== '/' && base.endsWith('/')) base = base.slice(0, -1);
	if (base === '') base = '/';
	if (hasPlaceholder) base = '/';

	const editLinkBaseUrl = hasPlaceholder
		? 'https://github.com/'
		: parsed.editLinkBaseUrl.replace(/\/$/, '') + '/';

	return {
		...parsed,
		site,
		base,
		editLinkBaseUrl,
	};
}
