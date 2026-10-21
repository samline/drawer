import { test, expect } from '@playwright/test'
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const modules =
  process.env.PACKAGE_FRAMEWORK_NODE_MODULES ?? process.env.DRAWER_FRAMEWORK_NODE_MODULES
const root = new URL('../', import.meta.url)
const kind = 'drawer'
for (const host of ['shopify', 'wordpress']) {
  test(`copied ${host} files preserve asset order, independent widgets and cleanup`, async ({
    page,
    context,
  }) => {
    test.skip(!modules, 'Install the optional integration test dependencies, including liquidjs.')
    const directory = await mkdtemp(join(tmpdir(), 'package-cms-'))
    const example = await context.newPage()
    try {
      await page.goto('docs/guides/frameworks/')
      const heading = page.getByRole('heading', {
        name: host === 'shopify' ? 'Shopify' : 'WordPress',
        exact: true,
      })
      const viewer = heading.locator('xpath=following-sibling::div[@data-code-files][1]')
      const files: Record<string, string> = {}
      for (const label of host === 'shopify'
        ? ['Section', 'Layout', 'JavaScript', 'CSS']
        : ['Plugin', 'JavaScript', 'CSS']) {
        await viewer.getByRole('tab', { name: label, exact: true }).click()
        files[label] = (await viewer
          .getByRole('tabpanel', { name: label, exact: true })
          .locator('code')
          .textContent())!
      }
      let html: string, head: string
      if (host === 'shopify') {
        const require = createRequire(join(modules!, '../package.json'))
        const { Liquid } = require('liquidjs')
        const liquid = new Liquid()
        liquid.registerFilter('asset_url', (file: string) => `https://cms.test/assets/${file}`)
        liquid.registerFilter(
          'stylesheet_tag',
          (url: string) => `<link rel="stylesheet" href="${url}">`
        )
        html = await liquid.parseAndRender(
          files.Section.replace(/{% schema %}[\s\S]*?{% endschema %}/, '')
        )
        head = await liquid.parseAndRender(files.Layout)
        const schema = JSON.parse(files.Section.match(/{% schema %}([\s\S]*?){% endschema %}/)![1])
        expect(schema.presets).toHaveLength(1)
      } else {
        const plugin = join(directory, 'plugin.php')
        await writeFile(plugin, files.Plugin)
        execFileSync('php', ['-l', plugin])
        const stub = `<?php
function get_post(){return (object)['post_content'=>'[${kind === 'ticker' ? 'ticker_strip' : 'drawer_filters'}]'];}
function is_singular(){return true;}
function has_shortcode($content,$code){return str_contains($content,'['.$code.']');}
function plugin_dir_url($file){return 'https://cms.test/';}
function add_action($hook,$callback){$callback();}
function wp_enqueue_style($handle,$url,$deps,$version){$GLOBALS['styles'][]=compact('handle','url','deps','version');}
function wp_enqueue_script($handle,$url,$deps,$version,$args){$GLOBALS['scripts'][]=compact('handle','url','deps','version','args');}
function add_shortcode($name,$callback){$GLOBALS['markup']=$callback();}
require ${JSON.stringify(plugin)};
echo json_encode(['html'=>$GLOBALS['markup'],'styles'=>$GLOBALS['styles'],'scripts'=>$GLOBALS['scripts']]);`
        await writeFile(join(directory, 'stub.php'), stub)
        const result = JSON.parse(
          execFileSync('php', [join(directory, 'stub.php')], { encoding: 'utf8' })
        )
        expect(result.scripts[1].deps).toContain(`${kind}-runtime`)
        expect(result.styles[1].deps).toContain(`${kind}-runtime`)
        for (const script of result.scripts) expect(script.args.strategy).toBe('defer')
        html = result.html
        head =
          result.styles.map((item: any) => `<link rel="stylesheet" href="${item.url}">`).join('') +
          result.scripts.map((item: any) => `<script src="${item.url}" defer></script>`).join('')
      }
      const runtime = await readFile(new URL('dist/browser/global.global.js', root), 'utf8')
      const css = await readFile(new URL('dist/style.css', root), 'utf8')
      const errors: string[] = []
      example.on('pageerror', error => errors.push(error.message))
      await example.route('**/*', async route => {
        const url = new URL(route.request().url())
        const file = url.pathname.split('/').pop()
        const body =
          file === `${kind}.global.js`
            ? runtime
            : file === `${kind}.css`
              ? css
              : file === 'integration.js'
                ? files.JavaScript
                : file === 'integration.css'
                  ? files.CSS
                  : `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body><main><div id="first">${html}</div><div id="second">${html}</div></main></body></html>`
        await route.fulfill({
          body,
          contentType: file?.endsWith('.js')
            ? 'text/javascript'
            : file?.endsWith('.css')
              ? 'text/css'
              : 'text/html',
        })
      })
      await example.goto('https://cms.test/')
      const first = example.locator('#first')
      const second = example.locator('#second')
      if (kind === 'ticker') {
        await first.getByRole('button', { name: 'Pause', exact: true }).click()
        await expect(first.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
        await expect(second.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
      } else {
        await first.getByRole('button', { name: 'Open filters', exact: true }).click()
        await expect(example.getByRole('dialog')).toBeVisible()
        await expect(example.locator('[data-drawer-vanilla-root]')).toHaveCount(2)
      }
      if (host === 'shopify') {
        await first.evaluate(el =>
          el.dispatchEvent(new CustomEvent('shopify:section:unload', { bubbles: true }))
        )
        if (kind === 'ticker') {
          await expect(first.getByRole('button', { name: 'Play', exact: true })).toBeDisabled()
          await expect(first.locator('.ticker-message')).toHaveCount(3)
        } else {
          await expect(example.getByRole('dialog')).not.toBeVisible()
          await expect(example.locator('[data-drawer-vanilla-root]')).toHaveCount(1)
          expect(await example.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
        }
        await first.evaluate(el =>
          el.dispatchEvent(new CustomEvent('shopify:section:load', { bubbles: true }))
        )
        await first.evaluate(el =>
          el.dispatchEvent(new CustomEvent('shopify:section:load', { bubbles: true }))
        )
        if (kind === 'drawer')
          await expect(example.locator('[data-drawer-vanilla-root]')).toHaveCount(2)
      }
      if (kind === 'drawer' && host === 'wordpress') {
        await example.getByRole('button', { name: 'Close filters', exact: true }).click()
        await expect(example.getByRole('dialog')).not.toBeVisible()
      }
      await example.evaluate(() =>
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
      )
      if (kind === 'ticker') {
        const action = second.getByRole('button', { name: 'Pause', exact: true })
        await action.click()
        await expect(second.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
      } else {
        await second.getByRole('button', { name: 'Open filters', exact: true }).click()
        await expect(example.getByRole('dialog')).toBeVisible()
      }
      await example.evaluate(() =>
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }))
      )
      if (kind === 'ticker') await expect(second.getByRole('button')).toBeDisabled()
      else await expect(example.locator('[data-drawer-vanilla-root]')).toHaveCount(0)
      expect(errors).toEqual([])
    } finally {
      await example.close()
      await rm(directory, { recursive: true, force: true })
    }
  })
}
