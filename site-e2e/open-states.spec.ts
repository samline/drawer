import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

for (const preset of [
  'form',
  'scroll',
  'nonmodal',
  'handle',
  'update',
  'controlled',
  'top',
  'left',
  'account',
  'actions',
  'confirm',
  'wizard',
  'independent',
  'styled',
]) {
  test(`${preset}: named controls, readable contrast and narrow layouts in both themes`, async ({
    page,
  }) => {
    const axe = await readFile(
      new URL('../node_modules/axe-core/axe.min.js', import.meta.url),
      'utf8'
    )
    await page.setViewportSize({ width: 320, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const fragment = preset === 'top' ? 'top-panel' : preset
    await page.goto(`examples/#${fragment}`)
    await page.addScriptTag({ content: axe })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme
      }, theme)
      await page
        .locator(`#${fragment}`)
        .getByRole('button', { name: 'Open drawer', exact: true })
        .click()
      const openDialog = page.getByRole('dialog')
      await expect(openDialog).toBeVisible()
      const drawerId = await openDialog.getAttribute('data-drawer-id')
      const dialog = page.locator(`[data-drawer][data-drawer-id="${drawerId}"]`)
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
      if (preset === 'confirm') await dialog.locator('button[data-demo-choice]').first().click()
      else await dialog.getByRole('button', { name: 'Close drawer', exact: true }).click()
      await expect(dialog).toHaveCount(0)
    }
  })
}
