import { fileURLToPath } from 'node:url'
import { developmentRedirect } from '../shared/lib/development-routes.mjs'
import { defineConfig } from 'astro/config'
import tailwind from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'
import { inlineSmallStylesheets } from '../shared/lib/site-build.mjs'
import { project } from '../shared/lib/project.mjs'
export default defineConfig({
  site: project.url,
  base: project.base === '/' ? '/' : project.base.slice(0, -1),
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  vite: {
    plugins: [
      tailwind(),
      developmentRedirect({ origin: 'http://127.0.0.1:4341', include: project.docsBase }),
    ],
    resolve: {
      alias: [
        {
          find: /^@samline\/drawer\/browser$/,
          replacement: fileURLToPath(new URL('../src/browser/index.ts', import.meta.url)),
        },
        {
          find: /^@samline\/drawer$/,
          replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
        },
        {
          find: /^@samline\/drawer\/(styles|style)\.css(?=\?|$)/,
          replacement: fileURLToPath(new URL('../src/style.css', import.meta.url)),
        },
      ],
    },
    build: { assetsInlineLimit: inlineSmallStylesheets },
    define: { 'import.meta.env.BASE_URL': JSON.stringify(project.base) },
  },
})
