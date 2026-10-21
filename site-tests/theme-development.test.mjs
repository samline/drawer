import test from 'node:test'
import assert from 'node:assert/strict'
import { customThemeCss } from '../shared/lib/accent-theme.mjs'
import { developmentRedirect } from '../shared/lib/development-routes.mjs'

test('custom accents cover code, preview, controls and surfaces without replacing the reference defaults', () => {
  assert.equal(customThemeCss({ accentLight: '#69518d', accentDark: '#b7aed2' }), '')
  const css = customThemeCss({ accentLight: '#a32379', accentDark: '#ee9bd2' })
  for (const token of [
    'theme-accent',
    'palette-lavender',
    'palette-tab-active',
    'palette-specimen-surface',
    'palette-button-hover',
    'palette-heading-accent',
  ])
    assert.equal(css.split(`--${token}:`).length - 1, 2)
  assert.ok(css.includes('#a32379') && css.includes('#ee9bd2'))
  assert.ok(!css.includes('--theme-bg:'))
})

test('development redirects preserve route and query while leaving assets at their owner', () => {
  const plugin = developmentRedirect({ origin: 'http://127.0.0.1:4331', include: '/widget/docs/' })
  assert.equal(plugin.apply, 'serve')
  let handler
  plugin.configureServer({
    middlewares: {
      use: value => {
        handler = value
      },
    },
  })
  let result
  let ended = false
  const response = {
    writeHead: (status, headers) => {
      result = [status, headers.Location]
    },
    end: () => {
      ended = true
    },
  }
  handler({ url: '/widget/docs/options/?q=focus' }, response, () =>
    assert.fail('expected redirect')
  )
  assert.deepEqual(result, [307, 'http://127.0.0.1:4331/widget/docs/options/?q=focus'])
  assert.equal(ended, true)
  let passed = false
  handler({ url: '/src/components/Article.astro' }, response, () => {
    passed = true
  })
  assert.equal(passed, true)
  handler({ originalUrl: '/widget/docs?q=focus', url: '/docs?q=focus' }, response, () =>
    assert.fail('expected original-base redirect')
  )
  assert.deepEqual(result, [307, 'http://127.0.0.1:4331/widget/docs?q=focus'])
})
