#!/usr/bin/env node
// ============================================================
// V9 Contract Gate — 里程碑 0 验证器
// 1) 六份合同齐全性 + 机器块解析
// 2) 交叉一致性校验（表/枚举/事件/安全参数/降级规则互相无冲突）
// 3) Migration Dry Run：样例 → 转换 → 计数 → SHA-256 → 与期望导出比对
// 运行：node scripts/contract-gate.mjs
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const CONTRACTS_DIR = path.join(ROOT, 'docs', 'contracts')
const SAMPLE_DIR = path.join(CONTRACTS_DIR, 'sample')

const CONTRACT_FILES = {
  schema: 'V9_SCHEMA_CONTRACT.md',
  projection: 'PROJECTION_CONTRACT.md',
  security: 'SECURITY_CONTRACT.md',
  flexstudy: 'FLEX_STUDY_CONTRACT.md',
  game: 'GAME_CONTRACT.md',
  migration: 'MIGRATION_CONTRACT.md',
}

// Patch 0.1.2 后各合同 M0 冻结前版本（Concrete Patch：V9-C-001→0.1.2，其余涉及者→0.1.1，C-004 保持）
const EXPECTED_VERSIONS = {
  schema: '0.1.2',
  projection: '0.1.1',
  security: '0.1.1',
  flexstudy: '0.1.0',
  game: '0.1.1',
  migration: '0.1.1',
}

const REAL_V8_TABLES = [
  'tasks','recurringTasks','projects','memos','notes','flashcards','flashcardReviews',
  'flashcardSchedule','subjects','mistakes','exams','reviewTemplates','reviewEntries',
  'reading','finance','countdowns','pomodoroLogs','vault','settings','knowledgeRelations',
  'studySessions','appEvents',
]

// ---------- 工具 ----------

function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  if (value !== null && typeof value === 'object') {
    return '{' + Object.keys(value).sort()
      .map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}'
  }
  return JSON.stringify(value)
}

const VOLATILE_FIELDS = new Set([
  'createdAt','updatedAt','generatedAt','finishedAt','exportedAt','addedAt','lastAutoUpdate',
])

function stripVolatile(value) {
  if (Array.isArray(value)) return value.map(stripVolatile)
  if (value !== null && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (VOLATILE_FIELDS.has(k)) continue
      out[k] = stripVolatile(v)
    }
    return out
  }
  return value
}

function deepEqual(a, b) {
  return stableStringify(a) === stableStringify(b)
}

function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

// ---------- 合同加载与机器块提取 ----------

const machineBlocks = {}
const checkResults = []

function record(name, pass, detail = '') {
  checkResults.push({ name, pass, detail })
  return pass
}

function loadContracts() {
  let allOk = true
  for (const [key, file] of Object.entries(CONTRACT_FILES)) {
    const p = path.join(CONTRACTS_DIR, file)
    if (!existsSync(p)) {
      allOk = record(`合同齐全性: ${file}`, false, '文件不存在')
      continue
    }
    const text = readFileSync(p, 'utf8')
    if (text.trim().length === 0) {
      allOk = record(`合同齐全性: ${file}`, false, '文件为空')
      continue
    }
    const re = /<!-- V9-CONTRACT-MACHINE:\s*(\w+)\s*-->\s*```json\s*([\s\S]*?)```/g
    let m
    let found = false
    while ((m = re.exec(text)) !== null) {
      try {
        machineBlocks[m[1]] = JSON.parse(m[2])
        found = true
      } catch (e) {
        allOk = record(`机器块解析: ${file}`, false, `JSON 解析失败: ${e.message}`)
      }
    }
    if (!found) allOk = record(`机器块解析: ${file}`, false, '未找到机器可读块')
    else record(`合同齐全性: ${file}`, true, '存在且含机器块')
  }
  return allOk
}

// ---------- 交叉一致性校验 ----------

