import { defineConfig } from 'vitest/config'

// Tests run in jsdom so the runtime can use the real DOM. The drawer
// DOM is rich (focus tracking, body scroll lock, pointer events, drag
// math, nested transforms), so a real DOM implementation gives a more
// faithful signal than a polyfill. The `url: 'http://localhost/'`
// setting gives `window.location` a sensible default so the runtime
// can run without `vi.stubGlobal` boilerplate.
export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    include: ['test/**/*.test.ts'],
    coverage: {
      include: ['src/**'],
      exclude: ['src/browser/global.ts', 'src/style.css'],
      thresholds: { branches: 90, functions: 95, lines: 95, statements: 95 },
    },
  },
})
