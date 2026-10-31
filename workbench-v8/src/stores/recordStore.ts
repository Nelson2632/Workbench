// ============================================================
// Personal Workbench V8 — Record Store (Memos & Notes)
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { Memo, Note, MemoConversion } from '../types'

interface RecordState {
  memos: Memo[]
  notes: Note[]
  loading: boolean

  // Memos
  loadMemos: () => Promise<void>
  addMemo: (content: string, commandId?: string) => Promise<void>
  updateMemo: (id: string, updates: Partial<Memo>) => Promise<void>
  deleteMemo: (id: string) => Promise<void>
  convertMemoToTask: (memoId: string) => Promise<void>
  convertMemoToMistake: (memoId: string) => Promise<void>
  convertMemoToNote: (memoId: string) => Promise<void>

  // Notes
  loadNotes: () => Promise<void>
  addNote: (note: Partial<Note> & { title: string }) => Promise<void>
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
}

export const useRecordStore = create<RecordState>((set, get) => ({
  memos: [],
  notes: [],
  loading: false,

  // ---- Memos ----

  loadMemos: async () => {
    set({ loading: true })
    const memos = await db.memos.toArray()
    set({ memos, loading: false })
  },

  addMemo: async (content, commandId = 'cmd_' + uid()) => {
    const memo: Memo = {
      id: 'memo_' + commandId,
      content,
      createdAt: new Date().toISOString(),
    }
    await runCommand({
      commandType: 'memo.create',
      commandId,
      tables: ['memos'],
      mutate: async () => {
        const existing = await db.memos.get(memo.id)
        if (existing && existing.content !== content) throw new Error('Memo intent content changed')
        if (!existing) await db.memos.add(memo)
      },
    })
    const canonical = await db.memos.get(memo.id)
    if (canonical) set((s) => ({ memos: [canonical, ...s.memos.filter(m => m.id !== canonical.id)] }))
  },

  updateMemo: async (id, updates) => {
    await runCommand({
      commandType: 'memo.update',
      commandId: 'cmd_' + uid(),
      tables: ['memos'],
      mutate: async () => {
        await db.memos.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          memos: s.memos.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        }))
      },
    })
  },

  deleteMemo: async (id) => {
    await runCommand({
      commandType: 'memo.delete',
      commandId: 'cmd_' + uid(),
      tables: ['memos'],
      mutate: async () => {
        await db.memos.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ memos: s.memos.filter((m) => m.id !== id) }))
      },
    })
  },

  convertMemoToTask: async (memoId) => {
    const memo = get().memos.find((m) => m.id === memoId)
    if (!memo) return
    const conversion: MemoConversion = { type: 'task', id: uid() }
    await runCommand({
      commandType: 'memo.convertToTask',
      commandId: 'cmd_' + uid(),
      tables: ['memos'],
      mutate: async () => {
        await db.memos.update(memoId, { convertedTo: conversion })
      },
      afterCommit: () => {
        set((s) => ({
          memos: s.memos.map((m) => (m.id === memoId ? { ...m, convertedTo: conversion } : m)),
        }))
      },
    })
  },

  convertMemoToMistake: async (memoId) => {
    const memo = get().memos.find((m) => m.id === memoId)
    if (!memo) return
    const conversion: MemoConversion = { type: 'mistake', id: uid() }
    await runCommand({
      commandType: 'memo.convertToMistake',
      commandId: 'cmd_' + uid(),
      tables: ['memos'],
      mutate: async () => {
        await db.memos.update(memoId, { convertedTo: conversion })
      },
      afterCommit: () => {
        set((s) => ({
          memos: s.memos.map((m) => (m.id === memoId ? { ...m, convertedTo: conversion } : m)),
        }))
      },
    })
  },

  convertMemoToNote: async (memoId) => {
    const memo = get().memos.find((m) => m.id === memoId)
    if (!memo) return
    const conversion: MemoConversion = { type: 'note', id: uid() }
    await runCommand({
      commandType: 'memo.convertToNote',
      commandId: 'cmd_' + uid(),
      tables: ['memos'],
      mutate: async () => {
        await db.memos.update(memoId, { convertedTo: conversion })
      },
      afterCommit: () => {
        set((s) => ({
          memos: s.memos.map((m) => (m.id === memoId ? { ...m, convertedTo: conversion } : m)),
        }))
      },
    })
  },

  // ---- Notes ----

  loadNotes: async () => {
    set({ loading: true })
    const notes = await db.notes.toArray()
    set({ notes, loading: false })
  },

  addNote: async (note) => {
    const now = new Date().toISOString()
    const newNote: Note = {
      id: uid(),
      title: note.title,
      body: note.body || '',
      notebook: note.notebook || '默认',
      tags: note.tags || [],
      favorite: note.favorite ?? false,
      url: note.url || '',
      createdAt: now,
      updatedAt: now,
    }
    await runCommand({
      commandType: 'note.create',
      commandId: 'cmd_' + uid(),
      tables: ['notes'],
      mutate: async () => {
        await db.notes.add(newNote)
      },
      afterCommit: () => {
        set((s) => ({ notes: [...s.notes, newNote] }))
      },
    })
  },

  updateNote: async (id, updates) => {
    const updatedAt = new Date().toISOString()
    await runCommand({
      commandType: 'note.update',
      commandId: 'cmd_' + uid(),
      tables: ['notes'],
      mutate: async () => {
        await db.notes.update(id, { ...updates, updatedAt })
      },
      afterCommit: () => {
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt } : n)),
        }))
      },
    })
  },

  deleteNote: async (id) => {
    await runCommand({
      commandType: 'note.delete',
      commandId: 'cmd_' + uid(),
      tables: ['notes'],
      mutate: async () => {
        await db.notes.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
      },
    })
  },
}))
