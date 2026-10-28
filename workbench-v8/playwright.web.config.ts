import { defineConfig } from '@playwright/test'

// Browser-only failure injection uses Vite modules, never a production debug API.
export default defineConfig({
  testDir: './e2e',
  testMatch: 'v1.1-motivation.spec.ts',
  use: { baseURL: 'http://localhost:1420', viewport: { width: 1280, height: 800 } },
  webServer: { command: 'npm run dev', url: 'http://localhost:1420', reuseExistingServer: !process.env.CI },
})
