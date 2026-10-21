import { defineConfig } from '@playwright/test'
import { project } from './shared/lib/project.mjs'
export default defineConfig({
  testDir: './site-e2e',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:4348' + project.base,
    browserName: 'chromium',
    actionTimeout: 10000,
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run preview --workspace landing -- --host 127.0.0.1 --port 4348 --ignore-lock',
    url: 'http://127.0.0.1:4348' + project.base,
    reuseExistingServer: !process.env.CI
  }
})
