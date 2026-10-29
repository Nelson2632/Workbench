import 'fake-indexeddb/auto'
import { beforeEach, expect, it } from 'vitest'
import { db } from '@/db/database'
import { recordLocalMetric, readLocalMetrics, clearLocalMetrics, METRICS_OPT_IN } from './localMetrics'
beforeEach(async () => { await db.delete(); await db.open() })
it('defaults off, explicit opt-in counts atomically and stores no identifiers', async () => {
  await recordLocalMetric('captureSaved'); expect(await readLocalMetrics()).toEqual([])
  await db.settings.put({ key: METRICS_OPT_IN, value: 'true' })
  await Promise.all([recordLocalMetric('captureSaved'), recordLocalMetric('captureSaved')])
  const days = await readLocalMetrics()
  expect(days[0].counts).toEqual({ captureSaved: 2 })
  expect(Object.keys(days[0])).toEqual(['date', 'counts'])
  await db.settings.put({ key: METRICS_OPT_IN, value: 'false' })
  await recordLocalMetric('completionFeedback'); expect((await readLocalMetrics())[0].counts).toEqual({ captureSaved: 2 })
  await clearLocalMetrics(); expect(await readLocalMetrics()).toEqual([])
})
