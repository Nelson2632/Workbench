import 'fake-indexeddb/auto'
import { beforeEach, afterEach, it, expect } from 'vitest'
import { db } from '@/db/database'
import { useInboxStore } from './inboxStore'
import { faultInjection } from '@/utils/faultInjection'

beforeEach(async () => {
  faultInjection.disable(); faultInjection.clear()
  await db.delete(); await db.open()
  useInboxStore.setState({ items: [] })
})
afterEach(() => { faultInjection.disable(); faultInjection.clear() })

it('capture intent remains idempotent even after command cache pruning', async () => {
  const first = await useInboxStore.getState().addItem('保留输入', 'capture-one')
  await db.pruneSystemCommandIds(-1)
  const replay = await useInboxStore.getState().addItem('保留输入', 'capture-one')
  expect(replay).toBe(first)
  expect(await db.inboxItems.count()).toBe(1)
  expect(useInboxStore.getState().items).toHaveLength(1)
})

it('uncertain capture result recovers the existing item without creating another', async () => {
  faultInjection.enable(); faultInjection.inject('after_domain_commit', () => { throw new Error('crash') })
  await expect(useInboxStore.getState().addItem('保留输入', 'uncertain-capture')).rejects.toThrow('crash')
  faultInjection.clear()
  await useInboxStore.getState().addItem('保留输入', 'uncertain-capture')
  expect(await db.inboxItems.count()).toBe(1)
  expect(useInboxStore.getState().items).toHaveLength(1)
})
