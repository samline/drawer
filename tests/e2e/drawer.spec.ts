import { fileURLToPath } from 'node:url'
import { expect, test } from './fixtures'

// The 6.0.0 bundle name; dist/browser/global.global.js stays as an identical alias.
const bundle = 'global'
const styles = fileURLToPath(new URL('../../dist/style.css', import.meta.url))

const markup = `
  <style>
    .drawer-overlay { position: fixed; inset: 0; z-index: 100; background: rgb(0 0 0 / 45%); }
    .drawer-panel { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; padding: 1.5rem; background: white; }
  </style>
  <button id="open" type="button" aria-haspopup="dialog">Open filters</button>
`

test('the CDN bundle exposes window.Drawer and opens from its trigger', async ({ load }) => {
  const page = await load(markup, bundle)
  await page.addStyleTag({ path: styles })
  expect(await page.evaluate(() => typeof (window as any).Drawer?.createDrawer)).toBe('function')

  await page.evaluate(() => {
    ;(window as any).drawer = (window as any).Drawer.createDrawer({
      triggerElement: document.getElementById('open'),
      title: 'Filters',
      content: 'Choose what you want to see.',
      contentClassName: 'drawer-panel',
      overlayClassName: 'drawer-overlay',
      closeButton: { icon: '×', ariaLabel: 'Close filters' },
      autoFocus: true,
    })
  })

  // Keyboard activation: WebKit, like Safari, does not focus a clicked button.
  await page.focus('#open')
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Filters' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Choose what you want to see.')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.locator('#open')).toBeFocused()
})

test('the controller opens, updates, closes and destroys idempotently', async ({ load }) => {
  const page = await load(markup, bundle)
  await page.addStyleTag({ path: styles })
  await page.evaluate(() => {
    ;(window as any).drawer = (window as any).Drawer.createDrawer({
      title: 'Cart',
      content: 'Empty',
      contentClassName: 'drawer-panel',
      overlayClassName: 'drawer-overlay',
      closeButton: { icon: '×', ariaLabel: 'Close cart' },
    })
    ;(window as any).drawer.setOpen(true)
  })
  const dialog = page.getByRole('dialog', { name: 'Cart' })
  await expect(dialog).toBeVisible()

  await page.evaluate(() => (window as any).drawer.update({ content: 'Two items' }))
  await expect(dialog).toContainText('Two items')

  await page.getByRole('button', { name: 'Close cart' }).click()
  await expect(dialog).toBeHidden()

  await page.evaluate(() => {
    ;(window as any).drawer.destroy()
    ;(window as any).drawer.destroy()
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
