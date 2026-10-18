// ============================================================
// Personal Workbench V8 — 事件订阅装配（跨模块联动）
// ============================================================

import { eventBus } from '@/domain/events/eventBus'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { useStudyStore } from '@/stores/studyStore'
import { setupJournalSink } from '@/db/journal'
import { setupProjection } from '@/domain/projection/timelineProjection'
import { setupDailyMemory } from '@/domain/projection/dailyMemory'
import { setupCollection } from '@/domain/projection/collection'
import { setupV9Notifications } from '@/domain/system/notifications'

let initialized = false

/**
 * 装配核心跨模块事件联动。幂等，仅在启动时调用一次。
 * 其余事件（pomodoro / mistake / exam / review）已在各自 store 内同步状态，
 * 跨页刷新由页面挂载时 load 覆盖，无需额外订阅端。
 */
export function setupEventSubscriptions() {
  if (initialized) return
  initialized = true

  // V9：全部领域事件汇流 Journal（V9-C-001 §4.19）
  setupJournalSink()

  // V9：跨域投影装配（V9-C-002）
  // Timeline Projection / Daily Memory Aggregator / Collection 级联
  setupProjection()
  setupDailyMemory()
  setupCollection()

  // V9：基础通知（关键事件 → Toast，Phase 7）
  setupV9Notifications()

  // 任务完成 → 项目进度联动（若任务归属某项目）
  eventBus.subscribe('task.completed', async (event) => {
    const task = useTaskStore.getState().tasks.find((t) => t.id === event.taskId)
    if (task?.projectId) {
      await useProjectStore.getState().loadProjects()
    }
  })

  // 周期规则生成任务 → 刷新任务列表（今日/未来计划）
  eventBus.subscribe('recurring.generated', async () => {
    await useTaskStore.getState().loadTasks()
  })

  // 闪卡复习 → 若关联知识点，刷新学习数据（掌握度/薄弱点）
  eventBus.subscribe('flashcard.reviewed', async (event) => {
    const card = useFlashcardStore
      .getState()
      .flashcards.find((c) => c.id === event.flashcardId)
    if (card?.knowledgeId) {
      await useStudyStore.getState().loadSubjects()
    }
  })
}
