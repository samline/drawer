import { test, expect } from '@playwright/test'

test('all destinations load only local WOFF2 faces and two heading preloads', async ({ page }) => {
  for (const path of ['./', 'examples/', 'docs/']) {
    const requests: string[] = []
    const record = (request: import('@playwright/test').Request) => requests.push(request.url())
    page.on('request', record)
    await page.goto(path)
    await page.evaluate(() => document.fonts.ready)
    const fonts = requests.filter(url => /\.(woff2|ttf)$/.test(url))
    expect(fonts).toHaveLength(3)
    expect(
      fonts.every(
        url => url.endsWith('.woff2') && new URL(url).origin === new URL(page.url()).origin
      )
    ).toBe(true)
    expect(requests.filter(url => /fonts\.(bunny|googleapis|gstatic)/.test(url))).toEqual([])
    await expect(page.locator('link[rel=preload][as=font]')).toHaveCount(2)
    const icon = await page.locator('package-site-theme svg:visible').boundingBox()
    const expected = await page.evaluate(
      () => parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.125
    )
    expect(Math.abs(icon!.width - expected)).toBeLessThan(0.5)
    expect(Math.abs(icon!.height - expected)).toBeLessThan(0.5)
    if (path === 'docs/') {
      await page.setViewportSize({ width: 390, height: 900 })
      for (const [selector, rem] of [
        ['.search-trigger svg', 1.125],
        ['package-site-docs-menu > button svg', 1.25],
      ] as const) {
        const icon = await page.locator(selector).boundingBox()
        const size = await page.evaluate(() =>
          parseFloat(getComputedStyle(document.documentElement).fontSize)
        )
        expect(Math.abs(icon!.width - size * rem)).toBeLessThan(0.5)
      }
    }
    page.off('request', record)
  }
})

test('delayed scripts reserve command and tab geometry without hiding source', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  let release!: () => void
  const ready = new Promise<void>(resolve => (release = resolve))
  await page.route('**/_astro/*.js', async route => {
    await ready
    await route.continue()
  })
  try {
    await page.goto('./', { waitUntil: 'commit' })
    await page.locator('footer').waitFor({ state: 'attached' })
    await page.evaluate(() => Promise.all(Array.from(document.fonts, font => font.load())))
    const command = page.locator('.install-shortcut')
    const tabs = page.locator('#demo [data-tabs]').first()
    for (const control of [command.locator('button'), tabs]) {
      await expect(control).toHaveAttribute('inert', '')
      await expect(control).toBeHidden()
      expect((await control.boundingBox())!.height).toBeGreaterThan(0)
    }
    const before = await command.boundingBox()
    const header = page.locator('#demo .studio-header')
    const headerBefore = await header.boundingBox()
    release()
    await page.waitForLoadState('networkidle')
    await expect(command.locator('button')).toBeVisible()
    await expect(tabs).toBeVisible()
    expect(await command.boundingBox()).toEqual(before)
    expect(await header.boundingBox()).toEqual(headerBefore)
    await expect(
      page.locator('#demo > .demo-studio > package-site-tabs > .panels > [data-panel]:visible')
    ).toHaveCount(1)
  } finally {
    release()
  }
})

test('initial tab selection has no color transition, with normal keyboard interaction intact', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const transitions: string[] = []
    Object.assign(window, { initialTabTransitions: transitions })
    document.addEventListener('transitionrun', event => {
      if (event.target instanceof HTMLElement && event.target.matches('.tab'))
        transitions.push(event.propertyName)
    })
  })
  await page.goto('./')
  const tabs = page.locator('#demo [data-tabs]').first()
  await expect(tabs).toBeVisible()
  await page.waitForTimeout(250)
  expect(await page.evaluate(() => Reflect.get(window, 'initialTabTransitions'))).toEqual([])
  await tabs.getByRole('tab').nth(0).focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, 'initialTabTransitions')))
    .toContain('background-color')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await tabs
      .getByRole('tab')
      .nth(1)
      .evaluate(el => getComputedStyle(el).transitionDuration)
  ).toBe('0s')
})

test('copy reads live highlighted source and falls back to selecting it when denied', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('./')
  const frame = page
    .locator('#how [data-copy-source]:visible')
    .filter({ has: page.locator('pre[data-language=html]') })
    .first()
  expect(await frame.locator('[data-copy-text]').count()).toBe(0)
  await frame.locator('code').evaluate(el => {
    el.textContent = '<p>Live & literal</p>\n'
  })
  await frame.getByRole('button').click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('<p>Live & literal</p>\n')
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, 'writeText', {
      configurable: true,
      value: () => Promise.reject(new Error('denied')),
    })
  )
  await frame.getByRole('button').click()
  await expect
    .poll(() => page.evaluate(() => getSelection()?.getRangeAt(0).cloneContents().textContent))
    .toBe('<p>Live & literal</p>\n')
  await expect(frame.locator('[role=status]')).not.toBeEmpty()
})

test('scopes reconnect once and an open drawer releases its lock on same-batch reinsertion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('./')
  const demo = page.locator('package-site-demo').first()
  await expect(demo).toHaveAttribute('data-mounted', 'true')
  await demo.getByRole('button', { name: 'Open drawer', exact: true }).click()
  await page.evaluate(() => {
    const root = document.querySelector('package-site-demo')!
    const parent = root.parentNode!
    const next = root.nextSibling
    root.remove()
    parent.insertBefore(root, next)
  })
  await expect(demo.locator('output')).toHaveText('Closed')
  await demo.getByRole('button', { name: 'Open drawer', exact: true }).click()
  await expect(demo.locator('output')).toHaveText('Open')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const trigger = page.locator('[data-menu-trigger]')
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await page.evaluate(() => {
    const root = document.querySelector('package-site-mobile-menu')!
    const parent = root.parentNode!
    const next = root.nextSibling
    root.remove()
    parent.insertBefore(root, next)
  })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(await page.evaluate(() => getComputedStyle(document.body).position)).not.toBe('fixed')
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden')
  expect(
    await page.locator('main').evaluate(el => !!el.closest('[inert], [aria-hidden="true"]'))
  ).toBe(false)
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('closing title stays centered in both themes', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('./')
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme
      }, theme)
      const error = await page.locator('.closing-section h2').evaluate(el => {
        const heading = el.getBoundingClientRect(),
          card = el.closest('.cta-card')!.getBoundingClientRect()
        return Math.abs(heading.x + heading.width / 2 - card.x - card.width / 2)
      })
      expect(error).toBeLessThan(1)
    }
  }
})

for (const control of ['menu', 'search']) {
  test(`docs ${control} releases modal state and resets ARIA when remounted`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 })
    await page.goto('docs/')
    const selector = `package-site-docs-${control}`
    const trigger = page.locator(`${selector} > button`)
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await page.evaluate(selector => {
      const root = document.querySelector(selector)!
      const parent = root.parentNode!,
        next = root.nextSibling
      root.remove()
      parent.insertBefore(root, next)
    }, selector)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe('hidden')
    expect(
      await page.locator('main').evaluate(el => !!el.closest('[inert], [aria-hidden="true"]'))
    ).toBe(false)
    await trigger.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  })
}
