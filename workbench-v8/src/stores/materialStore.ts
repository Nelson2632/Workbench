// ============================================================
// Personal Workbench V9 — 素材 Material Store（V9 形态改造）
// 素材页：灵感速记迁移后承接素材资产（version(4) 已迁移 lifeMoments）
// 素材当前不进 Timeline，故不发布跨域事件
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { Material } from '../types'

export interface MaterialInput {
  title: string
  category?: string
  tags?: string[]
  fileRefs?: string[]
  note?: string
  sourceDate?: string | null
}

interface MaterialState {
  materials: Material[]
  loading: boolean
  loadMaterials: () => Promise<void>
  addMaterial: (input: MaterialInput) => Promise<number>
  updateMaterial: (id: number, updates: Partial<Material>) => Promise<void>
  deleteMaterial: (id: number) => Promise<void>
}

export const useMaterialStore = create<MaterialState>((set) => ({
  materials: [],
  loading: false,

  loadMaterials: async () => {
    set({ loading: true })
    try {
      const materials = await db.materials.toArray()
      set({ materials, loading: false })
    } catch (err) {
      console.error('[MaterialStore] loadMaterials failed:', err)
      set({ materials: [], loading: false })
    }
  },

  addMaterial: async (input) => {
    const now = new Date().toISOString()
    const row: Omit<Material, 'id'> = {
      title: input.title,
      category: input.category ?? '未分类',
      tags: input.tags ?? [],
      fileRefs: input.fileRefs ?? [],
      note: input.note ?? '',
      sourceDate: input.sourceDate ?? null,
      createdAt: now,
      updatedAt: now,
    }
    const { result } = await runCommand<number>({
      commandType: 'material.create',
      commandId: 'cmd_' + uid(),
      tables: ['materials'],
      mutate: async () => db.materials.add(row),
      afterCommit: (id) => {
        set((s) => ({ materials: [...s.materials, { ...row, id }] }))
      },
    })
    return result!
  },

  updateMaterial: async (id, updates) => {
    const now = new Date().toISOString()
    await runCommand({
      commandType: 'material.update',
      commandId: 'cmd_' + uid(),
      tables: ['materials'],
      mutate: async () => {
        await db.materials.update(id, { ...updates, updatedAt: now })
      },
      afterCommit: () => {
        set((s) => ({
          materials: s.materials.map((m) =>
            m.id === id ? { ...m, ...updates, updatedAt: now } : m,
          ),
        }))
      },
    })
  },

  deleteMaterial: async (id) => {
    await runCommand({
      commandType: 'material.delete',
      commandId: 'cmd_' + uid(),
      tables: ['materials'],
      mutate: async () => {
        await db.materials.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ materials: s.materials.filter((m) => m.id !== id) }))
      },
    })
  },
}))
