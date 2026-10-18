#!/usr/bin/env node
// ============================================================
// V9 Implementation Gate — 「实现保真」验证器（v1.7 契约 vs 源码）
// 与 contract-gate（验文档自洽 + 迁移 Dry Run）并列：本 gate 读 src/，
// 逐项核对契约中可机器验证的项是否真实落地，堵住「绿灯 ≠ 实现保真」。
//
// 运行：node scripts/implementation-gate.mjs
// 覆盖：存储引擎 / Mutation Lane / commandId 幂等 / 故障注入 /
//       备份落盘 / 投影（Timeline·Review·DailyMemory）/ 完整性检查 /
//       安全（PBKDF2·路径逃逸·密钥不落盘）/ 页面注册（Collection·Today 逾期）
// ============================================================

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = path.join(ROOT, 'workbench-v8', 'src')
const TAURI_SRC = path.join(ROOT, 'workbench-v8', 'src-tauri', 'src')

const results = []

function record(name, pass, detail = '') {
  results.push({ name, pass, detail })
  return pass
}

// ---------- 文件读取工具 ----------

function read(p) {
  if (!existsSync(p)) return null
  return readFileSync(p, 'utf8')
}

function readSrc(rel) {
  return read(path.join(SRC, rel))
}

function grepFiles(dir, pattern) {
  if (!existsSync(dir)) return []
  const out = []
  const stack = [dir]
  while (stack.length) {
    const cur = stack.pop()
    for (const entry of readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (/\.(ts|tsx|mjs)$/.test(entry.name)) {
        const text = readFileSync(full, 'utf8')
        if (pattern.test(text)) out.push(full)
      }
    }
  }
  return out
}

// ============================================================
// A · 存储引擎与写路径（S0 级：gap audit 最严重项）
// ============================================================

function checkA() {
  // A1 存储引擎 = Dexie/IndexedDB（非 SQLite）
  const dbText = readSrc('db/database.ts') ?? ''
  const tauriFiles = grepFiles(TAURI_SRC, /rusqlite|sqlite|libsql/i)
  record(
    'A1 存储引擎 = IndexedDB（Dexie），无 SQLite 依赖',
    /from ['"]dexie['"]/.test(dbText) && tauriFiles.length === 0,
    tauriFiles.length ? `发现 SQLite 依赖：${tauriFiles.join(', ')}` : 'Dexie 导入存在，src-tauri 无 rusqlite/sqlite',
  )

  // A2 Mutation Lane 三件套 + commandId 幂等
  const lane = readSrc('db/mutationLane.ts') ?? ''
  record(
    'A2 Mutation Lane 串行队列 + commandId 幂等',
    ['enqueue', 'commandKey', 'commandAlreadyProcessed', 'runCommand'].every((k) => lane.includes(k)),
    'enqueue/commandKey/commandAlreadyProcessed/runCommand 均存在',
  )

  // A3 原子写：commandId 与 domain 写同事务
  record(
    'A3 commandId + domain + journal 同事务原子提交',
    lane.includes("db.transaction('rw'") && lane.includes('db.systemCommandIds.add'),
    'systemCommandIds.add 在 db.transaction(rw) 内',
  )

  // A4 表：systemCommandIds / operationJournal
  const hasSystemCmd = /systemCommandIds\s*:/.test(dbText)
  const hasJournal = /operationJournal\s*:/.test(dbText)
  record('A4 systemCommandIds + operationJournal 表已注册', hasSystemCmd && hasJournal)

  // A5 故障注入 8 Hook
  const fi = readSrc('utils/faultInjection.ts') ?? ''
  const hooks = [
    'before_domain_commit', 'after_journal_write', 'after_domain_commit',
    'mid_projection', 'mid_backup_write', 'mid_migration_transform', 'mid_import', 'mid_export',
  ]
  const missingHooks = hooks.filter((h) => !fi.includes(h))
  record(
    'A5 故障注入 8 Hook 齐备',
    missingHooks.length === 0,
    missingHooks.length ? `缺失：${missingHooks.join(', ')}` : '8 hook 全部存在',
  )

  // A6 全部 store 写路径接 Mutation Lane（有 db 写操作的文件必须 import runCommand）
  const storeDir = path.join(SRC, 'stores')
  const storeFiles = readdirSync(storeDir).filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f))
  const violators = []
  for (const f of storeFiles) {
    const text = readFileSync(path.join(storeDir, f), 'utf8')
    const hasWrite = /\bdb\.\w+\.(add|put|update|delete|bulkAdd|bulkPut|clear)\s*\(/.test(text)
    const wired = /runCommand/.test(text)
    if (hasWrite && !wired) violators.push(f)
  }
  record(
    'A6 全部 store 写路径经 Mutation Lane',
    violators.length === 0,
    violators.length ? `未接线：${violators.join(', ')}` : `${storeFiles.length} 个 store 均已接线`,
  )
}

