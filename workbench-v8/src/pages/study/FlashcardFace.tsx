// ============================================================
// Personal Workbench V8 — Flashcard Face Component (Task 17)
// ============================================================

import type { CSSProperties, MouseEvent } from 'react'
import type { Flashcard } from '@/types'
import type { ThemeDefinition } from './FlashcardTheme'
import { getGradientAngleShift, getGlowPositionShift } from './FlashcardTheme'

interface FlashcardFaceProps {
  flashcard: Flashcard
  theme: ThemeDefinition
  side: 'front' | 'back'
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
}

// 楷体字族（Windows 首选 KaiTi，其余平台优雅降级到衬线体）
const KAITI_FONT = "'KaiTi', 'STKaiti', 'Kaiti SC', '楷体', 'Noto Serif SC', serif"

/**
 * Ensure text contrast is optimal against the background.
 * Lightens dark backgrounds slightly and darkens light backgrounds.
 */
function getContrastAdjustedBg(theme: ThemeDefinition, cardId: string): string {
  const angleShift = getGradientAngleShift(cardId, theme.seed)
  // Parse the base gradient and shift the angle by the variation
  if (theme.background.includes('linear-gradient')) {
    return theme.background.replace(
      /linear-gradient\((\d+)deg/,
      (_, deg) => `linear-gradient(${parseInt(deg) + Math.round(angleShift * 180)}deg`,
    )
  }
  return theme.background
}

export default function FlashcardFace({ flashcard, theme, side, onClick }: FlashcardFaceProps) {
  const glowShift = getGlowPositionShift(flashcard.id, theme.seed)
  const adjustedBg = getContrastAdjustedBg(theme, flashcard.id)

  const style: CSSProperties = {
    background: adjustedBg,
    color: theme.textColor,
    borderColor: theme.borderColor,
    boxShadow: theme.shadow,
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
  }

  return (
    <div
      style={style}
      onClick={onClick}
      className="flashcard-face"
    >
      {/* Pattern / decorative layer */}
      {theme.pattern !== 'none' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: theme.pattern,
            pointerEvents: 'none',
            opacity: 0.7,
          }}
        />
      )}

      {/* Noise texture with subtle animation */}
      {theme.noise.opacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: '-5%',
            opacity: theme.noise.opacity,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: theme.noise.size,
            pointerEvents: 'none',
            animation: 'noiseShift 8s ease-in-out infinite',
          }}
        />
      )}

      {/* Glow effect with slow animation */}
      {theme.glowColor !== 'transparent' && (
        <div
          style={{
            position: 'absolute',
            top: `${15 + glowShift * 25}%`,
            left: `${35 + glowShift * 30}%`,
            width: '55%',
            height: '45%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(ellipse, ${theme.glowColor}, transparent 70%)`,
            pointerEvents: 'none',
            animation: 'slowGlow 6s ease-in-out infinite',
          }}
        />
      )}

      {/* Shine / light sweep effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          borderRadius: 'inherit',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '60%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 60%, transparent 100%)',
            transform: 'skewX(-20deg)',
            animation: 'shineSweep 4s ease-in-out infinite',
            animationDelay: `${glowShift * 2}s`,
          }}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {side === 'front' ? (
          <FlashcardFront flashcard={flashcard} theme={theme} />
        ) : (
          <FlashcardBack flashcard={flashcard} theme={theme} />
        )}
      </div>
    </div>
  )
}

function FlashcardFront({ flashcard, theme }: { flashcard: Flashcard; theme: ThemeDefinition }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '14%',
        paddingLeft: 28,
        paddingRight: 28,
      }}
    >
      {/* 学科（楷体，居中偏上） */}
      <span
        style={{
          fontFamily: KAITI_FONT,
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: 3,
          color: theme.secondaryTextColor,
          marginBottom: 24,
        }}
      >
        {flashcard.subject || '未分类'}
      </span>
      {/* 题目（楷体，大字号，居中） */}
      <div
        style={{
          fontFamily: KAITI_FONT,
          fontSize: 28,
          lineHeight: 1.7,
          color: theme.textColor,
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxWidth: '100%',
        }}
      >
        {flashcard.question}
      </div>
      {/* 底部提示（推到底部） */}
      <div style={{ marginTop: 'auto', paddingTop: 16, paddingBottom: 4, textAlign: 'center' }}>
        <span style={{ fontFamily: KAITI_FONT, fontSize: 13, color: theme.secondaryTextColor, opacity: 0.75 }}>
          点击查看答案
        </span>
      </div>
    </div>
  )
}

function FlashcardBack({ flashcard, theme }: { flashcard: Flashcard; theme: ThemeDefinition }) {
  return (
    <>
      <div
        style={{
          flex: 1,
          fontFamily: KAITI_FONT,
          fontSize: 20,
          lineHeight: 1.8,
          color: theme.textColor,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          padding: '0 4px',
          marginBottom: 12,
        }}
      >
        {flashcard.answer}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          flexShrink: 0,
          paddingTop: 12,
          borderTop: `1px solid ${theme.borderColor}`,
        }}
      >
        <span style={{ fontSize: 12, color: theme.secondaryTextColor }}>
          已复习 {flashcard.reviewCount} 次
        </span>
        <span style={{ fontSize: 12, color: theme.secondaryTextColor }}>
          连续正确 {flashcard.correctCount} 次
        </span>
        <span style={{ fontSize: 12, color: theme.secondaryTextColor }}>
          掌握度 {flashcard.mastery}%
        </span>
      </div>
    </>
  )
}