import { useEffect } from 'react'
import { db } from '@/db/database'
import { isDesktop, isQuickMemoWindow, sendDesktopNotification } from '@/desktop'
import { formatDate } from '@/utils/helpers'

// ============================================================
// Personal Workbench V8 — Desktop Notification Scheduler
// ============================================================
// Periodically checks (every minute, only in the desktop shell):
//   1. Daily review reminder    — 21:00 if today's review is missing
//   2. Recurring plan reminder  — 09:00 if recurring tasks are pending
//   3. Countdown reminders      — 30/14/7/3/1/0 days before target
// Each notification fires at most once per day (tracked in localStorage).

const LS_PREFIX = 'wb-notified:'

export interface NotificationSettings {
  reviewReminderEnabled: boolean
  reviewReminderTime: string // "HH:mm"
  recurringReminderEnabled: boolean
  recurringReminderTime: string // "HH:mm"
  countdownReminderEnabled: boolean
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  reviewReminderEnabled: true,
  reviewReminderTime: '21:00',
  recurringReminderEnabled: true,
  recurringReminderTime: '09:00',
  countdownReminderEnabled: true,
}

export const NOTIFICATION_SETTINGS_KEY = 'wb-notification-settings'

export function loadNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    /* ignore corrupt settings */
  }
  return { ...DEFAULT_SETTINGS }
}

function getSettings(): NotificationSettings {
  return loadNotificationSettings()
}

/** Has this notification key already fired today? */
function alreadyNotifiedToday(key: string): boolean {
  return localStorage.getItem(LS_PREFIX + key) === formatDate(new Date())
}

function markNotifiedToday(key: string): void {
  try {
    localStorage.setItem(LS_PREFIX + key, formatDate(new Date()))
  } catch {
    /* storage full — worst case a duplicate notification */
  }
}

function isPastTime(hhmm: string, now: Date): boolean {
  const [h, m] = hhmm.split(':').map(Number)
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)
}

async function checkDailyReviewReminder(settings: NotificationSettings): Promise<void> {
  if (!settings.reviewReminderEnabled || !isPastTime(settings.reviewReminderTime, new Date())) return
  const key = 'daily-review'
  if (alreadyNotifiedToday(key)) return

  const today = formatDate(new Date())
  const dailyReviews = await db.reviewEntries
    .filter((r) => r.type === 'daily' && r.dateRange.start <= today && r.dateRange.end >= today)
    .count()

  if (dailyReviews === 0) {
    await sendDesktopNotification(
      '今日复盘待完成',
      '今天还没有写复盘，花 5 分钟回顾一下今天吧。',
    )
  }
  markNotifiedToday(key)
}

async function checkRecurringReminder(settings: NotificationSettings): Promise<void> {
  if (!settings.recurringReminderEnabled || !isPastTime(settings.recurringReminderTime, new Date())) return
  const key = 'recurring-tasks'
  if (alreadyNotifiedToday(key)) return

  const today = formatDate(new Date())
  const pending = await db.tasks
    .filter((t) => t.sourceRecurringId !== undefined && t.dueDate === today && !t.done)
    .count()

  if (pending > 0) {
    await sendDesktopNotification(
      '周期计划提醒',
      `今天还有 ${pending} 个周期计划任务未完成，别忘了。`,
    )
  }
  markNotifiedToday(key)
}

async function checkCountdownReminders(settings: NotificationSettings): Promise<void> {
  if (!settings.countdownReminderEnabled) return

  const today = formatDate(new Date())
  const todayStart = new Date(`${today}T00:00:00`).getTime()
  const countdowns = await db.countdowns.toArray()

  for (const c of countdowns) {
    // Midnight-to-midnight distance so the target day itself counts as 0
    const daysLeft = Math.round(
      (new Date(`${c.targetDate}T00:00:00`).getTime() - todayStart) / 86400000,
    )
    if (![30, 14, 7, 3, 1, 0].includes(daysLeft)) continue

    const key = `countdown-${c.id}`
    if (alreadyNotifiedToday(key)) continue

    const text =
      daysLeft === 0
        ? `「${c.title}」就是今天！`
        : `「${c.title}」还有 ${daysLeft} 天`
    await sendDesktopNotification('倒数日提醒', text)
    markNotifiedToday(key)
  }
}

/**
 * 事件提醒（V9 落地）：事件发生前 reminder 分钟触发一次桌面通知。
 * 去重键按「事件实例」（id + date + startTime）记录，避免同一次发生重复提醒，
 * 事件改期后自动生成新键、可再次提醒。不设 08:00 门禁（清晨事件也能提醒）。
 */
async function checkEventReminders(): Promise<void> {
  const nowMs = Date.now()
  const events = await db.events.toArray()

  for (const ev of events) {
    if (!ev.reminder || ev.doneAt) continue
    const minutes = Number(ev.reminder)
    if (!Number.isFinite(minutes) || minutes < 0) continue

    const timeStr = ev.allDay ? '00:00' : ev.startTime || '00:00'
    const [h, m] = timeStr.split(':').map(Number)
    const eventMs = new Date(
      `${ev.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
    ).getTime()
    if (Number.isNaN(eventMs)) continue

    const reminderMs = eventMs - minutes * 60_000
    // 仅在 [提醒时刻, 事件时刻] 窗口内提醒一次
    if (nowMs < reminderMs || nowMs > eventMs) continue

    const key = `event-${ev.id}-${ev.date}-${timeStr}`
    if (localStorage.getItem(LS_PREFIX + key)) continue

    const label =
      minutes >= 1440
        ? `${Math.round(minutes / 1440)} 天`
        : minutes >= 60
          ? `${Math.round(minutes / 60)} 小时`
          : `${minutes} 分钟`
    await sendDesktopNotification(
      '日程提醒',
      `「${ev.title}」将在 ${label}后开始${ev.startTime ? `（${ev.startTime}）` : ''}`,
    )
    localStorage.setItem(LS_PREFIX + key, '1')
  }
}

/**
 * Mount once in the main window. Runs the reminder checks every minute
 * while the desktop app is resident (tray keeps the process alive).
 */
export function useDesktopNotifications(): void {
  useEffect(() => {
    // Only run in the desktop shell's main window
    if (!isDesktop() || isQuickMemoWindow()) return

    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    const runChecks = async () => {
      if (cancelled) return
      const settings = getSettings()
      try {
        // 事件提醒不受 08:00 门禁约束（清晨会议/日程也要提醒）
        await checkEventReminders()
        // 其余每日提醒避免过早打扰
        const now = new Date()
        if (now.getHours() < 8) return
        await checkDailyReviewReminder(settings)
        await checkRecurringReminder(settings)
        await checkCountdownReminders(settings)
      } catch (err) {
        console.warn('[Workbench] Notification check failed:', err)
      }
    }

    runChecks()
    timer = setInterval(runChecks, 60_000)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [])
}
