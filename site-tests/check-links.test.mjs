import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { checkLinks } from '../shared/scripts/check-links.mjs'

const site = 'https://example.com/widget/'
const fixture = async pages => {
  const directory = await mkdtemp(join(tmpdir(), 'package-site-links-'))
  for (const [path, html] of Object.entries(pages)) {
    await mkdir(join(directory, path, '..'), { recursive: true })
    await writeFile(join(directory, path), html)
  }
  return directory
}

test('link audit accepts base-aware pages and fragments', async () => {
  const directory = await fixture({
    'index.html': '<a href="/widget/docs/#install">Docs</a><a href="https://npmjs.com/">npm</a>',
    'docs/index.html': '<h2 id="install">Install</h2><a href="../">Home</a>',
  })
  try {
    const result = await checkLinks({ directory: pathToFileURL(directory + '/'), site })
    assert.deepEqual(result, { pages: 2, links: 3, external: ['https://npmjs.com/'] })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

for (const [name, href, message] of [
  ['a missing fragment', '/widget/#missing', /Missing fragment/],
  ['a destination outside the base', '/other/', /Outside deployment base/],
  ['malformed percent-encoding', '/widget/#100%', /Malformed percent-encoding/],
])
  test(`link audit reports ${name}`, async () => {
    const directory = await fixture({ 'index.html': `<a href="${href}">Broken</a>` })
    try {
      await assert.rejects(checkLinks({ directory: pathToFileURL(directory + '/'), site }), message)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
