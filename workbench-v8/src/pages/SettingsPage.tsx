import { useState, useCallback, useRef, useEffect } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useSystemStore } from '@/stores/systemStore'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/db/database'
import { autoBackup, exportBackupJson, verifyAndParseBackup } from '@/db/backup'
import { formatDate } from '@/utils/helpers'
import { isDesktop, modKeyLabel } from '@/desktop'
import {
  loadNotificationSettings,
  NOTIFICATION_SETTINGS_KEY,
  type NotificationSettings,
} from '@/hooks/useDesktopNotifications'
import styles from './SettingsPage.module.css'

function formatKeys(keys: string): string[] {
  return keys.split('+').map((k) => {
    const t = k.trim()
    // 存储值保持规范 'Ctrl'（解析层 Ctrl/Cmd 等价），显示层在 macOS 上换成 ⌘
    return t.toLowerCase() === 'ctrl' ? modKeyLabel() : t
  })
}

interface ImportPreview {
  tasks: number
  recurringTasks: number
  projects: number
  memos: number
  notes: number
  flashcards: number
  flashcardReviews: number
  subjects: number
  mistakes: number
  exams: number
  reviews: number
  reviewTemplates: number
  reading: number
  finance: number
  countdowns: number
  pomodoroLogs: number
  vault: number
  settings: number
}

const emptyPreview: ImportPreview = {
  tasks: 0, recurringTasks: 0, projects: 0, memos: 0, notes: 0,
  flashcards: 0, flashcardReviews: 0, subjects: 0, mistakes: 0,
  exams: 0, reviews: 0, reviewTemplates: 0, reading: 0,
  finance: 0, countdowns: 0, pomodoroLogs: 0, vault: 0, settings: 0,
}

