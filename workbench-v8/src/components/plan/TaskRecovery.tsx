import { useEffect, useRef, useState } from 'react'
import { db } from '@/db/database'
import { useTaskStore } from '@/stores/taskStore'
import { applyRecovery, getRecoveryReceipt, isActiveTask, previewRecovery, RECOVERY_LATEST, undoRecovery } from '@/domain/planning/taskRecovery'
import type { RecoveryAction, RecoveryPreview, RecoveryReceipt } from '@/domain/planning/taskRecovery'
import { formatDate } from '@/utils/helpers'
import styles from '@/pages/life/life.module.css'
const labels: Record<RecoveryAction, string> = { reschedule: '延期', stash: '暂存', abandon: '放弃', restore: '恢复为待办', split: '拆成小步骤' }
export default function TaskRecovery() {
  const tasks = useTaskStore(s => s.tasks)
  const load = useTaskStore(s => s.loadTasks)
  const [selected, setSelected] = useState<string[]>([])
  const [date, setDate] = useState(formatDate(new Date()))
  const [titles, setTitles] = useState('')
  const [preview, setPreview] = useState<RecoveryPreview>()
  const [receipt, setReceipt] = useState<RecoveryReceipt>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  useEffect(() => { void db.settings.get(RECOVERY_LATEST).then(async r => {
    if (r) setReceipt(await getRecoveryReceipt(r.value))
  }).catch(() => setError('调整记录暂时无法读取')) }, [])
  const prepare = (action: RecoveryAction) => {
    setError('')
    try { setPreview(previewRecovery(tasks.filter(t => selected.includes(t.id)), action, { date, titles: titles.split('\n') })) }
    catch (e) { setError((e as Error).message) }
  }
  const run = async (undo = false) => {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try {
      if (undo && receipt) { await undoRecovery(receipt.commandId); setReceipt(await getRecoveryReceipt(receipt.commandId)) }
      else if (preview) { setReceipt(await applyRecovery(preview)); setPreview(undefined); setSelected([]); setTitles('') }
      await load()
    } catch (e) { setError((e as Error).message) }
    finally { pending.current = false; setBusy(false) }
  }
  return <section className={styles.card} aria-label="重新安排" id="recover">
    <h2 className={styles.cardTitle}>重新安排</h2>
    <p className={styles.subtitle}>计划可以调整。暂存和放弃保留记录，随时可以恢复。</p>
    <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
      <legend>选择任务</legend>
      <div className={styles.list}>{tasks.filter(t => !t.done).map(t => <label key={t.id} className={styles.item}>
        <input type="checkbox" checked={selected.includes(t.id)} onChange={e => { setPreview(undefined); setSelected(ids => e.target.checked ? [...ids, t.id] : ids.filter(id => id !== t.id)) }} />
        {' '}{t.title} · {t.dueDate || '无日期'} · {isActiveTask(t) ? '待办' : t.disposition === 'stashed' ? '已暂存' : '已放弃'}
      </label>)}</div>
      <label>新的计划日期 <input type="date" value={date} onChange={e => { setDate(e.target.value); setPreview(undefined) }} /></label>
      <label style={{ display: 'block' }}>小步骤（每行一个，拆分时选择一个原任务）
        <textarea className={styles.textarea} value={titles} onChange={e => { setTitles(e.target.value); setPreview(undefined) }} />
      </label>
      <div className={styles.formRow}>{(Object.keys(labels) as RecoveryAction[]).map(action => <button className={styles.buttonGhost} type="button" key={action} disabled={!selected.length} onClick={() => prepare(action)}>预览{labels[action]}</button>)}</div>
      {preview && <div role="region" aria-label="调整预览">
        <h3>{labels[preview.action]} · {preview.before.length} 项</h3>
        <ul>{preview.before.map((t, i) => <li key={t.id}>{t.title}：{t.dueDate || '无日期'} / {t.disposition || 'active'} → {preview.after[i].dueDate || '无日期'} / {preview.after[i].disposition || 'active'}</li>)}</ul>
        {!!preview.children.length && <p>原任务暂存；新增：{preview.children.map(t => t.title).join('、')}</p>}
        <button className={styles.button} type="button" onClick={() => void run()}>确认调整</button>
        <button className={styles.buttonGhost} type="button" onClick={() => setPreview(undefined)}>取消预览</button>
      </div>}
      {receipt && <p role="status">{receipt.undone ? '已撤销调整' : `已调整 ${receipt.before.length} 项`}{!receipt.undone && <button className={styles.buttonGhost} type="button" onClick={() => void run(true)}>撤销上次调整</button>}</p>}
    </fieldset>
    {busy && <p role="status">保存中…</p>}
    {error && <p role="alert">{error}。可重试，或取消预览后重新选择。</p>}
  </section>
}