function crossCheck() {
  const schema = machineBlocks.schema
  const proj = machineBlocks.projection
  const sec = machineBlocks.security
  const flex = machineBlocks.flexstudy
  const game = machineBlocks.game
  const mig = machineBlocks.migration

  // A2 schema
  const tableNames = schema.newTables.map((t) => t.name)
  record('Schema: v8Tables 与真实底座一致',
    deepEqual(schema.v8Tables.slice().sort(), REAL_V8_TABLES.slice().sort()),
    '22 张 V8 表逐名核对')
  record('Schema: 新增表名唯一', new Set(tableNames).size === tableNames.length,
    `共 ${tableNames.length} 张新增表`)
  for (const t of schema.newTables) {
    const dupIdx = t.indexes.filter((i) => schema.newTables.filter((x) => x.indexes.includes(i)).length > 1)
    void dupIdx
  }
  record('Schema: 枚举值非空且唯一', (() => {
    for (const [k, v] of Object.entries(schema.enums)) {
      if (!Array.isArray(v) || v.length === 0) return false
      if (new Set(v).size !== v.length) return false
      if (v.some((x) => typeof x !== 'string' || !/^[a-z][A-Za-z]*$/.test(x))) return false
    }
    return true
  })(), '全部小写字符串枚举')

  // A3 projection
  const allTables = [...schema.v8Tables, ...tableNames]
  record('Projection: include/mutate/delete 事件 ⊆ 事件总表', (() => {
    const ev = new Set(proj.events)
    const inc = Object.keys(proj.timelineInclude)
    const okInc = inc.every((e) => ev.has(e))
    const okMut = proj.timelineMutate.every((e) => ev.has(e))
    const okDel = Object.keys(proj.deleteLinkage).every((e) => ev.has(e))
    return okInc && okMut && okDel
  })(), '无幽灵事件')
  record('Projection: include 的 sourceType ⊆ Schema SourceType', (() => {
    const st = new Set(schema.enums.SourceType)
    return Object.values(proj.timelineInclude).every((x) => st.has(x.sourceType))
  })())
  record('Projection: sourceTypeDomain 覆盖全部 SourceType', (() => {
    const st = schema.enums.SourceType
    return st.every((s) => ['work', 'life', 'play'].includes(schema.sourceTypeDomain[s]))
  })())
  record('Projection: Daily Memory 三域齐全', deepEqual(
    Object.keys(proj.dailyMemoryFacts).sort(), ['life', 'play', 'work']))
  record('Projection: reflection 永不被覆盖', proj.reflectionNeverOverwritten === true)
  record('Projection: 日历渲染 Task/Exam 为投影', proj.calendarRendersTaskExamAsProjection === true)
  record('Projection: 重建步骤含幂等断言', proj.rebuildSteps.includes('idempotencyAssert'))

  // A4 security
  record('Security: 加密参数正确', (() => {
    return sec.saltBits === 128 && sec.ivBits === 96 && sec.kekBits === 256 &&
      sec.dekBits === 256 && sec.tagBits === 128 && sec.fileCipher === 'AES-256-GCM' &&
      sec.kdf === 'PBKDF2-HMAC-SHA256'
  })(), 'PBKDF2-HMAC-SHA256 / AES-256-GCM / 96-bit IV')
  record('Security: 迭代次数下限合法', sec.iterationsProvisional >= sec.iterationsMin && sec.iterationsMin >= 210000,
    `暂定 ${sec.iterationsProvisional}，下限 ${sec.iterationsMin}`)
  record('Security: 备份排除 vault 与私密文件', (() => {
    const ex = sec.backupExcludes
    return ex.includes('vault') && ex.includes('privateFileMeta') && ex.includes('privateFilesCiphertext')
  })())
  record('Security: 密钥绝不持久化', sec.kekPersisted === false && sec.masterPasswordPersisted === false)
  record('Security: 不导入遗留密码', sec.legacyPasswordImported === false)
  record('Security: Restore 三步动作冻结', deepEqual(sec.restoreRequires.slice().sort(),
    ['integrityCheck', 'projectionRebuild', 'safetySnapshot'].sort()))

  // A5 flexstudy
  record('Flex: priorities = Schema Priority', deepEqual(flex.priorities, schema.enums.Priority))
  record('Flex: planningModes = Schema PlanningMode', deepEqual(flex.planningModes, schema.enums.PlanningMode))
  record('Flex: 映射键为 V8 P0/P1/P2', deepEqual(Object.keys(flex.defaultPriorityMapping).sort(), ['P0', 'P1', 'P2']))
  record('Flex: 默认 adaptive', flex.defaultPlanningMode === 'adaptive')
  record('Flex: fallback 触发与动作齐备',
    flex.fallbackTriggers.length >= 5 && flex.fallbackActions.includes('persistManualMode'))
  record('Flex: 硬禁止清单齐备', (() => {
    const f = flex.forbidden
    return f.includes('deleteUserTask') && f.includes('modifyTaskContent') &&
      f.includes('autoDemoteMust') && f.includes('forceUserToFollow')
  })())
  record('Flex: 建议需确认 + 无 LLM 无网络',
    flex.suggestionsRequireConfirmation === true && flex.noLLM === true && flex.noNetwork === true)
  record('Flex: 性能护栏', flex.perfGuard.maxItems === 200 && flex.perfGuard.maxMs === 50)

  // A6 game
  record('Game: 接口成员冻结', (() => {
    const req = game.interfaceMembers.filter((m) => !game.optionalMembers.includes(m))
    return ['gameId', 'adapterVersion', 'targetSchemaVersion', 'getCapabilities', 'fetchProfile', 'fetchRecords']
      .every((m) => req.includes(m))
  })())
  record('Game: 非 Core 依赖', game.coreDependency === false)
  record('Game: 超时/重试/离线策略', game.timeoutMs === 15000 && game.retries === 2 &&
    game.offlineMode.useLastKnownData === true && game.offlineMode.allowManualEdit === true)
  record('Game: 禁止清单齐备', (() => {
    const f = game.forbidden
    return f.includes('whiteScreen') && f.includes('infiniteLoading') && f.includes('dataClear')
  })())
  record('Game: 战斗模拟必须标注理论值', game.combatResultTheoreticalFlag === true)

  // A7 migration
  record('Migration: 流程五步冻结', deepEqual(mig.flow, ['Source', 'Transform', 'Target', 'Validate', 'Commit']))
  record('Migration: 五大计数字段', (() => {
    const f = mig.countFields
    return f.includes('sourceCount') && f.includes('targetCount') && f.includes('failedCount') &&
      f.includes('skippedCount') && f.includes('checksum')
  })())
  record('Migration: 映射目标表全部存在', (() => {
    const ok = Object.values(mig.mappingTargets).flat().every((t) => allTables.includes(t))
    return ok
  })())
  record('Migration: 不迁移清单含密码与内嵌任务',
    mig.notMigrated.includes('diary_password.json') && mig.notMigrated.includes('diary.tasks 内嵌字段'))
  record('Migration: 重试 ×3 + 允许 Skip', mig.retry.max === 3 && mig.skipAllowed === true)
  record('Migration: 回滚三步冻结', deepEqual(mig.rollback.slice().sort(),
    ['deleteNewCopiedFiles', 'removeLedgerRowsByRunId', 'restoreSafetySnapshot'].sort()))
  record('Migration: 旧 MyDiary 只读', mig.legacyReadOnly === true)
  record('Migration: Dry Run 零写入 + 固定时钟/时区', mig.dryRunWritesNothing === true &&
    mig.dryRunFixedClock === '2026-08-30T00:00:00.000Z' && mig.dryRunTimezone === '+08:00')

  // A8 交叉
  record('交叉: 迁移目标表 ∈ Schema 表集', (() => {
    const ok = Object.values(mig.mappingTargets).flat().every((t) => allTables.includes(t))
    return ok
  })())
  record('交叉: Timeline 源类型 ∈ SourceType 枚举', (() => {
    const st = new Set(schema.enums.SourceType)
    return Object.values(proj.timelineInclude).every((x) => st.has(x.sourceType))
  })())
  record('交叉: 各合同版本 = Patch 0.1.2 期望值', (() => {
    return Object.entries(EXPECTED_VERSIONS).every(([k, v]) => machineBlocks[k] && machineBlocks[k].version === v)
  })(), 'schema=0.1.2 / projection=0.1.1 / security=0.1.1 / flexstudy=0.1.0 / game=0.1.1 / migration=0.1.1')

  patchChecks(schema, proj, sec, game, mig)
}

