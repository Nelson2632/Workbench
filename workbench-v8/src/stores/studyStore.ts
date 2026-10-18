// ============================================================
// Personal Workbench V8 — Study Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { AppEvent } from '../domain/events/eventBus'
import type { Subject, Mistake, Exam, Reading, Chapter, Topic } from '../types'

/** 将考试的学科成绩同步到独立 scores 表（先清后写，幂等） */
async function syncExamScores(
  examId: string,
  scores: Record<string, number>,
  assigned: Record<string, number>,
): Promise<void> {
  await db.scores.where('examId').equals(examId).delete()
  const subjects = new Set([...Object.keys(scores), ...Object.keys(assigned)])
  const now = new Date().toISOString()
  const rows = [...subjects].map((subject) => ({
    examId,
    subject,
    raw: scores[subject] ?? 0,
    assigned: assigned[subject] ?? 0,
    createdAt: now,
    updatedAt: now,
  }))
  if (rows.length > 0) await db.scores.bulkAdd(rows)
}

interface StudyState {
  subjects: Subject[]
  mistakes: Mistake[]
  exams: Exam[]
  reading: Reading[]
  loading: boolean

  // Subjects
  loadSubjects: () => Promise<void>
  addSubject: (name: string) => Promise<void>
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>
  deleteSubject: (id: string) => Promise<void>
  addChapter: (subjectId: string, name: string) => Promise<void>
  updateChapter: (subjectId: string, chapterId: string, updates: Partial<Chapter>) => Promise<void>
  deleteChapter: (subjectId: string, chapterId: string) => Promise<void>

  // Mistakes
  loadMistakes: () => Promise<void>
  addMistake: (mistake: Partial<Mistake> & { question: string; subject: string }) => Promise<void>
  updateMistake: (id: string, updates: Partial<Mistake>) => Promise<void>
  deleteMistake: (id: string) => Promise<void>
  toggleMastered: (id: string) => Promise<void>
  getWeakTopics: () => Mistake[]
  getRecentMistakes: (limit?: number) => Mistake[]

  // Topics
  addTopic: (subjectId: string, chapterId: string, name: string) => Promise<void>
  updateTopic: (subjectId: string, chapterId: string, topicId: string, updates: Partial<Topic>) => Promise<void>
  deleteTopic: (subjectId: string, chapterId: string, topicId: string) => Promise<void>

  // Exams
  loadExams: () => Promise<void>
  addExam: (exam: Partial<Exam> & { name: string; date: string }) => Promise<void>
  updateExam: (id: string, updates: Partial<Exam>) => Promise<void>
  deleteExam: (id: string) => Promise<void>
  getExamTrend: () => { name: string; date: string; score: number }[]

  // Reading
  loadReading: () => Promise<void>
  addReading: (reading: Partial<Reading> & { title: string }) => Promise<void>
  updateReading: (id: string, updates: Partial<Reading>) => Promise<void>
  deleteReading: (id: string) => Promise<void>
}

