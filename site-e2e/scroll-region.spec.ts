import { test, expect } from '@playwright/test'

test('short sheets do not scroll their background extension and long content scrolls only its body', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['', 'examples/', 'docs/guides/examples/']) {
      await page.goto(route || './')
      const previews = page.locator('package-site-demo[data-preset]:visible')
      for (const preview of await previews.all()) {
        const preset = await preview.getAttribute('data-preset')
        await preview.locator('button[data-open]').click()
        const dialog = page.getByRole('dialog').first()
        await expect(dialog).toBeVisible()
        expect(
          await dialog.evaluate(el => getComputedStyle(el).overflowY),
          `${route} ${preset}`
        ).toBe('visible')
        const body = dialog.locator('[data-drawer-body]')
        await expect(body).toHaveCount(1)
        const excess = await body.evaluate(el => el.scrollHeight - el.clientHeight)
        if (preset === 'scroll') {
          expect(excess).toBeGreaterThan(100)
          await dialog.getByRole('region', { name: 'Drawer reading area' }).focus()
          await page.keyboard.press('PageDown')
          await expect.poll(() => body.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
          await body.evaluate(el => {
            el.scrollTop = el.scrollHeight
          })
          expect(await body.evaluate(el => el.scrollTop)).toBeGreaterThan(100)
        } else if (!['snaps', 'controlled'].includes(preset!)) {
          expect(excess, `${route} ${preset} ${width}`).toBeLessThanOrEqual(1)
        }
        if (preset === 'controlled') {
          await dialog.getByRole('button', { name: 'Expanded', exact: true }).click()
          await expect
            .poll(() => dialog.evaluate(el => getComputedStyle(el).transform))
            .toBe('matrix(1, 0, 0, 1, 0, 0)')
        }
        await dialog.getByRole('button', { name: 'Close drawer', exact: true }).click()
        await expect(dialog).not.toBeVisible()
      }
    }
  }
})
