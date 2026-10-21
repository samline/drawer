import { test, expect } from '@playwright/test'
import { customThemeCss } from '../shared/lib/accent-theme.mjs'

test('requested accents survive later stylesheet delivery in all three destinations', async ({
  page,
}) => {
  for (const path of ['./', 'examples/', 'docs/']) {
    await page.goto(path)
    await page.addStyleTag({
      content: customThemeCss({ accentLight: '#a32379', accentDark: '#ee9bd2' }),
    })
    // Re-deliver the base semantic tokens after customization, as CSS inlining can do.
    await page.addStyleTag({
      content:
        ':root,[data-theme="dark"]{--theme-accent:#b7aed2;--palette-lavender:#b7aed2}[data-theme="light"]{--theme-accent:#69518d;--palette-lavender:#69518d}',
    })
    for (const [theme, accent] of [
      ['light', '#a32379'],
      ['dark', '#ee9bd2'],
    ]) {
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme
      }, theme)
      const result = await page.locator('html').evaluate(el => {
        const styles = getComputedStyle(el)
        return ['--color-accent', '--palette-lavender'].map(token =>
          styles.getPropertyValue(token).trim()
        )
      })
      expect(result, `${path} ${theme}`).toEqual([accent, accent])
    }
  }
})
