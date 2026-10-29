// ============================================================
// Personal Workbench V8 — Backup / Restore（C-15）
// 普通数据备份（排除 vault）；带版本 + checksum 完整性校验
// ============================================================

import { db } from './database'
import { formatDate } from '../utils/helpers'
import { saveLocalBackup } from '../utils/errorRecovery'

const BACKUP_VERSION = 1

/** FNV-1a 32-bit 校验和（用于完整性检测，非安全用途） */
function computeChecksum(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export interface BackupPayload {
  version: number
  createdAt: string
  checksum: string
  data: Record<string, any[]>
}

/** 生成带版本 + checksum 的备份 payload（普通数据，不含 vault） */
export async function createBackupPayload(): Promise<BackupPayload> {
  const data = await db.exportAllData()
  const createdAt = new Date().toISOString()
  const checksum = computeChecksum(JSON.stringify(data))
  return { version: BACKUP_VERSION, createdAt, checksum, data }
}

/** 手动导出备份为 JSON 字符串（供下载） */
export async function exportBackupJson(): Promise<string> {
  const payload = await createBackupPayload()
  return JSON.stringify(payload, null, 2)
}

/** 校验备份 JSON，通过后返回其中的 data；失败抛错 */
export function verifyAndParseBackup(json: string): Record<string, any[]> {
  let payload: BackupPayload
  try {
    payload = JSON.parse(json)
  } catch {
    throw new Error('备份文件格式无效（非 JSON）')
  }
  if (!payload || payload.version !== BACKUP_VERSION) {
    throw new Error(`备份版本不兼容（当前支持 v${BACKUP_VERSION}）`)
  }
  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    throw new Error('备份内容缺失')
  }
  const checksum = computeChecksum(JSON.stringify(payload.data))
  if (!payload.checksum || checksum !== payload.checksum) {
    throw new Error('备份完整性校验失败（checksum 不匹配）')
  }
  return payload.data
}

/** 从备份 JSON 恢复（普通数据，不含 vault；vault 需单独恢复） */
export async function restoreBackup(json: string): Promise<void> {
  const data = verifyAndParseBackup(json)
  await db.importAllData(data)
}

/** 每日自动备份（保留最近 7 份，含版本 + checksum） */
export async function autoBackup(): Promise<{
  backedUp: boolean
  filePath?: string
  fileName?: string
  reason?: string
}> {
  try {
    // Check last backup time
    const lastBackup = await db.settings.get('lastBackupTime')
    const now = new Date()
    const oneDayMs = 24 * 60 * 60 * 1000

    if (lastBackup?.value) {
      const lastTime = new Date(lastBackup.value).getTime()
      if (now.getTime() - lastTime < oneDayMs) {
        return { backedUp: false, reason: 'Last backup was less than 24 hours ago' }
      }
    }

    // Export all data（排除 vault）
    const payload = await createBackupPayload()
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })

    const dateStr = formatDate(now)
    const fileName = `workbench-${dateStr}.json`

    // Try File System Access API if available
    let dirHandle: FileSystemDirectoryHandle | null = null
    try {
      if ('showDirectoryPicker' in window) {
        try {
          dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
        } catch {
          // 用户取消或不支持
        }
      }

      if (dirHandle) {
        const existingFiles: { name: string; handle: FileSystemFileHandle }[] = []
        for await (const [name, handle] of dirHandle.entries()) {
          if (name.startsWith('workbench-') && name.endsWith('.json')) {
            existingFiles.push({ name, handle: handle as FileSystemFileHandle })
          }
        }
        existingFiles.sort((a, b) => b.name.localeCompare(a.name))
        for (let i = 7; i < existingFiles.length; i++) {
          await dirHandle.removeEntry(existingFiles[i].name)
        }

        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      }
    } catch {
      // File system API not available - fall back to download
    }

    // Trigger download as fallback/primary method
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Update last backup time
    await db.settings.put({ key: 'lastBackupTime', value: now.toISOString() })

    // 同步保存到 localStorage 最近备份，供 C-19 错误恢复读取
    await saveLocalBackup()

    return { backedUp: true, fileName }
  } catch (err: any) {
    return { backedUp: false, reason: err.message || String(err) }
  }
}
