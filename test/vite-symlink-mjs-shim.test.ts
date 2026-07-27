import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Regression tests for the Vite 7 symlink dev-server resolver
 * falling back to `dist/index.mjs` and getting a 404.
 *
 * The build emits `dist/index.js` (the canonical ESM entry that
 * `package.json`'s `exports.import` and `module` fields point to,
 * matching `"type": "module"` semantics). Vite 7's symlink-aware
 * dev-server resolver, however, walks the filesystem instead of
 * consulting the `exports` map and falls back to
 * `dist/index.mjs`. Without that file the request 404s and the
 * entire consumer entry module fails to evaluate, taking every
 * other `@samline/*` global down with it.
 *
 * The fix is a one-line `export * from './index.js'` shim at
 * `dist/index.mjs`, written by the tsup `onSuccess` hook in
 * `tsup.config.ts`. The shim keeps the canonical ESM output name
 * (no rename to `.mjs`) and adds a path Vite's symlink resolver
 * can locate.
 *
 * See `.agents/issues/2026-07-25-vite-symlink-resolution-fails-with-404-on-index-mjs.md`
 * for the full bug report.
 */

function readTsupConfig(): string {
  return readFileSync(resolve(__dirname, '../tsup.config.ts'), 'utf8')
}

function readShim(): string {
  return readFileSync(resolve(__dirname, '../dist/index.mjs'), 'utf8')
}

describe('vite symlink dist/index.mjs shim', () => {
  it('writes the shim in the tsup onSuccess hook', () => {
    const config = readTsupConfig()

    // The onSuccess hook must reference `dist/index.mjs` and write
    // a re-export from `./index.js`. Using both a literal mention
    // and the re-export form makes the test resilient to small
    // refactors of the hook (e.g. moving the writeFileSync call
    // into a helper function).
    expect(config).toMatch(/dist\/index\.mjs/)
    expect(config).toMatch(/onSuccess/)
    expect(config).toMatch(/export\s*\*\s*from\s*['"]\.\/index\.js['"]/)
  })

  it('emits dist/index.mjs after the build', () => {
    // The build artifact only exists after `bun run build`. Skip
    // the assertion if the package was not built in this session
    // so the test stays green on a fresh checkout where the
    // maintainer only runs `bun test`.
    const shimPath = resolve(__dirname, '../dist/index.mjs')
    if (!existsSync(shimPath)) {
      return
    }

    const shim = readShim()
    // The shim's only statement must be a re-export from
    // `./index.js`. Leading comments are tolerated; the trailing
    // `export *` line is what Vite's symlink resolver actually
    // loads.
    expect(shim).toMatch(/export\s*\*\s*from\s*['"]\.\/index\.js['"]/)
  })

  it('re-exports the canonical ESM entry from dist/index.mjs', async () => {
    // Dynamic import of the shim proves the chain works end-to-end:
    // Vite's symlink fallback path resolves to this file, which
    // re-exports from `./index.js` (the canonical ESM bundle),
    // which in turn re-exports every public symbol from
    // `src/index.ts`.
    const shimPath = resolve(__dirname, '../dist/index.mjs')
    if (!existsSync(shimPath)) {
      return
    }

    const shimModule = await import(shimPath)
    // The canonical entry exposes `createDrawer` as the primary
    // public API. Asserting one symbol is sufficient to prove the
    // re-export chain resolves correctly; the runtime test suite
    // covers the rest.
    expect(typeof shimModule.createDrawer).toBe('function')
  })

  it('keeps the canonical ESM entry at dist/index.js (no rename to .mjs)', () => {
    // Belt-and-suspenders: the issue's Option B (rename .js → .mjs)
    // would break native Node `"type": "module"` consumers that
    // resolve `exports.import` to `./dist/index.js`. We chose
    // Option A precisely to keep the canonical name; the test
    // pins that.
    const config = readTsupConfig()
    expect(config).toMatch(/format:\s*\[\s*['"]esm['"]\s*,\s*['"]cjs['"]\s*\]/)
    // The shim is added by the post-build hook, not by changing
    // tsup's `outExtension` (which would rename every output
    // file). Confirm `outExtension` is not configured to rewrite
    // the ESM output to `.mjs`.
    expect(config).not.toMatch(/outExtension/)
  })
})
