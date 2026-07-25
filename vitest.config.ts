import { defineConfig } from 'vitest/config'

// Tests run in jsdom so the runtime can use the real DOM instead of
// the linkedom + `vi.stubGlobal` boilerplate the previous setup
// required. The drawer DOM is rich (focus tracking, body scroll lock,
// pointer events, drag math, nested transforms), so a real DOM
// implementation gives a more faithful signal than a polyfill.
export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/'
      }
    },
    include: ['test/**/*.test.ts']
  }
})
