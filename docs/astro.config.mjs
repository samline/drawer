import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import tailwind from '@tailwindcss/vite'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { unified } from '@astrojs/markdown-remark'
import accessibleOverflow from './scripts/rehype-accessible-code.mjs'
import { codeTheme } from '../shared/lib/code-theme.mjs'
import { inlineSmallStylesheets } from '../shared/lib/site-build.mjs'
import { project } from '../shared/lib/project.mjs'
export default defineConfig({
  site: project.origin,
  base: project.docsBase.slice(0, -1),
  output: 'static',
  trailingSlash: 'always',
  i18n: { defaultLocale: 'en', locales: ['en'], routing: { prefixDefaultLocale: false } },
  integrations: [mdx(), sitemap()],
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwind()],

    resolve: {
      alias: [
        {
          find: /^@samline\/drawer\/browser$/,
          replacement: fileURLToPath(new URL('../src/browser/index.ts', import.meta.url))
        },
        { find: /^@samline\/drawer$/, replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)) },
        {
          find: /^@samline\/drawer\/(styles|style)\.css(?=\?|$)/,
          replacement: fileURLToPath(new URL('../src/style.css', import.meta.url))
        }
      ]
    },
    build: { assetsInlineLimit: inlineSmallStylesheets }
  },
  markdown: {
    processor: unified({ rehypePlugins: [accessibleOverflow] }),
    syntaxHighlight: 'shiki',
    shikiConfig: { theme: codeTheme }
  }
})
