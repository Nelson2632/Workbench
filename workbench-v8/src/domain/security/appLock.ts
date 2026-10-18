// ============================================================
// Personal Workbench V9 — App Lock 状态机（V9-C-003 §2）
// 主密码 → PBKDF2 → KEK（仅内存）→ 校验器比对
// 铁律：KEK 绝不持久化；失败 5 次本地冷却 60 秒；自动锁默认 15 分钟
// ============================================================

import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import type { AppLockState } from '@/types'
import {
  KDF_ITERATIONS,
  SALT_BYTES,
  TAG_BYTES,
  DEK_WRAP_AAD,
  randomBytes,
  toB64,
  fromB64,
  deriveKEKBits,
  computeVerifier,
  bytesEqual,
  setKEKBits,
  getKEKBits,
  clearKEK,
  unwrapDEK,
  importAesKey,
  aesGcmEncrypt,
} from './crypto'

const te = new TextEncoder()

export const APP_LOCK_ID = 'main'
export const MAX_FAILED_ATTEMPTS = 5
export const COOLDOWN_MS = 60_000
export const AUTO_LOCK_CHECK_MS = 30_000

export interface UnlockResult {
  ok: boolean
  reason?: 'not-configured' | 'disabled' | 'cooldown' | 'wrong-password' | 'error'
  remainingMs?: number
}

// ---- 会话态（内存）----

let failedAttempts = 0
let cooldownUntil = 0
let lastActivityAt = Date.now()
let autoLockTimer: ReturnType<typeof setInterval> | null = null

function now(): number {
  return Date.now()
}

/** UI 活动时调用（键盘/指针），重置自动锁计时 */
export function touchActivity(): void {
  lastActivityAt = now()
}

// ---- 查询与初始化 ----

export async function getLockState(): Promise<AppLockState | undefined> {
  return db.appLock.get(APP_LOCK_ID)
}

export async function isLockEnabled(): Promise<boolean> {
  const row = await getLockState()
  return !!row && row.enabled
}

/**
 * 设置 App Lock（首次启用 / 重置）。
 * iterations 参数仅测试用；生产走 KDF_ITERATIONS（kdfParamsVersion=1）。
 */
export async function setupLock(
  password: string,
  autoLockMinutes = 15,
  iterations = KDF_ITERATIONS,
): Promise<void> {
  const salt = randomBytes(SALT_BYTES)
  const bits = await deriveKEKBits(password, salt, iterations)
  const verifier = await computeVerifier(bits)
  // 首次启用时间保留（Patch C-003-09：重设密码不改变审计锚点）
  const existing = await getLockState()
  const row: AppLockState = {
    id: APP_LOCK_ID,
    kdfParamsVersion: 1,
    salt: toB64(salt),
    iterations,
    verifier,
    enabled: true,
    autoLockMinutes,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await db.appLock.put(row)
  setKEKBits(bits) // 设置即解锁会话
  failedAttempts = 0
  cooldownUntil = 0
  eventBus.publish({ type: 'appLock.unlocked' })
}

/** 解锁：派生 KEK → 校验器比对；成功置内存 KEK */
export async function unlock(password: string): Promise<UnlockResult> {
  const row = await getLockState()
  if (!row) return { ok: true, reason: 'not-configured' }
  if (!row.enabled) return { ok: true, reason: 'disabled' }

  if (cooldownUntil > now()) {
    return { ok: false, reason: 'cooldown', remainingMs: cooldownUntil - now() }
  }

  try {
    const salt = fromB64(row.salt)
    const bits = await deriveKEKBits(password, salt, row.iterations)
    const verifierB64 = await computeVerifier(bits)
    const expected = fromB64(row.verifier)
    if (!bytesEqual(expected, fromB64(verifierB64))) {
      throw new Error('wrong')
    }
    setKEKBits(bits)
    failedAttempts = 0
    cooldownUntil = 0
    touchActivity()
    eventBus.publish({ type: 'appLock.unlocked' })
    return { ok: true }
  } catch {
    failedAttempts += 1
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      failedAttempts = 0
      cooldownUntil = now() + COOLDOWN_MS
      return { ok: false, reason: 'cooldown', remainingMs: COOLDOWN_MS }
    }
    return { ok: false, reason: 'wrong-password' }
  }
}

/** 锁定：清零内存 KEK，发布事件（V9-C-003 §2 锁定动作） */
export function lock(): void {
  clearKEK()
  eventBus.publish({ type: 'appLock.locked' })
}