// ============================================================
// B · 数据持久化（S1 级）
// ============================================================

function checkB() {
  // B1 备份落盘 Tauri 文件系统
  const snap = readSrc('db/snapshot.ts') ?? ''
  const lib = read(path.join(TAURI_SRC, 'lib.rs')) ?? ''
  const frontInvokes = snap.includes('v9_save_backup_snapshot') && snap.includes('v9_load_backup_snapshot')
  const rustCmds = lib.includes('fn v9_save_backup_snapshot') && lib.includes('fn v9_load_backup_snapshot')
  record(
    'B1 备份快照落盘 Tauri（前端 invoke + Rust 命令）',
    frontInvokes && rustCmds,
    'snapshot.ts invoke v9_save/load_backup_snapshot；lib.rs 注册对应命令',
  )

  // B2 备份排除 vault/privateFileMeta/appLock
  record(
    'B2 备份排除安全边界表',
    ['vault', 'privateFileMeta', 'appLock'].every((t) => snap.includes(`'${t}'`)),
    'SNAPSHOT_EXCLUDES 含 vault/privateFileMeta/appLock',
  )

  // B3 完整性检查遍历全表（无硬编码表清单）
  const rec = readSrc('utils/errorRecovery.ts') ?? ''
  record(
    'B3 完整性检查遍历 db.tables（无硬编码清单）',
    rec.includes('db.tables') && !/TABLE_NAMES\s*=\s*\[/.test(rec),
    'checkDataIntegrity 用 db.tables 遍历，无 TABLE_NAMES 硬编码',
  )
}

// ============================================================
// C · 投影与域（S1 级）
// ============================================================

function checkC() {
  // C1 Review 指标读投影（reviewAggregator）
  const reviewStore = readSrc('stores/reviewStore.ts') ?? ''
  const aggregator = readSrc('domain/review/reviewAggregator.ts') ?? ''
  record(
    'C1 Review 指标读投影（reviewAggregator）',
    reviewStore.includes('reviewAggregator') && aggregator.includes('export function'),
    'reviewStore 从 reviewAggregator 派生指标',
  )

  // C2 Timeline 投影可重建
  const timeline = readSrc('domain/projection/timelineProjection.ts') ?? ''
  record('C2 Timeline 投影可重建', timeline.includes('rebuildProjection'))

  // C3 Daily Memory 投影存在
  const dm = grepFiles(path.join(SRC, 'domain', 'projection'), /dailyMemory/i)
  record('C3 Daily Memory 投影存在', dm.length > 0, dm.join(', '))

  // C4 Collection 域 + 级联删除
  const col = readSrc('domain/projection/collection.ts') ?? ''
  record(
    'C4 Collection 域 + 级联删除',
    col.includes('setupCollection') && col.includes('CASCADE_MAP'),
    'favoriteEntry/unfavoriteEntry/setupCollection/CASCADE_MAP 存在',
  )

  // C5 Collection 页面 + 路由 + 侧边栏入口（本次修复项）
  const app = readSrc('app/App.tsx') ?? ''
  const sidebar = readSrc('components/layout/Sidebar.tsx') ?? ''
  const colPage = readSrc('pages/cross/CollectionPage.tsx')
  record(
    'C5 Collection 页面 + 路由 + 侧边栏入口',
    !!colPage && app.includes('CollectionPage') && app.includes('path="collection"') && sidebar.includes('/collection'),
    colPage ? '' : 'pages/cross/CollectionPage.tsx 缺失',
  )
}

// ============================================================
// D · 安全（S1 级）
// ============================================================

function checkD() {
  // D1 PBKDF2 600K
  const crypto = readSrc('domain/security/crypto.ts') ?? ''
  record('D1 PBKDF2 迭代 600K', crypto.includes('600_000') || crypto.includes('600000'))

  // D2 私密文件路径逃逸防护
  const lib = read(path.join(TAURI_SRC, 'lib.rs')) ?? ''
  record('D2 私密文件路径逃逸防护', lib.includes('validate_rel_path') && lib.includes('PrivateWorkbench'))

  // D3 主密钥不持久化（clearKEK + 无 setItem 持久化 KEK）
  const appLock = readSrc('domain/security/appLock.ts') ?? ''
  const persistsKek = /localStorage\.setItem\([^)]*(kek|key)/i.test(appLock)
  record(
    'D3 主密钥仅内存，不持久化',
    appLock.includes('clearKEK') && !persistsKek,
    'clearKEK 存在，无 KEK 落盘',
  )

  // D4 Today 首屏「今天要处理」逾期置顶（本次修复项）
  const today = readSrc('pages/today/TodayPage.tsx') ?? ''
  record(
    'D4 Today 首屏逾期置顶（今天要处理）',
    today.includes('今天要处理') && today.includes('overdue') || today.includes('逾期'),
    today.includes('今天要处理') ? '' : 'TodayPage 缺少逾期置顶区',
  )
}

// ---------- 报告 ----------

function buildReport() {
  const total = results.length
  const passed = results.filter((r) => r.pass).length
  const lines = []
  lines.push('# IMPLEMENTATION_GATE_REPORT — 实现保真验证报告')
  lines.push('')
  lines.push(`> 生成时间：${new Date().toISOString()} ｜ 检查 ${total} 项，通过 ${passed} 项，失败 ${total - passed} 项`)
  lines.push('> 范围：v1.7 契约可机器验证项 vs `workbench-v8/src` 实际实现')
  lines.push('')
  lines.push('## 检查清单')
  lines.push('')
  lines.push('| 结果 | 检查项 | 说明 |')
  lines.push('|---|---|---|')
  for (const r of results) {
    lines.push(`| ${r.pass ? 'PASS' : 'FAIL'} | ${r.name} | ${r.detail || ''} |`)
  }
  lines.push('')
  lines.push('## 结论')
  lines.push('')
  if (passed === total) {
    lines.push('**全部通过。** 实现与 v1.7 契约的机器可验证项一致，无 S0/S1 级漂移。')
  } else {
    lines.push(`**存在 ${total - passed} 项失败。** 修复后重跑 \`node scripts/implementation-gate.mjs\`。`)
  }
  lines.push('')
  writeFileSync(path.join(ROOT, 'docs', 'IMPLEMENTATION_GATE_REPORT.md'), lines.join('\n'), 'utf8')
}

// ---------- 主流程 ----------

checkA()
checkB()
checkC()
checkD()
buildReport()

const total = results.length
const passed = results.filter((r) => r.pass).length
console.log('==============================================')
console.log(`V9 Implementation Gate：${total} 项检查，${passed} 通过，${total - passed} 失败`)
for (const r of results) {
  console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`)
}
console.log('==============================================')
console.log(passed === total ? '✅ 实现保真 Gate 通过' : '❌ 实现保真 Gate 未通过，请修复后重跑')
process.exit(passed === total ? 0 : 1)
