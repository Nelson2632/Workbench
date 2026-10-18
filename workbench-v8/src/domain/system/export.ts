// ============================================================
// V9 SYSTEM — 导出（V9_MASTER_PLAN Phase 7）
// 全量导出 = 快照表集（不含 vault/privateFileMeta）；
// 选定导出 = 用户勾选表（仍禁 vault/privateFileMeta）
// ============================================================

import { db } from '@/db/database'

export const EXPORT_FORBIDDEN = new Set(['vault', 'privateFileMeta'])

export function allowedExportTables(): string[] {
  return db.tables.map((t) => t.name).filter((n) => !EXPORT_FORBIDDEN.has(n))
}

export interface ExportPayload {
  app: string
  exportedAt: string
  tables: string[]
  data: Record<string, unknown[]>
}

export async function exportFullData(): Promise<ExportPayload> {
  const tables = allowedExportTables()
  const data: Record<string, unknown[]> = {}
  for (const t of tables) {
    data[t] = await db.table(t).toArray()
  }
  return { app: 'WorkbenchV9', exportedAt: new Date().toISOString(), tables, data }
}

export async function exportSelectedData(tables: string[]): Promise<ExportPayload> {
  const allowed = new Set(allowedExportTables())
  const picked = tables.filter((t) => allowed.has(t))
  const data: Record<string, unknown[]> = {}
  for (const t of picked) {
    data[t] = await db.table(t).toArray()
  }
  return { app: 'WorkbenchV9', exportedAt: new Date().toISOString(), tables: picked, data }
}

/** 浏览器下载 JSON（文件名含时间戳） */
export function downloadJson(filename: string, text: string): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
