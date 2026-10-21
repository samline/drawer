import { test, expect } from '@playwright/test'

test('stateful previews reset by default and can retain their state without reloading', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('examples/')
  await expect(page.locator('[data-demo-reset]')).toHaveCount(12)
  const preview = page.locator('#update package-site-demo')
  const reset = preview.getByRole('checkbox', { name: 'Reset between attempts' })
  await expect(reset).toBeChecked()
  const open = preview.getByRole('button', { name: 'Open drawer', exact: true })
  await open.click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Order STUDIO-1042')
  await page.getByRole('button', { name: 'Show packing update' }).click()
  await expect(page.getByRole('dialog')).toContainText('Packed and ready to go')
  await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
  await expect(page.locator('[data-drawer]')).toHaveCount(0)
  await open.click()
  await expect(page.getByRole('button', { name: 'Show packing update' })).toBeVisible()
  await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
  await expect(page.locator('[data-drawer]')).toHaveCount(0)
  await reset.uncheck()
  await open.click()
  await page.getByRole('button', { name: 'Show packing update' }).click()
  await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
  await expect(page.locator('[data-drawer]')).toHaveCount(0)
  await open.click()
  await expect(page.getByRole('dialog')).toContainText('Packed and ready to go')
  await expect(page.getByRole('button', { name: 'Show packing update' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
  await expect(page.locator('[data-drawer]')).toHaveCount(0)
  await reset.check()
  await open.click()
  await expect(page.getByRole('button', { name: 'Show packing update' })).toBeVisible()
  await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
  await expect(page.locator('[data-drawer]')).toHaveCount(0)
})

test('every result-producing example has a working reset and opt-out, including page actions', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('examples/')
  for (const preset of [
    'bottom',
    'top',
    'left',
    'right',
    'form',
    'nonmodal',
    'account',
    'actions',
    'confirm',
    'styled',
    'wizard',
  ]) {
    const scope = page.locator(`package-site-demo[data-preset="${preset}"]`)
    const reset = scope.getByRole('checkbox', { name: 'Reset between attempts' })
    const trigger = scope.locator('button[data-open]')
    const result = scope.locator('[data-demo-result]')
    await expect(reset, preset).toBeChecked()
    for (const retain of [false, true]) {
      if (retain) await reset.uncheck()
      await trigger.click()
      const dialog = page.getByRole('dialog')
      if (preset === 'nonmodal') {
        await dialog.getByRole('checkbox', { name: 'Show canvas grid' }).check()
        await expect(scope).toHaveAttribute('data-preview-grid', '')
        await scope.getByRole('button', { name: 'Try a page action' }).click()
        await expect(result).toHaveText('The page is still interactive.')
        await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
        await expect(page.locator('[data-drawer]')).toHaveCount(0)
        if (!retain) {
          await expect(result).toBeEmpty()
          await expect(scope).not.toHaveAttribute('data-preview-grid')
        }
      } else if (preset === 'wizard') {
        await dialog.getByRole('button', { name: 'Continue', exact: true }).click()
        await dialog.getByLabel('Initials (optional)').fill('AM')
        await dialog.getByRole('button', { name: 'Continue', exact: true }).click()
        await dialog.getByRole('button', { name: 'Confirm sample selection', exact: true }).click()
        await expect(result).toHaveText('Configured: Natural canvas · AM')
      } else if (preset === 'form') {
        await dialog.getByLabel('Category', { exact: true }).selectOption('Books')
        await dialog
          .getByRole('combobox', { name: 'Sort by', exact: true })
          .selectOption('Newest first')
        await dialog.getByRole('button', { name: 'Apply filters' }).click()
        await expect(result).toHaveText('Selected category: Books · Newest first')
      } else {
        if (preset === 'top') await dialog.getByRole('searchbox').fill('teammate')
        await dialog.locator('button[data-demo-choice]:visible').first().click()
        await expect(result).toContainText('Selected:')
      }
      await expect(page.locator('[data-drawer]')).toHaveCount(0)
      const previous = await result.textContent()
      await trigger.click()
      if (retain) await expect(result, preset).toHaveText(previous!)
      else await expect(result, preset).toBeEmpty()
      if (preset === 'form') {
        await expect(page.getByRole('dialog').getByLabel('Category', { exact: true })).toHaveValue(
          'All products'
        )
        await expect(
          page.getByRole('dialog').getByRole('combobox', { name: 'Sort by', exact: true })
        ).toHaveValue('Recommended')
      }
      if (preset === 'top') await expect(page.getByRole('searchbox')).toHaveValue('')
      if (preset === 'nonmodal') {
        if (retain)
          await expect(
            page.getByRole('dialog').getByRole('checkbox', { name: 'Show canvas grid' })
          ).toBeChecked()
        else
          await expect(
            page.getByRole('dialog').getByRole('checkbox', { name: 'Show canvas grid' })
          ).not.toBeChecked()
      }
      if (preset === 'confirm')
        await page.getByRole('dialog').locator('button[data-demo-choice]').first().click()
      else await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
      await expect(page.locator('[data-drawer]')).toHaveCount(0)
    }
    await expect(page.locator('[data-drawer]')).toHaveCount(0)
    await reset.check()
    await trigger.click()
    await expect(result).toBeEmpty()
    if (preset === 'confirm')
      await page.getByRole('dialog').locator('button[data-demo-choice]').first().click()
    else await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
    await expect(page.locator('[data-drawer]')).toHaveCount(0)
  }
})

test('reading, notes, nested navigation and snap sizes already restart without a redundant reset control', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('examples/')
  for (const preset of ['scroll', 'handle', 'nested', 'snaps', 'controlled']) {
    const scope = page.locator(`package-site-demo[data-preset="${preset}"]`)
    await expect(scope.locator('[data-demo-reset]')).toHaveCount(0)
    const trigger = scope.locator('button[data-open]')
    await trigger.click()
    const initial = await page.getByRole('dialog').evaluate(el => getComputedStyle(el).transform)
    if (preset === 'controlled')
      await page.getByRole('button', { name: 'Expanded', exact: true }).click()
    if (preset === 'snaps') await page.getByRole('dialog').locator('[data-drawer-handle]').click()
    if (preset === 'handle') await page.getByLabel('Your notes').fill('A temporary note')
    if (preset === 'scroll') {
      await page.getByRole('region', { name: 'Drawer reading area' }).focus()
      await page.keyboard.press('PageDown')
      await expect
        .poll(() =>
          page
            .getByRole('dialog')
            .locator('[data-drawer-body]')
            .evaluate(el => el.scrollTop)
        )
        .toBeGreaterThan(0)
    }
    if (preset === 'nested') {
      await page.getByRole('button', { name: 'Choose delivery' }).click()
      await expect(page.locator('[data-drawer][data-state="open"]')).toHaveCount(2)
      await expect(page.getByRole('button', { name: /Standard delivery/ })).toContainText(
        'Free · Arrives in 3–5 business days'
      )
      await expect(page.getByRole('button', { name: /Express delivery/ })).toContainText(
        '$8 · Arrives in 1–2 business days'
      )
      await page.getByRole('button', { name: /Express delivery/ }).click()
      await expect(page.locator('[data-drawer]')).toHaveCount(1)
      await expect(page.getByRole('dialog').locator('[data-delivery-summary]')).toContainText(
        'Express delivery · $8'
      )
    }
    await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
    await expect(page.locator('[data-drawer]')).toHaveCount(0)
    await trigger.click()
    await expect(page.getByRole('dialog')).toHaveCount(1)
    if (preset === 'handle') await expect(page.getByLabel('Your notes')).toHaveValue('')
    if (preset === 'snaps' || preset === 'controlled')
      await expect
        .poll(() => page.getByRole('dialog').evaluate(el => getComputedStyle(el).transform))
        .toBe(initial)
    if (preset === 'scroll')
      expect(
        await page
          .getByRole('dialog')
          .locator('[data-drawer-body]')
          .evaluate(el => el.scrollTop)
      ).toBe(0)
    if (preset === 'nested') {
      await expect(page.getByRole('button', { name: 'Choose delivery' })).toBeVisible()
      await expect(page.getByRole('dialog').locator('[data-delivery-summary]')).toHaveText(
        'No delivery selected'
      )
    }
    await page.getByRole('button', { name: 'Close drawer', exact: true }).click()
    await expect(page.locator('[data-drawer]')).toHaveCount(0)
  }
})

test('the inspector releases its application-owned canvas state when its scope is remounted', async ({
  page,
}) => {
  await page.goto('examples/#nonmodal')
  const scope = page.locator('package-site-demo[data-preset="nonmodal"]')
  await scope.locator('[data-demo-reset]').uncheck()
  await scope.locator('button[data-open]').click()
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Show canvas grid' }).check()
  await expect(scope).toHaveAttribute('data-preview-grid', '')
  await scope.evaluate(element => {
    const parent = element.parentNode!
    const next = element.nextSibling
    element.remove()
    parent.insertBefore(element, next)
  })
  await expect(page.locator('[data-drawer]')).toHaveCount(0)
  await expect(scope).not.toHaveAttribute('data-preview-grid')
  await expect(scope.locator('button[data-open]')).toHaveAttribute('aria-expanded', 'false')
  await scope.locator('button[data-open]').click()
  await expect(
    page.getByRole('dialog').getByRole('checkbox', { name: 'Show canvas grid' })
  ).not.toBeChecked()
})
