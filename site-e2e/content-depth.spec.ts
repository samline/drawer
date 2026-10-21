import { test, expect } from '@playwright/test'

test('Get started keeps both loading modes focused and compatibility retains the Ticker composition', async ({
  page,
}) => {
  await page.goto('./')
  await expect(page.locator('.compatibility')).toContainText('JavaScript')
  await expect(page.locator('.compatibility')).toContainText('TypeScript')
  await expect(page.locator('.compatibility')).toContainText('React')
  // The init tabs are independent of the installer tabs.
  const init = page.locator('#how').getByRole('tablist', { name: 'Example format' })
  const card = page.locator('#how article').last()
  await init.getByRole('tab', { name: 'Package / ESM', exact: true }).click()
  const before = await card.boundingBox()
  await init.getByRole('tab', { name: 'HTML / CDN', exact: true }).click()
  const code = card.locator('code:visible')
  expect(await code.textContent()).toContain('window.Drawer.createDrawer')
  expect(await code.textContent()).not.toContain('<!doctype')
  const after = await card.boundingBox()
  expect(after!.height - before!.height).toBeLessThan(120)
  await expect(page.locator('.compatibility > a')).toHaveCount(0)
})
