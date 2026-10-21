import { test, expect } from '@playwright/test'

for (const width of [320, 1440]) {
  for (const route of ['', 'examples/', 'docs/guides/examples/']) {
    test(`${route || 'home'} at ${width}: short sheets have no decorative scroll and reading scrolls its body`, async ({
      page,
    }) => {
      test.setTimeout(90000)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.setViewportSize({ width, height: 900 })
      await page.goto(route || './')
      const previews = page.locator('package-site-demo[data-preset]:visible')
      for (const preview of await previews.all()) {
        const preset = await preview.getAttribute('data-preset')
        const context = `${route || 'home'} ${preset} ${width}`
        await expect(
          page.locator('[data-drawer]'),
          `${context}: previous drawer removed`
        ).toHaveCount(0)
        await preview.locator('button[data-open]').click()
        const openDialog = page.locator('[data-drawer][data-state="open"]')
        await expect(openDialog, context).toHaveCount(1)
        const drawerId = await openDialog.getAttribute('data-drawer-id')
        const dialog = page.locator(`[data-drawer][data-drawer-id="${drawerId}"]`)
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
          if (excess > 1) {
            const blankTail = await body.evaluate(el => {
              const content = el.querySelector('.demo-body')!
              return (
                el.scrollHeight -
                (content.getBoundingClientRect().bottom -
                  el.getBoundingClientRect().top +
                  el.scrollTop)
              )
            })
            expect(
              Math.abs(blankTail),
              `${route} ${preset} ${width}: no decorative scroll tail`
            ).toBeLessThanOrEqual(2)
            expect(excess, `${route} ${preset} ${width}: bounded content`).toBeLessThan(350)
          }
        }
        if (preset === 'controlled') {
          await dialog.getByRole('button', { name: 'Expanded', exact: true }).click()
          await expect
            .poll(() => dialog.evaluate(el => getComputedStyle(el).transform))
            .toBe('matrix(1, 0, 0, 1, 0, 0)')
        }
        if (preset === 'confirm') await dialog.locator('button[data-demo-choice]').first().click()
        else await dialog.getByRole('button', { name: 'Close drawer', exact: true }).click()
        await expect(dialog, `${context}: closed drawer removed`).toHaveCount(0)
      }
    })
  }
}
