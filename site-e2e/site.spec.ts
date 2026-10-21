import { test, expect } from '@playwright/test'
import { readFile, readdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { codeColors } from '../shared/testing/code-colors'
import { project } from '../shared/lib/project.mjs'
const articles = (
  await readdir(new URL('../docs/src/content/docs/', import.meta.url), { recursive: true })
)
  .filter(path => /\.mdx?$/.test(path))
  .map(
    path =>
      'docs/' +
      path
        .replace(/\.mdx?$/, '')
        .replace(/(^|\/)index$/, '$1')
        .replace(/\/$/, '') +
      '/'
  )
const paths = [
  ...new Set([
    '',
    'examples/',
    'docs/',
    'docs/changelog/',
    ...articles.map(path => path.replace('docs//', 'docs/')),
  ]),
]
test('all routes share readable metadata and fit both themes and enlarged mobile text', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const path of paths) {
    await page.goto(path || './')
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('meta[charset]')).toHaveCount(1)
    await expect(page.locator('meta[name=viewport]')).toHaveCount(1)
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      new URL(path, project.url).href
    )
    const structured = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(structured.length).toBeGreaterThan(0)
    for (const value of structured) expect(() => JSON.parse(value)).not.toThrow()
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      new URL(path, project.url).href
    )
    await expect(page.locator('meta[name=robots]')).toHaveAttribute(
      'content',
      project.template ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
    )
    for (const width of [320, 768, 1440, 320]) {
      await page.setViewportSize({ width, height: 900 })
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => {
          document.documentElement.dataset.theme = theme
        }, theme)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${path} ${width} ${theme}`
        ).toBe(true)
      }
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${path} enlarged: ${JSON.stringify(
        await page.evaluate(() =>
          [...document.querySelectorAll('body *')]
            .filter(el => {
              let p = el.parentElement
              while (p && p !== document.body) {
                if (['hidden', 'clip', 'auto', 'scroll'].includes(getComputedStyle(p).overflowX))
                  return false
                p = p.parentElement
              }
              const r = el.getBoundingClientRect()
              return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1)
            })
            .slice(0, 12)
            .map(el => ({
              tag: el.tagName,
              class: el.className,
              text: el.textContent?.slice(0, 55),
              right: el.getBoundingClientRect().right,
            }))
        )
      )}`
    ).toBe(true)
  }
})
test('Home, Examples and Docs share the title font pairing and actual preview', async ({
  page,
}) => {
  for (const path of ['', 'examples/', 'docs/getting-started/']) {
    await page.goto(path || './')
    const styles = await page.locator('h1').evaluate(el => ({
      primary: getComputedStyle(el).fontFamily,
      weight: getComputedStyle(el).fontWeight,
      accent: getComputedStyle(el.querySelector('.serif')!).fontFamily,
      style: getComputedStyle(el.querySelector('.serif')!).fontStyle,
    }))
    expect(styles.primary).toContain('Inter')
    expect(styles.weight).toBe('500')
    expect(styles.accent).toContain('Instrument Serif')
    expect(styles.style).toBe('italic')
  }
  for (const path of ['', 'examples/', 'docs/guides/examples/']) {
    await page.goto(path || './')
    const demo = page.locator('package-site-demo').first()
    await demo.getByRole('button', { name: 'Open drawer', exact: true }).click()
    await expect(demo.locator('output')).toHaveText('Open')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(demo.locator('output')).toHaveText('Closed')
  }
})
test('file tabs copy exact highlighted source and feedback resets independently', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  for (const path of ['examples/', 'docs/guides/examples/']) {
    await page.goto(path || './')
    await page.getByText('Explore the code', { exact: true }).first().click()
    const viewer = page.locator('[data-code-files]').first()
    for (const label of ['HTML', 'CSS', 'JavaScript', 'Complete file']) {
      await viewer.getByRole('tab', { name: label, exact: true }).click()
      const panel = viewer.getByRole('tabpanel', { name: label, exact: true })
      const text = await panel.locator('code').textContent()
      expect(await panel.locator('code span[style]').count()).toBeGreaterThan(2)
      const copy = panel.getByRole('button')
      await copy.click()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text)
      await expect(copy).toContainText('Copied!')
      await expect(copy).toContainText('Copy', { timeout: 4000 })
    }
  }
})
test('all twelve rendered recipes execute in both modes as separate and complete files', async ({
  page,
  context,
}) => {
  test.setTimeout(360000)
  await page.goto('examples/')
  const bundle = await readFile(
    new URL('../dist/browser/global.global.js', import.meta.url),
    'utf8'
  )
  const runtimeCss = await readFile(new URL('../dist/style.css', import.meta.url), 'utf8')
  const require = createRequire(import.meta.url)
  const { build } = await import(
    pathToFileURL(
      require.resolve('vite', { paths: [fileURLToPath(new URL('../landing', import.meta.url))] })
    ).href
  )
  const presets = [
    'bottom',
    'top',
    'left',
    'right',
    'snaps',
    'nested',
    'form',
    'scroll',
    'nonmodal',
    'handle',
    'update',
    'controlled',
  ]
  for (const [index, preset] of presets.entries()) {
    const scope = page.locator('.recipe').nth(index)
    await scope.getByText('Explore the code', { exact: true }).click()
    for (const mode of ['HTML / CDN', 'Package / ESM']) {
      await scope.getByRole('tab', { name: mode, exact: true }).click()
      const viewer = scope.locator('[data-code-files]:visible')
      const files: Record<string, string> = {}
      for (const label of ['HTML', 'CSS', 'JavaScript', 'Complete file']) {
        await viewer.getByRole('tab', { name: label, exact: true }).click()
        files[label] = (await viewer
          .getByRole('tabpanel', { name: label, exact: true })
          .locator('code')
          .textContent())!
      }
      if (mode === 'Package / ESM') {
        expect(files.JavaScript).toContain("from '@samline/drawer'")
        expect(files.JavaScript).not.toContain('window.Drawer')
        expect(files.HTML).toContain('type="module"')
      }
      for (const complete of [false, true]) {
        const directory = await mkdtemp(join(tmpdir(), 'drawer-copied-'))
        const example = await context.newPage()
        const errors: string[] = []
        example.on('pageerror', error => errors.push(error.message))
        try {
          await Promise.all([
            writeFile(
              join(directory, 'index.html'),
              complete ? files['Complete file'] : files.HTML
            ),
            writeFile(join(directory, 'style.css'), files.CSS),
            writeFile(join(directory, 'main.js'), files.JavaScript),
          ])
          let output = directory
          if (mode === 'Package / ESM') {
            await build({
              root: directory,
              configFile: false,
              logLevel: 'silent',
              resolve: {
                alias: [
                  {
                    find: /^@samline\/drawer\/styles\.css$/,
                    replacement: fileURLToPath(new URL('../dist/style.css', import.meta.url)),
                  },
                  {
                    find: /^@samline\/drawer$/,
                    replacement: fileURLToPath(new URL('../dist/index.js', import.meta.url)),
                  },
                ],
              },
              build: { outDir: 'out' },
            })
            output = join(directory, 'out')
          }
          await example.route('**/*', async route => {
            const url = new URL(route.request().url())
            const css = url.pathname.endsWith('.css')
            const javascript = url.pathname.endsWith('.js')
            const body =
              url.hostname === 'unpkg.com'
                ? css
                  ? runtimeCss
                  : bundle
                : await readFile(
                    join(output, url.pathname === '/' ? 'index.html' : url.pathname.slice(1)),
                    'utf8'
                  )
            await route.fulfill({
              body,
              contentType: css ? 'text/css' : javascript ? 'text/javascript' : 'text/html',
            })
          })
          await example.goto('https://example.test/index.html')
          const trigger = example.getByRole('button', { name: 'Open drawer', exact: true })
          await trigger.click()
          const dialog = example.getByRole('dialog').first()
          await expect(dialog).toBeVisible()
          await expect(dialog).toHaveAttribute(
            'data-drawer-direction',
            ['snaps', 'nested', 'form', 'handle', 'update', 'controlled'].includes(preset)
              ? 'bottom'
              : ['scroll', 'nonmodal'].includes(preset)
                ? 'right'
                : preset
          )
          if (preset === 'snaps') {
            const before = await dialog.evaluate(el => getComputedStyle(el).transform)
            await dialog.locator('[data-drawer-handle]').click()
            await expect
              .poll(() => dialog.evaluate(el => getComputedStyle(el).transform))
              .not.toBe(before)
          }
          if (preset === 'form') {
            await dialog.getByLabel('Category', { exact: true }).selectOption({ label: 'Books' })
            await dialog.getByRole('button', { name: 'Apply filters' }).click()
            await expect(example.locator('#demo-result')).toHaveText('Selected category: Books')
            await expect(dialog).not.toBeVisible()
            await trigger.click()
          }
          if (preset === 'nonmodal') {
            await expect(dialog).not.toHaveAttribute('aria-modal', 'true')
            await example.getByRole('button', { name: 'Try a page action' }).click()
            await expect(example.locator('#demo-result')).toHaveText(
              'The page is still interactive.'
            )
            await expect(dialog).toBeVisible()
          }
          if (preset === 'update') {
            await dialog.getByRole('button', { name: 'Load the next detail' }).click()
            await expect(dialog).toContainText('The same drawer now shows fresh content.')
            await expect(dialog).toContainText('Your next detail')
          }
          if (preset === 'controlled') {
            await dialog.getByRole('button', { name: 'Expanded', exact: true }).click()
            await expect
              .poll(() => dialog.evaluate(el => getComputedStyle(el).transform))
              .toBe('matrix(1, 0, 0, 1, 0, 0)')
            await dialog.getByRole('button', { name: 'Compact', exact: true }).click()
            await expect
              .poll(() => dialog.evaluate(el => getComputedStyle(el).transform))
              .not.toBe('matrix(1, 0, 0, 1, 0, 0)')
          }
          if (preset === 'scroll') {
            const close = dialog.getByRole('button', { name: 'Close drawer', exact: true })
            await dialog.getByRole('region', { name: 'Drawer reading area' }).focus()
            await example.keyboard.press('PageDown')
            await expect
              .poll(() => dialog.locator('[data-drawer-body]').evaluate(el => el.scrollTop))
              .toBeGreaterThan(0)
            await dialog.locator('[data-drawer-body]').evaluate(el => {
              el.scrollTop = el.scrollHeight
            })
            expect(
              await dialog.locator('[data-drawer-body]').evaluate(el => el.scrollTop)
            ).toBeGreaterThan(0)
            const bounds = await close.boundingBox()
            expect(bounds!.y).toBeGreaterThanOrEqual(0)
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900)
          }
          if (preset === 'handle') {
            await dialog.getByLabel('Your notes').fill('Keep this gesture local')
            await expect(dialog.getByLabel('Your notes')).toHaveValue('Keep this gesture local')
          }
          if (preset === 'nested') {
            await example.getByRole('button', { name: 'Open child drawer' }).click()
            await expect(example.locator('[data-drawer][data-state="open"]')).toHaveCount(2)
            await example.getByRole('button', { name: 'Close child', exact: true }).click()
            await expect(example.locator('[data-drawer][data-state="open"]')).toHaveCount(1)
          }
          await example.getByRole('button', { name: 'Close drawer', exact: true }).click()
          await expect(example.getByRole('dialog')).not.toBeVisible()
          if (preset !== 'nonmodal') await expect(trigger).toBeFocused()
          await example.evaluate(() => {
            window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
            window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
          })
          await trigger.click()
          await expect(example.getByRole('dialog')).toBeVisible()
          await example.evaluate(() =>
            window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }))
          )
          await expect(example.locator('[data-drawer-vanilla-root]')).toHaveCount(0)
          expect(errors, `${preset} ${mode} ${complete}`).toEqual([])
        } finally {
          await example.close()
          await rm(directory, { recursive: true, force: true })
        }
      }
    }
  }
})
test('production Pagefind search returns meaningful links in a compact top drawer', async ({
  page,
}) => {
  await page.goto('docs/')
  await page.getByRole('button', { name: 'Search documentation', exact: true }).click()
  const input = page.getByRole('searchbox')
  await input.fill('configuration')
  await expect(page.getByRole('link', { name: /Options/ }).last()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(input).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Search documentation', exact: true })
  ).toBeFocused()
})
test('mobile menu closes without moving the background and keeps docs last', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./#how')
  const before = await page.evaluate(() => scrollY)
  const trigger = page.getByRole('button', { name: 'Open navigation menu' })
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const links = page.getByRole('navigation', { name: 'Mobile navigation' }).locator('.menu-link')
  await expect(links.last()).toHaveText(/Docs/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThanOrEqual(1)
})
test('no JavaScript preserves content, code, alternative installs and mobile navigation', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  })
  const page = await context.newPage()
  await page.goto(new URL(project.base, test.info().project.use.baseURL as string).href)
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('code').filter({ hasText: 'pnpm add' })).toBeVisible()
  await page.locator('.menu-fallback summary').click()
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
  await context.close()
})
test('all pages pass automated accessibility checks in both themes', async ({ page }) => {
  test.setTimeout(120000)
  test.setTimeout(180000)
  const axe = await readFile(
    new URL('../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8'
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const path of paths) {
    await page.goto(path || './')
    await page.addScriptTag({ content: axe })
    for (const theme of ['dark', 'light']) {
      await page.evaluate(async theme => {
        document.documentElement.dataset.theme = theme
        await document.fonts.ready
        await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))
      }, theme)
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] },
        })
        return result.violations.map((item: any) => ({
          id: item.id,
          nodes: item.nodes.map((n: any) => n.target),
        }))
      })
      expect(violations, `${path} ${theme}`).toEqual([])
    }
  }
})

