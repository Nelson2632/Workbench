import { db } from '@/db/database'
import { formatDate } from '@/utils/helpers'
export const METRICS_OPT_IN = 'local-metrics-enabled'
const PREFIX = 'local-metrics-day:'
export type Metric = 'startSelected' | 'captureSaved' | 'completionFeedback' | 'recoveryApplied'
export interface MetricDay { date: string; counts: Partial<Record<Metric, number>> }
/** Opt-in, local counters only: no titles, identifiers, keystrokes or remote requests. */
export async function recordLocalMetric(metric: Metric): Promise<void> {
  if ((await db.settings.get(METRICS_OPT_IN))?.value !== 'true') return
  const date = formatDate(new Date())
  await db.transaction('rw', db.settings, async () => {
    if ((await db.settings.get(METRICS_OPT_IN))?.value !== 'true') return
    const key = PREFIX + date
    const previous = await db.settings.get(key)
    const counts: MetricDay['counts'] = previous ? JSON.parse(previous.value) : {}
    counts[metric] = (counts[metric] ?? 0) + 1
    await db.settings.put({ key, value: JSON.stringify(counts) })
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    await db.settings.where('key').between(PREFIX, PREFIX + formatDate(cutoff), true, false).delete()
  })
}
export function noteLocalMetric(metric: Metric): void {
  void recordLocalMetric(metric).catch(() => { /* Diagnostics must never block user work. */ })
}
export async function readLocalMetrics(): Promise<MetricDay[]> {
  return (await db.settings.where('key').startsWith(PREFIX).toArray()).map(row => ({ date: row.key.slice(PREFIX.length), counts: JSON.parse(row.value) }))
}
export async function clearLocalMetrics(): Promise<void> {
  await db.settings.where('key').startsWith(PREFIX).delete()
}
