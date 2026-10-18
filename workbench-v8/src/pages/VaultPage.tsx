import { useState, useEffect, useCallback, useRef } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/db/database'
import { uid } from '@/utils/helpers'
import type { VaultEntry } from '@/types'
import styles from './VaultPage.module.css'

// ============================================================
// Web Crypto helpers
// ============================================================

function ab2str(buf: ArrayBuffer): string {
  return String.fromCharCode(...new Uint8Array(buf))
}

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i)
  }
  return buf
}

function ab2hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hex2ab(hex: string): ArrayBuffer {
  const buf = new ArrayBuffer(hex.length / 2)
  const view = new Uint8Array(buf)
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return buf
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptData(plaintext: string, password: string, salt: Uint8Array): Promise<{ iv: string; ciphertext: string }> {
  const key = await deriveKey(password, salt)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  return { iv: ab2hex(iv.buffer as ArrayBuffer), ciphertext: ab2hex(ct) }
}

async function decryptData(ciphertext: string, iv: string, password: string, salt: Uint8Array): Promise<string> {
  const key = await deriveKey(password, salt)
  const dec = new TextDecoder()
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: hex2ab(iv) }, key, hex2ab(ciphertext))
  return dec.decode(pt)
}

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const h = await crypto.subtle.digest('SHA-256', enc.encode(password))
  return ab2hex(h)
}

// ============================================================
// Types
// ============================================================

interface VaultForm {
  platform: string
  username: string
  password: string
  url: string
  note: string
}

const emptyForm: VaultForm = {
  platform: '',
  username: '',
  password: '',
  url: '',
  note: '',
}

// ============================================================
// States
// ============================================================

type VaultState = 'noMasterPassword' | 'locked' | 'unlocked'

