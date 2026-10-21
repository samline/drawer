import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { prepareConfiguration } from '../site-tools/configure.mjs'
import config from '../project.config.json' with { type: 'json' }
test('configuration inventories real evidence and never executes or modifies source scripts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'package-site-input-'))
  try {
    const manifest = {
      name: '@example/widget',
      version: '3.2.1',
      description: 'A real package fixture.',
      author: { name: 'Maintainer' },
      license: 'MIT',
      homepage: 'https://example.com/widget/',
      repository: { url: 'git+https://github.com/example/widget.git' },
      exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
      scripts: { prepare: 'this must never run' },
    }
    const source = JSON.stringify(manifest)
    await writeFile(join(directory, 'package.json'), source)
    await writeFile(join(directory, 'README.md'), '# Evidence\n')
    await mkdir(join(directory, 'src'))
    await writeFile(join(directory, 'src/index.ts'), 'export const widget = () => 1\n')
    await mkdir(join(directory, 'node_modules'))
    await writeFile(join(directory, 'node_modules/README.md'), 'Ignore dependency docs')
    const result = await prepareConfiguration(directory, config)
    assert.equal(result.config.package.npmName, manifest.name)
    assert.equal(result.config.site.url, manifest.homepage)
    assert.equal(result.config.site.repository, 'https://github.com/example/widget')
    assert.deepEqual(result.context.exports, manifest.exports)
    assert.deepEqual(result.audit.sources.map(s => s.source).sort(), [
      'README.md',
      'package.json',
      'src/index.ts',
    ])
    assert.ok(
      result.audit.sources.every(
        s => s.sha256.length === 64 && s.reviewed === false && s.destination === null
      )
    )
    assert.equal(await readFile(join(directory, 'package.json'), 'utf8'), source)
    // Exercise writes only in a fresh isolated copy, never in this template or package.
    const isolated = join(directory, 'website')
    await mkdir(join(isolated, 'site-tools'), { recursive: true })
    await mkdir(join(isolated, 'shared/lib'), { recursive: true })
    for (const path of [
      'site-tools/configure.mjs',
      'shared/lib/project.mjs',
      'project.config.json',
    ])
      await cp(new URL('../' + path, import.meta.url), join(isolated, path))
    const starter = structuredClone(config)
    starter.site.template = true
    await writeFile(join(isolated, 'project.config.json'), JSON.stringify(starter))
    execFileSync(process.execPath, [
      join(isolated, 'site-tools/configure.mjs'),
      '--package',
      directory,
      '--site-url',
      'https://example.com/widget/',
    ])
    const imported = JSON.parse(await readFile(join(isolated, 'project.config.json'), 'utf8'))
    assert.equal(imported.package.version, '3.2.1')
    assert.equal(imported.site.template, true)
    assert.equal(await readFile(join(isolated, 'brief/source-readme.md'), 'utf8'), '# Evidence\n')
    assert.equal(await readFile(join(directory, 'package.json'), 'utf8'), source)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
