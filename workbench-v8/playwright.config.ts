import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:1420', // Tauri dev 端口
    viewport: { width: 1280, height: 800 },
  },
  // Tauri 桌面壳：webServer 启动 pnpm tauri dev（首次会拉起桌面窗口）
  webServer: {
    command: 'pnpm tauri dev',
    url: 'http://localhost:1420',
    timeout: 180_000,
    reuseExistingServer: true,
  },
})
