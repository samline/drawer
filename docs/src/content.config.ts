import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import en from './i18n/translations/en'
const articles = glob({
  pattern: '**/*.{md,mdx}',
  base: './src/content/docs',
  generateId: ({ entry }) => entry.replace(/\.mdx?$/, ''),
})
const docs = defineCollection({
  loader: {
    name: 'package-site-documentation',
    async load(context) {
      await articles.load(context)
      const source = new URL('../CHANGELOG.md', context.config.root)
      const loadChangelog = async () => {
        const body = (await readFile(source, 'utf8')).replace(/^# Changelog\s*\n/, '')
        const data = await context.parseData({
          id: 'changelog',
          data: { ...en.changelog, locale: 'en', sidebar: { group: 'guides', order: 8 } },
        })
        context.store.set({
          id: 'changelog',
          data,
          body,
          digest: context.generateDigest(body + JSON.stringify(data)),
          rendered: await context.renderMarkdown(body, { fileURL: source }),
        })
      }
      await loadChangelog()
      context.watcher?.add(fileURLToPath(source))
      context.watcher?.on('change', async path => {
        if (path === fileURLToPath(source)) await loadChangelog()
      })
    },
  },
  schema: z.object({
    title: z.string().trim().min(1),
    titleAccent: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1),
    locale: z.enum(['en']),
    sidebar: z.object({
      group: z.enum(['start', 'guides', 'reference', 'api']),
      hidden: z.boolean().optional(),
      order: z.number().int().positive(),
    }),
  }),
})
export const collections = { docs }