test('highlighting has the same computed palette across all three routes', async ({ page }) => {
  for (const theme of ['dark', 'light']) {
    let reference: unknown
    for (const path of ['', 'examples/', 'docs/guides/examples/']) {
      await page.goto(path || './')
      await page.evaluate(theme => {
        document.documentElement.dataset.theme = theme
      }, theme)
      if (path) await page.getByText('Explore the code', { exact: true }).first().click()
      const code = path
        ? page.locator('[data-code-files] pre[data-language=html]:visible').first()
        : page.locator('#how pre[data-language=html]:visible').first()
      const colors = await code.evaluate(codeColors)
      for (const token of Object.values(colors)) expect(token.actual).toBe(token.expected)
      if (reference) expect(colors).toEqual(reference)
      else reference = colors
    }
  }
})
test('ToC follows the clicked section and anchors retain the 2.5rem header gap', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 500 })
  await page.goto('docs/getting-started/')
  const nav = page.locator('.desktop-toc').getByRole('navigation', { name: 'On this page' })
  const target = nav.getByRole('link', { name: 'Your first working drawer', exact: true })
  await target.click()
  await expect(target).toHaveAttribute('aria-current', 'location')
  const spacing = await page.locator('#your-first-working-drawer').evaluate(el => ({
    gap:
      el.getBoundingClientRect().top -
      document.querySelector('package-site-docs-header')!.getBoundingClientRect().bottom,
    expected: parseFloat(getComputedStyle(document.documentElement).fontSize) * 2.5,
  }))
  expect(Math.abs(spacing.gap - spacing.expected)).toBeLessThan(2)
})