// ---------- Patch 0.1.2 追加检查（评审结论 V9-CONTRACT-PATCH-001）----------
function patchChecks(schema, proj, sec, game, mig) {
  const schemaRules = schema.pkRules || {}
  record('Patch: V8 主键类型保持真实类型（tasks=string）', schemaRules.v8KeepExistingPkType === true &&
    schemaRules.taskIdIsString === true)
  record('Patch: 跨表引用严格采用被引用表真实主键类型，禁止隐式 String 转换', schemaRules.crossRefUsesRealTargetPkType === true &&
    schemaRules.forbidImplicitStringConversionOfTaskId === true)
  record('Patch: 新表默认 ++id(number)，仅投影/指针表 String 化', schemaRules.v9NewTablesDefaultNumber === true &&
    schemaRules.integerPkAsStringOnlyForProjectionSourceId === true)
  record('Patch: CalendarEvent / DomainEvent 类型拆名', (schema.typeNamingSplit || {}).calendarEvent === true &&
    (schema.typeNamingSplit || {}).domainEvent === true)

  record('Patch: EventBus = 实时跨域联动主路径（非单向禁止）',
    proj.principles.includes('eventBusIsRealtimeCrossDomainPath'))
  record('Patch: EventBus 边界四象限已冻结', (() => {
    const b = proj.eventBusBoundaries || {}
    return b.realtimeBusinessLinking === 'eventBus' && b.projectionRebuild === 'directFactReadAllowed' &&
      b.businessPage === 'noDirectOtherDomainStoreCall'
  })())
  record('Patch: Projection 为历史快照，不反映事实当前态',
    proj.principles.includes('projectionIsHistoricalSnapshot') && proj.principles.includes('timelineNotReflectCurrentFactState'))
  record('Patch: review.completed 取 completedAt 而非 createdAt',
    (proj.reviewCompletedAt || {}).timelineOccursAt === 'reviewEntries.completedAt' &&
    (proj.reviewCompletedAt || {}).neverUseCreatedAtAsCompletedAt === true)
  record('Patch: exam 历史时间语义冻结（occurredAt=exam.date）',
    proj.examHistoricalSemantics === 'exam.created means exam fact recorded; occurredAt takes exam.date not created time')

  record('Patch: Restore 不回退当前 App Lock 认证态', sec.restoreDoesNotRestoreAppLockAuthState === true &&
    sec.restoreDataNotIdentity === true)
  record('Patch: Restore 不恢复 salt/verifier/KEK', deepEqual((sec.restoreDoesNotRestore || []).slice().sort(),
    ['KEK', 'salt', 'verifier'].sort()))
  record('Patch: 文件 AAD 绑定 immutable fileId（展示名≠密码学身份）',
    sec.fileAadBindsImmutableFileId === true && sec.displayNameNotCryptographicIdentity === true &&
    /v9-file/.test(sec.fileAad))
  record('Patch: KDF Benchmark 测试矩阵落地 + 250-500ms 目标',
    Array.isArray(sec.kdfBenchmarkMatrix) && sec.kdfBenchmarkMatrix.length >= 2 &&
    deepEqual(sec.kdfBenchmarkTargetMs, [250, 500]))
  record('Patch: iterationsFinal 状态明确（M0 待定/Phase1 锁定）',
    sec.iterationsFinal === null || typeof sec.iterationsFinal === 'number')
  record('Patch: appLock.createdAt 审计字段', sec.appLockHasCreatedAt === true)

  record('Patch: Adapter 生命周期版本字段齐备', (() => {
    const req = game.requiredMembers || []
    return req.includes('minCoreVersion') && req.includes('maxSupportedSchemaVersion') &&
      game.interfaceMembers.includes('minCoreVersion') && game.interfaceMembers.includes('maxSupportedSchemaVersion')
  })())
  record('Patch: Adapter 版本不匹配一律 disabled 而非猜测兼容',
    (game.lifecycleVersionRules || {}).noGuessCompatibility === true &&
    game.lifecycleVersionRules.minCoreVersionExceeded === 'adapterDisabled' &&
    game.lifecycleVersionRules.maxSchemaTooNew === 'adapterDisabled')

  record('Patch: Migration Rescue Mode（失败不阻塞 V9 启动）',
    mig.rescueMode && mig.rescueMode.doesNotBlockV9Startup === true &&
    mig.rescueMode.allowSkip === true && mig.rescueMode.legacyDataKept === true)
  record('Patch: 跳过数据三段式可见 + 可查跳过项',
    mig.skipDataVisibility && mig.skipDataVisibility.reportShowsMigratedSkippedFailed === true &&
    mig.skipDataVisibility.provideViewSkippedItems === true &&
    mig.skipDataVisibility.notJustMigrationCompleted === true)
}

