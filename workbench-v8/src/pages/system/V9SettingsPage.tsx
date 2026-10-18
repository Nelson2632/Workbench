// ============================================================
// V9 SYSTEM — V9 系统设置页（App Lock / 备份策略 / 导出 / Flex 模式）
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  setupLock,
  unlock,
  lock,
  disableLock,
  changePassword,
  getLockState,
  isUnlocked,
} from '@/domain/security/appLock'
import { createSnapshot, listSnapshots } from '@/db/snapshot'
import { runAutoBackup } from '@/db/backupPolicy'
import { exportFullData, exportSelectedData, downloadJson, allowedExportTables } from '@/domain/system/export'
import { getPlanningMode, setPlanningMode } from '@/domain/work/flexStudy'
import type { BackupSnapshot } from '@/types'
import styles from '@/pages/life/life.module.css'

export default function V9SettingsPage() {
  const [lockEnabled, setLockEnabled] = useState(false)
  const [unlockedNow, setUnlockedNow] = useState(false)
  const [autoLockMinutes, setAutoLockMinutes] = useState(15)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [planningMode, setPlanningModeState] = useState<'adaptive' | 'manual'>('adaptive')
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([])
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set(['diaries', 'friends', 'events', 'timelineEvents']))
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const row = await getLockState()
    setLockEnabled(row?.enabled ?? false)
    setUnlockedNow(isUnlocked())
    if (row) setAutoLockMinutes(row.autoLockMinutes)
    setPlanningModeState(await getPlanningMode())
    setSnapshots(await listSnapshots())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleSetup = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (pw.length < 4) {
      setError('主密码至少 4 位（建议 ≥8 位）')
      return
    }
    if (pw !== pw2) {
      setError('两次输入不一致')
      return
    }
    await setupLock(pw, autoLockMinutes)
    setPw('')
    setPw2('')
    setNotice('App Lock 已启用')
    await refresh()
  }

  const handleUnlock = async () => {
    const res = await unlock(pw)
    if (res.ok) {
      setNotice('已解锁')
    } else {
      setError(res.reason === 'cooldown' ? `冷却中，剩 ${Math.ceil((res.remainingMs ?? 0) / 1000)} 秒` : '密码错误')
    }
    setPw('')
    await refresh()
  }

  const handleDisable = async () => {
    if (window.confirm('关闭 App Lock？需验证密码')) {
      const res = await disableLock(pw)
      if (!res.ok) setError('密码错误')
      else setNotice('App Lock 已关闭')
      setPw('')
      await refresh()
    }
  }

  const handleChangePw = async () => {
    const res = await changePassword(pw, pw2)
    if (res.ok) setNotice('主密码已修改（全部 DEK 已重包裹）')
    else setError('旧密码错误或未解锁')
    setPw('')
    setPw2('')
    await refresh()
  }

  const handleExport = async (full: boolean) => {
    const payload = full
      ? await exportFullData()
      : await exportSelectedData([...selectedTables])
    downloadJson(`workbench-v9-${full ? 'full' : 'selected'}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2))
    setNotice(`已导出 ${payload.tables.length} 张表（不含 vault/私密文件）`)
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>⚙ V9 系统设置</h1>
      </header>
      {notice && <p className={styles.subtitle} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* App Lock */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>🔒 App Lock（{lockEnabled ? '已启用' : '未启用'} · {unlockedNow ? '已解锁' : '锁定中'}）</h2>
        {!lockEnabled && (
          <form onSubmit={handleSetup} className={styles.formRow}>
            <input className={styles.input} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="设置主密码（≥8 位建议）" aria-label="主密码" />
            <input className={styles.input} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="确认主密码" aria-label="确认主密码" />
            <select className={styles.select} value={autoLockMinutes} aria-label="自动锁定分钟" onChange={(e) => setAutoLockMinutes(Number(e.target.value))}>
              <option value={5}>5 分钟自动锁</option>
              <option value={15}>15 分钟自动锁</option>
              <option value={30}>30 分钟自动锁</option>
              <option value={0}>不自动锁</option>
            </select>
            <button type="submit" className={styles.button}>启用 App Lock</button>
          </form>
        )}
        {lockEnabled && (
          <div className={styles.formRow}>
            <input className={styles.input} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="当前密码" aria-label="当前密码" />
            <button type="button" className={styles.buttonGhost} onClick={() => void handleUnlock()}>解锁</button>
            <button type="button" className={styles.buttonGhost} onClick={() => lock()}>立即锁定</button>
            <button type="button" className={styles.buttonDanger} onClick={() => void handleDisable()}>关闭 App Lock</button>
            <input className={styles.input} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="新密码（改密用）" aria-label="新密码" />
            <button type="button" className={styles.buttonGhost} onClick={() => void handleChangePw()}>修改主密码</button>
          </div>
        )}
      </section>

      {/* 备份策略 */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>💾 备份（Daily ×7 + Weekly ×4，不含 Vault/私密文件）</h2>
        <div className={styles.formRow}>
          <button type="button" className={styles.button} onClick={() => void createSnapshot('manual').then(() => refresh()).then(() => setNotice('快照已创建'))}>
            立即创建快照
          </button>
          <button type="button" className={styles.buttonGhost} onClick={() => void runAutoBackup().then((r) => setNotice(`自动备份：daily=${r.daily} weekly=${r.weekly} 裁剪=${r.pruned}`)).then(refresh)}>
            运行自动备份
          </button>
        </div>
        {snapshots.length > 0 && (
          <div className={styles.list}>
            {snapshots.slice(0, 8).map((s) => (
              <div key={s.snapshotId} className={styles.item}>
                <p className={styles.itemBody} style={{ margin: 0 }}>
                  {s.snapshotId} · {s.status} · {Object.values(s.itemCounts).reduce((a, b) => a + b, 0)} 行
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 导出 */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>📤 导出（全量 / 选定）</h2>
        <div className={styles.formRow}>
          <button type="button" className={styles.button} onClick={() => void handleExport(true)}>导出全量 JSON</button>
          <button type="button" className={styles.buttonGhost} onClick={() => void handleExport(false)}>导出选定表</button>
        </div>
        <div className={styles.itemMeta}>
          {allowedExportTables().map((t) => (
            <label key={t} className={styles.chip} style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedTables.has(t)}
                onChange={() =>
                  setSelectedTables((prev) => {
                    const next = new Set(prev)
                    if (next.has(t)) next.delete(t)
                    else next.add(t)
                    return next
                  })
                }
              />
              {t}
            </label>
          ))}
        </div>
        <p className={styles.subtitle}>vault 与 privateFileMeta 永不进入导出（V9-C-003 铁律）</p>
      </section>

      {/* Flex Study 模式 */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>⚡ Flex Study 排程模式</h2>
        <div className={styles.formRow}>
          <button
            type="button"
            className={styles.buttonGhost}
            onClick={() => void setPlanningMode(planningMode === 'adaptive' ? 'manual' : 'adaptive').then(refresh)}
          >
            当前：{planningMode === 'adaptive' ? 'adaptive（自适应）' : 'manual（手动/V8 排序）'} · 点击切换
          </button>
        </div>
      </section>
    </div>
  )
}
