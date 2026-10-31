import { isDesktop } from './index'

/** CI opt-in only. Reports actual WebView rendering/IPC/storage, never a timer-only pass. */
export async function prepareNativeSmoke(): Promise<(() => Promise<void>) | undefined> {
  if (!isDesktop()) return
  const { invoke } = await import('@tauri-apps/api/core')
  if (!await invoke<boolean>('desktop_smoke_enabled')) return
  const errors: string[] = []
  window.addEventListener('error', event => errors.push(event.message))
  window.addEventListener('unhandledrejection', event => errors.push(String(event.reason)))
  window.addEventListener('securitypolicyviolation', event => errors.push(`CSP: ${event.violatedDirective}`))
  return async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const label = getCurrentWindow().label
    const checks: Record<string, unknown> = { label, userAgent: navigator.userAgent }
    try {
      const selector = label === 'main' ? 'main h1, main h2' : label === 'quick-memo' ? 'textarea, input' : 'button'
      const deadline = Date.now() + 45000
      while (!document.querySelector(selector)) {
        if (Date.now() > deadline) throw new Error(`React content did not mount: ${label}`)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      checks.rendered = true
      checks.textLength = document.body.innerText.trim().length
      if (!checks.textLength) throw new Error('empty rendered content')
      if (label === 'main') {
        const shortcutWarnings = await invoke<string[]>('desktop_shortcut_warnings')
        checks.shortcutWarnings = shortcutWarnings
        if (shortcutWarnings.length) {
          const warningDeadline = Date.now() + 5000
          while (!shortcutWarnings.every(key => document.body.innerText.includes(key))) {
            if (Date.now() > warningDeadline) throw new Error('shortcut conflict not shown to user')
            await new Promise(resolve => setTimeout(resolve, 50))
          }
          checks.shortcutWarningVisible = true
        }
        const { db, WorkbenchDB } = await import('@/db/database')
        if (!db.isOpen()) throw new Error('active database did not initialize')
        const { portableBackup } = await import('@/db/fixtures/portableBackup')
        const { verifyAndParseBackup } = await import('@/db/backup')
        // Separate disposable database: never clear/restore the user's active database.
        const sample = new WorkbenchDB(`WorkbenchNativeSmoke-${crypto.randomUUID()}`)
        try {
          await sample.open()
          const now = '2026-10-30T01:02:03.000Z'
          await sample.importAllData(verifyAndParseBackup(portableBackup))
          await sample.settings.put({ key: 'vaultMasterHash', value: 'local-only' })
          const data = JSON.parse(JSON.stringify(await sample.exportAllData()))
          if (data.settings.some((s: { key: string }) => s.key === 'vaultMasterHash')) throw new Error('vault setting escaped ordinary backup')
          await sample.tasks.clear()
          await sample.importAllData(data)
          if ((await sample.tasks.get('unicode'))?.title !== '中文任务🍵') throw new Error('backup roundtrip failed')
          if ((await sample.settings.get('vaultMasterHash'))?.value !== 'local-only') throw new Error('restore changed local vault settings')
          if (await sample.tasks.where('completedAt').equals(now).count() !== 1) throw new Error('migration/index query failed')
          checks.indexedDB = true; checks.backupRoundtrip = true; checks.vaultBoundary = true
          checks.schemaVersion = sample.verno
          const persistent = new WorkbenchDB('WorkbenchNativeSmokePersistence-v1')
          try {
            await persistent.open()
            const marker = await persistent.settings.get('unicode')
            checks.persistedFromPreviousLaunch = !!marker
            if (marker && marker.value !== '跨平台🍵') throw new Error('WebView persistence changed')
            if (!marker) await persistent.settings.put({ key: 'unicode', value: '跨平台🍵' })
          } finally { persistent.close() }
        } finally { await sample.delete() }
      }
    } catch (error) { errors.push(String(error)) }
    await invoke('desktop_smoke_report', { report: { ok: errors.length === 0, checks, errors } })
  }
}
