import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', testMatch: 'v1.1-production.spec.ts',
  use: { baseURL: 'http://127.0.0.1:1421', viewport: { width: 1280, height: 800 }, trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/serve-production.mjs', cwd: '..', url: 'http://127.0.0.1:1421', reuseExistingServer: false },
})
