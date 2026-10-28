import type { AppEvent } from '@/domain/events/eventBus'
import { projectTimelineEvent } from './timelineProjection'
import { refreshDailyMemory } from './dailyMemory'

/** Direct derived writes: never enqueue a command while its lane is waiting. */
export async function projectTaskCompletion(events: AppEvent[], dates: string[]): Promise<void> {
  for (const event of events) await projectTimelineEvent(event)
  for (const date of new Set(dates.filter(Boolean))) await refreshDailyMemory(date)
}
