// ============================================================
// V9 App Lock 状态机测试（V9-C-003 §2）
// 设置/解锁/锁定/改密/关闭/失败冷却/自动锁/密钥不持久化
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/db/database'
import { eventBus } from '@/domain/events/eventBus'
import {
  setupLock,
  unlock,
  lock,
  disableLock,
  changePassword,
  isUnlocked,
  getLockState,
  isLockEnabled,
  touchActivity,
  startAutoLock,
  stopAutoLock,
  APP_LOCK_ID,
  MAX_FAILED_ATTEMPTS,
  COOLDOWN_MS,
  _resetForTests,
} from './appLock'
import { toB64, fromB64, deriveKEKBits, getKEKBits, hasKEK } from './crypto'

const TEST_ITERATIONS = 1000

describe('App Lock', () => {
  beforeEach(async () => {
    vi.useRealTimers()
    _resetForTests()
    await db.delete()
    await db.open()
    eventBus.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    stopAutoLock()
    _resetForTests()
  })

  it('未配置 → unlock 返回 not-configured', async () => {
    const res = await unlock('any')
    expect(res).toEqual({ ok: true, reason: 'not-configured' })
  })

  it('设置 → 会话解锁 → 锁定 → 解锁成功', async () => {
    await setupLock('my-password', 15, TEST_ITERATIONS)
    expect(isUnlocked()).toBe(true)
    expect(await isLockEnabled()).toBe(true)

    lock()
    expect(isUnlocked()).toBe(false)

    const ok = await unlock('my-password')
    expect(ok.ok).toBe(true)
    expect(isUnlocked()).toBe(true)
  })

  it('错误密码 → wrong-password；连续 5 次 → 60 秒冷却', async () => {
    await setupLock('my-password', 15, TEST_ITERATIONS)
    lock()

    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i++) {
      const res = await unlock('bad')
      expect(res.reason).toBe('wrong-password')
    }
    const fifth = await unlock('bad')
    expect(fifth.reason).toBe('cooldown')
    expect(fifth.remainingMs).toBe(COOLDOWN_MS)

    // 冷却期内即使密码正确也拒绝
    const during = await unlock('my-password')
    expect(during.reason).toBe('cooldown')

    // 冷却结束后可解锁（只伪造 Date，避免影响 IndexedDB 内部定时器）
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + COOLDOWN_MS + 1)
    const after = await unlock('my-password')
    expect(after.ok).toBe(true)
  })

  it('锁定/解锁发布事件', async () => {
    const seen: string[] = []
    eventBus.subscribeAll((e) => {
      if (e.type === 'appLock.locked' || e.type === 'appLock.unlocked') seen.push(e.type)
    })
    await setupLock('pw', 15, TEST_ITERATIONS)
    expect(seen).toContain('appLock.unlocked')
    lock()
    await unlock('pw')
    expect(seen).toContain('appLock.locked')
    expect(seen.filter((t) => t === 'appLock.unlocked')).toHaveLength(2)
  })

  it('KEK / 主密码绝不落库（appLock 行只含 salt/verifier/iterations）', async () => {
    const password = 'top-secret-pw'
    await setupLock(password, 15, TEST_ITERATIONS)
    const row = await getLockState()
    expect(row).toBeDefined()
    const serialized = JSON.stringify(row)

    // 行内不含主密码
    expect(serialized).not.toContain(password)
    // 行内不含 KEK 位（base64 后也不应出现）
    const bits = await deriveKEKBits(password, fromB64(row!.salt), row!.iterations)
    expect(serialized).not.toContain(toB64(bits))
    // KEK 仅在内存模块中
    expect(getKEKBits()).not.toBeNull()
    expect(hasKEK()).toBe(true)
  })

  it('关闭 App Lock 需验证密码', async () => {
    await setupLock('pw', 15, TEST_ITERATIONS)
    const bad = await disableLock('wrong')
    expect(bad.ok).toBe(false)
    const ok = await disableLock('pw')
    expect(ok.ok).toBe(true)
    expect(await isLockEnabled()).toBe(false)
    expect(isUnlocked()).toBe(false)
  })

  it('改密后新密码可用、旧密码失效（含 DEK 重包裹空表路径）', async () => {
    await setupLock('old-pw', 15, TEST_ITERATIONS)
    const res = await changePassword('old-pw', 'new-pw')
    expect(res.ok).toBe(true)

    lock()
    expect((await unlock('old-pw')).ok).toBe(false)
    expect((await unlock('new-pw')).ok).toBe(true)
  })

  it('自动锁：15 分钟无操作 → 锁定；有活动则续期', async () => {
    // 只伪造 Date 与 setInterval：IndexedDB 的 setTimeout/setImmediate 保持真实
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-08-30T20:00:00'))
    await setupLock('pw', 15, TEST_ITERATIONS)
    startAutoLock()

    // 10 分钟后有活动 → 不锁
    vi.setSystemTime(new Date('2026-08-30T20:10:00'))
    touchActivity()
    await vi.advanceTimersByTimeAsync(31_000)
    expect(isUnlocked()).toBe(true)

    // 再 15 分钟无活动 → 锁
    vi.setSystemTime(new Date('2026-08-30T20:25:30'))
    await vi.advanceTimersByTimeAsync(31_000)
    expect(isUnlocked()).toBe(false)

    // 关闭自动锁后不再触发
    stopAutoLock()
    await unlock('pw')
    expect(isUnlocked()).toBe(true)
    vi.setSystemTime(new Date('2026-08-30T21:00:00'))
    await vi.advanceTimersByTimeAsync(31_000)
    expect(isUnlocked()).toBe(true)
  })

  it('appLock 单行主键 id=main', async () => {
    await setupLock('pw', 15, TEST_ITERATIONS)
    expect(await db.appLock.count()).toBe(1)
    const row = await db.appLock.get(APP_LOCK_ID)
    expect(row?.kdfParamsVersion).toBe(1)
  })

  it('createdAt 审计字段（Patch C-003-09）：设置写入，重设保留首次时间', async () => {
    await setupLock('pw1', 15, TEST_ITERATIONS)
    const first = (await db.appLock.get(APP_LOCK_ID))!.createdAt
    expect(first).toBeTruthy()

    // 重设密码 → 审计锚点不变
    await setupLock('pw2', 15, TEST_ITERATIONS)
    const second = (await db.appLock.get(APP_LOCK_ID))!.createdAt
    expect(second).toBe(first)
  })

  it('重启生命周期（RF-01）：状态持久化、KEK 随进程清空、重解锁后状态机不破坏', async () => {
    // 1) 设置 App Lock（会话解锁）
    await setupLock('restart-pw', 15, TEST_ITERATIONS)
    expect(isUnlocked()).toBe(true)
    expect(await isLockEnabled()).toBe(true)

    // 2) 模拟进程重启：KEK 是内存态随进程消失；持久化状态仍在 Dexie
    _resetForTests() // 等价于新进程冷启动（清空内存 KEK / 冷却 / 自动锁）
    expect(isUnlocked()).toBe(false)          // 重启后处于未解锁态
    expect(await isLockEnabled()).toBe(true)  // App Lock 仍启用（状态持久化）

    // 3) AppLockGate 冷启动路径：用主密码重新解锁
    const res = await unlock('restart-pw')
    expect(res.ok).toBe(true)
    expect(isUnlocked()).toBe(true)

    // 4) 多次锁/解锁往返不破坏状态机
    lock()
    expect(isUnlocked()).toBe(false)
    expect((await unlock('restart-pw')).ok).toBe(true)
    expect(isUnlocked()).toBe(true)
  })
})
