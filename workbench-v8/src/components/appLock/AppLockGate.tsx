// ============================================================
// Personal Workbench V9 — App Lock 锁屏门（V9-C-003 §2）
// 启用 App Lock 且未解锁时拦截整个应用；解锁后放行并启动自动锁
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { eventBus } from '@/domain/events/eventBus'
import {
  unlock,
  isLockEnabled,
  isUnlocked,
  touchActivity,
  startAutoLock,
} from '@/domain/security/appLock'

type Phase = 'checking' | 'locked' | 'open'

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#101418',
    zIndex: 9999,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    width: 320,
    padding: '28px 24px',
    borderRadius: 12,
    background: '#1b222a',
    boxShadow: '0 8px 32px rgba(0,0,0,.45)',
  },
  title: { margin: 0, fontSize: 18, color: '#eef2f6' },
  hint: { margin: 0, fontSize: 13, color: '#93a1af' },
  input: {
    height: 44,
    padding: '0 12px',
    fontSize: 15,
    borderRadius: 8,
    border: '1px solid #39444f',
    background: '#141a20',
    color: '#eef2f6',
  },
  button: {
    height: 44,
    fontSize: 15,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: '#3b82f6',
    color: '#fff',
  },
  error: { margin: 0, fontSize: 13, color: '#f87171' },
}

export default function AppLockGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cooldownLeft, setCooldownLeft] = useState(0)
  const [cooling, setCooling] = useState(false)

  // 启动检查：未启用 → 放行；已启用且未解锁 → 锁屏
  useEffect(() => {
    let disposed = false
    void (async () => {
      const enabled = await isLockEnabled()
      if (disposed) return
      if (!enabled) {
        setPhase('open')
        return
      }
      if (isUnlocked()) {
        startAutoLock()
        setPhase('open')
      } else {
        setPhase('locked')
      }
    })()
    return () => {
      disposed = true
    }
  }, [])

  // 自动锁触发 → 回到锁屏
  useEffect(() => {
    return eventBus.subscribe('appLock.locked', () => {
      setPassword('')
      setPhase('locked')
    })
  }, [])

  // 全局活动上报（重置自动锁计时）
  useEffect(() => {
    const onActivity = () => touchActivity()
    window.addEventListener('pointerdown', onActivity)
    window.addEventListener('keydown', onActivity)
    return () => {
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
    }
  }, [])

  // 冷却倒计时
  useEffect(() => {
    if (!cooling) return
    const t = setInterval(() => {
      setCooldownLeft((v) => {
        const next = Math.max(0, v - 1000)
        if (next <= 0) {
          setCooling(false)
          setError('')
        }
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [cooling])

  const handleUnlock = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError('')
      const res = await unlock(password)
      if (res.ok) {
        setPassword('')
        startAutoLock()
        setPhase('open')
      } else if (res.reason === 'cooldown') {
        const ms = res.remainingMs ?? 0
        setCooldownLeft(ms)
        setCooling(true)
        setError(`尝试次数过多，请 ${Math.ceil(ms / 1000)} 秒后重试`)
      } else {
        setError('密码错误，请重试')
      }
    },
    [password],
  )

  if (phase === 'checking') {
    return <div style={styles.root} aria-busy="true" />
  }
  if (phase === 'open') {
    return <>{children}</>
  }

  return (
    <div style={styles.root} role="dialog" aria-label="应用已锁定">
      <form onSubmit={handleUnlock} style={styles.card}>
        <h1 style={styles.title}>Personal OS 已锁定</h1>
        <p style={styles.hint}>输入主密码解锁（失败 5 次将冷却 60 秒）</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="主密码"
          autoFocus
          aria-label="主密码"
          autoComplete="current-password"
          style={styles.input}
        />
        <button type="submit" style={styles.button} disabled={cooling}>
          {cooling ? `冷却中 ${Math.ceil(cooldownLeft / 1000)}s` : '解锁'}
        </button>
        {error && (
          <p style={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