/** 关闭 App Lock（需密码验证） */
export async function disableLock(password: string): Promise<UnlockResult> {
  const res = await unlock(password)
  if (!res.ok && res.reason !== 'disabled' && res.reason !== 'not-configured') {
    return res
  }
  const row = await getLockState()
  if (row) {
    await db.appLock.put({ ...row, enabled: false, updatedAt: new Date().toISOString() })
  }
  lock()
  return { ok: true }
}

/** 修改主密码：验证旧密码 → 新盐新校验器 → 重包裹全部 DEK（V9-C-003 §3.1）
 *  两阶段原子化：先全部解包+重包裹（仅内存），全部成功后才单事务回写；
 *  任一文件解包失败 → 整体失败、零写入，绝不留下"一半新钥一半旧钥"的损坏状态。 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<UnlockResult> {
  const rowBefore = await getLockState()
  if (!rowBefore || !rowBefore.enabled) return { ok: false, reason: 'error' }

  const res = await unlock(oldPassword)
  if (!res.ok) return res
  const oldBits = getKEKBits()
  if (!oldBits) return { ok: false, reason: 'error' }

  const salt = randomBytes(SALT_BYTES)
  const newBits = await deriveKEKBits(newPassword, salt, rowBefore.iterations)
  const verifier = await computeVerifier(newBits)
  const kek = await importAesKey(newBits)

  // 阶段 1：全部 DEK 解包 + 新 KEK 重包裹（仅内存；任一失败 → 整体中止，零写入）
  // 契约字段约定：dekCt = AES-GCM 密文+标签拼接（base64）
  const metas = await db.privateFileMeta.toArray()
  const rewraps: { id: number; dekIv: string; dekCt: string }[] = []
  try {
    for (const meta of metas) {
      const ctTag = fromB64(meta.dekCt)
      const ct = ctTag.slice(0, ctTag.length - TAG_BYTES)
      const tag = ctTag.slice(ctTag.length - TAG_BYTES)
      const dek = await unwrapDEK(oldBits, { iv: meta.dekIv, ct: toB64(ct), tag: toB64(tag) })
      const raw = new Uint8Array(await crypto.subtle.exportKey('raw', dek))
      const env = await aesGcmEncrypt(kek, raw, te.encode(DEK_WRAP_AAD))
      const newCtTag = new Uint8Array(env.ct.length + TAG_BYTES)
      newCtTag.set(fromB64(env.ct), 0)
      newCtTag.set(fromB64(env.tag), env.ct.length)
      rewraps.push({ id: meta.id, dekIv: env.iv, dekCt: toB64(newCtTag) })
    }
  } catch (err) {
    console.error('[AppLock] changePassword rewrap failed, aborting:', err)
    return { ok: false, reason: 'error' }
  }

  // 阶段 2：单事务原子回写（重包裹字段 + 新 salt/verifier）
  const nowIso = new Date().toISOString()
  await db.transaction('rw', [db.privateFileMeta, db.appLock], async () => {
    for (const r of rewraps) {
      await db.privateFileMeta.update(r.id, { dekIv: r.dekIv, dekCt: r.dekCt, updatedAt: nowIso })
    }
    await db.appLock.put({
      ...rowBefore,
      salt: toB64(salt),
      verifier,
      updatedAt: nowIso,
    })
  })
  setKEKBits(newBits)
  return { ok: true }
}

/** 当前会话是否已解锁 */
export function isUnlocked(): boolean {
  return getKEKBits() !== null
}

// ---- 自动锁定（默认 15 分钟无操作）----

export function startAutoLock(): void {
  stopAutoLock()
  autoLockTimer = setInterval(async () => {
    const row = await getLockState()
    if (!row || !row.enabled || row.autoLockMinutes <= 0) return
    const idle = now() - lastActivityAt
    if (idle >= row.autoLockMinutes * 60_000) {
      lock()
    }
  }, AUTO_LOCK_CHECK_MS)
}

export function stopAutoLock(): void {
  if (autoLockTimer) {
    clearInterval(autoLockTimer)
    autoLockTimer = null
  }
}

// ---- 测试辅助（仅测试使用）----

export function _resetForTests(): void {
  failedAttempts = 0
  cooldownUntil = 0
  lastActivityAt = now()
  stopAutoLock()
  clearKEK()
}

/** 供测试注入的 KEK 导入（验证内存 KEK 非空） */
export async function _importKekForTests(): Promise<CryptoKey | null> {
  const bits = getKEKBits()
  return bits ? importAesKey(bits) : null
}
