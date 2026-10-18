import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  // Tauri expects a fixed port and fails if it is not available
  clearScreen: false,
  build: {
    // 不清空 outDir，避免构建前批量删除 dist 触发文件删除保护
    // （构建产物由 beforeBuildCommand 覆盖写入即可，残留旧 hash 文件无害）
    emptyOutDir: false,
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
  // Environment variables starting with TAURI_ are exposed to the frontend
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
