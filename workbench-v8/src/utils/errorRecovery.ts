// ============================================================
// Personal Workbench V8 — Error Recovery Utilities
// ============================================================

import { db } from '../db/database'
import type { Setting } from '../types'

interface IntegrityResult {
  ok: boolean
  issues: string[]
}

// 完整性检查覆盖 db 注册的全部表（含 V9 新增表）。
// 不再维护硬编码清单，避免新增表时遗漏（此前遗漏全部 V9 表）。

const LS_BACKUP_KEY = 'wb-latest-backup'
const LS_FALLBACK_PREFIX = 'wb-fallback-'

// 完整性检查跳过「内部 append-only 表」：不承载用户数据，且可能随审计/幂等缓存合法膨胀，
// 全量 toArray 会拖慢甚至卡死启动（历史教训：systemCommandIds 曾到 GB 级）。
const INTEGRITY_SKIP_TABLES = new Set(['systemCommandIds', 'operationJournal', 'appEvents'])

/**
 * Check data integrity across all IndexedDB tables.
 * Returns { ok: boolean, issues: string[] }
 */
export async function checkDataIntegrity(): Promise<IntegrityResult> {
  const issues: string[] = []

  try {
    const available = await db.isAvailable()
    if (!available) {
      issues.push('IndexedDB is not available')
      return { ok: false, issues }
    }

    for (const table of db.tables) {
      const tableName = table.name
      if (INTEGRITY_SKIP_TABLES.has(tableName)) continue
      const schema = table.schema as { primKey?: { keyPath?: string | string[] | null } } | undefined
      const keyPath = schema?.primKey?.keyPath
      const idKey = Array.isArray(keyPath) ? (keyPath[0] ?? 'id') : (keyPath ?? 'id')
      try {
        const records = await table.toArray()
        if (!Array.isArray(records)) {
          issues.push(`Table "${tableName}" returned non-array data`)
          continue
        }
        // Check for null/undefined records
        const nullCount = records.filter((r) => r == null).length
        if (nullCount > 0) {
          issues.push(`Table "${tableName}" contains ${nullCount} null/undefined records`)
        }
        // Check records have required primary key field（settings→key、operationJournal→seq 等）
        const missingId = records.filter((r) => r != null && (r as Record<string, unknown>)[idKey] == null).length
        if (missingId > 0) {
          issues.push(`Table "${tableName}" contains ${missingId} records without ${idKey}`)
        }
      } catch (err) {
        issues.push(`Table "${tableName}" read failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    issues.push(`Integrity check failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { ok: issues.length === 0, issues }
}

/**
 * Restore data from the latest backup stored in localStorage.
 */
export async function recoverFromBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY)
    if (!raw) {
      return { success: false, message: 'No backup found in localStorage' }
    }

    const backup = JSON.parse(raw)
    if (!backup || typeof backup !== 'object') {
      return { success: false, message: 'Backup data is corrupted' }
    }

    const available = await db.isAvailable()
    if (!available) {
      return { success: false, message: 'IndexedDB is not available' }
    }

    await db.importAllData(backup)
    return { success: true, message: `Restored backup from ${backup._timestamp || 'unknown time'}` }
  } catch (err) {
    return { success: false, message: `Recovery failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Save current data as a backup to localStorage.
 */
export async function saveLocalBackup(): Promise<void> {
  try {
    const data = await db.exportAllData()
    ;(data as any)._timestamp = new Date().toISOString()
    localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(data))
  } catch (err) {
    console.warn('[ErrorRecovery] Failed to save local backup:', err)
  }
}

/**
 * Fallback to localStorage mode when IndexedDB is unavailable.
 * Stores data in localStorage under prefixed keys.
 */
export function fallbackToLocalStorage(): boolean {
  try {
    localStorage.setItem(`${LS_FALLBACK_PREFIX}test`, '1')
    localStorage.removeItem(`${LS_FALLBACK_PREFIX}test`)
    return true
  } catch {
    return false
  }
}

/**
 * Read a value from localStorage fallback storage.
 */
export function readFromFallback(key: string): string | null {
  return localStorage.getItem(`${LS_FALLBACK_PREFIX}${key}`)
}

/**
 * Write a value to localStorage fallback storage.
 */
export function writeToFallback(key: string, value: string): void {
  try {
    localStorage.setItem(`${LS_FALLBACK_PREFIX}${key}`, value)
  } catch (err) {
    console.warn('[ErrorRecovery] Failed to write to fallback storage:', err)
  }
}

/**
 * Load all settings from localStorage fallback.
 */
export function loadFallbackSettings(): Setting[] {
  const settings: Setting[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(LS_FALLBACK_PREFIX)) {
      const settingKey = key.slice(LS_FALLBACK_PREFIX.length)
      try {
        const value = JSON.parse(localStorage.getItem(key)!)
        settings.push({ key: settingKey, value })
      } catch {
        settings.push({ key: settingKey, value: localStorage.getItem(key) })
      }
    }
  }
  return settings
}