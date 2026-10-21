import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const functions = [
  'createDrawer',
  'createDrawerController',
  'destroyDrawers',
  'getChildDrawers',
  'getDrawer',
  'getDrawers',
  'getParentDrawer'
].sort()
const require = createRequire(import.meta.url)
const esm = await import('../dist/index.js')
const cjs = require('../dist/index.cjs')
const browser = await import('../dist/browser/index.js')
for (const api of [esm, cjs, browser.default]) {
  assert.deepEqual(
    Object.keys(api)
      .filter((key) => typeof api[key] === 'function')
      .sort(),
    functions
  )
  const first = api.createDrawer()
  const second = api.createDrawer()
  assert.notEqual(first.id, second.id)
  assert.equal(api.getDrawer(first.id), first)
  assert.equal(first.update({ modal: false }).state.modal, false)
  first.destroy()
  assert.throws(() => first.setOpen(true), /destroyed/)
  api.destroyDrawers()
}
assert.equal(globalThis.Drawer, undefined, 'Module imports must not install a global')
const context = { console }
vm.runInNewContext(readFileSync(new URL('../dist/browser/global.global.js', import.meta.url), 'utf8'), context)
assert.deepEqual(Object.keys(context.Drawer).sort(), functions)
const [packed] = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' })
)
const paths = new Set(packed.files.map((file) => file.path))
for (const file of ['package.json', 'README.md', 'LICENSE.md', 'CHANGELOG.md', 'dist/browser/global.global.js']) {
  assert.ok(paths.has(file), `Missing published file: ${file}`)
}
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const checkExport = (entry) => {
  if (typeof entry === 'string') assert.ok(paths.has(entry.replace(/^\.\//, '')), `Missing published export: ${entry}`)
  else Object.values(entry).forEach(checkExport)
}
checkExport(manifest.exports)
for (const file of paths) {
  assert.ok(
    file.startsWith('dist/') || ['package.json', 'README.md', 'LICENSE.md', 'CHANGELOG.md'].includes(file),
    `Development or website file leaked into npm: ${file}`
  )
}
console.log(`Package smoke test passed: ESM, CommonJS, IIFE, types/CSS exports and ${paths.size} allowed npm files.`)
