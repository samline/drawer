import { test, expect } from '@playwright/test'

test('guided configuration keeps choices while moving back and starts fresh after closing', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('examples/#wizard')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  const scope = page.locator('package-site-demo[data-preset="wizard"]')
  const trigger = scope.locator('button[data-open]')
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Make it your everyday tote', exact: true })
  await dialog.getByLabel('Canvas finish', { exact: true }).selectOption('Midnight canvas')
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Make it yours', exact: true })).toBeFocused()
  await dialog.getByLabel('Initials (optional)', { exact: true }).fill('AM')
  await dialog.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(dialog.getByLabel('Canvas finish', { exact: true })).toHaveValue('Midnight canvas')
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(dialog.getByLabel('Initials (optional)', { exact: true })).toHaveValue('AM')
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(dialog.locator('[data-flow-summary]')).toHaveText('Midnight canvas · AM')
  await dialog.getByRole('button', { name: 'Confirm sample selection', exact: true }).click()
  await expect(page.locator('[data-drawer]')).toHaveCount(0)
  await expect(scope.locator('[data-demo-result]')).toHaveText('Configured: Midnight canvas · AM')
  await trigger.click()
  await expect(scope.locator('[data-demo-result]')).toBeEmpty()
  await expect(dialog.getByLabel('Canvas finish', { exact: true })).toHaveValue('Natural canvas')
})

test('independent panels close separately, fit narrow screens and both clean up on remount', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('examples/#independent')
  const scope = page.locator('package-site-demo[data-preset="independent"]')
  const notes = page.getByRole('dialog', { name: 'Project notes', exact: true })
  const activity = page.getByRole('dialog', { name: 'Project activity', exact: true })
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(width => {
      document.documentElement.style.fontSize = width === 320 ? '200%' : ''
    }, width)
    await scope.locator('button[data-open]').click()
    await notes.getByLabel('Project review note', { exact: true }).fill('Review mobile spacing')
    await notes.getByRole('button', { name: 'Open activity', exact: true }).click()
    await expect(activity).toBeVisible()
    await expect(notes).not.toHaveAttribute('aria-modal', 'true')
    await expect(activity).not.toHaveAttribute('aria-modal', 'true')
    const a = (await notes.boundingBox())!
    const b = (await activity.boundingBox())!
    expect(a.x).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(width)
    if (width === 320) expect(a.y + a.height).toBeLessThanOrEqual(b.y)
    await activity.getByRole('button', { name: 'Close activity', exact: true }).click()
    await expect(notes).toBeVisible()
    await expect(notes.getByLabel('Project review note', { exact: true })).toHaveValue(
      'Review mobile spacing'
    )
    await notes.getByRole('button', { name: 'Open activity', exact: true }).click()
    await notes.getByRole('button', { name: 'Close drawer', exact: true }).click()
    await expect(activity).toBeVisible()
    await activity.getByRole('button', { name: 'Close activity', exact: true }).click()
    await expect(page.locator('[data-drawer]')).toHaveCount(0)
  }
  await scope.locator('button[data-open]').click()
  await notes.getByRole('button', { name: 'Open activity', exact: true }).click()
  await scope.evaluate(element => {
    const parent = element.parentNode!
    const next = element.nextSibling
    element.remove()
    parent.insertBefore(element, next)
  })
  await expect(page.locator('[data-drawer]')).toHaveCount(0)
  await expect(scope.locator('button[data-open]')).toHaveAttribute('aria-expanded', 'false')
  await expect(scope.locator('button[data-open-companion]')).toHaveAttribute(
    'aria-expanded',
    'false'
  )
})

test('custom invitation is a detached themed card with reachable content at enlarged mobile text', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('examples/#styled')
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        ({ theme, width }) => {
          document.documentElement.dataset.theme = theme
          document.documentElement.style.fontSize = width === 320 ? '200%' : ''
        },
        { theme, width }
      )
      await page.locator('#styled button[data-open]').click()
      const dialog = page.getByRole('dialog', { name: 'A place on the team', exact: true })
      await expect(dialog).toHaveClass(/demo-invitation/)
      const bounds = (await dialog.boundingBox())!
      expect(bounds.x).toBeGreaterThan(0)
      expect(bounds.y).toBeGreaterThan(0)
      expect(bounds.x + bounds.width).toBeLessThan(width)
      expect(bounds.y + bounds.height).toBeLessThan(901)
      const paint = await dialog.evaluate(el => getComputedStyle(el, '::before').backgroundImage)
      expect(paint).toContain('linear-gradient')
      await dialog.getByRole('button', { name: 'Accept sample invitation', exact: true }).click()
      await expect(page.locator('#styled [data-demo-result]')).toHaveText(
        'Selected: Accept sample invitation'
      )
      await expect(page.locator('[data-drawer]')).toHaveCount(0)
    }
  }
})

test('the native animation carries the floating card fully outside the viewport on close', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('examples/#styled')
  await page.locator('#styled button[data-open]').click()
  const dialog = page.getByRole('dialog', { name: 'A place on the team', exact: true })
  await dialog.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)))
  const exitPosition = dialog.evaluate(
    el =>
      new Promise<number>(resolve => {
        el.addEventListener('animationend', event => {
          if ((event as AnimationEvent).animationName === 'slideToBottom')
            resolve(el.getBoundingClientRect().top)
        })
      })
  )
  await dialog.getByRole('button', { name: 'Close drawer', exact: true }).click()
  expect(await exitPosition).toBeGreaterThanOrEqual(900)
  await expect(page.locator('[data-drawer]')).toHaveCount(0)
})
