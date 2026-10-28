import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const markdown = readFileSync('docs/src/content/docs/reference/css-styling.md', 'utf8')
const blocks = [...markdown.matchAll(/```(ts|css)\n([\s\S]*?)\n```/g)]
const recipe = blocks.find(
  block => block[1] === 'ts' && block[2].includes("id: 'lateral-recipe'")
)![2]
const css = blocks.filter(block => block[1] === 'css').at(-1)![2]

test('copied lateral recipe preserves a vertical grip, accessible title and separate scrolling body', async ({
  page,
}) => {
  await page.setContent(
    `<style>${readFileSync('dist/style.css', 'utf8')}\n${css}</style><template id="filters">${'<p>Filter choice</p>'.repeat(100)}</template>`
  )
  await page.addScriptTag({ path: 'dist/browser/global.global.js' })
  await page.addScriptTag({
    content: ts.transpileModule(`const { createDrawer } = window.Drawer;\n${recipe}`, {
      compilerOptions: { target: ts.ScriptTarget.ES2020 },
    }).outputText,
  })
  const dialog = page.locator('[data-drawer]')
  await expect(dialog).toBeVisible()
  const handle = dialog.locator('[data-drawer-handle]')
  const dimensions = await handle.boundingBox()
  expect(dimensions!.height).toBeGreaterThan(dimensions!.width)
  const title = dialog.locator('[data-drawer-title]')
  await expect(dialog).toHaveAttribute(
    'aria-labelledby',
    (await title.getAttribute('id')) as string
  )
  const scroll = await dialog.locator('[data-drawer-body]').evaluate(element => ({
    height: element.clientHeight,
    full: element.scrollHeight,
    overflow: getComputedStyle(element).overflowY,
  }))
  expect(scroll.full).toBeGreaterThan(scroll.height)
  expect(scroll.overflow).toBe('auto')
  const close = dialog.locator('[data-drawer-close]')
  await expect(close).toBeVisible()
  await close.click()
  await expect(dialog).not.toBeVisible()
})
