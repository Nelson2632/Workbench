import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: { statements: 80, branches: 75, functions: 70, lines: 85 },
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/db/mutationLane.ts', 'src/domain/planning/taskRecovery.ts', 'src/domain/planning/todayNarrative.ts', 'src/stores/taskStore.ts', 'src/domain/projection/criticalProjection.ts', 'src/domain/projection/dailyMemory.ts'],
    },
  },
})
