import { test, expect } from '@playwright/test'
import { createRequire } from 'node:module'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Opt-in compiler dependencies are development-only; no framework enters the website or package bundle.
const modules = process.env.DRAWER_FRAMEWORK_NODE_MODULES
for (const framework of ['React', 'Vue', 'Svelte']) {
  test(`rendered ${framework} component opens, closes and cleans up its own instance`, async ({
    page,
    context,
  }) => {
    test.skip(
      !modules,
      'Set DRAWER_FRAMEWORK_NODE_MODULES to a temporary npm install of react/react-dom/vue/svelte.'
    )
    const directory = await mkdtemp(join(tmpdir(), 'drawer-framework-'))
    const require = createRequire(import.meta.url)
    const frameworkRequire = createRequire(join(modules!, '../package.json'))
    const { build } = await import(
      pathToFileURL(
        require.resolve('vite', { paths: [fileURLToPath(new URL('../landing', import.meta.url))] })
      ).href
    )
    const example = await context.newPage()
    try {
      await page.goto('docs/guides/frameworks/')
      await page
        .getByRole('tablist', { name: 'Choose your framework', exact: true })
        .getByRole('tab', { name: framework, exact: true })
        .click()
      const viewer = page.locator('[data-framework-examples] [data-code-files]:visible')
      await viewer.getByRole('tab', { name: framework, exact: true }).click()
      const component = await viewer
        .getByRole('tabpanel', { name: framework, exact: true })
        .locator('code')
        .textContent()
      await viewer.getByRole('tab', { name: 'CSS', exact: true }).click()
      const css = await viewer
        .getByRole('tabpanel', { name: 'CSS', exact: true })
        .locator('code')
        .textContent()
      const extension = framework === 'React' ? 'jsx' : framework.toLowerCase()
      await writeFile(join(directory, `Filters.${extension}`), component!)
      await writeFile(join(directory, 'drawer.css'), css!)
      const entries = {
        React: `import React from 'react';import {StrictMode} from 'react';import {createRoot} from 'react-dom/client';import {Filters} from './Filters.jsx';const root=createRoot(document.getElementById('app'));root.render(<StrictMode><Filters /></StrictMode>);window.unmount=()=>root.unmount()`,
        Vue: `import {createApp} from 'vue';import Filters from './Filters.vue';const app=createApp(Filters);app.mount('#app');window.unmount=()=>app.unmount()`,
        Svelte: `import {mount,unmount} from 'svelte';import Filters from './Filters.svelte';const app=mount(Filters,{target:document.getElementById('app')});window.unmount=()=>unmount(app)`,
      }
      await writeFile(join(directory, 'main.jsx'), entries[framework as keyof typeof entries])
      await writeFile(
        join(directory, 'index.html'),
        '<html lang="en"><body><div id="app"></div><script type="module" src="/main.jsx"></script></body></html>'
      )
      await build({
        root: directory,
        configFile: false,
        logLevel: 'silent',
        esbuild: { jsx: 'automatic' },
        resolve: {
          conditions: ['browser'],
          alias: [
            {
              find: /^@samline\/drawer\/styles\.css$/,
              replacement: fileURLToPath(new URL('../dist/style.css', import.meta.url)),
            },
            {
              find: /^@samline\/drawer$/,
              replacement: fileURLToPath(new URL('../dist/index.js', import.meta.url)),
            },
            ...['react', 'react-dom', 'vue'].map(name => ({
              find: name,
              replacement: join(modules!, name),
            })),
          ],
        },
        plugins: [
          {
            name: 'test-framework-compiler',
            enforce: 'pre',
            resolveId(id: string) {
              if (id === 'svelte') return join(modules!, 'svelte/src/index-client.js')
              if (id.startsWith('svelte/')) return frameworkRequire.resolve(id)
            },
            transform(source: string, id: string) {
              if (id.endsWith('.vue')) {
                const { parse, compileScript } = frameworkRequire('@vue/compiler-sfc')
                return {
                  code: compileScript(parse(source).descriptor, {
                    id: 'filters',
                    inlineTemplate: true,
                  }).content,
                  map: null,
                }
              }
              if (id.endsWith('.svelte')) {
                const { compile } = frameworkRequire('svelte/compiler')
                return {
                  code: compile(source, { filename: id, generate: 'client', css: 'injected' }).js
                    .code,
                  map: null,
                }
              }
            },
          },
        ],
        build: { outDir: 'out' },
      })
      const errors: string[] = []
      example.on('pageerror', error => errors.push(error.message))
      await example.route('**/*', async route => {
        const path = new URL(route.request().url()).pathname
        await route.fulfill({
          body: await readFile(join(directory, 'out', path === '/' ? 'index.html' : path)),
          contentType: path.endsWith('.js')
            ? 'text/javascript'
            : path.endsWith('.css')
              ? 'text/css'
              : 'text/html',
        })
      })
      await example.goto('https://framework.test/')
      const trigger = example.locator('#app button').first()
      await trigger.click()
      await expect(example.getByRole('dialog')).toBeVisible()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await example.getByRole('button', { name: 'Close filters', exact: true }).click()
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await trigger.click()
      await example.evaluate(async () => {
        await (window as any).unmount()
      })
      await expect(example.locator('[data-drawer-vanilla-root]')).toHaveCount(0)
      expect(errors).toEqual([])
    } finally {
      await example.close()
      await rm(directory, { recursive: true, force: true })
    }
  })
}
