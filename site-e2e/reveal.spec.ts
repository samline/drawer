import { test, expect } from '@playwright/test'

test('initial viewport content stays visible while reveal observers initialize', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const hidden: string[] = []
    Object.assign(window, { initialHiddenReveals: hidden })
    new MutationObserver(records => {
      for (const { target } of records) {
        if (
          !(target instanceof HTMLElement) ||
          !target.matches('package-site-reveal[data-pending]')
        )
          continue
        if (target.getBoundingClientRect().top < innerHeight) hidden.push(target.textContent ?? '')
      }
    }).observe(document, { attributes: true, attributeFilter: ['data-pending'], subtree: true })
  })
  await page.goto('./')
  await expect(page.locator('package-site-reveal').first()).toHaveAttribute('data-mounted', 'true')
  await expect(page.locator('package-site-reveal[data-pending]').first()).toBeAttached()
  expect(await page.evaluate(() => Reflect.get(window, 'initialHiddenReveals'))).toEqual([])
})

test('a tall block starts fading just before entering the viewport', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('package-site-reveal').first()).toHaveAttribute('data-mounted', 'true')
  await page.evaluate(() => {
    const reveal = document.createElement('package-site-reveal')
    reveal.id = 'tall-reveal'
    const block = document.createElement('div')
    block.style.height = '3000px'
    reveal.append(block)
    document.querySelector('main')!.append(reveal)
  })
  const reveal = page.locator('#tall-reveal')
  await expect(reveal).toHaveAttribute('data-pending', 'true')
  await page.evaluate(() => {
    const top = document.querySelector('#tall-reveal > div')!.getBoundingClientRect().top + scrollY
    window.scrollTo(0, top - innerHeight - 32)
  })
  await expect(reveal).not.toHaveAttribute('data-pending')
  await expect.poll(() => reveal.evaluate(el => getComputedStyle(el).opacity)).toBe('1')
  // It stays revealed when the visitor scrolls back out and returns.
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(reveal).not.toHaveAttribute('data-pending')
})
