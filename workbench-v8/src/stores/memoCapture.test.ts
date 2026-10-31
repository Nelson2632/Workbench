import 'fake-indexeddb/auto'
import { beforeEach, afterEach, expect, it } from 'vitest'
import { db } from '@/db/database'
import { useRecordStore } from './recordStore'
import { faultInjection } from '@/utils/faultInjection'
beforeEach(async () => { await db.delete(); await db.open(); useRecordStore.setState({ memos: [] }) })
afterEach(() => { faultInjection.disable(); faultInjection.clear() })
it('memo retry after an uncertain commit and cache pruning creates one canonical record', async () => {
  faultInjection.enable(); faultInjection.inject('after_domain_commit', () => { throw new Error('uncertain') })
  await expect(useRecordStore.getState().addMemo('中文草稿', 'stable')).rejects.toThrow('uncertain')
  expect(await db.memos.count()).toBe(1)
  faultInjection.clear()
  await useRecordStore.getState().addMemo('中文草稿', 'stable')
  await db.systemCommandIds.clear()
  await Promise.all([useRecordStore.getState().addMemo('中文草稿', 'stable'), useRecordStore.getState().addMemo('中文草稿', 'stable')])
  expect(await db.memos.count()).toBe(1)
  expect(useRecordStore.getState().memos).toHaveLength(1)
})