export default function SettingsPage() {
  const theme = useSystemStore((s) => s.theme)
  const setTheme = useSystemStore((s) => s.setTheme)
  const shortcuts = useSystemStore((s) => s.shortcuts)
  const setShortcuts = useSystemStore((s) => s.setShortcuts)
  const resetShortcuts = useSystemStore((s) => s.resetShortcuts)
  const { toast } = useToast()

  const [recordingId, setRecordingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recordingRef = useRef<string | null>(null)

  // ---- Backup state ----
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null)
  const [backupCount, setBackupCount] = useState(0)
  const [backingUp, setBackingUp] = useState(false)

  // ---- Import state ----
  const [importData, setImportData] = useState<Record<string, any[]> | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview>(emptyPreview)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  // ---- Clear state ----
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [clearStep, setClearStep] = useState<'confirm' | 'final'>('confirm')
  const [clearing, setClearing] = useState(false)

  // ---- Desktop notification settings ----
  const [notif, setNotif] = useState<NotificationSettings>(() => loadNotificationSettings())

  const updateNotif = useCallback((updates: Partial<NotificationSettings>) => {
    setNotif((prev) => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(next))
      } catch { /* ignore quota errors */ }
      return next
    })
  }, [])

  // ---- Load backup info ----
  useEffect(() => {
    (async () => {
      try {
        const entry = await db.settings.get('lastBackupTime')
        if (entry?.value) {
          setLastBackupTime(entry.value)
        }
      } catch { /* ignore */ }
    })()
  }, [])

  // ---- Shortcut recording ----
  const handleStartRecording = useCallback((id: string) => {
    setRecordingId(id)
    recordingRef.current = null
  }, [])

  const handleKeyDownCapture = useCallback(
    (e: React.KeyboardEvent) => {
      if (recordingId) {
        e.preventDefault()
        e.stopPropagation()

        const parts: string[] = []
        if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
        if (e.shiftKey) parts.push('Shift')
        if (e.altKey) parts.push('Alt')

        if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') {
          return
        }

        const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
        if (parts.length === 0 && key === 'Escape') {
          setRecordingId(null)
          return
        }
        parts.push(key)
        recordingRef.current = parts.join('+')

        setShortcuts(
          shortcuts.map((s) =>
            s.id === recordingId ? { ...s, keys: recordingRef.current! } : s,
          ),
        )
        setRecordingId(null)
        toast('快捷键已更新', 'success')
      }
    },
    [recordingId, shortcuts, setShortcuts, toast],
  )

  // ---- Export ----
  const handleExport = useCallback(async (_excludeVault = false) => {
    try {
      const json = await exportBackupJson()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = formatDate(new Date())
      a.href = url
      a.download = `workbench-v8-${dateStr}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('数据导出成功（不含密码本）', 'success')
    } catch {
      toast('导出失败', 'error')
    }
  }, [toast])

  // ---- Import ----
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = verifyAndParseBackup(text)

        // Build preview
        const preview: ImportPreview = {
          tasks: Array.isArray(data.tasks) ? data.tasks.length : 0,
          recurringTasks: Array.isArray(data.recurringTasks) ? data.recurringTasks.length : 0,
          projects: Array.isArray(data.projects) ? data.projects.length : 0,
          memos: Array.isArray(data.memos) ? data.memos.length : 0,
          notes: Array.isArray(data.notes) ? data.notes.length : 0,
          flashcards: Array.isArray(data.flashcards) ? data.flashcards.length : 0,
          flashcardReviews: Array.isArray(data.flashcardReviews) ? data.flashcardReviews.length : 0,
          subjects: Array.isArray(data.subjects) ? data.subjects.length : 0,
          mistakes: Array.isArray(data.mistakes) ? data.mistakes.length : 0,
          exams: Array.isArray(data.exams) ? data.exams.length : 0,
          reviews: Array.isArray(data.reviewEntries) ? data.reviewEntries.length : 0,
          reviewTemplates: Array.isArray(data.reviewTemplates) ? data.reviewTemplates.length : 0,
          reading: Array.isArray(data.reading) ? data.reading.length : 0,
          finance: Array.isArray(data.finance) ? data.finance.length : 0,
          countdowns: Array.isArray(data.countdowns) ? data.countdowns.length : 0,
          pomodoroLogs: Array.isArray(data.pomodoroLogs) ? data.pomodoroLogs.length : 0,
          vault: Array.isArray(data.vault) ? data.vault.length : 0,
          settings: Array.isArray(data.settings) ? data.settings.length : 0,
        }

        setImportData(data)
        setImportPreview(preview)
        setImportModalOpen(true)
      } catch {
        toast('文件解析失败，请检查文件格式', 'error')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [toast],
  )

  const handleConfirmImport = useCallback(async () => {
    if (!importData) return
    setImporting(true)
    try {
      await db.importAllData(importData)
      setImportModalOpen(false)
      setImportData(null)
      setImportPreview(emptyPreview)
      toast('数据导入成功', 'success')
      window.location.reload()
    } catch {
      toast('导入失败', 'error')
    } finally {
      setImporting(false)
    }
  }, [importData, toast])

  // ---- Backup ----
  const handleBackupNow = useCallback(async () => {
    setBackingUp(true)
    try {
      const result = await autoBackup()
      if (result.backedUp) {
        setLastBackupTime(new Date().toISOString())
        setBackupCount((c) => c + 1)
        toast('备份完成', 'success')
      } else {
        toast(result.reason || '备份失败', 'warning')
      }
    } catch {
      toast('备份失败', 'error')
    } finally {
      setBackingUp(false)
    }
  }, [toast])

  // ---- Clear ----
  const handleClearClick = useCallback(() => {
    setClearStep('confirm')
    setClearModalOpen(true)
  }, [])

  const handleClearConfirm = useCallback(async (exportFirst: boolean) => {
    if (clearStep === 'confirm') {
      if (exportFirst) {
        await handleExport()
      }
      setClearStep('final')
      return
    }
    // Final confirmation
    setClearing(true)
    try {
      await db.delete()
      await db.open()
      setClearModalOpen(false)
      setClearStep('confirm')
      toast('所有数据已清除', 'success')
      window.location.reload()
    } catch {
      toast('清除失败', 'error')
    } finally {
      setClearing(false)
    }
  }, [clearStep, handleExport, toast])

  const totalImportCount = Object.values(importPreview).reduce((a, b) => a + b, 0)

  return (
    <div className={styles.page} onKeyDown={handleKeyDownCapture}>
      <PageHeader title="设置" description="应用配置与个性化设置" />

      {/* Theme */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>外观</h2>
          <p className={styles.sectionDesc}>选择你喜欢的主题模式</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.themeRow}>
            <span className={styles.themeLabel}>主题模式</span>
            <div className={styles.themeToggle}>
              <button
                className={`${styles.themeOption} ${theme === 'mist' ? styles.themeOptionActive : ''}`}
                onClick={() => setTheme('mist')}
              >
                ☀️ 晨雾书房
              </button>
              <button
                className={`${styles.themeOption} ${theme === 'fluent' ? styles.themeOptionActive : ''}`}
                onClick={() => setTheme('fluent')}
              >
                🪟 Windows
              </button>
              <button
                className={`${styles.themeOption} ${theme === 'night' ? styles.themeOptionActive : ''}`}
                onClick={() => setTheme('night')}
              >
                🌙 深色夜航
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Notifications (only in the desktop shell) */}
      {isDesktop() && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>桌面提醒</h2>
            <p className={styles.sectionDesc}>系统通知（仅在桌面应用中生效）</p>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.themeRow}>
              <span className={styles.themeLabel}>收尾提醒（可选）</span>
              <div className={styles.themeToggle}>
                <input
                  type="time"
                  className={styles.timeInput}
                  value={notif.reviewReminderTime}
                  disabled={!notif.reviewReminderEnabled}
                  onChange={(e) => updateNotif({ reviewReminderTime: e.target.value })}
                />
                <button
                  className={`${styles.themeOption} ${notif.reviewReminderEnabled ? styles.themeOptionActive : ''}`}
                  onClick={() => updateNotif({ reviewReminderEnabled: !notif.reviewReminderEnabled })}
                >
                  {notif.reviewReminderEnabled ? '开启' : '关闭'}
                </button>
              </div>
            </div>
            <div className={styles.themeRow}>
              <span className={styles.themeLabel}>周期计划提醒（每天）</span>
              <div className={styles.themeToggle}>
                <input
                  type="time"
                  className={styles.timeInput}
                  value={notif.recurringReminderTime}
                  disabled={!notif.recurringReminderEnabled}
                  onChange={(e) => updateNotif({ recurringReminderTime: e.target.value })}
                />
                <button
                  className={`${styles.themeOption} ${notif.recurringReminderEnabled ? styles.themeOptionActive : ''}`}
                  onClick={() => updateNotif({ recurringReminderEnabled: !notif.recurringReminderEnabled })}
                >
                  {notif.recurringReminderEnabled ? '开启' : '关闭'}
                </button>
              </div>
            </div>
            <div className={styles.themeRow}>
              <span className={styles.themeLabel}>倒数日提醒（提前 30/14/7/3/1/0 天）</span>
              <div className={styles.themeToggle}>
                <button
                  className={`${styles.themeOption} ${notif.countdownReminderEnabled ? styles.themeOptionActive : ''}`}
                  onClick={() => updateNotif({ countdownReminderEnabled: !notif.countdownReminderEnabled })}
                >
                  {notif.countdownReminderEnabled ? '开启' : '关闭'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>快捷键</h2>
          <p className={styles.sectionDesc}>点击快捷键组合可重新绑定</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.shortcutList}>
            {shortcuts.map((sc) => {
              const isRecording = recordingId === sc.id
              return (
                <div key={sc.id} className={styles.shortcutRow}>
                  <span className={styles.shortcutLabel}>{sc.label}</span>
                  <div className={styles.shortcutKeys}>
                    {formatKeys(sc.keys).map((key, i) => (
                      <span
                        key={i}
                        className={`${styles.keyChip} ${isRecording ? styles.keyChipRecording : ''}`}
                        onClick={() => handleStartRecording(sc.id)}
                        title="点击修改快捷键"
                      >
                        {key}
                      </span>
                    ))}
                    {isRecording && (
                      <span className={styles.recordingHint}>按下新快捷键...</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <button className={styles.resetBtn} onClick={resetShortcuts}>
            恢复默认快捷键
          </button>
        </div>
      </div>

      {/* Data Export */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>导出数据</h2>
          <p className={styles.sectionDesc}>将数据导出为 JSON 文件备份</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.dataActions}>
            <Button onClick={() => handleExport(false)}>📥 导出全部数据</Button>
            <Button variant="secondary" onClick={() => handleExport(true)}>
              📥 导出（不含密码本）
            </Button>
          </div>
        </div>
      </div>

      {/* Data Import */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>导入数据</h2>
          <p className={styles.sectionDesc}>从 JSON 文件导入数据（将覆盖现有数据）</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.dataActions}>
            <Button variant="secondary" onClick={handleImportClick}>
              📤 选择文件导入
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
          <p className={styles.warningText}>
            ⚠️ 导入将覆盖现有数据，建议先导出备份
          </p>
        </div>
      </div>

      {/* Auto-backup */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>自动备份</h2>
          <p className={styles.sectionDesc}>备份数据到本地文件</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.backupInfo}>
            <div className={styles.backupRow}>
              <span className={styles.backupLabel}>上次备份时间</span>
              <span className={styles.backupValue}>
                {lastBackupTime
                  ? new Date(lastBackupTime).toLocaleString('zh-CN')
                  : '从未备份'}
              </span>
            </div>
            <div className={styles.backupRow}>
              <span className={styles.backupLabel}>本次会话备份次数</span>
              <span className={styles.backupValue}>{backupCount}</span>
            </div>
          </div>
          <div className={styles.dataActions}>
            <Button onClick={handleBackupNow} disabled={backingUp}>
              {backingUp ? '备份中...' : '💾 立即备份'}
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className={`${styles.section} ${styles.dangerZone}`}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>危险区域</h2>
          <p className={styles.sectionDesc}>以下操作不可恢复，请谨慎操作</p>
        </div>
        <div className={styles.sectionBody}>
          <Button variant="danger" onClick={handleClearClick}>
            🗑 清除所有数据
          </Button>
        </div>
      </div>

      {/* About */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>关于</h2>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.aboutContent}>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>应用名称</span>
              <span className={styles.aboutValue}>个人工作台</span>
            </div>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>版本</span>
              <span className={styles.aboutValue}>V8.0</span>
            </div>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>技术栈</span>
              <span className={styles.aboutValue}>React + TypeScript + Dexie</span>
            </div>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>数据存储</span>
              <span className={styles.aboutValue}>IndexedDB（本地浏览器）</span>
            </div>
          </div>
        </div>
      </div>

      {/* Import Preview Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false)
          setImportData(null)
          setImportPreview(emptyPreview)
        }}
        title="导入预览"
      >
        <div className={styles.importPreview}>
          <p className={styles.importSummary}>
            共检测到 <strong>{totalImportCount}</strong> 条数据，将覆盖现有数据。
          </p>
          <div className={styles.importGrid}>
            {importPreview.tasks > 0 && (
              <span className={styles.importChip}>📋 任务 {importPreview.tasks}</span>
            )}
            {importPreview.recurringTasks > 0 && (
              <span className={styles.importChip}>🔄 周期任务 {importPreview.recurringTasks}</span>
            )}
            {importPreview.projects > 0 && (
              <span className={styles.importChip}>📁 项目 {importPreview.projects}</span>
            )}
            {importPreview.memos > 0 && (
              <span className={styles.importChip}>📝 备忘 {importPreview.memos}</span>
            )}
            {importPreview.notes > 0 && (
              <span className={styles.importChip}>📄 笔记 {importPreview.notes}</span>
            )}
            {importPreview.flashcards > 0 && (
              <span className={styles.importChip}>🃏 闪卡 {importPreview.flashcards}</span>
            )}
            {importPreview.flashcardReviews > 0 && (
              <span className={styles.importChip}>📊 闪卡复习 {importPreview.flashcardReviews}</span>
            )}
            {importPreview.subjects > 0 && (
              <span className={styles.importChip}>📚 学科 {importPreview.subjects}</span>
            )}
            {importPreview.mistakes > 0 && (
              <span className={styles.importChip}>❌ 错题 {importPreview.mistakes}</span>
            )}
            {importPreview.exams > 0 && (
              <span className={styles.importChip}>📝 考试 {importPreview.exams}</span>
            )}
            {importPreview.reviews > 0 && (
              <span className={styles.importChip}>📋 复盘 {importPreview.reviews}</span>
            )}
            {importPreview.reviewTemplates > 0 && (
              <span className={styles.importChip}>📐 模板 {importPreview.reviewTemplates}</span>
            )}
            {importPreview.reading > 0 && (
              <span className={styles.importChip}>📖 阅读 {importPreview.reading}</span>
            )}
            {importPreview.finance > 0 && (
              <span className={styles.importChip}>💰 财务 {importPreview.finance}</span>
            )}
            {importPreview.countdowns > 0 && (
              <span className={styles.importChip}>📅 倒数日 {importPreview.countdowns}</span>
            )}
            {importPreview.pomodoroLogs > 0 && (
              <span className={styles.importChip}>🍅 番茄 {importPreview.pomodoroLogs}</span>
            )}
            {importPreview.vault > 0 && (
              <span className={styles.importChip}>🔐 密码本 {importPreview.vault}</span>
            )}
            {importPreview.settings > 0 && (
              <span className={styles.importChip}>⚙ 设置 {importPreview.settings}</span>
            )}
          </div>
          <p className={styles.warningText}>
            ⚠️ 导入将覆盖现有数据，建议先导出备份
          </p>
          <div className={styles.formActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setImportModalOpen(false)
                setImportData(null)
                setImportPreview(emptyPreview)
              }}
            >
              取消
            </Button>
            <Button variant="danger" onClick={handleConfirmImport} disabled={importing}>
              {importing ? '导入中...' : '确认导入'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Data Confirmation Modal */}
      <Modal
        isOpen={clearModalOpen}
        onClose={() => {
          setClearModalOpen(false)
          setClearStep('confirm')
        }}
        title="清除所有数据"
      >
        <div className={styles.clearConfirm}>
          {clearStep === 'confirm' ? (
            <>
              <p className={styles.clearWarning}>
                ⚠️ 此操作将永久删除所有数据，无法恢复！
              </p>
              <p className={styles.clearHint}>建议在清除前先导出备份。</p>
              <div className={styles.formActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setClearModalOpen(false)
                    setClearStep('confirm')
                  }}
                >
                  取消
                </Button>
                <Button variant="secondary" onClick={() => handleClearConfirm(true)}>
                  导出并继续
                </Button>
                <Button variant="danger" onClick={() => handleClearConfirm(false)}>
                  直接清除
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.clearWarning}>
                ⚠️ 最终确认：所有数据将被永久删除，此操作不可撤销！
              </p>
              <div className={styles.formActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setClearModalOpen(false)
                    setClearStep('confirm')
                  }}
                >
                  取消
                </Button>
                <Button variant="danger" onClick={() => handleClearConfirm(false)} disabled={clearing}>
                  {clearing ? '清除中...' : '确认清除所有数据'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}