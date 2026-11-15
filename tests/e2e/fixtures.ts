import { test as base, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const bundle = (pkg: string) =>
  fileURLToPath(new URL(`../../dist/browser/${pkg}.global.js`, import.meta.url))

/** A blank page with this package's browser bundle loaded. */
export const test = base.extend<{ load: (html: string, ...pkgs: string[]) => Promise<Page> }>({
  load: async ({ page }, use) => {
    await use(async (html, ...pkgs) => {
      await page.setContent(`<!doctype html><html><body style="margin:0">${html}</body></html>`)
      for (const pkg of pkgs) await page.addScriptTag({ path: bundle(pkg) })
      return page
    })
  },
})

export { expect } from '@playwright/test'
