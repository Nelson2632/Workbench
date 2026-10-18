import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import ToastBridge from '@/components/ui/ToastBridge'
import V9SearchDialog from '@/components/search/V9SearchDialog'
import LoadingFallback from '@/components/ui/LoadingFallback'
import ErrorBoundary from '@/components/ErrorBoundary'
import AppLayout from '@/components/layout/AppLayout'
import SearchDialog from '@/components/search/SearchDialog'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDesktopNotifications } from '@/hooks/useDesktopNotifications'
import { useThemeInteraction } from '@/hooks/useThemeInteraction'
import { useRecordStore } from '@/stores/recordStore'
import { isDesktop, isQuickMemoWindow } from '@/desktop'
import '@/styles/global.css'
import '@/styles/animations.css'
import '@/styles/motion.css'
import '@/styles/v9-motion.css'

const TodayPage = lazy(() => import('@/pages/today/TodayPage'))
const NightShutdownPage = lazy(() => import('@/pages/work/NightShutdownPage'))
const LifeLayout = lazy(() => import('@/pages/life/LifeLayout'))
const DiaryPage = lazy(() => import('@/pages/life/DiaryPage'))
const DiaryCalendarPage = lazy(() => import('@/pages/life/DiaryCalendarPage'))
const EventsPage = lazy(() => import('@/pages/life/EventsPage'))
const FriendsPage = lazy(() => import('@/pages/life/FriendsPage'))
const MaterialsPage = lazy(() => import('@/pages/life/MaterialsPage'))
const PlayLayout = lazy(() => import('@/pages/play/PlayLayout'))
const AnimePage = lazy(() => import('@/pages/play/AnimePage'))
const GamesPage = lazy(() => import('@/pages/play/GamesPage'))
const MusicPage = lazy(() => import('@/pages/play/MusicPage'))
const TimelinePage = lazy(() => import('@/pages/cross/TimelinePage'))
const DailyMemoryPage = lazy(() => import('@/pages/cross/DailyMemoryPage'))
const CollectionPage = lazy(() => import('@/pages/cross/CollectionPage'))
const NavigatorPage = lazy(() => import('@/pages/cross/NavigatorPage'))
const V9SettingsPage = lazy(() => import('@/pages/system/V9SettingsPage'))
const MigrationPage = lazy(() => import('@/pages/system/MigrationPage'))
const PlanLayout = lazy(() => import('@/pages/plan/PlanLayout'))
const InboxPage = lazy(() => import('@/pages/plan/InboxPage'))
const TodayPlanPage = lazy(() => import('@/pages/plan/TodayPlanPage'))
const FuturePage = lazy(() => import('@/pages/plan/FuturePage'))
const RecurringPage = lazy(() => import('@/pages/plan/RecurringPage'))
const ProjectsPage = lazy(() => import('@/pages/plan/ProjectsPage'))
const StudyLayout = lazy(() => import('@/pages/study/StudyLayout'))
const DashboardPage = lazy(() => import('@/pages/study/DashboardPage'))
const KnowledgePage = lazy(() => import('@/pages/study/KnowledgePage'))
const MistakesPage = lazy(() => import('@/pages/study/MistakesPage'))
const FlashcardsPage = lazy(() => import('@/pages/study/FlashcardsPage'))
const ExamsPage = lazy(() => import('@/pages/study/ExamsPage'))
const ReadingPage = lazy(() => import('@/pages/study/ReadingPage'))
const RecordLayout = lazy(() => import('@/pages/record/RecordLayout'))
const MemosPage = lazy(() => import('@/pages/record/MemosPage'))
const NotesPage = lazy(() => import('@/pages/record/NotesPage'))
const ReviewLayout = lazy(() => import('@/pages/review/ReviewLayout'))
const DailyReviewPage = lazy(() => import('@/pages/review/DailyReviewPage'))
const SubjectReviewPage = lazy(() => import('@/pages/review/SubjectReviewPage'))
const WeeklyReviewPage = lazy(() => import('@/pages/review/WeeklyReviewPage'))
const MonthlyReviewPage = lazy(() => import('@/pages/review/MonthlyReviewPage'))
const ExamReviewPage = lazy(() => import('@/pages/review/ExamReviewPage'))
const TemplatesPage = lazy(() => import('@/pages/review/TemplatesPage'))
const ToolsLayout = lazy(() => import('@/pages/tools/ToolsLayout'))
const PomodoroPage = lazy(() => import('@/pages/tools/PomodoroPage'))
const PomodoroFloatPage = lazy(() => import('@/pages/tools/PomodoroFloatPage'))
const RandomPage = lazy(() => import('@/pages/tools/RandomPage'))
const FinancePage = lazy(() => import('@/pages/tools/FinancePage'))
const CountdownsPage = lazy(() => import('@/pages/tools/CountdownsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const VaultPage = lazy(() => import('@/pages/VaultPage'))
const QuickMemoPage = lazy(() => import('@/pages/quickmemo/QuickMemoPage'))

function AppInner() {
  const isMemoWindow = isQuickMemoWindow()
  useKeyboardShortcuts()
  useDesktopNotifications()
  useThemeInteraction()

  // Sync memo stream when the quick memo floating window saves a memo
  useEffect(() => {
    if (!isDesktop() || isMemoWindow) return
    let disposed = false
    let unlisten: Array<() => void> = []

    import('@tauri-apps/api/event')
      .then(async ({ listen }) => {
        unlisten.push(
          await listen('wb-quick-memo-saved', () => {
            useRecordStore.getState().loadMemos()
          }),
        )
        unlisten.push(
          await listen('wb-pomodoro-completed', () => {
            void import('@/stores/toolStore').then(({ useToolStore }) => {
              useToolStore.getState().loadPomodoroLogs()
            })
          }),
        )
        if (disposed) unlisten.forEach((fn) => fn())
      })
      .catch((err) => console.warn('[Workbench] Event listen failed:', err))

    return () => {
      disposed = true
      unlisten.forEach((fn) => fn())
    }
  }, [isMemoWindow])

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        {!isMemoWindow && <SearchDialog />}
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/today" replace />} />
            <Route
              path="today"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <TodayPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="today/night-shutdown"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageWrap>
                      <NightShutdownPage />
                    </PageWrap>
                  </Suspense>
                </ErrorBoundary>
              }
            />

            <Route
              path="life"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <LifeLayout />
                  </Suspense>
                </ErrorBoundary>
              }
            >
              <Route index element={<Navigate to="/life/diary" replace />} />
              <Route path="diary" element={<PageWrap><DiaryPage /></PageWrap>} />
              <Route path="diary-calendar" element={<PageWrap><DiaryCalendarPage /></PageWrap>} />
              <Route path="events" element={<PageWrap><EventsPage /></PageWrap>} />
              <Route path="friends" element={<PageWrap><FriendsPage /></PageWrap>} />
              <Route path="materials" element={<PageWrap><MaterialsPage /></PageWrap>} />
            </Route>

            <Route
              path="play"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <PlayLayout />
                  </Suspense>
                </ErrorBoundary>
              }
            >
              <Route index element={<Navigate to="/play/anime" replace />} />
              <Route path="anime" element={<PageWrap><AnimePage /></PageWrap>} />
              <Route path="games" element={<PageWrap><GamesPage /></PageWrap>} />
              <Route path="music" element={<PageWrap><MusicPage /></PageWrap>} />
            </Route>

            <Route path="timeline" element={<PageWrap><TimelinePage /></PageWrap>} />
            <Route path="memory" element={<PageWrap><DailyMemoryPage /></PageWrap>} />
            <Route path="collection" element={<PageWrap><CollectionPage /></PageWrap>} />
            <Route path="navigator" element={<PageWrap><NavigatorPage /></PageWrap>} />
            <Route path="settings/v9" element={<PageWrap><V9SettingsPage /></PageWrap>} />
            <Route path="migration" element={<PageWrap><MigrationPage /></PageWrap>} />

            <Route
              path="plan"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <PlanLayout />
                  </Suspense>
                </ErrorBoundary>
              }
            >
              <Route index element={<Navigate to="/plan/inbox" replace />} />
              <Route path="inbox" element={<PageWrap><InboxPage /></PageWrap>} />
              <Route path="today" element={<PageWrap><TodayPlanPage /></PageWrap>} />
              <Route path="future" element={<PageWrap><FuturePage /></PageWrap>} />
              <Route path="recurring" element={<PageWrap><RecurringPage /></PageWrap>} />
              <Route path="projects" element={<PageWrap><ProjectsPage /></PageWrap>} />
            </Route>

            <Route
              path="study"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <StudyLayout />
                  </Suspense>
                </ErrorBoundary>
              }
            >
              <Route index element={<PageWrap><DashboardPage /></PageWrap>} />
              <Route path="knowledge" element={<PageWrap><KnowledgePage /></PageWrap>} />
              <Route path="mistakes" element={<PageWrap><MistakesPage /></PageWrap>} />
              <Route path="flashcards" element={<PageWrap><FlashcardsPage /></PageWrap>} />
              <Route path="exams" element={<PageWrap><ExamsPage /></PageWrap>} />
              <Route path="reading" element={<PageWrap><ReadingPage /></PageWrap>} />
            </Route>

            <Route
              path="record"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <RecordLayout />
                  </Suspense>
                </ErrorBoundary>
              }
            >
              <Route index element={<Navigate to="/record/memos" replace />} />
              <Route path="memos" element={<PageWrap><MemosPage /></PageWrap>} />
              <Route path="notes" element={<PageWrap><NotesPage /></PageWrap>} />
            </Route>

            <Route
              path="review"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ReviewLayout />
                  </Suspense>
                </ErrorBoundary>
              }
            >
              <Route index element={<Navigate to="/review/daily" replace />} />
              <Route path="daily" element={<PageWrap><DailyReviewPage /></PageWrap>} />
              <Route path="subject" element={<PageWrap><SubjectReviewPage /></PageWrap>} />
              <Route path="weekly" element={<PageWrap><WeeklyReviewPage /></PageWrap>} />
              <Route path="monthly" element={<PageWrap><MonthlyReviewPage /></PageWrap>} />
              <Route path="exam" element={<PageWrap><ExamReviewPage /></PageWrap>} />
              <Route path="templates" element={<PageWrap><TemplatesPage /></PageWrap>} />
            </Route>

            <Route
              path="tools"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <ToolsLayout />
                  </Suspense>
                </ErrorBoundary>
              }
            >
              <Route index element={<Navigate to="/tools/pomodoro" replace />} />
              <Route path="pomodoro" element={<PageWrap><PomodoroPage /></PageWrap>} />
              <Route path="random" element={<PageWrap><RandomPage /></PageWrap>} />
              <Route path="finance" element={<PageWrap><FinancePage /></PageWrap>} />
              <Route path="countdowns" element={<PageWrap><CountdownsPage /></PageWrap>} />
            </Route>

            <Route
              path="settings"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <SettingsPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route
              path="vault"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
                    <VaultPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
          </Route>

          {/* Standalone quick memo floating window (desktop: Ctrl+Shift+Space; macOS: Cmd+Shift+Space) */}
          <Route
            path="quick-memo"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <QuickMemoPage />
                </Suspense>
              </ErrorBoundary>
            }
          />

          {/* Standalone pomodoro floating window (desktop) */}
          <Route
            path="pomodoro-float"
            element={
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <PomodoroFloatPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

function PageWrap({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <div key={location.pathname} className="anim-page-enter">
          {children}
        </div>
      </Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ToastBridge />
        <AppInner />
        <V9SearchDialog />
      </ToastProvider>
    </BrowserRouter>
  )
}