#!/usr/bin/env node
/**
 * Size budgets for every published entry point.
 * Managed by package-landing-docs (family/templates/package). Edit there, then run node family/scripts/sync.mjs.
 *
 * Each entry is bundled the way a consumer's bundler would see it (minified,
 * framework packages and peer dependencies external) and gzipped. Budgets live in `package.json`
 * under `"size": { "<entry file>": <max gzip bytes> }`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'

const root = new URL('..', import.meta.url).pathname
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
// Peers are resolved by the consumer's bundler, so they never count here. A
// prebuilt IIFE that bundles a peer still measures it: esbuild only re-reads it.
const peers = Object.keys(manifest.peerDependencies ?? {})
const external = [
  'react',
  'react-dom',
  'vue',
  'svelte',
  'svelte/store',
  ...peers,
  ...peers.map(peer => `${peer}/*`),
]

if (!manifest.size) {
  console.error(`✗ ${manifest.name}: every public entry needs a budget in package.json → size`)
  process.exit(1)
}

let failed = false
const rows = []

for (const [file, budget] of Object.entries(manifest.size)) {
  const entry = join(root, file)
  if (!existsSync(entry)) {
    console.error(`✗ ${file} does not exist (run the build first)`)
    failed = true
    continue
  }
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    external,
    logLevel: 'silent',
  })
  const code = result.outputFiles[0].contents
  const gzip = gzipSync(code, { level: 9 }).length
  const ok = gzip <= budget
  if (!ok) failed = true
  rows.push({
    entry: file.replace(/^\.\/dist\//, ''),
    min: code.length,
    gzip,
    budget,
    status: ok ? 'ok' : 'OVER',
  })
}

console.table(rows)
if (failed) {
  console.error('Size budget exceeded or entry missing.')
  process.exit(1)
}