export default function VaultPage() {
  const { toast } = useToast()

  // ---- Master password state ----
  const [vaultState, setVaultState] = useState<VaultState>('noMasterPassword')
  const [masterPasswordHash, setMasterPasswordHash] = useState<string | null>(null)
  const [masterSalt, setMasterSalt] = useState<Uint8Array | null>(null)
  const [masterPassword, setMasterPassword] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  // ---- Lock screen forms ----
  const [setPass, setSetPass] = useState('')
  const [setPassConfirm, setSetPassConfirm] = useState('')
  const [setPassError, setSetPassError] = useState('')
  const [unlockPass, setUnlockPass] = useState('')
  const [unlockError, setUnlockError] = useState('')

  // ---- Change master password ----
  const [changePassOpen, setChangePassOpen] = useState(false)
  const [changeOldPass, setChangeOldPass] = useState('')
  const [changeNewPass, setChangeNewPass] = useState('')
  const [changeNewConfirm, setChangeNewConfirm] = useState('')
  const [changePassError, setChangePassError] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  // ---- Entries ----
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(false)

  // ---- Modal ----
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<VaultForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  // ---- Reveal states ----
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

  // ---- Vault 迁移（跨平台导入/导出，独立于普通备份）----
  const vaultFileRef = useRef<HTMLInputElement>(null)

  const handleExportVault = useCallback(async () => {
    try {
      const data = await db.exportVaultData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workbench-vault-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('密码本已导出（加密条目 + 主密码校验信息）', 'success')
    } catch {
      toast('导出失败', 'error')
    }
  }, [toast])

  const handleImportVaultClick = useCallback(() => {
    vaultFileRef.current?.click()
  }, [])

  const handleVaultFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const data = JSON.parse(await file.text())
        await db.importVaultData(data)
        toast('密码本导入成功，请用原主密码解锁', 'success')
        window.location.reload()
      } catch {
        toast('导入失败，请检查文件格式', 'error')
      } finally {
        if (vaultFileRef.current) vaultFileRef.current.value = ''
      }
    },
    [toast],
  )

  // ---- Init ----
  useEffect(() => {
    (async () => {
      try {
        const hashEntry = await db.settings.get('vaultMasterHash')
        const saltEntry = await db.settings.get('vaultMasterSalt')
        if (hashEntry?.value && saltEntry?.value) {
          setMasterPasswordHash(hashEntry.value)
          const saltHex = saltEntry.value
          const saltBytes = new Uint8Array(saltHex.length / 2)
          for (let i = 0; i < saltHex.length; i += 2) {
            saltBytes[i / 2] = parseInt(saltHex.substring(i, i + 2), 16)
          }
          setMasterSalt(saltBytes)
          setVaultState('locked')
        } else {
          setVaultState('noMasterPassword')
        }
      } catch {
        setVaultState('noMasterPassword')
      } finally {
        setCheckingAuth(false)
      }
    })()
  }, [])

  // ---- Load entries ----
  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const all = await db.vault.toArray()
      setEntries(all)
    } finally {
      setLoading(false)
    }
  }, [])

  // ---- Set master password ----
  const handleSetMasterPassword = useCallback(async () => {
    setSetPassError('')
    if (setPass.length < 4) {
      setSetPassError('密码至少需要4位')
      return
    }
    if (setPass !== setPassConfirm) {
      setSetPassError('两次密码不一致')
      return
    }
    try {
      const hash = await hashPassword(setPass)
      const salt = crypto.getRandomValues(new Uint8Array(16))
      await db.settings.put({ key: 'vaultMasterHash', value: hash })
      await db.settings.put({ key: 'vaultMasterSalt', value: ab2hex(salt.buffer as ArrayBuffer) })
      setMasterPasswordHash(hash)
      setMasterSalt(salt)
      setMasterPassword(setPass)
      setVaultState('unlocked')
      await loadEntries()
      toast('主密码已设置', 'success')
    } catch {
      toast('设置失败', 'error')
    }
  }, [setPass, setPassConfirm, loadEntries, toast])

  // ---- Unlock ----
  const handleUnlock = useCallback(async () => {
    setUnlockError('')
    try {
      const hash = await hashPassword(unlockPass)
      if (hash !== masterPasswordHash) {
        setUnlockError('密码错误')
        return
      }
      setMasterPassword(unlockPass)
      setVaultState('unlocked')
      await loadEntries()
    } catch {
      setUnlockError('验证失败')
    }
  }, [unlockPass, masterPasswordHash, loadEntries])

  // ---- Lock ----
  const handleLock = useCallback(() => {
    setMasterPassword('')
    setVaultState('locked')
    setEntries([])
    setRevealedIds(new Set())
    setUnlockPass('')
    setUnlockError('')
  }, [])

  // ---- Change master password ----
  const handleChangeMasterPassword = useCallback(async () => {
    setChangePassError('')
    if (!changeOldPass || !changeNewPass || !changeNewConfirm) {
      setChangePassError('请填写所有字段')
      return
    }
    if (changeNewPass.length < 4) {
      setChangePassError('新密码至少需要4位')
      return
    }
    if (changeNewPass !== changeNewConfirm) {
      setChangePassError('两次新密码不一致')
      return
    }
    // Verify old password
    const oldHash = await hashPassword(changeOldPass)
    if (oldHash !== masterPasswordHash) {
      setChangePassError('旧密码错误')
      return
    }
    setChangingPass(true)
    try {
      // Re-encrypt all entries with new password
      const newSalt = crypto.getRandomValues(new Uint8Array(16))
      const allEntries = await db.vault.toArray()

      for (const entry of allEntries) {
        // Decrypt with old password
        const plaintext = await decryptData(entry.password, entry.passwordIv || '', changeOldPass, masterSalt!)
        // Encrypt with new password
        const { iv, ciphertext } = await encryptData(plaintext, changeNewPass, newSalt)
        await db.vault.update(entry.id, { password: ciphertext, passwordIv: iv })
      }

      // Update master password records
      const newHash = await hashPassword(changeNewPass)
      await db.settings.put({ key: 'vaultMasterHash', value: newHash })
      await db.settings.put({ key: 'vaultMasterSalt', value: ab2hex(newSalt.buffer as ArrayBuffer) })
      setMasterPasswordHash(newHash)
      setMasterSalt(newSalt)
      setMasterPassword(changeNewPass)

      setChangePassOpen(false)
      setChangeOldPass('')
      setChangeNewPass('')
      setChangeNewConfirm('')
      setChangePassError('')
      toast('主密码已修改', 'success')
    } catch {
      toast('修改失败', 'error')
    } finally {
      setChangingPass(false)
    }
  }, [changeOldPass, changeNewPass, changeNewConfirm, masterPasswordHash, masterSalt, toast])

  // ---- Add/Edit ----
  const openAdd = useCallback(() => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback(async (entry: VaultEntry) => {
    setEditingId(entry.id)
    try {
      const plaintext = await decryptData(entry.password, entry.passwordIv || '', masterPassword, masterSalt!)
      setForm({
        platform: entry.platform,
        username: entry.username,
        password: plaintext,
        url: entry.url,
        note: entry.note,
      })
    } catch {
      toast('解密失败', 'error')
      return
    }
    setModalOpen(true)
  }, [masterPassword, masterSalt, toast])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingId(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.platform.trim() || !form.password) {
      toast('请填写平台和密码', 'warning')
      return
    }
    setSaving(true)
    try {
      const { iv, ciphertext } = await encryptData(form.password, masterPassword, masterSalt!)

      if (editingId) {
        await db.vault.update(editingId, {
          platform: form.platform.trim(),
          username: form.username.trim(),
          password: ciphertext,
          passwordIv: iv,
          url: form.url.trim(),
          note: form.note.trim(),
          lastUsed: new Date().toISOString(),
        })
        toast('已更新', 'success')
      } else {
        const now = new Date().toISOString()
        await db.vault.add({
          id: uid(),
          platform: form.platform.trim(),
          username: form.username.trim(),
          password: ciphertext,
          passwordIv: iv,
          url: form.url.trim(),
          note: form.note.trim(),
          lastUsed: now,
        })
        toast('已添加', 'success')
      }
      closeModal()
      await loadEntries()
    } catch {
      toast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }, [form, editingId, masterPassword, masterSalt, closeModal, loadEntries, toast])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定要删除这条密码记录吗？')) return
    try {
      await db.vault.delete(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      toast('已删除', 'success')
    } catch {
      toast('删除失败', 'error')
    }
  }, [toast])

  // ---- Copy password ----
  const handleCopyPassword = useCallback(async (entry: VaultEntry) => {
    try {
      const plaintext = await decryptData(entry.password, entry.passwordIv || '', masterPassword, masterSalt!)
      await navigator.clipboard.writeText(plaintext)
      toast('密码已复制到剪贴板', 'success')
      // Update last used
      await db.vault.update(entry.id, { lastUsed: new Date().toISOString() })
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, lastUsed: new Date().toISOString() } : e)),
      )
    } catch {
      toast('复制失败', 'error')
    }
  }, [masterPassword, masterSalt, toast])

  // ---- Toggle reveal ----
  const toggleReveal = useCallback((id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // ---- Revealed password component ----
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({})

  const handleReveal = useCallback(async (entry: VaultEntry) => {
    if (revealedPasswords[entry.id]) {
      setRevealedPasswords((prev) => {
        const next = { ...prev }
        delete next[entry.id]
        return next
      })
      toggleReveal(entry.id)
      return
    }
    try {
      const plaintext = await decryptData(entry.password, entry.passwordIv || '', masterPassword, masterSalt!)
      setRevealedPasswords((prev) => ({ ...prev, [entry.id]: plaintext }))
      toggleReveal(entry.id)
    } catch {
      toast('解密失败', 'error')
    }
  }, [masterPassword, masterSalt, revealedPasswords, toggleReveal, toast])

  // ---- Loading ----
  if (checkingAuth) {
    return (
      <div className={styles.page}>
        <PageHeader title="密码本" description="加密存储账号与密码信息" />
        <EmptyState icon="⏳" title="加载中..." />
      </div>
    )
  }

  // ---- Lock screen: no master password ----
  if (vaultState === 'noMasterPassword') {
    return (
      <div className={styles.page}>
        <PageHeader title="密码本" description="加密存储账号与密码信息" />
        <div className={styles.lockScreen}>
          <div className={styles.lockCard}>
            <div className={styles.lockIcon}>🔐</div>
            <h2 className={styles.lockTitle}>设置主密码</h2>
            <p className={styles.lockDesc}>
              设置主密码以加密保护你的账号密码信息。请牢记此密码，丢失后将无法恢复数据。
            </p>
            <div className={styles.lockForm}>
              <div className={styles.lockField}>
                <Input
                  type="password"
                  value={setPass}
                  onChange={(e) => setSetPass(e.target.value)}
                  placeholder="输入主密码（至少4位）"
                  onKeyDown={(e) => e.key === 'Enter' && handleSetMasterPassword()}
                />
              </div>
              <div className={styles.lockField}>
                <Input
                  type="password"
                  value={setPassConfirm}
                  onChange={(e) => setSetPassConfirm(e.target.value)}
                  placeholder="确认主密码"
                  onKeyDown={(e) => e.key === 'Enter' && handleSetMasterPassword()}
                />
              </div>
              {setPassError && <p className={styles.lockError}>{setPassError}</p>}
              <Button onClick={handleSetMasterPassword} disabled={!setPass || !setPassConfirm}>
                设置主密码
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Lock screen: locked ----
  if (vaultState === 'locked') {
    return (
      <div className={styles.page}>
        <PageHeader title="密码本" description="加密存储账号与密码信息" />
        <div className={styles.lockScreen}>
          <div className={styles.lockCard}>
            <div className={styles.lockIcon}>🔒</div>
            <h2 className={styles.lockTitle}>密码本已锁定</h2>
            <p className={styles.lockDesc}>请输入主密码解锁</p>
            <div className={styles.lockForm}>
              <div className={styles.lockField}>
                <Input
                  type="password"
                  value={unlockPass}
                  onChange={(e) => { setUnlockPass(e.target.value); setUnlockError('') }}
                  placeholder="输入主密码"
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                />
              </div>
              {unlockError && <p className={styles.lockError}>{unlockError}</p>}
              <Button onClick={handleUnlock} disabled={!unlockPass}>
                解锁
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Unlocked view ----
  return (
    <div className={styles.page}>
      <PageHeader
        title="密码本"
        description="加密存储账号与密码信息"
        actions={
          <div className={styles.headerActions}>
            <Button onClick={openAdd}>添加</Button>
            <Button variant="secondary" onClick={handleLock}>锁定</Button>
            <Button variant="ghost" onClick={() => setChangePassOpen(true)}>修改主密码</Button>
            <Button variant="ghost" onClick={handleExportVault} title="导出密码本（跨平台迁移用，含加密条目）">
              导出
            </Button>
            <Button variant="ghost" onClick={handleImportVaultClick} title="从导出的密码本 JSON 导入（需原主密码解锁）">
              导入
            </Button>
          </div>
        }
      />

      <input
        ref={vaultFileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={handleVaultFileChange}
      />

      {loading ? (
        <EmptyState icon="⏳" title="加载中..." />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="🔐"
          title="还没有密码记录"
          description="点击「添加」保存你的第一个密码"
          action={<Button onClick={openAdd}>添加密码</Button>}
        />
      ) : (
        <div className={styles.list}>
          {entries.map((entry) => {
            const isRevealed = revealedIds.has(entry.id)
            const plaintext = revealedPasswords[entry.id]
            const lastUsed = entry.lastUsed ? new Date(entry.lastUsed).toLocaleDateString('zh-CN') : ''

            return (
              <div key={entry.id} className={styles.card}>
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.platform}>{entry.platform || '未命名'}</h3>
                    {entry.username && (
                      <p className={styles.username}>👤 {entry.username}</p>
                    )}
                    <div className={styles.passwordRow}>
                      <span className={styles.passwordLabel}>密码：</span>
                      <code className={styles.passwordValue}>
                        {isRevealed && plaintext ? plaintext : '••••••'}
                      </code>
                      <button
                        className={styles.inlineBtn}
                        onClick={() => handleReveal(entry)}
                        title={isRevealed ? '隐藏密码' : '显示密码'}
                      >
                        {isRevealed ? '🙈' : '👁'}
                      </button>
                      <button
                        className={styles.inlineBtn}
                        onClick={() => handleCopyPassword(entry)}
                        title="复制密码"
                      >
                        📋
                      </button>
                    </div>
                    {entry.url && (
                      <p className={styles.url}>
                        🔗 <a href={entry.url} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>{entry.url}</a>
                      </p>
                    )}
                    {entry.note && (
                      <p className={styles.note}>📝 {entry.note}</p>
                    )}
                    {lastUsed && (
                      <p className={styles.lastUsed}>🕐 上次使用：{lastUsed}</p>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.actionBtn} onClick={() => openEdit(entry)} title="编辑">
                      ✏️
                    </button>
                    <button className={styles.actionBtn} onClick={() => handleDelete(entry.id)} title="删除">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? '编辑密码' : '添加密码'}
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>平台</label>
            <Input
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              placeholder="例如：GitHub、Google"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>用户名</label>
            <Input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="账号或邮箱"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>密码</label>
            <Input
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="密码"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>网址</label>
            <Input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>备注</label>
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="额外说明"
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={closeModal}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Master Password Modal */}
      <Modal
        isOpen={changePassOpen}
        onClose={() => {
          setChangePassOpen(false)
          setChangeOldPass('')
          setChangeNewPass('')
          setChangeNewConfirm('')
          setChangePassError('')
        }}
        title="修改主密码"
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>旧密码</label>
            <Input
              type="password"
              value={changeOldPass}
              onChange={(e) => { setChangeOldPass(e.target.value); setChangePassError('') }}
              placeholder="输入旧密码"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>新密码</label>
            <Input
              type="password"
              value={changeNewPass}
              onChange={(e) => { setChangeNewPass(e.target.value); setChangePassError('') }}
              placeholder="新密码（至少4位）"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>确认新密码</label>
            <Input
              type="password"
              value={changeNewConfirm}
              onChange={(e) => { setChangeNewConfirm(e.target.value); setChangePassError('') }}
              placeholder="再次输入新密码"
            />
          </div>
          {changePassError && <p className={styles.errorText}>{changePassError}</p>}
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => {
              setChangePassOpen(false)
              setChangeOldPass('')
              setChangeNewPass('')
              setChangeNewConfirm('')
              setChangePassError('')
            }}>
              取消
            </Button>
            <Button onClick={handleChangeMasterPassword} disabled={changingPass}>
              {changingPass ? '处理中...' : '确认修改'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}