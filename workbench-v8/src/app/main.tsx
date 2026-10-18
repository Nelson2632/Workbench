import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AppLockGate from '../components/appLock/AppLockGate'
import { db } from '../db/database'
import { checkDataIntegrity } from '../utils/errorRecovery'
import { migrateFromV5 } from '../db/migration'
import { setupEventSubscriptions } from './setupEvents'
import { rolloverBirthdayEvents } from '../domain/life/birthday'
import { runAutoBackup } from '../db/backupPolicy'

// Show inline loading indicator before React mounts
const rootEl = document.getElementById('app')!
const loadingEl = document.getElementById('app-loading')

async function bootstrap() {
  // Check DB availability
  const dbAvailable = await db.isAvailable()
  if (!dbAvailable) {
    console.warn('[Workbench] IndexedDB is not available, falling back to localStorage mode')
    localStorage.setItem('wb-db-unavailable', '1')
  } else {
    localStorage.removeItem('wb-db-unavailable')
  }

  // Run V5 → V8 migration (no-op if already migrated or no V5 data)
  try {
    await migrateFromV5()
  } catch (err) {
    console.warn('[Workbench] V5 migration failed:', err)
  }

  // 防御性清理：裁剪 7 天前的 commandId 幂等记录（防 append-only 无限膨胀，静默失败）。
  // 必须在 runAutoBackup / checkDataIntegrity 之前执行——二者会全量 toArray 各表，
  // 若幂等表已膨胀到 GB 级，会先卡死在这里，后面的清理永远轮不到。
  try {
    const pruned = await db.pruneSystemCommandIds(7)
    if (pruned > 0) console.info(`[Workbench] pruned ${pruned} stale commandId records`)
  } catch (err) {
    console.warn('[Workbench] pruneSystemCommandIds failed:', err)
  }

  // Set up cross-module event subscriptions
  setupEventSubscriptions()

  // V9 LIFE：每日 rollover —— 补建生日事件 / 今日生日事件（幂等，V9-C-002 §8.2）
  try {
    await rolloverBirthdayEvents()
  } catch (err) {
    console.warn('[Workbench] Birthday rollover failed:', err)
  }

  // V9 SECURITY：自动备份（每日快照 + 周快照 + 裁剪；幂等，V9-C-003 §4）
  try {
    await runAutoBackup()
  } catch (err) {
    console.warn('[Workbench] Auto backup failed:', err)
  }

  // Run data integrity check
  try {
    const integrity = await checkDataIntegrity()
    if (!integrity.ok) {
      console.warn('[Workbench] Data integrity issues detected:', integrity.issues)
    }
  } catch (err) {
    console.warn('[Workbench] Data integrity check failed:', err)
  }

  // Remove inline loading indicator
  if (loadingEl) {
    loadingEl.style.opacity = '0'
    loadingEl.style.transition = 'opacity 0.3s ease'
    setTimeout(() => loadingEl.remove(), 300)
  }

  createRoot(rootEl).render(
    <StrictMode>
      <AppLockGate>
        <App />
      </AppLockGate>
    </StrictMode>,
  )
}

bootstrap()