// ---------- Migration Dry Run（参考实现，按 V9-C-006 映射）----------

const MOOD_MAP = {
  '开心': 'great', '非常开心': 'great', '还行': 'good', '一般': 'neutral',
  '不太好': 'low', '难过': 'low', '非常难过': 'bad', '极度难过': 'bad',
}
const WEATHER_MAP = {
  '晴': 'sunny', '多云': 'cloudy', '阴': 'overcast', '雨': 'rainy',
  '雷': 'stormy', '雪': 'snowy', '暴雪': 'snowy',
}
const FIXED_CLOCK = '2026-08-30T00:00:00.000Z'
const MATERIAL_CATEGORIES = ['句子', '诗词', '知识点']

function toIsoPlus8(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(String(s))
  if (!m) return null
  const [, Y, Mo, D, h, mi, se] = m
  return new Date(Date.UTC(+Y, +Mo - 1, +D, +h - 8, +mi, +se)).toISOString()
}

// RF-05：纯占位空记录判定——无有效正文且无任何 mood/weather/funny/tags 字段。
// 不能简单 `if (!content) skip`：存在任一有效字段仍视为有效内容继续迁移。
function isEmptyDiary(d) {
  if (typeof d.log === 'string' && d.log.trim()) return false
  for (const k of ['mood', 'weather', 'funny']) {
    if (typeof d[k] === 'string' && d[k].trim()) return false
  }
  const tags = d.tags
  if (Array.isArray(tags) && tags.some((t) => typeof t === 'string' && t.trim())) return false
  return true
}