export const useStudyStore = create<StudyState>((set, get) => ({
  subjects: [],
  mistakes: [],
  exams: [],
  reading: [],
  loading: false,

  // ---- Subjects ----

  loadSubjects: async () => {
    set({ loading: true })
    const subjects = await db.subjects.toArray()
    set({ subjects, loading: false })
  },

  addSubject: async (name) => {
    const subject: Subject = {
      id: uid(),
      name,
      chapters: [],
    }
    await runCommand({
      commandType: 'subject.create',
      commandId: 'cmd_' + uid(),
      tables: ['subjects'],
      mutate: async () => {
        await db.subjects.add(subject)
      },
      afterCommit: () => {
        set((s) => ({ subjects: [...s.subjects, subject] }))
      },
    })
  },

  updateSubject: async (id, updates) => {
    await runCommand({
      commandType: 'subject.update',
      commandId: 'cmd_' + uid(),
      tables: ['subjects'],
      mutate: async () => {
        await db.subjects.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          subjects: s.subjects.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub)),
        }))
      },
    })
  },

  deleteSubject: async (id) => {
    await runCommand({
      commandType: 'subject.delete',
      commandId: 'cmd_' + uid(),
      tables: ['subjects'],
      mutate: async () => {
        await db.subjects.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) }))
      },
    })
  },

  addChapter: async (subjectId, name) => {
    const chapter: Chapter = {
      id: uid(),
      name,
      subjectId,
      topics: [],
    }
    const subjects = get().subjects.map((sub) => {
      if (sub.id === subjectId) {
        return { ...sub, chapters: [...sub.chapters, chapter] }
      }
      return sub
    })
    const updated = subjects.find((s) => s.id === subjectId)
    if (!updated) return
    await runCommand({
      commandType: 'subject.addChapter',
      commandId: 'cmd_' + uid(),
      tables: ['subjects'],
      mutate: async () => {
        await db.subjects.update(subjectId, { chapters: updated.chapters })
      },
      afterCommit: () => set({ subjects }),
    })
  },

  updateChapter: async (subjectId, chapterId, updates) => {
    const subjects = get().subjects.map((sub) => {
      if (sub.id === subjectId) {
        return {
          ...sub,
          chapters: sub.chapters.map((ch) =>
            ch.id === chapterId ? { ...ch, ...updates } : ch,
          ),
        }
      }
      return sub
    })
    const updated = subjects.find((s) => s.id === subjectId)
    if (!updated) return
    await runCommand({
      commandType: 'subject.updateChapter',
      commandId: 'cmd_' + uid(),
      tables: ['subjects'],
      mutate: async () => {
        await db.subjects.update(subjectId, { chapters: updated.chapters })
      },
      afterCommit: () => set({ subjects }),
    })
  },

  deleteChapter: async (subjectId, chapterId) => {
    const subjects = get().subjects.map((sub) => {
      if (sub.id === subjectId) {
        return {
          ...sub,
          chapters: sub.chapters.filter((ch) => ch.id !== chapterId),
        }
      }
      return sub
    })
    const updated = subjects.find((s) => s.id === subjectId)
    if (!updated) return
    await runCommand({
      commandType: 'subject.deleteChapter',
      commandId: 'cmd_' + uid(),
      tables: ['subjects'],
      mutate: async () => {
        await db.subjects.update(subjectId, { chapters: updated.chapters })
      },
      afterCommit: () => set({ subjects }),
    })
  },

  // ---- Mistakes ----

  loadMistakes: async () => {
    set({ loading: true })
    const mistakes = await db.mistakes.toArray()
    set({ mistakes, loading: false })
  },

  addMistake: async (mistake) => {
    const newMistake: Mistake = {
      id: uid(),
      subject: mistake.subject,
      question: mistake.question,
      answer: mistake.answer || '',
      errorType: mistake.errorType || '',
      tags: mistake.tags || [],
      linkedKnowledge: mistake.linkedKnowledge || [],
      mastered: mistake.mastered ?? false,
      reviewCount: mistake.reviewCount ?? 0,
      source: mistake.source || '',
      createdAt: new Date().toISOString(),
    }
    await runCommand({
      commandType: 'mistake.create',
      commandId: 'cmd_' + uid(),
      tables: ['mistakes'],
      mutate: async () => {
        await db.mistakes.add(newMistake)
      },
      events: () => [{ type: 'mistake.created', mistakeId: newMistake.id, subject: newMistake.subject }],
      afterCommit: () => {
        set((s) => ({ mistakes: [...s.mistakes, newMistake] }))
      },
    })
  },

  updateMistake: async (id, updates) => {
    await runCommand({
      commandType: 'mistake.update',
      commandId: 'cmd_' + uid(),
      tables: ['mistakes'],
      mutate: async () => {
        await db.mistakes.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          mistakes: s.mistakes.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }))
      },
    })
  },

  // V9 新增：攻克/取消攻克（写 masteredAt 附加字段 + mistake.resolved 事件）
  toggleMastered: async (id) => {
    const target = get().mistakes.find((m) => m.id === id)
    if (!target) return
    const mastered = !target.mastered
    const masteredAt = mastered ? new Date().toISOString() : null
    await runCommand({
      commandType: 'mistake.toggleMastered',
      commandId: 'cmd_' + uid(),
      tables: ['mistakes'],
      mutate: async () => {
        await db.mistakes.update(id, { mastered, masteredAt } as Partial<Mistake>)
      },
      events: () => {
        const evts: AppEvent[] = []
        if (mastered) {
          evts.push({ type: 'mistake.resolved', mistakeId: id })
        }
        return evts
      },
      afterCommit: () => {
        set((s) => ({
          mistakes: s.mistakes.map((m) =>
            m.id === id ? { ...m, mastered, masteredAt } : m,
          ),
        }))
      },
    })
  },

  deleteMistake: async (id) => {
    await runCommand({
      commandType: 'mistake.delete',
      commandId: 'cmd_' + uid(),
      tables: ['mistakes'],
      mutate: async () => {
        await db.mistakes.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ mistakes: s.mistakes.filter((m) => m.id !== id) }))
      },
    })
  },

  getWeakTopics: () => {
    return get().mistakes.filter((m) => !m.mastered)
  },

  getRecentMistakes: (limit = 10) => {
    return get()
      .mistakes.filter((m) => !m.mastered)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
  },

  // ---- Topics ----

  addTopic: async (subjectId, chapterId, name) => {
    const topic: Topic = {
      id: uid(),
      name,
      chapterId,
      mastery: 'notStarted',
      notes: '',
      relatedMistakes: [],
    }
    const subjects = get().subjects.map((sub) => {
      if (sub.id === subjectId) {
        return {
          ...sub,
          chapters: sub.chapters.map((ch) =>
            ch.id === chapterId ? { ...ch, topics: [...ch.topics, topic] } : ch,
          ),
        }
      }
      return sub
    })
    const updated = subjects.find((s) => s.id === subjectId)
    if (!updated) return
    await runCommand({
      commandType: 'subject.addTopic',
      commandId: 'cmd_' + uid(),
      tables: ['subjects'],
      mutate: async () => {
        await db.subjects.update(subjectId, { chapters: updated.chapters })
      },
      afterCommit: () => set({ subjects }),
    })
  },

  updateTopic: async (subjectId, chapterId, topicId, updates) => {
    const subjects = get().subjects.map((sub) => {
      if (sub.id === subjectId) {
        return {
          ...sub,
          chapters: sub.chapters.map((ch) =>
            ch.id === chapterId
              ? {
                  ...ch,
                  topics: ch.topics.map((t) =>
                    t.id === topicId ? { ...t, ...updates } : t,
                  ),
                }
              : ch,
          ),
        }
      }
      return sub
    })
    const updated = subjects.find((s) => s.id === subjectId)
    if (!updated) return
    await runCommand({
      commandType: 'subject.updateTopic',
      commandId: 'cmd_' + uid(),
      tables: ['subjects'],
      mutate: async () => {
        await db.subjects.update(subjectId, { chapters: updated.chapters })
      },
      afterCommit: () => set({ subjects }),
    })
  },

  deleteTopic: async (subjectId, chapterId, topicId) => {
    const subjects = get().subjects.map((sub) => {
      if (sub.id === subjectId) {
        return {
          ...sub,
          chapters: sub.chapters.map((ch) =>
            ch.id === chapterId
              ? { ...ch, topics: ch.topics.filter((t) => t.id !== topicId) }
              : ch,
          ),
        }
      }
      return sub
    })
    const updated = subjects.find((s) => s.id === subjectId)
    if (!updated) return
    await runCommand({
      commandType: 'subject.deleteTopic',
      commandId: 'cmd_' + uid(),
      tables: ['subjects'],
      mutate: async () => {
        await db.subjects.update(subjectId, { chapters: updated.chapters })
      },
      afterCommit: () => set({ subjects }),
    })
  },

  // ---- Exams ----

  loadExams: async () => {
    set({ loading: true })
    const exams = await db.exams.toArray()
    set({ exams, loading: false })
  },

  addExam: async (exam) => {
    const newExam: Exam = {
      id: uid(),
      name: exam.name,
      date: exam.date,
      scores: exam.scores || {},
      assignedScores: exam.assignedScores || {},
      total: exam.total ?? 0,
      assignedTotal: exam.assignedTotal ?? 0,
      rank: exam.rank ?? 0,
      note: exam.note || '',
    }
    await runCommand({
      commandType: 'exam.create',
      commandId: 'cmd_' + uid(),
      tables: ['exams', 'scores'],
      mutate: async () => {
        await db.exams.add(newExam)
        await syncExamScores(newExam.id, newExam.scores, newExam.assignedScores)
      },
      events: () => [{ type: 'exam.created', examId: newExam.id }],
      afterCommit: () => {
        set((s) => ({ exams: [...s.exams, newExam] }))
      },
    })
  },

  updateExam: async (id, updates) => {
    const cur = get().exams.find((e) => e.id === id)
    const hasScores = !!(updates.scores || updates.assignedScores)
    const mergedScores = { ...(cur?.scores || {}), ...(updates.scores || {}) }
    const mergedAssigned = { ...(cur?.assignedScores || {}), ...(updates.assignedScores || {}) }
    await runCommand({
      commandType: 'exam.update',
      commandId: 'cmd_' + uid(),
      tables: ['exams', 'scores'],
      mutate: async () => {
        await db.exams.update(id, updates)
        if (hasScores) {
          await syncExamScores(id, mergedScores, mergedAssigned)
        }
      },
      afterCommit: () => {
        set((s) => ({
          exams: s.exams.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }))
      },
    })
  },

  deleteExam: async (id) => {
    await runCommand({
      commandType: 'exam.delete',
      commandId: 'cmd_' + uid(),
      tables: ['exams', 'scores'],
      mutate: async () => {
        await db.exams.delete(id)
        await db.scores.where('examId').equals(id).delete()
      },
      afterCommit: () => {
        set((s) => ({ exams: s.exams.filter((e) => e.id !== id) }))
      },
    })
  },

  getExamTrend: () => {
    return [...get().exams]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        name: e.name,
        date: e.date,
        score: e.total,
      }))
  },

  // ---- Reading ----

  loadReading: async () => {
    set({ loading: true })
    const reading = await db.reading.toArray()
    set({ reading, loading: false })
  },

  addReading: async (reading) => {
    const current = reading.current ?? 0
    const target = reading.target ?? 0
    let status = reading.status ?? 'wantToRead'
    // 在读且进度已满则直接标记读完
    if (status === 'reading' && target > 0 && current >= target) {
      status = 'read'
    }
    const newReading: Reading = {
      id: uid(),
      title: reading.title,
      status,
      current,
      target,
      unit: reading.unit || '页',
      note: reading.note || '',
      pinned: reading.pinned ?? false,
      createdAt: new Date().toISOString(),
    }
    await runCommand({
      commandType: 'reading.create',
      commandId: 'cmd_' + uid(),
      tables: ['reading'],
      mutate: async () => {
        await db.reading.add(newReading)
      },
      afterCommit: () => {
        set((s) => ({ reading: [...s.reading, newReading] }))
      },
    })
  },

  updateReading: async (id, updates) => {
    const prev = get().reading.find((r) => r.id === id)
    if (!prev) return
    const merged: Reading = { ...prev, ...updates }
    // 自动完结：在读状态下进度达 100% 自动翻转为「读完」
    if (merged.status === 'reading' && merged.target > 0 && merged.current >= merged.target) {
      merged.status = 'read'
      merged.current = merged.target
    }
    await runCommand({
      commandType: 'reading.update',
      commandId: 'cmd_' + uid(),
      tables: ['reading'],
      mutate: async () => {
        await db.reading.update(id, merged)
      },
      afterCommit: () => {
        set((s) => ({
          reading: s.reading.map((r) => (r.id === id ? merged : r)),
        }))
      },
    })
  },

  deleteReading: async (id) => {
    await runCommand({
      commandType: 'reading.delete',
      commandId: 'cmd_' + uid(),
      tables: ['reading'],
      mutate: async () => {
        await db.reading.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ reading: s.reading.filter((r) => r.id !== id) }))
      },
    })
  },
}))
