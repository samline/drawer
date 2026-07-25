import { defineConfig } from 'tsup'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// `@samline/drawer` is framework-free. There are no peer dependencies to
// mark as `external` and no optional runtime to bundle in.
//
// The two build entries reflect the two supported ways to consume the
// package:
//
//   1. ESM + CJS + types (`index`) — consumed by bundlers (Astro/Vite/
//      webpack/etc.). `clean: true` wipes `dist/` before writing so
//      leftovers from previous runs do not leak into the new bundle.
//
//   2. IIFE (`browser/global`) — loaded standalone via a single `<script>`
//      tag. `clean: false` keeps the index entry's assets in place; the
//      entry only adds its own files under `dist/browser/`. The
//      `globalName: 'Drawer'` matches `window.Drawer` in the docs.
//
// `src/style.css` is a static asset that ships as
// `@samline/drawer/styles.css` (see `package.json` exports). The
// `onSuccess` hook copies it to `dist/style.css` after the index
// build runs so consumers can import it without going through a
// bundler.

const copyStylesHook = async (): Promise<void> => {
  copyFileSync(resolve('src/style.css'), resolve('dist/style.css'))
}

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts'
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2020',
    outDir: 'dist',
    external: [],
    onSuccess: copyStylesHook
  },
  {
    entry: {
      'browser/global': 'src/browser/global.ts'
    },
    format: ['iife'],
    dts: true,
    sourcemap: true,
    clean: false,
    target: 'es2020',
    outDir: 'dist',
    globalName: 'Drawer'
  }
])
