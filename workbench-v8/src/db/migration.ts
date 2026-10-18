// ============================================================
// Personal Workbench V8 — V5 to V8 Migration
// ============================================================

import { db } from './database'
import { uid } from '../utils/helpers'

export async function migrateFromV5(): Promise<{
  success: boolean
  migrated: boolean
  error?: string
}> {
  try {
    // Check if already migrated
    const migratedSetting = await db.settings.get('migrated')
    if (migratedSetting?.value === true) {
      return { success: true, migrated: false }
    }

    // Read V5 data from localStorage
    const raw = localStorage.getItem('workbench-v5')
    if (!raw) {
      // No V5 data to migrate, mark as migrated anyway
      await db.settings.put({ key: 'migrated', value: true })
      return { success: true, migrated: false }
    }

    const v5 = JSON.parse(raw)

    await db.transaction('rw', db.tables, async () => {
      // Migrate todos -> tasks
      if (Array.isArray(v5.todo)) {
        const tasks = v5.todo.map((t: any) => ({
          id: t.id || uid(),
          title: t.title || t.text || '',
          priority: t.priority || 'P2',
          done: t.done ?? t.completed ?? false,
          note: t.note || '',
          projectId: t.projectId || '',
          dueDate: t.dueDate || t.due || '',
          pinned: t.pinned ?? false,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
          sourceRecurringId: t.sourceRecurringId,
        }))
        await db.tasks.bulkAdd(tasks)
      }

      // Migrate notes -> notes
      if (Array.isArray(v5.note)) {
        const notes = v5.note.map((n: any) => ({
          id: n.id || uid(),
          title: n.title || '',
          body: n.body || n.content || '',
          notebook: n.notebook || '默认',
          tags: n.tags || [],
          favorite: n.favorite ?? false,
          url: n.url || '',
          createdAt: n.createdAt || new Date().toISOString(),
          updatedAt: n.updatedAt || new Date().toISOString(),
        }))
        await db.notes.bulkAdd(notes)
      }

      // Migrate mistakes -> mistakes
      if (Array.isArray(v5.mistakes)) {
        const mistakes = v5.mistakes.map((m: any) => ({
          id: m.id || uid(),
          subject: m.subject || '',
          question: m.question || '',
          answer: m.answer || '',
          errorType: m.errorType || m.type || '',
          tags: m.tags || [],
          linkedKnowledge: m.linkedKnowledge || [],
          mastered: m.mastered ?? false,
          reviewCount: m.reviewCount ?? 0,
          source: m.source || '',
          createdAt: m.createdAt || new Date().toISOString(),
        }))
        await db.mistakes.bulkAdd(mistakes)
      }

      // Migrate exams -> exams
      if (Array.isArray(v5.exams)) {
        const exams = v5.exams.map((e: any) => ({
          id: e.id || uid(),
          name: e.name || '',
          date: e.date || '',
          scores: e.scores || {},
          total: e.total ?? 0,
          rank: e.rank ?? 0,
          note: e.note || '',
        }))
        await db.exams.bulkAdd(exams)
      }

      // Migrate reading -> reading
      if (Array.isArray(v5.reading)) {
        const readings = v5.reading.map((r: any) => ({
          id: r.id || uid(),
          title: r.title || '',
          current: r.current ?? 0,
          target: r.target ?? 0,
          unit: r.unit || '页',
          note: r.note || '',
          pinned: r.pinned ?? false,
          createdAt: r.createdAt || new Date().toISOString(),
        }))
        await db.reading.bulkAdd(readings)
      }

      // Migrate finance -> finance
      if (Array.isArray(v5.finance)) {
        const finances = v5.finance.map((f: any) => ({
          id: f.id || uid(),
          type: f.type || 'expense',
          title: f.title || '',
          amount: f.amount ?? 0,
          category: f.category || '',
          tags: f.tags || [],
          date: f.date || '',
          note: f.note || '',
        }))
        await db.finance.bulkAdd(finances)
      }

      // Migrate pomodoro.log -> pomodoroLogs
      if (v5.pomodoro && Array.isArray(v5.pomodoro.log)) {
        const logs = v5.pomodoro.log.map((l: any) => ({
          id: l.id || uid(),
          date: l.date || '',
          duration: l.duration ?? 0,
          subject: l.subject,
          completed: l.completed ?? true,
        }))
        await db.pomodoroLogs.bulkAdd(logs)
      }

      // Migrate subjects -> subjects
      if (Array.isArray(v5.subjects)) {
        const subjects = v5.subjects.map((s: any) => ({
          id: s.id || uid(),
          name: s.name || '',
          chapters: (s.chapters || []).map((ch: any) => ({
            id: ch.id || uid(),
            name: ch.name || '',
            subjectId: s.id || ch.subjectId || '',
            topics: (ch.topics || []).map((tp: any) => ({
              id: tp.id || uid(),
              name: tp.name || '',
              chapterId: ch.id || tp.chapterId || '',
              mastery: tp.mastery || 'notStarted',
              notes: tp.notes || '',
              relatedMistakes: tp.relatedMistakes || [],
            })),
          })),
        }))
        await db.subjects.bulkAdd(subjects)
      }

      // Migrate project -> projects
      if (Array.isArray(v5.project)) {
        const projects = v5.project.map((p: any) => ({
          id: p.id || uid(),
          title: p.title || '',
          stage: p.stage || 'plan',
          progress: p.progress ?? 0,
          milestones: (p.milestones || []).map((m: any) => ({
            id: m.id || uid(),
            title: m.title || '',
            done: m.done ?? false,
          })),
          description: p.description || '',
          notes: p.notes || '',
          tags: p.tags || [],
        }))
        await db.projects.bulkAdd(projects)
      }

      // Migrate vault -> vault（安全修正 I-012：V5 密码为明文，V8 采用 PBKDF2+AES-GCM）
      // 无主密码阶段无法安全迁移明文密码，仅标记待处理，禁止明文落库。
      if (Array.isArray(v5.vault) && v5.vault.length > 0) {
        await db.settings.put({ key: 'vaultMigrationPending', value: true })
      }

      // Migrate review -> reviewEntries (weekly review -> type='weekly')
      if (Array.isArray(v5.review)) {
        const reviews = v5.review.map((r: any) => ({
          id: r.id || uid(),
          templateId: '',
          type: r.type || 'weekly',
          dateRange: r.dateRange || { start: '', end: '' },
          subjectId: r.subjectId,
          examId: r.examId,
          autoSummary: r.autoSummary || {},
          answers: r.answers || {},
          reflections: r.reflections || [],
          nextActions: r.nextActions || [],
          createdAt: r.createdAt || new Date().toISOString(),
        }))
        await db.reviewEntries.bulkAdd(reviews)
      }

      // Migrate config.examDate -> countdown entry
      if (v5.config && v5.config.examDate) {
        const countdownEntry = {
          id: uid(),
          title: v5.config.examName || '考试',
          targetDate: v5.config.examDate,
          type: 'exam' as const,
          showOnHome: true,
        }
        await db.countdowns.add(countdownEntry)
      }
    })

    // Mark migration as complete
    await db.settings.put({ key: 'migrated', value: true })

    return { success: true, migrated: true }
  } catch (err: any) {
    return { success: false, migrated: false, error: err.message || String(err) }
  }
}