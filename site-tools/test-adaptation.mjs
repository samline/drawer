import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, writeFile, symlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'package-site-adaptation-'))
const ignored = new Set([
  '.git',
  'node_modules',
  'dist',
  '.astro',
  'test-results',
  'playwright-report',
])
try {
  await cp(root, temporary, { recursive: true, filter: path => !ignored.has(basename(path)) })
  await symlink(join(root, 'node_modules'), join(temporary, 'node_modules'), 'dir')
  for (const app of ['landing', 'docs', 'shared']) {
    await symlink(join(root, app, 'node_modules'), join(temporary, app, 'node_modules'), 'dir')
  }
  const config = JSON.parse(await readFile(join(temporary, 'project.config.json'), 'utf8'))
  config.package = {
    ...config.package,
    name: 'Example widget',
    npmName: '@example/widget',
    version: '3.2.1',
    description: 'A separate package used only to verify adaptation.',
  }
  config.theme = { accentLight: '#245778', accentDark: '#9ccfe8' }
  config.delivery = {
    cdnScript: 'https://cdn.example.com/widget@3.2.1/global.js',
    cdnStylesheet: 'https://cdn.example.com/widget@3.2.1/style.css',
  }
  for (const base of ['/', '/tools/widget/']) {
    config.site.url = 'https://example.com' + base
    await writeFile(join(temporary, 'project.config.json'), JSON.stringify(config))
    execFileSync('npm', ['run', 'site:build'], {
      cwd: temporary,
      stdio: 'pipe',
      env: { ...process.env, DRAWER_MIGRATION_SOURCE_ROOT: root },
    })
    for (const route of [
      'index.html',
      'examples/index.html',
      'docs/index.html',
      'docs/getting-started/index.html',
    ]) {
      const html = await readFile(join(temporary, 'landing/dist', route), 'utf8')
      assert.ok(html.includes('Example widget'), route + ' must use the new name')
      assert.ok(
        html.includes('#245778') && html.includes('#9ccfe8'),
        route + ' must use both configured accents'
      )
      assert.ok(
        html.includes('https://example.com' + base),
        route + ' must use the configured public URL'
      )
      assert.ok(
        !html.includes('samline.github.io/package-landing-docs'),
        route + ' retained the old deployment URL'
      )
    }
    const install = await readFile(
      join(temporary, 'landing/dist/docs/getting-started/index.html'),
      'utf8'
    )
    assert.ok(
      install.includes('HTML / CDN') && install.includes('cdn.example.com/widget@3.2.1/global.js'),
      'Configured CDN must be shown'
    )
    assert.ok(
      (await readFile(join(temporary, 'landing/dist/favicon.svg'), 'utf8')).includes('#9ccfe8'),
      'Favicon must follow the accent'
    )
    const png = await readFile(join(temporary, 'landing/dist/social.png'))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    console.log(`Alternate package build and all local links verified at ${base}`)
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