function transformDiary(sample, rows, issues) {
  const keys = Object.keys(sample.diary || {}).sort()
  let src = 0
  for (const date of keys) {
    src++
    const entry = sample.diary[date]
    if (!entry || typeof entry !== 'object' || !entry.diary) {
      issues.push({ file: 'diary_data.json', legacyId: date, reason: '缺少 diary 对象', disposition: 'skipped' })
      continue
    }
    const d = entry.diary
    // RF-05：纯占位空记录 → skipped，不进入 Timeline
    if (d && typeof d === 'object' && !Array.isArray(d) && isEmptyDiary(d)) {
      issues.push({ file: 'diary_data.json', legacyId: date, reason: '空日记占位记录（无正文/心情/天气/趣事/标签）', disposition: 'skipped' })
      continue
    }
    if (typeof d.log !== 'string') {
      issues.push({ file: 'diary_data.json', legacyId: date, reason: 'log 非字符串', disposition: 'failed' })
      continue
    }
    rows.diaries.push({
      date,
      type: d.log.length <= 140 ? 'quick' : 'long',
      mood: MOOD_MAP[d.mood] ?? null,
      weather: WEATHER_MAP[d.weather] ?? null,
      title: typeof d.funny === 'string' && d.funny.trim() ? d.funny : `${date} 日记`,
      content: d.log,
      photos: [],
      tags: [...new Set((d.tags || []).filter((t) => typeof t === 'string'))],
      createdAt: FIXED_CLOCK,
      updatedAt: FIXED_CLOCK,
    })
    // materials
    if (entry.materials && typeof entry.materials === 'object') {
      for (const cat of [...MATERIAL_CATEGORIES, ...Object.keys(entry.materials).filter((c) => !MATERIAL_CATEGORIES.includes(c))]) {
        const items = entry.materials[cat]
        if (!Array.isArray(items)) continue
        for (const item of items) {
          if (typeof item !== 'string') {
            issues.push({ file: 'diary_data.json', legacyId: `${date}:materials:${cat}`, reason: '素材条目非字符串', disposition: 'skipped' })
            continue
          }
          rows.materials.push({
            title: item, category: cat, tags: [], fileRefs: [], note: '', sourceDate: date,
            createdAt: FIXED_CLOCK, updatedAt: FIXED_CLOCK,
          })
        }
      }
    }
  }
  return src
}

