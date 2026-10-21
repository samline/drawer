import { test, expect } from '@playwright/test'

test('long API page titles and descriptions wrap at enlarged mobile text without clipping', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('docs/getting-started/')
  await page.locator('.page-title h1').evaluate(el => {
    el.textContent = 'configureDrawer(options?)'
  })
  await page.locator('.page-title .description').evaluate(el => {
    el.textContent = 'configureDrawer(options?): behavior, signatures and examples.'
  })
  await page.locator('.breadcrumb .section-name').evaluate(el => {
    el.textContent = 'createDrawerController(options?)'
  })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => {
      document.documentElement.dataset.theme = theme
    }, theme)
    const size = await page.locator('.page-title').evaluate(el => ({
      right: el.getBoundingClientRect().right,
      children: [...el.children].map(child => child.getBoundingClientRect().right),
      clipping: ['hidden', 'clip'].includes(getComputedStyle(el).overflowX),
      pageWidth: document.documentElement.scrollWidth,
    }))
    expect(size.clipping).toBe(false)
    expect(size.pageWidth).toBeLessThanOrEqual(320)
    for (const right of size.children) expect(right).toBeLessThanOrEqual(size.right + 1)
  }
})

test('expanded source files stay inside mobile gutters with enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('examples/')
  await page.locator('.playground > details > summary').first().click()
  const viewer = page.locator('[data-code-files]:visible').first()
  for (const size of ['100%', '200%']) {
    await page.evaluate(size => {
      document.documentElement.style.fontSize = size
    }, size)
    for (const tab of await viewer.getByRole('tab').all()) {
      await tab.click()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        size
      ).toBeLessThanOrEqual(320)
      const panel = viewer.getByRole('tabpanel')
      const bounds = await panel.boundingBox()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
    }
  }
})
