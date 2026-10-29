import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { db } from '@/db/database'
import { DEFAULT_SETTINGS, loadNotificationSettings, checkDailyReviewReminder, NOTIFICATION_SETTINGS_KEY } from './useDesktopNotifications'
import { sendDesktopNotification } from '@/desktop'
vi.mock('@/desktop', () => ({ sendDesktopNotification: vi.fn(), isDesktop: () => false, isQuickMemoWindow: () => false }))
let storage: Map<string, string>
beforeEach(async () => {
  storage = new Map(); vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) })
  vi.mocked(sendDesktopNotification).mockClear(); await db.delete(); await db.open()
})
afterEach(() => { vi.unstubAllGlobals() })
it('new users opt out, explicit old preferences stay intact', () => {
  expect(loadNotificationSettings().reviewReminderEnabled).toBe(false)
  storage.set(NOTIFICATION_SETTINGS_KEY, JSON.stringify({ reviewReminderEnabled: true, reviewReminderTime: '22:30' }))
  expect(loadNotificationSettings()).toMatchObject({ reviewReminderEnabled: true, reviewReminderTime: '22:30' })
})
it('opt-in reminder opens Shutdown and fires once; no opt-out reminder', async () => {
  await checkDailyReviewReminder({ ...DEFAULT_SETTINGS, reviewReminderTime: '00:00' })
  expect(sendDesktopNotification).not.toHaveBeenCalled()
  const settings = { ...DEFAULT_SETTINGS, reviewReminderEnabled: true, reviewReminderTime: '00:00' }
  await checkDailyReviewReminder(settings); await checkDailyReviewReminder(settings)
  expect(sendDesktopNotification).toHaveBeenCalledTimes(1)
  expect(sendDesktopNotification).toHaveBeenCalledWith('今天要收尾了吗？', expect.any(String), '/today/night-shutdown')
})
