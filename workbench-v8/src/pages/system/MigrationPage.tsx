// ============================================================
// V9 SYSTEM — MyDiary 迁移页（V9-C-006 + Patch C-006-11/14）
// 导入 Sidecar 产出的 migration_export.json → Dry Run → 真实迁移 → 回滚
// 三段式报告（已迁移/跳过/失败）+ 查看跳过项；Rescue Mode：失败不阻塞
// ============================================================

import { useCallback, useState } from 'react'
import {
  dryRunMigration,
  runMigration,
  rollbackMigration,
  type MigrationExport,
  type MigrationManifest,
} from '@/domain/migration/runner'
import styles from '@/pages/life/life.module.css'

export default function MigrationPage() {
  const [exp, setExp] = useState<MigrationExport | null>(null)
  const [manifest, setManifest] = useState<MigrationManifest | null>(null)
  const [lastRunId, setLastRunId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showIssues, setShowIssues] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setError('')
    setNotice('')
    setManifest(null)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as MigrationExport
      if (!parsed.counts || !parsed.rows) throw new Error('不是合法的 migration_export.json')
      setExp(parsed)
      setNotice(`已读取：${parsed.source?.app ?? 'MyDiary'} v${parsed.source?.version ?? '?'}，${Object.keys(parsed.rows).length} 类数据`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setExp(null)
    }
  }, [])

  const handleDryRun = useCallback(async () => {
    if (!exp) return
    setManifest(null)
    const m = await dryRunMigration(exp)
    setManifest(m)
    if (m.verified) setNotice('Dry Run 全绿：计数与 checksum 校验通过，零写入')
    else setError(m.note)
  }, [exp])

  const handleRun = useCallback(async () => {
    if (!exp) return
    setError('')
    if (!window.confirm('执行真实迁移？将先创建 safety snapshot，可随时回滚。')) return
    try {
      const { runId, targetCount, skippedCount } = await runMigration(exp)
      setLastRunId(runId)
      setNotice(`迁移完成：已导入 ${targetCount} 行，跳过 ${skippedCount} 行；旧 MyDiary 保持只读归档`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [exp])

  const handleRollback = useCallback(async () => {
    if (!lastRunId) return
    if (!window.confirm(`回滚迁移 ${lastRunId}？将删除其导入行并恢复 safety snapshot。`)) return
    try {
      await rollbackMigration(lastRunId)
      setNotice('回滚完成：导入行已删除，数据恢复到迁移前 safety snapshot')
      setLastRunId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [lastRunId])

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>🔄 MyDiary 数据迁移</h1>
      </header>
      <p className={styles.subtitle}>
        流程：先用 Python Sidecar 对旧 MyDiary 生成 migration_export.json（Sidecar 只读，不影响旧数据），
        在此导入 → Dry Run（零写入）→ 真实迁移 → 可回滚。
      </p>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>1. 导入导出文件</h2>
        <input
          type="file"
          accept=".json,application/json"
          aria-label="选择 migration_export.json"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
          }}
        />
        <p className={styles.subtitle}>Sidecar 路径：migration_sidecar/sidecar.py extract --input … --output migration_export.json</p>
      </section>

      {exp && (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>2. 三段式预览（Patch C-006-14）</h2>
            <div className={styles.itemMeta}>
              <span className={styles.chip}>已迁移：{exp.counts.targetCount}</span>
              <span className={styles.chip}>跳过：{exp.counts.skippedCount}</span>
              <span className={styles.chip}>失败：{exp.counts.failedCount}</span>
              <span className={styles.chip}>源总数：{exp.counts.sourceCount}</span>
              {exp.checksum && <span className={styles.chip}>checksum：{exp.checksum.slice(0, 20)}…</span>}
            </div>
            <button type="button" className={styles.buttonGhost} onClick={() => setShowIssues((v) => !v)}>
              {showIssues ? '收起跳过项' : '查看跳过项'}（{(exp.issues ?? []).length}）
            </button>
            {showIssues && (
              <div className={styles.list}>
                {(exp.issues ?? []).map((i, idx) => (
                  <div key={idx} className={styles.item}>
                    <p className={styles.itemBody} style={{ margin: 0 }}>
                      [{i.disposition}] {i.file} · {i.legacyId}：{i.reason}
                    </p>
                  </div>
                ))}
                {(exp.issues ?? []).length === 0 && <p className={styles.empty}>没有跳过/失败项</p>}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>3. 执行</h2>
            <div className={styles.formRow}>
              <button type="button" className={styles.button} onClick={() => void handleDryRun()}>Dry Run（零写入）</button>
              <button type="button" className={styles.button} onClick={() => void handleRun()} disabled={!manifest?.verified}>
                执行真实迁移
              </button>
              {lastRunId && (
                <button type="button" className={styles.buttonDanger} onClick={() => void handleRollback()}>
                  回滚本次迁移
                </button>
              )}
            </div>
            {manifest && (
              <p className={styles.subtitle} role="status">
                {manifest.note}
              </p>
            )}
          </section>
        </>
      )}

      {notice && <p className={styles.subtitle} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Rescue Mode（Patch C-006-11）</h2>
        <p className={styles.subtitle}>
          迁移失败 ≠ 启动失败：V9 无迁移数据照常运行；旧 MyDiary 源目录只读保留，可随时以新的 run 重新发起迁移。
        </p>
      </section>
    </div>
  )
}
