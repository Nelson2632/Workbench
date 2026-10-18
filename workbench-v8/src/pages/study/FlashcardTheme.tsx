// ============================================================
// Personal Workbench V8 — Flashcard Theme Definitions (Task 17)
// ============================================================

import type { FlashcardTheme as ThemeName } from '@/types'

export interface ThemeDefinition {
  name: ThemeName
  label: string
  /** Primary seed value for deterministic variation (gradient angle, glow position) */
  seed: number
  /** CSS gradient string for card background */
  background: string
  /** Noise / grain texture settings */
  noise: {
    opacity: number
    size: string
  }
  /** Glow / accent color */
  glowColor: string
  /** Pattern CSS (e.g., repeating patterns) */
  pattern: string
  /** Primary text color */
  textColor: string
  /** Secondary / subtitle text color */
  secondaryTextColor: string
  /** Accent color for badges, highlights */
  accentColor: string
  /** Border color */
  borderColor: string
  /** Card shadow */
  shadow: string
  /** Badge background */
  badgeBg: string
  /** Badge text */
  badgeText: string
}

/**
 * Compute a deterministic variation offset from a card ID and theme seed.
 * Returns a hash-derived value in [0, 1) range for consistent per-card variation.
 */
export function getThemeVariation(cardId: string, seed: number): number {
  let hash = seed
  for (let i = 0; i < cardId.length; i++) {
    hash = ((hash << 5) - hash + cardId.charCodeAt(i)) | 0
  }
  return ((hash >>> 0) % 1000) / 1000
}

/**
 * Compute a deterministic gradient angle shift based on card ID.
 * Returns a value in [-0.15, 0.15] range.
 */
export function getGradientAngleShift(cardId: string, seed: number): number {
  const v = getThemeVariation(cardId, seed)
  return (v - 0.5) * 0.3
}

/**
 * Compute a deterministic glow position shift based on card ID.
 * Returns a value in [0, 1] range.
 */
export function getGlowPositionShift(cardId: string, seed: number): number {
  return getThemeVariation(cardId + '_glow', seed)
}

export const themes: Record<ThemeName, ThemeDefinition> = {
  morningMist: {
    name: 'morningMist',
    label: '晨雾',
    seed: 0.37,
    background: 'linear-gradient(135deg, #e8edf2 0%, #d5dce4 40%, #c8d6e5 100%)',
    noise: { opacity: 0.03, size: '200px' },
    glowColor: 'rgba(180, 200, 220, 0.4)',
    pattern: `
      radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)
    `,
    textColor: '#2c3e50',
    secondaryTextColor: '#5a6c7d',
    accentColor: '#6366f1',
    borderColor: 'rgba(180, 200, 220, 0.5)',
    shadow: '0 4px 20px rgba(140, 160, 180, 0.2)',
    badgeBg: 'rgba(99, 102, 241, 0.12)',
    badgeText: '#4f46e5',
  },

  nightSky: {
    name: 'nightSky',
    label: '夜空',
    seed: 0.84,
    background: 'linear-gradient(135deg, #1a1b2e 0%, #16213e 40%, #0f3460 100%)',
    noise: { opacity: 0.04, size: '150px' },
    glowColor: 'rgba(100, 150, 255, 0.3)',
    pattern: `
      radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.4), transparent),
      radial-gradient(1px 1px at 30% 50%, rgba(255,255,255,0.3), transparent),
      radial-gradient(1.5px 1.5px at 60% 30%, rgba(255,255,255,0.5), transparent),
      radial-gradient(1px 1px at 80% 60%, rgba(255,255,255,0.3), transparent),
      radial-gradient(1px 1px at 50% 80%, rgba(255,255,255,0.2), transparent),
      radial-gradient(1.5px 1.5px at 20% 70%, rgba(255,255,255,0.4), transparent),
      radial-gradient(1px 1px at 70% 15%, rgba(255,255,255,0.3), transparent)
    `,
    textColor: '#e2e8f0',
    secondaryTextColor: '#94a3b8',
    accentColor: '#818cf8',
    borderColor: 'rgba(100, 150, 255, 0.2)',
    shadow: '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(100, 150, 255, 0.1)',
    badgeBg: 'rgba(129, 140, 248, 0.15)',
    badgeText: '#a5b4fc',
  },

  forest: {
    name: 'forest',
    label: '森林',
    seed: 0.52,
    background: 'linear-gradient(135deg, #e8efe5 0%, #d4e0cc 40%, #c5d5b8 100%)',
    noise: { opacity: 0.025, size: '180px' },
    glowColor: 'rgba(140, 180, 120, 0.3)',
    pattern: `
      radial-gradient(ellipse at 15% 60%, rgba(160,200,140,0.12) 0%, transparent 40%),
      radial-gradient(ellipse at 75% 35%, rgba(160,200,140,0.08) 0%, transparent 40%)
    `,
    textColor: '#2d3a24',
    secondaryTextColor: '#5a6b4a',
    accentColor: '#4d7c3b',
    borderColor: 'rgba(140, 180, 120, 0.4)',
    shadow: '0 4px 20px rgba(100, 140, 80, 0.15)',
    badgeBg: 'rgba(77, 124, 59, 0.12)',
    badgeText: '#3d6b2b',
  },

  amber: {
    name: 'amber',
    label: '琥珀',
    seed: 0.61,
    background: 'linear-gradient(135deg, #f5f0e8 0%, #efe3d0 40%, #e8d9c0 100%)',
    noise: { opacity: 0.03, size: '200px' },
    glowColor: 'rgba(220, 180, 120, 0.35)',
    pattern: `
      radial-gradient(circle at 30% 40%, rgba(255,255,255,0.2) 0%, transparent 50%),
      radial-gradient(circle at 70% 60%, rgba(255,255,255,0.1) 0%, transparent 40%)
    `,
    textColor: '#3d2e1a',
    secondaryTextColor: '#6b5a3e',
    accentColor: '#b8860b',
    borderColor: 'rgba(200, 160, 100, 0.4)',
    shadow: '0 4px 20px rgba(180, 140, 80, 0.2)',
    badgeBg: 'rgba(184, 134, 11, 0.12)',
    badgeText: '#8b6914',
  },

  minimal: {
    name: 'minimal',
    label: '极简',
    seed: 0.15,
    background: '#f8f9fa',
    noise: { opacity: 0, size: '0' },
    glowColor: 'transparent',
    pattern: 'none',
    textColor: '#1e293b',
    secondaryTextColor: '#64748b',
    accentColor: '#6366f1',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    badgeBg: 'rgba(99, 102, 241, 0.1)',
    badgeText: '#4f46e5',
  },
}

/** Default theme mapping by subject name */
export function getThemeForSubject(subject: string): ThemeName {
  const map: Record<string, ThemeName> = {
    '数学': 'nightSky',
    '物理': 'nightSky',
    '生物': 'forest',
    '历史': 'amber',
    '化学': 'amber',
    '语文': 'morningMist',
    '英语': 'morningMist',
  }
  return map[subject] || 'minimal'
}