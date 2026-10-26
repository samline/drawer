import { test, expect, type Locator } from '@playwright/test'

const currentIsVisible = async (region: Locator) =>
  region.evaluate(element => {
    const current = element.querySelector<HTMLElement>('a[aria-current="page"]')
    if (!current) return false
    const viewport = element.getBoundingClientRect()
    const link = current.getBoundingClientRect()
    return (
      link.top >= viewport.top + element.clientTop - 1 &&
      link.bottom <= viewport.top + element.clientTop + element.clientHeight + 1
    )
  })

const currentIsNaturallyPositioned = async (region: Locator) =>
  region.evaluate(element => {
    const current = element.querySelector<HTMLElement>('a[aria-current="page"]')
    if (!current) return false
    const link = current.getBoundingClientRect()
    const viewport = element.getBoundingClientRect()
    return (
      link.top - viewport.top <= element.clientHeight * 0.4 ||
      element.scrollHeight - element.clientHeight - element.scrollTop <= 1
    )
  })

test('deep documentation links reveal the current page without scrolling the article', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 360 })
  await page.goto('docs/')
  const sidebar = page.locator('.sidebar')
  expect(await sidebar.evaluate(element => getComputedStyle(element, '::after').content)).toBe(
    'none'
  )
  const targets = await sidebar
    .locator('nav a')
    .evaluateAll(links => links.slice(-2).map(link => link.getAttribute('href')!))
  await page.goto(targets[1])
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => currentIsVisible(sidebar)).toBe(true)
  await expect.poll(() => currentIsNaturallyPositioned(sidebar)).toBe(true)
  expect(await sidebar.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => scrollY)).toBe(0)

  // A person may explore the menu freely; ordinary scrolling must not snap back.
  await sidebar.evaluate(element => {
    element.scrollTop = 0
  })
  await page.evaluate(
    () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
  expect(await sidebar.evaluate(element => element.scrollTop)).toBe(0)
  await page.evaluate(() =>
    scrollTo(0, Math.min(180, (document.documentElement.scrollHeight - innerHeight) / 2))
  )
  const articleScroll = await page.evaluate(() => scrollY)
  await page.setViewportSize({ width: 1280, height: 320 })
  await expect.poll(() => currentIsVisible(sidebar)).toBe(true)
  await expect.poll(() => currentIsNaturallyPositioned(sidebar)).toBe(true)
  expect(await page.evaluate(() => scrollY)).toBe(articleScroll)

  await sidebar.locator(`a[href="${targets[0]}"]`).click()
  await expect(sidebar.locator('[aria-current="page"]')).toHaveAttribute('href', targets[0])
  await expect.poll(() => currentIsVisible(sidebar)).toBe(true)
  await expect.poll(() => currentIsNaturallyPositioned(sidebar)).toBe(true)
  expect(await page.evaluate(() => scrollY)).toBe(0)

  // Reusing the DOM in a single mutation batch must remount the observer.
  await sidebar.evaluate(element => {
    const parent = element.parentNode!,
      next = element.nextSibling
    element.remove()
    parent.insertBefore(element, next)
    element.scrollTop = 0
  })
  await expect.poll(() => currentIsVisible(sidebar)).toBe(true)
  await expect.poll(() => currentIsNaturallyPositioned(sidebar)).toBe(true)
})

test('opening the mobile docs menu reveals the current page while the dialog keeps focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 360 })
  await page.goto('docs/')
  const target = await page.locator('.sidebar nav a').last().getAttribute('href')
  await page.setViewportSize({ width: 390, height: 500 })
  await page.goto(target!)
  await page.evaluate(() => document.fonts.ready)
  const trigger = page.locator('.mobile > button[aria-haspopup="dialog"]')
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt === 1)
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    await trigger.click()
    const panel = page.locator('.docs-menu-panel')
    await expect(panel).toBeVisible()
    await expect.poll(() => currentIsVisible(panel.locator('[data-drawer-body]'))).toBe(true)
    await expect
      .poll(() => currentIsNaturallyPositioned(panel.locator('[data-drawer-body]')))
      .toBe(true)
    await expect(panel).toBeFocused()
    const close = panel.locator('[data-drawer-close]')
    await expect(close).toBeInViewport({ ratio: 1 })
    if (attempt === 0) await close.click()
    else await page.keyboard.press('Escape')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
  await page.setViewportSize({ width: 1280, height: 360 })
  await expect.poll(() => currentIsVisible(page.locator('.sidebar'))).toBe(true)
})
