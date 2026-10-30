import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { liveQuery } from 'dexie'
import { db } from '@/db/database'
import { loadNotificationSettings, type NotificationSettings } from '@/hooks/useDesktopNotifications'
import { formatDate } from '@/utils/helpers'
import styles from '@/pages/life/life.module.css'
const DISMISSED = 'wb-shutdown-reminder-dismissed'
export function shouldOfferShutdown(settings: NotificationSettings, now: Date, completed: boolean, dismissed: string | null) {
  const [h, m] = settings.reviewReminderTime.split(':').map(Number)
  return settings.reviewReminderEnabled && Number.isInteger(h) && h >= 0 && h <= 23 && Number.isInteger(m) && m >= 0 && m <= 59 &&
    now.getHours() * 60 + now.getMinutes() >= h * 60 + m && !completed && dismissed !== formatDate(now)
}
/** Desktop notifications have no portable click action. Keep a reliable in-app CTA. */
export default function ShutdownReminder() {
  const [now, setNow] = useState(() => new Date())
  const [settings, setSettings] = useState(loadNotificationSettings)
  const [completed, setCompleted] = useState(true)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED))
  const today = formatDate(now)
  useEffect(() => {
    const tick = () => { setNow(new Date()); setSettings(loadNotificationSettings()); setDismissed(localStorage.getItem(DISMISSED)) }
    const timer = setInterval(tick, 60_000)
    window.addEventListener('wb-notification-settings-changed', tick)
    window.addEventListener('storage', tick)
    return () => { clearInterval(timer); window.removeEventListener('wb-notification-settings-changed', tick); window.removeEventListener('storage', tick) }
  }, [])
  useEffect(() => {
    const subscription = liveQuery(() => db.nightShutdown.where('date').equals(today).count()).subscribe(count => setCompleted(count > 0))
    return () => subscription.unsubscribe()
  }, [today])
  if (!shouldOfferShutdown(settings, now, completed, dismissed)) return null
  return <aside className={styles.card} aria-label="可选收尾提醒">
    <p>今天要收尾了吗？</p>
    <Link to="/today/night-shutdown">进入今日收口</Link>{' '}
    <button type="button" className={styles.buttonGhost} onClick={() => { localStorage.setItem(DISMISSED, today); setDismissed(today) }}>今天先不提醒</button>
  </aside>
}
