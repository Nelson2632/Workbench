// ============================================================
// V9 Backup Coverage — exportAllData / importAllData 覆盖范围与往返完整性
// 补丁背景：原 exportAllData 仅覆盖 V8 底座 21 表，V9 数据（含 scores）
// 未被备份；本次改为「全部表 − 排除表」，并对往返做回归。
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './database'

const NOW = '2026-08-30T00:00:00.000Z'

async function seedV9(): Promise<void> {
  await db.scores.add({
    examId: 'e1', subject: '数学', raw: 120, assigned: 88,
    createdAt: NOW, updatedAt: NOW,
  } as never)
  await db.diaries.add({
    date: '2026-08-30', type: 'quick', mood: 'good', weather: 'sunny',
    title: '今天', content: '很好', photos: [], tags: [],
    createdAt: NOW, updatedAt: NOW,
  } as never)
  await db.events.add({
    date: '2026-08-30', type: 'custom', title: '数学周测', note: '', allDay: true,
    location: '', startTime: null, endTime: null, reminder: null, repeat: null,
    sourceType: null, sourceId: null, doneAt: null, createdAt: NOW, updatedAt: NOW,
  } as never)
  await db.materials.add({
    title: '一句名言', category: '名言', tags: ['写作'], fileRefs: ['a.png'],
    note: '出处', sourceDate: null, createdAt: NOW, updatedAt: NOW,
  } as never)
  // 安全边界表：不应出现在普通备份里
  await db.vault.add({ id: 'v1', platform: 't', username: 'u', password: 'SECRET', passwordIv: 'iv', url: '', note: '', lastUsed: '' } as never)
  await db.appLock.put({ id: 'main', kdfParamsVersion: 1, salt: 'AA==', iterations: 1000, verifier: 'BB==', enabled: true, autoLockMinutes: 15, updatedAt: NOW } as never)
  await db.privateFileMeta.add({ name: 's.txt', size: 1, mimeType: null, sha256Plain: 'a'.repeat(64), encPath: 'f.enc', dekIv: 'iv', dekCt: 'ct', fileIv: 'iv', fileTag: 'tg', createdAt: NOW, updatedAt: NOW } as never)
}

describe('V9 Backup Coverage', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('exportAllData 覆盖 V9 用户数据表（含 scores），并排除安全边界表', async () => {
    await seedV9()
    const data = await db.exportAllData()

    // V9 用户数据必须被备份
    expect(data.scores).toHaveLength(1)
    expect(data.scores[0]).toMatchObject({ examId: 'e1', subject: '数学', raw: 120, assigned: 88 })
    expect(data.diaries).toHaveLength(1)
    expect(data.events).toHaveLength(1)
    expect(data.materials).toHaveLength(1)

    // 安全边界表永不进入普通备份
    expect(data.vault).toBeUndefined()
    expect(data.appLock).toBeUndefined()
    expect(data.privateFileMeta).toBeUndefined()
    expect(data.backupSnapshots).toBeUndefined()
    expect(data.operationJournal).toBeUndefined()
  })

  it('往返完整：export → 清空 → import，V9 数据（scores 等）零丢失', async () => {
    await seedV9()
    const data = await db.exportAllData()

    // 破坏现场：删除 scores 与 diaries，模拟「恢复前数据已被改动」
    await db.scores.clear()
    await db.diaries.clear()

    await db.importAllData(data)

    const scores = await db.scores.toArray()
    expect(scores).toHaveLength(1)
    expect(scores[0]).toMatchObject({ examId: 'e1', subject: '数学', raw: 120, assigned: 88 })

    const diaries = await db.diaries.toArray()
    expect(diaries).toHaveLength(1)
    expect(diaries[0].title).toBe('今天')

    const events = await db.events.toArray()
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('数学周测')

    const materials = await db.materials.toArray()
    expect(materials).toHaveLength(1)
    expect(materials[0].fileRefs).toEqual(['a.png'])

    // 安全边界表在导入后仍不受影响（未被 importAllData 清空）
    expect(await db.vault.count()).toBe(1)
    expect(await db.appLock.count()).toBe(1)
  })
})
