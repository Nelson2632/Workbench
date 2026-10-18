// ============================================================
// V9 PLAY — Game Adapter 契约基础设施（V9-C-005 冻结）
// 版本闸门（C-005-12）：过新/过旧一律 disabled，不猜测兼容
// 超时 15s × 重试 2 次（1s/2s）→ offlineMode + lastKnownData
// 异常绝不冒泡进 EventBus 主链（捕获 + Journal）
// 核心零依赖：本模块不 import 任何具体 adapter，adapter 经注册表发现
// ============================================================

import { db } from '@/db/database'
import { journalEvent } from '@/db/journal'

/** V9 Core 版本（adapter.minCoreVersion 与之比较） */
export const CORE_VERSION = '9.0.0'
/** Core 期望的游戏数据 schema 版本 */
export const EXPECTED_GAME_SCHEMA = 1

export const ADAPTER_TIMEOUT_MS = 15_000
export const ADAPTER_RETRIES = 2
export const ADAPTER_BACKOFF_MS = [1_000, 2_000]

export type GameCapability = 'profile' | 'records' | 'combat' | 'sync'

export interface GameProfile {
  source: string
  updatedAt: string
  data: Record<string, unknown>
}

export interface CombatSimulationInput {
  [key: string]: unknown
}

export interface CombatSimulationResult {
  theoretical: true
  assumptions: string[]
  data: Record<string, unknown>
}

/** 与 V9-C-005 §2 冻结接口一致（含 Patch C-005-12 字段） */
export interface GameAdapter {
  readonly gameId: string
  readonly adapterVersion: string
  readonly targetSchemaVersion: number
  readonly minCoreVersion: string
  readonly maxSupportedSchemaVersion: number
  getCapabilities(): GameCapability[] | Promise<GameCapability[]>
  fetchProfile(): Promise<GameProfile>
  fetchRecords(): Promise<GameProfile[]>
  simulateCombat?(input: CombatSimulationInput): Promise<CombatSimulationResult>
  dispose?(): void
}

// ---------- 版本闸门（Patch C-005-12） ----------

export type AdapterVerdict =
  | { ok: true }
  | { ok: false; reason: 'adapter-too-new' | 'adapter-too-old' | 'schema-ahead' }

function semverCompare(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0)
  }
  return 0
}

/** 显式判定，不做"尽力猜测"兼容；任一命中 → disabled */
export function checkAdapterCompatibility(
  adapter: Pick<GameAdapter, 'minCoreVersion' | 'maxSupportedSchemaVersion' | 'targetSchemaVersion'>,
  coreVersion = CORE_VERSION,
  expectedSchema = EXPECTED_GAME_SCHEMA,
): AdapterVerdict {
  if (semverCompare(adapter.minCoreVersion, coreVersion) > 0) {
    return { ok: false, reason: 'adapter-too-new' }
  }
  if (adapter.maxSupportedSchemaVersion < expectedSchema) {
    return { ok: false, reason: 'adapter-too-old' }
  }
  if (adapter.targetSchemaVersion > expectedSchema) {
    return { ok: false, reason: 'schema-ahead' }
  }
  return { ok: true }
}

// ---------- 注册表（核心只经注册表发现 adapter） ----------

const registry = new Map<string, GameAdapter>()

export function registerAdapter(adapter: GameAdapter): AdapterVerdict {
  const verdict = checkAdapterCompatibility(adapter)
  if (!verdict.ok) return verdict
  registry.set(adapter.gameId, adapter)
  return { ok: true }
}

export function getAdapter(gameId: string): GameAdapter | undefined {
  return registry.get(gameId)
}

export function listAdapters(): GameAdapter[] {
  return [...registry.values()]
}

/** 测试辅助 */
export function clearRegistry(): void {
  registry.clear()
}

// ---------- offlineMode（V9-C-005 §3） ----------

export async function isOffline(gameId: string): Promise<boolean> {
  const row = await db.settings.get(`game.offline.${gameId}`)
  return row?.value === true
}

export async function clearOffline(gameId: string): Promise<void> {
  await db.settings.delete(`game.offline.${gameId}`)
}

async function setOffline(gameId: string, value: boolean): Promise<void> {
  await db.settings.put({ key: `game.offline.${gameId}`, value })
}

// ---------- 调用策略：超时 + 重试 + 失败隔离 ----------

export interface AdapterCallOptions {
  timeoutMs?: number
  retries?: number
  backoffMs?: number[]
}

export interface AdapterCallResult<T> {
  status: 'ok' | 'offline'
  data?: T
  attempts: number
  error?: string
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('adapter timeout')), ms)
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 执行 adapter 调用（契约 §3）：
 * 失败重试（1s/2s 退避）→ 全部失败 → offlineMode + Journal，返回 status='offline'。
 * 任何异常被捕获，绝不向上抛出（禁止白屏/死循环/冒泡进 EventBus 主链）。
 */
export async function callAdapter<T>(
  gameId: string,
  fn: () => Promise<T>,
  opts: AdapterCallOptions = {},
): Promise<AdapterCallResult<T>> {
  const timeoutMs = opts.timeoutMs ?? ADAPTER_TIMEOUT_MS
  const retries = opts.retries ?? ADAPTER_RETRIES
  const backoffMs = opts.backoffMs ?? ADAPTER_BACKOFF_MS

  let lastError = ''
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await withTimeout(fn(), timeoutMs)
      await setOffline(gameId, false)
      return { status: 'ok', data, attempts: attempt + 1 }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt < retries) {
        await sleep(backoffMs[attempt] ?? 1_000)
      }
    }
  }

  await setOffline(gameId, true)
  await journalEvent('game.adapter.offline', { gameId, error: lastError }).catch(() => {})
  return { status: 'offline', attempts: retries + 1, error: lastError }
}

/** 拉取档案/记录并把快照交给回调落库（lastKnownData 唯一来源） */
export async function fetchWithOfflinePolicy<T>(
  adapter: GameAdapter,
  fn: (adapter: GameAdapter) => Promise<T>,
  onSnapshot?: (data: T) => Promise<void>,
  opts: AdapterCallOptions = {},
): Promise<AdapterCallResult<T>> {
  const result = await callAdapter(adapter.gameId, () => fn(adapter), opts)
  if (result.status === 'ok' && result.data !== undefined && onSnapshot) {
    await onSnapshot(result.data)
  }
  return result
}
