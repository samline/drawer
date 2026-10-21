import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveProject } from '../shared/lib/project.mjs'
import config from '../project.config.json' with { type: 'json' }
const fixture = () => structuredClone(config)
test('one URL normalizes both root and repository deployment paths', () => {
  for (const [input, base] of [
    ['https://example.com', '/'],
    ['https://example.com/tools/pkg', '/tools/pkg/'],
    ['https://example.com/tools/pkg/', '/tools/pkg/'],
  ]) {
    const candidate = fixture()
    candidate.site.url = input
    const result = resolveProject(candidate)
    assert.equal(result.base, base)
    assert.equal(result.docsBase, base + 'docs/')
    assert.equal(
      new URL('social.png', result.url).href,
      'https://example.com' + base + 'social.png'
    )
  }
})
test('rebranding changes metadata without coupling package identity to tooling manifest', () => {
  const candidate = fixture()
  candidate.package = {
    ...candidate.package,
    name: 'Another package',
    npmName: '@scope/another',
    version: '4.2.1',
  }
  candidate.theme = { accentLight: '#245778', accentDark: '#9ccfe8' }
  const result = resolveProject(candidate)
  assert.equal(result.name, 'Another package')
  assert.equal(result.npmName, '@scope/another')
  assert.equal(result.version, '4.2.1')
  assert.equal(result.accentDark, '#9ccfe8')
})
test('unsupported URLs, malformed colors and invalid package metadata fail before generation', () => {
  for (const change of [
    x => (x.site.url = 'javascript:alert(1)'),
    x => (x.site.url = 'https://example.com/?base=other'),
    x => (x.theme.accentLight = 'red; color: blue'),
    x => (x.package.npmName = 'Not a package'),
    x => (x.package.version = 'latest'),
    x => (x.delivery.cdnScript = 'file:///tmp/module.js'),
  ]) {
    const candidate = fixture()
    change(candidate)
    assert.throws(() => resolveProject(candidate))
  }
})
test('CDN is optional and keeps stylesheet and standalone script separate', () => {
  const withoutCdn = fixture()
  withoutCdn.delivery = { cdnScript: null, cdnStylesheet: null }
  assert.equal(resolveProject(withoutCdn).delivery.cdnScript, null)
  const candidate = fixture()
  candidate.delivery = {
    cdnScript: 'https://cdn.example.com/pkg@4.2.1/global.js',
    cdnStylesheet: 'https://cdn.example.com/pkg@4.2.1/style.css',
  }
  assert.deepEqual(resolveProject(candidate).delivery, candidate.delivery)
})
