import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { project } from '../shared/lib/project.mjs'

test('historical Starlight fragments resolve to migrated sections, including moved articles', async ({
  page,
}) => {
  const { starlight } = JSON.parse(
    await readFile(new URL('../site-tools/doc-migration.json', import.meta.url), 'utf8')
  )
  for (const [route, fragment] of [
    ['', 'why-samlinedrawer'],
    ['', 'next-steps'],
    ['getting-started', 'the-controller'],
    ['reference/examples', 'recipe-complete-bundler-example'],
    ['reference/examples', 'recipe-render-a-pre-built-form-in-a-drawer'],
    ['reference/api', 'createdraweroptions'],
  ]) {
    const article = starlight.articles.find((item: any) => item.legacyRoute === route)
    const expected = article.fragments.find((item: any) => item.source === fragment).destination
    await page.goto(`${project.base}${route}${route ? '/' : ''}#${fragment}`)
    await expect(page).toHaveURL(
      new RegExp(`${project.docsBase}${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
    )
    await expect(page.locator(`[id="${expected.split('#')[1]}"]`)).toBeAttached()
  }
})
