import { test, expect } from '@playwright/test'

test('package identity and compatibility preserve the shared Hero composition', async ({
  page,
}) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('./')
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme
      }, theme)
      await expect(page.locator('header .logo-name')).toHaveText('@samline/drawer')
      await expect(page.locator('.compatibility > a')).toHaveCount(0)
      const row = page.locator('.compatibility > div')
      const result = await row.evaluate(el => {
        const style = getComputedStyle(el)
        const boxes = [...el.children].map(child => child.getBoundingClientRect())
        return {
          display: style.display,
          gap: parseFloat(style.columnGap),
          fits: boxes.every(box => box.left >= 0 && box.right <= innerWidth),
          separated: boxes.every(
            (box, i) =>
              i === 0 ||
              Math.abs(box.top - boxes[i - 1].top) > 2 ||
              box.left - boxes[i - 1].right > 10
          ),
        }
      })
      expect(result).toMatchObject({ display: 'flex', fits: true, separated: true })
      expect(result.gap).toBeGreaterThan(16)
      await expect(page.locator('footer').getByRole('link', { name: /^npm(?: |$)/ })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
    }
  }
})