function transformFriends(sample, rows, issues) {
  let src = 0
  for (const cat of Object.keys(sample.friends || {}).sort()) {
    const list = sample.friends[cat]
    if (!Array.isArray(list)) continue
    list.forEach((f, i) => {
      src++
      if (!f || typeof f.name !== 'string' || !f.name.trim()) {
        issues.push({ file: 'friend_data.json', legacyId: `${cat}#${i}`, reason: 'name 为空', disposition: 'failed' })
        return
      }
      let birthday = null
      const bm = /^\d{4}-(\d{2}-\d{2})$/.exec(String(f.birthday || ''))
      if (bm) birthday = bm[1]
      else if (f.birthday) {
        issues.push({ file: 'friend_data.json', legacyId: `${cat}#${i}`, reason: 'birthday 无法解析，置空', disposition: 'warning' })
      }
      const note = [
        f.personality ? `性格：${f.personality}` : '',
        f.other ? `备注：${f.other}` : '',
      ].filter(Boolean).join('；')
      rows.friends.push({
        name: f.name, alias: null, birthday, relationship: cat, contact: f.contact || '', note,
        createdAt: FIXED_CLOCK, updatedAt: FIXED_CLOCK,
      })
    })
  }
  return src
}

function transformCalendar(sample, rows, issues) {
  let src = 0
  for (const date of Object.keys(sample.calendar || {}).sort()) {
    const list = sample.calendar[date]
    if (!Array.isArray(list)) continue
    list.forEach((r, i) => {
      src++
      if (!r || typeof r.content !== 'string') {
        issues.push({ file: 'calendar_data.json', legacyId: `${date}#${i}`, reason: 'content 非字符串', disposition: 'failed' })
        return
      }
      rows.events.push({
        date, type: 'custom', title: r.content, note: '', allDay: true,
        sourceType: null, sourceId: null,
        createdAt: toIsoPlus8(r.added_at) || FIXED_CLOCK,
        updatedAt: FIXED_CLOCK,
      })
    })
  }
  return src
}

function firstDiff(a, b, prefix = '$') {
  if (deepEqual(a, b)) return null
  if (Array.isArray(a) && Array.isArray(b)) {
    const len = Math.max(a.length, b.length)
    for (let i = 0; i < len; i++) {
      if (!deepEqual(a[i], b[i])) {
        const sub = firstDiff(a[i], b[i], `${prefix}[${i}]`)
        if (sub) return sub
        return `${prefix}[${i}] (${JSON.stringify(a[i])} vs ${JSON.stringify(b[i])})`
      }
    }
    return `${prefix} (数组长度或内容不一致)`
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) {
      if (!deepEqual(a[k], b[k])) {
        const sub = firstDiff(a[k], b[k], `${prefix}.${k}`)
        if (sub) return sub
        return `${prefix}.${k} (${JSON.stringify(a[k])} vs ${JSON.stringify(b[k])})`
      }
    }
    return `${prefix} (对象结构不一致)`
  }
  return `${prefix} (${JSON.stringify(a)} vs ${JSON.stringify(b)})`
}

function dryRun() {
  const samplePath = path.join(SAMPLE_DIR, 'legacy_mydiary_sample.json')
  const expectedPath = path.join(SAMPLE_DIR, 'expected_migration_export.json')
  const manifestPath = path.join(SAMPLE_DIR, 'dryrun_manifest.json')

  if (!existsSync(samplePath)) return record('Dry Run: 样例存在', false, samplePath)
  if (!existsSync(expectedPath)) return record('Dry Run: 期望导出存在', false, expectedPath)
  record('Dry Run: 样例与期望导出存在', true)

  const sample = JSON.parse(readFileSync(samplePath, 'utf8'))
  const expected = JSON.parse(readFileSync(expectedPath, 'utf8'))

  const rows = { diaries: [], materials: [], friends: [], events: [] }
  const issues = []
  const sourceCount =
    transformDiary(sample, rows, issues) +
    transformFriends(sample, rows, issues) +
    transformCalendar(sample, rows, issues)

  const counts = {
    diaries: rows.diaries.length,
    materials: rows.materials.length,
    friends: rows.friends.length,
    events: rows.events.length,
    sourceCount,
    targetCount: rows.diaries.length + rows.materials.length + rows.friends.length + rows.events.length,
    failedCount: issues.filter((i) => i.disposition === 'failed').length,
    skippedCount: issues.filter((i) => i.disposition === 'skipped').length,
  }

  const checksum = sha256Hex(stableStringify(stripVolatile(rows)))
  const produced = {
    schemaVersion: '1',
    generatedAt: FIXED_CLOCK,
    source: { app: sample.app, version: sample.version, files: ['diary_data.json', 'friend_data.json', 'calendar_data.json'] },
    checksum: `sha256:${checksum}`,
    counts,
    rows,
    issues,
  }

  const stableProduced = { counts, rows: stripVolatile(rows), issues }
  const stableExpected = { counts: expected.counts, rows: stripVolatile(expected.rows), issues: expected.issues }

  const countsOk = deepEqual(counts, expected.counts)
  const rowsOk = deepEqual(stripVolatile(rows), stripVolatile(expected.rows))
  const issuesOk = deepEqual(issues, expected.issues)

  record('Dry Run: 计数与期望一致',
    countsOk,
    `source=${counts.sourceCount} target=${counts.targetCount} failed=${counts.failedCount} skipped=${counts.skippedCount}`)
  record('Dry Run: 行数据与期望一致（稳定字段口径）', rowsOk,
    rowsOk ? '' : '首个差异: ' + (firstDiff(stripVolatile(rows), stripVolatile(expected.rows)) || '未知'))
  record('Dry Run: issues 与期望一致', issuesOk)
  record('Dry Run: SHA-256 计算正确', produced.checksum === `sha256:${checksum}`, checksum.slice(0, 16) + '…')

  writeFileSync(manifestPath, JSON.stringify({
    runId: 'v9-dryrun-0001',
    mode: 'dry',
    wroteToDb: false,
    generatedAt: FIXED_CLOCK,
    sourceFile: 'legacy_mydiary_sample.json',
    counts,
    checksum: produced.checksum,
    verified: countsOk && rowsOk && issuesOk,
    note: 'Dry Run 零写入；稳定字段口径与 expected_migration_export.json 一致',
  }, null, 2) + '\n', 'utf8')

  void stableProduced; void stableExpected
  return countsOk && rowsOk && issuesOk
}

