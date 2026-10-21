import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('new interaction states keep named controls, readable contrast and narrow layouts', async ({
  page,
}) => {
  test.setTimeout(90000)
  const axe = await readFile(
    new URL('../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8'
  )
  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const preset of ['form', 'scroll', 'nonmodal', 'handle', 'update', 'controlled']) {
    await page.goto(`examples/#${preset}`)
    await page.addScriptTag({ content: axe })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme
      }, theme)
      await page
        .locator(`#${preset}`)
        .getByRole('button', { name: 'Open drawer', exact: true })
        .click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const violations = await page.evaluate(async () =>
        (
          await (window as any).axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations.map((item: any) => ({
          id: item.id,
          nodes: item.nodes.map((n: any) => n.target),
        }))
      )
      expect(violations, `${preset} ${theme}`).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        320
      )
      await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
      await expect(dialog).not.toBeVisible()
    }
  }
})
