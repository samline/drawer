import { test, expect } from '@playwright/test'

test('headers stay on one row and keep their actions visible', async ({ page }) => {
  // Sibling names are short (@samline/formatter is the longest published one).
  // Between 64rem and 75rem GitHub is icon-only and the version badge hides.
  for (const path of ['./', 'examples/', 'docs/'])
    for (const width of [1024, 1100, 1200, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 })
      await page.goto(path)
      const header = page.locator('package-site-header, package-site-docs-header').first()
      const centers = await header.evaluate(root => {
        for (const name of root.querySelectorAll('.logo-name'))
          name.textContent = '@samline/formatter'
        return [...root.querySelectorAll('a, button')]
          .map(item => item.getBoundingClientRect())
          .filter(box => box.width > 0 && box.height > 0)
          .map(box => box.top + box.height / 2)
      })
      expect(Math.max(...centers) - Math.min(...centers), `${path} at ${width}px`).toBeLessThan(8)
      if (path !== 'docs/') {
        await expect(header.getByRole('link', { name: 'GitHub' })).toBeVisible()
        await expect(header.locator('a.btn').filter({ hasText: 'Get started' })).toBeVisible()
        await expect(
          header.getByRole('navigation').getByRole('link', { name: 'Docs' })
        ).toBeVisible()
      }
    }
})
