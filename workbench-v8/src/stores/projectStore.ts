// ============================================================
// Personal Workbench V8 — Project Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { runCommand } from '../db/mutationLane'
import { uid } from '../utils/helpers'
import type { Project, ProjectStage, Milestone } from '../types'

interface ProjectState {
  projects: Project[]
  loading: boolean

  loadProjects: () => Promise<void>
  addProject: (title: string) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  changeStage: (id: string, stage: ProjectStage) => Promise<void>
  addMilestone: (projectId: string, title: string) => Promise<void>
  toggleMilestone: (projectId: string, milestoneId: string) => Promise<void>
  deleteMilestone: (projectId: string, milestoneId: string) => Promise<void>
}

/** Calculate progress based on milestone completion */
function calcProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0
  const done = milestones.filter((m) => m.done).length
  return Math.round((done / milestones.length) * 100)
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,

  loadProjects: async () => {
    set({ loading: true })
    const projects = await db.projects.toArray()
    set({ projects, loading: false })
  },

  addProject: async (title) => {
    const project: Project = {
      id: uid(),
      title,
      stage: 'plan',
      progress: 0,
      milestones: [],
      description: '',
      notes: '',
      tags: [],
    }
    await runCommand({
      commandType: 'project.create',
      commandId: 'cmd_' + uid(),
      tables: ['projects'],
      mutate: async () => {
        await db.projects.add(project)
      },
      afterCommit: () => {
        set((s) => ({ projects: [...s.projects, project] }))
      },
    })
  },

  updateProject: async (id, updates) => {
    await runCommand({
      commandType: 'project.update',
      commandId: 'cmd_' + uid(),
      tables: ['projects'],
      mutate: async () => {
        await db.projects.update(id, updates)
      },
      afterCommit: () => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }))
      },
    })
  },

  deleteProject: async (id) => {
    await runCommand({
      commandType: 'project.delete',
      commandId: 'cmd_' + uid(),
      tables: ['projects'],
      mutate: async () => {
        await db.projects.delete(id)
      },
      afterCommit: () => {
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
      },
    })
  },

  changeStage: async (id, stage) => {
    await runCommand({
      commandType: 'project.changeStage',
      commandId: 'cmd_' + uid(),
      tables: ['projects'],
      mutate: async () => {
        await db.projects.update(id, { stage })
      },
      afterCommit: () => {
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, stage } : p)),
        }))
      },
    })
  },

  addMilestone: async (projectId, title) => {
    const milestone: Milestone = {
      id: uid(),
      title,
      done: false,
    }
    const projects = get().projects.map((p) => {
      if (p.id === projectId) {
        const milestones = [...p.milestones, milestone]
        const progress = calcProgress(milestones)
        return { ...p, milestones, progress }
      }
      return p
    })
    const updated = projects.find((p) => p.id === projectId)
    if (!updated) return
    await runCommand({
      commandType: 'project.addMilestone',
      commandId: 'cmd_' + uid(),
      tables: ['projects'],
      mutate: async () => {
        await db.projects.update(projectId, {
          milestones: updated.milestones,
          progress: updated.progress,
        })
      },
      afterCommit: () => set({ projects }),
    })
  },

  toggleMilestone: async (projectId, milestoneId) => {
    const projects = get().projects.map((p) => {
      if (p.id === projectId) {
        const milestones = p.milestones.map((m) =>
          m.id === milestoneId ? { ...m, done: !m.done } : m,
        )
        const progress = calcProgress(milestones)
        return { ...p, milestones, progress }
      }
      return p
    })
    const updated = projects.find((p) => p.id === projectId)
    if (!updated) return
    await runCommand({
      commandType: 'project.toggleMilestone',
      commandId: 'cmd_' + uid(),
      tables: ['projects'],
      mutate: async () => {
        await db.projects.update(projectId, {
          milestones: updated.milestones,
          progress: updated.progress,
        })
      },
      afterCommit: () => set({ projects }),
    })
  },

  deleteMilestone: async (projectId, milestoneId) => {
    const projects = get().projects.map((p) => {
      if (p.id === projectId) {
        const milestones = p.milestones.filter((m) => m.id !== milestoneId)
        const progress = calcProgress(milestones)
        return { ...p, milestones, progress }
      }
      return p
    })
    const updated = projects.find((p) => p.id === projectId)
    if (!updated) return
    await runCommand({
      commandType: 'project.deleteMilestone',
      commandId: 'cmd_' + uid(),
      tables: ['projects'],
      mutate: async () => {
        await db.projects.update(projectId, {
          milestones: updated.milestones,
          progress: updated.progress,
        })
      },
      afterCommit: () => set({ projects }),
    })
  },
}))