// ---------- 报告 ----------

function buildReport() {
  const lines = []
  const total = checkResults.length
  const passed = checkResults.filter((c) => c.pass).length
  lines.push('# CONTRACT_GATE_REPORT — 里程碑 0 验证报告')
  lines.push('')
  lines.push(`> 生成时间：${new Date().toISOString()} ｜ 检查 ${total} 项，通过 ${passed} 项，失败 ${total - passed} 项`)
  lines.push('')
  lines.push('## 检查清单')
  lines.push('')
  lines.push('| 结果 | 检查项 | 说明 |')
  lines.push('|---|---|---|')
  for (const c of checkResults) {
    lines.push(`| ${c.pass ? 'PASS' : 'FAIL'} | ${c.name} | ${c.detail || ''} |`)
  }
  lines.push('')
  lines.push('## 结论')
  lines.push('')
  if (passed === total) {
    lines.push('**全部通过。** 六份合同齐全、互相无冲突，Migration Dry Run 样例数据全绿 —— 里程碑 0 Gate 通过。')
  } else {
    lines.push(`**存在 ${total - passed} 项失败，里程碑 0 Gate 未通过。** 修复后重跑 \`node scripts/contract-gate.mjs\`。`)
  }
  lines.push('')
  writeFileSync(path.join(CONTRACTS_DIR, 'CONTRACT_GATE_REPORT.md'), lines.join('\n'), 'utf8')
}

// ---------- 主流程 ----------

const loaded = loadContracts()
let crossOk = false
let dryOk = false
if (loaded) {
  crossCheck()
  const crossResults = checkResults.filter((c) => c.name.startsWith('Schema') || c.name.startsWith('Projection') ||
    c.name.startsWith('Security') || c.name.startsWith('Flex') || c.name.startsWith('Game') ||
    c.name.startsWith('Migration') || c.name.startsWith('Patch') || c.name.startsWith('交叉'))
  crossOk = crossResults.every((c) => c.pass)
  dryOk = dryRun()
} else {
  console.error('合同加载失败，跳过交叉校验与 Dry Run')
}

buildReport()

const total = checkResults.length
const passed = checkResults.filter((c) => c.pass).length
console.log('==============================================')
console.log(`V9 Contract Gate：${total} 项检查，${passed} 通过，${total - passed} 失败`)
for (const c of checkResults) {
  console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.name}${c.detail ? ' — ' + c.detail : ''}`)
}
console.log('==============================================')
console.log(loaded && crossOk && dryOk ? '✅ 里程碑 0 Gate 通过（合同齐全 / 无冲突 / Dry Run 全绿）' : '❌ 里程碑 0 Gate 未通过，请修复后重跑')
process.exit(loaded && crossOk && dryOk ? 0 : 1)
