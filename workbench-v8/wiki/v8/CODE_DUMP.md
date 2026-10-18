# 附录：全部源码

## 根目录配置

### `package.json`

```json
{
  "name": "workbench-v8",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.11.4",
    "fake-indexeddb": "^6.2.5",
    "typescript": "~6.0.2",
    "vite": "^8.2.0",
    "vitest": "^4.1.11"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.11.1",
    "@tauri-apps/plugin-notification": "^2.3.3",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "dexie": "^4.4.5",
    "echarts": "^6.1.0",
    "echarts-for-react": "^3.0.6",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-router-dom": "^7.18.2",
    "zustand": "^5.0.15"
  }
}

```

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  // Tauri expects a fixed port and fails if it is not available
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
  // Environment variables starting with TAURI_ are exposed to the frontend
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "esnext",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "allowArbitraryExtensions": true,
    "skipLibCheck": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "ignoreDeprecations": "6.0",

    /* Strict mode */
    "strict": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

### `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})

```

### `index.html`

```html
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>个人工作台 V8</title>
    <style>
      /* Inline loading state before React mounts（mist 主题默认色，内联变量避免硬编码） */
      :root {
        --color-bg: #f7f3ee;
        --color-text-secondary: #6b6863;
        --color-accent: #c9b89a;
      }
      #app-loading {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--color-bg);
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
          'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial,
          sans-serif;
        color: var(--color-text-secondary);
        font-size: 14px;
      }
      .app-loading-dots {
        display: flex;
        gap: 6px;
        margin-bottom: 12px;
      }
      .app-loading-dots span {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-accent);
        animation: app-loading-pulse 1.4s ease-in-out infinite both;
      }
      .app-loading-dots span:nth-child(1) { animation-delay: -0.32s; }
      .app-loading-dots span:nth-child(2) { animation-delay: -0.16s; }
      .app-loading-dots span:nth-child(3) { animation-delay: 0s; }
      @keyframes app-loading-pulse {
        0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
        40% { opacity: 1; transform: scale(1); }
      }
    </style>
  </head>
  <body>
    <div id="app-loading">
      <div class="app-loading-dots">
        <span></span><span></span><span></span>
      </div>
      <div>正在加载...</div>
    </div>
    <div id="app"></div>
    <script type="module" src="/src/app/main.tsx"></script>
  </body>
</html>
```

## Tauri 配置

### `src-tauri\Cargo.toml`

```toml
[package]
name = "workbench-v8"
version = "0.8.0"
description = "个人工作台 V8 — 个人操作系统"
edition = "2021"

[lib]
name = "workbench_v8_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-global-shortcut = "2"
tauri-plugin-notification = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
codegen-units = 1
lto = true
opt-level = "s"
panic = "abort"
strip = true

```

### `src-tauri\tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "个人工作台",
  "version": "0.8.0",
  "identifier": "com.marty.workbench",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": false,
    "windows": [
      {
        "label": "main",
        "title": "个人工作台 V8",
        "width": 1280,
        "height": 800,
        "minWidth": 960,
        "minHeight": 640,
        "center": true
      },
      {
        "label": "quick-memo",
        "title": "快捷备忘",
        "url": "/quick-memo",
        "width": 440,
        "height": 320,
        "resizable": false,
        "maximizable": false,
        "visible": false,
        "decorations": false,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "center": true,
        "focus": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.ico",
      "icons/icon.png"
    ],
    "windows": {
      "webviewInstallMode": {
        "type": "downloadBootstrapper"
      },
      "wix": {
        "language": "zh-CN"
      },
      "nsis": {
        "languages": ["SimpChinese"],
        "displayLanguageSelector": false
      }
    }
  }
}

```

### `src-tauri\capabilities\default.json`

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "个人工作台 V8 默认窗口权限",
  "windows": ["main", "quick-memo"],
  "permissions": [
    "core:default",
    "core:window:allow-hide",
    "core:window:allow-show",
    "core:window:allow-set-focus",
    "core:window:allow-is-visible",
    "core:window:allow-start-dragging",
    "notification:default"
  ]
}

```

## Tauri 后端源码 (src-tauri/src)

### `src-tauri/src/lib.rs`

```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Show (and focus) the quick memo floating window
fn show_quick_memo(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("quick-memo") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
        // Tell the webview to reset its input state
        let _ = w.eval("window.dispatchEvent(new Event('wb-quick-memo-open'))");
    }
}

/// Toggle the main window visibility
fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let visible = w.is_visible().unwrap_or(false);
        if visible {
            let _ = w.hide();
        } else {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    }
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Global shortcuts (Tauri native registration)
    // Ctrl+Shift+Space — quick memo floating window
    let shortcut_memo = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
    // Ctrl+Alt+B — show/hide main window
    let shortcut_toggle = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyB);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if shortcut == &shortcut_memo {
                            show_quick_memo(app);
                        } else if shortcut == &shortcut_toggle {
                            toggle_main_window(app);
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![quit_app])
        .setup(move |app| {
            // Register global shortcuts
            let gs = app.global_shortcut();
            gs.register(shortcut_memo)?;
            gs.register(shortcut_toggle)?;

            // ---- System tray ----
            let show = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let memo = MenuItem::with_id(
                app,
                "memo",
                "快捷备忘 (Ctrl+Shift+Space)",
                true,
                None::<&str>,
            )?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &memo, &quit])?;

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("个人工作台 V8")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "memo" => show_quick_memo(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Close to tray: hide instead of exit so the app stays resident
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                } else if window.label() == "quick-memo" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

```

### `src-tauri/src/main.rs`

```rust
// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    workbench_v8_lib::run()
}

```

## 前端源码 (src)

### `src/css-modules.d.ts`

```typescript
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
```

### `src/app/App.tsx`

```tsx
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import LoadingFallback from '@/components/ui/LoadingFallback'
import ErrorBoundary from '@/components/ErrorBoundary'
import AppLayout from '@/components/layout/AppLayout'
import SearchDialog from '@/components/search/SearchDialog'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useDesktopNotifications } from '@/hooks/useDesktopNotifications'
import { useRecordStore } from '@/stores/recordStore'
import { isDesktop, isQuickMemoWindow } from '@/desktop'
import '@/styles/global.css'
import '@/styles/animations.css'

const TodayPage = lazy(() => import('@/pages/today/TodayPage'))
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

  // Sync memo stream when the quick memo floating window saves a memo
  useEffect(() => {
    if (!isDesktop() || isMemoWindow) return
    let disposed = false
    let unlisten: (() => void) | undefined

    import('@tauri-apps/api/event')
      .then(async ({ listen }) => {
        const fn = await listen('wb-quick-memo-saved', () => {
          useRecordStore.getState().loadMemos()
        })
        if (disposed) fn()
        else unlisten = fn
      })
      .catch((err) => console.warn('[Workbench] Event listen failed:', err))

    return () => {
      disposed = true
      unlisten?.()
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

          {/* Standalone quick memo floating window (desktop: Ctrl+Shift+Space) */}
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
        <AppInner />
      </ToastProvider>
    </BrowserRouter>
  )
}
```

### `src/app/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { db } from '../db/database'
import { checkDataIntegrity } from '../utils/errorRecovery'
import { migrateFromV5 } from '../db/migration'
import { setupEventSubscriptions } from './setupEvents'

// Show inline loading indicator before React mounts
const rootEl = document.getElementById('app')!
const loadingEl = document.getElementById('app-loading')

async function bootstrap() {
  // Check DB availability
  const dbAvailable = await db.isAvailable()
  if (!dbAvailable) {
    console.warn('[Workbench] IndexedDB is not available, falling back to localStorage mode')
    localStorage.setItem('wb-db-unavailable', '1')
  } else {
    localStorage.removeItem('wb-db-unavailable')
  }

  // Run V5 → V8 migration (no-op if already migrated or no V5 data)
  try {
    await migrateFromV5()
  } catch (err) {
    console.warn('[Workbench] V5 migration failed:', err)
  }

  // Set up cross-module event subscriptions
  setupEventSubscriptions()

  // Run data integrity check
  try {
    const integrity = await checkDataIntegrity()
    if (!integrity.ok) {
      console.warn('[Workbench] Data integrity issues detected:', integrity.issues)
    }
  } catch (err) {
    console.warn('[Workbench] Data integrity check failed:', err)
  }

  // Remove inline loading indicator
  if (loadingEl) {
    loadingEl.style.opacity = '0'
    loadingEl.style.transition = 'opacity 0.3s ease'
    setTimeout(() => loadingEl.remove(), 300)
  }

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()

```

### `src/app/setupEvents.ts`

```typescript
// ============================================================
// Personal Workbench V8 — 事件订阅装配（跨模块联动）
// ============================================================

import { eventBus } from '@/domain/events/eventBus'
import { useProjectStore } from '@/stores/projectStore'
import { useTaskStore } from '@/stores/taskStore'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { useStudyStore } from '@/stores/studyStore'

let initialized = false

/**
 * 装配核心跨模块事件联动。幂等，仅在启动时调用一次。
 * 其余事件（pomodoro / mistake / exam / review）已在各自 store 内同步状态，
 * 跨页刷新由页面挂载时 load 覆盖，无需额外订阅端。
 */
export function setupEventSubscriptions() {
  if (initialized) return
  initialized = true

  // 任务完成 → 项目进度联动（若任务归属某项目）
  eventBus.subscribe('task.completed', async (event) => {
    const task = useTaskStore.getState().tasks.find((t) => t.id === event.taskId)
    if (task?.projectId) {
      await useProjectStore.getState().loadProjects()
    }
  })

  // 周期规则生成任务 → 刷新任务列表（今日/未来计划）
  eventBus.subscribe('recurring.generated', async () => {
    await useTaskStore.getState().loadTasks()
  })

  // 闪卡复习 → 若关联知识点，刷新学习数据（掌握度/薄弱点）
  eventBus.subscribe('flashcard.reviewed', async (event) => {
    const card = useFlashcardStore
      .getState()
      .flashcards.find((c) => c.id === event.flashcardId)
    if (card?.knowledgeId) {
      await useStudyStore.getState().loadSubjects()
    }
  })
}

```

### `src/assets/hero.png`

```text
�PNG

   IHDR  W  i   ���  �PLTE   ���~v�~v�pdu���������dZl���}u����~v�����������~v����w�\̀x����~w����������Q�}v�~v����V�~v����x��F����R����TNZ�~����g^p|u�OHU�x�I�YQ^���������|v�˱�}v�Z�|�x�xC�����x��a԰��\-�g�m�|Ċ��f4�}u�B�LEQ���q5��a�h�iׁHǟc�k�V(��X�r!ܯo�}.�m7��M�O��_�t۴}�[�o3����q�V�Y%�o�Q�Q�s0�fጅ�E�@9FX�J�h,äh�pE��H�:	�B�O��<�=��_ڋ5�r�O��d\j~:�g`mË�8	��H�:	�w�4{�O�~F��m�P�>
�=
��TϏS�@��[�LćM��I�}v��Q�4
u�m�w�]�x>�{E��YΓW�w?��Kܘ[�v@�;|q7��g�a�iބB�G�A��N�U�0p}?ԅJ�~B��_�[(��_߮t�v:��Rܡf�Yɡe�d-�j5�D�p<�L��r�I�T�p9�v1�a-����^�Z�S �U%�K��D�Q�m�f�L��e�C��?�bތO�_�T�X"�Ì�|>ŝc�e4��V�k2�k5�J��o�D�D΁DƔU�N�t�:�]%�P��k�}�v9΄I�F��P�}�L�,gG~�J�_!��[�g,�ɔ��r��M̦c�p/�}+�h'�u7�{�n1�i ԰�����0�B   |tRNS ��p#� ��T�;é���*`YJA�C�d� �S#�20�>� �|c�A��߻���s��|u�o^Y_]���?�٤?�Ǯ���}d�kecۢ8��¬�s�����������Т����Ð�}4  /:IDATx���[��0�a�	!�DH���:m�HTQ%��f_�knݛ�� �6�tV`E��g �0�0c��S�٫��r�������l����6����u��-�Uvc'����n�т?��� �4�x�PS��у�x�[��� �.i[���DX�͏��S���>�\��d{��Ճ�,�mn�E����
���H���Wؘ0x��'{b������W�X�`�3X�7�-21����`'��Ԅ��ݪ�G�?"�����V�`�pM�B#����9���J�=L�5��(Z]��(mW�>٬�`��K�Y��jϱ��Y擂s�IϳO��"X?��T.�K+mI��Oa���=��Cs�D�y)a�8�a.1[H��J`F����1K
Z�`^^�{̆)O0�|�R}���[<Z�
�Q߇�[��5���i��tt7p|iK@/a�I�v��s��J`-�c�9٬����׺�,I1ـ<6[,�� :����z/V~ѱK�t|�� ��]=��U��j{�>�"�|�f�Yqz�)��h�@n�K���|�H�k��R��?FXԐ+3#�V�����1�(FX�[���$���0}Ո�V�bxn�	�{�����@��V1�ʹ^G*iѪr��4�Am"f�
g�%xfoO�z���>�@��:R�z�XWL��S&q7p�M���:g�U*Z��^��|+i�ꍵ��bs�W�@�o�]v[���0��n�1��@�k���!|��_B�UVRź��|���������%��� ��V�`�k��;fZh��5K������>{�H=��/*tEѪ�3�x{�gŬ����yR����xO�	ST��e��哮�9v�{�ڏ��]:,���w�*m	cղ��^MQچ�.�h����p��åXh��?r�.+T����E6���i�M."fO��T��K<�]���K��1�h�Z�`�??b�	z���D@?1���=�ʔW}�QK��a<2������m���u�8���8�Xu��%��[ěD�b3o0O2D@��O����.`ӫ�����A�����evM��R`T֭��p2�j���]�X�xfuKz^�.8��&-c��T�����[���Ղ4���6ÞJS�բ����QGV��5�!u4a#�k�ڭ�f�J[WPG�����b�&�,jꪺ�v|)����	A2U��Jv���Me�|�A���ᩯ5u��hE�6_������E/bMC����%gd��q�xk�X萡�����-[u!,�[n�ȩ�Yv����,;cy��P@]�U�)�O�z�j�C�î�c�.�Y�3�aoY։�;daLD�zU�j���a8n�{�ׁF*�{����xJ;��:#.�N���{�_)Y��3�X־�r�{�B�蠺��7�-�:�����?���������/	������}�w�kw
��1��,����e���l�=�����$��\V9O�1�N�J����5��~ r�@6b�8*յ!ˮ�r;c�#���ݿi޹���٫�fo�*�ґ�[���CZ�klmӞ�I����==���i��g<��Qx��g}�֕|V+5�5%��Ƕ3�c{7�;����ZD�eȩv���VX�]��U�l2)b�DDz����'�T6�x1�̅k#e寇U�t߭O�YD9��evɗ�ڛҳ	-+��|��5����n��^��l�`�Q�����n�����O�\�EI�"��x`ծ׏���eD^��D�{̝av����ׇ�K�Wa�b�.�\��a�VR���o'�ؔ �K��t1���{.��F��)����b��J~4� �JT r���>�E��,d�S��J�KW(f�,�5>k��R�8
�������@�d.���B��È�0��{���V�wS)Z�}�k�ɬcY{/����u v�]��[�����w��f�[� �+��X+$$3�[�e���En@2�Q�|PXUtK�c���ڊ^ڲX�������&�F��s�
vy�]	�I ���0�2� d�yB��0�!�\{����]Lmk[`���Znǚ�}4�nI[�eӺV9�
11�x�*40a��Ƥ���64�aUvu�c�M5�
������xk[������`!i���<�}CQ���1�͓#�@<A���r,q��u����@��D�R���ZۙW�lLX�����|P3uϩ�5\6����`�dX(M�x����O	a4�ֈ��>om�f)���x]մހ�
6�x]q���Щ���n6v����n�rL]�)��2�Ҟ��0М�s�8�[��&���k�M0��_4AL���C����g�M���Z�QPbi��Oa=̾�іe3z~�:�O���2m�_�A�䩁yB��2k�M+�n�V��~�M�C����̏|'����������̊���[[;��@u��ޣum2��@��=7�����$u5��=6+y����&=�:Vq��,t$�q��j�����t���Λ���#�YV>ih`{��{'璝�c��\����ӽ�ilJTX����y �+� `��T2��{=�i�+^��2[���'�I NZc�hԴb�����e�b9׶�b:%�h#K�wUU[�^w[�1����#gAz�L���`pB�^Ko���wN5i�,px��c:�S�om1�t��$�Q��K�sI��w6�IDQ>�2|�������&�� lp �$U2:�A�	��)"�FMX�ʭ+����]�c�O0čw4j�`<̝;-򬚒��x8��3�V�(���pe������dm�"�\��6�!)�6P/��m`0���QA�^�ŷ�������ϕ_��<�;�9�n`���|����mU��uFt�TٕV9.�Pw
�����k_�4��Е	U�w
s�w����曑�U[��b���6�m����ΑYS�AD~d՚����yh��[���.�Y��R�� CZ�]9�6 S��I�B~h�Y8Dƚ�n�a����S�-�J�[���s�.U-�kSp��ӎ�dYr��o=�������Z9��I��P�3F��'T�e[����� �x��+S��U�_`��A�SZ&���ucG�6�MY����z�\��(�%�}�d�É�p�s}hYL���u�Q�j�,��q#i��岼U���J�)�J~8me���?�ڳZ̀2�nAD�vm�/�>��,b�U$��Ԭ�t��Jj ��b��Ӭy6[Yn��N��732UR��'�-��pӬ#VG�ɪ��d��buIv�)A ����uں���@�F��I�Δ�t/Dr�>�َ#VE[MFA ;	�z�m��X��b�X�(`q4~#���.V7͚ͳ����V4u���O�Bڦ��6�t��s_��Q#s�I�?������-�h8	��d
7j����a�#ֹ��3� ���Њ�lڏiV.8m��/ƭ,�A����@4�H�ɴ��T�1b�x~���f�S��.�j���\����\���|x �(�eS�'�A��U�a�"Wm ?΅o��,8�V~�-�s��u5���Cm�a.�Ī�/Ѓ���o��~���p�^��{�ѓm ?ѫ�������X������G �TR_��wO��m[�.�V�V���g���o*���,��ޘ��b�I� ��H��R�  zu��A��k�3ab�V'jjG�%��	b+Q�� �}�kx5���r��PVX�$�;�����֦d�)B�:��[��G��%�x���*u����u5�P�)5�b_b�������/��,�WQb=nT 8h�����躮hQ
zu��S?r��
�l�`Y���7��l{�{g��,�||V�4���EX.V����/4���A�z�ճ�����6��a9�t��Y�c��~�m�o/�S	�?��_�?z�n����޳d1��_-u���(�/�ݿkSQ���V� ox�>�K!��:h
Qj���D$��/ĩ8��!"�"����dPi#c�G#�-��B����ڸ���֓�������\�9��6�Հռ;09|b���2����_2�LZ�v�g�g�<�3z���5�x�֙?��������pz���-wW�F�_9PKkN���(����|d��u_q�1ݓ쮉�L�l��D3{+�y=3fl����������n�#T�=j�h�{+�@�����Ļ �u�8��VA�%���\4�tX�vn4�/֝5k �
C7�y�j=�Xn	磽���S��[̞a�h֠] �C��1��2Ҍ58W�+��f�F��g�1�؇#���aow�
;��9��b��:�H�ZS�w]mu��_z����nboY�5�s-�k����x��g؝e�B�f���,ѶJv͵ݹ�HpG�Q��A�4rh���[�5P6��֗S�q��D<,�k�W�z�#�čF��Z*�vb4�o�@�}챠��^.ק)� ����c�u��V��;�H�ΖP
���uGt�	F�1X(o ����\�b�ن�j�:�HOW�r�K��ॱ~]�r��6(o���ӻl���-��y �#,ז�K�͕��	��B�D��ZH%(ٍa��niUKO	O�j�F�7`��p�XAsm�<�8��|�v-1M�2���|���Oj����	O���Jp��T�W�q*�=N�3K])uW��W�k�	,�Y�k�u�<��+����X������V���-����@�>I��n4�ݡ�G�qOr^����"fњ��xaIki[���+JJY|�C�uƄju���b���V�5�]KYT��;�X�8��ag��ta��X���XI�!^��HDb#�N�V[�p8s\3c8L�cΠ͐��z�i��嶣�C���^�c�x���4�.�I~�����9?k���c��������R0>g���
�V�?/�����A'^�b/�1���V#�,2��)���^��3���A�}G�GR�#O�;+c�<��  .9X����[���==�`���F`pG�A��K�����p�x>oB� � )�$`�t���C|�f���3��!T0��ᧅ�0B��`���㸕8m�ru�Slpg%p��P����N>l�������t��C�z��Wr�\|�@(�ou�z]|V~Z��4����nx�!T`���#�9C5͎�-���՜߆���!��P��P6^Jt�:�(�֠jn�{��BD�>��SqG�7�d�>yɵ�=&<�;�E0�.��01��ǲ֘t���
	1ZTf�M�=z���2j,���]�)�9��\k;%v��\��ʙ��5"@�� �qh�!&���&�����ʔ�J�?:p{��^�� P�H�4������76eH��%��7�jw�����0����N�\tN$���6��A[�N�C��]L\�4h�`���gN.�0dȎ�ܥ�K_��jι�l���yQtyA�1�����@G�^O��5���b:q��j�Q��[�U�g�68�dhd��c�R�Ӄ�;{��z�_c�!�� ��@'���<��˵s�ŻEcg�ǀ�y5���\�ɣ��8=;ؗO�آ!���i���R��ԷfgȦ��C��.A��+�ʑ�];פ�Ԙ/��x#d�bj�5W�4��i��~K�����*�
��l�.x�z$Rl6�}0'[��GY�B��wJ��-�� �nV�B��M��}Np)����0�?`4���+6�3׈�]�o
�[�r��n��4�T�
���O��K���lχ忴���T����(�i��F�h�j�{��QӹO��b$}��>h�N��L:�J�"�b�J�;���:M}���cv}.�l�c�%����n�(��m#�q������Qh�+���T*��w�?�b�sq��.y�� )�������JR�Uf���aLC�5s���bC�2����o� �ڒ�"��^Ӳ��?h���ݔ |<�5����͞��r"%$bkL��l�-�j�1��hRU��� ��X=�wN}�����&��{��I�ЫF�2�S�]*�s�� g�A�P3r������	�X"u$-���l��(��{{�P5MeHI��=��w����j6wU	iR���T�oYw*p7�r)Ҋ
B:���g�I�	]�r�v{!r�&���Ŭ�i��L�4� �F�4��F�����޲�*�T@�$��$����W<��{�X,��τ��һV�$ؔ�S�m��.����l̘b��7�Q���GUUMڪ�Ju��c��l�E5.�s6'�䤽��#��{�T,�<��������NV�}�R~��A0����e�<��X��(�ǄV��,�Q�MEiﳩ�� �%�Ҽ�|�������hRJ�S��{G��V��x��D��i�H"!�������_�e^Jp�ǎ�/8�t*}7����K����*U5ն9�w�a.�G9�Cj��Iɖ�������[Ҋ�xI�9X1�[�ٽh�?��N�}�UA���R��e�U��z]��o�W%��h/M����!�_�;��8�����>���x� "�8#Dq߄!� ��5#�XuO��s�[���Zt�`���jK#���o�����vڷ�7��|��v{4���յƆL������4X���tK'���w���\]���ڜ#�.�nS�#���$��K+R�L�T:�c�Z����9?A�/`v����v�5`��N�)�Sמ<ִ�fY!j٘���]��O����zN��U��l�#xb�`RKj����4[fv�a<߶�'��"���4�P�w��?^֊��'ٔ�0��Ƚ����Z��ye�T� �����T_�9pr����3����`��]�9d��-�üW�_�;׭�/?֒QhJ|�#X���%gw���`��ɉ�R�+�W�t���
��N�x� U:Vz�<7g1���n��l�0����ͩ�k�?y�����a��0b^-��W��O��U�����6Ǩ�k�[&ԯiH�[҇�~���h�1 ��[��8�n>w���Ѓ}p��˗�I�'�B(���E�J�����f������7���\�6�+ >׉U�i��'WAIP.?�qoȟ��{�!;�9��t&����cj5_�p�ub�}��f�Q�|���E��2��	�����X�c��:GuH�8����u��}ǎev��3W���_*�?�6����A�E��c�x�1�P��go��M����y�!����j���Ӯ����B����S����3�O����b���r�\޽��X�5+$�<!��@%d�4*$�����m�}�j���5*l�WT�a��0L/�Y�%�ʼ9�şU�!�>?ؕٻ�b���h����)<,b���wwu��A��ߤm�E���D0d[:�\�-Ř���0�O��M=X2�ş��%/ʥMG�E�A)�8���'�Gⲱ�(j�}wY�fu���W�]W�	?<i|RBp�D`�Hb���d���q;5�[���n=J�ӏ�_�\,|	�pP��� aJ=Bi�["��"7VwhFt�7���O�8yhW X�K�0��V_�z�f	���Ǉ��X���u(-_{�q1YL��e!쁡�
`���5�zK�H��]�t�zw�;��k��KڪQ����b�(C��u �#lY?0 ���������P��h%>���O��V�|"�%�����2W����=�f�H��08c\�b�)���C� ��Z���[����D@,ߣ�gI*Œz��+�%Hhy\2.l�<�zwy`�ڵ�Ϊs��F��[�HQ�U�	�B(�X�~�,�����n*$�dE����"P�� P� �%������U���&�A���;L��<����D �lo0��l[q�h�"�6cZ��vbc-	�r�#,)��U�� aKS�D.�����}i�v��]��Ugmv�ge�)��ۍJ]���aTy�����?��Y�"ؓEO!��J\)8=�Г���_���?��;�|��sӄ��7˒y�����K��u��v�+�(����e�Tf�2BI��= ����/�tYN�������_�q��~g��6�Uϙٷ�f��Opՠޓ�{$cL�犻B�*�r4����y���
b�b����(�o��|#�2��{u⟝��}�t�y~����k��םs�ܫ�w�a�\<?��W$�Mk��<ۣ��)��I��׸x$h�����	���<u�ի����6c�߹���ۨ޻i�W���Ͻo�\(y�}�� t�.�@-7�l���1%�.] A��c����o��O��s7رn.�?�����9�˨�ɫ;w�|���ͪ�����~��S!>5*�Vnl��߀y*!��-����z�wy��x��\''qA���X�EA��Ny�6Dh��bգU���+���]��(�M�z�
-�4��V��7N�l���#�'�'��;f>`����hi��Ǐ��p[�aFD�P�����g��+�μ�8��g�\����v�eJ���}�*!7�f�KG/�[[�j�j��M(��5Bb�YAF\�3�<���u0��ȫ{��|��2g��)�5��g�G�ˆ��ג��um=����\.�U_�
���q�O�
Gi^$"�.�������s�b���
�����fCw�E�~Y/��d�+ ��Y����-��V�2��پ� UR�L�(ǈG�k�n�ˬ\�/�O��]0v�|n:N�1������ix�o/��_&r���'���Xj�ێ��*B8s�J�\Pf���@��g^ֿ���4���I��8fѝ6Ɠ�e�dG.�E	ɮX�ƬbJIdφ�.4K"E�#�1�Er�"
�-��GN���;{㥪���:2]w����*bq�w������j㲯E$[��2V��pR��  [ۜ>�{��=�n�jk��T�
�4���w�hN����5��r���Q��jf7h�roɄ\|�U"�bS!B��6j�6��) S�-ίeWr��p�մ0N>�OG�nZ[�` �:s���7��DdI�f'I���oȥ�K;�J+�0�A�YMSk��!,x����V����'q�p=�?=��=�ۭ<9_�imͦ3�=Ej�%����s�ݣ�g$��9Q
+�6G�TT�?|�y�4�R�-4��<�]��?��ξ��@����:n��������3݄Bm����Ffwi�z�+S��� �%�~H�<|UBa���a
$hZ��K�^ʵ 9��Ք�[o��Vo�=�
���d>�'���
�]�:����]��0�����~@�EAP�xCguvʐX�!i֤��/`i>[���G5�Bi���l�(�%g�����'�;�>�A���'�����ͧ���^v�$��(��ۼ�|�������v2���z ӬY�������j��3Im��[�9ĵ �:����۳�w�����y����p�5��	o#Q���������aD�������ε� Z�ȳF���n?��z����
�6���3��$����o� ��~Z �6��)A:�>b�\)6�"#uw:5���}��y<c[��%��aL�ޛxR��W����g���X��e뷘��6C�&M��H�}��Q�#L�&Vr8�絆����\��5�2���`'�g`%6Q�i5�4��^��|>L>f�О�@��[}W-d��Qʈ*�u�Cj9=b����������g���c�^��[�a�%	���X^6pҸ�'[��
x�[��-��E�&��
 D���f�G��+ؘB`��yѹ����[�S�z4r���Q��WZ�3g��5������e5t�fA<��)DVRuNʙ�N+��T�E�LK�0�As�#���]��$�cSx�K� �8��Q���ǃ�j|��d<�=�xd���غ�K�Hx�Q�X��FH��(f�>���S���܅j�X�z ��cS�&ʍ���V��״e����sK�X���*q:�%N"���ZqC��E.W�97����p{Q�ȕ��=}����$k&$��@{��7��մ�d�K���9�zeU�fP*��OU�0�e9�ϊy��]��\��p���q�Jy�ѵ�{u�����o=(���{�������|���v�U����Vʁ���s5ձ����$eU�>�ˢ,�o�9��,�r7�'x\�w̠,���U8�~�3lM���g���<��^�0�ީ�YdU�y������8��^������윻��0����8�(N�� ���88H� �$�6$J
5K�&�Gɠ\>���.]�.".�����<>thׇ����M�����e�$�@��A²l)���{�.lo�[�CC�N)VG�8�o�"���{s����,[۸��=��Z�6�-��Q�~��h�Y��r��׺�j�^���mUF6�1PJ%��O������n����2Z�a'�	;��?t���@9�U��[C��!����%���'��W�~�#�?C�/-���\�l�m�B��/7�7���	CM�F����*��ց�{��p�����9����i��d���<�N���z]bK����[w�<y�p5�گ?��ӵ��(��"�c:�i|��p�z�y��wg"	9g�}ad�B��##��	�`���h�괫�ܹ��!�b��ww7�_�OY�n�7���Mf[I0�鉤�wo=ؾ�]���u|�R���J  4F�aB�vKq"`�81�����l}N�c\�5V�OZO!��O��׳C����%rp�iI��av	�cy^n��6�q���!4�Vhc!���$�@6(t�)��j$]}����e�:��WϮ�����^��m�9kj�9��,����b�>h7y��um�H�V�F!`�(�JZ��P����@rJV��������̏x��o*Z��D�<�>��X�-6��e*��:h�sTP�'� �j�D@T�B���E=OS���u��8'/u�B���M�_Ю�.����Iϝ�w߮��
���L�R����piB@�%a܋��#,'�s�Ma��M�\���g=�pRc�+v�mrLZt����.6�:챷I��g\�0 ��o�&0ƛr.��yܭ���M��
��`�og�����U�n��MWnV_�~�=��4�Ć�7��@�q �;��U�҅s��@��M:t�Z��N!}~ǿ��W���]����j�K��͚nJ�mT8 $�rB�V�-����4-sW�uYt�E���m����.Gp��z-����x^m�4((���Y64�� + \9+�0@�BU#4�1y�הu뎋����~&�{Sz����
�F����1aeC��$"@�VCc ,o�`�"�AE����S�}���5m�q�v.W�|�8y<N)��5p�`��0�~B�*��Х��H��J�%-�<ۮX� �'���-��m���s�<نF�!  ϊ�V�@Ҳ�e �8�-r[P��S�������#`Pw���}�b���P�HEi�mK �lc� 1؈ �@��)G?y_��m����6wǢC����'��ɉj���{�:��G %��t��uL��p�_�V���k���.��ian0V��ŭ�,�9e���ȁ[F�P<�e��f���Y�+��ߢc�%�k����`�l$@����,����"H5Goihcz����h�Z�v���b��%1V����J:8�IH�s�"bZh��֯�=�k7�51Rܛ�C�m�m 7 (����Zv��/�?Xߵoƨ1=�q�2ur nB��*u�2۩�X��Ѡ"(,3���n!��ʇH����G�qc�R�G��<k�͇���
�� ��"�$Po	=�c�!�1B���z�7{X���, y!PA%C�葆	s�婪z	��9���i1�mv�/��t�cL,��� ���,�y�j��
��9�%��Ie:�n�%x����z,�Q5)P����k��M��;i���1;�߮�nw�C��^��lt�*7�    IEND�B`�
```

### `src/assets/typescript.svg`

```text
<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="32" height="32" viewBox="0 0 256 256"><path fill="#007ACC" d="M0 128v128h256V0H0z"/><path fill="#FFF" d="m56.612 128.85l-.081 10.483h33.32v94.68h23.568v-94.68h33.321v-10.28c0-5.69-.122-10.444-.284-10.566c-.122-.162-20.4-.244-44.983-.203l-44.74.122l-.121 10.443Zm149.955-10.742c6.501 1.625 11.459 4.51 16.01 9.224c2.357 2.52 5.851 7.111 6.136 8.208c.08.325-11.053 7.802-17.798 11.988c-.244.162-1.22-.894-2.317-2.52c-3.291-4.795-6.745-6.867-12.028-7.233c-7.76-.528-12.759 3.535-12.718 10.321c0 1.992.284 3.17 1.097 4.795c1.707 3.536 4.876 5.649 14.832 9.956c18.326 7.883 26.168 13.084 31.045 20.48c5.445 8.249 6.664 21.415 2.966 31.208c-4.063 10.646-14.14 17.879-28.323 20.276c-4.388.772-14.79.65-19.504-.203c-10.28-1.828-20.033-6.908-26.047-13.572c-2.357-2.6-6.949-9.387-6.664-9.874c.122-.163 1.178-.813 2.356-1.504c1.138-.65 5.446-3.129 9.509-5.485l7.355-4.267l1.544 2.276c2.154 3.29 6.867 7.801 9.712 9.305c8.167 4.307 19.383 3.698 24.909-1.26c2.357-2.153 3.332-4.388 3.332-7.68c0-2.966-.366-4.266-1.91-6.501c-1.99-2.845-6.054-5.242-17.595-10.24c-13.206-5.69-18.895-9.224-24.096-14.832c-3.007-3.25-5.852-8.452-7.03-12.8c-.975-3.617-1.22-12.678-.447-16.335c2.723-12.76 12.353-21.659 26.25-24.3c4.51-.853 14.994-.528 19.424.569Z"/></svg>

```

### `src/assets/vite.svg`

```text
<svg xmlns="http://www.w3.org/2000/svg" width="77" height="47" fill="none" aria-labelledby="vite-logo-title" viewBox="0 0 77 47"><title id="vite-logo-title">Vite</title><style>.parenthesis{fill:#000}@media (prefers-color-scheme:dark){.parenthesis{fill:#fff}}</style><path fill="#9135ff" d="M40.151 45.71c-.663.844-2.02.374-2.02-.699V34.708a2.26 2.26 0 0 0-2.262-2.262H24.493c-.92 0-1.457-1.04-.92-1.788l7.479-10.471c1.07-1.498 0-3.578-1.842-3.578H15.443c-.92 0-1.456-1.04-.92-1.788l9.696-13.576c.213-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.472c-1.07 1.497 0 3.578 1.842 3.578h11.376c.944 0 1.474 1.087.89 1.83L40.153 45.712z"/><mask id="a" width="48" height="47" x="14" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path fill="#000" d="M40.047 45.71c-.663.843-2.02.374-2.02-.699V34.708a2.26 2.26 0 0 0-2.262-2.262H24.389c-.92 0-1.457-1.04-.92-1.788l7.479-10.472c1.07-1.497 0-3.578-1.842-3.578H15.34c-.92 0-1.456-1.04-.92-1.788l9.696-13.575c.213-.297.556-.474.92-.474H53.93c.92 0 1.456 1.04.92 1.788L47.37 13.03c-1.07 1.498 0 3.578 1.842 3.578h11.376c.944 0 1.474 1.088.89 1.831L40.049 45.712z"/></mask><g mask="url(#a)"><g filter="url(#b)"><ellipse cx="5.508" cy="14.704" fill="#eee6ff" rx="5.508" ry="14.704" transform="rotate(269.814 20.96 11.29)scale(-1 1)"/></g><g filter="url(#c)"><ellipse cx="10.399" cy="29.851" fill="#eee6ff" rx="10.399" ry="29.851" transform="rotate(89.814 -16.902 -8.275)scale(1 -1)"/></g><g filter="url(#d)"><ellipse cx="5.508" cy="30.487" fill="#8900ff" rx="5.508" ry="30.487" transform="rotate(89.814 -19.197 -7.127)scale(1 -1)"/></g><g filter="url(#e)"><ellipse cx="5.508" cy="30.599" fill="#8900ff" rx="5.508" ry="30.599" transform="rotate(89.814 -25.928 4.177)scale(1 -1)"/></g><g filter="url(#f)"><ellipse cx="5.508" cy="30.599" fill="#8900ff" rx="5.508" ry="30.599" transform="rotate(89.814 -25.738 5.52)scale(1 -1)"/></g><g filter="url(#g)"><ellipse cx="14.072" cy="22.078" fill="#eee6ff" rx="14.072" ry="22.078" transform="rotate(93.35 31.245 55.578)scale(-1 1)"/></g><g filter="url(#h)"><ellipse cx="3.47" cy="21.501" fill="#8900ff" rx="3.47" ry="21.501" transform="rotate(89.009 35.419 55.202)scale(-1 1)"/></g><g filter="url(#i)"><ellipse cx="3.47" cy="21.501" fill="#8900ff" rx="3.47" ry="21.501" transform="rotate(89.009 35.419 55.202)scale(-1 1)"/></g><g filter="url(#j)"><ellipse cx="14.592" cy="9.743" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(39.51 14.592 9.743)"/></g><g filter="url(#k)"><ellipse cx="61.728" cy="-5.321" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 61.728 -5.32)"/></g><g filter="url(#l)"><ellipse cx="55.618" cy="7.104" fill="#00c2ff" rx="5.971" ry="9.665" transform="rotate(37.892 55.618 7.104)"/></g><g filter="url(#m)"><ellipse cx="12.326" cy="39.103" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 12.326 39.103)"/></g><g filter="url(#n)"><ellipse cx="12.326" cy="39.103" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 12.326 39.103)"/></g><g filter="url(#o)"><ellipse cx="49.857" cy="30.678" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 49.857 30.678)"/></g><g filter="url(#p)"><ellipse cx="52.623" cy="33.171" fill="#00c2ff" rx="5.971" ry="15.297" transform="rotate(37.892 52.623 33.17)"/></g></g><path d="M6.919 0c-9.198 13.166-9.252 33.575 0 46.789h6.215c-9.25-13.214-9.196-33.623 0-46.789zm62.424 0h-6.215c9.198 13.166 9.252 33.575 0 46.789h6.215c9.25-13.214 9.196-33.623 0-46.789" class="parenthesis"/><defs><filter id="b" width="60.045" height="41.654" x="-5.564" y="16.92" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659"/></filter><filter id="c" width="90.34" height="51.437" x="-40.407" y="-6.762" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659"/></filter><filter id="d" width="79.355" height="29.4" x="-35.435" y="2.801" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="e" width="79.579" height="29.4" x="-30.84" y="20.8" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="f" width="79.579" height="29.4" x="-29.307" y="21.949" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="g" width="74.749" height="58.852" x="29.961" y="-17.13" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659"/></filter><filter id="h" width="61.377" height="25.362" x="37.754" y="3.055" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="i" width="61.377" height="25.362" x="37.754" y="3.055" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="j" width="56.045" height="63.649" x="-13.43" y="-22.082" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="k" width="54.814" height="64.646" x="34.321" y="-37.644" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="l" width="33.541" height="35.313" x="38.847" y="-10.552" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="m" width="54.814" height="64.646" x="-15.081" y="6.78" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="n" width="54.814" height="64.646" x="-15.081" y="6.78" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="o" width="54.814" height="64.646" x="22.45" y="-1.645" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="p" width="39.409" height="43.623" x="32.919" y="11.36" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter></defs></svg>

```

### `src/components/ErrorBoundary.tsx`

```tsx
import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Render error caught:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          padding: 40,
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
            出了点问题
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px', maxWidth: 400 }}>
            这个组件遇到了一个错误，请尝试刷新页面恢复。
          </p>
          <button
            onClick={this.handleRefresh}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              background: 'var(--accent, #6366f1)',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            刷新页面
          </button>
          {this.state.error && (
            <details style={{ marginTop: 24, textAlign: 'left', maxWidth: 500 }}>
              <summary style={{ fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                错误详情
              </summary>
              <pre style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                background: 'var(--surface-secondary, #f8fafc)',
                padding: 12,
                borderRadius: 6,
                overflow: 'auto',
                margin: '8px 0 0',
              }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
```

### `src/components/layout/AppLayout.module.css`

```css
.layout {
  display: flex;
  min-height: 100vh;
}

.main {
  flex: 1;
  margin-left: var(--sidebar-w);
  padding: 32px;
  min-height: 100vh;
  background: var(--color-bg);
  transition: margin-left var(--transition-normal);
}

.sidebarCollapsed .main {
  margin-left: 64px;
}

/* ---- Responsive ---- */

@media (max-width: 768px) {
  .main {
    margin-left: 0;
    padding: 16px;
    padding-top: 56px; /* Space for hamburger button */
  }

  .sidebarCollapsed .main {
    margin-left: 0;
  }
}
```

### `src/components/layout/AppLayout.tsx`

```tsx
import { Outlet } from 'react-router-dom'
import { useSystemStore } from '@/stores/systemStore'
import Sidebar from './Sidebar'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  const theme = useSystemStore((s) => s.theme)
  const sidebarCollapsed = useSystemStore((s) => s.sidebarCollapsed)

  return (
    <div data-theme={theme} className={sidebarCollapsed ? styles.sidebarCollapsed : ''}>
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

### `src/components/layout/PageHeader.module.css`

```css
.header {
  margin-bottom: 24px;
}

.titleRow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.3;
}

.description {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 6px 0 0;
  line-height: 1.5;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
```

### `src/components/layout/PageHeader.tsx`

```tsx
import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  )
}
```

### `src/components/layout/Sidebar.module.css`

```css
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-w);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  z-index: 50;
  overflow: hidden;
  transition: width var(--transition-normal);
}

.collapsed {
  width: 64px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 18px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.brandIcon {
  font-size: 24px;
  flex-shrink: 0;
}

.brandTitle {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.group {
  margin-bottom: 2px;
}

.groupHeader {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  border-radius: 0;
  transition: background var(--transition-fast);
  width: 100%;
  text-align: left;
}

.groupHeader:hover {
  background: var(--color-surface-2);
}

.groupIcon {
  font-size: 18px;
  flex-shrink: 0;
}

.groupLabel {
  flex: 1;
  white-space: nowrap;
}

.arrow {
  font-size: 12px;
  color: var(--color-text-tertiary);
  transition: transform var(--transition-fast);
  flex-shrink: 0;
}

.arrowOpen {
  transform: rotate(90deg);
}

.children {
  overflow: hidden;
}

.childLink {
  display: flex;
  align-items: center;
  padding: 8px 18px 8px 46px;
  font-size: 13px;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  border-radius: 0;
}

.childLink:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.childLinkActive {
  color: var(--color-accent);
  background: var(--color-accent-light);
  font-weight: 500;
}

.bottomNav {
  border-top: 1px solid var(--color-border);
  padding: 8px 0;
  flex-shrink: 0;
}

.bottomLink {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  font-size: 14px;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  width: 100%;
}

.bottomLink:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.bottomLinkActive {
  color: var(--color-accent);
  background: var(--color-accent-light);
  font-weight: 500;
}

.bottomIcon {
  font-size: 18px;
  flex-shrink: 0;
}

/* ---- Hamburger Menu Button (Mobile) ---- */

.hamburger {
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 60;
  width: 40px;
  height: 40px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}

.hamburgerLine {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--color-text-primary);
  border-radius: 1px;
  transition: all var(--transition-fast);
}

/* ---- Mobile Drawer ---- */

.mobileDrawer {
  transform: translateX(-100%);
  transition: transform var(--transition-normal);
  z-index: 70;
  box-shadow: var(--shadow-lg);
}

.mobileDrawerOpen {
  transform: translateX(0);
}

.overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 65;
  animation: fadeIn 0.2s ease;
}

.mobileCloseBtn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  background: none;
  border: none;
  cursor: pointer;
  z-index: 1;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.mobileCloseBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ---- Responsive ---- */

@media (max-width: 768px) {
  .hamburger {
    display: flex;
  }

  .overlay {
    display: block;
  }

  .mobileDrawer {
    display: flex;
  }
}
```

### `src/components/layout/Sidebar.tsx`

```tsx
import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useSystemStore } from '@/stores/systemStore'
import styles from './Sidebar.module.css'

interface NavGroup {
  id: string
  icon: string
  label: string
  path?: string
  children?: { label: string; path: string }[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'today',
    icon: '🏠',
    label: '今日',
    path: '/today',
  },
  {
    id: 'plan',
    icon: '📋',
    label: '计划',
    children: [
      { label: '收件箱', path: '/plan/inbox' },
      { label: '今日计划', path: '/plan/today' },
      { label: '未来', path: '/plan/future' },
      { label: '周期计划', path: '/plan/recurring' },
      { label: '项目', path: '/plan/projects' },
    ],
  },
  {
    id: 'study',
    icon: '🎓',
    label: '学习',
    children: [
      { label: '学习驾驶舱', path: '/study' },
      { label: '知识体系', path: '/study/knowledge' },
      { label: '错题本', path: '/study/mistakes' },
      { label: '闪卡', path: '/study/flashcards' },
      { label: '成绩追踪', path: '/study/exams' },
      { label: '阅读', path: '/study/reading' },
    ],
  },
  {
    id: 'record',
    icon: '📝',
    label: '记录',
    children: [
      { label: '备忘录', path: '/record/memos' },
      { label: '笔记', path: '/record/notes' },
    ],
  },
  {
    id: 'review',
    icon: '🌙',
    label: '复盘',
    children: [
      { label: '今日复盘', path: '/review/daily' },
      { label: '学科复盘', path: '/review/subject' },
      { label: '周复盘', path: '/review/weekly' },
      { label: '月复盘', path: '/review/monthly' },
      { label: '考试复盘', path: '/review/exam' },
      { label: '模板', path: '/review/templates' },
    ],
  },
  {
    id: 'tools',
    icon: '🛠',
    label: '工具',
    children: [
      { label: '番茄钟', path: '/tools/pomodoro' },
      { label: '随机工具', path: '/tools/random' },
      { label: '记账', path: '/tools/finance' },
      { label: '倒数日', path: '/tools/countdowns' },
    ],
  },
]

const BOTTOM_ITEMS = [
  { icon: '⚙', label: '设置', path: '/settings' },
  { icon: '🔒', label: '密码本', path: '/vault' },
]

export default function Sidebar() {
  const sidebarCollapsed = useSystemStore((s) => s.sidebarCollapsed)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    NAV_GROUPS.forEach((g) => {
      if (g.children) init[g.id] = true
    })
    return init
  })

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef<HTMLElement>(null)

  const toggleGroup = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleMobile = () => {
    setMobileOpen((prev) => !prev)
  }

  const closeMobile = () => {
    setMobileOpen(false)
  }

  // Close drawer on outside click
  useEffect(() => {
    if (!mobileOpen) return
    const handleClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        closeMobile()
      }
    }
    // Delay adding listener to avoid immediate close on toggle click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [mobileOpen])

  // Close drawer on route change (via NavLink click)
  const handleNavClick = () => {
    closeMobile()
  }

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const navContent = (
    <>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>📋</span>
        {!sidebarCollapsed && <span className={styles.brandTitle}>个人工作台</span>}
      </div>

      <nav className={styles.nav}>
        {NAV_GROUPS.map((group) => {
          if (group.path) {
            return (
              <NavLink
                key={group.id}
                to={group.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `${styles.groupHeader} ${isActive ? styles.childLinkActive : ''}`
                }
              >
                <span className={styles.groupIcon}>{group.icon}</span>
                {!sidebarCollapsed && <span className={styles.groupLabel}>{group.label}</span>}
              </NavLink>
            )
          }

          return (
            <div key={group.id} className={styles.group}>
              <button
                className={styles.groupHeader}
                onClick={() => toggleGroup(group.id)}
              >
                <span className={styles.groupIcon}>{group.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span className={styles.groupLabel}>{group.label}</span>
                    <span className={`${styles.arrow} ${expanded[group.id] ? styles.arrowOpen : ''}`}>
                      ›
                    </span>
                  </>
                )}
              </button>
              {!sidebarCollapsed && expanded[group.id] && (
                <div className={styles.children}>
                  {group.children!.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      end={child.path === `/${group.id}`}
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        `${styles.childLink} ${isActive ? styles.childLinkActive : ''}`
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {!sidebarCollapsed && (
        <div className={styles.bottomNav}>
          {BOTTOM_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `${styles.bottomLink} ${isActive ? styles.bottomLinkActive : ''}`
              }
            >
              <span className={styles.bottomIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Hamburger button (mobile only) */}
      <button
        className={styles.hamburger}
        onClick={toggleMobile}
        aria-label="打开菜单"
      >
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
        <span className={styles.hamburgerLine} />
      </button>

      {/* Desktop sidebar */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''} hide-mobile`}>
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className={styles.overlay} onClick={closeMobile} />}

      {/* Mobile drawer */}
      <aside
        ref={drawerRef}
        className={`${styles.sidebar} ${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : ''}`}
      >
        <button className={styles.mobileCloseBtn} onClick={closeMobile} aria-label="关闭菜单">
          ×
        </button>
        {navContent}
      </aside>
    </>
  )
}
```

### `src/components/search/SearchDialog.module.css`

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  justify-content: center;
  padding-top: 120px;
  animation: fadeIn 0.15s ease;
}

.dialog {
  width: 100%;
  max-width: 640px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: slideDown 0.2s ease;
  margin: 0 16px;
  align-self: flex-start;
}

.inputWrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.searchIcon {
  font-size: 20px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.input {
  flex: 1;
  font-size: 18px;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

.kbd {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 12px;
  font-family: inherit;
  color: var(--color-text-tertiary);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  flex-shrink: 0;
}

.results {
  overflow-y: auto;
  flex: 1;
  padding: 8px;
}

.group {
  margin-bottom: 4px;
}

.groupLabel {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.resultItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.resultItem:hover,
.resultItemActive {
  background: var(--color-surface-2);
}

.resultIcon {
  font-size: 16px;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
}

.resultContent {
  flex: 1;
  min-width: 0;
}

.resultTitle {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resultSubtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.moduleBadge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.loading {
  padding: 32px 16px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.footer {
  padding: 8px 16px;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.footerItem {
  display: flex;
  align-items: center;
  gap: 4px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

### `src/components/search/SearchDialog.tsx`

```tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSystemStore } from '@/stores/systemStore'
import { useTaskStore } from '@/stores/taskStore'
import { useProjectStore } from '@/stores/projectStore'
import { useRecurringStore } from '@/stores/recurringStore'
import { useRecordStore } from '@/stores/recordStore'
import { useStudyStore } from '@/stores/studyStore'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { useReviewStore } from '@/stores/reviewStore'
import type { SearchResult } from '@/types'
import styles from './SearchDialog.module.css'

const MODULE_ICONS: Record<string, string> = {
  task: '✅',
  recurring: '🔄',
  project: '📁',
  note: '📝',
  memo: '💬',
  knowledge: '📚',
  flashcard: '🃏',
  mistake: '❌',
  exam: '📊',
  review: '🌙',
  reading: '📖',
}

const MODULE_LABELS: Record<string, string> = {
  task: '任务',
  recurring: '周期任务',
  note: '笔记',
  memo: '备忘录',
  knowledge: '知识',
  flashcard: '闪卡',
  mistake: '错题',
  exam: '考试',
  review: '复盘',
  reading: '阅读',
}

function highlightMatch(text: string, query: string): string {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

const MODULE_ICON_KEY: Record<string, string> = {
  任务: 'task',
  周期任务: 'recurring',
  项目: 'project',
  笔记: 'note',
  备忘录: 'memo',
  知识: 'knowledge',
  闪卡: 'flashcard',
  错题: 'mistake',
  考试: 'exam',
  复盘: 'review',
  阅读: 'reading',
}

export default function SearchDialog() {
  const navigate = useNavigate()
  const searchOpen = useSystemStore((s) => s.searchOpen)
  const closeSearch = useSystemStore((s) => s.closeSearch)

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get data from all stores
  const tasks = useTaskStore((s) => s.tasks)
  const projects = useProjectStore((s) => s.projects)
  const recurringTasks = useRecurringStore((s) => s.recurringTasks)
  const notes = useRecordStore((s) => s.notes)
  const memos = useRecordStore((s) => s.memos)
  const subjects = useStudyStore((s) => s.subjects)
  const flashcards = useFlashcardStore((s) => s.flashcards)
  const mistakes = useStudyStore((s) => s.mistakes)
  const exams = useStudyStore((s) => s.exams)
  const reviews = useReviewStore((s) => s.reviews)
  const reading = useStudyStore((s) => s.reading)

  // Auto-focus on open
  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  // Debounced search
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const matched: SearchResult[] = []

    // Tasks
    for (const t of tasks) {
      if (t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q)) {
        matched.push({
          id: t.id,
          type: 'plan',
          title: t.title,
          subtitle: t.note || t.dueDate || '',
          moduleLabel: '任务',
          path: '/plan/inbox',
        })
      }
    }

    // Recurring tasks
    for (const rt of recurringTasks) {
      if (rt.title.toLowerCase().includes(q) || (rt.category && rt.category.toLowerCase().includes(q))) {
        matched.push({
          id: rt.id,
          type: 'plan',
          title: rt.title,
          subtitle: rt.category || '',
          moduleLabel: '周期任务',
          path: '/plan/recurring',
        })
      }
    }

    // Projects
    for (const p of projects) {
      if (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q)
      ) {
        matched.push({
          id: p.id,
          type: 'plan',
          title: p.title,
          subtitle: p.description.slice(0, 80) || '',
          moduleLabel: '项目',
          path: '/plan/projects',
        })
      }
    }

    // Notes
    for (const n of notes) {
      if (n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) {
        matched.push({
          id: n.id,
          type: 'record',
          title: n.title,
          subtitle: n.body.slice(0, 80) || '',
          moduleLabel: '笔记',
          path: '/record/notes',
        })
      }
    }

    // Memos
    for (const m of memos) {
      if (m.content.toLowerCase().includes(q)) {
        matched.push({
          id: m.id,
          type: 'record',
          title: m.content.slice(0, 60),
          subtitle: '',
          moduleLabel: '备忘录',
          path: '/record/memos',
        })
      }
    }

    // Knowledge (subjects)
    for (const sub of subjects) {
      if (sub.name.toLowerCase().includes(q)) {
        matched.push({
          id: sub.id,
          type: 'study',
          title: sub.name,
          subtitle: `${sub.chapters.length} 个章节`,
          moduleLabel: '知识',
          path: '/study/knowledge',
        })
      }
      for (const ch of sub.chapters) {
        if (ch.name.toLowerCase().includes(q)) {
          matched.push({
            id: ch.id,
            type: 'study',
            title: ch.name,
            subtitle: sub.name,
            moduleLabel: '知识',
            path: '/study/knowledge',
          })
        }
      }
    }

    // Flashcards
    for (const f of flashcards) {
      if (f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)) {
        matched.push({
          id: f.id,
          type: 'study',
          title: f.question,
          subtitle: f.answer.slice(0, 80),
          moduleLabel: '闪卡',
          path: '/study/flashcards',
        })
      }
    }

    // Mistakes
    for (const m of mistakes) {
      if (m.question.toLowerCase().includes(q) || m.answer.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q)) {
        matched.push({
          id: m.id,
          type: 'study',
          title: m.question,
          subtitle: `${m.subject} · ${m.answer.slice(0, 60)}`,
          moduleLabel: '错题',
          path: '/study/mistakes',
        })
      }
    }

    // Exams
    for (const e of exams) {
      if (e.name.toLowerCase().includes(q) || e.note.toLowerCase().includes(q)) {
        matched.push({
          id: e.id,
          type: 'study',
          title: e.name,
          subtitle: `${e.date} · 总分 ${e.total}`,
          moduleLabel: '考试',
          path: '/study/exams',
        })
      }
    }

    // Reviews
    for (const r of reviews) {
      const typeLabel = { daily: '日复盘', subject: '学科复盘', weekly: '周复盘', monthly: '月复盘', exam: '考试复盘' }[r.type] || r.type
      const text = r.reflections.join(' ') + ' ' + r.nextActions.join(' ')
      if (text.toLowerCase().includes(q) || typeLabel.toLowerCase().includes(q)) {
        matched.push({
          id: r.id,
          type: 'review',
          title: typeLabel,
          subtitle: `${r.dateRange.start} ~ ${r.dateRange.end}`,
          moduleLabel: '复盘',
          path: `/review/${r.type === 'subject' || r.type === 'exam' ? r.type : 'daily'}`,
        })
      }
    }

    // Reading
    for (const r of reading) {
      if (r.title.toLowerCase().includes(q) || r.note.toLowerCase().includes(q)) {
        matched.push({
          id: r.id,
          type: 'study',
          title: r.title,
          subtitle: `${r.current}/${r.target} ${r.unit}`,
          moduleLabel: '阅读',
          path: '/study/reading',
        })
      }
    }

    return matched
  }, [query, tasks, projects, recurringTasks, notes, memos, subjects, flashcards, mistakes, exams, reviews, reading])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results.length])

  const handleClose = useCallback(() => {
    closeSearch()
    setQuery('')
  }, [closeSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % Math.max(1, results.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + results.length) % Math.max(1, results.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results.length > 0) {
          const result = results[activeIndex]
          navigate(result.path)
          handleClose()
        }
      }
    },
    [results, activeIndex, navigate, handleClose],
  )

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      navigate(result.path)
      handleClose()
    },
    [navigate, handleClose],
  )

  // Group results by moduleLabel
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>()
    for (const r of results) {
      const list = map.get(r.moduleLabel) || []
      list.push(r)
      map.set(r.moduleLabel, list)
    }
    return Array.from(map.entries())
  }, [results])

  if (!searchOpen) return null

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="搜索任务、笔记、闪卡..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className={styles.kbd}>ESC</kbd>
        </div>

        <div className={styles.results}>
          {results.length === 0 && query.trim() ? (
            <div className={styles.empty}>未找到相关结果</div>
          ) : !query.trim() ? (
            <div className={styles.empty}>输入关键词开始搜索</div>
          ) : (
            grouped.map(([label, items]) => (
              <div key={label} className={styles.group}>
                <div className={styles.groupLabel}>{label}</div>
                {items.map((item) => {
                  const isActive = results[activeIndex]?.id === item.id
                  return (
                    <div
                      key={item.id}
                      className={`${styles.resultItem} ${isActive ? styles.resultItemActive : ''}`}
                      onClick={() => handleResultClick(item)}
                      onMouseEnter={() => {
                        const idx = results.findIndex((r) => r.id === item.id)
                        if (idx >= 0) setActiveIndex(idx)
                      }}
                    >
                      <span className={styles.resultIcon}>
                        {MODULE_ICONS[MODULE_ICON_KEY[item.moduleLabel] || 'task']}
                      </span>
                      <div className={styles.resultContent}>
                        <div
                          className={styles.resultTitle}
                          dangerouslySetInnerHTML={{ __html: highlightMatch(item.title, query.trim()) }}
                        />
                        {item.subtitle && (
                          <div
                            className={styles.resultSubtitle}
                            dangerouslySetInnerHTML={{ __html: highlightMatch(item.subtitle, query.trim()) }}
                          />
                        )}
                      </div>
                      <span className={styles.moduleBadge}>{item.moduleLabel}</span>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerItem}>
            <span>↑↓</span> 导航
          </span>
          <span className={styles.footerItem}>
            <span>↵</span> 打开
          </span>
          <span className={styles.footerItem}>
            <span>ESC</span> 关闭
          </span>
        </div>
      </div>
    </div>
  )
}
```

### `src/components/ui/Badge.module.css`

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
  line-height: 1.6;
  white-space: nowrap;
}

.default {
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
}

.success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.danger {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.info {
  background: var(--color-accent-light);
  color: var(--color-accent);
}
```

### `src/components/ui/Badge.tsx`

```tsx
import type { ReactNode } from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  )
}
```

### `src/components/ui/Button.module.css`

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  cursor: pointer;
  border: none;
  white-space: nowrap;
  line-height: 1;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.sm { padding: 6px 12px; font-size: 13px; }
.md { padding: 8px 16px; font-size: 14px; }
.lg { padding: 12px 24px; font-size: 16px; }

/* Variants */
.primary {
  background: var(--color-accent);
  color: var(--color-accent-text);
}
.primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.secondary {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
.secondary:hover:not(:disabled) {
  background: var(--color-surface-2);
}

.danger {
  background: var(--color-danger);
  color: #fff;
}
.danger:hover:not(:disabled) {
  background: #dc2626;
}

.ghost {
  background: transparent;
  color: var(--color-text-secondary);
}
.ghost:hover:not(:disabled) {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}
```

### `src/components/ui/Button.tsx`

```tsx
import type { ReactNode, ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
```

### `src/components/ui/Card.module.css`

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-normal), transform var(--transition-normal);
}

.clickable {
  cursor: pointer;
}

.hoverable:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
```

### `src/components/ui/Card.tsx`

```tsx
import type { ReactNode, MouseEvent } from 'react'
import styles from './Card.module.css'

interface CardProps {
  children: ReactNode
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
  className?: string
  hoverable?: boolean
}

export default function Card({ children, onClick, className = '', hoverable }: CardProps) {
  return (
    <div
      className={`${styles.card} ${onClick ? styles.clickable : ''} ${hoverable ? styles.hoverable : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
```

### `src/components/ui/Dropdown.module.css`

```css
.wrapper {
  position: relative;
  display: inline-block;
}

.menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 160px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 100;
  overflow: hidden;
  animation: fadeIn 0.15s ease;
}

.item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  font-size: 14px;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
  border: none;
  background: none;
}

.item:hover {
  background: var(--color-surface-2);
}

.danger {
  color: var(--color-danger);
}

.danger:hover {
  background: var(--color-danger-light);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### `src/components/ui/Dropdown.tsx`

```tsx
import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import styles from './Dropdown.module.css'

interface DropdownItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
}

export default function Dropdown({ trigger, items }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className={styles.menu}>
          {items.map((item, i) => (
            <button
              key={i}
              className={`${styles.item} ${item.danger ? styles.danger : ''}`}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

### `src/components/ui/EmptyState.module.css`

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.description {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 20px;
  max-width: 320px;
  line-height: 1.5;
}
```

### `src/components/ui/EmptyState.tsx`

```tsx
import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
```

### `src/components/ui/Input.module.css`

```css
.input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

.input:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
```

### `src/components/ui/Input.tsx`

```tsx
import type { InputHTMLAttributes, ChangeEvent } from 'react'
import styles from './Input.module.css'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

export default function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`${styles.input} ${className}`}
      {...props}
    />
  )
}
```

### `src/components/ui/LoadingFallback.module.css`

```css
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  gap: 16px;
}

.spinner {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: pulse 1.4s ease-in-out infinite both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

.dot:nth-child(3) {
  animation-delay: 0s;
}

.message {
  font-size: 14px;
  color: var(--color-text-tertiary);
  margin: 0;
}

@keyframes pulse {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
```

### `src/components/ui/LoadingFallback.tsx`

```tsx
import styles from './LoadingFallback.module.css'

interface LoadingFallbackProps {
  message?: string
}

export default function LoadingFallback({ message = '加载中...' }: LoadingFallbackProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.spinner}>
        <div className={styles.dot} />
        <div className={styles.dot} />
        <div className={styles.dot} />
      </div>
      <p className={styles.message}>{message}</p>
    </div>
  )
}
```

### `src/components/ui/Modal.module.css`

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: modalFadeIn 0.25s ease;
}

.overlayClosing {
  animation: modalFadeOut 0.25s ease forwards;
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  animation: modalScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modalClosing {
  animation: modalScaleOut 0.25s ease forwards;
}

.sm { max-width: 400px; }
.md { max-width: 560px; }
.lg { max-width: 720px; }

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.closeBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 20px;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.closeBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.body {
  padding: 0 24px 24px;
  overflow-y: auto;
  flex: 1;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes modalScaleIn {
  from { opacity: 0; transform: scale(0.92) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes modalScaleOut {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to { opacity: 0; transform: scale(0.92) translateY(8px); }
}

/* ---- Responsive ---- */

@media (max-width: 768px) {
  .modal {
    width: 95%;
    max-height: 90vh;
    border-radius: var(--radius-md);
  }

  .sm,
  .md,
  .lg {
    max-width: 100%;
  }

  .header {
    padding: 16px 18px 12px;
  }

  .body {
    padding: 0 18px 18px;
  }

  .title {
    font-size: 16px;
  }

  .closeBtn {
    width: 40px;
    height: 40px;
  }
}
```

### `src/components/ui/Modal.tsx`

```tsx
import { useEffect, useCallback, useState, useRef } from 'react'
import type { ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const [closing, setClosing] = useState(false)
  const [visible, setVisible] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClose = useCallback(() => {
    setClosing(true)
    // Wait for exit animation to finish before fully closing
    closeTimerRef.current = setTimeout(() => {
      setClosing(false)
      setVisible(false)
      onClose()
    }, 250)
  }, [onClose])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    },
    [handleClose],
  )

  // Open animation
  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setClosing(false)
    } else {
      // Already closed externally
      setVisible(false)
      setClosing(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [visible, handleKeyDown])

  if (!visible) return null

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.modal} ${styles[size]} ${closing ? styles.modalClosing : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
```

### `src/components/ui/Toast.module.css`

```css
.container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-size: 14px;
  pointer-events: auto;
  max-width: 360px;
  /* Stacking offset for multiple toasts */
  transform: translateY(calc(var(--toast-index, 0) * 4px));
}

.toastEnter {
  animation: toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.toastExit {
  animation: toastSlideOut 0.3s ease forwards;
}

.icon {
  font-size: 18px;
  flex-shrink: 0;
}

.message {
  flex: 1;
  line-height: 1.4;
}

.info {
  border-left: 3px solid var(--color-accent);
}

.success {
  border-left: 3px solid var(--color-success);
}

.warning {
  border-left: 3px solid var(--color-warning);
}

.error {
  border-left: 3px solid var(--color-danger);
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(80px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes toastSlideOut {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(80px) scale(0.95);
  }
}
```

### `src/components/ui/Toast.tsx`

```tsx
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import styles from './Toast.module.css'

type ToastType = 'info' | 'success' | 'warning' | 'error'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  leaving: boolean
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
}

let nextId = 0
const TOAST_DURATION = 3000
const EXIT_ANIMATION_DURATION = 300

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type, leaving: false }])

    // Set auto-dismiss timer
    const dismissTimer = setTimeout(() => {
      // Start exit animation
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
      )
      // Remove after exit animation
      const removeTimer = setTimeout(() => {
        removeToast(id)
      }, EXIT_ANIMATION_DURATION)
      timersRef.current.set(id, removeTimer)
    }, TOAST_DURATION)

    timersRef.current.set(id, dismissTimer)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={styles.container}>
        {toasts.map((t, index) => (
          <div
            key={t.id}
            className={`${styles.toast} ${styles[t.type]} ${t.leaving ? styles.toastExit : styles.toastEnter}`}
            style={{ '--toast-index': index } as React.CSSProperties}
          >
            <span className={styles.icon}>{ICONS[t.type]}</span>
            <span className={styles.message}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
```

### `src/db/backup.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Backup / Restore（C-15）
// 普通数据备份（排除 vault）；带版本 + checksum 完整性校验
// ============================================================

import { db } from './database'
import { formatDate } from '../utils/helpers'

const BACKUP_VERSION = 1

/** FNV-1a 32-bit 校验和（用于完整性检测，非安全用途） */
function computeChecksum(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export interface BackupPayload {
  version: number
  createdAt: string
  checksum: string
  data: Record<string, any[]>
}

/** 生成带版本 + checksum 的备份 payload（普通数据，不含 vault） */
export async function createBackupPayload(): Promise<BackupPayload> {
  const data = await db.exportAllData()
  const createdAt = new Date().toISOString()
  const checksum = computeChecksum(JSON.stringify(data))
  return { version: BACKUP_VERSION, createdAt, checksum, data }
}

/** 手动导出备份为 JSON 字符串（供下载） */
export async function exportBackupJson(): Promise<string> {
  const payload = await createBackupPayload()
  return JSON.stringify(payload, null, 2)
}

/** 校验备份 JSON，通过后返回其中的 data；失败抛错 */
export function verifyAndParseBackup(json: string): Record<string, any[]> {
  let payload: BackupPayload
  try {
    payload = JSON.parse(json)
  } catch {
    throw new Error('备份文件格式无效（非 JSON）')
  }
  if (!payload || payload.version !== BACKUP_VERSION) {
    throw new Error(`备份版本不兼容（当前支持 v${BACKUP_VERSION}）`)
  }
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('备份内容缺失')
  }
  const checksum = computeChecksum(JSON.stringify(payload.data))
  if (payload.checksum && checksum !== payload.checksum) {
    throw new Error('备份完整性校验失败（checksum 不匹配）')
  }
  return payload.data
}

/** 从备份 JSON 恢复（普通数据，不含 vault；vault 需单独恢复） */
export async function restoreBackup(json: string): Promise<void> {
  const data = verifyAndParseBackup(json)
  await db.importAllData(data)
}

/** 每日自动备份（保留最近 7 份，含版本 + checksum） */
export async function autoBackup(): Promise<{
  backedUp: boolean
  filePath?: string
  fileName?: string
  reason?: string
}> {
  try {
    // Check last backup time
    const lastBackup = await db.settings.get('lastBackupTime')
    const now = new Date()
    const oneDayMs = 24 * 60 * 60 * 1000

    if (lastBackup?.value) {
      const lastTime = new Date(lastBackup.value).getTime()
      if (now.getTime() - lastTime < oneDayMs) {
        return { backedUp: false, reason: 'Last backup was less than 24 hours ago' }
      }
    }

    // Export all data（排除 vault）
    const payload = await createBackupPayload()
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })

    const dateStr = formatDate(now)
    const fileName = `workbench-${dateStr}.json`

    // Try File System Access API if available
    let dirHandle: FileSystemDirectoryHandle | null = null
    try {
      if ('showDirectoryPicker' in window) {
        try {
          dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
        } catch {
          // 用户取消或不支持
        }
      }

      if (dirHandle) {
        const existingFiles: { name: string; handle: FileSystemFileHandle }[] = []
        for await (const [name, handle] of dirHandle.entries()) {
          if (name.startsWith('workbench-') && name.endsWith('.json')) {
            existingFiles.push({ name, handle: handle as FileSystemFileHandle })
          }
        }
        existingFiles.sort((a, b) => b.name.localeCompare(a.name))
        for (let i = 7; i < existingFiles.length; i++) {
          await dirHandle.removeEntry(existingFiles[i].name)
        }

        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      }
    } catch {
      // File system API not available - fall back to download
    }

    // Trigger download as fallback/primary method
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // Update last backup time
    await db.settings.put({ key: 'lastBackupTime', value: now.toISOString() })

    return { backedUp: true, fileName }
  } catch (err: any) {
    return { backedUp: false, reason: err.message || String(err) }
  }
}

```

### `src/db/database.migration.test.ts`

```typescript
// ============================================================
// Dexie v1 → v2 迁移运行时测试（fake-indexeddb）
// 验证 upgrade 回调：reviews → reviewEntries、flashcards → flashcardSchedule
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { WorkbenchDB } from './database'

// 与 database.ts version(1) 一致的 schema
const V1_STORES = {
  tasks: '++id, dueDate, priority, done, pinned, projectId',
  recurringTasks: '++id, enabled',
  projects: '++id, stage',
  memos: '++id, createdAt',
  notes: '++id, notebook, favorite, updatedAt',
  flashcards: '++id, subject, chapter, knowledgeId, nextReviewAt',
  flashcardReviews: '++id, flashcardId, reviewedAt',
  subjects: '++id',
  mistakes: '++id, subject, mastered',
  exams: '++id, date',
  reviews: '++id, type',
  reviewTemplates: '++id, type',
  reading: '++id, pinned',
  finance: '++id, type, date',
  countdowns: '++id, showOnHome',
  pomodoroLogs: '++id, date',
  vault: '++id',
  settings: '&key',
}

async function seedV1(): Promise<void> {
  const v1 = new Dexie('WorkbenchV8')
  v1.version(1).stores(V1_STORES)
  await v1.open()

  await v1.table('reviews').bulkAdd([
    {
      id: 'r1',
      type: 'weekly',
      dateRange: { start: '2026-08-17', end: '2026-08-23' },
      reflections: ['本周反思'],
      nextActions: ['下周调整计划'],
      answers: { summary: '答' },
      autoSummary: { totalTasks: 3 },
      createdAt: '2026-08-23T00:00:00.000Z',
    },
  ])

  await v1.table('flashcards').bulkAdd([
    {
      id: 'f1',
      question: '问题1',
      answer: '答案1',
      subject: '数学',
      chapter: '',
      knowledgeId: undefined,
      tags: [],
      difficulty: 3,
      mastery: 80,
      reviewCount: 5,
      correctCount: 4,
      wrongCount: 1,
      nextReviewAt: '2026-08-24T00:00:00.000Z',
      createdAt: '2026-08-20T00:00:00.000Z',
    },
  ])

  v1.close()
}

describe('Dexie v1 → v2 migration（runtime）', () => {
  beforeEach(async () => {
    await new Dexie('WorkbenchV8').delete().catch(() => {})
    await seedV1()
  })

  it('reviews → reviewEntries（补 templateId，保留内容）', async () => {
    const db = new WorkbenchDB()
    await db.open()

    const entries = await db.reviewEntries.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('r1')
    expect(entries[0].type).toBe('weekly')
    expect(entries[0].templateId).toBe('')
    expect(entries[0].reflections).toEqual(['本周反思'])
    expect(entries[0].nextActions).toEqual(['下周调整计划'])

    await db.close()
  })

  it('flashcards → flashcardSchedule（mastery → easeFactor 语义转换）', async () => {
    const db = new WorkbenchDB()
    await db.open()

    const schedules = await db.flashcardSchedule.toArray()
    expect(schedules).toHaveLength(1)
    expect(schedules[0].flashcardId).toBe('f1')
    // mastery 80 → easeFactor = 1.3 + 0.8 * 1.2 = 2.26
    expect(schedules[0].easeFactor).toBeCloseTo(2.26, 2)
    expect(schedules[0].reviewCount).toBe(5)
    expect(schedules[0].nextReviewAt).toBe('2026-08-24T00:00:00.000Z')

    await db.close()
  })
})

```

### `src/db/database.ts`

```typescript
// ============================================================
// Personal Workbench V8 — IndexedDB Database Layer (Dexie.js)
// ============================================================

import Dexie, { type Table } from 'dexie'
import type {
  Task,
  RecurringTask,
  Project,
  Memo,
  Note,
  Flashcard,
  FlashcardReview,
  FlashcardSchedule,
  Subject,
  Mistake,
  Exam,
  ReviewEntry,
  ReviewTemplate,
  Reading,
  Finance,
  Countdown,
  PomodoroLog,
  VaultEntry,
  Setting,
  KnowledgeRelation,
  StudySession,
  AppEventLog,
} from '../types'
import { reviewToEntry, flashcardToSchedule } from './migrationV2'

export class WorkbenchDB extends Dexie {
  tasks!: Table<Task, string>
  recurringTasks!: Table<RecurringTask, string>
  projects!: Table<Project, string>
  memos!: Table<Memo, string>
  notes!: Table<Note, string>
  flashcards!: Table<Flashcard, string>
  flashcardReviews!: Table<FlashcardReview, string>
  flashcardSchedule!: Table<FlashcardSchedule, string>
  subjects!: Table<Subject, string>
  mistakes!: Table<Mistake, string>
  exams!: Table<Exam, string>
  reviewEntries!: Table<ReviewEntry, string>
  reviewTemplates!: Table<ReviewTemplate, string>
  knowledgeRelations!: Table<KnowledgeRelation, string>
  studySessions!: Table<StudySession, string>
  appEvents!: Table<AppEventLog, string>
  reading!: Table<Reading, string>
  finance!: Table<Finance, string>
  countdowns!: Table<Countdown, string>
  pomodoroLogs!: Table<PomodoroLog, string>
  vault!: Table<VaultEntry, string>
  settings!: Table<Setting, string>

  private _available: boolean | null = null

  constructor() {
    super('WorkbenchV8')

    this.version(1).stores({
      tasks: '++id, dueDate, priority, done, pinned, projectId',
      recurringTasks: '++id, enabled',
      projects: '++id, stage',
      memos: '++id, createdAt',
      notes: '++id, notebook, favorite, updatedAt',
      flashcards: '++id, subject, chapter, knowledgeId, nextReviewAt',
      flashcardReviews: '++id, flashcardId, reviewedAt',
      subjects: '++id',
      mistakes: '++id, subject, mastered',
      exams: '++id, date',
      reviews: '++id, type',
      reviewTemplates: '++id, type',
      reading: '++id, pinned',
      finance: '++id, type, date',
      countdowns: '++id, showOnHome',
      pomodoroLogs: '++id, date',
      vault: '++id',
      settings: '&key',
    })

    this.version(2)
      .stores({
        tasks: '++id, dueDate, priority, done, pinned, projectId, createdAt',
        recurringTasks: '++id, enabled',
        projects: '++id, stage',
        memos: '++id, createdAt',
        notes: '++id, notebook, favorite, updatedAt',
        flashcards: '++id, subject, chapter, knowledgeId, nextReviewAt',
        flashcardReviews: '++id, flashcardId, reviewedAt',
        flashcardSchedule: '++id, flashcardId',
        subjects: '++id',
        mistakes: '++id, subject, mastered, createdAt',
        exams: '++id, date',
        reviewTemplates: '++id, type',
        reviewEntries: '++id, type, templateId',
        reading: '++id, pinned',
        finance: '++id, type, date',
        countdowns: '++id, showOnHome',
        pomodoroLogs: '++id, date',
        vault: '++id',
        settings: '&key',
        knowledgeRelations: '++id, knowledgeId, type, targetId',
        studySessions: '++id, subjectId, startedAt',
        appEvents: '++id, type, timestamp',
      })
      .upgrade(async (tx) => {
        // reviews → reviewEntries（语义转换：补 templateId）
        const oldReviews = await tx.table('reviews').toArray()
        if (oldReviews.length > 0) {
          await tx
            .table('reviewEntries')
            .bulkAdd(oldReviews.map((r) => reviewToEntry(r as any)))
        }

        // flashcards → flashcardSchedule（语义转换：mastery → easeFactor）
        const oldCards = await tx.table('flashcards').toArray()
        if (oldCards.length > 0) {
          await tx
            .table('flashcardSchedule')
            .bulkAdd(oldCards.map((c) => flashcardToSchedule(c as any)))
        }
      })

    // The isAvailable() method handles error detection at runtime
  }

  /**
   * Check if IndexedDB is accessible and the database opened successfully.
   */
  async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available

    try {
      // Check if IndexedDB is available at all
      if (typeof indexedDB === 'undefined') {
        this._available = false
        return false
      }

      // Try to open the database
      await this.open()
      this._available = true
      return true
    } catch (err) {
      console.error('[WorkbenchDB] IndexedDB is not available:', err)
      this._available = false
      return false
    }
  }

  async exportAllData(): Promise<Record<string, any[]>> {
    // 普通导出排除 vault（密码本独立安全边界，见 V8_GLOBAL §12）
    const tables = [
      'tasks',
      'recurringTasks',
      'projects',
      'memos',
      'notes',
      'flashcards',
      'flashcardReviews',
      'flashcardSchedule',
      'subjects',
      'mistakes',
      'exams',
      'reviewTemplates',
      'reviewEntries',
      'reading',
      'finance',
      'countdowns',
      'pomodoroLogs',
      'settings',
      'knowledgeRelations',
      'studySessions',
      'appEvents',
    ] as const

    const result: Record<string, any[]> = {}
    for (const table of tables) {
      try {
        result[table] = await this.table(table).toArray()
      } catch (err) {
        console.error(`[WorkbenchDB] Failed to export table "${table}":`, err)
        result[table] = []
      }
    }
    return result
  }

  async importAllData(data: Record<string, any[]>): Promise<void> {
    // 普通导入不触碰 vault（密码本独立安全边界）
    const tables = [
      'tasks',
      'recurringTasks',
      'projects',
      'memos',
      'notes',
      'flashcards',
      'flashcardReviews',
      'flashcardSchedule',
      'subjects',
      'mistakes',
      'exams',
      'reviewTemplates',
      'reviewEntries',
      'reading',
      'finance',
      'countdowns',
      'pomodoroLogs',
      'settings',
      'knowledgeRelations',
      'studySessions',
      'appEvents',
    ] as const

    try {
      await this.transaction('rw', this.tables, async () => {
        for (const table of tables) {
          await this.table(table).clear()
          if (Array.isArray(data[table]) && data[table].length > 0) {
            await this.table(table).bulkAdd(data[table])
          }
        }
      })
    } catch (err) {
      console.error('[WorkbenchDB] Failed to import data:', err)
      throw err
    }
  }

  /** 单独导出 vault（密码本加密数据，独立于普通导出） */
  async exportVaultData(): Promise<Record<string, any[]>> {
    return { vault: await this.vault.toArray() }
  }
}

export const db = new WorkbenchDB()

```

### `src/db/migration.ts`

```typescript
// ============================================================
// Personal Workbench V8 — V5 to V8 Migration
// ============================================================

import { db } from './database'
import { uid } from '../utils/helpers'

export async function migrateFromV5(): Promise<{
  success: boolean
  migrated: boolean
  error?: string
}> {
  try {
    // Check if already migrated
    const migratedSetting = await db.settings.get('migrated')
    if (migratedSetting?.value === true) {
      return { success: true, migrated: false }
    }

    // Read V5 data from localStorage
    const raw = localStorage.getItem('workbench-v5')
    if (!raw) {
      // No V5 data to migrate, mark as migrated anyway
      await db.settings.put({ key: 'migrated', value: true })
      return { success: true, migrated: false }
    }

    const v5 = JSON.parse(raw)

    await db.transaction('rw', db.tables, async () => {
      // Migrate todos -> tasks
      if (Array.isArray(v5.todo)) {
        const tasks = v5.todo.map((t: any) => ({
          id: t.id || uid(),
          title: t.title || t.text || '',
          priority: t.priority || 'P2',
          done: t.done ?? t.completed ?? false,
          note: t.note || '',
          projectId: t.projectId || '',
          dueDate: t.dueDate || t.due || '',
          pinned: t.pinned ?? false,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
          sourceRecurringId: t.sourceRecurringId,
        }))
        await db.tasks.bulkAdd(tasks)
      }

      // Migrate notes -> notes
      if (Array.isArray(v5.note)) {
        const notes = v5.note.map((n: any) => ({
          id: n.id || uid(),
          title: n.title || '',
          body: n.body || n.content || '',
          notebook: n.notebook || '默认',
          tags: n.tags || [],
          favorite: n.favorite ?? false,
          url: n.url || '',
          createdAt: n.createdAt || new Date().toISOString(),
          updatedAt: n.updatedAt || new Date().toISOString(),
        }))
        await db.notes.bulkAdd(notes)
      }

      // Migrate mistakes -> mistakes
      if (Array.isArray(v5.mistakes)) {
        const mistakes = v5.mistakes.map((m: any) => ({
          id: m.id || uid(),
          subject: m.subject || '',
          question: m.question || '',
          answer: m.answer || '',
          errorType: m.errorType || m.type || '',
          tags: m.tags || [],
          linkedKnowledge: m.linkedKnowledge || [],
          mastered: m.mastered ?? false,
          reviewCount: m.reviewCount ?? 0,
          source: m.source || '',
          createdAt: m.createdAt || new Date().toISOString(),
        }))
        await db.mistakes.bulkAdd(mistakes)
      }

      // Migrate exams -> exams
      if (Array.isArray(v5.exams)) {
        const exams = v5.exams.map((e: any) => ({
          id: e.id || uid(),
          name: e.name || '',
          date: e.date || '',
          scores: e.scores || {},
          total: e.total ?? 0,
          rank: e.rank ?? 0,
          note: e.note || '',
        }))
        await db.exams.bulkAdd(exams)
      }

      // Migrate reading -> reading
      if (Array.isArray(v5.reading)) {
        const readings = v5.reading.map((r: any) => ({
          id: r.id || uid(),
          title: r.title || '',
          current: r.current ?? 0,
          target: r.target ?? 0,
          unit: r.unit || '页',
          note: r.note || '',
          pinned: r.pinned ?? false,
          createdAt: r.createdAt || new Date().toISOString(),
        }))
        await db.reading.bulkAdd(readings)
      }

      // Migrate finance -> finance
      if (Array.isArray(v5.finance)) {
        const finances = v5.finance.map((f: any) => ({
          id: f.id || uid(),
          type: f.type || 'expense',
          title: f.title || '',
          amount: f.amount ?? 0,
          category: f.category || '',
          tags: f.tags || [],
          date: f.date || '',
          note: f.note || '',
        }))
        await db.finance.bulkAdd(finances)
      }

      // Migrate pomodoro.log -> pomodoroLogs
      if (v5.pomodoro && Array.isArray(v5.pomodoro.log)) {
        const logs = v5.pomodoro.log.map((l: any) => ({
          id: l.id || uid(),
          date: l.date || '',
          duration: l.duration ?? 0,
          subject: l.subject,
          completed: l.completed ?? true,
        }))
        await db.pomodoroLogs.bulkAdd(logs)
      }

      // Migrate subjects -> subjects
      if (Array.isArray(v5.subjects)) {
        const subjects = v5.subjects.map((s: any) => ({
          id: s.id || uid(),
          name: s.name || '',
          chapters: (s.chapters || []).map((ch: any) => ({
            id: ch.id || uid(),
            name: ch.name || '',
            subjectId: s.id || ch.subjectId || '',
            topics: (ch.topics || []).map((tp: any) => ({
              id: tp.id || uid(),
              name: tp.name || '',
              chapterId: ch.id || tp.chapterId || '',
              mastery: tp.mastery || 'notStarted',
              notes: tp.notes || '',
              relatedMistakes: tp.relatedMistakes || [],
            })),
          })),
        }))
        await db.subjects.bulkAdd(subjects)
      }

      // Migrate project -> projects
      if (Array.isArray(v5.project)) {
        const projects = v5.project.map((p: any) => ({
          id: p.id || uid(),
          title: p.title || '',
          stage: p.stage || 'plan',
          progress: p.progress ?? 0,
          milestones: (p.milestones || []).map((m: any) => ({
            id: m.id || uid(),
            title: m.title || '',
            done: m.done ?? false,
          })),
          description: p.description || '',
          notes: p.notes || '',
          tags: p.tags || [],
        }))
        await db.projects.bulkAdd(projects)
      }

      // Migrate vault -> vault（安全修正 I-012：V5 密码为明文，V8 采用 PBKDF2+AES-GCM）
      // 无主密码阶段无法安全迁移明文密码，仅标记待处理，禁止明文落库。
      if (Array.isArray(v5.vault) && v5.vault.length > 0) {
        await db.settings.put({ key: 'vaultMigrationPending', value: true })
      }

      // Migrate review -> reviewEntries (weekly review -> type='weekly')
      if (Array.isArray(v5.review)) {
        const reviews = v5.review.map((r: any) => ({
          id: r.id || uid(),
          templateId: '',
          type: r.type || 'weekly',
          dateRange: r.dateRange || { start: '', end: '' },
          subjectId: r.subjectId,
          examId: r.examId,
          autoSummary: r.autoSummary || {},
          answers: r.answers || {},
          reflections: r.reflections || [],
          nextActions: r.nextActions || [],
          createdAt: r.createdAt || new Date().toISOString(),
        }))
        await db.reviewEntries.bulkAdd(reviews)
      }

      // Migrate config.examDate -> countdown entry
      if (v5.config && v5.config.examDate) {
        const countdownEntry = {
          id: uid(),
          title: v5.config.examName || '考试',
          targetDate: v5.config.examDate,
          type: 'exam' as const,
          showOnHome: true,
        }
        await db.countdowns.add(countdownEntry)
      }
    })

    // Mark migration as complete
    await db.settings.put({ key: 'migrated', value: true })

    return { success: true, migrated: true }
  } catch (err: any) {
    return { success: false, migrated: false, error: err.message || String(err) }
  }
}
```

### `src/db/migrationV2.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { reviewToEntry, flashcardToSchedule } from './migrationV2'
import type { Review, Flashcard } from '@/types'

const review: Review = {
  id: 'r1',
  type: 'weekly',
  dateRange: { start: '2026-08-17', end: '2026-08-23' },
  subjectId: 's1',
  examId: undefined,
  autoSummary: { totalTasks: 5 },
  answers: { q1: '答' },
  reflections: ['反思'],
  nextActions: ['下一步'],
  createdAt: '2026-08-23T10:00:00.000Z',
}

const card: Flashcard = {
  id: 'c1',
  question: 'q',
  answer: 'a',
  subject: '数学',
  chapter: '函数',
  tags: [],
  difficulty: 3,
  mastery: 50,
  reviewCount: 4,
  correctCount: 3,
  wrongCount: 1,
  nextReviewAt: '2026-08-25T10:00:00.000Z',
  createdAt: '2026-08-20T10:00:00.000Z',
}

describe('migrationV2', () => {
  it('reviewToEntry 补 templateId 并保留回答/反思/下一步', () => {
    const entry = reviewToEntry(review, 'tpl-1')
    expect(entry.templateId).toBe('tpl-1')
    expect(entry.type).toBe('weekly')
    expect(entry.answers).toEqual({ q1: '答' })
    expect(entry.reflections).toEqual(['反思'])
    expect(entry.nextActions).toEqual(['下一步'])
    expect(entry.autoSummary).toEqual({ totalTasks: 5 })
  })

  it('reviewToEntry 默认 templateId 为空', () => {
    expect(reviewToEntry(review).templateId).toBe('')
  })

  it('flashcardToSchedule 将 mastery 语义转换为 easeFactor，而非直接搬家', () => {
    const s = flashcardToSchedule(card)
    expect(s.flashcardId).toBe('c1')
    expect(s.easeFactor).toBeCloseTo(1.3 + (50 / 100) * 1.2) // 1.9
    expect(s.reviewCount).toBe(4)
    expect(s.nextReviewAt).toBe('2026-08-25T10:00:00.000Z')
    expect(s.lastReviewedAt).toBe('2026-08-20T10:00:00.000Z')
  })

  it('flashcardToSchedule 钳制 mastery 并重置不可推导字段', () => {
    const over = flashcardToSchedule({ ...card, mastery: 150 })
    expect(over.easeFactor).toBeCloseTo(2.5)
    expect(over.consecutiveCorrect).toBe(0)
    expect(over.interval).toBe(0)
  })

  it('flashcardToSchedule 处理空字段回退', () => {
    const minimal = flashcardToSchedule({ ...card, nextReviewAt: '', mastery: 0 })
    expect(minimal.nextReviewAt).toBe('2026-08-20T10:00:00.000Z')
    expect(minimal.easeFactor).toBeCloseTo(1.3)
  })
})

```

### `src/db/migrationV2.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Dexie v1 → v2 语义转换（纯函数，可单测）
// ============================================================

import type { Review, ReviewEntry, Flashcard, FlashcardSchedule } from '@/types'

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/**
 * reviews → reviewEntries（语义转换：补 templateId，保留回答/反思/下一步）。
 * templateId 默认空，具体模板关联在 Phase 8 完成。
 */
export function reviewToEntry(review: Review, templateId = ''): ReviewEntry {
  return {
    id: review.id,
    templateId,
    type: review.type,
    dateRange: review.dateRange,
    subjectId: review.subjectId,
    examId: review.examId,
    answers: review.answers || {},
    reflections: review.reflections || [],
    nextActions: review.nextActions || [],
    autoSummary: review.autoSummary || {},
    createdAt: review.createdAt,
  }
}

/**
 * flashcards.mastery(0–100) → FlashcardSchedule.easeFactor / consecutiveCorrect。
 * 二者语义不同，禁止字段直接搬家。
 */
export function flashcardToSchedule(card: Flashcard): FlashcardSchedule {
  const mastery = clamp(card.mastery ?? 0, 0, 100)
  return {
    flashcardId: card.id,
    nextReviewAt: card.nextReviewAt || card.createdAt,
    consecutiveCorrect: 0, // 无法从旧字段可靠推导，重置
    interval: 0, // 由调度器在下次复习时重新计算
    easeFactor: 1.3 + (mastery / 100) * 1.2, // mastery 0-100 → easeFactor 1.3-2.5
    reviewCount: card.reviewCount ?? 0,
    lastReviewedAt: card.createdAt, // 旧字段无 lastReviewedAt，回退 createdAt
  }
}

```

### `src/desktop/index.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Desktop (Tauri) Integration Helpers
// ============================================================
// All helpers gracefully degrade to no-ops when running in a
// plain browser instead of the Tauri desktop shell.

/** Whether the app is running inside the Tauri desktop shell */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** Whether the current window is the quick memo floating window */
export function isQuickMemoWindow(): boolean {
  if (!isDesktop()) return false
  const label = (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label
  return label === 'quick-memo'
}

/**
 * Send a desktop system notification.
 * No-op in the browser (falls back to console log).
 */
export async function sendDesktopNotification(
  title: string,
  body: string,
): Promise<void> {
  if (!isDesktop()) return
  try {
    const { isPermissionGranted, requestPermission, sendNotification } =
      await import('@tauri-apps/plugin-notification')
    let granted = await isPermissionGranted()
    if (!granted) {
      granted = (await requestPermission()) === 'granted'
    }
    if (granted) {
      sendNotification({ title, body })
    }
  } catch (err) {
    console.warn('[Workbench] Desktop notification failed:', err)
  }
}

/** Hide the current Tauri window (used by the quick memo floating window) */
export async function hideCurrentWindow(): Promise<void> {
  if (!isDesktop()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().hide()
  } catch (err) {
    console.warn('[Workbench] Hide window failed:', err)
  }
}

/** Emit an event to the main window from another window (e.g. quick memo) */
export async function emitToMainWindow(event: string, payload?: unknown): Promise<void> {
  if (!isDesktop()) return
  try {
    const { emitTo } = await import('@tauri-apps/api/event')
    await emitTo('main', event, payload ?? null)
  } catch (err) {
    console.warn('[Workbench] emitTo main failed:', err)
  }
}

/** Quit the whole desktop app (tray resident process included) */
export async function quitDesktopApp(): Promise<void> {
  if (!isDesktop()) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('quit_app')
  } catch (err) {
    console.warn('[Workbench] Quit failed:', err)
  }
}

```

### `src/domain/events/eventBus.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eventBus } from './eventBus'
import type { AppEvent } from './eventBus'

describe('eventBus', () => {
  beforeEach(() => eventBus.clear())

  it('publishes to subscribed handler', () => {
    const handler = vi.fn()
    eventBus.subscribe('task.completed', handler)
    const event: AppEvent = { type: 'task.completed', taskId: 't1', completedAt: '2026-01-01T00:00:00.000Z' }
    eventBus.publish(event)
    expect(handler).toHaveBeenCalledWith(event)
  })

  it('does not deliver to other event types', () => {
    const handler = vi.fn()
    eventBus.subscribe('task.completed', handler)
    eventBus.publish({ type: 'task.created', taskId: 't1' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('unsubscribe stops delivery', () => {
    const handler = vi.fn()
    const off = eventBus.subscribe('task.completed', handler)
    off()
    eventBus.publish({ type: 'task.completed', taskId: 't1', completedAt: 'x' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('isolates handler exceptions', () => {
    const bad = vi.fn(() => {
      throw new Error('boom')
    })
    const good = vi.fn()
    eventBus.subscribe('task.completed', bad)
    eventBus.subscribe('task.completed', good)
    eventBus.publish({ type: 'task.completed', taskId: 't1', completedAt: 'x' })
    expect(good).toHaveBeenCalled()
  })
})

```

### `src/domain/events/eventBus.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Event Bus（发布/订阅）
// ============================================================

import type { ReviewRating, ReviewType } from '@/types'

export type AppEvent =
  | { type: 'task.completed'; taskId: string; completedAt: string }
  | { type: 'task.created'; taskId: string }
  | { type: 'pomodoro.completed'; duration: number; taskId?: string }
  | { type: 'flashcard.reviewed'; flashcardId: string; rating: ReviewRating }
  | { type: 'mistake.created'; mistakeId: string; subject: string }
  | { type: 'exam.created'; examId: string }
  | { type: 'review.completed'; reviewId: string; reviewType: ReviewType }
  | { type: 'recurring.generated'; ruleId: string; taskIds: string[] }

type EventHandler = (event: AppEvent) => void

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()

  /** 订阅事件（泛型收口，handler 收到窄化的具体事件类型），返回取消订阅函数 */
  subscribe<T extends AppEvent['type']>(
    type: T,
    handler: (event: Extract<AppEvent, { type: T }>) => void,
  ): () => void {
    let set = this.handlers.get(type)
    if (!set) {
      set = new Set()
      this.handlers.set(type, set)
    }
    const wrapped = handler as EventHandler
    set.add(wrapped)
    return () => {
      set.delete(wrapped)
    }
  }

  /** 发布事件；单个 handler 异常不阻断其余 handler */
  publish(event: AppEvent): void {
    const handlers = this.handlers.get(event.type)
    if (!handlers) return
    for (const handler of handlers) {
      try {
        handler(event)
      } catch (err) {
        console.error(`[EventBus] handler error for "${event.type}":`, err)
      }
    }
  }

  clear(): void {
    this.handlers.clear()
  }
}

export const eventBus = new EventBus()

```

### `src/domain/flashcard/flashcardScheduler.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import {
  RATING_INTERVAL_DAYS,
  isCorrectRating,
  computeNextReviewAt,
  computeMasteryDelta,
  clampMastery,
} from './flashcardScheduler'

describe('flashcardScheduler', () => {
  it('maps ratings to 1/3/7/14 days', () => {
    expect(RATING_INTERVAL_DAYS.forgot).toBe(1)
    expect(RATING_INTERVAL_DAYS.fuzzy).toBe(3)
    expect(RATING_INTERVAL_DAYS.got).toBe(7)
    expect(RATING_INTERVAL_DAYS.mastered).toBe(14)
  })

  it('isCorrectRating', () => {
    expect(isCorrectRating('got')).toBe(true)
    expect(isCorrectRating('mastered')).toBe(true)
    expect(isCorrectRating('forgot')).toBe(false)
    expect(isCorrectRating('fuzzy')).toBe(false)
  })

  it('computes next review date with correct offset', () => {
    const now = new Date('2026-08-23T10:00:00.000Z')
    const next = new Date(computeNextReviewAt(now, 'got'))
    const diffDays = (next.getTime() - now.getTime()) / 86_400_000
    expect(diffDays).toBe(7)
  })

  it('mastery delta +10 correct / -5 wrong', () => {
    expect(computeMasteryDelta('got')).toBe(10)
    expect(computeMasteryDelta('forgot')).toBe(-5)
  })

  it('clamps mastery to [0, 100]', () => {
    expect(clampMastery(150)).toBe(100)
    expect(clampMastery(-10)).toBe(0)
    expect(clampMastery(55)).toBe(55)
  })
})

```

### `src/domain/flashcard/flashcardScheduler.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Flashcard Scheduler（间隔重复，简化）
// ============================================================

import type { ReviewRating, FlashcardSchedule } from '@/types'

/** 四档评价 → 初始间隔（天） */
export const RATING_INTERVAL_DAYS: Record<ReviewRating, number> = {
  forgot: 1,
  fuzzy: 3,
  got: 7,
  mastered: 14,
}

const DAY_MS = 86_400_000

/** 该评价是否计入「答对」 */
export function isCorrectRating(rating: ReviewRating): boolean {
  return rating === 'got' || rating === 'mastered'
}

/** 根据评价计算下次复习时间 */
export function computeNextReviewAt(now: Date, rating: ReviewRating): string {
  return new Date(now.getTime() + RATING_INTERVAL_DAYS[rating] * DAY_MS).toISOString()
}

/** 根据评价计算掌握度增减（答对 +10，答错 -5） */
export function computeMasteryDelta(rating: ReviewRating): number {
  return isCorrectRating(rating) ? 10 : -5
}

/** 掌握度钳制到 [0, 100] */
export function clampMastery(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/** 初始调度状态（新建闪卡时） */
export function createInitialSchedule(flashcardId: string): FlashcardSchedule {
  return {
    flashcardId,
    nextReviewAt: new Date().toISOString(),
    consecutiveCorrect: 0,
    interval: 1,
    easeFactor: 2.5,
    reviewCount: 0,
    lastReviewedAt: '',
  }
}

/** 简化 SM-2：根据当前调度 + 四档评价，计算下一次调度状态 */
export function scheduleFlashcard(
  current: FlashcardSchedule,
  rating: ReviewRating,
): FlashcardSchedule {
  const correct = isCorrectRating(rating)
  const consecutiveCorrect = correct ? current.consecutiveCorrect + 1 : 0
  const easeFactor = correct
    ? Math.max(1.3, current.easeFactor + 0.1)
    : Math.max(1.3, current.easeFactor - 0.2)
  const now = new Date()
  return {
    flashcardId: current.flashcardId,
    nextReviewAt: computeNextReviewAt(now, rating),
    consecutiveCorrect,
    interval: RATING_INTERVAL_DAYS[rating],
    easeFactor,
    reviewCount: current.reviewCount + 1,
    lastReviewedAt: now.toISOString(),
  }
}

```

### `src/domain/planning/recurringGenerator.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { shouldGenerateForDate } from './recurringGenerator'
import type { RecurringTask } from '@/types'

function rt(overrides: Partial<RecurringTask> = {}): RecurringTask {
  return {
    id: 'r1',
    title: '背单词',
    rule: { type: 'daily' },
    time: '',
    priority: 'P2',
    category: '',
    startDate: '',
    endDate: '',
    enabled: true,
    ...overrides,
  }
}

describe('recurringGenerator', () => {
  it('daily generates when enabled', () => {
    expect(shouldGenerateForDate(rt(), new Date('2026-08-23T08:00:00'))).toBe(true)
  })

  it('disabled rule never generates', () => {
    expect(shouldGenerateForDate(rt({ enabled: false }), new Date('2026-08-23T08:00:00'))).toBe(false)
  })

  it('skips if already generated today', () => {
    const r = rt({ lastGeneratedDate: '2026-08-23' })
    expect(shouldGenerateForDate(r, new Date('2026-08-23T08:00:00'))).toBe(false)
  })

  it('weekly matches configured daysOfWeek', () => {
    // 2026-08-23 is Sunday (getDay() === 0)
    const sunday = rt({ rule: { type: 'weekly', daysOfWeek: [0] } })
    expect(shouldGenerateForDate(sunday, new Date('2026-08-23T08:00:00'))).toBe(true)

    const monday = rt({ rule: { type: 'weekly', daysOfWeek: [1] } })
    expect(shouldGenerateForDate(monday, new Date('2026-08-23T08:00:00'))).toBe(false)
  })

  it('monthly matches day of month', () => {
    const on23 = rt({ rule: { type: 'monthly', daysOfMonth: [23] } })
    expect(shouldGenerateForDate(on23, new Date('2026-08-23T08:00:00'))).toBe(true)

    const on1 = rt({ rule: { type: 'monthly', daysOfMonth: [1] } })
    expect(shouldGenerateForDate(on1, new Date('2026-08-23T08:00:00'))).toBe(false)
  })

  it('monthly -1 matches last day of month', () => {
    const lastDay = rt({ rule: { type: 'monthly', daysOfMonth: [-1] } })
    expect(shouldGenerateForDate(lastDay, new Date('2026-08-31T08:00:00'))).toBe(true)
  })

  it('respects startDate / endDate range', () => {
    const future = rt({ startDate: '2026-08-24' })
    expect(shouldGenerateForDate(future, new Date('2026-08-23T08:00:00'))).toBe(false)

    const expired = rt({ endDate: '2026-08-22' })
    expect(shouldGenerateForDate(expired, new Date('2026-08-23T08:00:00'))).toBe(false)
  })
})

```

### `src/domain/planning/recurringGenerator.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Recurring Generator（周期规则引擎）
// ============================================================

import type { RecurringTask } from '@/types'
import { formatDate } from '@/utils/helpers'

const DAY_MS = 86_400_000

/** weekly：给定星期几是否命中 */
export function matchesWeekly(rule: RecurringTask['rule'], dayOfWeek: number): boolean {
  return rule.daysOfWeek?.includes(dayOfWeek) ?? false
}

/** monthly：给定日期是否命中（支持 -1 = 月末） */
export function matchesMonthly(rule: RecurringTask['rule'], date: Date): boolean {
  const day = date.getDate()
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const days = rule.daysOfMonth ?? []
  return days.includes(day) || (days.includes(-1) && day === lastDay)
}

/**
 * 判断某周期规则今天是否应生成任务实例。
 * 纯函数，不含 DB / 副作用。
 */
export function shouldGenerateForDate(rt: RecurringTask, now: Date): boolean {
  if (!rt.enabled) return false

  const today = formatDate(now)
  if (rt.lastGeneratedDate === today) return false
  if (rt.startDate && today < rt.startDate) return false
  if (rt.endDate && today > rt.endDate) return false

  switch (rt.rule.type) {
    case 'daily':
      return true
    case 'weekly':
      return matchesWeekly(rt.rule, now.getDay())
    case 'monthly':
      return matchesMonthly(rt.rule, now)
    case 'custom': {
      const interval = rt.rule.intervalDays
      if (!interval) return false
      const base = rt.lastGeneratedDate
        ? new Date(rt.lastGeneratedDate)
        : new Date(rt.startDate)
      const diffDays = Math.floor((now.getTime() - base.getTime()) / DAY_MS)
      return diffDays >= interval
    }
    default:
      return false
  }
}

```

### `src/domain/planning/taskScheduler.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { bucketTask, sortTasks } from './taskScheduler'
import type { Task } from '@/types'

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'x',
    priority: 'P2',
    done: false,
    note: '',
    projectId: '',
    dueDate: '',
    pinned: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('taskScheduler', () => {
  const now = new Date('2026-08-23T08:00:00')

  it('buckets tasks by dueDate', () => {
    expect(bucketTask(task({ dueDate: '2026-08-23' }), now)).toBe('today')
    expect(bucketTask(task({ dueDate: '2026-08-20' }), now)).toBe('overdue')
    expect(bucketTask(task({ dueDate: '2026-08-25' }), now)).toBe('future')
    expect(bucketTask(task({ dueDate: '' }), now)).toBe('inbox')
    expect(bucketTask(task({ dueDate: '2026-08-23', done: true }), now)).toBe('done')
  })

  it('sorts pinned first, then date, then priority', () => {
    const a = task({ id: 'a', dueDate: '2026-08-24', priority: 'P0' })
    const b = task({ id: 'b', dueDate: '2026-08-23', priority: 'P2', pinned: true })
    const c = task({ id: 'c', dueDate: '2026-08-23', priority: 'P0' })
    expect(sortTasks([a, b, c]).map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })
})

```

### `src/domain/planning/taskScheduler.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Task Scheduler（任务分桶与排序）
// ============================================================

import type { Task } from '@/types'
import { formatDate } from '@/utils/helpers'

/** 任务时间桶（对齐 W-07：收件箱 / 今日 / 未来） */
export type TaskBucket = 'overdue' | 'today' | 'future' | 'inbox' | 'done'

/** 将任务归入时间桶 */
export function bucketTask(task: Task, now: Date = new Date()): TaskBucket {
  if (task.done) return 'done'
  if (!task.dueDate) return 'inbox'
  const today = formatDate(now)
  if (task.dueDate < today) return 'overdue'
  if (task.dueDate === today) return 'today'
  return 'future'
}

const PRIORITY_ORDER: Record<Task['priority'], number> = { P0: 0, P1: 1, P2: 2 }

/** 任务排序：置顶 > 日期 > 优先级 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  })
}

```

### `src/domain/review/reviewAggregator.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { getDailyMetrics, getWeeklyMetrics } from './reviewAggregator'
import type { Task, PomodoroLog, Mistake, FlashcardReview } from '@/types'

describe('reviewAggregator', () => {
  it('computes daily metrics', () => {
    const date = '2026-08-23'
    const tasks: Task[] = [
      { id: 'a', title: 'x', priority: 'P0', done: true, note: '', projectId: '', dueDate: date, pinned: false, createdAt: '', updatedAt: '' },
      { id: 'b', title: 'y', priority: 'P1', done: false, note: '', projectId: '', dueDate: date, pinned: false, createdAt: '', updatedAt: '' },
    ]
    const pomodoros: PomodoroLog[] = [{ id: 'p', date, duration: 25, completed: true }]
    const mistakes: Mistake[] = [
      { id: 'm', subject: '数学', question: '', answer: '', errorType: '', tags: [], linkedKnowledge: [], mastered: false, reviewCount: 0, source: '', createdAt: `${date}T10:00:00.000Z` },
    ]
    const reviews: FlashcardReview[] = [
      { id: 'r1', flashcardId: 'f1', rating: 'got', reviewedAt: `${date}T09:00:00.000Z`, nextReviewAt: '' },
      { id: 'r2', flashcardId: 'f2', rating: 'forgot', reviewedAt: `${date}T10:00:00.000Z`, nextReviewAt: '' },
    ]

    const m = getDailyMetrics({ date, tasks, pomodoros, mistakes, flashcardReviews: reviews })

    expect(m.tasksTotal).toBe(2)
    expect(m.tasksCompleted).toBe(1)
    expect(m.studyDuration).toBe(25)
    expect(m.pomodoroCount).toBe(1)
    expect(m.mistakesCreated).toBe(1)
    expect(m.flashcardsReviewed).toBe(2)
    expect(m.flashcardsCorrect).toBe(1)
  })

  it('computes weekly totals from daily metrics', () => {
    const daily = [
      { date: '2026-08-17', tasksTotal: 1, tasksCompleted: 1, studyDuration: 30, pomodoroCount: 1, mistakesCreated: 0, flashcardsReviewed: 0, flashcardsCorrect: 0 },
      { date: '2026-08-18', tasksTotal: 1, tasksCompleted: 0, studyDuration: 20, pomodoroCount: 1, mistakesCreated: 1, flashcardsReviewed: 1, flashcardsCorrect: 1 },
    ]
    const w = getWeeklyMetrics('2026-08-17', '2026-08-23', daily)
    expect(w.totalStudyDuration).toBe(50)
    expect(w.totalTasksCompleted).toBe(1)
    expect(w.daily.length).toBe(2)
  })
})

```

### `src/domain/review/reviewAggregator.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Review Aggregator（复盘指标聚合）
// ============================================================

import type {
  Task,
  PomodoroLog,
  Mistake,
  FlashcardReview,
  DailyMetrics,
  WeeklyMetrics,
} from '@/types'

interface DailyInput {
  date: string
  tasks: Task[]
  pomodoros: PomodoroLog[]
  mistakes: Mistake[]
  flashcardReviews: FlashcardReview[]
}

/** 计算单日指标（纯函数） */
export function getDailyMetrics(input: DailyInput): DailyMetrics {
  const dayTasks = input.tasks.filter((t) => t.dueDate === input.date)
  const dayPomodoros = input.pomodoros.filter((p) => p.date === input.date)
  const dayMistakes = input.mistakes.filter((m) => m.createdAt.startsWith(input.date))
  const dayReviews = input.flashcardReviews.filter((r) => r.reviewedAt.startsWith(input.date))

  return {
    date: input.date,
    tasksTotal: dayTasks.length,
    tasksCompleted: dayTasks.filter((t) => t.done).length,
    studyDuration: dayPomodoros.reduce((sum, p) => sum + p.duration, 0),
    pomodoroCount: dayPomodoros.length,
    mistakesCreated: dayMistakes.length,
    flashcardsReviewed: dayReviews.length,
    flashcardsCorrect: dayReviews.filter(
      (r) => r.rating === 'got' || r.rating === 'mastered',
    ).length,
  }
}

/** 计算周指标（汇总各日） */
export function getWeeklyMetrics(
  weekStart: string,
  weekEnd: string,
  daily: DailyMetrics[],
): WeeklyMetrics {
  return {
    weekStart,
    weekEnd,
    daily,
    bySubject: [],
    totalStudyDuration: daily.reduce((sum, d) => sum + d.studyDuration, 0),
    totalTasksCompleted: daily.reduce((sum, d) => sum + d.tasksCompleted, 0),
  }
}

```

### `src/hooks/useDesktopNotifications.ts`

```typescript
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
      // Don't spam notifications before 08:00
      const now = new Date()
      if (now.getHours() < 8) return
      try {
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

```

### `src/hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSystemStore, DEFAULT_SHORTCUTS } from '@/stores/systemStore'
import { isQuickMemoWindow } from '@/desktop'

function parseShortcut(keys: string): { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean; key: string } {
  const parts = keys.split('+').map((p) => p.trim())
  const result = { ctrl: false, shift: false, alt: false, meta: false, key: '' }
  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower === 'ctrl') result.ctrl = true
    else if (lower === 'shift') result.shift = true
    else if (lower === 'alt') result.alt = true
    else if (lower === 'meta' || lower === 'cmd') result.meta = true
    else result.key = part.toLowerCase()
  }
  return result
}

function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut)
  if (!parsed.key) return false

  const ctrlOrMeta = parsed.ctrl || parsed.meta
  const eCtrlOrMeta = e.ctrlKey || e.metaKey

  // For Space shortcut, only match when no modifier keys are pressed
  if (parsed.key === ' ' || parsed.key === 'space') {
    return e.key === ' ' && !eCtrlOrMeta && !e.shiftKey && !e.altKey
  }

  return (
    e.key.toLowerCase() === parsed.key &&
    eCtrlOrMeta === ctrlOrMeta &&
    e.shiftKey === parsed.shift &&
    e.altKey === parsed.alt
  )
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || (document.activeElement as HTMLElement)?.isContentEditable
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const shortcuts = useSystemStore((s) => s.shortcuts)
  const openSearch = useSystemStore((s) => s.openSearch)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input/textarea
      if (isInputFocused()) return

      for (const shortcut of shortcuts) {
        if (matchesShortcut(e, shortcut.keys)) {
          e.preventDefault()

          switch (shortcut.id) {
            case 'search':
              openSearch()
              break
            case 'newTask':
              navigate('/plan/inbox')
              break
            case 'dailyReview':
              navigate('/review/daily')
              break
            case 'flashcards':
              navigate('/study/flashcards')
              break
            case 'pomodoro':
              navigate('/tools/pomodoro')
              break
          }
          return
        }
      }
    },
    [shortcuts, navigate, openSearch],
  )

  useEffect(() => {
    // App shortcuts must not run inside the quick memo floating window
    // (e.g. Space → pomodoro would navigate this small window away)
    if (isQuickMemoWindow()) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
```

### `src/pages/SettingsPage.module.css`

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 720px;
}

.section {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.sectionHeader {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.sectionTitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.sectionDesc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 4px 0 0;
}

.sectionBody {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
}

/* Theme */
.themeRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.themeLabel {
  font-size: 14px;
  color: var(--color-text-primary);
}

.themeToggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.themeOption {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 2px solid transparent;
}

.themeOption:hover {
  background: var(--color-surface-2);
}

.themeOptionActive {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.timeInput {
  padding: 5px 10px;
  font-size: 13px;
  font-family: inherit;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--surface);
  color: var(--color-text-primary);
  outline: none;
}

.timeInput:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.timeInput:focus {
  border-color: var(--color-accent);
}

/* Shortcuts */
.shortcutList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shortcutRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.shortcutRow:hover {
  background: var(--color-surface-2);
}

.shortcutLabel {
  font-size: 14px;
  color: var(--color-text-primary);
}

.shortcutKeys {
  display: flex;
  align-items: center;
  gap: 4px;
}

.keyChip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  font-size: 12px;
  font-family: inherit;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 28px;
  justify-content: center;
}

.keyChip:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.keyChipRecording {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: var(--color-accent);
  animation: pulse 1.2s ease-in-out infinite;
}

.recordingHint {
  font-size: 12px;
  color: var(--color-accent);
  margin-left: 8px;
}

.resetBtn {
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  align-self: flex-start;
  margin-top: 8px;
  background: none;
  border: none;
  cursor: pointer;
}

.resetBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

/* Data Export / Import / Backup */
.dataActions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.warningText {
  font-size: 13px;
  color: var(--color-warning);
  margin: 12px 0 0;
  line-height: 1.5;
}

/* Backup */
.backupInfo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.backupRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.backupLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.backupValue {
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 500;
}

/* Import Preview Modal */
.importPreview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.importSummary {
  font-size: 14px;
  color: var(--color-text-primary);
  margin: 0;
}

.importGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.importChip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

/* Form actions (used in modals) */
.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

/* Clear Data Modal */
.clearConfirm {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.clearWarning {
  font-size: 14px;
  color: var(--color-danger);
  margin: 0;
  font-weight: 500;
}

.clearHint {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

/* About */
.aboutContent {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aboutRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.aboutLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.aboutValue {
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 500;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Danger zone */
.dangerZone {
  border-color: var(--color-danger);
}

.dangerZone .sectionHeader {
  border-bottom-color: var(--color-danger-light);
}

.dangerTitle {
  color: var(--color-danger);
}
```

### `src/pages/SettingsPage.tsx`

```tsx
import { useState, useCallback, useRef, useEffect } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useSystemStore } from '@/stores/systemStore'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/db/database'
import { autoBackup, exportBackupJson, verifyAndParseBackup } from '@/db/backup'
import { formatDate } from '@/utils/helpers'
import { isDesktop } from '@/desktop'
import {
  loadNotificationSettings,
  NOTIFICATION_SETTINGS_KEY,
  type NotificationSettings,
} from '@/hooks/useDesktopNotifications'
import styles from './SettingsPage.module.css'

function formatKeys(keys: string): string[] {
  return keys.split('+').map((k) => k.trim())
}

interface ImportPreview {
  tasks: number
  recurringTasks: number
  projects: number
  memos: number
  notes: number
  flashcards: number
  flashcardReviews: number
  subjects: number
  mistakes: number
  exams: number
  reviews: number
  reviewTemplates: number
  reading: number
  finance: number
  countdowns: number
  pomodoroLogs: number
  vault: number
  settings: number
}

const emptyPreview: ImportPreview = {
  tasks: 0, recurringTasks: 0, projects: 0, memos: 0, notes: 0,
  flashcards: 0, flashcardReviews: 0, subjects: 0, mistakes: 0,
  exams: 0, reviews: 0, reviewTemplates: 0, reading: 0,
  finance: 0, countdowns: 0, pomodoroLogs: 0, vault: 0, settings: 0,
}

export default function SettingsPage() {
  const theme = useSystemStore((s) => s.theme)
  const setTheme = useSystemStore((s) => s.setTheme)
  const shortcuts = useSystemStore((s) => s.shortcuts)
  const setShortcuts = useSystemStore((s) => s.setShortcuts)
  const resetShortcuts = useSystemStore((s) => s.resetShortcuts)
  const { toast } = useToast()

  const [recordingId, setRecordingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recordingRef = useRef<string | null>(null)

  // ---- Backup state ----
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null)
  const [backupCount, setBackupCount] = useState(0)
  const [backingUp, setBackingUp] = useState(false)

  // ---- Import state ----
  const [importData, setImportData] = useState<Record<string, any[]> | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview>(emptyPreview)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importing, setImporting] = useState(false)

  // ---- Clear state ----
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [clearStep, setClearStep] = useState<'confirm' | 'final'>('confirm')
  const [clearing, setClearing] = useState(false)

  // ---- Desktop notification settings ----
  const [notif, setNotif] = useState<NotificationSettings>(() => loadNotificationSettings())

  const updateNotif = useCallback((updates: Partial<NotificationSettings>) => {
    setNotif((prev) => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(next))
      } catch { /* ignore quota errors */ }
      return next
    })
  }, [])

  // ---- Load backup info ----
  useEffect(() => {
    (async () => {
      try {
        const entry = await db.settings.get('lastBackupTime')
        if (entry?.value) {
          setLastBackupTime(entry.value)
        }
      } catch { /* ignore */ }
    })()
  }, [])

  // ---- Shortcut recording ----
  const handleStartRecording = useCallback((id: string) => {
    setRecordingId(id)
    recordingRef.current = null
  }, [])

  const handleKeyDownCapture = useCallback(
    (e: React.KeyboardEvent) => {
      if (recordingId) {
        e.preventDefault()
        e.stopPropagation()

        const parts: string[] = []
        if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
        if (e.shiftKey) parts.push('Shift')
        if (e.altKey) parts.push('Alt')

        if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') {
          return
        }

        const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
        if (parts.length === 0 && key === 'Escape') {
          setRecordingId(null)
          return
        }
        parts.push(key)
        recordingRef.current = parts.join('+')

        setShortcuts(
          shortcuts.map((s) =>
            s.id === recordingId ? { ...s, keys: recordingRef.current! } : s,
          ),
        )
        setRecordingId(null)
        toast('快捷键已更新', 'success')
      }
    },
    [recordingId, shortcuts, setShortcuts, toast],
  )

  // ---- Export ----
  const handleExport = useCallback(async (_excludeVault = false) => {
    try {
      const json = await exportBackupJson()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = formatDate(new Date())
      a.href = url
      a.download = `workbench-v8-${dateStr}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('数据导出成功（不含密码本）', 'success')
    } catch {
      toast('导出失败', 'error')
    }
  }, [toast])

  // ---- Import ----
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = verifyAndParseBackup(text)

        // Build preview
        const preview: ImportPreview = {
          tasks: Array.isArray(data.tasks) ? data.tasks.length : 0,
          recurringTasks: Array.isArray(data.recurringTasks) ? data.recurringTasks.length : 0,
          projects: Array.isArray(data.projects) ? data.projects.length : 0,
          memos: Array.isArray(data.memos) ? data.memos.length : 0,
          notes: Array.isArray(data.notes) ? data.notes.length : 0,
          flashcards: Array.isArray(data.flashcards) ? data.flashcards.length : 0,
          flashcardReviews: Array.isArray(data.flashcardReviews) ? data.flashcardReviews.length : 0,
          subjects: Array.isArray(data.subjects) ? data.subjects.length : 0,
          mistakes: Array.isArray(data.mistakes) ? data.mistakes.length : 0,
          exams: Array.isArray(data.exams) ? data.exams.length : 0,
          reviews: Array.isArray(data.reviewEntries) ? data.reviewEntries.length : 0,
          reviewTemplates: Array.isArray(data.reviewTemplates) ? data.reviewTemplates.length : 0,
          reading: Array.isArray(data.reading) ? data.reading.length : 0,
          finance: Array.isArray(data.finance) ? data.finance.length : 0,
          countdowns: Array.isArray(data.countdowns) ? data.countdowns.length : 0,
          pomodoroLogs: Array.isArray(data.pomodoroLogs) ? data.pomodoroLogs.length : 0,
          vault: Array.isArray(data.vault) ? data.vault.length : 0,
          settings: Array.isArray(data.settings) ? data.settings.length : 0,
        }

        setImportData(data)
        setImportPreview(preview)
        setImportModalOpen(true)
      } catch {
        toast('文件解析失败，请检查文件格式', 'error')
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [toast],
  )

  const handleConfirmImport = useCallback(async () => {
    if (!importData) return
    setImporting(true)
    try {
      await db.importAllData(importData)
      setImportModalOpen(false)
      setImportData(null)
      setImportPreview(emptyPreview)
      toast('数据导入成功', 'success')
      window.location.reload()
    } catch {
      toast('导入失败', 'error')
    } finally {
      setImporting(false)
    }
  }, [importData, toast])

  // ---- Backup ----
  const handleBackupNow = useCallback(async () => {
    setBackingUp(true)
    try {
      const result = await autoBackup()
      if (result.backedUp) {
        setLastBackupTime(new Date().toISOString())
        setBackupCount((c) => c + 1)
        toast('备份完成', 'success')
      } else {
        toast(result.reason || '备份失败', 'warning')
      }
    } catch {
      toast('备份失败', 'error')
    } finally {
      setBackingUp(false)
    }
  }, [toast])

  // ---- Clear ----
  const handleClearClick = useCallback(() => {
    setClearStep('confirm')
    setClearModalOpen(true)
  }, [])

  const handleClearConfirm = useCallback(async (exportFirst: boolean) => {
    if (clearStep === 'confirm') {
      if (exportFirst) {
        await handleExport()
      }
      setClearStep('final')
      return
    }
    // Final confirmation
    setClearing(true)
    try {
      await db.delete()
      await db.open()
      setClearModalOpen(false)
      setClearStep('confirm')
      toast('所有数据已清除', 'success')
      window.location.reload()
    } catch {
      toast('清除失败', 'error')
    } finally {
      setClearing(false)
    }
  }, [clearStep, handleExport, toast])

  const totalImportCount = Object.values(importPreview).reduce((a, b) => a + b, 0)

  return (
    <div className={styles.page} onKeyDown={handleKeyDownCapture}>
      <PageHeader title="设置" description="应用配置与个性化设置" />

      {/* Theme */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>外观</h2>
          <p className={styles.sectionDesc}>选择你喜欢的主题模式</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.themeRow}>
            <span className={styles.themeLabel}>主题模式</span>
            <div className={styles.themeToggle}>
              <button
                className={`${styles.themeOption} ${theme === 'mist' ? styles.themeOptionActive : ''}`}
                onClick={() => setTheme('mist')}
              >
                ☀️ 晨雾书房
              </button>
              <button
                className={`${styles.themeOption} ${theme === 'fluent' ? styles.themeOptionActive : ''}`}
                onClick={() => setTheme('fluent')}
              >
                🪟 Windows
              </button>
              <button
                className={`${styles.themeOption} ${theme === 'night' ? styles.themeOptionActive : ''}`}
                onClick={() => setTheme('night')}
              >
                🌙 深色夜航
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Notifications (only in the desktop shell) */}
      {isDesktop() && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>桌面提醒</h2>
            <p className={styles.sectionDesc}>系统通知（仅在桌面应用中生效）</p>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.themeRow}>
              <span className={styles.themeLabel}>复盘提醒（每晚）</span>
              <div className={styles.themeToggle}>
                <input
                  type="time"
                  className={styles.timeInput}
                  value={notif.reviewReminderTime}
                  disabled={!notif.reviewReminderEnabled}
                  onChange={(e) => updateNotif({ reviewReminderTime: e.target.value })}
                />
                <button
                  className={`${styles.themeOption} ${notif.reviewReminderEnabled ? styles.themeOptionActive : ''}`}
                  onClick={() => updateNotif({ reviewReminderEnabled: !notif.reviewReminderEnabled })}
                >
                  {notif.reviewReminderEnabled ? '开启' : '关闭'}
                </button>
              </div>
            </div>
            <div className={styles.themeRow}>
              <span className={styles.themeLabel}>周期计划提醒（每天）</span>
              <div className={styles.themeToggle}>
                <input
                  type="time"
                  className={styles.timeInput}
                  value={notif.recurringReminderTime}
                  disabled={!notif.recurringReminderEnabled}
                  onChange={(e) => updateNotif({ recurringReminderTime: e.target.value })}
                />
                <button
                  className={`${styles.themeOption} ${notif.recurringReminderEnabled ? styles.themeOptionActive : ''}`}
                  onClick={() => updateNotif({ recurringReminderEnabled: !notif.recurringReminderEnabled })}
                >
                  {notif.recurringReminderEnabled ? '开启' : '关闭'}
                </button>
              </div>
            </div>
            <div className={styles.themeRow}>
              <span className={styles.themeLabel}>倒数日提醒（提前 30/14/7/3/1/0 天）</span>
              <div className={styles.themeToggle}>
                <button
                  className={`${styles.themeOption} ${notif.countdownReminderEnabled ? styles.themeOptionActive : ''}`}
                  onClick={() => updateNotif({ countdownReminderEnabled: !notif.countdownReminderEnabled })}
                >
                  {notif.countdownReminderEnabled ? '开启' : '关闭'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>快捷键</h2>
          <p className={styles.sectionDesc}>点击快捷键组合可重新绑定</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.shortcutList}>
            {shortcuts.map((sc) => {
              const isRecording = recordingId === sc.id
              return (
                <div key={sc.id} className={styles.shortcutRow}>
                  <span className={styles.shortcutLabel}>{sc.label}</span>
                  <div className={styles.shortcutKeys}>
                    {formatKeys(sc.keys).map((key, i) => (
                      <span
                        key={i}
                        className={`${styles.keyChip} ${isRecording ? styles.keyChipRecording : ''}`}
                        onClick={() => handleStartRecording(sc.id)}
                        title="点击修改快捷键"
                      >
                        {key}
                      </span>
                    ))}
                    {isRecording && (
                      <span className={styles.recordingHint}>按下新快捷键...</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <button className={styles.resetBtn} onClick={resetShortcuts}>
            恢复默认快捷键
          </button>
        </div>
      </div>

      {/* Data Export */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>导出数据</h2>
          <p className={styles.sectionDesc}>将数据导出为 JSON 文件备份</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.dataActions}>
            <Button onClick={() => handleExport(false)}>📥 导出全部数据</Button>
            <Button variant="secondary" onClick={() => handleExport(true)}>
              📥 导出（不含密码本）
            </Button>
          </div>
        </div>
      </div>

      {/* Data Import */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>导入数据</h2>
          <p className={styles.sectionDesc}>从 JSON 文件导入数据（将覆盖现有数据）</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.dataActions}>
            <Button variant="secondary" onClick={handleImportClick}>
              📤 选择文件导入
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
          <p className={styles.warningText}>
            ⚠️ 导入将覆盖现有数据，建议先导出备份
          </p>
        </div>
      </div>

      {/* Auto-backup */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>自动备份</h2>
          <p className={styles.sectionDesc}>备份数据到本地文件</p>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.backupInfo}>
            <div className={styles.backupRow}>
              <span className={styles.backupLabel}>上次备份时间</span>
              <span className={styles.backupValue}>
                {lastBackupTime
                  ? new Date(lastBackupTime).toLocaleString('zh-CN')
                  : '从未备份'}
              </span>
            </div>
            <div className={styles.backupRow}>
              <span className={styles.backupLabel}>本次会话备份次数</span>
              <span className={styles.backupValue}>{backupCount}</span>
            </div>
          </div>
          <div className={styles.dataActions}>
            <Button onClick={handleBackupNow} disabled={backingUp}>
              {backingUp ? '备份中...' : '💾 立即备份'}
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className={`${styles.section} ${styles.dangerZone}`}>
        <div className={styles.sectionHeader}>
          <h2 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>危险区域</h2>
          <p className={styles.sectionDesc}>以下操作不可恢复，请谨慎操作</p>
        </div>
        <div className={styles.sectionBody}>
          <Button variant="danger" onClick={handleClearClick}>
            🗑 清除所有数据
          </Button>
        </div>
      </div>

      {/* About */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>关于</h2>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.aboutContent}>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>应用名称</span>
              <span className={styles.aboutValue}>个人工作台</span>
            </div>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>版本</span>
              <span className={styles.aboutValue}>V8.0</span>
            </div>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>技术栈</span>
              <span className={styles.aboutValue}>React + TypeScript + Dexie</span>
            </div>
            <div className={styles.aboutRow}>
              <span className={styles.aboutLabel}>数据存储</span>
              <span className={styles.aboutValue}>IndexedDB（本地浏览器）</span>
            </div>
          </div>
        </div>
      </div>

      {/* Import Preview Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false)
          setImportData(null)
          setImportPreview(emptyPreview)
        }}
        title="导入预览"
      >
        <div className={styles.importPreview}>
          <p className={styles.importSummary}>
            共检测到 <strong>{totalImportCount}</strong> 条数据，将覆盖现有数据。
          </p>
          <div className={styles.importGrid}>
            {importPreview.tasks > 0 && (
              <span className={styles.importChip}>📋 任务 {importPreview.tasks}</span>
            )}
            {importPreview.recurringTasks > 0 && (
              <span className={styles.importChip}>🔄 周期任务 {importPreview.recurringTasks}</span>
            )}
            {importPreview.projects > 0 && (
              <span className={styles.importChip}>📁 项目 {importPreview.projects}</span>
            )}
            {importPreview.memos > 0 && (
              <span className={styles.importChip}>📝 备忘 {importPreview.memos}</span>
            )}
            {importPreview.notes > 0 && (
              <span className={styles.importChip}>📄 笔记 {importPreview.notes}</span>
            )}
            {importPreview.flashcards > 0 && (
              <span className={styles.importChip}>🃏 闪卡 {importPreview.flashcards}</span>
            )}
            {importPreview.flashcardReviews > 0 && (
              <span className={styles.importChip}>📊 闪卡复习 {importPreview.flashcardReviews}</span>
            )}
            {importPreview.subjects > 0 && (
              <span className={styles.importChip}>📚 学科 {importPreview.subjects}</span>
            )}
            {importPreview.mistakes > 0 && (
              <span className={styles.importChip}>❌ 错题 {importPreview.mistakes}</span>
            )}
            {importPreview.exams > 0 && (
              <span className={styles.importChip}>📝 考试 {importPreview.exams}</span>
            )}
            {importPreview.reviews > 0 && (
              <span className={styles.importChip}>📋 复盘 {importPreview.reviews}</span>
            )}
            {importPreview.reviewTemplates > 0 && (
              <span className={styles.importChip}>📐 模板 {importPreview.reviewTemplates}</span>
            )}
            {importPreview.reading > 0 && (
              <span className={styles.importChip}>📖 阅读 {importPreview.reading}</span>
            )}
            {importPreview.finance > 0 && (
              <span className={styles.importChip}>💰 财务 {importPreview.finance}</span>
            )}
            {importPreview.countdowns > 0 && (
              <span className={styles.importChip}>📅 倒数日 {importPreview.countdowns}</span>
            )}
            {importPreview.pomodoroLogs > 0 && (
              <span className={styles.importChip}>🍅 番茄 {importPreview.pomodoroLogs}</span>
            )}
            {importPreview.vault > 0 && (
              <span className={styles.importChip}>🔐 密码本 {importPreview.vault}</span>
            )}
            {importPreview.settings > 0 && (
              <span className={styles.importChip}>⚙ 设置 {importPreview.settings}</span>
            )}
          </div>
          <p className={styles.warningText}>
            ⚠️ 导入将覆盖现有数据，建议先导出备份
          </p>
          <div className={styles.formActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setImportModalOpen(false)
                setImportData(null)
                setImportPreview(emptyPreview)
              }}
            >
              取消
            </Button>
            <Button variant="danger" onClick={handleConfirmImport} disabled={importing}>
              {importing ? '导入中...' : '确认导入'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Data Confirmation Modal */}
      <Modal
        isOpen={clearModalOpen}
        onClose={() => {
          setClearModalOpen(false)
          setClearStep('confirm')
        }}
        title="清除所有数据"
      >
        <div className={styles.clearConfirm}>
          {clearStep === 'confirm' ? (
            <>
              <p className={styles.clearWarning}>
                ⚠️ 此操作将永久删除所有数据，无法恢复！
              </p>
              <p className={styles.clearHint}>建议在清除前先导出备份。</p>
              <div className={styles.formActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setClearModalOpen(false)
                    setClearStep('confirm')
                  }}
                >
                  取消
                </Button>
                <Button variant="secondary" onClick={() => handleClearConfirm(true)}>
                  导出并继续
                </Button>
                <Button variant="danger" onClick={() => handleClearConfirm(false)}>
                  直接清除
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.clearWarning}>
                ⚠️ 最终确认：所有数据将被永久删除，此操作不可撤销！
              </p>
              <div className={styles.formActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setClearModalOpen(false)
                    setClearStep('confirm')
                  }}
                >
                  取消
                </Button>
                <Button variant="danger" onClick={() => handleClearConfirm(false)} disabled={clearing}>
                  {clearing ? '清除中...' : '确认清除所有数据'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/VaultPage.module.css`

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header actions */
.headerActions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Lock screen */
.lockScreen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
}

.lockCard {
  text-align: center;
  max-width: 400px;
  width: 100%;
  padding: 40px 32px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}

.lockIcon {
  font-size: 48px;
  margin-bottom: 16px;
}

.lockTitle {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.lockDesc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 24px;
  line-height: 1.6;
}

.lockForm {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.lockField {
  width: 100%;
}

.lockError {
  font-size: 13px;
  color: var(--color-danger);
  margin: 0;
}

/* Entry list */
.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-fast);
  overflow: hidden;
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.cardBody {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px;
  gap: 12px;
}

.cardInfo {
  flex: 1;
  min-width: 0;
}

.platform {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.username {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 6px;
}

.passwordRow {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.passwordLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.passwordValue {
  font-size: 13px;
  font-family: 'Courier New', monospace;
  background: var(--color-surface-2);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--color-text-primary);
  letter-spacing: 2px;
}

.inlineBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  font-size: 14px;
  background: transparent;
  color: var(--color-text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast);
  cursor: pointer;
  border: none;
  padding: 0;
}

.inlineBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.url {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.urlLink {
  color: var(--color-accent);
  text-decoration: none;
}

.urlLink:hover {
  text-decoration: underline;
}

.note {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin: 0 0 4px;
}

.lastUsed {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin: 0;
}

.cardActions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.actionBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast);
  cursor: pointer;
  border: none;
  background: transparent;
  padding: 0;
}

.actionBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.errorText {
  font-size: 13px;
  color: var(--color-danger);
  margin: 0;
}
```

### `src/pages/VaultPage.tsx`

```tsx
import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/db/database'
import { uid } from '@/utils/helpers'
import type { VaultEntry } from '@/types'
import styles from './VaultPage.module.css'

// ============================================================
// Web Crypto helpers
// ============================================================

function ab2str(buf: ArrayBuffer): string {
  return String.fromCharCode(...new Uint8Array(buf))
}

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i)
  }
  return buf
}

function ab2hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hex2ab(hex: string): ArrayBuffer {
  const buf = new ArrayBuffer(hex.length / 2)
  const view = new Uint8Array(buf)
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return buf
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function encryptData(plaintext: string, password: string, salt: Uint8Array): Promise<{ iv: string; ciphertext: string }> {
  const key = await deriveKey(password, salt)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  return { iv: ab2hex(iv.buffer as ArrayBuffer), ciphertext: ab2hex(ct) }
}

async function decryptData(ciphertext: string, iv: string, password: string, salt: Uint8Array): Promise<string> {
  const key = await deriveKey(password, salt)
  const dec = new TextDecoder()
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: hex2ab(iv) }, key, hex2ab(ciphertext))
  return dec.decode(pt)
}

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const h = await crypto.subtle.digest('SHA-256', enc.encode(password))
  return ab2hex(h)
}

// ============================================================
// Types
// ============================================================

interface VaultForm {
  platform: string
  username: string
  password: string
  url: string
  note: string
}

const emptyForm: VaultForm = {
  platform: '',
  username: '',
  password: '',
  url: '',
  note: '',
}

// ============================================================
// States
// ============================================================

type VaultState = 'noMasterPassword' | 'locked' | 'unlocked'

export default function VaultPage() {
  const { toast } = useToast()

  // ---- Master password state ----
  const [vaultState, setVaultState] = useState<VaultState>('noMasterPassword')
  const [masterPasswordHash, setMasterPasswordHash] = useState<string | null>(null)
  const [masterSalt, setMasterSalt] = useState<Uint8Array | null>(null)
  const [masterPassword, setMasterPassword] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  // ---- Lock screen forms ----
  const [setPass, setSetPass] = useState('')
  const [setPassConfirm, setSetPassConfirm] = useState('')
  const [setPassError, setSetPassError] = useState('')
  const [unlockPass, setUnlockPass] = useState('')
  const [unlockError, setUnlockError] = useState('')

  // ---- Change master password ----
  const [changePassOpen, setChangePassOpen] = useState(false)
  const [changeOldPass, setChangeOldPass] = useState('')
  const [changeNewPass, setChangeNewPass] = useState('')
  const [changeNewConfirm, setChangeNewConfirm] = useState('')
  const [changePassError, setChangePassError] = useState('')
  const [changingPass, setChangingPass] = useState(false)

  // ---- Entries ----
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [loading, setLoading] = useState(false)

  // ---- Modal ----
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<VaultForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  // ---- Reveal states ----
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

  // ---- Init ----
  useEffect(() => {
    (async () => {
      try {
        const hashEntry = await db.settings.get('vaultMasterHash')
        const saltEntry = await db.settings.get('vaultMasterSalt')
        if (hashEntry?.value && saltEntry?.value) {
          setMasterPasswordHash(hashEntry.value)
          const saltHex = saltEntry.value
          const saltBytes = new Uint8Array(saltHex.length / 2)
          for (let i = 0; i < saltHex.length; i += 2) {
            saltBytes[i / 2] = parseInt(saltHex.substring(i, i + 2), 16)
          }
          setMasterSalt(saltBytes)
          setVaultState('locked')
        } else {
          setVaultState('noMasterPassword')
        }
      } catch {
        setVaultState('noMasterPassword')
      } finally {
        setCheckingAuth(false)
      }
    })()
  }, [])

  // ---- Load entries ----
  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const all = await db.vault.toArray()
      setEntries(all)
    } finally {
      setLoading(false)
    }
  }, [])

  // ---- Set master password ----
  const handleSetMasterPassword = useCallback(async () => {
    setSetPassError('')
    if (setPass.length < 4) {
      setSetPassError('密码至少需要4位')
      return
    }
    if (setPass !== setPassConfirm) {
      setSetPassError('两次密码不一致')
      return
    }
    try {
      const hash = await hashPassword(setPass)
      const salt = crypto.getRandomValues(new Uint8Array(16))
      await db.settings.put({ key: 'vaultMasterHash', value: hash })
      await db.settings.put({ key: 'vaultMasterSalt', value: ab2hex(salt.buffer as ArrayBuffer) })
      setMasterPasswordHash(hash)
      setMasterSalt(salt)
      setMasterPassword(setPass)
      setVaultState('unlocked')
      await loadEntries()
      toast('主密码已设置', 'success')
    } catch {
      toast('设置失败', 'error')
    }
  }, [setPass, setPassConfirm, loadEntries, toast])

  // ---- Unlock ----
  const handleUnlock = useCallback(async () => {
    setUnlockError('')
    try {
      const hash = await hashPassword(unlockPass)
      if (hash !== masterPasswordHash) {
        setUnlockError('密码错误')
        return
      }
      setMasterPassword(unlockPass)
      setVaultState('unlocked')
      await loadEntries()
    } catch {
      setUnlockError('验证失败')
    }
  }, [unlockPass, masterPasswordHash, loadEntries])

  // ---- Lock ----
  const handleLock = useCallback(() => {
    setMasterPassword('')
    setVaultState('locked')
    setEntries([])
    setRevealedIds(new Set())
    setUnlockPass('')
    setUnlockError('')
  }, [])

  // ---- Change master password ----
  const handleChangeMasterPassword = useCallback(async () => {
    setChangePassError('')
    if (!changeOldPass || !changeNewPass || !changeNewConfirm) {
      setChangePassError('请填写所有字段')
      return
    }
    if (changeNewPass.length < 4) {
      setChangePassError('新密码至少需要4位')
      return
    }
    if (changeNewPass !== changeNewConfirm) {
      setChangePassError('两次新密码不一致')
      return
    }
    // Verify old password
    const oldHash = await hashPassword(changeOldPass)
    if (oldHash !== masterPasswordHash) {
      setChangePassError('旧密码错误')
      return
    }
    setChangingPass(true)
    try {
      // Re-encrypt all entries with new password
      const newSalt = crypto.getRandomValues(new Uint8Array(16))
      const allEntries = await db.vault.toArray()

      for (const entry of allEntries) {
        // Decrypt with old password
        const plaintext = await decryptData(entry.password, entry.passwordIv || '', changeOldPass, masterSalt!)
        // Encrypt with new password
        const { iv, ciphertext } = await encryptData(plaintext, changeNewPass, newSalt)
        await db.vault.update(entry.id, { password: ciphertext, passwordIv: iv })
      }

      // Update master password records
      const newHash = await hashPassword(changeNewPass)
      await db.settings.put({ key: 'vaultMasterHash', value: newHash })
      await db.settings.put({ key: 'vaultMasterSalt', value: ab2hex(newSalt.buffer as ArrayBuffer) })
      setMasterPasswordHash(newHash)
      setMasterSalt(newSalt)
      setMasterPassword(changeNewPass)

      setChangePassOpen(false)
      setChangeOldPass('')
      setChangeNewPass('')
      setChangeNewConfirm('')
      setChangePassError('')
      toast('主密码已修改', 'success')
    } catch {
      toast('修改失败', 'error')
    } finally {
      setChangingPass(false)
    }
  }, [changeOldPass, changeNewPass, changeNewConfirm, masterPasswordHash, masterSalt, toast])

  // ---- Add/Edit ----
  const openAdd = useCallback(() => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback(async (entry: VaultEntry) => {
    setEditingId(entry.id)
    try {
      const plaintext = await decryptData(entry.password, entry.passwordIv || '', masterPassword, masterSalt!)
      setForm({
        platform: entry.platform,
        username: entry.username,
        password: plaintext,
        url: entry.url,
        note: entry.note,
      })
    } catch {
      toast('解密失败', 'error')
      return
    }
    setModalOpen(true)
  }, [masterPassword, masterSalt, toast])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingId(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.platform.trim() || !form.password) {
      toast('请填写平台和密码', 'warning')
      return
    }
    setSaving(true)
    try {
      const { iv, ciphertext } = await encryptData(form.password, masterPassword, masterSalt!)

      if (editingId) {
        await db.vault.update(editingId, {
          platform: form.platform.trim(),
          username: form.username.trim(),
          password: ciphertext,
          passwordIv: iv,
          url: form.url.trim(),
          note: form.note.trim(),
          lastUsed: new Date().toISOString(),
        })
        toast('已更新', 'success')
      } else {
        const now = new Date().toISOString()
        await db.vault.add({
          id: uid(),
          platform: form.platform.trim(),
          username: form.username.trim(),
          password: ciphertext,
          passwordIv: iv,
          url: form.url.trim(),
          note: form.note.trim(),
          lastUsed: now,
        })
        toast('已添加', 'success')
      }
      closeModal()
      await loadEntries()
    } catch {
      toast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }, [form, editingId, masterPassword, masterSalt, closeModal, loadEntries, toast])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定要删除这条密码记录吗？')) return
    try {
      await db.vault.delete(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
      toast('已删除', 'success')
    } catch {
      toast('删除失败', 'error')
    }
  }, [toast])

  // ---- Copy password ----
  const handleCopyPassword = useCallback(async (entry: VaultEntry) => {
    try {
      const plaintext = await decryptData(entry.password, entry.passwordIv || '', masterPassword, masterSalt!)
      await navigator.clipboard.writeText(plaintext)
      toast('密码已复制到剪贴板', 'success')
      // Update last used
      await db.vault.update(entry.id, { lastUsed: new Date().toISOString() })
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, lastUsed: new Date().toISOString() } : e)),
      )
    } catch {
      toast('复制失败', 'error')
    }
  }, [masterPassword, masterSalt, toast])

  // ---- Toggle reveal ----
  const toggleReveal = useCallback((id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // ---- Revealed password component ----
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({})

  const handleReveal = useCallback(async (entry: VaultEntry) => {
    if (revealedPasswords[entry.id]) {
      setRevealedPasswords((prev) => {
        const next = { ...prev }
        delete next[entry.id]
        return next
      })
      toggleReveal(entry.id)
      return
    }
    try {
      const plaintext = await decryptData(entry.password, entry.passwordIv || '', masterPassword, masterSalt!)
      setRevealedPasswords((prev) => ({ ...prev, [entry.id]: plaintext }))
      toggleReveal(entry.id)
    } catch {
      toast('解密失败', 'error')
    }
  }, [masterPassword, masterSalt, revealedPasswords, toggleReveal, toast])

  // ---- Loading ----
  if (checkingAuth) {
    return (
      <div className={styles.page}>
        <PageHeader title="密码本" description="加密存储账号与密码信息" />
        <EmptyState icon="⏳" title="加载中..." />
      </div>
    )
  }

  // ---- Lock screen: no master password ----
  if (vaultState === 'noMasterPassword') {
    return (
      <div className={styles.page}>
        <PageHeader title="密码本" description="加密存储账号与密码信息" />
        <div className={styles.lockScreen}>
          <div className={styles.lockCard}>
            <div className={styles.lockIcon}>🔐</div>
            <h2 className={styles.lockTitle}>设置主密码</h2>
            <p className={styles.lockDesc}>
              设置主密码以加密保护你的账号密码信息。请牢记此密码，丢失后将无法恢复数据。
            </p>
            <div className={styles.lockForm}>
              <div className={styles.lockField}>
                <Input
                  type="password"
                  value={setPass}
                  onChange={(e) => setSetPass(e.target.value)}
                  placeholder="输入主密码（至少4位）"
                  onKeyDown={(e) => e.key === 'Enter' && handleSetMasterPassword()}
                />
              </div>
              <div className={styles.lockField}>
                <Input
                  type="password"
                  value={setPassConfirm}
                  onChange={(e) => setSetPassConfirm(e.target.value)}
                  placeholder="确认主密码"
                  onKeyDown={(e) => e.key === 'Enter' && handleSetMasterPassword()}
                />
              </div>
              {setPassError && <p className={styles.lockError}>{setPassError}</p>}
              <Button onClick={handleSetMasterPassword} disabled={!setPass || !setPassConfirm}>
                设置主密码
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Lock screen: locked ----
  if (vaultState === 'locked') {
    return (
      <div className={styles.page}>
        <PageHeader title="密码本" description="加密存储账号与密码信息" />
        <div className={styles.lockScreen}>
          <div className={styles.lockCard}>
            <div className={styles.lockIcon}>🔒</div>
            <h2 className={styles.lockTitle}>密码本已锁定</h2>
            <p className={styles.lockDesc}>请输入主密码解锁</p>
            <div className={styles.lockForm}>
              <div className={styles.lockField}>
                <Input
                  type="password"
                  value={unlockPass}
                  onChange={(e) => { setUnlockPass(e.target.value); setUnlockError('') }}
                  placeholder="输入主密码"
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                />
              </div>
              {unlockError && <p className={styles.lockError}>{unlockError}</p>}
              <Button onClick={handleUnlock} disabled={!unlockPass}>
                解锁
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Unlocked view ----
  return (
    <div className={styles.page}>
      <PageHeader
        title="密码本"
        description="加密存储账号与密码信息"
        actions={
          <div className={styles.headerActions}>
            <Button onClick={openAdd}>添加</Button>
            <Button variant="secondary" onClick={handleLock}>锁定</Button>
            <Button variant="ghost" onClick={() => setChangePassOpen(true)}>修改主密码</Button>
          </div>
        }
      />

      {loading ? (
        <EmptyState icon="⏳" title="加载中..." />
      ) : entries.length === 0 ? (
        <EmptyState
          icon="🔐"
          title="还没有密码记录"
          description="点击「添加」保存你的第一个密码"
          action={<Button onClick={openAdd}>添加密码</Button>}
        />
      ) : (
        <div className={styles.list}>
          {entries.map((entry) => {
            const isRevealed = revealedIds.has(entry.id)
            const plaintext = revealedPasswords[entry.id]
            const lastUsed = entry.lastUsed ? new Date(entry.lastUsed).toLocaleDateString('zh-CN') : ''

            return (
              <div key={entry.id} className={styles.card}>
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.platform}>{entry.platform || '未命名'}</h3>
                    {entry.username && (
                      <p className={styles.username}>👤 {entry.username}</p>
                    )}
                    <div className={styles.passwordRow}>
                      <span className={styles.passwordLabel}>密码：</span>
                      <code className={styles.passwordValue}>
                        {isRevealed && plaintext ? plaintext : '••••••'}
                      </code>
                      <button
                        className={styles.inlineBtn}
                        onClick={() => handleReveal(entry)}
                        title={isRevealed ? '隐藏密码' : '显示密码'}
                      >
                        {isRevealed ? '🙈' : '👁'}
                      </button>
                      <button
                        className={styles.inlineBtn}
                        onClick={() => handleCopyPassword(entry)}
                        title="复制密码"
                      >
                        📋
                      </button>
                    </div>
                    {entry.url && (
                      <p className={styles.url}>
                        🔗 <a href={entry.url} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>{entry.url}</a>
                      </p>
                    )}
                    {entry.note && (
                      <p className={styles.note}>📝 {entry.note}</p>
                    )}
                    {lastUsed && (
                      <p className={styles.lastUsed}>🕐 上次使用：{lastUsed}</p>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.actionBtn} onClick={() => openEdit(entry)} title="编辑">
                      ✏️
                    </button>
                    <button className={styles.actionBtn} onClick={() => handleDelete(entry.id)} title="删除">
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? '编辑密码' : '添加密码'}
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>平台</label>
            <Input
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              placeholder="例如：GitHub、Google"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>用户名</label>
            <Input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="账号或邮箱"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>密码</label>
            <Input
              type="text"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="密码"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>网址</label>
            <Input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>备注</label>
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="额外说明"
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={closeModal}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Master Password Modal */}
      <Modal
        isOpen={changePassOpen}
        onClose={() => {
          setChangePassOpen(false)
          setChangeOldPass('')
          setChangeNewPass('')
          setChangeNewConfirm('')
          setChangePassError('')
        }}
        title="修改主密码"
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>旧密码</label>
            <Input
              type="password"
              value={changeOldPass}
              onChange={(e) => { setChangeOldPass(e.target.value); setChangePassError('') }}
              placeholder="输入旧密码"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>新密码</label>
            <Input
              type="password"
              value={changeNewPass}
              onChange={(e) => { setChangeNewPass(e.target.value); setChangePassError('') }}
              placeholder="新密码（至少4位）"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>确认新密码</label>
            <Input
              type="password"
              value={changeNewConfirm}
              onChange={(e) => { setChangeNewConfirm(e.target.value); setChangePassError('') }}
              placeholder="再次输入新密码"
            />
          </div>
          {changePassError && <p className={styles.errorText}>{changePassError}</p>}
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => {
              setChangePassOpen(false)
              setChangeOldPass('')
              setChangeNewPass('')
              setChangeNewConfirm('')
              setChangePassError('')
            }}>
              取消
            </Button>
            <Button onClick={handleChangeMasterPassword} disabled={changingPass}>
              {changingPass ? '处理中...' : '确认修改'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/plan/FuturePage.module.css`

```css
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.list {
  display: flex;
  flex-direction: column;
}

.taskItem {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-2);
  border-bottom: var(--border-width) solid var(--color-border-light);
}

.taskItem:last-child {
  border-bottom: none;
}

.checkbox {
  width: 18px;
  height: 18px;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.checkbox:hover {
  border-color: var(--color-border-focus);
  background: var(--color-surface-2);
}

.taskBody {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.taskTitle {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.taskDate {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

```

### `src/pages/plan/FuturePage.tsx`

```tsx
import { useEffect, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { useTaskStore } from '@/stores/taskStore'
import { sortTasks } from '@/domain/planning/taskScheduler'
import { formatDate } from '@/utils/helpers'
import styles from './FuturePage.module.css'

export default function FuturePage() {
  const { tasks, loadTasks, toggleDone } = useTaskStore()

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const futureTasks = useMemo(() => {
    const today = formatDate(new Date())
    return sortTasks(tasks.filter((t) => !t.done && t.dueDate && t.dueDate > today))
  }, [tasks])

  return (
    <div className={styles.page}>
      <PageHeader title="未来" description="已安排但尚未到期的任务" />

      {futureTasks.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="暂无未来任务"
          description="在收件箱或今日计划中为任务指定未来日期"
        />
      ) : (
        <div className={styles.list}>
          {futureTasks.map((task) => (
            <div key={task.id} className={styles.taskItem}>
              <button
                className={styles.checkbox}
                onClick={() => toggleDone(task.id)}
                aria-label="标记完成"
                title="标记完成"
              />
              <div className={styles.taskBody}>
                <span className={styles.taskTitle}>{task.title}</span>
                <span className={styles.taskDate}>{task.dueDate}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

```

### `src/pages/plan/InboxPage.module.css`

```css
/* ============================================================
   InboxPage — 收件箱
   ============================================================ */

.inboxInput {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.inboxInput input {
  flex: 1;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: box-shadow var(--transition-fast);
}

.item:hover {
  box-shadow: var(--shadow-sm);
}

.itemTitle {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.4;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itemActions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.actionBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.actionBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.deleteBtn:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.datePickerOverlay {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.datePickerOverlay label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.datePickerOverlay input[type="date"] {
  padding: 10px 14px;
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition-fast);
}

.datePickerOverlay input[type="date"]:focus {
  border-color: var(--color-border-focus);
}

.dateActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
```

### `src/pages/plan/InboxPage.tsx`

```tsx
import { useEffect, useState, useMemo, type KeyboardEvent, type ChangeEvent } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { useTaskStore } from '@/stores/taskStore'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/utils/helpers'
import styles from './InboxPage.module.css'

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'default'> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'default',
}

export default function InboxPage() {
  const { tasks, loading, loadTasks, addTask, updateTask, deleteTask } = useTaskStore()

  const [inputValue, setInputValue] = useState('')
  const [datePickerTaskId, setDatePickerTaskId] = useState<string | null>(null)
  const [pickedDate, setPickedDate] = useState('')

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const inboxTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.dueDate && !t.projectId && !t.done)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [tasks])

  const handleAdd = () => {
    const title = inputValue.trim()
    if (!title) return
    addTask({ title })
    setInputValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  const openDatePicker = (taskId: string) => {
    setDatePickerTaskId(taskId)
    setPickedDate(formatDate(new Date()))
  }

  const handleSetDate = () => {
    if (datePickerTaskId && pickedDate) {
      updateTask(datePickerTaskId, { dueDate: pickedDate })
    }
    setDatePickerTaskId(null)
    setPickedDate('')
  }

  const formatCreatedAt = (iso: string): string => {
    const d = new Date(iso)
    const m = d.getMonth() + 1
    const day = d.getDate()
    return `${m}月${day}日`
  }

  return (
    <div>
      <PageHeader
        title="收件箱"
        description="快速记录想法和待办事项"
      />

      <div className={styles.inboxInput}>
        <Input
          value={inputValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="快速记录想法，按 Enter 添加..."
        />
        <Button variant="primary" size="sm" onClick={handleAdd} disabled={!inputValue.trim()}>
          添加
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>加载中...</div>
      ) : inboxTasks.length === 0 ? (
        <EmptyState
          icon="📥"
          title="收件箱是空的"
          description="在这里快速捕获想法，稍后整理"
        />
      ) : (
        <div className={`${styles.list} anim-list-stagger`}>
          {inboxTasks.map((task) => (
            <div key={task.id} className={styles.item}>
              <span className={styles.itemTitle}>{task.title}</span>
              <Badge variant={PRIORITY_VARIANT[task.priority] || 'default'}>
                {task.priority}
              </Badge>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                {formatCreatedAt(task.createdAt)}
              </span>
              <div className={styles.itemActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => openDatePicker(task.id)}
                  title="安排日期"
                >
                  📅
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={() => deleteTask(task.id)}
                  title="删除"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={datePickerTaskId !== null}
        onClose={() => { setDatePickerTaskId(null); setPickedDate('') }}
        title="安排日期"
        size="sm"
      >
        <div className={styles.datePickerOverlay}>
          <label htmlFor="inbox-date">选择日期</label>
          <input
            id="inbox-date"
            type="date"
            value={pickedDate}
            onChange={(e) => setPickedDate(e.target.value)}
          />
          <div className={styles.dateActions}>
            <Button variant="ghost" size="sm" onClick={() => { setDatePickerTaskId(null); setPickedDate('') }}>
              取消
            </Button>
            <Button variant="primary" size="sm" onClick={handleSetDate}>
              确定
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/plan/PlanLayout.module.css`

```css
/* ============================================================
   PlanLayout — Sub-navigation tabs
   ============================================================ */

.container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  width: fit-content;
}

.tab {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  border-radius: calc(var(--radius-md) - 4px);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.tab:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-2);
}

.tabActive {
  color: var(--color-accent-text);
  background: var(--color-accent);
}

.tabActive:hover {
  color: var(--color-accent-text);
  background: var(--color-accent-hover);
}
```

### `src/pages/plan/PlanLayout.tsx`

```tsx
import { Outlet } from 'react-router-dom'

export default function PlanLayout() {
  return <Outlet />
}
```

### `src/pages/plan/PlanPage.module.css`

```css
/* ============================================================
   PlanPage — 共享计划页面样式（TodayPlanPage / InboxPage）
   ============================================================ */

/* ---- Quick Add Input ---- */

.quickAdd {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.quickAdd input {
  flex: 1;
}

/* ---- Filter Tabs ---- */

.filters {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  width: fit-content;
  margin-bottom: 16px;
}

.filterTab {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  border-radius: calc(var(--radius-md) - 4px);
  transition: all var(--transition-fast);
  white-space: nowrap;
  cursor: pointer;
  background: none;
  border: none;
}

.filterTab:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-2);
}

.filterTabActive {
  color: var(--color-accent-text);
  background: var(--color-accent);
}

.filterTabActive:hover {
  color: var(--color-accent-text);
  background: var(--color-accent-hover);
}

/* ---- Task List ---- */

.taskList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.taskItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: box-shadow var(--transition-fast);
}

.taskItem:hover {
  box-shadow: var(--shadow-sm);
}

.taskItemCompleted {
  opacity: 0.55;
}

/* ---- Checkbox ---- */

.checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  padding: 0;
}

.checkbox:hover {
  border-color: var(--color-accent);
}

.checked {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.checkmark {
  display: none;
}

.checked .checkmark {
  display: block;
  width: 6px;
  height: 10px;
  border: solid var(--color-text-inverse);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-top: -2px;
}

/* ---- Task Title ---- */

.taskTitle {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.4;
  min-width: 0;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background var(--transition-fast);
}

.taskTitle:hover {
  background: var(--color-surface-2);
}

.taskTitleDone {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

/* ---- Inline Edit ---- */

.inlineEdit {
  flex: 1;
  min-width: 0;
}

.inlineEdit input {
  width: 100%;
  padding: 4px 8px;
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border-focus);
  border-radius: 4px;
  outline: none;
  line-height: 1.4;
}

/* ---- Task Actions ---- */

.taskActions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.actionBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  background: none;
  border: none;
  cursor: pointer;
}

.actionBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.pinBtn {
  color: var(--color-text-tertiary);
}

.pinBtnActive {
  color: var(--color-accent);
}

.deleteBtn:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

/* ---- Section Label ---- */

.sectionLabel {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  margin: 20px 0 8px;
  text-transform: none;
  letter-spacing: 0.2px;
}

/* ---- Loading ---- */

.loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ---- Inbox extras ---- */

.inboxInput {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.inboxInput input {
  flex: 1;
}

.inboxList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inboxItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: box-shadow var(--transition-fast);
}

.inboxItem:hover {
  box-shadow: var(--shadow-sm);
}

.inboxItemTitle {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.4;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inboxItemActions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.inboxActionBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  background: none;
  border: none;
  cursor: pointer;
}

.inboxActionBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.inboxDeleteBtn:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.datePickerOverlay {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.datePickerOverlay label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.datePickerOverlay input[type="date"] {
  padding: 10px 14px;
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition-fast);
}

.datePickerOverlay input[type="date"]:focus {
  border-color: var(--color-border-focus);
}

.dateActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
```

### `src/pages/plan/ProjectsPage.module.css`

```css
/* ============================================================
   ProjectsPage — 项目追踪
   ============================================================ */

.page {
  max-width: 900px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ---- Filter Tabs ---- */

.filterTabs {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filterTab {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}

.filterTab:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.filterTabActive {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
}

.filterTabActive:hover {
  background: var(--color-accent-hover);
  color: #fff;
}

/* ---- List ---- */

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---- Card Header ---- */

.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.cardTitleRow {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.cardTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cardActions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* ---- Progress ---- */

.progressSection {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progressBar {
  flex: 1;
  height: 8px;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.progressText {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  min-width: 36px;
  text-align: right;
}

/* ---- Tags ---- */

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* ---- Description ---- */

.description {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ---- Milestones ---- */

.milestones {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.milestonesHeader {
  display: flex;
  align-items: center;
  gap: 8px;
}

.milestonesTitle {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.milestoneItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 14px;
  color: var(--color-text-primary);
  cursor: pointer;
}

.milestoneItem input[type='checkbox'] {
  accent-color: var(--color-accent);
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.milestoneItem span {
  flex: 1;
  min-width: 0;
}

.milestoneDone {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.milestoneDelete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  font-size: 16px;
  color: var(--color-text-tertiary);
  opacity: 0;
  transition: all var(--transition-fast);
  background: none;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
}

.milestoneItem:hover .milestoneDelete {
  opacity: 1;
}

.milestoneDelete:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

/* ---- Card Footer ---- */

.cardFooter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
}

.addMilestoneInline {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.inlineInput {
  flex: 1;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--color-text-primary);
  background: var(--color-surface-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition-fast);
  font-family: inherit;
}

.inlineInput:focus {
  border-color: var(--color-border-focus);
  background: var(--color-surface);
}

.expandBtn {
  font-size: 13px;
  color: var(--color-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
  font-family: inherit;
  flex-shrink: 0;
}

.expandBtn:hover {
  background: var(--color-accent-light);
}

/* ---- Form ---- */

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.input {
  padding: 8px 12px;
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition-fast);
  font-family: inherit;
}

.input:focus {
  border-color: var(--color-border-focus);
}

.textarea {
  padding: 8px 12px;
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition-fast);
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
}

.textarea:focus {
  border-color: var(--color-border-focus);
}

/* ---- Milestone Form ---- */

.milestoneFormList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.milestoneFormItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.milestoneFormTitle {
  flex: 1;
  color: var(--color-text-primary);
}

.addMilestoneForm {
  display: flex;
  gap: 8px;
  align-items: center;
}

.addMilestoneForm .input {
  flex: 1;
}

/* ---- Form Actions ---- */

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}
```

### `src/pages/plan/ProjectsPage.tsx`

```tsx
import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useProjectStore } from '@/stores/projectStore'
import { useToast } from '@/components/ui/Toast'
import { uid } from '@/utils/helpers'
import type { Project, ProjectStage, Milestone } from '@/types'
import styles from './ProjectsPage.module.css'

const STAGES: { key: ProjectStage | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'plan', label: '计划中' },
  { key: 'active', label: '进行中' },
  { key: 'done', label: '已完成' },
  { key: 'paused', label: '已暂停' },
]

const STAGE_BADGES: Record<ProjectStage, { label: string; variant: 'info' | 'success' | 'default' | 'warning' }> = {
  plan: { label: '计划中', variant: 'info' },
  active: { label: '进行中', variant: 'success' },
  done: { label: '已完成', variant: 'default' },
  paused: { label: '已暂停', variant: 'warning' },
}

interface FormData {
  title: string
  description: string
  stage: ProjectStage
  notes: string
  tagsText: string
  milestones: Milestone[]
}

const EMPTY_FORM: FormData = {
  title: '',
  description: '',
  stage: 'plan',
  notes: '',
  tagsText: '',
  milestones: [],
}

export default function ProjectsPage() {
  const { projects, loading, loadProjects, addProject, updateProject, deleteProject, toggleMilestone, addMilestone, deleteMilestone } =
    useProjectStore()
  const { toast } = useToast()

  const [stageFilter, setStageFilter] = useState<ProjectStage | 'all'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const filtered = stageFilter === 'all'
    ? projects
    : projects.filter((p) => p.stage === stageFilter)

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setNewMilestoneTitle('')
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((p: Project) => {
    setEditingId(p.id)
    setForm({
      title: p.title,
      description: p.description,
      stage: p.stage,
      notes: p.notes,
      tagsText: p.tags.join('、'),
      milestones: p.milestones,
    })
    setNewMilestoneTitle('')
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    const title = form.title.trim()
    if (!title) {
      toast('请输入项目名称', 'warning')
      return
    }
    const tags = form.tagsText
      .split(/[、,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)

    if (editingId) {
      await updateProject(editingId, {
        title,
        description: form.description,
        stage: form.stage,
        notes: form.notes,
        tags,
        milestones: form.milestones,
      })
      toast('已更新', 'success')
    } else {
      await addProject(title)
      const created = useProjectStore.getState().projects.at(-1)
      if (created) {
        await updateProject(created.id, {
          description: form.description,
          notes: form.notes,
          tags,
          milestones: form.milestones,
        })
      }
      toast('已创建', 'success')
    }
    setModalOpen(false)
  }, [form, editingId, addProject, updateProject, toast])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteProject(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteProject, toast],
  )

  const handleToggleMilestone = useCallback(
    async (projectId: string, milestoneId: string) => {
      await toggleMilestone(projectId, milestoneId)
    },
    [toggleMilestone],
  )

  const handleAddMilestone = useCallback(
    async (projectId: string) => {
      const title = newMilestoneTitle.trim()
      if (!title) return
      await addMilestone(projectId, title)
      setNewMilestoneTitle('')
    },
    [newMilestoneTitle, addMilestone],
  )

  const handleDeleteMilestone = useCallback(
    async (projectId: string, milestoneId: string) => {
      await deleteMilestone(projectId, milestoneId)
    },
    [deleteMilestone],
  )

  const handleFormAddMilestone = useCallback(() => {
    const title = newMilestoneTitle.trim()
    if (!title) return
    setForm((f) => ({
      ...f,
      milestones: [...f.milestones, { id: uid(), title, done: false }],
    }))
    setNewMilestoneTitle('')
  }, [newMilestoneTitle])

  const handleFormRemoveMilestone = useCallback((id: string) => {
    setForm((f) => ({
      ...f,
      milestones: f.milestones.filter((m) => m.id !== id),
    }))
  }, [])

  return (
    <div className={styles.page}>
      <PageHeader
        title="项目追踪"
        description="管理长期项目与里程碑"
        actions={<Button onClick={openCreate}>新建项目</Button>}
      />

      <div className={styles.filterTabs}>
        {STAGES.map((s) => (
          <button
            key={s.key}
            className={`${styles.filterTab} ${stageFilter === s.key ? styles.filterTabActive : ''}`}
            onClick={() => setStageFilter(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📁"
          title={stageFilter === 'all' ? '还没有项目' : '没有匹配的项目'}
          description="点击上方按钮创建你的第一个项目"
          action={<Button onClick={openCreate}>新建项目</Button>}
        />
      ) : (
        <div className={styles.list}>
          {filtered.map((p) => {
            const badge = STAGE_BADGES[p.stage]
            const isExpanded = expandedId === p.id

            return (
              <Card key={p.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{p.title}</h3>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <div className={styles.cardActions}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      编辑
                    </Button>
                    {confirmId === p.id ? (
                      <>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>
                          确认删除
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                          取消
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(p.id)}>
                        删除
                      </Button>
                    )}
                  </div>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>{p.progress}%</span>
                </div>

                {p.tags.length > 0 && (
                  <div className={styles.tags}>
                    {p.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                )}

                {p.description && (
                  <p className={styles.description}>
                    {isExpanded ? p.description : p.description.length > 80 ? p.description.slice(0, 80) + '...' : p.description}
                  </p>
                )}

                {p.milestones.length > 0 && (
                  <div className={styles.milestones}>
                    <div className={styles.milestonesHeader}>
                      <span className={styles.milestonesTitle}>
                        里程碑 ({p.milestones.filter((m) => m.done).length}/{p.milestones.length})
                      </span>
                    </div>
                    {p.milestones.map((m) => (
                      <label key={m.id} className={styles.milestoneItem}>
                        <input
                          type="checkbox"
                          checked={m.done}
                          onChange={() => handleToggleMilestone(p.id, m.id)}
                        />
                        <span className={m.done ? styles.milestoneDone : ''}>{m.title}</span>
                        <button
                          className={styles.milestoneDelete}
                          onClick={(e) => {
                            e.preventDefault()
                            handleDeleteMilestone(p.id, m.id)
                          }}
                          title="删除"
                        >
                          ×
                        </button>
                      </label>
                    ))}
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <div className={styles.addMilestoneInline}>
                    <input
                      className={styles.inlineInput}
                      placeholder="添加里程碑..."
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddMilestone(p.id)
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleAddMilestone(p.id)}>
                      +
                    </Button>
                  </div>
                  <button
                    className={styles.expandBtn}
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  >
                    {isExpanded ? '收起' : '展开详情'}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑项目' : '新建项目'}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>项目名称</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：完成 React 课程"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>阶段</label>
            <select
              className={styles.input}
              value={form.stage}
              onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as ProjectStage }))}
            >
              <option value="plan">计划中</option>
              <option value="active">进行中</option>
              <option value="done">已完成</option>
              <option value="paused">已暂停</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>描述</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="项目描述..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>标签（用顿号或逗号分隔）</label>
            <input
              className={styles.input}
              value={form.tagsText}
              onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
              placeholder="例如：学习、前端、React"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>里程碑</label>
            <div className={styles.milestoneFormList}>
              {form.milestones.map((m) => (
                <div key={m.id} className={styles.milestoneFormItem}>
                  <span className={styles.milestoneFormTitle}>{m.title}</span>
                  <button
                    className={styles.milestoneDelete}
                    onClick={() => handleFormRemoveMilestone(m.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.addMilestoneForm}>
              <input
                className={styles.input}
                placeholder="新里程碑..."
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleFormAddMilestone()
                  }
                }}
              />
              <Button size="sm" variant="ghost" onClick={handleFormAddMilestone}>
                添加
              </Button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>备注</label>
            <textarea
              className={styles.textarea}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="备注信息..."
              rows={3}
            />
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{editingId ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/plan/RecurringPage.module.css`

```css
/* ============================================================
   RecurringPage — 周期计划
   ============================================================ */

.page {
  max-width: 900px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ---- List ---- */

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cardTop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.cardInfo {
  flex: 1;
  min-width: 0;
}

.cardTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
  line-height: 1.4;
}

.cardMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ruleDesc {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.timeInfo {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.dateRange {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.cardActions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* ---- Toggle Switch ---- */

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggleSlider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.toggleSlider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background: var(--color-text-tertiary);
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.toggle input:checked + .toggleSlider {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.toggle input:checked + .toggleSlider::before {
  transform: translateX(20px);
  background: #fff;
}

/* ---- Generate Preview ---- */

.generatePreview {
  padding-top: 10px;
  border-top: 1px solid var(--color-border-light);
  font-size: 13px;
}

.willGenerate {
  color: var(--color-success);
}

.wontGenerate {
  color: var(--color-text-tertiary);
}

/* ---- Form ---- */

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.formRow {
  display: flex;
  gap: 16px;
}

.formRow .formGroup {
  flex: 1;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.input {
  padding: 8px 12px;
  font-size: 14px;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition-fast);
  font-family: inherit;
}

.input:focus {
  border-color: var(--color-border-focus);
}

/* ---- Radio Group ---- */

.radioGroup {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.radio {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--color-text-primary);
  cursor: pointer;
}

.radio input {
  accent-color: var(--color-accent);
}

/* ---- Checkbox Chips ---- */

.checkboxGroup {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.checkboxChip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.checkboxChip:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.checkboxChipActive {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.checkboxChip input {
  display: none;
}

/* ---- Checkbox Label ---- */

.checkboxLabel {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--color-text-primary);
  cursor: pointer;
  margin-top: 4px;
}

.checkboxLabel input {
  accent-color: var(--color-accent);
}

/* ---- Form Actions ---- */

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}
```

### `src/pages/plan/RecurringPage.tsx`

```tsx
import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useRecurringStore } from '@/stores/recurringStore'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/utils/helpers'
import type { RecurringTask, RecurringRuleType, TaskPriority } from '@/types'
import styles from './RecurringPage.module.css'

const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

const WEEK_DAYS = [
  { value: 0, label: '日' },
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
]

const PRIORITY_LABELS: Record<TaskPriority, string> = { P0: 'P0', P1: 'P1', P2: 'P2' }
const PRIORITY_VARIANTS: Record<TaskPriority, 'danger' | 'warning' | 'default'> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'default',
}

function describeRule(rt: RecurringTask): string {
  const { rule } = rt
  switch (rule.type) {
    case 'daily':
      return '每天'
    case 'weekly':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        return '每周' + rule.daysOfWeek.sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join('、')
      }
      return '每周'
    case 'monthly':
      if (rule.daysOfMonth && rule.daysOfMonth.length > 0) {
        const sorted = [...rule.daysOfMonth].sort((a, b) => a - b)
        if (sorted.length === 1 && sorted[0] === 32) return '每月最后一天'
        return '每月' + sorted.join('、') + '日'
      }
      return '每月'
    case 'custom':
      if (rule.intervalDays) return `每隔${rule.intervalDays}天`
      return '自定义'
    default:
      return '未知'
  }
}

function canGenerateToday(rt: RecurringTask): boolean {
  if (!rt.enabled) return false
  const today = formatDate(new Date())
  if (rt.startDate && today < rt.startDate) return false
  if (rt.endDate && today > rt.endDate) return false
  if (rt.lastGeneratedDate === today) return false

  const now = new Date()
  const dayOfWeek = now.getDay()
  const dayOfMonth = now.getDate()

  switch (rt.rule.type) {
    case 'daily':
      return true
    case 'weekly':
      return !!(rt.rule.daysOfWeek && rt.rule.daysOfWeek.includes(dayOfWeek))
    case 'monthly':
      if (rt.rule.daysOfMonth && rt.rule.daysOfMonth.length > 0) {
        return rt.rule.daysOfMonth.includes(dayOfMonth) ||
          (rt.rule.daysOfMonth.includes(32) && isLastDayOfMonth(now))
      }
      return false
    case 'custom':
      if (rt.rule.intervalDays) {
        const last = rt.lastGeneratedDate
          ? new Date(rt.lastGeneratedDate)
          : new Date(rt.startDate)
        const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
        return diff >= rt.rule.intervalDays
      }
      return false
    default:
      return false
  }
}

function isLastDayOfMonth(date: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return date.getDate() === d.getDate()
}

interface FormData {
  title: string
  ruleType: RecurringRuleType
  daysOfWeek: number[]
  dayOfMonth: string
  isLastDay: boolean
  intervalDays: string
  time: string
  priority: TaskPriority
  category: string
  startDate: string
  endDate: string
  enabled: boolean
}

const EMPTY_FORM: FormData = {
  title: '',
  ruleType: 'daily',
  daysOfWeek: [],
  dayOfMonth: '',
  isLastDay: false,
  intervalDays: '3',
  time: '',
  priority: 'P2',
  category: '',
  startDate: formatDate(new Date()),
  endDate: '',
  enabled: true,
}

export default function RecurringPage() {
  const { recurringTasks, loading, loadRecurring, addRecurring, updateRecurring, deleteRecurring, toggleEnabled } =
    useRecurringStore()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    loadRecurring()
  }, [loadRecurring])

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((rt: RecurringTask) => {
    setEditingId(rt.id)
    setForm({
      title: rt.title,
      ruleType: rt.rule.type,
      daysOfWeek: rt.rule.daysOfWeek || [],
      dayOfMonth: rt.rule.daysOfMonth
        ? rt.rule.daysOfMonth.filter((d) => d !== 32).join('、')
        : '',
      isLastDay: !!(rt.rule.daysOfMonth && rt.rule.daysOfMonth.includes(32)),
      intervalDays: String(rt.rule.intervalDays || 3),
      time: rt.time,
      priority: rt.priority,
      category: rt.category,
      startDate: rt.startDate,
      endDate: rt.endDate,
      enabled: rt.enabled,
    })
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    const title = form.title.trim()
    if (!title) {
      toast('请输入标题', 'warning')
      return
    }

    const rule: RecurringTask['rule'] = { type: form.ruleType }
    switch (form.ruleType) {
      case 'weekly':
        rule.daysOfWeek = form.daysOfWeek.length > 0 ? form.daysOfWeek : undefined
        break
      case 'monthly': {
        const days: number[] = []
        if (form.dayOfMonth) {
          form.dayOfMonth.split(/[、,，\s]+/).forEach((s) => {
            const n = parseInt(s, 10)
            if (n >= 1 && n <= 31) days.push(n)
          })
        }
        if (form.isLastDay) days.push(32)
        rule.daysOfMonth = days.length > 0 ? days : undefined
        break
      }
      case 'custom':
        rule.intervalDays = parseInt(form.intervalDays, 10) || 3
        break
    }

    const payload: Partial<RecurringTask> & { title: string; rule: RecurringTask['rule'] } = {
      title,
      rule,
      time: form.time,
      priority: form.priority,
      category: form.category.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      enabled: form.enabled,
    }

    if (editingId) {
      await updateRecurring(editingId, payload)
      toast('已更新', 'success')
    } else {
      await addRecurring(payload)
      toast('已创建', 'success')
    }
    setModalOpen(false)
  }, [form, editingId, addRecurring, updateRecurring, toast])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteRecurring(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteRecurring, toast],
  )

  const handleToggle = useCallback(
    async (id: string) => {
      await toggleEnabled(id)
    },
    [toggleEnabled],
  )

  const toggleWeekDay = useCallback((day: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day],
    }))
  }, [])

  return (
    <div className={styles.page}>
      <PageHeader
        title="周期计划"
        description="管理周期性重复任务与习惯"
        actions={
          <Button onClick={openCreate}>新建周期计划</Button>
        }
      />

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : recurringTasks.length === 0 ? (
        <EmptyState
          icon="🔄"
          title="还没有周期计划"
          description="点击上方按钮创建你的第一个周期计划"
          action={<Button onClick={openCreate}>新建周期计划</Button>}
        />
      ) : (
        <div className={styles.list}>
          {recurringTasks.map((rt) => (
            <Card key={rt.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>{rt.title}</h3>
                  <div className={styles.cardMeta}>
                    <Badge variant={PRIORITY_VARIANTS[rt.priority]}>
                      {PRIORITY_LABELS[rt.priority]}
                    </Badge>
                    <span className={styles.ruleDesc}>{describeRule(rt)}</span>
                    {rt.category && <Badge variant="info">{rt.category}</Badge>}
                    {rt.time && <span className={styles.timeInfo}>{rt.time}</span>}
                  </div>
                  {rt.startDate && (
                    <div className={styles.dateRange}>
                      {rt.startDate} {rt.endDate ? `~ ${rt.endDate}` : '起'}
                    </div>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={rt.enabled}
                      onChange={() => handleToggle(rt.id)}
                    />
                    <span className={styles.toggleSlider} />
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(rt)}>
                    编辑
                  </Button>
                  {confirmId === rt.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(rt.id)}>
                        确认删除
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(rt.id)}>
                      删除
                    </Button>
                  )}
                </div>
              </div>
              <div className={styles.generatePreview}>
                {canGenerateToday(rt) ? (
                  <span className={styles.willGenerate}>✅ 今天会生成此任务</span>
                ) : (
                  <span className={styles.wontGenerate}>⏸ 今天不会生成此任务</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑周期计划' : '新建周期计划'}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>标题</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：每日晨跑"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>规则类型</label>
            <div className={styles.radioGroup}>
              {(['daily', 'weekly', 'monthly', 'custom'] as RecurringRuleType[]).map((type) => (
                <label key={type} className={styles.radio}>
                  <input
                    type="radio"
                    name="ruleType"
                    checked={form.ruleType === type}
                    onChange={() => setForm((f) => ({ ...f, ruleType: type }))}
                  />
                  <span>
                    {type === 'daily' ? '每天' : type === 'weekly' ? '每周' : type === 'monthly' ? '每月' : '自定义'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {form.ruleType === 'weekly' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>选择星期</label>
              <div className={styles.checkboxGroup}>
                {WEEK_DAYS.map((day) => (
                  <label
                    key={day.value}
                    className={`${styles.checkboxChip} ${form.daysOfWeek.includes(day.value) ? styles.checkboxChipActive : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={form.daysOfWeek.includes(day.value)}
                      onChange={() => toggleWeekDay(day.value)}
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.ruleType === 'monthly' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>日期设置</label>
              <input
                className={styles.input}
                value={form.dayOfMonth}
                onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                placeholder="例如：1、15（用逗号或顿号分隔）"
              />
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.isLastDay}
                  onChange={(e) => setForm((f) => ({ ...f, isLastDay: e.target.checked }))}
                />
                <span>最后一天</span>
              </label>
            </div>
          )}

          {form.ruleType === 'custom' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>间隔天数</label>
              <input
                className={styles.input}
                type="number"
                min={1}
                value={form.intervalDays}
                onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value }))}
              />
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>时间（可选）</label>
              <input
                className={styles.input}
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>优先级</label>
              <select
                className={styles.input}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
              >
                <option value="P0">P0 - 最高</option>
                <option value="P1">P1 - 中等</option>
                <option value="P2">P2 - 低</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>分类</label>
            <input
              className={styles.input}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="例如：运动、学习、生活"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>开始日期</label>
              <input
                className={styles.input}
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>结束日期（可选）</label>
              <input
                className={styles.input}
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
              <span>启用</span>
            </label>
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{editingId ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/plan/TodayPlanPage.tsx`

```tsx
import { useEffect, useState, useMemo, useRef, type KeyboardEvent, type ChangeEvent } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { useTaskStore } from '@/stores/taskStore'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/utils/helpers'
import type { Task } from '@/types'
import styles from './PlanPage.module.css'

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 }
const FILTER_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'P0', label: 'P0' },
  { key: 'P1', label: 'P1' },
  { key: 'P2', label: 'P2' },
]

const PRIORITY_VARIANT: Record<string, 'danger' | 'warning' | 'default'> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'default',
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    const pa = PRIORITY_ORDER[a.priority] ?? 99
    const pb = PRIORITY_ORDER[b.priority] ?? 99
    if (pa !== pb) return pa - pb
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export default function TodayPlanPage() {
  const { tasks, loading, loadTasks, addTask, updateTask, deleteTask, toggleDone, togglePin } = useTaskStore()

  const [inputValue, setInputValue] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const today = formatDate(new Date())

  // Active tasks (not done, today)
  const activeTasks = useMemo(() => {
    const raw = tasks.filter((t) => t.dueDate === today && !t.done)
    const filtered = filter === 'all' ? raw : raw.filter((t) => t.priority === filter)
    return sortTasks(filtered)
  }, [tasks, today, filter])

  // Completed tasks (done, today)
  const completedTasks = useMemo(() => {
    const raw = tasks.filter((t) => t.dueDate === today && t.done)
    const filtered = filter === 'all' ? raw : raw.filter((t) => t.priority === filter)
    return sortTasks(filtered)
  }, [tasks, today, filter])

  const hasAnyTasks = tasks.some((t) => t.dueDate === today)

  const handleQuickAdd = () => {
    const title = inputValue.trim()
    if (!title) return
    addTask({ title, dueDate: today })
    setInputValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleQuickAdd()
    }
  }

  const startEdit = (task: Task) => {
    setEditingId(task.id)
    setEditValue(task.title)
  }

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      updateTask(editingId, { title: editValue.trim() })
    }
    setEditingId(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  return (
    <div>
      <PageHeader
        title="今日计划"
        description="管理今日的待办任务与优先级"
      />

      <div className={styles.quickAdd}>
        <Input
          value={inputValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="添加今日任务，按 Enter 添加..."
        />
        <Button variant="primary" size="sm" onClick={handleQuickAdd} disabled={!inputValue.trim()}>
          添加
        </Button>
      </div>

      <div className={styles.filters}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.filterTab} ${filter === tab.key ? styles.filterTabActive : ''}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : !hasAnyTasks ? (
        <EmptyState
          icon="📋"
          title="今天没有计划任务"
          description="添加任务开始规划今天吧"
        />
      ) : (
        <>
          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <EmptyState
              icon="📋"
              title="当前筛选条件下没有任务"
              description="试试切换筛选条件"
            />
          ) : (
            <>
              {activeTasks.length > 0 && (
                <div className={styles.taskList}>
                  {activeTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isEditing={editingId === task.id}
                      editValue={editingId === task.id ? editValue : ''}
                      editInputRef={editInputRef}
                      onToggle={() => toggleDone(task.id)}
                      onStartEdit={() => startEdit(task)}
                      onEditChange={(e) => setEditValue(e.target.value)}
                      onSaveEdit={saveEdit}
                      onCancelEdit={cancelEdit}
                      onEditKeyDown={handleEditKeyDown}
                      onPin={() => togglePin(task.id)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              )}

              {completedTasks.length > 0 && (
                <>
                  <div className={styles.sectionLabel}>
                    已完成 ({completedTasks.length})
                  </div>
                  <div className={styles.taskList}>
                    {completedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isEditing={editingId === task.id}
                        editValue={editingId === task.id ? editValue : ''}
                        editInputRef={editInputRef}
                        onToggle={() => toggleDone(task.id)}
                        onStartEdit={() => startEdit(task)}
                        onEditChange={(e) => setEditValue(e.target.value)}
                        onSaveEdit={saveEdit}
                        onCancelEdit={cancelEdit}
                        onEditKeyDown={handleEditKeyDown}
                        onPin={() => togglePin(task.id)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ---- Task Row ----

interface TaskRowProps {
  task: Task
  isEditing: boolean
  editValue: string
  editInputRef: React.RefObject<HTMLInputElement | null>
  onToggle: () => void
  onStartEdit: () => void
  onEditChange: (e: ChangeEvent<HTMLInputElement>) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onPin: () => void
  onDelete: () => void
}

function TaskRow({
  task,
  isEditing,
  editValue,
  editInputRef,
  onToggle,
  onStartEdit,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  onEditKeyDown,
  onPin,
  onDelete,
}: TaskRowProps) {
  return (
    <div className={`${styles.taskItem} ${task.done ? styles.taskItemCompleted : ''}`}>
      <button
        className={`${styles.checkbox} ${task.done ? styles.checked : ''}`}
        onClick={onToggle}
        aria-label={task.done ? '标记为未完成' : '标记为已完成'}
      >
        <span className={styles.checkmark} />
      </button>

      {isEditing ? (
        <div className={styles.inlineEdit}>
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={onEditChange}
            onBlur={onSaveEdit}
            onKeyDown={onEditKeyDown}
          />
        </div>
      ) : (
        <span
          className={`${styles.taskTitle} ${task.done ? styles.taskTitleDone : ''}`}
          onClick={() => { if (!task.done) onStartEdit() }}
        >
          {task.title}
        </span>
      )}

      <Badge variant={PRIORITY_VARIANT[task.priority] || 'default'}>
        {task.priority}
      </Badge>

      <div className={styles.taskActions}>
        <button
          className={`${styles.actionBtn} ${styles.pinBtn} ${task.pinned ? styles.pinBtnActive : ''}`}
          onClick={onPin}
          title={task.pinned ? '取消置顶' : '置顶'}
        >
          📌
        </button>
        <button
          className={styles.actionBtn}
          onClick={onStartEdit}
          title="编辑"
        >
          ✏️
        </button>
        <button
          className={`${styles.actionBtn} ${styles.deleteBtn}`}
          onClick={onDelete}
          title="删除"
        >
          🗑
        </button>
      </div>
    </div>
  )
}
```

### `src/pages/quickmemo/QuickMemoPage.module.css`

```css
.window {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary, #f8fafc);
  overflow: hidden;
}

.titleBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  user-select: none;
  cursor: default;
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #64748b);
  letter-spacing: 0.5px;
}

.closeBtn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary, #94a3b8);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.closeBtn:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.06));
  color: var(--color-text-primary, #334155);
}

.textarea {
  flex: 1;
  margin: 0 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
  background: var(--bg-secondary, #ffffff);
  color: var(--color-text-primary, #1e293b);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: none;
  outline: none;
  transition: border-color 0.15s ease;
}

.textarea:focus {
  border-color: var(--color-accent, #6366f1);
}

.textarea::placeholder {
  color: var(--color-text-tertiary, #94a3b8);
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 12px;
}

.hint {
  font-size: 12px;
  color: var(--color-text-tertiary, #94a3b8);
}

.saveBtn {
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent, #6366f1);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.saveBtn:hover:not(:disabled) {
  opacity: 0.9;
}

.saveBtn:active:not(:disabled) {
  transform: scale(0.97);
}

.saveBtn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

```

### `src/pages/quickmemo/QuickMemoPage.tsx`

```tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRecordStore } from '@/stores/recordStore'
import { hideCurrentWindow, emitToMainWindow } from '@/desktop'
import styles from './QuickMemoPage.module.css'

/**
 * Quick memo floating window (desktop only).
 * Triggered by the global shortcut Ctrl+Shift+Space or the tray menu.
 * Saves straight into the memo stream (IndexedDB) and notifies the
 * main window so its store stays in sync.
 */
export default function QuickMemoPage() {
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const addMemo = useRecordStore((s) => s.addMemo)

  // Focus the input whenever the window is (re)opened
  useEffect(() => {
    const focusInput = () => {
      textareaRef.current?.focus()
    }
    focusInput()
    // Rust side dispatches this event via eval() when the window is shown
    window.addEventListener('wb-quick-memo-open', focusInput)
    return () => window.removeEventListener('wb-quick-memo-open', focusInput)
  }, [])

  const handleSave = useCallback(async () => {
    const text = content.trim()
    if (!text) {
      await hideCurrentWindow()
      return
    }
    try {
      await addMemo(text)
      await emitToMainWindow('wb-quick-memo-saved', { content: text })
    } catch (err) {
      // Keep the content so nothing is lost; surface the failure to the user
      console.error('[QuickMemo] Save failed:', err)
      setSaveError(true)
      setTimeout(() => setSaveError(false), 2500)
      return
    }
    setContent('')
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      hideCurrentWindow()
    }, 500)
  }, [content, addMemo])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setContent('')
        hideCurrentWindow()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  return (
    <div className={styles.window}>
      <div className={styles.titleBar} data-tauri-drag-region>
        <span className={styles.title}>⚡ 快捷备忘</span>
        <button
          className={styles.closeBtn}
          onClick={() => hideCurrentWindow()}
          title="收起 (Esc)"
        >
          ✕
        </button>
      </div>

      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="想到什么，先记下来…&#10;(Ctrl+Enter 保存 · Esc 收起)"
        autoFocus
        spellCheck={false}
      />

      <div className={styles.footer}>
        <span className={styles.hint}>
          {saveError ? '✗ 保存失败，内容已保留' : saved ? '✓ 已保存' : 'Ctrl+Enter 保存'}
        </span>
        <button className={styles.saveBtn} onClick={handleSave} disabled={!content.trim()}>
          存入备忘录
        </button>
      </div>
    </div>
  )
}

```

### `src/pages/record/MemosPage.module.css`

```css
/* MemosPage — 备忘录 */
.page { display: flex; flex-direction: column; gap: 20px; }
.inputArea { display: flex; flex-direction: column; gap: 8px; }
.textarea { width: 100%; padding: 12px 14px; font-size: 14px; color: var(--color-text-primary); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); resize: vertical; outline: none; font-family: inherit; line-height: 1.6; transition: border-color var(--transition-fast); }
.textarea:focus { border-color: var(--color-border-focus); }
.textarea::placeholder { color: var(--color-text-tertiary); }
.inputFooter { display: flex; align-items: center; justify-content: space-between; }
.hint { font-size: 12px; color: var(--color-text-tertiary); }
.searchBar { position: relative; }
.searchInput { width: 100%; padding: 10px 14px; font-size: 14px; color: var(--color-text-primary); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); outline: none; box-sizing: border-box; }
.searchInput:focus { border-color: var(--color-border-focus); }
.searchClear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 18px; color: var(--color-text-tertiary); cursor: pointer; }
.memoList { display: flex; flex-direction: column; gap: 12px; }
.memoCard { display: flex; flex-direction: column; gap: 8px; }
.memoContentWrap { cursor: default; }
.memoContentExpandable { cursor: pointer; }
.memoContent { margin: 0; font-size: 14px; line-height: 1.6; color: var(--color-text-primary); white-space: pre-wrap; }
.expandHint { font-size: 12px; color: var(--color-text-tertiary); }
.memoMeta { display: flex; align-items: center; gap: 8px; }
.memoTime { font-size: 12px; color: var(--color-text-tertiary); }
.memoActions { display: flex; flex-wrap: wrap; gap: 4px; }
.taskForm { display: flex; flex-direction: column; gap: 16px; }
.taskFormGroup { display: flex; flex-direction: column; gap: 6px; }
.taskLabel { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
.taskInput { padding: 10px 14px; font-size: 14px; color: var(--color-text-primary); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-sm); outline: none; }
.taskFormActions { display: flex; justify-content: flex-end; gap: 8px; }
```

### `src/pages/record/MemosPage.tsx`

```tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useRecordStore } from '@/stores/recordStore'
import { useTaskStore } from '@/stores/taskStore'
import { useToast } from '@/components/ui/Toast'
import type { TaskPriority } from '@/types'
import styles from './MemosPage.module.css'

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  const d = new Date(dateStr)
  const nowDate = new Date()
  if (d.getFullYear() === nowDate.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function getPreviewLines(content: string, maxLines = 2): string {
  const lines = content.split('\n')
  return lines.slice(0, maxLines).join('\n')
}

export default function MemosPage() {
  const [content, setContent] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('P2')
  const [convertingMemoId, setConvertingMemoId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()

  const { memos, addMemo, deleteMemo, convertMemoToTask, convertMemoToMistake, convertMemoToNote, loadMemos } =
    useRecordStore()
  const { addTask } = useTaskStore()
  const { toast } = useToast()

  useEffect(() => {
    loadMemos()
  }, [loadMemos])

  const handleSave = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed) return
    await addMemo(trimmed)
    setContent('')
    toast('备忘录已保存', 'success')
    textareaRef.current?.focus()
  }, [content, addMemo, toast])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMemo(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteMemo, toast],
  )

  const openConvertToTask = useCallback((id: string) => {
    const memo = memos.find((m) => m.id === id)
    if (!memo) return
    setConvertingMemoId(id)
    setTaskTitle(memo.content.slice(0, 80))
    setTaskPriority('P2')
    setTaskModalOpen(true)
  }, [memos])

  const handleConvertToTask = useCallback(async () => {
    if (!convertingMemoId || !taskTitle.trim()) return
    await addTask({ title: taskTitle.trim(), priority: taskPriority })
    await convertMemoToTask(convertingMemoId)
    setTaskModalOpen(false)
    setConvertingMemoId(null)
    toast('已转为任务', 'success')
  }, [convertingMemoId, taskTitle, taskPriority, addTask, convertMemoToTask, toast])

  const handleConvertToMistake = useCallback(
    async (id: string) => {
      const memo = memos.find((m) => m.id === id)
      if (!memo) return
      await convertMemoToMistake(id)
      toast('已转为错题', 'success')
      navigate('/study/mistakes')
    },
    [memos, convertMemoToMistake, toast, navigate],
  )

  const handleConvertToNote = useCallback(
    async (id: string) => {
      const memo = memos.find((m) => m.id === id)
      if (!memo) return
      await convertMemoToNote(id)
      toast('已转为笔记', 'success')
    },
    [memos, convertMemoToNote, toast],
  )

  const sortedMemos = [...memos]
    .filter((m) => {
      if (!searchText.trim()) return true
      return m.content.toLowerCase().includes(searchText.toLowerCase())
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className={styles.page}>
      <PageHeader title="备忘录" description="快速记录，随时整理" />

      <div className={styles.inputArea}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="突然想到什么……"
          rows={4}
        />
        <div className={styles.inputFooter}>
          <span className={styles.hint}>Ctrl + Enter 保存</span>
          <Button size="sm" onClick={handleSave} disabled={!content.trim()}>
            保存
          </Button>
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索备忘录..."
        />
        {searchText && (
          <button className={styles.searchClear} onClick={() => setSearchText('')}>
            ×
          </button>
        )}
      </div>

      {sortedMemos.length === 0 ? (
        <EmptyState
          icon="📝"
          title={searchText ? '没有匹配的备忘录' : '还没有备忘录'}
          description={searchText ? '试试其他关键词' : '在上面写点什么吧'}
        />
      ) : (
        <div className={`${styles.memoList} anim-list-stagger`}>
          {sortedMemos.map((memo) => {
            const isExpanded = expandedId === memo.id
            const needsExpansion = memo.content.includes('\n') || memo.content.length > 80

            return (
              <Card key={memo.id} className={styles.memoCard}>
                <div
                  className={`${styles.memoContentWrap} ${needsExpansion ? styles.memoContentExpandable : ''}`}
                  onClick={() => {
                    if (needsExpansion) {
                      setExpandedId(isExpanded ? null : memo.id)
                    }
                  }}
                >
                  <p className={styles.memoContent}>
                    {isExpanded ? memo.content : getPreviewLines(memo.content)}
                  </p>
                  {needsExpansion && !isExpanded && (
                    <span className={styles.expandHint}>点击展开</span>
                  )}
                </div>
                <div className={styles.memoMeta}>
                  <span className={styles.memoTime}>{relativeTime(memo.createdAt)}</span>
                  {memo.convertedTo && (
                    <Badge variant={memo.convertedTo.type === 'task' ? 'success' : memo.convertedTo.type === 'mistake' ? 'warning' : 'info'}>
                      {memo.convertedTo.type === 'task'
                        ? '已转任务'
                        : memo.convertedTo.type === 'mistake'
                          ? '已转错题'
                          : '已转笔记'}
                    </Badge>
                  )}
                </div>
                <div className={styles.memoActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!!memo.convertedTo}
                    onClick={() => openConvertToTask(memo.id)}
                  >
                    转为任务
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!!memo.convertedTo}
                    onClick={() => handleConvertToMistake(memo.id)}
                  >
                    转为错题
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!!memo.convertedTo}
                    onClick={() => handleConvertToNote(memo.id)}
                  >
                    转为笔记
                  </Button>
                  {confirmId === memo.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(memo.id)}>
                        确认删除
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmId(memo.id)}>
                      删除
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="转为任务"
        size="sm"
      >
        <div className={styles.taskForm}>
          <div className={styles.taskFormGroup}>
            <label className={styles.taskLabel}>任务标题</label>
            <input
              className={styles.taskInput}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="任务标题"
            />
          </div>
          <div className={styles.taskFormGroup}>
            <label className={styles.taskLabel}>优先级</label>
            <select
              className={styles.taskInput}
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
            >
              <option value="P0">P0 - 最高</option>
              <option value="P1">P1 - 中等</option>
              <option value="P2">P2 - 低</option>
            </select>
          </div>
          <div className={styles.taskFormActions}>
            <Button variant="secondary" onClick={() => setTaskModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConvertToTask}>创建任务</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/record/NotesPage.module.css`

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

/* Left Panel */
.leftPanel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 20px;
}

.panelSection {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--color-border);
}

.panelSectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panelTitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panelEmpty {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin: 0;
}

.addFolderBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  font-size: 16px;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.addFolderBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

/* New Notebook */
.newNotebookRow {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.newNotebookInput {
  flex: 1;
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
}

.newNotebookInput:focus {
  border-color: var(--color-border-focus);
}

.confirmBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-accent);
  background: var(--color-accent-light);
  transition: all var(--transition-fast);
}

.confirmBtn:hover {
  background: var(--color-accent);
  color: var(--color-accent-text);
}

/* Notebook List */
.notebookList {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notebookItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  text-align: left;
  cursor: pointer;
}

.notebookItem:hover {
  background: var(--color-surface-2);
}

.notebookItemActive {
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: 500;
}

.notebookCount {
  font-size: 11px;
  color: var(--color-text-tertiary);
  padding: 1px 6px;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
}

.notebookItemActive .notebookCount {
  background: var(--color-accent);
  color: var(--color-accent-text);
}

/* Tag List */
.tagList {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tagItem {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 12px;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  background: var(--color-surface-2);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tagItem:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.tagItemActive {
  background: var(--color-accent);
  color: var(--color-accent-text);
}

.tagCount {
  font-size: 10px;
  opacity: 0.7;
}

/* Favorite Filter */
.favoriteFilter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 10px;
  font-size: 13px;
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.favoriteFilter:hover {
  background: var(--color-surface-2);
}

.favoriteFilterActive {
  background: var(--color-warning-light);
  color: var(--color-warning);
  font-weight: 500;
}

.favoriteFilterActive .notebookCount {
  background: var(--color-warning);
  color: #fff;
}

/* Clear Filter */
.clearFilterBtn {
  width: 100%;
  padding: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.clearFilterBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

/* Right Panel */
.rightPanel {
  min-width: 0;
}

/* Note List */
.noteList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.noteItem {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.noteItem:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-accent);
}

.noteItemTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.noteItemTitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.noteFavorite {
  font-size: 16px;
  color: var(--color-text-tertiary);
  transition: color var(--transition-fast);
  flex-shrink: 0;
}

.noteFavorite:hover {
  color: var(--color-warning);
}

.noteItemPreview {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.noteItemMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  flex-wrap: wrap;
}

.noteItemNotebook {
  color: var(--color-text-tertiary);
}

.noteItemTags {
  color: var(--color-accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.noteItemDate {
  color: var(--color-text-tertiary);
  margin-left: auto;
}

/* Detail View */
.detailCard {
  padding: 24px;
}

.detailHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.detailTitle {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.detailActions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.favoriteBtn {
  font-size: 20px;
  color: var(--color-text-tertiary);
  transition: color var(--transition-fast);
}

.favoriteBtn:hover {
  color: var(--color-warning);
}

.detailMeta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
}

.detailNotebook {
  color: var(--color-text-secondary);
}

.detailDate {
  color: var(--color-text-tertiary);
}

.detailUrl {
  color: var(--color-accent);
  text-decoration: none;
  font-size: 13px;
}

.detailUrl:hover {
  text-decoration: underline;
}

.detailTags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.detailTag {
  padding: 3px 10px;
  font-size: 12px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-radius: var(--radius-full);
}

.detailBody {
  font-size: 15px;
  color: var(--color-text-primary);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Editor View */
.editorCard {
  padding: 24px;
}

.editorHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.editorTitle {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.editorActions {
  display: flex;
  gap: 8px;
}

.editorForm {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editorTitleInput {
  font-size: 18px;
  font-weight: 600;
  padding: 8px 12px;
}

.editorBody {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.7;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  resize: vertical;
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.editorBody:focus {
  border-color: var(--color-border-focus);
}

.editorBody::placeholder {
  color: var(--color-text-tertiary);
}

.editorMeta {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.editorField {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.editorLabel {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.editorSelect {
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  cursor: pointer;
}

.editorSelect:focus {
  border-color: var(--color-border-focus);
}

.favoriteToggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  background: var(--color-surface-2);
  cursor: pointer;
  transition: all var(--transition-fast);
  align-self: flex-start;
}

.favoriteToggle:hover {
  background: var(--color-surface-2);
}

.favoriteToggleActive {
  background: var(--color-warning-light);
  color: var(--color-warning);
}
```

### `src/pages/record/NotesPage.tsx`

```tsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import Card from '@/components/ui/Card'
import { useRecordStore } from '@/stores/recordStore'
import { useToast } from '@/components/ui/Toast'
import type { Note } from '@/types'
import styles from './NotesPage.module.css'

const emptyForm = {
  title: '',
  body: '',
  notebook: '默认',
  tags: '',
  url: '',
  favorite: false,
}

export default function NotesPage() {
  const { notes, loading, loadNotes, addNote, updateNote, deleteNote } = useRecordStore()
  const { toast } = useToast()

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Filters
  const [activeNotebook, setActiveNotebook] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [newNotebook, setNewNotebook] = useState('')
  const [showNewNotebook, setShowNewNotebook] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Notebooks
  const notebooks = useMemo(() => {
    const set = new Set<string>()
    notes.forEach((n) => set.add(n.notebook || '默认'))
    return Array.from(set).sort()
  }, [notes])

  // All tags
  const allTags = useMemo(() => {
    const map: Record<string, number> = {}
    notes.forEach((n) => {
      n.tags.forEach((t) => {
        map[t] = (map[t] || 0) + 1
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [notes])

  // Filtered notes
  const filteredNotes = useMemo(() => {
    let result = notes
    if (activeNotebook) {
      result = result.filter((n) => (n.notebook || '默认') === activeNotebook)
    }
    if (activeTag) {
      result = result.filter((n) => n.tags.includes(activeTag))
    }
    if (showFavorites) {
      result = result.filter((n) => n.favorite)
    }
    return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [notes, activeNotebook, activeTag, showFavorites])

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId],
  )

  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNoteId(note.id)
    setIsEditing(false)
  }, [])

  const handleNewNote = useCallback(() => {
    setSelectedNoteId(null)
    setIsEditing(true)
    setForm(emptyForm)
  }, [])

  const handleEditNote = useCallback(() => {
    if (!selectedNote) return
    setForm({
      title: selectedNote.title,
      body: selectedNote.body,
      notebook: selectedNote.notebook || '默认',
      tags: selectedNote.tags.join(', '),
      url: selectedNote.url,
      favorite: selectedNote.favorite,
    })
    setIsEditing(true)
  }, [selectedNote])

  const handleBack = useCallback(() => {
    setSelectedNoteId(null)
    setIsEditing(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      toast('请输入笔记标题', 'warning')
      return
    }
    setSaving(true)
    try {
      const data = {
        title: form.title.trim(),
        body: form.body,
        notebook: form.notebook || '默认',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        url: form.url.trim(),
        favorite: form.favorite,
      }
      if (selectedNoteId && selectedNote) {
        await updateNote(selectedNoteId, data)
        toast('笔记已更新', 'success')
      } else {
        await addNote(data)
        toast('笔记已创建', 'success')
      }
      setIsEditing(false)
      if (!selectedNoteId) {
        setSelectedNoteId(null)
      }
    } catch {
      toast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }, [form, selectedNoteId, selectedNote, addNote, updateNote, toast])

  const handleDelete = useCallback(async () => {
    if (!selectedNoteId || !confirm('确定删除此笔记？')) return
    await deleteNote(selectedNoteId)
    toast('笔记已删除', 'success')
    setSelectedNoteId(null)
    setIsEditing(false)
  }, [selectedNoteId, deleteNote, toast])

  const handleToggleFavorite = useCallback(async (note: Note) => {
    await updateNote(note.id, { favorite: !note.favorite })
  }, [updateNote])

  const handleAddNotebook = useCallback(() => {
    if (!newNotebook.trim()) return
    setActiveNotebook(newNotebook.trim())
    setNewNotebook('')
    setShowNewNotebook(false)
  }, [newNotebook])

  const clearFilters = useCallback(() => {
    setActiveNotebook(null)
    setActiveTag(null)
    setShowFavorites(false)
  }, [])

  const hasActiveFilter = activeNotebook || activeTag || showFavorites

  return (
    <div className={styles.page}>
      <PageHeader
        title="笔记"
        description="Markdown 笔记管理与标签分类"
        actions={
          <Button onClick={handleNewNote}>新建笔记</Button>
        }
      />

      <div className={styles.layout}>
        {/* Left Panel */}
        <div className={styles.leftPanel}>
          {/* Notebooks */}
          <div className={styles.panelSection}>
            <div className={styles.panelSectionHeader}>
              <h3 className={styles.panelTitle}>笔记本</h3>
              <button
                className={styles.addFolderBtn}
                onClick={() => setShowNewNotebook(!showNewNotebook)}
                title="新建笔记本"
              >
                +
              </button>
            </div>
            {showNewNotebook && (
              <div className={styles.newNotebookRow}>
                <input
                  className={styles.newNotebookInput}
                  value={newNotebook}
                  onChange={(e) => setNewNotebook(e.target.value)}
                  placeholder="笔记本名称"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNotebook()}
                />
                <button className={styles.confirmBtn} onClick={handleAddNotebook}>
                  ✓
                </button>
              </div>
            )}
            <div className={styles.notebookList}>
              <button
                className={`${styles.notebookItem} ${!activeNotebook && !showFavorites ? styles.notebookItemActive : ''}`}
                onClick={() => { setActiveNotebook(null); setShowFavorites(false) }}
              >
                📁 全部笔记
                <span className={styles.notebookCount}>{notes.length}</span>
              </button>
              {notebooks.map((nb) => (
                <button
                  key={nb}
                  className={`${styles.notebookItem} ${activeNotebook === nb ? styles.notebookItemActive : ''}`}
                  onClick={() => { setActiveNotebook(nb); setShowFavorites(false) }}
                >
                  📁 {nb}
                  <span className={styles.notebookCount}>
                    {notes.filter((n) => (n.notebook || '默认') === nb).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className={styles.panelSection}>
            <h3 className={styles.panelTitle}>标签</h3>
            {allTags.length === 0 ? (
              <p className={styles.panelEmpty}>暂无标签</p>
            ) : (
              <div className={styles.tagList}>
                {allTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    className={`${styles.tagItem} ${activeTag === tag ? styles.tagItemActive : ''}`}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  >
                    {tag}
                    <span className={styles.tagCount}>{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Favorites */}
          <div className={styles.panelSection}>
            <button
              className={`${styles.favoriteFilter} ${showFavorites ? styles.favoriteFilterActive : ''}`}
              onClick={() => { setShowFavorites(!showFavorites); setActiveNotebook(null); setActiveTag(null) }}
            >
              ⭐ 收藏
              <span className={styles.notebookCount}>
                {notes.filter((n) => n.favorite).length}
              </span>
            </button>
          </div>

          {hasActiveFilter && (
            <button className={styles.clearFilterBtn} onClick={clearFilters}>
              清除筛选
            </button>
          )}
        </div>

        {/* Right Panel */}
        <div className={styles.rightPanel}>
          {isEditing ? (
            /* Editor View */
            <Card className={styles.editorCard}>
              <div className={styles.editorHeader}>
                <h3 className={styles.editorTitle}>
                  {selectedNoteId ? '编辑笔记' : '新建笔记'}
                </h3>
                <div className={styles.editorActions}>
                  <Button variant="ghost" onClick={handleBack}>
                    返回
                  </Button>
                  {selectedNoteId && (
                    <Button variant="danger" onClick={handleDelete}>
                      删除
                    </Button>
                  )}
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>

              <div className={styles.editorForm}>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="笔记标题"
                  className={styles.editorTitleInput}
                />

                <textarea
                  className={styles.editorBody}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="开始写笔记...（支持 Markdown）"
                  rows={14}
                />

                <div className={styles.editorMeta}>
                  <div className={styles.editorField}>
                    <label className={styles.editorLabel}>笔记本</label>
                    <select
                      className={styles.editorSelect}
                      value={form.notebook}
                      onChange={(e) => setForm((f) => ({ ...f, notebook: e.target.value }))}
                    >
                      {notebooks.map((nb) => (
                        <option key={nb} value={nb}>{nb}</option>
                      ))}
                      <option value="默认">默认</option>
                    </select>
                  </div>

                  <div className={styles.editorField}>
                    <label className={styles.editorLabel}>标签（逗号分隔）</label>
                    <Input
                      value={form.tags}
                      onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                      placeholder="例如：学习, 技术"
                    />
                  </div>

                  <div className={styles.editorField}>
                    <label className={styles.editorLabel}>URL</label>
                    <Input
                      value={form.url}
                      onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                      placeholder="相关链接..."
                    />
                  </div>

                  <div className={styles.editorField}>
                    <label className={styles.editorLabel}>收藏</label>
                    <button
                      className={`${styles.favoriteToggle} ${form.favorite ? styles.favoriteToggleActive : ''}`}
                      onClick={() => setForm((f) => ({ ...f, favorite: !f.favorite }))}
                    >
                      {form.favorite ? '⭐ 已收藏' : '☆ 收藏'}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ) : selectedNote ? (
            /* Note Detail View */
            <Card className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <h2 className={styles.detailTitle}>{selectedNote.title}</h2>
                <div className={styles.detailActions}>
                  <button
                    className={styles.favoriteBtn}
                    onClick={() => handleToggleFavorite(selectedNote)}
                    title={selectedNote.favorite ? '取消收藏' : '收藏'}
                  >
                    {selectedNote.favorite ? '⭐' : '☆'}
                  </button>
                  <Button variant="secondary" size="sm" onClick={handleEditNote}>
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    返回
                  </Button>
                </div>
              </div>
              <div className={styles.detailMeta}>
                <span className={styles.detailNotebook}>
                  📁 {selectedNote.notebook || '默认'}
                </span>
                <span className={styles.detailDate}>
                  {selectedNote.updatedAt.slice(0, 10)}
                </span>
                {selectedNote.url && (
                  <a className={styles.detailUrl} href={selectedNote.url} target="_blank" rel="noopener noreferrer">
                    🔗 链接
                  </a>
                )}
              </div>
              {selectedNote.tags.length > 0 && (
                <div className={styles.detailTags}>
                  {selectedNote.tags.map((tag) => (
                    <span key={tag} className={styles.detailTag}>{tag}</span>
                  ))}
                </div>
              )}
              <div className={styles.detailBody}>
                {selectedNote.body || '(空内容)'}
              </div>
            </Card>
          ) : (
            /* Note List */
            <div>
              {loading ? (
                <EmptyState icon="⏳" title="加载中..." />
              ) : filteredNotes.length === 0 ? (
                <EmptyState
                  icon="📝"
                  title={hasActiveFilter ? '没有匹配的笔记' : '还没有笔记'}
                  description={hasActiveFilter ? '尝试清除筛选' : '点击「新建笔记」开始记录'}
                  action={
                    hasActiveFilter ? (
                      <Button variant="secondary" onClick={clearFilters}>清除筛选</Button>
                    ) : (
                      <Button onClick={handleNewNote}>新建笔记</Button>
                    )
                  }
                />
              ) : (
                <div className={styles.noteList}>
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={styles.noteItem}
                      onClick={() => handleSelectNote(note)}
                    >
                      <div className={styles.noteItemTop}>
                        <h3 className={styles.noteItemTitle}>{note.title || '(无标题)'}</h3>
                        <button
                          className={styles.noteFavorite}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFavorite(note)
                          }}
                          title={note.favorite ? '取消收藏' : '收藏'}
                        >
                          {note.favorite ? '⭐' : '☆'}
                        </button>
                      </div>
                      <p className={styles.noteItemPreview}>
                        {note.body ? note.body.slice(0, 100) : '(空内容)'}
                      </p>
                      <div className={styles.noteItemMeta}>
                        <span className={styles.noteItemNotebook}>
                          📁 {note.notebook || '默认'}
                        </span>
                        {note.tags.length > 0 && (
                          <span className={styles.noteItemTags}>
                            {note.tags.join(', ')}
                          </span>
                        )}
                        <span className={styles.noteItemDate}>
                          {note.updatedAt.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### `src/pages/record/RecordLayout.tsx`

```tsx
import { Outlet } from 'react-router-dom'

export default function RecordLayout() {
  return <Outlet />
}
```

### `src/pages/review/DailyReviewPage.module.css`

```css
/* ============================================================
   DailyReviewPage — 每日复盘
   ============================================================ */

.page {
  max-width: 800px;
  margin: 0 auto;
}

/* ---- Stats Cards ---- */
.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.statCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.statValue {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1.2;
}

.statLabel {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* ---- Review Form ---- */
.form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 32px;
}

.formSection {
  margin-bottom: 20px;
}

.formSection:last-child {
  margin-bottom: 0;
}

.formLabel {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.formTextarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  color: var(--color-text-primary);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  resize: vertical;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}

.formTextarea:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.formTextarea::placeholder {
  color: var(--color-text-tertiary);
}

.formActions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  align-items: center;
}

/* ---- History Section ---- */
.historySection {
  margin-top: 32px;
}

.historyTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 16px;
}

.historyList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.historyItem {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  cursor: pointer;
  transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.historyItem:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-accent);
}

.historyDate {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.historyMeta {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ---- Completed Review View ---- */
.completedView {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 32px;
}

.completedHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.completedBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--color-success-light);
  color: var(--color-success);
}

.completedAnswers {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answerItem {
  padding: 12px 16px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
}

.answerQuestion {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 6px;
}

.answerText {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

/* ---- Loading ---- */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ---- Next Actions ---- */
.completedNext {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-light);
}

.nextTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.nextList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nextItem {
  padding: 8px 12px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-primary);
}
```

### `src/pages/review/DailyReviewPage.tsx`

```tsx
import { useEffect, useState, useMemo, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { useReviewStore } from '@/stores/reviewStore'
import { useTaskStore } from '@/stores/taskStore'
import { useToolStore } from '@/stores/toolStore'
import { useStudyStore } from '@/stores/studyStore'
import { formatDate } from '@/utils/helpers'
import type { Review } from '@/types'
import styles from './DailyReviewPage.module.css'

const DAILY_QUESTIONS = [
  { key: 'q1', label: '今天最重要的三件事是什么？' },
  { key: 'q2', label: '今天完成得最好的是？' },
  { key: 'q3', label: '今天最大的阻碍是什么？' },
  { key: 'q4', label: '哪件事估计错了时间？' },
  { key: 'q5', label: '哪件事明天必须调整？' },
  { key: 'q6', label: '明天最重要的三件事？' },
]

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export default function DailyReviewPage() {
  const { reviews, templates, loadAll, addReview, getAutoSummary } = useReviewStore()
  const { tasks, loadTasks } = useTaskStore()
  const { pomodoroLogs, loadPomodoroLogs } = useToolStore()
  const { mistakes, reading, loadMistakes, loadReading } = useStudyStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<any>({})
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [nextActions, setNextActions] = useState('')

  const todayStr = formatDate(new Date())
  const todayRange = { start: todayStr, end: todayStr }

  // Load all data
  useEffect(() => {
    Promise.all([
      loadAll(),
      loadTasks(),
      loadPomodoroLogs(),
      loadMistakes(),
      loadReading(),
    ]).then(() => setLoading(false))
  }, [loadAll, loadTasks, loadPomodoroLogs, loadMistakes, loadReading])

  // Auto-summary
  useEffect(() => {
    getAutoSummary('daily', todayRange).then(setSummary)
  }, [getAutoSummary])

  // Filter today's tasks
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === todayStr),
    [tasks, todayStr],
  )
  const completedToday = todayTasks.filter((t) => t.done).length
  const totalToday = todayTasks.length
  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0

  // Today's pomodoro
  const todayPomodoros = useMemo(
    () => pomodoroLogs.filter((p) => p.date === todayStr),
    [pomodoroLogs, todayStr],
  )
  const pomodoroMinutes = todayPomodoros.reduce((s, p) => s + p.duration, 0)
  const pomodoroCount = todayPomodoros.length

  // Today's mistakes
  const todayMistakes = useMemo(
    () => mistakes.filter((m) => m.createdAt.startsWith(todayStr)),
    [mistakes, todayStr],
  )

  // Today's reading
  const todayReading = useMemo(
    () => reading.filter((r) => r.createdAt.startsWith(todayStr)),
    [reading, todayStr],
  )
  const readingPages = todayReading.reduce((s, r) => s + r.current, 0)

  // Check if already reviewed today
  const todayReview = useMemo(
    () => reviews.find((r) => r.type === 'daily' && r.dateRange.start === todayStr),
    [reviews, todayStr],
  )

  // Past daily reviews
  const pastReviews = useMemo(
    () =>
      reviews
        .filter((r) => r.type === 'daily' && r.dateRange.start !== todayStr)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, todayStr],
  )

  // Templates for daily
  const dailyTemplates = useMemo(
    () => templates.filter((t) => t.type === 'daily'),
    [templates],
  )

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      await addReview({
        type: 'daily',
        dateRange: todayRange,
        autoSummary: summary,
        answers,
        nextActions: nextActions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }, [summary, answers, nextActions, addReview, todayRange])

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find((t) => t.id === templateId)
      if (!tmpl) return
      const mapped: Record<string, string> = {}
      tmpl.questions.forEach((q, i) => {
        if (DAILY_QUESTIONS[i]) {
          mapped[DAILY_QUESTIONS[i].key] = answers[DAILY_QUESTIONS[i].key] || ''
        }
      })
      setAnswers(mapped)
      setSelectedTemplate(templateId)
    },
    [templates, answers],
  )

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="今日复盘" description="回顾今日完成情况与反思" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader title="今日复盘" description="回顾今日完成情况与反思" />

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {completedToday}/{totalToday}
          </div>
          <div className={styles.statLabel}>今日完成任务 {completionRate}%</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatDuration(pomodoroMinutes)}</div>
          <div className={styles.statLabel}>学习时长</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{pomodoroCount}</div>
          <div className={styles.statLabel}>番茄 {pomodoroCount > 0 ? '次' : ''}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{todayMistakes.length}</div>
          <div className={styles.statLabel}>错题</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{readingPages}</div>
          <div className={styles.statLabel}>阅读 页</div>
        </div>
      </div>

      {/* Already completed today */}
      {todayReview && !editing ? (
        <div className={styles.completedView}>
          <div className={styles.completedHeader}>
            <span className={styles.completedBadge}>✓ 今日已完成复盘</span>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              编辑
            </Button>
          </div>
          <div className={styles.completedAnswers}>
            {DAILY_QUESTIONS.map((q) => (
              <div key={q.key} className={styles.answerItem}>
                <p className={styles.answerQuestion}>{q.label}</p>
                <p className={styles.answerText}>
                  {todayReview.answers?.[q.key] || '—'}
                </p>
              </div>
            ))}
          </div>
          {todayReview.nextActions && todayReview.nextActions.length > 0 && (
            <div className={styles.completedNext}>
              <h4 className={styles.nextTitle}>下一步</h4>
              <ul className={styles.nextList}>
                {todayReview.nextActions.map((a, i) => (
                  <li key={i} className={styles.nextItem}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        /* Review Form */
        <div className={styles.form}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
            {todayReview ? '编辑今日复盘' : '今日复盘'}
          </h3>

          {/* Template selector */}
          {dailyTemplates.length > 0 && (
            <div className={styles.formSection}>
              <label className={styles.formLabel}>使用模板</label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              >
                <option value="">不使用模板</option>
                {dailyTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {DAILY_QUESTIONS.map((q) => (
            <div key={q.key} className={styles.formSection}>
              <label className={styles.formLabel}>{q.label}</label>
              <textarea
                className={styles.formTextarea}
                value={answers[q.key] || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                }
                placeholder="请输入..."
              />
            </div>
          ))}

          <div className={styles.formSection}>
            <label className={styles.formLabel}>下一步行动（每行一条）</label>
            <textarea
              className={styles.formTextarea}
              value={nextActions}
              onChange={(e) => setNextActions(e.target.value)}
              placeholder={'例如：\n明天复习数学错题\n整理本周薄弱知识点'}
            />
          </div>

          <div className={styles.formActions}>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? '保存中...' : todayReview ? '更新' : '保存'}
            </Button>
            {todayReview && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>历史复盘</h3>
        {pastReviews.length === 0 ? (
          <EmptyState icon="📋" title="暂无历史复盘记录" description="完成今日复盘后，这里会显示历史记录" />
        ) : (
          <div className={styles.historyList}>
            {pastReviews.slice(0, 20).map((review) => (
              <div
                key={review.id}
                className={styles.historyItem}
                onClick={() => {
                  setAnswers(review.answers || {})
                  setEditing(true)
                }}
              >
                <span className={styles.historyDate}>
                  {new Date(review.dateRange.start).toLocaleDateString('zh-CN', {
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className={styles.historyMeta}>
                  {new Date(review.createdAt).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### `src/pages/review/ExamReviewPage.module.css`

```css
/* ============================================================
   ExamReviewPage — 考试复盘
   ============================================================ */

.page {
  max-width: 800px;
  margin: 0 auto;
}

/* ---- Exam Selector ---- */
.selector {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.selectorLabel {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.selectorSelect {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.selectorSelect:focus {
  border-color: var(--color-border-focus);
}

/* ---- Analysis Section ---- */
.analysisCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 24px;
}

.analysisTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 16px;
}

.analysisGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.analysisItem {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 16px;
  text-align: center;
}

.analysisItemValue {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1.3;
}

.analysisItemLabel {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.analysisItemChange {
  font-size: 12px;
  margin-top: 2px;
}

.analysisUp {
  color: var(--color-success);
}

.analysisDown {
  color: var(--color-danger);
}

/* ---- Subject Score Changes ---- */
.subjectScores {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.subjectScoreRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.subjectScoreName {
  color: var(--color-text-primary);
  font-weight: 500;
}

.subjectScoreValue {
  color: var(--color-text-secondary);
}

.subjectScoreChange {
  font-size: 12px;
  margin-left: 8px;
}

/* ---- Charts Row ---- */
.chartsRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.chartCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.chartTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 12px;
}

/* ---- Review Form ---- */
.form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 32px;
}

.formSection {
  margin-bottom: 20px;
}

.formSection:last-child {
  margin-bottom: 0;
}

.formLabel {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.formTextarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  color: var(--color-text-primary);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  resize: vertical;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}

.formTextarea:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.formTextarea::placeholder {
  color: var(--color-text-tertiary);
}

.formActions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  align-items: center;
}

/* ---- Completed View ---- */
.completedView {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 32px;
}

.completedHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.completedBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--color-success-light);
  color: var(--color-success);
}

.completedAnswers {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answerItem {
  padding: 12px 16px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
}

.answerQuestion {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 6px;
}

.answerText {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

/* ---- History ---- */
.historySection {
  margin-top: 32px;
}

.historyTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 16px;
}

.historyList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.historyItem {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  cursor: pointer;
  transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.historyItem:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-accent);
}

.historyDate {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.historyMeta {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ---- Loading ---- */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ---- Empty ---- */
.emptySubject {
  padding: 48px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}

@media (max-width: 640px) {
  .chartsRow {
    grid-template-columns: 1fr;
  }
}

/* ---- Next Actions ---- */
.completedNext {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-light);
}

.nextTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.nextList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nextItem {
  padding: 8px 12px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-primary);
}
```

### `src/pages/review/ExamReviewPage.tsx`

```tsx
import { useEffect, useState, useMemo, useCallback } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { useReviewStore } from '@/stores/reviewStore'
import { useStudyStore } from '@/stores/studyStore'
import styles from './ExamReviewPage.module.css'

echarts.use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

const EXAM_QUESTIONS = [
  { key: 'q1', label: '这次考试反映出的最大问题？' },
  { key: 'q2', label: '哪些知识点需要重点复习？' },
  { key: 'q3', label: '考试策略需要调整吗？' },
  { key: 'q4', label: '下一阶段调整建议' },
]

export default function ExamReviewPage() {
  const { reviews, templates, loadAll, addReview } = useReviewStore()
  const { exams, mistakes, loadExams, loadMistakes } = useStudyStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [nextActions, setNextActions] = useState('')

  useEffect(() => {
    Promise.all([loadAll(), loadExams(), loadMistakes()]).then(() =>
      setLoading(false),
    )
  }, [loadAll, loadExams, loadMistakes])

  const selectedExam = useMemo(
    () => exams.find((e) => e.id === selectedExamId),
    [exams, selectedExamId],
  )

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => a.date.localeCompare(b.date)),
    [exams],
  )

  // Previous exam for comparison
  const prevExam = useMemo(() => {
    const idx = sortedExams.findIndex((e) => e.id === selectedExamId)
    if (idx <= 0) return null
    return sortedExams[idx - 1]
  }, [sortedExams, selectedExamId])

  // Score change
  const scoreChange = useMemo(() => {
    if (!selectedExam || !prevExam) return 0
    return selectedExam.total - prevExam.total
  }, [selectedExam, prevExam])

  // Per-subject score changes
  const subjectScoreChanges = useMemo(() => {
    if (!selectedExam) return []
    const allSubjects = new Set<string>()
    for (const subj of Object.keys(selectedExam.scores || {})) allSubjects.add(subj)
    if (prevExam) {
      for (const subj of Object.keys(prevExam.scores || {})) allSubjects.add(subj)
    }
    return Array.from(allSubjects)
      .map((subj) => ({
        name: subj,
        current: selectedExam.scores?.[subj] || 0,
        previous: prevExam?.scores?.[subj] || 0,
        change: (selectedExam.scores?.[subj] || 0) - (prevExam?.scores?.[subj] || 0),
      }))
      .sort((a, b) => b.current - a.current)
  }, [selectedExam, prevExam])

  // Related mistakes for this exam (approximate by date proximity)
  const examMistakes = useMemo(() => {
    if (!selectedExam) return []
    const examDate = selectedExam.date
    return mistakes
      .filter((m) => m.createdAt.startsWith(examDate))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [selectedExam, mistakes])

  // Mistake type distribution
  const mistakeTypeDist = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of examMistakes) {
      const type = m.errorType || '未分类'
      map[type] = (map[type] || 0) + 1
    }
    return map
  }, [examMistakes])

  const mistakeTypeChartOption = useMemo(() => {
    const data = Object.entries(mistakeTypeDist).map(([name, value]) => ({
      name,
      value,
    }))
    if (data.length === 0) return null
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11, color: 'var(--text-secondary)' },
      },
      series: [
        {
          type: 'pie' as const,
          radius: '65%',
          center: ['50%', '45%'],
          data,
          label: {
            fontSize: 10,
            color: 'var(--text-secondary)',
            formatter: '{b}\n{d}%',
          },
        },
      ],
    }
  }, [mistakeTypeDist])

  // Knowledge point distribution
  const knowledgeDist = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of examMistakes) {
      for (const kp of m.linkedKnowledge || []) {
        map[kp] = (map[kp] || 0) + 1
      }
    }
    return map
  }, [examMistakes])

  const knowledgeChartOption = useMemo(() => {
    const data = Object.entries(knowledgeDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
    if (data.length === 0) return null
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c}次 ({d}%)' },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11, color: 'var(--text-secondary)' },
      },
      series: [
        {
          type: 'pie' as const,
          radius: '65%',
          center: ['50%', '45%'],
          data,
          label: {
            fontSize: 10,
            color: 'var(--text-secondary)',
            formatter: '{b}\n{d}%',
          },
        },
      ],
    }
  }, [knowledgeDist])

  // Auto-fill suggestions
  useEffect(() => {
    if (!selectedExam) return
    const weakPoints = examMistakes
      .filter((m) => !m.mastered)
      .map((m) => m.linkedKnowledge)
      .flat()
    const uniqueWeak = [...new Set(weakPoints)]
    const suggestion = uniqueWeak.length > 0
      ? `建议重点复习以下知识点：${uniqueWeak.slice(0, 5).join('、')}。错题类型主要集中在${Object.entries(mistakeTypeDist).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join('、')}方面。`
      : '请根据考试情况填写调整建议。'
    setAnswers((prev) => ({ ...prev, q4: prev.q4 || suggestion }))
  }, [selectedExamId])

  // Check if already reviewed for this exam
  const existingReview = useMemo(
    () =>
      reviews.find(
        (r) => r.type === 'exam' && r.examId === selectedExamId,
      ),
    [reviews, selectedExamId],
  )

  // Past exam reviews
  const pastReviews = useMemo(
    () =>
      reviews
        .filter((r) => r.type === 'exam')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews],
  )

  // Templates
  const examTemplates = useMemo(
    () => templates.filter((t) => t.type === 'exam'),
    [templates],
  )

  const handleSubmit = useCallback(async () => {
    if (!selectedExamId || !selectedExam) return
    setSaving(true)
    try {
      await addReview({
        type: 'exam',
        dateRange: { start: selectedExam.date, end: selectedExam.date },
        examId: selectedExamId,
        autoSummary: {
          score: selectedExam.total,
          scoreChange,
          subjectScores: subjectScoreChanges,
          mistakeTypeDist,
          knowledgeDist,
        },
        answers,
        nextActions: nextActions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      })
    } finally {
      setSaving(false)
    }
  }, [selectedExamId, selectedExam, scoreChange, subjectScoreChanges, mistakeTypeDist, knowledgeDist, answers, nextActions, addReview])

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find((t) => t.id === templateId)
      if (!tmpl) return
      const mapped: Record<string, string> = {}
      tmpl.questions.forEach((q, i) => {
        if (EXAM_QUESTIONS[i]) {
          mapped[EXAM_QUESTIONS[i].key] = answers[EXAM_QUESTIONS[i].key] || ''
        }
      })
      setAnswers(mapped)
      setSelectedTemplate(templateId)
    },
    [templates, answers],
  )

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="考试复盘" description="考试分析与改进计划" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page} data-visual-scope="review-data">
      <PageHeader title="考试复盘" description="考试分析与改进计划" />

      {/* Exam Selector */}
      <div className={styles.selector}>
        <span className={styles.selectorLabel}>选择考试</span>
        <select
          className={styles.selectorSelect}
          value={selectedExamId}
          onChange={(e) => {
            setSelectedExamId(e.target.value)
            setAnswers({})
          }}
        >
          <option value="">请选择考试</option>
          {sortedExams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.date})
            </option>
          ))}
        </select>
      </div>

      {!selectedExamId ? (
        <div className={styles.emptySubject}>请选择一次考试开始复盘</div>
      ) : (
        <>
          {/* Analysis */}
          <div className={styles.analysisCard}>
            <h3 className={styles.analysisTitle}>考试分析：{selectedExam?.name}</h3>

            <div className={styles.analysisGrid}>
              <div className={styles.analysisItem}>
                <div className={styles.analysisItemValue}>{selectedExam?.total || 0}</div>
                <div className={styles.analysisItemLabel}>总分</div>
                {scoreChange !== 0 && (
                  <div
                    className={`${styles.analysisItemChange} ${scoreChange > 0 ? styles.analysisUp : styles.analysisDown}`}
                  >
                    {scoreChange > 0 ? '↑' : '↓'} {Math.abs(scoreChange)} 分
                  </div>
                )}
              </div>
              <div className={styles.analysisItem}>
                <div className={styles.analysisItemValue}>{Object.keys(selectedExam?.scores || {}).length}</div>
                <div className={styles.analysisItemLabel}>考试科目</div>
              </div>
              <div className={styles.analysisItem}>
                <div className={styles.analysisItemValue}>{examMistakes.length}</div>
                <div className={styles.analysisItemLabel}>关联错题</div>
              </div>
              <div className={styles.analysisItem}>
                <div className={styles.analysisItemValue}>
                  {selectedExam?.rank || '—'}
                </div>
                <div className={styles.analysisItemLabel}>排名</div>
              </div>
            </div>

            {/* Per-subject scores */}
            {subjectScoreChanges.length > 0 && (
              <div className={styles.subjectScores}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  各科成绩变化
                </div>
                {subjectScoreChanges.map((s) => (
                  <div key={s.name} className={styles.subjectScoreRow}>
                    <span className={styles.subjectScoreName}>{s.name}</span>
                    <span>
                      <span className={styles.subjectScoreValue}>{s.current}</span>
                      {s.change !== 0 && (
                        <span
                          className={`${styles.subjectScoreChange} ${s.change > 0 ? styles.analysisUp : styles.analysisDown}`}
                        >
                          {s.change > 0 ? '+' : ''}{s.change}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className={styles.chartsRow}>
            {mistakeTypeChartOption && (
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>错题类型分布</h3>
                <ReactEChartsCore
                  echarts={echarts}
                  option={mistakeTypeChartOption}
                  style={{ height: 220 }}
                  notMerge
                />
              </div>
            )}
            {knowledgeChartOption && (
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>知识点分布</h3>
                <ReactEChartsCore
                  echarts={echarts}
                  option={knowledgeChartOption}
                  style={{ height: 220 }}
                  notMerge
                />
              </div>
            )}
          </div>

          {/* Review Form */}
          {existingReview ? (
            <div className={styles.completedView}>
              <div className={styles.completedHeader}>
                <span className={styles.completedBadge}>✓ 已完成复盘</span>
              </div>
              <div className={styles.completedAnswers}>
                {EXAM_QUESTIONS.map((q) => (
                  <div key={q.key} className={styles.answerItem}>
                    <p className={styles.answerQuestion}>{q.label}</p>
                    <p className={styles.answerText}>
                      {existingReview.answers?.[q.key] || '—'}
                    </p>
                  </div>
                ))}
              </div>
              {existingReview.nextActions && existingReview.nextActions.length > 0 && (
                <div className={styles.completedNext}>
                  <h4 className={styles.nextTitle}>下一步</h4>
                  <ul className={styles.nextList}>
                    {existingReview.nextActions.map((a, i) => (
                      <li key={i} className={styles.nextItem}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.form}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
                考试复盘
              </h3>

              {examTemplates.length > 0 && (
                <div className={styles.formSection}>
                  <label className={styles.formLabel}>使用模板</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--surface-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                    }}
                  >
                    <option value="">不使用模板</option>
                    {examTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {EXAM_QUESTIONS.map((q) => (
                <div key={q.key} className={styles.formSection}>
                  <label className={styles.formLabel}>{q.label}</label>
                  <textarea
                    className={styles.formTextarea}
                    value={answers[q.key] || ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                    }
                    placeholder="请输入..."
                  />
                </div>
              ))}

              <div className={styles.formSection}>
                <label className={styles.formLabel}>下一步行动（每行一条）</label>
                <textarea
                  className={styles.formTextarea}
                  value={nextActions}
                  onChange={(e) => setNextActions(e.target.value)}
                  placeholder={'例如：\n明天复习数学错题\n整理本周薄弱知识点'}
                />
              </div>

              <div className={styles.formActions}>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>历史考试复盘</h3>
        {pastReviews.length === 0 ? (
          <EmptyState icon="📋" title="暂无历史考试复盘记录" />
        ) : (
          <div className={styles.historyList}>
            {pastReviews.slice(0, 20).map((review) => {
              const exam = exams.find((e) => e.id === review.examId)
              return (
                <div
                  key={review.id}
                  className={styles.historyItem}
                  onClick={() => {
                    setSelectedExamId(review.examId || '')
                    setAnswers(review.answers || {})
                  }}
                >
                  <span className={styles.historyDate}>
                    {exam?.name || '考试'}
                  </span>
                  <span className={styles.historyMeta}>
                    {review.dateRange.start}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

### `src/pages/review/MonthlyReviewPage.module.css`

```css
/* ============================================================
   MonthlyReviewPage — 月复盘
   ============================================================ */

.page {
  max-width: 800px;
  margin: 0 auto;
}

/* ---- Stats Grid ---- */
.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.statCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.statValue {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1.2;
}

.statLabel {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* ---- Monthly Report Visual ---- */
.reportCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 24px;
}

.reportTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 20px;
}

.reportGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.reportItem {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 20px 16px;
  text-align: center;
  transition: transform var(--transition-fast);
}

.reportItem:hover {
  transform: translateY(-2px);
}

.reportItemIcon {
  font-size: 28px;
  margin-bottom: 8px;
}

.reportItemValue {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.reportItemLabel {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* ---- Chart ---- */
.chartCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 24px;
}

.chartTitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 16px;
}

/* ---- Review Form ---- */
.form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 32px;
}

.formSection {
  margin-bottom: 20px;
}

.formSection:last-child {
  margin-bottom: 0;
}

.formLabel {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.formTextarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  color: var(--color-text-primary);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  resize: vertical;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}

.formTextarea:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.formTextarea::placeholder {
  color: var(--color-text-tertiary);
}

.formActions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  align-items: center;
}

/* ---- Completed View ---- */
.completedView {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 32px;
}

.completedHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.completedBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--color-success-light);
  color: var(--color-success);
}

.completedAnswers {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answerItem {
  padding: 12px 16px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
}

.answerQuestion {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 6px;
}

.answerText {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

/* ---- History ---- */
.historySection {
  margin-top: 32px;
}

.historyTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 16px;
}

.historyList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.historyItem {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  cursor: pointer;
  transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.historyItem:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-accent);
}

.historyDate {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.historyMeta {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ---- Loading ---- */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ---- Next Actions ---- */
.completedNext {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-light);
}

.nextTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.nextList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nextItem {
  padding: 8px 12px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-primary);
}
```

### `src/pages/review/MonthlyReviewPage.tsx`

```tsx
import { useEffect, useState, useMemo, useCallback } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { useReviewStore } from '@/stores/reviewStore'
import { useTaskStore } from '@/stores/taskStore'
import { useToolStore } from '@/stores/toolStore'
import { useStudyStore } from '@/stores/studyStore'
import { formatDate } from '@/utils/helpers'
import styles from './MonthlyReviewPage.module.css'

echarts.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const MONTHLY_QUESTIONS = [
  { key: 'q1', label: '本月最重要的三件事' },
  { key: 'q2', label: '本月做得最好的事' },
  { key: 'q3', label: '本月最大的浪费' },
  { key: 'q4', label: '下个月继续什么' },
  { key: 'q5', label: '下个月停止什么' },
  { key: 'q6', label: '下个月开始什么' },
]

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getMonthRange(date: Date = new Date()): { start: string; end: string } {
  const y = date.getFullYear()
  const m = date.getMonth()
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  return {
    start: formatDate(first),
    end: formatDate(last),
  }
}

function getPrevMonthRange(): { start: string; end: string } {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return getMonthRange(d)
}

export default function MonthlyReviewPage() {
  const { reviews, templates, loadAll, addReview, getAutoSummary } = useReviewStore()
  const { tasks, loadTasks } = useTaskStore()
  const { pomodoroLogs, loadPomodoroLogs } = useToolStore()
  const { subjects, mistakes, reading, loadSubjects, loadMistakes, loadReading } = useStudyStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<any>({})
  const [prevSummary, setPrevSummary] = useState<any>({})
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [nextActions, setNextActions] = useState('')

  const monthRange = useMemo(() => getMonthRange(), [])
  const prevMonthRange = useMemo(() => getPrevMonthRange(), [])

  useEffect(() => {
    Promise.all([
      loadAll(),
      loadTasks(),
      loadPomodoroLogs(),
      loadSubjects(),
      loadMistakes(),
      loadReading(),
    ]).then(() => setLoading(false))
  }, [loadAll, loadTasks, loadPomodoroLogs, loadSubjects, loadMistakes, loadReading])

  // Auto-summary for current month
  useEffect(() => {
    getAutoSummary('monthly', monthRange).then(setSummary)
  }, [getAutoSummary, monthRange])

  // Auto-summary for previous month
  useEffect(() => {
    getAutoSummary('monthly', prevMonthRange).then(setPrevSummary)
  }, [getAutoSummary, prevMonthRange])

  // Current month stats
  const monthPomodoros = useMemo(
    () =>
      pomodoroLogs.filter(
        (p) => p.date >= monthRange.start && p.date <= monthRange.end,
      ),
    [pomodoroLogs, monthRange],
  )
  const monthMinutes = monthPomodoros.reduce((s, p) => s + p.duration, 0)
  const monthFocusCount = monthPomodoros.length

  const monthTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.dueDate >= monthRange.start && t.dueDate <= monthRange.end,
      ),
    [tasks, monthRange],
  )
  const monthCompleted = monthTasks.filter((t) => t.done).length
  const monthTotal = monthTasks.length
  const monthCompletionRate = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0

  const monthMistakes = useMemo(
    () =>
      mistakes.filter(
        (m) =>
          m.createdAt >= monthRange.start + 'T00:00:00.000Z' &&
          m.createdAt <= monthRange.end + 'T23:59:59.999Z',
      ),
    [mistakes, monthRange],
  )

  const monthReading = useMemo(
    () =>
      reading.filter(
        (r) =>
          r.createdAt >= monthRange.start + 'T00:00:00.000Z' &&
          r.createdAt <= monthRange.end + 'T23:59:59.999Z',
      ),
    [reading, monthRange],
  )
  const readingBooks = monthReading.length

  const monthReviewCount = useMemo(
    () =>
      reviews.filter(
        (r) =>
          r.dateRange.start >= monthRange.start && r.dateRange.end <= monthRange.end,
      ).length,
    [reviews, monthRange],
  )

  // Previous month stats for comparison
  const prevMonthPomodoros = useMemo(
    () =>
      pomodoroLogs.filter(
        (p) => p.date >= prevMonthRange.start && p.date <= prevMonthRange.end,
      ),
    [pomodoroLogs, prevMonthRange],
  )
  const prevMonthMinutes = prevMonthPomodoros.reduce((s, p) => s + p.duration, 0)

  // ECharts: monthly study trend comparison
  const comparisonChartOption = useMemo(() => {
    const thisMonth = Math.round(monthMinutes / 60)
    const lastMonth = Math.round(prevMonthMinutes / 60)
    const thisMonthLabel = `${monthRange.start.slice(5, 7)}月`
    const lastMonthLabel = `${prevMonthRange.start.slice(5, 7)}月`
    return {
      grid: { left: 44, right: 16, top: 16, bottom: 28 },
      tooltip: {
        trigger: 'axis' as const,
        formatter: (p: any) => `${p[0].name}: ${p[0].value}h`,
      },
      xAxis: {
        type: 'category' as const,
        data: [lastMonthLabel, thisMonthLabel],
        axisLabel: { fontSize: 12, color: 'var(--text-secondary)' },
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
      },
      yAxis: {
        type: 'value' as const,
        name: 'h',
        axisLabel: { fontSize: 11, color: 'var(--text-secondary)' },
        splitLine: { lineStyle: { color: 'var(--border-light)' } },
      },
      series: [
        {
          type: 'bar' as const,
          data: [lastMonth, thisMonth],
          barWidth: 40,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'var(--accent)' },
              { offset: 1, color: '#a5b4fc' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    }
  }, [monthMinutes, prevMonthMinutes, monthRange, prevMonthRange])

  // Check if already reviewed this month
  const thisMonthReview = useMemo(
    () =>
      reviews.find(
        (r) => r.type === 'monthly' && r.dateRange.start === monthRange.start,
      ),
    [reviews, monthRange],
  )

  // Past reviews
  const pastReviews = useMemo(
    () =>
      reviews
        .filter(
          (r) => r.type === 'monthly' && r.dateRange.start !== monthRange.start,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, monthRange],
  )

  // Templates
  const monthlyTemplates = useMemo(
    () => templates.filter((t) => t.type === 'monthly'),
    [templates],
  )

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      await addReview({
        type: 'monthly',
        dateRange: monthRange,
        autoSummary: summary,
        answers,
        nextActions: nextActions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }, [summary, answers, nextActions, addReview, monthRange])

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find((t) => t.id === templateId)
      if (!tmpl) return
      const mapped: Record<string, string> = {}
      tmpl.questions.forEach((q, i) => {
        if (MONTHLY_QUESTIONS[i]) {
          mapped[MONTHLY_QUESTIONS[i].key] = answers[MONTHLY_QUESTIONS[i].key] || ''
        }
      })
      setAnswers(mapped)
      setSelectedTemplate(templateId)
    },
    [templates, answers],
  )

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="月复盘" description="月度回顾与长期目标追踪" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page} data-visual-scope="review-data">
      <PageHeader title="月复盘" description="月度回顾与长期目标追踪" />

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatDuration(monthMinutes)}</div>
          <div className={styles.statLabel}>学习时长</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{monthFocusCount}</div>
          <div className={styles.statLabel}>专注次数</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{readingBooks}</div>
          <div className={styles.statLabel}>阅读本数</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {monthCompleted}/{monthTotal} ({monthCompletionRate}%)
          </div>
          <div className={styles.statLabel}>任务完成率</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{monthMistakes.length}</div>
          <div className={styles.statLabel}>错题数量</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{monthReviewCount}</div>
          <div className={styles.statLabel}>复盘次数</div>
        </div>
      </div>

      {/* Monthly Report Visual */}
      <div className={styles.reportCard}>
        <h3 className={styles.reportTitle}>
          {monthRange.start.slice(0, 7)} 月度报告
        </h3>
        <div className={styles.reportGrid}>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>⏱️</div>
            <div className={styles.reportItemValue}>{formatDuration(monthMinutes)}</div>
            <div className={styles.reportItemLabel}>学习时长</div>
          </div>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>🎯</div>
            <div className={styles.reportItemValue}>{monthFocusCount}次</div>
            <div className={styles.reportItemLabel}>专注次数</div>
          </div>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>📚</div>
            <div className={styles.reportItemValue}>{readingBooks}本</div>
            <div className={styles.reportItemLabel}>阅读量</div>
          </div>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>✅</div>
            <div className={styles.reportItemValue}>{monthCompletionRate}%</div>
            <div className={styles.reportItemLabel}>完成率</div>
          </div>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>❌</div>
            <div className={styles.reportItemValue}>{monthMistakes.length}</div>
            <div className={styles.reportItemLabel}>错题</div>
          </div>
          <div className={styles.reportItem}>
            <div className={styles.reportItemIcon}>📝</div>
            <div className={styles.reportItemValue}>{monthReviewCount}次</div>
            <div className={styles.reportItemLabel}>复盘</div>
          </div>
        </div>
      </div>

      {/* ECharts: Monthly Comparison */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>月度学习趋势（本月 vs 上月）</h3>
        <ReactEChartsCore
          echarts={echarts}
          option={comparisonChartOption}
          style={{ height: 240 }}
          notMerge
        />
      </div>

      {/* Already completed */}
      {thisMonthReview && !editing ? (
        <div className={styles.completedView}>
          <div className={styles.completedHeader}>
            <span className={styles.completedBadge}>✓ 本月已完成复盘</span>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              编辑
            </Button>
          </div>
          <div className={styles.completedAnswers}>
            {MONTHLY_QUESTIONS.map((q) => (
              <div key={q.key} className={styles.answerItem}>
                <p className={styles.answerQuestion}>{q.label}</p>
                <p className={styles.answerText}>
                  {thisMonthReview.answers?.[q.key] || '—'}
                </p>
              </div>
            ))}
          </div>
          {thisMonthReview.nextActions && thisMonthReview.nextActions.length > 0 && (
            <div className={styles.completedNext}>
              <h4 className={styles.nextTitle}>下一步</h4>
              <ul className={styles.nextList}>
                {thisMonthReview.nextActions.map((a, i) => (
                  <li key={i} className={styles.nextItem}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        /* Review Form */
        <div className={styles.form}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
            {thisMonthReview ? '编辑本月复盘' : '本月复盘'}
          </h3>

          {monthlyTemplates.length > 0 && (
            <div className={styles.formSection}>
              <label className={styles.formLabel}>使用模板</label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              >
                <option value="">不使用模板</option>
                {monthlyTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {MONTHLY_QUESTIONS.map((q) => (
            <div key={q.key} className={styles.formSection}>
              <label className={styles.formLabel}>{q.label}</label>
              <textarea
                className={styles.formTextarea}
                value={answers[q.key] || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                }
                placeholder="请输入..."
              />
            </div>
          ))}

          <div className={styles.formSection}>
            <label className={styles.formLabel}>下一步行动（每行一条）</label>
            <textarea
              className={styles.formTextarea}
              value={nextActions}
              onChange={(e) => setNextActions(e.target.value)}
              placeholder={'例如：\n明天复习数学错题\n整理本周薄弱知识点'}
            />
          </div>

          <div className={styles.formActions}>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? '保存中...' : thisMonthReview ? '更新' : '保存'}
            </Button>
            {thisMonthReview && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>历史月复盘</h3>
        {pastReviews.length === 0 ? (
          <EmptyState icon="📋" title="暂无历史月复盘记录" />
        ) : (
          <div className={styles.historyList}>
            {pastReviews.slice(0, 20).map((review) => (
              <div
                key={review.id}
                className={styles.historyItem}
                onClick={() => {
                  setAnswers(review.answers || {})
                  setEditing(true)
                }}
              >
                <span className={styles.historyDate}>
                  {review.dateRange.start} ~ {review.dateRange.end}
                </span>
                <span className={styles.historyMeta}>
                  {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### `src/pages/review/ReviewLayout.tsx`

```tsx
import { Outlet } from 'react-router-dom'

export default function ReviewLayout() {
  return <Outlet />
}
```

### `src/pages/review/SubjectReviewPage.module.css`

```css
/* ============================================================
   SubjectReviewPage — 学科复盘
   ============================================================ */

.page {
  max-width: 800px;
  margin: 0 auto;
}

/* ---- Subject Selector ---- */
.selector {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.selectorLabel {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.selectorSelect {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.selectorSelect:focus {
  border-color: var(--color-border-focus);
}

/* ---- Stats Grid ---- */
.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.statCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.statValue {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1.2;
}

.statLabel {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* ---- Review Form ---- */
.form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 32px;
}

.formSection {
  margin-bottom: 20px;
}

.formSection:last-child {
  margin-bottom: 0;
}

.formLabel {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.formTextarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  color: var(--color-text-primary);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  resize: vertical;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}

.formTextarea:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.formTextarea::placeholder {
  color: var(--color-text-tertiary);
}

.formActions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  align-items: center;
}

/* ---- History ---- */
.historySection {
  margin-top: 32px;
}

.historyTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 16px;
}

.historyFilters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.filterSelect {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  outline: none;
}

.historyList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.historyItem {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  cursor: pointer;
  transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.historyItem:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-accent);
}

.historyDate {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.historySubject {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ---- Completed View ---- */
.completedView {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 32px;
}

.completedAnswers {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answerItem {
  padding: 12px 16px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
}

.answerQuestion {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 6px;
}

.answerText {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

/* ---- Loading ---- */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ---- Empty Subject ---- */
.emptySubject {
  padding: 48px;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}

/* ---- Next Actions ---- */
.completedNext {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-light);
}

.nextTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.nextList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nextItem {
  padding: 8px 12px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-primary);
}
```

### `src/pages/review/SubjectReviewPage.tsx`

```tsx
import { useEffect, useState, useMemo, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { useReviewStore } from '@/stores/reviewStore'
import { useStudyStore } from '@/stores/studyStore'
import { useToolStore } from '@/stores/toolStore'
import { useTaskStore } from '@/stores/taskStore'
import { formatDate } from '@/utils/helpers'
import styles from './SubjectReviewPage.module.css'

const SUBJECT_QUESTIONS = [
  { key: 'q1', label: '本周最大的知识漏洞？' },
  { key: 'q2', label: '最大的错误类型？' },
  { key: 'q3', label: '下周最应该解决的三个问题？' },
  { key: 'q4', label: '学习策略需要调整吗？' },
]

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: formatDate(monday),
    end: formatDate(sunday),
  }
}

export default function SubjectReviewPage() {
  const { reviews, templates, loadAll, addReview, getAutoSummary } = useReviewStore()
  const { subjects, mistakes, loadSubjects, loadMistakes } = useStudyStore()
  const { pomodoroLogs, loadPomodoroLogs } = useToolStore()
  const { tasks, loadTasks } = useTaskStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [summary, setSummary] = useState<any>({})
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [historyFilter, setHistoryFilter] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [nextActions, setNextActions] = useState('')

  const weekRange = useMemo(() => getWeekRange(), [])

  useEffect(() => {
    Promise.all([
      loadAll(),
      loadSubjects(),
      loadMistakes(),
      loadPomodoroLogs(),
      loadTasks(),
    ]).then(() => setLoading(false))
  }, [loadAll, loadSubjects, loadMistakes, loadPomodoroLogs, loadTasks])

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId),
    [subjects, selectedSubjectId],
  )

  // Auto-summary when subject changes
  useEffect(() => {
    if (!selectedSubjectId) {
      setSummary({})
      return
    }
    getAutoSummary('subject', weekRange).then((base) => {
      // Subject-specific stats
      const subjectPomodoros = pomodoroLogs.filter(
        (p) =>
          p.date >= weekRange.start &&
          p.date <= weekRange.end &&
          p.subject === selectedSubject?.name,
      )
      const subjectMistakes = mistakes.filter(
        (m) =>
          m.subject === selectedSubject?.name &&
          m.createdAt >= weekRange.start + 'T00:00:00.000Z' &&
          m.createdAt <= weekRange.end + 'T23:59:59.999Z',
      )
      const weakTopics = subjects
        .flatMap((s) =>
          s.chapters.flatMap((ch) =>
            ch.topics.filter((t) => t.mastery === 'weak'),
          ),
        )
        .filter((t) => {
          const ch = subjects
            .find((s) => s.id === selectedSubjectId)
            ?.chapters.find((c) => c.id === t.chapterId)
          return !!ch
        })

      setSummary({
        ...base,
        studyTime: subjectPomodoros.reduce((s, p) => s + p.duration, 0),
        newMistakes: subjectMistakes.length,
        weakTopics: weakTopics.length,
        subjectName: selectedSubject?.name || '',
      })
    })
  }, [selectedSubjectId, selectedSubject, pomodoroLogs, mistakes, subjects, weekRange, getAutoSummary])

  // Subject-specific templates
  const subjectTemplates = useMemo(
    () => templates.filter((t) => t.type === 'subject'),
    [templates],
  )

  // Past reviews for this subject
  const pastReviews = useMemo(
    () =>
      reviews
        .filter((r) => r.type === 'subject')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews],
  )

  const filteredHistory = useMemo(
    () =>
      historyFilter
        ? pastReviews.filter((r) => r.subjectId === historyFilter)
        : pastReviews,
    [pastReviews, historyFilter],
  )

  const handleSubmit = useCallback(async () => {
    if (!selectedSubjectId) return
    setSaving(true)
    try {
      await addReview({
        type: 'subject',
        dateRange: weekRange,
        subjectId: selectedSubjectId,
        autoSummary: summary,
        answers,
        nextActions: nextActions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setAnswers({})
    } finally {
      setSaving(false)
    }
  }, [selectedSubjectId, weekRange, summary, answers, nextActions, addReview])

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find((t) => t.id === templateId)
      if (!tmpl) return
      const mapped: Record<string, string> = {}
      tmpl.questions.forEach((q, i) => {
        if (SUBJECT_QUESTIONS[i]) {
          mapped[SUBJECT_QUESTIONS[i].key] = answers[SUBJECT_QUESTIONS[i].key] || ''
        }
      })
      setAnswers(mapped)
      setSelectedTemplate(templateId)
    },
    [templates, answers],
  )

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="学科复盘" description="按学科回顾学习进度与薄弱点" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader title="学科复盘" description="按学科回顾学习进度与薄弱点" />

      {/* Subject Selector */}
      <div className={styles.selector}>
        <span className={styles.selectorLabel}>选择学科</span>
        <select
          className={styles.selectorSelect}
          value={selectedSubjectId}
          onChange={(e) => {
            setSelectedSubjectId(e.target.value)
            setAnswers({})
          }}
        >
          <option value="">请选择学科</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedSubjectId ? (
        <div className={styles.emptySubject}>
          请选择一个学科开始复盘
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {formatDuration(summary.studyTime || 0)}
              </div>
              <div className={styles.statLabel}>本周学习时长</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{summary.newMistakes || 0}</div>
              <div className={styles.statLabel}>新增错题</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{summary.weakTopics || 0}</div>
              <div className={styles.statLabel}>薄弱知识点</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {summary.taskCompletionRate || 0}%
              </div>
              <div className={styles.statLabel}>任务完成率</div>
            </div>
          </div>

          {/* Form */}
          <div className={styles.form}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
              {selectedSubject?.name} 本周复盘
            </h3>

            {subjectTemplates.length > 0 && (
              <div className={styles.formSection}>
                <label className={styles.formLabel}>使用模板</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                  }}
                >
                  <option value="">不使用模板</option>
                  {subjectTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {SUBJECT_QUESTIONS.map((q) => (
              <div key={q.key} className={styles.formSection}>
                <label className={styles.formLabel}>{q.label}</label>
                <textarea
                  className={styles.formTextarea}
                  value={answers[q.key] || ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                  }
                  placeholder="请输入..."
                />
              </div>
            ))}

            <div className={styles.formSection}>
              <label className={styles.formLabel}>下一步行动（每行一条）</label>
              <textarea
                className={styles.formTextarea}
                value={nextActions}
                onChange={(e) => setNextActions(e.target.value)}
                placeholder={'例如：\n明天复习数学错题\n整理本周薄弱知识点'}
              />
            </div>

            <div className={styles.formActions}>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>历史学科复盘</h3>
        {pastReviews.length === 0 ? (
          <EmptyState icon="📋" title="暂无历史复盘记录" />
        ) : (
          <>
            <div className={styles.historyFilters}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                筛选学科：
              </span>
              <select
                className={styles.filterSelect}
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              >
                <option value="">全部</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.historyList}>
              {filteredHistory.slice(0, 20).map((review) => {
                const subj = subjects.find((s) => s.id === review.subjectId)
                return (
                  <div
                    key={review.id}
                    className={styles.historyItem}
                    onClick={() => {
                      setSelectedSubjectId(review.subjectId || '')
                      setAnswers(review.answers || {})
                    }}
                  >
                    <span className={styles.historyDate}>
                      {review.dateRange.start} ~ {review.dateRange.end}
                    </span>
                    <span className={styles.historySubject}>
                      {subj?.name || '未知学科'}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

### `src/pages/review/TemplatesPage.module.css`

```css
/* ============================================================
   TemplatesPage — 模板管理
   ============================================================ */

.page {
  max-width: 800px;
  margin: 0 auto;
}

/* ---- Template Grid ---- */
.templateGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.templateCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
}

.templateCard:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-accent);
}

.templateName {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.templateMeta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.templateType {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.templateQuestionCount {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.templateQuestionPreview {
  font-size: 12px;
  color: var(--color-text-tertiary);
  line-height: 1.6;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.templateActions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* ---- Add Button ---- */
.addBar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

/* ---- Modal Form ---- */
.modalForm {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.formLabel {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.formInput {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
  font-family: inherit;
}

.formInput:focus {
  border-color: var(--color-border-focus);
}

.formSelect {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  outline: none;
}

.formSelect:focus {
  border-color: var(--color-border-focus);
}

/* ---- Questions List ---- */
.questionsList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.questionRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.questionInput {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
  font-family: inherit;
}

.questionInput:focus {
  border-color: var(--color-border-focus);
}

.questionRemoveBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 16px;
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}

.questionRemoveBtn:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.addQuestionBtn {
  padding: 8px 16px;
  font-size: 13px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-accent);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.addQuestionBtn:hover {
  background: var(--color-accent-light);
  border-color: var(--color-accent);
}

.modalActions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

/* ---- Default Templates Section ---- */
.defaultSection {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.defaultTitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 12px;
}

.defaultInfo {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: 12px;
  line-height: 1.5;
}

/* ---- Loading ---- */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ---- Empty ---- */
.emptySection {
  padding: 48px;
  text-align: center;
}

/* Type badge colors */
.typeDaily {
  background: var(--color-success-light);
  color: var(--color-success);
}

.typeSubject {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.typeWeekly {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.typeMonthly {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.typeExam {
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
}
```

### `src/pages/review/TemplatesPage.tsx`

```tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useReviewStore } from '@/stores/reviewStore'
import type { ReviewTemplate } from '@/types'
import styles from './TemplatesPage.module.css'

const TYPE_LABELS: Record<string, string> = {
  daily: '每日',
  subject: '学科',
  weekly: '每周',
  monthly: '每月',
  exam: '考试',
}

const TYPE_CLASSES: Record<string, string> = {
  daily: styles.typeDaily,
  subject: styles.typeSubject,
  weekly: styles.typeWeekly,
  monthly: styles.typeMonthly,
  exam: styles.typeExam,
}

const DEFAULT_TEMPLATES = [
  {
    name: '每日复盘（默认）',
    type: 'daily',
    questions: [
      '今天最重要的三件事是什么？',
      '今天完成得最好的是？',
      '今天最大的阻碍是什么？',
      '哪件事估计错了时间？',
      '哪件事明天必须调整？',
      '明天最重要的三件事？',
    ],
  },
  {
    name: '学科复盘（默认）',
    type: 'subject',
    questions: [
      '本周最大的知识漏洞？',
      '最大的错误类型？',
      '下周最应该解决的三个问题？',
      '学习策略需要调整吗？',
    ],
  },
  {
    name: '周复盘（默认）',
    type: 'weekly',
    questions: [
      '本周最重要的三件事',
      '本周做得最好的事',
      '本周最大的浪费',
      '下周继续什么',
      '下周停止什么',
      '下周开始什么',
    ],
  },
  {
    name: '月复盘（默认）',
    type: 'monthly',
    questions: [
      '本月最重要的三件事',
      '本月做得最好的事',
      '本月最大的浪费',
      '下个月继续什么',
      '下个月停止什么',
      '下个月开始什么',
    ],
  },
  {
    name: '考试复盘（默认）',
    type: 'exam',
    questions: [
      '这次考试反映出的最大问题？',
      '哪些知识点需要重点复习？',
      '考试策略需要调整吗？',
      '下一阶段调整建议',
    ],
  },
]

export default function TemplatesPage() {
  const { templates, loadAll, addTemplate, updateTemplate, deleteTemplate } =
    useReviewStore()

  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReviewTemplate | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('daily')
  const [formQuestions, setFormQuestions] = useState<string[]>([''])

  useEffect(() => {
    loadAll().then(() => setLoading(false))
  }, [loadAll])

  const openAddModal = useCallback(() => {
    setEditingTemplate(null)
    setFormName('')
    setFormType('daily')
    setFormQuestions([''])
    setModalOpen(true)
  }, [])

  const openEditModal = useCallback((template: ReviewTemplate) => {
    setEditingTemplate(template)
    setFormName(template.name)
    setFormType(template.type)
    setFormQuestions(template.questions.length > 0 ? [...template.questions] : [''])
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingTemplate(null)
    setFormName('')
    setFormType('daily')
    setFormQuestions([''])
  }, [])

  const handleAddQuestion = useCallback(() => {
    setFormQuestions((prev) => [...prev, ''])
  }, [])

  const handleRemoveQuestion = useCallback((index: number) => {
    setFormQuestions((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleQuestionChange = useCallback(
    (index: number, value: string) => {
      setFormQuestions((prev) => prev.map((q, i) => (i === index ? value : q)))
    },
    [],
  )

  const handleSave = useCallback(async () => {
    const validQuestions = formQuestions.filter((q) => q.trim())
    if (!formName.trim() || validQuestions.length === 0) return

    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, {
        name: formName.trim(),
        type: formType,
        questions: validQuestions,
      })
    } else {
      await addTemplate({
        name: formName.trim(),
        type: formType,
        questions: validQuestions,
      })
    }
    closeModal()
  }, [formName, formType, formQuestions, editingTemplate, addTemplate, updateTemplate, closeModal])

  const handleDelete = useCallback(
    async (id: string) => {
      if (window.confirm('确定要删除这个模板吗？')) {
        await deleteTemplate(id)
      }
    },
    [deleteTemplate],
  )

  const handleInitDefaults = useCallback(async () => {
    for (const tmpl of DEFAULT_TEMPLATES) {
      await addTemplate(tmpl)
    }
  }, [addTemplate])

  const hasDefaultTemplates = useMemo(
    () =>
      DEFAULT_TEMPLATES.some(
        (dt) => templates.some((t) => t.type === dt.type),
      ),
    [templates],
  )

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="模板" description="复盘模板管理与自定义" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader title="模板" description="复盘模板管理与自定义" />

      <div className={styles.addBar}>
        <Button onClick={openAddModal}>添加模板</Button>
      </div>

      {/* Default templates section */}
      {!hasDefaultTemplates && (
        <div className={styles.defaultSection}>
          <h3 className={styles.defaultTitle}>默认模板</h3>
          <p className={styles.defaultInfo}>
            系统提供了一套默认的复盘模板，包含每日、学科、每周、每月、考试复盘的标准问题。点击下方按钮一键初始化。
          </p>
          <Button variant="secondary" size="sm" onClick={handleInitDefaults}>
            初始化默认模板
          </Button>
        </div>
      )}

      {/* Template Grid */}
      {templates.length === 0 && hasDefaultTemplates ? (
        <div className={styles.emptySection}>
          <EmptyState icon="📋" title="暂无自定义模板" description="点击「添加模板」创建自定义模板" />
        </div>
      ) : templates.length === 0 ? (
        <div className={styles.emptySection}>
          <EmptyState
            icon="📋"
            title="暂无模板"
            description="初始化默认模板或创建自定义模板"
          />
        </div>
      ) : (
        <div className={styles.templateGrid}>
          {templates.map((template) => (
            <div
              key={template.id}
              className={styles.templateCard}
              onClick={() => openEditModal(template)}
            >
              <div className={styles.templateName}>{template.name}</div>
              <div className={styles.templateMeta}>
                <span
                  className={`${styles.templateType} ${TYPE_CLASSES[template.type] || ''}`}
                >
                  {TYPE_LABELS[template.type] || template.type}
                </span>
                <span className={styles.templateQuestionCount}>
                  {template.questions.length} 个问题
                </span>
              </div>
              <div className={styles.templateQuestionPreview}>
                {template.questions.slice(0, 3).map((q, i) => (
                  <div key={i}>
                    {i + 1}. {q}
                  </div>
                ))}
                {template.questions.length > 3 && (
                  <div>...还有 {template.questions.length - 3} 个问题</div>
                )}
              </div>
              <div className={styles.templateActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditModal(template)
                  }}
                >
                  编辑
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(template.id)
                  }}
                >
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingTemplate ? '编辑模板' : '添加模板'}
        size="lg"
      >
        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>模板名称</label>
            <input
              className={styles.formInput}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="输入模板名称"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>模板类型</label>
            <select
              className={styles.formSelect}
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
            >
              <option value="daily">每日复盘</option>
              <option value="subject">学科复盘</option>
              <option value="weekly">每周复盘</option>
              <option value="monthly">每月复盘</option>
              <option value="exam">考试复盘</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>问题列表</label>
            <div className={styles.questionsList}>
              {formQuestions.map((q, i) => (
                <div key={i} className={styles.questionRow}>
                  <input
                    className={styles.questionInput}
                    value={q}
                    onChange={(e) => handleQuestionChange(i, e.target.value)}
                    placeholder={`问题 ${i + 1}`}
                  />
                  {formQuestions.length > 1 && (
                    <button
                      className={styles.questionRemoveBtn}
                      onClick={() => handleRemoveQuestion(i)}
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              className={styles.addQuestionBtn}
              onClick={handleAddQuestion}
              type="button"
            >
              + 添加问题
            </button>
          </div>

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? '更新' : '创建'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/review/WeeklyReviewPage.module.css`

```css
/* ============================================================
   WeeklyReviewPage — 周复盘
   ============================================================ */

.page {
  max-width: 800px;
  margin: 0 auto;
}

/* ---- Stats Grid ---- */
.statsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.statCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.statValue {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1.2;
}

.statLabel {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

/* ---- Chart ---- */
.chartCard {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 24px;
}

.chartTitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 16px;
}

/* ---- Review Form ---- */
.form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 32px;
}

.formSection {
  margin-bottom: 20px;
}

.formSection:last-child {
  margin-bottom: 0;
}

.formLabel {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.formTextarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 14px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  color: var(--color-text-primary);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  resize: vertical;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}

.formTextarea:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.formTextarea::placeholder {
  color: var(--color-text-tertiary);
}

.formActions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  align-items: center;
}

/* ---- Completed View ---- */
.completedView {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 32px;
}

.completedHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.completedBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--color-success-light);
  color: var(--color-success);
}

.completedAnswers {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answerItem {
  padding: 12px 16px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
}

.answerQuestion {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 6px;
}

.answerText {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

/* ---- History ---- */
.historySection {
  margin-top: 32px;
}

.historyTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 16px;
}

.historyList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.historyItem {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  cursor: pointer;
  transition: box-shadow var(--transition-fast), border-color var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.historyItem:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-accent);
}

.historyDate {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.historyMeta {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* ---- Loading ---- */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

/* ---- Next Actions ---- */
.completedNext {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-light);
}

.nextTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.nextList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nextItem {
  padding: 8px 12px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-primary);
}
```

### `src/pages/review/WeeklyReviewPage.tsx`

```tsx
import { useEffect, useState, useMemo, useCallback } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { useReviewStore } from '@/stores/reviewStore'
import { useTaskStore } from '@/stores/taskStore'
import { useToolStore } from '@/stores/toolStore'
import { useStudyStore } from '@/stores/studyStore'
import { formatDate } from '@/utils/helpers'
import styles from './WeeklyReviewPage.module.css'

echarts.use([PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const WEEKLY_QUESTIONS = [
  { key: 'q1', label: '本周最重要的三件事' },
  { key: 'q2', label: '本周做得最好的事' },
  { key: 'q3', label: '本周最大的浪费' },
  { key: 'q4', label: '下周继续什么' },
  { key: 'q5', label: '下周停止什么' },
  { key: 'q6', label: '下周开始什么' },
]

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function getWeekRange(offset = 0): { start: string; end: string } {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.getFullYear(), now.getMonth(), diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: formatDate(monday),
    end: formatDate(sunday),
  }
}

export default function WeeklyReviewPage() {
  const { reviews, templates, loadAll, addReview, getAutoSummary } = useReviewStore()
  const { tasks, loadTasks } = useTaskStore()
  const { pomodoroLogs, loadPomodoroLogs } = useToolStore()
  const { subjects, mistakes, reading, loadSubjects, loadMistakes, loadReading } = useStudyStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<any>({})
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [nextActions, setNextActions] = useState('')

  const weekRange = useMemo(() => getWeekRange(), [])

  useEffect(() => {
    Promise.all([
      loadAll(),
      loadTasks(),
      loadPomodoroLogs(),
      loadSubjects(),
      loadMistakes(),
      loadReading(),
    ]).then(() => setLoading(false))
  }, [loadAll, loadTasks, loadPomodoroLogs, loadSubjects, loadMistakes, loadReading])

  // Auto-summary
  useEffect(() => {
    getAutoSummary('weekly', weekRange).then(setSummary)
  }, [getAutoSummary, weekRange])

  // Weekly tasks
  const weeklyTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.dueDate >= weekRange.start && t.dueDate <= weekRange.end,
      ),
    [tasks, weekRange],
  )
  const completedWeekly = weeklyTasks.filter((t) => t.done).length
  const totalWeekly = weeklyTasks.length
  const completionRate = totalWeekly > 0 ? Math.round((completedWeekly / totalWeekly) * 100) : 0

  // Weekly pomodoro
  const weeklyPomodoros = useMemo(
    () =>
      pomodoroLogs.filter(
        (p) => p.date >= weekRange.start && p.date <= weekRange.end,
      ),
    [pomodoroLogs, weekRange],
  )
  const pomodoroMinutes = weeklyPomodoros.reduce((s, p) => s + p.duration, 0)
  const pomodoroCount = weeklyPomodoros.length

  // Weekly mistakes
  const weeklyMistakes = useMemo(
    () =>
      mistakes.filter(
        (m) =>
          m.createdAt >= weekRange.start + 'T00:00:00.000Z' &&
          m.createdAt <= weekRange.end + 'T23:59:59.999Z',
      ),
    [mistakes, weekRange],
  )

  // Weekly reading
  const weeklyReading = useMemo(
    () =>
      reading.filter(
        (r) =>
          r.createdAt >= weekRange.start + 'T00:00:00.000Z' &&
          r.createdAt <= weekRange.end + 'T23:59:59.999Z',
      ),
    [reading, weekRange],
  )
  const readingPages = weeklyReading.reduce((s, r) => s + r.current, 0)

  // Weekly review count
  const weeklyReviewCount = useMemo(
    () =>
      reviews.filter(
        (r) =>
          r.dateRange.start >= weekRange.start && r.dateRange.end <= weekRange.end,
      ).length,
    [reviews, weekRange],
  )

  // ECharts: study time by subject
  const subjectTimeMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of weeklyPomodoros) {
      const key = p.subject || '其他'
      map[key] = (map[key] || 0) + p.duration
    }
    return map
  }, [weeklyPomodoros])

  const pieChartOption = useMemo(() => {
    const data = Object.entries(subjectTimeMap)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value: Math.round((value / 60) * 10) / 10,
      }))
    if (data.length === 0) return null
    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: '{b}: {c}h ({d}%)',
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 12, color: 'var(--text-secondary)' },
      },
      series: [
        {
          type: 'pie' as const,
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          data,
          label: {
            fontSize: 11,
            color: 'var(--text-secondary)',
            formatter: '{b}\n{d}%',
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
            },
          },
        },
      ],
    }
  }, [subjectTimeMap])

  // Check if already reviewed this week
  const thisWeekReview = useMemo(
    () =>
      reviews.find(
        (r) => r.type === 'weekly' && r.dateRange.start === weekRange.start,
      ),
    [reviews, weekRange],
  )

  // Past reviews
  const pastReviews = useMemo(
    () =>
      reviews
        .filter(
          (r) => r.type === 'weekly' && r.dateRange.start !== weekRange.start,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, weekRange],
  )

  // Templates
  const weeklyTemplates = useMemo(
    () => templates.filter((t) => t.type === 'weekly'),
    [templates],
  )

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      await addReview({
        type: 'weekly',
        dateRange: weekRange,
        autoSummary: summary,
        answers,
        nextActions: nextActions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }, [summary, answers, nextActions, addReview, weekRange])

  const handleApplyTemplate = useCallback(
    (templateId: string) => {
      const tmpl = templates.find((t) => t.id === templateId)
      if (!tmpl) return
      const mapped: Record<string, string> = {}
      tmpl.questions.forEach((q, i) => {
        if (WEEKLY_QUESTIONS[i]) {
          mapped[WEEKLY_QUESTIONS[i].key] = answers[WEEKLY_QUESTIONS[i].key] || ''
        }
      })
      setAnswers(mapped)
      setSelectedTemplate(templateId)
    },
    [templates, answers],
  )

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader title="周复盘" description="本周总结与下周计划" />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page} data-visual-scope="review-data">
      <PageHeader title="周复盘" description="本周总结与下周计划" />

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatDuration(pomodoroMinutes)}</div>
          <div className={styles.statLabel}>总学习时长</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{pomodoroCount}</div>
          <div className={styles.statLabel}>专注次数</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{readingPages}</div>
          <div className={styles.statLabel}>阅读页数</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {completedWeekly}/{totalWeekly} ({completionRate}%)
          </div>
          <div className={styles.statLabel}>任务完成率</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{weeklyMistakes.length}</div>
          <div className={styles.statLabel}>错题数量</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{weeklyReviewCount}</div>
          <div className={styles.statLabel}>复盘次数</div>
        </div>
      </div>

      {/* ECharts: Study time distribution */}
      {pieChartOption && (
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>本周学习时间分布（按学科）</h3>
          <ReactEChartsCore
            echarts={echarts}
            option={pieChartOption}
            style={{ height: 280 }}
            notMerge
          />
        </div>
      )}

      {/* Already completed */}
      {thisWeekReview && !editing ? (
        <div className={styles.completedView}>
          <div className={styles.completedHeader}>
            <span className={styles.completedBadge}>✓ 本周已完成复盘</span>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              编辑
            </Button>
          </div>
          <div className={styles.completedAnswers}>
            {WEEKLY_QUESTIONS.map((q) => (
              <div key={q.key} className={styles.answerItem}>
                <p className={styles.answerQuestion}>{q.label}</p>
                <p className={styles.answerText}>
                  {thisWeekReview.answers?.[q.key] || '—'}
                </p>
              </div>
            ))}
          </div>
          {thisWeekReview.nextActions && thisWeekReview.nextActions.length > 0 && (
            <div className={styles.completedNext}>
              <h4 className={styles.nextTitle}>下一步</h4>
              <ul className={styles.nextList}>
                {thisWeekReview.nextActions.map((a, i) => (
                  <li key={i} className={styles.nextItem}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        /* Review Form */
        <div className={styles.form}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
            {thisWeekReview ? '编辑本周复盘' : '本周复盘'}
          </h3>

          {weeklyTemplates.length > 0 && (
            <div className={styles.formSection}>
              <label className={styles.formLabel}>使用模板</label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              >
                <option value="">不使用模板</option>
                {weeklyTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {WEEKLY_QUESTIONS.map((q) => (
            <div key={q.key} className={styles.formSection}>
              <label className={styles.formLabel}>{q.label}</label>
              <textarea
                className={styles.formTextarea}
                value={answers[q.key] || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                }
                placeholder="请输入..."
              />
            </div>
          ))}

          <div className={styles.formSection}>
            <label className={styles.formLabel}>下一步行动（每行一条）</label>
            <textarea
              className={styles.formTextarea}
              value={nextActions}
              onChange={(e) => setNextActions(e.target.value)}
              placeholder={'例如：\n明天复习数学错题\n整理本周薄弱知识点'}
            />
          </div>

          <div className={styles.formActions}>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? '保存中...' : thisWeekReview ? '更新' : '保存'}
            </Button>
            {thisWeekReview && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className={styles.historySection}>
        <h3 className={styles.historyTitle}>历史周复盘</h3>
        {pastReviews.length === 0 ? (
          <EmptyState icon="📋" title="暂无历史周复盘记录" />
        ) : (
          <div className={styles.historyList}>
            {pastReviews.slice(0, 20).map((review) => (
              <div
                key={review.id}
                className={styles.historyItem}
                onClick={() => {
                  setAnswers(review.answers || {})
                  setEditing(true)
                }}
              >
                <span className={styles.historyDate}>
                  {review.dateRange.start} ~ {review.dateRange.end}
                </span>
                <span className={styles.historyMeta}>
                  {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### `src/pages/study/DashboardPage.module.css`

```css
.page {
  padding: 0 24px 24px;
}

.loading {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: 48px 0;
  font-size: 14px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.card {
  padding: 20px;
}

.cardTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Study time */
.totalTime {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-accent);
  margin-bottom: 16px;
}

.subjectBars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.subjectBar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.subjectName {
  font-size: 13px;
  color: var(--color-text-primary);
  min-width: 56px;
  white-space: nowrap;
}

.barTrack {
  flex: 1;
  height: 8px;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.barFill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
}

.subjectDuration {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 48px;
  text-align: right;
}

/* Task list */
.taskList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.taskItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.taskDone {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

/* Weak knowledge */
.weakList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weakItem {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
  font-size: 13px;
}

.weakItem:hover {
  background: var(--color-surface-2);
}

.weakCount {
  font-size: 12px;
  color: var(--color-danger);
  font-weight: 600;
  white-space: nowrap;
}

.weakPreview {
  font-size: 12px;
  color: var(--color-text-tertiary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Recent mistakes */
.mistakeList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mistakeItem {
  padding: 10px 12px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.mistakeItem:hover {
  background: var(--color-surface-2);
}

.mistakeHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.mistakeDate {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.mistakeQuestion {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-primary);
  line-height: 1.5;
}

/* Exam summary */
.examSummary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.examScore {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.examScoreLabel {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.examScoreValue {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1.2;
}

.examScoreName {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.examChange {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}

.examUp {
  color: var(--color-success);
  background: var(--color-success-light);
}

.examDown {
  color: var(--color-danger);
  background: var(--color-danger-light);
}

.chartWrapper {
  margin: 0 -8px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

### `src/pages/study/DashboardPage.tsx`

```tsx
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { useToolStore } from '@/stores/toolStore'
import { useTaskStore } from '@/stores/taskStore'
import { useStudyStore } from '@/stores/studyStore'
import { formatDate, isToday } from '@/utils/helpers'
import styles from './DashboardPage.module.css'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer])

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { pomodoroLogs, loadPomodoroLogs } = useToolStore()
  const { tasks, loadTasks } = useTaskStore()
  const { subjects, mistakes, exams, loading, loadSubjects, loadMistakes, loadExams, getWeakTopics, getRecentMistakes, getExamTrend } =
    useStudyStore()

  useEffect(() => {
    loadPomodoroLogs()
    loadTasks()
    loadSubjects()
    loadMistakes()
    loadExams()
  }, [loadPomodoroLogs, loadTasks, loadSubjects, loadMistakes, loadExams])

  const todayStr = formatDate(new Date())

  // --- Today's study time by subject ---
  const todayPomodoros = useMemo(
    () => pomodoroLogs.filter((p) => isToday(p.date)),
    [pomodoroLogs],
  )

  const subjectStudyTime = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of todayPomodoros) {
      const key = p.subject || '其他'
      map[key] = (map[key] || 0) + p.duration
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [todayPomodoros])

  const totalMinutes = useMemo(
    () => todayPomodoros.reduce((s, p) => s + p.duration, 0),
    [todayPomodoros],
  )

  // --- Today's study tasks ---
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === todayStr && !t.done),
    [tasks, todayStr],
  )

  const subjectNames = useMemo(
    () => new Set(subjects.map((s) => s.name)),
    [subjects],
  )

  const studyTasks = useMemo(
    () =>
      todayTasks.filter(
        (t) => t.sourceRecurringId || subjectNames.has(t.title),
      ),
    [todayTasks, subjectNames],
  )

  // --- Weak knowledge points ---
  const weakMistakes = useMemo(() => getWeakTopics(), [mistakes])

  const weakBySubject = useMemo(() => {
    const map: Record<string, { count: number; questions: string[] }> = {}
    for (const m of weakMistakes) {
      if (!map[m.subject]) map[m.subject] = { count: 0, questions: [] }
      map[m.subject].count++
      map[m.subject].questions.push(m.question.slice(0, 50))
    }
    return Object.entries(map)
  }, [weakMistakes])

  // --- Recent mistakes ---
  const recentMistakes = useMemo(() => getRecentMistakes(5), [mistakes])

  // --- Exam trend ---
  const examTrend = useMemo(() => getExamTrend(), [exams])
  const latestExam = examTrend[examTrend.length - 1]
  const prevExam = examTrend[examTrend.length - 2]
  const scoreChange = latestExam && prevExam ? latestExam.score - prevExam.score : 0

  const examChartOption = useMemo(() => {
    const last5 = examTrend.slice(-5)
    return {
      grid: { left: 40, right: 16, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis' as const },
      xAxis: {
        type: 'category' as const,
        data: last5.map((e) => e.name),
        axisLabel: { fontSize: 11, color: 'var(--text-secondary)' },
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
      },
      yAxis: {
        type: 'value' as const,
        min: (v: { min: number }) => Math.floor(v.min / 10) * 10,
        axisLabel: { fontSize: 11, color: 'var(--text-secondary)' },
        splitLine: { lineStyle: { color: 'var(--border-light)' } },
      },
      series: [
        {
          type: 'line' as const,
          data: last5.map((e) => e.score),
          smooth: true,
          lineStyle: { color: 'var(--accent)', width: 2 },
          itemStyle: { color: 'var(--accent)' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(99,102,241,0.2)' },
              { offset: 1, color: 'rgba(99,102,241,0)' },
            ]),
          },
        },
      ],
    }
  }, [examTrend])

  // --- Study trend chart (last 7 days) ---
  const studyTrend = useMemo(() => {
    const map: Record<string, number> = {}
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      map[formatDate(d)] = 0
    }
    for (const p of pomodoroLogs) {
      if (map[p.date] !== undefined) {
        map[p.date] += p.duration
      }
    }
    const days = ['日', '一', '二', '三', '四', '五', '六']
    return Object.entries(map).map(([date, mins]) => ({
      label: days[new Date(date).getDay()],
      hours: +(mins / 60).toFixed(1),
    }))
  }, [pomodoroLogs])

  const studyChartOption = useMemo(
    () => ({
      grid: { left: 36, right: 16, top: 16, bottom: 28 },
      tooltip: {
        trigger: 'axis' as const,
        formatter: (p: any) => `${p[0].axisValue} ${p[0].value}h`,
      },
      xAxis: {
        type: 'category' as const,
        data: studyTrend.map((d) => d.label),
        axisLabel: { fontSize: 11, color: 'var(--text-secondary)' },
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
      },
      yAxis: {
        type: 'value' as const,
        name: 'h',
        axisLabel: { fontSize: 11, color: 'var(--text-secondary)' },
        splitLine: { lineStyle: { color: 'var(--border-light)' } },
      },
      series: [
        {
          type: 'bar' as const,
          data: studyTrend.map((d) => d.hours),
          barWidth: 20,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'var(--accent)' },
              { offset: 1, color: '#a5b4fc' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    }),
    [studyTrend],
  )

  return (
    <div className={styles.page}>
      <PageHeader title="学习驾驶舱" description="学习概览与数据统计" />

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <div className={styles.grid}>
          {/* Today's study time */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>今日学习时长</h3>
            {subjectStudyTime.length === 0 ? (
              <EmptyState icon="⏱️" title="今天还没有学习记录" description="开始一个番茄钟来记录学习时间" />
            ) : (
              <>
                <div className={styles.totalTime}>今天学习 {formatDuration(totalMinutes)}</div>
                <div className={styles.subjectBars}>
                  {subjectStudyTime.map(([subject, duration]) => (
                    <div key={subject} className={styles.subjectBar}>
                      <span className={styles.subjectName}>{subject}</span>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${Math.max((duration / totalMinutes) * 100, 4)}%` }}
                        />
                      </div>
                      <span className={styles.subjectDuration}>{formatDuration(duration)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Today's study tasks */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>今日学习任务</h3>
            {studyTasks.length === 0 ? (
              <EmptyState icon="📋" title="今天没有学习任务" description="在计划页面添加学习任务" />
            ) : (
              <div className={styles.taskList}>
                {studyTasks.map((t) => (
                  <div key={t.id} className={styles.taskItem}>
                    <span className={t.done ? styles.taskDone : ''}>{t.title}</span>
                    <Badge variant={t.priority === 'P0' ? 'danger' : t.priority === 'P1' ? 'warning' : 'default'}>
                      {t.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Weak knowledge points */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>薄弱知识点</h3>
            {weakBySubject.length === 0 ? (
              <EmptyState icon="💡" title="没有薄弱知识点" description="继续加油！" />
            ) : (
              <div className={styles.weakList}>
                {weakBySubject.map(([subject, info]) => (
                  <div
                    key={subject}
                    className={styles.weakItem}
                    onClick={() => navigate('/study/knowledge')}
                  >
                    <Badge variant="danger">{subject}</Badge>
                    <span className={styles.weakCount}>{info.count} 个错题</span>
                    <span className={styles.weakPreview}>
                      {info.questions[0]}
                      {info.questions.length > 1 ? ` 等${info.questions.length}题` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent mistakes */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>最近错题</h3>
            {recentMistakes.length === 0 ? (
              <EmptyState icon="✅" title="没有未掌握的错题" />
            ) : (
              <div className={styles.mistakeList}>
                {recentMistakes.map((m) => (
                  <div
                    key={m.id}
                    className={styles.mistakeItem}
                    onClick={() => navigate('/study/mistakes')}
                  >
                    <div className={styles.mistakeHeader}>
                      <Badge variant="info">{m.subject}</Badge>
                      <span className={styles.mistakeDate}>
                        {new Date(m.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <p className={styles.mistakeQuestion}>{m.question.slice(0, 50)}{m.question.length > 50 ? '...' : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Exam score trend */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>成绩趋势</h3>
            {examTrend.length === 0 ? (
              <EmptyState icon="📊" title="还没有考试成绩" description="在成绩追踪页面录入考试" />
            ) : (
              <>
                {latestExam && (
                  <div className={styles.examSummary}>
                    <div className={styles.examScore}>
                      <span className={styles.examScoreLabel}>最近考试</span>
                      <span className={styles.examScoreValue}>{latestExam.score}</span>
                      <span className={styles.examScoreName}>{latestExam.name}</span>
                    </div>
                    {scoreChange !== 0 && (
                      <div className={`${styles.examChange} ${scoreChange > 0 ? styles.examUp : styles.examDown}`}>
                        {scoreChange > 0 ? '↑' : '↓'} {Math.abs(scoreChange)} 分
                      </div>
                    )}
                  </div>
                )}
                <div className={styles.chartWrapper}>
                  <ReactEChartsCore
                    echarts={echarts}
                    option={examChartOption}
                    style={{ height: 200 }}
                    notMerge
                  />
                </div>
              </>
            )}
          </Card>

          {/* Study trend chart */}
          <Card className={styles.card}>
            <h3 className={styles.cardTitle}>学习时长趋势（近7天）</h3>
            <div className={styles.chartWrapper}>
              <ReactEChartsCore
                echarts={echarts}
                option={studyChartOption}
                style={{ height: 200 }}
                notMerge
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
```

### `src/pages/study/ExamsPage.module.css`

```css
.page {
  padding: 0 24px 24px;
}

.loading {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: 48px 0;
  font-size: 14px;
}

/* Charts */
.chartsRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.chartCard {
  padding: 20px;
}

.chartTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
}

/* List */
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.examCard {
  padding: 20px;
}

.examHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.examTitleRow {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.examName {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
}

.examDate {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.examActions {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Stats */
.examStats {
  display: flex;
  gap: 20px;
  margin-bottom: 14px;
}

.statItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.statLabel {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.statValue {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.changeUp {
  color: var(--color-success);
}

.changeDown {
  color: var(--color-danger);
}

/* Score breakdown */
.scoreBreakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.scoreItem {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  font-size: 13px;
}

.scoreValue {
  font-weight: 600;
  color: var(--color-text-primary);
}

.examNote {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.input {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.input:focus {
  border-color: var(--color-border-focus);
}

.textarea {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color var(--transition-fast);
}

.textarea:focus {
  border-color: var(--color-border-focus);
}

.scoresGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.scoreInput {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scoreSubject {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.totalRow {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
  margin-top: 4px;
}

.totalLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.totalValue {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-accent);
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
}

@media (max-width: 900px) {
  .chartsRow {
    grid-template-columns: 1fr;
  }

  .formRow {
    grid-template-columns: 1fr;
  }
}
```

### `src/pages/study/ExamsPage.tsx`

```tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useStudyStore } from '@/stores/studyStore'
import { useToast } from '@/components/ui/Toast'
import styles from './ExamsPage.module.css'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

interface FormData {
  name: string
  date: string
  scores: Record<string, number>
  rank: number
  note: string
}

const EMPTY_FORM: FormData = {
  name: '',
  date: new Date().toISOString().slice(0, 10),
  scores: {},
  rank: 0,
  note: '',
}

export default function ExamsPage() {
  const { toast } = useToast()
  const { subjects, exams, loading, loadSubjects, loadExams, addExam, updateExam, deleteExam } =
    useStudyStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    loadSubjects()
    loadExams()
  }, [loadSubjects, loadExams])

  const sortedExams = useMemo(
    () => [...exams].sort((a, b) => b.date.localeCompare(a.date)),
    [exams],
  )

  const totalScore = useMemo(
    () => Object.values(form.scores).reduce((s, v) => s + v, 0),
    [form.scores],
  )

  const getScoreChange = useCallback(
    (idx: number) => {
      if (idx >= sortedExams.length - 1) return null
      const prev = sortedExams[idx + 1]
      return sortedExams[idx].total - prev.total
    },
    [sortedExams],
  )

  const openCreate = useCallback(() => {
    setEditingId(null)
    const initialScores: Record<string, number> = {}
    for (const sub of subjects) {
      initialScores[sub.name] = 0
    }
    setForm({ ...EMPTY_FORM, scores: initialScores })
    setModalOpen(true)
  }, [subjects])

  const openEdit = useCallback(
    (exam: typeof sortedExams[0]) => {
      setEditingId(exam.id)
      const scores: Record<string, number> = {}
      for (const sub of subjects) {
        scores[sub.name] = exam.scores[sub.name] ?? 0
      }
      for (const key of Object.keys(exam.scores)) {
        if (!(key in scores)) scores[key] = exam.scores[key]
      }
      setForm({
        name: exam.name,
        date: exam.date,
        scores,
        rank: exam.rank,
        note: exam.note,
      })
      setModalOpen(true)
    },
    [subjects],
  )

  const handleSave = useCallback(async () => {
    const name = form.name.trim()
    if (!name) {
      toast('请输入考试名称', 'warning')
      return
    }
    if (!form.date) {
      toast('请选择日期', 'warning')
      return
    }

    const payload = {
      name,
      date: form.date,
      scores: form.scores,
      total: totalScore,
      rank: form.rank,
      note: form.note,
    }

    if (editingId) {
      await updateExam(editingId, payload)
      toast('已更新', 'success')
    } else {
      await addExam(payload)
      toast('已录入', 'success')
    }
    setModalOpen(false)
  }, [form, editingId, totalScore, addExam, updateExam, toast])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteExam(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteExam, toast],
  )

  const handleScoreChange = useCallback(
    (subject: string, value: string) => {
      const num = parseInt(value, 10) || 0
      setForm((f) => ({
        ...f,
        scores: { ...f.scores, [subject]: num },
      }))
    },
    [],
  )

  // Chart: total score trend
  const trendData = useMemo(
    () =>
      [...exams]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => ({
          name: e.name,
          date: e.date,
          score: e.total,
        })),
    [exams],
  )

  const totalChartOption = useMemo(
    () => ({
      grid: { left: 44, right: 16, top: 16, bottom: 32 },
      tooltip: { trigger: 'axis' as const },
      xAxis: {
        type: 'category' as const,
        data: trendData.map((e) => e.name),
        axisLabel: { fontSize: 11, color: 'var(--text-secondary)', rotate: trendData.length > 5 ? 30 : 0 },
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: { fontSize: 11, color: 'var(--text-secondary)' },
        splitLine: { lineStyle: { color: 'var(--border-light)' } },
      },
      series: [
        {
          name: '总分',
          type: 'line' as const,
          data: trendData.map((e) => e.score),
          smooth: true,
          lineStyle: { color: 'var(--accent)', width: 2 },
          itemStyle: { color: 'var(--accent)' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(99,102,241,0.2)' },
              { offset: 1, color: 'rgba(99,102,241,0)' },
            ]),
          },
        },
      ],
    }),
    [trendData],
  )

  // Chart: per-subject score trend
  const subjectChartOption = useMemo(() => {
    const subjectSet = new Set<string>()
    for (const e of exams) {
      for (const key of Object.keys(e.scores)) {
        subjectSet.add(key)
      }
    }
    const subjectList = [...subjectSet]
    const sorted = [...exams].sort((a, b) => a.date.localeCompare(b.date))
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316']

    return {
      grid: { left: 44, right: 16, top: 16, bottom: 32 },
      tooltip: { trigger: 'axis' as const },
      legend: {
        data: subjectList,
        bottom: 0,
        textStyle: { fontSize: 11, color: 'var(--text-secondary)' },
      },
      xAxis: {
        type: 'category' as const,
        data: sorted.map((e) => e.name),
        axisLabel: { fontSize: 11, color: 'var(--text-secondary)', rotate: sorted.length > 5 ? 30 : 0 },
        axisLine: { lineStyle: { color: 'var(--border-color)' } },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: { fontSize: 11, color: 'var(--text-secondary)' },
        splitLine: { lineStyle: { color: 'var(--border-light)' } },
      },
      series: subjectList.map((sub, i) => ({
        name: sub,
        type: 'line' as const,
        data: sorted.map((e) => e.scores[sub] ?? null),
        smooth: true,
        lineStyle: { color: colors[i % colors.length], width: 2 },
        itemStyle: { color: colors[i % colors.length] },
      })),
    }
  }, [exams])

  return (
    <div className={styles.page}>
      <PageHeader
        title="成绩追踪"
        description="记录与分析考试成绩"
        actions={<Button onClick={openCreate}>录入成绩</Button>}
      />

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : exams.length === 0 ? (
        <EmptyState
          icon="📝"
          title="还没有考试成绩"
          description="点击上方按钮录入第一次考试"
          action={<Button onClick={openCreate}>录入成绩</Button>}
        />
      ) : (
        <>
          {/* Charts */}
          <div className={styles.chartsRow}>
            <Card className={styles.chartCard}>
              <h3 className={styles.chartTitle}>总分趋势</h3>
              <ReactEChartsCore
                echarts={echarts}
                option={totalChartOption}
                style={{ height: 240 }}
                notMerge
              />
            </Card>
            {Object.keys(exams[0]?.scores || {}).length > 0 && (
              <Card className={styles.chartCard}>
                <h3 className={styles.chartTitle}>各科分数趋势</h3>
                <ReactEChartsCore
                  echarts={echarts}
                  option={subjectChartOption}
                  style={{ height: 280 }}
                  notMerge
                />
              </Card>
            )}
          </div>

          {/* Exam list */}
          <div className={styles.list}>
            {sortedExams.map((exam, idx) => {
              const change = getScoreChange(idx)
              const scoreEntries = Object.entries(exam.scores).filter(
                ([, v]) => v > 0,
              )

              return (
                <Card key={exam.id} className={styles.examCard}>
                  <div className={styles.examHeader}>
                    <div className={styles.examTitleRow}>
                      <h3 className={styles.examName}>{exam.name}</h3>
                      <span className={styles.examDate}>
                        {new Date(exam.date).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <div className={styles.examActions}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(exam)}>
                        编辑
                      </Button>
                      {confirmId === exam.id ? (
                        <>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(exam.id)}>
                            确认删除
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                            取消
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(exam.id)}>
                          删除
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className={styles.examStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>总分</span>
                      <span className={styles.statValue}>{exam.total}</span>
                    </div>
                    {exam.rank > 0 && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>排名</span>
                        <span className={styles.statValue}>{exam.rank}</span>
                      </div>
                    )}
                    {change !== null && change !== 0 && (
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>变化</span>
                        <span className={`${styles.statValue} ${change > 0 ? styles.changeUp : styles.changeDown}`}>
                          {change > 0 ? '↑' : '↓'} {Math.abs(change)}
                        </span>
                      </div>
                    )}
                  </div>

                  {scoreEntries.length > 0 && (
                    <div className={styles.scoreBreakdown}>
                      {scoreEntries.map(([subject, score]) => (
                        <div key={subject} className={styles.scoreItem}>
                          <Badge variant="info">{subject}</Badge>
                          <span className={styles.scoreValue}>{score}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {exam.note && <p className={styles.examNote}>{exam.note}</p>}
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑成绩' : '录入成绩'}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>考试名称</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例如：期中考试"
                autoFocus
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>日期</label>
              <input
                className={styles.input}
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>各科成绩</label>
            <div className={styles.scoresGrid}>
              {Object.entries(form.scores).map(([subject, score]) => (
                <div key={subject} className={styles.scoreInput}>
                  <span className={styles.scoreSubject}>{subject}</span>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    value={score || ''}
                    onChange={(e) => handleScoreChange(subject, e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>总分</span>
              <span className={styles.totalValue}>{totalScore}</span>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>排名</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                value={form.rank || ''}
                onChange={(e) => setForm((f) => ({ ...f, rank: parseInt(e.target.value, 10) || 0 }))}
                placeholder="可选"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>备注</label>
            <textarea
              className={styles.textarea}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="备注信息..."
              rows={3}
            />
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{editingId ? '保存' : '录入'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/study/FlashcardFace.tsx`

```tsx
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

const DIFFICULTY_STARS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']

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
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '3px 12px',
            borderRadius: '9999px',
            background: theme.badgeBg,
            color: theme.badgeText,
            border: `1px solid ${theme.accentColor}20`,
            transition: 'all 0.2s ease',
          }}
        >
          {flashcard.subject || '未分类'}
        </span>
        {flashcard.chapter && (
          <span style={{ fontSize: 12, color: theme.secondaryTextColor }}>
            {flashcard.chapter}
          </span>
        )}
      </div>
      <div
        style={{
          flex: 1,
          fontSize: 16,
          lineHeight: 1.7,
          color: theme.textColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 8px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {flashcard.question}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, marginTop: 12 }}>
        <span style={{ fontSize: 12, color: theme.secondaryTextColor }}>
          {DIFFICULTY_STARS[flashcard.difficulty] || '★★★☆☆'}
        </span>
        <span style={{ fontSize: 12, color: theme.secondaryTextColor, opacity: 0.7 }}>
          点击查看答案
        </span>
      </div>
    </>
  )
}

function FlashcardBack({ flashcard, theme }: { flashcard: Flashcard; theme: ThemeDefinition }) {
  return (
    <>
      <div
        style={{
          flex: 1,
          fontSize: 16,
          lineHeight: 1.7,
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
```

### `src/pages/study/FlashcardsPage.module.css`

```css
/* ============================================================
   Personal Workbench V8 — FlashcardsPage Styles (Task 17)
   ============================================================ */

/* ---- Tabs ---- */
.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 2px solid var(--color-border);
}

.tab {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--color-text-primary);
}

.tabActive {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

/* ---- Browse Tab ---- */
.browseFilters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.browseFilters select,
.browseFilters input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color var(--transition-fast);
}

.browseFilters select:focus,
.browseFilters input:focus {
  border-color: var(--color-border-focus);
}

.searchInput {
  min-width: 200px;
}

.cardList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.browseCard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: box-shadow var(--transition-fast);
  cursor: pointer;
}

.browseCard:hover {
  box-shadow: var(--shadow-md);
}

.browseCardInfo {
  flex: 1;
  min-width: 0;
}

.browseCardQuestion {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.browseCardMeta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}

.browseCardActions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.deleteBtn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-danger);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.deleteBtn:hover {
  background: var(--color-danger-light);
}

/* ---- Review Tab ---- */
.reviewContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.reviewHeader {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reviewProgress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.progressBar {
  width: 100%;
  height: 6px;
  background: var(--color-surface-2);
  border-radius: 3px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--color-accent);
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* ---- 3D Flip Card (Review mode) ---- */
.flipContainer {
  perspective: 1200px;
  width: 100%;
  max-width: 560px;
}

.flipCard {
  position: relative;
  width: 100%;
  min-height: 360px;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.6s ease;
  transform-style: preserve-3d;
  cursor: pointer;
  border-radius: var(--radius-lg);
}

.flipCard:not(.flipped):hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12) !important;
  transform: translateY(-4px);
}

.flipped {
  transform: rotateY(180deg);
}

/* Add subtle scale dip at midpoint during flip */
.flipCard:not(.flipped):active {
  transform: scale(0.97);
  transition: transform 0.15s ease;
}

.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: var(--radius-lg);
  padding: 28px;
  display: flex;
  flex-direction: column;
  border: 1px solid;
}

.faceBack {
  transform: rotateY(180deg);
}

/* Card entrance animation */
.cardEnter {
  animation: cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Card slide-out animation */
.cardSlideOut {
  animation: cardSlideOut 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Rating buttons */
.ratingButtons {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 560px;
  justify-content: center;
  flex-wrap: wrap;
  animation: fadeIn 0.3s ease both;
}

.ratingBtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 80px;
}

.ratingBtn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.ratingBtn:active {
  animation: ratingPulse 0.5s ease;
}

.ratingBtn span:first-child {
  font-size: 22px;
}

.ratingBtn span:last-child {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* Rating button color feedback */
.ratingBtn:nth-child(1):active { border-color: var(--color-danger); }
.ratingBtn:nth-child(2):active { border-color: var(--color-warning); }
.ratingBtn:nth-child(3):active { border-color: var(--color-success); }
.ratingBtn:nth-child(4):active { border-color: var(--color-accent); }

/* ---- Import Tab ---- */
.importTabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: var(--color-surface-2);
  border-radius: var(--radius-md);
  padding: 4px;
  width: fit-content;
}

.importTab {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.importTab:hover {
  color: var(--color-text-primary);
}

.importTabActive {
  background: var(--color-surface);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-sm);
}

.importArea {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.importArea textarea {
  width: 100%;
  min-height: 200px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 13px;
  font-family: monospace;
  resize: vertical;
  outline: none;
}

.importArea textarea:focus {
  border-color: var(--color-border-focus);
}

.fileInput {
  padding: 8px 12px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.fileInput:hover {
  border-color: var(--color-accent);
}

.previewTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-top: 8px;
}

.previewTable th,
.previewTable td {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  text-align: left;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.previewTable th {
  background: var(--color-surface-2);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.previewTable td {
  color: var(--color-text-primary);
}

.previewCount {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 8px;
}

.importActions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

/* ---- Add/Edit Modal ---- */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.formGroup label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.formGroup select,
.formGroup textarea,
.formGroup input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  transition: border-color var(--transition-fast);
}

.formGroup select:focus,
.formGroup textarea:focus,
.formGroup input:focus {
  border-color: var(--color-border-focus);
}

.formGroup textarea {
  min-height: 80px;
}

.formGroup input[type='range'] {
  padding: 0;
  border: none;
  background: none;
}

.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* ---- Theme Selector ---- */
.themeSelector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.themeSelectorLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.themeOptions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.themeOption {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.themeOption:hover {
  background: var(--color-surface-2);
}

.themeOptionActive {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

/* ---- Review empty state ---- */
.reviewEmpty {
  padding: 60px 20px;
  text-align: center;
}

.reviewEmptyIcon {
  font-size: 48px;
  margin-bottom: 16px;
}

.reviewEmptyTitle {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.reviewEmptyDesc {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* ---- Subject badge in browse ---- */
.subjectBadge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-accent-light);
  color: var(--color-accent);
  white-space: nowrap;
}

.knowledgeSelect {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px;
}

.knowledgeItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
}

.knowledgeItem:hover {
  background: var(--color-surface-2);
}

.knowledgeItem input {
  margin: 0;
}

.hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  text-align: center;
  padding: 8px;
}

/* ---- Responsive ---- */

@media (max-width: 768px) {
  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .tab {
    padding: 10px 14px;
    font-size: 13px;
    white-space: nowrap;
  }

  .browseFilters {
    flex-direction: column;
    align-items: stretch;
  }

  .searchInput {
    min-width: auto;
  }

  .browseCard {
    padding: 12px 14px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .browseCardMeta {
    gap: 8px;
  }

  .flipContainer {
    max-width: 100%;
  }

  .flipCard {
    min-height: 280px;
  }

  .face {
    padding: 20px;
  }

  .ratingButtons {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    gap: 8px;
  }

  .ratingBtn {
    min-width: 64px;
    padding: 10px 12px;
    flex-shrink: 0;
  }

  .themeSelector {
    flex-wrap: wrap;
  }

  .themeOptions {
    gap: 4px;
  }

  .themeOption {
    font-size: 11px;
    padding: 4px 10px;
  }

  .importTabs {
    width: 100%;
    overflow-x: auto;
  }

  .importTab {
    white-space: nowrap;
  }

  .formGroup textarea {
    min-height: 60px;
  }

  .knowledgeSelect {
    max-height: 120px;
  }
}

/* ---- Session Complete Celebration ---- */
.sessionComplete {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 40px 20px;
  text-align: center;
  animation: celebratePop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.sessionCompleteIcon {
  font-size: 64px;
  animation: pulse 2s ease-in-out infinite;
}

.sessionCompleteTitle {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.sessionCompleteDesc {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  max-width: 400px;
  margin-top: 8px;
}

.statItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  animation: fadeIn 0.5s ease both;
}

.statItem:nth-child(1) { animation-delay: 0.2s; }
.statItem:nth-child(2) { animation-delay: 0.35s; }
.statItem:nth-child(3) { animation-delay: 0.5s; }

.statValue {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-accent);
}

.statLabel {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* Subtle progress indicator fill */
.progressFillAnimated {
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Review start button area */
.reviewStartArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
}

.reviewStartCount {
  font-size: 14px;
  color: var(--color-text-secondary);
}
```

### `src/pages/study/FlashcardsPage.tsx`

```tsx
// ============================================================
// Personal Workbench V8 — FlashcardsPage (Task 16 + 17)
// ============================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { useStudyStore } from '@/stores/studyStore'
import { formatDate } from '@/utils/helpers'
import type { Flashcard, FlashcardTheme, ReviewRating } from '@/types'
import { themes, getThemeForSubject } from './FlashcardTheme'
import type { ThemeDefinition } from './FlashcardTheme'
import FlashcardFace from './FlashcardFace'
import styles from './FlashcardsPage.module.css'

type TabType = 'browse' | 'review' | 'import'
type ImportTabType = 'csv' | 'paste' | 'json'

const DIFFICULTY_LABELS = ['', '★☆☆☆☆', '★★☆☆☆', '★★★☆☆', '★★★★☆', '★★★★★']

const RATING_OPTIONS: { rating: ReviewRating; emoji: string; label: string }[] = [
  { rating: 'forgot', emoji: '😣', label: '不会' },
  { rating: 'fuzzy', emoji: '🤔', label: '模糊' },
  { rating: 'got', emoji: '🙂', label: '会了' },
  { rating: 'mastered', emoji: '😎', label: '熟练' },
]

export default function FlashcardsPage() {
  const {
    flashcards,
    loading,
    loadAll,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    getDueCards,
    addReview,
    importCSV,
    importJSON,
  } = useFlashcardStore()
  const { subjects, loadSubjects } = useStudyStore()

  const [activeTab, setActiveTab] = useState<TabType>('browse')

  // Browse filters
  const [subjectFilter, setSubjectFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Theme
  const [themeName, setThemeName] = useState<FlashcardTheme>('nightSky')

  // Review state
  const [reviewIndex, setReviewIndex] = useState(0)
  const [reviewFlipped, setReviewFlipped] = useState(false)
  const [cardEntering, setCardEntering] = useState(false)
  const [cardSlidingOut, setCardSlidingOut] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, startTime: 0 })
  const sessionStartRef = useRef(0)

  // Import state
  const [importTab, setImportTab] = useState<ImportTabType>('csv')
  const [pasteText, setPasteText] = useState('')
  const [importPreview, setImportPreview] = useState<Array<Record<string, string>>>([])
  const [importFile, setImportFile] = useState<File | null>(null)

  // Add/Edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Flashcard | null>(null)
  const [form, setForm] = useState({
    question: '',
    answer: '',
    subject: '',
    chapter: '',
    tags: '',
    difficulty: 3,
    knowledgeId: '',
  })
  const [tagInput, setTagInput] = useState('')
  const [formTags, setFormTags] = useState<string[]>([])

  useEffect(() => {
    loadAll()
    loadSubjects()
  }, [loadAll, loadSubjects])

  // ---- Computed ----

  const dueCards = useMemo(() => getDueCards(), [flashcards])

  const filteredCards = useMemo(() => {
    return flashcards.filter((c) => {
      if (subjectFilter && c.subject !== subjectFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!c.question.toLowerCase().includes(q) && !c.answer.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [flashcards, subjectFilter, searchQuery])

  const currentCard = dueCards[reviewIndex] || null

  // ---- Handlers ----

  const openAdd = () => {
    setEditing(null)
    setForm({ question: '', answer: '', subject: '', chapter: '', tags: '', difficulty: 3, knowledgeId: '' })
    setFormTags([])
    setModalOpen(true)
  }

  const openEdit = (card: Flashcard) => {
    setEditing(card)
    setForm({
      question: card.question,
      answer: card.answer,
      subject: card.subject,
      chapter: card.chapter,
      tags: '',
      difficulty: card.difficulty,
      knowledgeId: card.knowledgeId || '',
    })
    setFormTags(card.tags || [])
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.question || !form.answer) return
    const data = {
      question: form.question,
      answer: form.answer,
      subject: form.subject,
      chapter: form.chapter,
      tags: formTags,
      difficulty: form.difficulty,
      knowledgeId: form.knowledgeId || undefined,
    }
    if (editing) {
      await updateFlashcard(editing.id, data)
    } else {
      await addFlashcard(data)
    }
    setModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('确定删除这张闪卡？')) {
      await deleteFlashcard(id)
    }
  }

  // ---- Review ----

  const handleReviewFlip = () => {
    setReviewFlipped(!reviewFlipped)
  }

  const handleRate = useCallback(async (rating: ReviewRating) => {
    if (!currentCard) return
    setCardSlidingOut(true)
    const correct = rating === 'got' || rating === 'mastered'
    setSessionStats((prev) => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (correct ? 1 : 0),
    }))
    await addReview(currentCard.id, rating)
    // Wait for slide-out animation, then advance
    setTimeout(() => {
      setReviewFlipped(false)
      setCardSlidingOut(false)
      if (reviewIndex < dueCards.length - 1) {
        setReviewIndex(reviewIndex + 1)
        setCardEntering(true)
        setTimeout(() => setCardEntering(false), 500)
      } else {
        setSessionComplete(true)
      }
    }, 350)
  }, [currentCard, reviewIndex, dueCards.length, addReview])

  // Trigger card entrance on first render
  useEffect(() => {
    if (activeTab === 'review' && dueCards.length > 0 && !sessionComplete) {
      setCardEntering(true)
      const timer = setTimeout(() => setCardEntering(false), 500)
      return () => clearTimeout(timer)
    }
  }, [activeTab, dueCards.length, sessionComplete])

  const startReview = () => {
    setReviewIndex(0)
    setReviewFlipped(false)
    setCardEntering(false)
    setCardSlidingOut(false)
    setSessionComplete(false)
    setSessionStats({ reviewed: 0, correct: 0, startTime: Date.now() })
    sessionStartRef.current = Date.now()
    setActiveTab('review')
  }

  // ---- Import ----

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (importTab === 'csv') {
        parseCSV(text)
      } else if (importTab === 'json') {
        parseJSON(text)
      }
    }
    reader.readAsText(file)
  }

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return
    const headers = lines[0].split(',').map((h) => h.trim())
    const rows: Array<Record<string, string>> = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, j) => { row[h] = cols[j] || '' })
      rows.push(row)
    }
    setImportPreview(rows)
  }

  const parseJSON = (text: string) => {
    try {
      const parsed = JSON.parse(text)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      setImportPreview(arr.filter(Boolean))
    } catch {
      setImportPreview([])
    }
  }

  const handlePasteParse = () => {
    const lines = pasteText.trim().split('\n')
    const rows: Array<Record<string, string>> = []
    for (const line of lines) {
      const cols = line.split('\t')
      if (cols.length >= 2) {
        rows.push({
          question: cols[0].trim(),
          answer: cols[1].trim(),
          tags: cols[2]?.trim() || '',
        })
      }
    }
    setImportPreview(rows)
  }

  const handleConfirmImport = async () => {
    if (importTab === 'csv' && importFile) {
      const text = await importFile.text()
      await importCSV(text)
    } else if (importTab === 'json' && importFile) {
      const text = await importFile.text()
      await importJSON(text)
    } else if (importTab === 'paste') {
      for (const row of importPreview) {
        if (row.question && row.answer) {
          await addFlashcard({
            question: row.question,
            answer: row.answer,
            tags: row.tags ? row.tags.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean) : [],
          })
        }
      }
    }
    setImportPreview([])
    setImportFile(null)
    setPasteText('')
  }

  // ---- Theme ----

  const theme = themes[themeName]

  // Auto-set theme when subject changes in review
  useEffect(() => {
    if (currentCard && currentCard.subject) {
      setThemeName(getThemeForSubject(currentCard.subject))
    }
  }, [currentCard?.subject])

  // ---- Form helpers ----

  const addFormTag = () => {
    const t = tagInput.trim()
    if (t && !formTags.includes(t)) {
      setFormTags([...formTags, t])
      setTagInput('')
    }
  }

  const removeFormTag = (t: string) => {
    setFormTags(formTags.filter((x) => x !== t))
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addFormTag()
    }
  }

  // ---- Render ----

  return (
    <div>
      <PageHeader
        title="闪卡"
        description="间隔重复记忆卡片"
        actions={<Button onClick={openAdd}>+ 新增闪卡</Button>}
      />

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'browse' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          浏览
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'review' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('review')}
        >
          复习
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'import' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('import')}
        >
          导入
        </button>
      </div>

      {/* ---- Browse Tab ---- */}
      {activeTab === 'browse' && (
        <div>
          <div className={styles.browseFilters}>
            <select value={subjectFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSubjectFilter(e.target.value)}>
              <option value="">全部学科</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="搜索问题或答案..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading && <EmptyState icon="⏳" title="加载中..." />}
          {!loading && filteredCards.length === 0 && (
            <EmptyState
              icon="🃏"
              title="暂无闪卡"
              description={flashcards.length === 0 ? '点击「新增闪卡」或「导入」创建你的第一张闪卡' : '没有匹配的闪卡'}
              action={flashcards.length === 0 ? <Button onClick={openAdd}>新增闪卡</Button> : undefined}
            />
          )}

          {!loading && filteredCards.length > 0 && (
            <div className={`${styles.cardList} anim-list-stagger`}>
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  className={styles.browseCard}
                  onClick={() => openEdit(card)}
                >
                  <div className={styles.browseCardInfo}>
                    <div className={styles.browseCardQuestion}>{card.question}</div>
                    <div className={styles.browseCardMeta}>
                      <span className={styles.subjectBadge}>{card.subject || '未分类'}</span>
                      {card.chapter && <span>{card.chapter}</span>}
                      <span>{DIFFICULTY_LABELS[card.difficulty]}</span>
                      <span>掌握 {card.mastery}%</span>
                      <span>下次复习: {formatDate(new Date(card.nextReviewAt))}</span>
                    </div>
                  </div>
                  <div className={styles.browseCardActions}>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => { e.stopPropagation(); handleDelete(card.id) }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Review Tab ---- */}
      {activeTab === 'review' && (
        <div>
          {/* Theme Selector */}
          <div className={styles.themeSelector}>
            <span className={styles.themeSelectorLabel}>主题:</span>
            <div className={styles.themeOptions}>
              {(Object.entries(themes) as [FlashcardTheme, ThemeDefinition][]).map(([key, t]) => (
                <button
                  key={key}
                  className={`${styles.themeOption} ${themeName === key ? styles.themeOptionActive : ''}`}
                  onClick={() => setThemeName(key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {dueCards.length === 0 ? (
            <div className={styles.reviewEmpty}>
              <div className={styles.reviewEmptyIcon}>🎉</div>
              <div className={styles.reviewEmptyTitle}>暂无待复习闪卡</div>
              <div className={styles.reviewEmptyDesc}>
                所有闪卡都已复习完毕，稍后再来
              </div>
            </div>
          ) : sessionComplete ? (
            <div className={styles.sessionComplete}>
              <div className={styles.sessionCompleteIcon}>🎉</div>
              <div className={styles.sessionCompleteTitle}>复习完成！</div>
              <div className={styles.sessionCompleteDesc}>
                你已完成本轮所有复习，继续保持！
              </div>
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{sessionStats.reviewed}</span>
                  <span className={styles.statLabel}>已复习</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {sessionStats.reviewed > 0
                      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
                      : 0}%
                  </span>
                  <span className={styles.statLabel}>正确率</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>
                    {sessionStats.startTime > 0
                      ? Math.round((Date.now() - sessionStats.startTime) / 60000)
                      : 0}分
                  </span>
                  <span className={styles.statLabel}>用时</span>
                </div>
              </div>
              <Button onClick={startReview}>再来一轮</Button>
            </div>
          ) : (
            <div className={styles.reviewContainer}>
              {/* Progress */}
              <div className={styles.reviewHeader}>
                <div className={styles.reviewProgress}>
                  <span>{reviewIndex + 1} / {dueCards.length} 待复习</span>
                  <span>{Math.round(((reviewIndex + 1) / dueCards.length) * 100)}%</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={`${styles.progressFill} ${styles.progressFillAnimated}`}
                    style={{ width: `${((reviewIndex + 1) / dueCards.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Card */}
              {currentCard && (
                <>
                  <div className={`${styles.flipContainer} ${cardEntering ? styles.cardEnter : ''} ${cardSlidingOut ? styles.cardSlideOut : ''}`}>
                    <div
                      className={`${styles.flipCard} ${reviewFlipped ? styles.flipped : ''}`}
                      onClick={handleReviewFlip}
                    >
                      <div className={styles.face}>
                        <FlashcardFace flashcard={currentCard} theme={theme} side="front" />
                      </div>
                      <div className={`${styles.face} ${styles.faceBack}`}>
                        <FlashcardFace flashcard={currentCard} theme={theme} side="back" />
                      </div>
                    </div>
                  </div>

                  {/* Rating Buttons */}
                  {reviewFlipped && !cardSlidingOut && (
                    <div className={styles.ratingButtons}>
                      {RATING_OPTIONS.map((opt) => (
                        <button
                          key={opt.rating}
                          className={styles.ratingBtn}
                          onClick={() => handleRate(opt.rating)}
                        >
                          <span>{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Import Tab ---- */}
      {activeTab === 'import' && (
        <div>
          <div className={styles.importTabs}>
            <button
              className={`${styles.importTab} ${importTab === 'csv' ? styles.importTabActive : ''}`}
              onClick={() => { setImportTab('csv'); setImportPreview([]); setImportFile(null) }}
            >
              CSV 上传
            </button>
            <button
              className={`${styles.importTab} ${importTab === 'paste' ? styles.importTabActive : ''}`}
              onClick={() => { setImportTab('paste'); setImportPreview([]); setPasteText('') }}
            >
              粘贴导入
            </button>
            <button
              className={`${styles.importTab} ${importTab === 'json' ? styles.importTabActive : ''}`}
              onClick={() => { setImportTab('json'); setImportPreview([]); setImportFile(null) }}
            >
              JSON 上传
            </button>
          </div>

          {/* CSV */}
          {importTab === 'csv' && (
            <div className={styles.importArea}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                CSV 格式要求：第一行为表头，包含 Question,Answer,Subject,Chapter 等列
              </p>
              <input
                type="file"
                accept=".csv"
                className={styles.fileInput}
                onChange={handleFileUpload}
              />
              {importPreview.length > 0 && (
                <>
                  <div style={{ maxHeight: 300, overflow: 'auto' }}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          {Object.keys(importPreview[0]).slice(0, 5).map((k) => (
                            <th key={k}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 20).map((row, i) => (
                          <tr key={i}>
                            {Object.keys(row).slice(0, 5).map((k) => (
                              <td key={k}>{row[k]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className={styles.previewCount}>共 {importPreview.length} 条记录</p>
                  <div className={styles.importActions}>
                    <Button onClick={handleConfirmImport}>确认导入</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Paste */}
          {importTab === 'paste' && (
            <div className={styles.importArea}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                每行一条，Tab 分隔：问题 → 答案 → 标签
              </p>
              <textarea
                value={pasteText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPasteText(e.target.value)}
                placeholder={`光合作用的场所是？\t叶绿体\t生物,细胞
牛顿第一定律内容？\t一切物体在没有受到外力作用的时候，总保持静止状态或匀速直线运动状态\t物理,力学`}
              />
              <Button variant="secondary" onClick={handlePasteParse}>解析预览</Button>
              {importPreview.length > 0 && (
                <>
                  <div style={{ maxHeight: 300, overflow: 'auto' }}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          <th>问题</th>
                          <th>答案</th>
                          <th>标签</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row, i) => (
                          <tr key={i}>
                            <td>{row.question}</td>
                            <td>{row.answer}</td>
                            <td>{row.tags}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className={styles.previewCount}>共 {importPreview.length} 条记录</p>
                  <div className={styles.importActions}>
                    <Button onClick={handleConfirmImport}>确认导入</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* JSON */}
          {importTab === 'json' && (
            <div className={styles.importArea}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                JSON 格式：数组，每个对象包含 question, answer 等字段
              </p>
              <input
                type="file"
                accept=".json"
                className={styles.fileInput}
                onChange={handleFileUpload}
              />
              {importPreview.length > 0 && (
                <>
                  <p className={styles.previewCount}>共 {importPreview.length} 条记录</p>
                  <div className={styles.importActions}>
                    <Button onClick={handleConfirmImport}>确认导入</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Add/Edit Modal ---- */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑闪卡' : '新增闪卡'}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>问题</label>
            <textarea
              value={form.question}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, question: e.target.value })}
              placeholder="输入问题..."
            />
          </div>
          <div className={styles.formGroup}>
            <label>答案</label>
            <textarea
              value={form.answer}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, answer: e.target.value })}
              placeholder="输入答案..."
            />
          </div>
          <div className={styles.formGroup}>
            <label>学科</label>
            <select
              value={form.subject}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, subject: e.target.value })}
            >
              <option value="">选择学科</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>章节</label>
            <input
              value={form.chapter}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, chapter: e.target.value })}
              placeholder="可选"
            />
          </div>
          <div className={styles.formGroup}>
            <label>知识点</label>
            <div className={styles.knowledgeSelect}>
              <label className={styles.knowledgeItem}>
                <input
                  type="radio"
                  name="knowledgeId"
                  value=""
                  checked={form.knowledgeId === ''}
                  onChange={() => setForm({ ...form, knowledgeId: '' })}
                />
                不关联
              </label>
              {subjects.map((sub) =>
                sub.chapters.map((ch) =>
                  ch.topics.map((topic) => (
                    <label key={topic.id} className={styles.knowledgeItem}>
                      <input
                        type="radio"
                        name="knowledgeId"
                        value={topic.id}
                        checked={form.knowledgeId === topic.id}
                        onChange={() => setForm({ ...form, knowledgeId: topic.id })}
                      />
                      {sub.name} › {ch.name} › {topic.name}
                    </label>
                  ))
                )
              )}
              {subjects.every((s) => s.chapters.length === 0) && (
                <span className={styles.hint}>暂无知识点，请先在知识体系中创建</span>
              )}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>标签</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={tagInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="输入标签后按回车..."
                style={{ flex: 1 }}
              />
              <Button size="sm" variant="secondary" onClick={addFormTag}>添加</Button>
            </div>
            {formTags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {formTags.map((t) => (
                  <span
                    key={t}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '2px 10px',
                      borderRadius: '9999px', background: 'var(--accent-light)', color: 'var(--accent)',
                      fontSize: 12,
                    }}
                  >
                    {t}
                    <button
                      onClick={() => removeFormTag(t)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className={styles.formGroup}>
            <label>难度: {DIFFICULTY_LABELS[form.difficulty]}</label>
            <input
              type="range"
              min="1"
              max="5"
              value={form.difficulty}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, difficulty: Number(e.target.value) })}
            />
          </div>
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editing ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/study/FlashcardTheme.tsx`

```tsx
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
```

### `src/pages/study/KnowledgePage.module.css`

```css
.page {
  padding: 0 24px 24px;
}

.loading {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: 48px 0;
  font-size: 14px;
}

.headerActions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.weakToggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.weakToggle input {
  accent-color: var(--color-accent);
}

/* Tree */
.tree {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subjectCard {
  padding: 0;
  overflow: hidden;
}

.subjectHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
}

.subjectToggle {
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--color-text-primary);
  flex: 1;
}

.subjectName {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.countBadge {
  font-size: 12px;
  color: var(--color-text-tertiary);
  background: var(--color-surface-2);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.subjectActions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chevron {
  display: inline-block;
  font-size: 10px;
  color: var(--color-text-tertiary);
  transition: transform var(--transition-normal);
  width: 12px;
  text-align: center;
}

.chevronOpen {
  transform: rotate(90deg);
}

/* Chapter list */
.chapterList {
  border-top: 1px solid var(--color-border-light);
  padding: 12px 20px 16px 32px;
  background: var(--color-surface-2);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chapterItem {
  border-radius: var(--radius-sm);
}

.chapterHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
}

.chapterHeader:hover {
  background: var(--color-surface-2);
}

.chapterToggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--color-text-primary);
  flex: 1;
}

.chapterName {
  font-size: 14px;
  font-weight: 500;
}

.chapterCount {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.chapterActions {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* Topic list */
.topicList {
  margin-left: 28px;
  margin-top: 4px;
  margin-bottom: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.emptyTopic {
  font-size: 12px;
  color: var(--color-text-tertiary);
  padding: 8px 12px;
}

.topicItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
}

.topicItem:hover {
  border-color: var(--color-border);
}

.topicInfo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.topicName {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.topicBadges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.masteryBadge {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.lastReview {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.topicActions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  margin-left: 12px;
}

/* Inline add */
.inlineAdd {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.inlineInput {
  flex: 1;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.inlineInput:focus {
  border-color: var(--color-border-focus);
}

.addChapterBtn {
  display: block;
  width: 100%;
  padding: 8px;
  text-align: center;
  font-size: 13px;
  color: var(--color-accent);
  background: none;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-top: 8px;
  transition: background var(--transition-fast);
}

.addChapterBtn:hover {
  background: var(--color-surface-2);
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.input {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.input:focus {
  border-color: var(--color-border-focus);
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
}

.flashcardInfo {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
  text-align: center;
  padding: 8px 0;
}
```

### `src/pages/study/KnowledgePage.tsx`

```tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useStudyStore } from '@/stores/studyStore'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { useToast } from '@/components/ui/Toast'
import type { MasteryLevel } from '@/types'
import styles from './KnowledgePage.module.css'

const MASTERY_CYCLE: MasteryLevel[] = ['notStarted', 'learning', 'mastered', 'weak']
const MASTERY_LABELS: Record<MasteryLevel, string> = {
  notStarted: '未开始',
  learning: '学习中',
  mastered: '已掌握',
  weak: '薄弱',
}
const MASTERY_VARIANTS: Record<MasteryLevel, 'default' | 'info' | 'success' | 'danger'> = {
  notStarted: 'default',
  learning: 'info',
  mastered: 'success',
  weak: 'danger',
}

export default function KnowledgePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    subjects, loading, loadSubjects,
    addSubject, deleteSubject, addChapter, deleteChapter,
    addTopic, updateTopic, deleteTopic,
  } = useStudyStore()
  const { flashcards, loadAll: loadFlashcards } = useFlashcardStore()

  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null)
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newChapterName, setNewChapterName] = useState('')
  const [addingChapterFor, setAddingChapterFor] = useState<string | null>(null)
  const [newTopicName, setNewTopicName] = useState('')
  const [addingTopicFor, setAddingTopicFor] = useState<{ subjectId: string; chapterId: string } | null>(null)
  const [weakOnly, setWeakOnly] = useState(false)
  const [confirmDeleteSubject, setConfirmDeleteSubject] = useState<string | null>(null)
  const [flashcardModal, setFlashcardModal] = useState<{
    open: boolean
    subject: string
    chapter: string
    knowledgeId: string
  }>({ open: false, subject: '', chapter: '', knowledgeId: '' })

  useEffect(() => {
    loadSubjects()
    loadFlashcards()
  }, [loadSubjects, loadFlashcards])

  const getFlashcardCount = useCallback(
    (knowledgeId: string) => flashcards.filter((f) => f.knowledgeId === knowledgeId).length,
    [flashcards],
  )

  const getLastReviewDate = useCallback(
    (knowledgeId: string) => {
      const related = flashcards.filter((f) => f.knowledgeId === knowledgeId)
      if (related.length === 0) return null
      const latest = related.reduce((max, f) =>
        f.nextReviewAt > max ? f.nextReviewAt : max, related[0].nextReviewAt)
      return new Date(latest).toLocaleDateString('zh-CN')
    },
    [flashcards],
  )

  const handleAddSubject = useCallback(async () => {
    const name = newSubjectName.trim()
    if (!name) {
      toast('请输入学科名称', 'warning')
      return
    }
    await addSubject(name)
    setNewSubjectName('')
    setShowSubjectModal(false)
    toast('学科已添加', 'success')
  }, [newSubjectName, addSubject, toast])

  const handleDeleteSubject = useCallback(async (id: string) => {
    await deleteSubject(id)
    setConfirmDeleteSubject(null)
    toast('学科已删除', 'info')
  }, [deleteSubject, toast])

  const handleAddChapter = useCallback(async (subjectId: string) => {
    const name = newChapterName.trim()
    if (!name) return
    await addChapter(subjectId, name)
    setNewChapterName('')
    setAddingChapterFor(null)
    toast('章节已添加', 'success')
  }, [newChapterName, addChapter, toast])

  const handleDeleteChapter = useCallback(async (subjectId: string, chapterId: string) => {
    await deleteChapter(subjectId, chapterId)
    toast('章节已删除', 'info')
  }, [deleteChapter, toast])

  const handleAddTopic = useCallback(async () => {
    if (!addingTopicFor) return
    const name = newTopicName.trim()
    if (!name) return
    await addTopic(addingTopicFor.subjectId, addingTopicFor.chapterId, name)
    setNewTopicName('')
    setAddingTopicFor(null)
    toast('知识点已添加', 'success')
  }, [addingTopicFor, newTopicName, addTopic, toast])

  const handleDeleteTopic = useCallback(async (subjectId: string, chapterId: string, topicId: string) => {
    await deleteTopic(subjectId, chapterId, topicId)
    toast('知识点已删除', 'info')
  }, [deleteTopic, toast])

  const handleMasteryToggle = useCallback(
    async (subjectId: string, chapterId: string, topicId: string, current: MasteryLevel) => {
      const idx = MASTERY_CYCLE.indexOf(current)
      const next = MASTERY_CYCLE[(idx + 1) % MASTERY_CYCLE.length]
      await updateTopic(subjectId, chapterId, topicId, { mastery: next })
    },
    [updateTopic],
  )

  const handleOpenFlashcardModal = useCallback(
    (subject: string, chapter: string, knowledgeId: string) => {
      setFlashcardModal({ open: true, subject, chapter, knowledgeId })
    },
    [],
  )

  const handleCreateFlashcard = useCallback(async () => {
    const { addFlashcard } = useFlashcardStore.getState()
    await addFlashcard({
      question: '',
      answer: '',
      subject: flashcardModal.subject,
      chapter: flashcardModal.chapter,
      knowledgeId: flashcardModal.knowledgeId,
    })
    setFlashcardModal({ open: false, subject: '', chapter: '', knowledgeId: '' })
    toast('闪卡已创建', 'success')
    navigate('/study/flashcards')
  }, [flashcardModal, toast, navigate])

  const toggleSubject = useCallback((id: string) => {
    setExpandedSubject((prev) => (prev === id ? null : id))
    setExpandedChapter(null)
  }, [])

  const toggleChapter = useCallback((id: string) => {
    setExpandedChapter((prev) => (prev === id ? null : id))
  }, [])

  const subjectsWithWeakFilter = useMemo(() => {
    if (!weakOnly) return subjects
    return subjects
      .map((sub) => ({
        ...sub,
        chapters: sub.chapters
          .map((ch) => ({
            ...ch,
            topics: ch.topics.filter((t) => t.mastery === 'weak'),
          }))
          .filter((ch) => ch.topics.length > 0),
      }))
      .filter((sub) => sub.chapters.length > 0)
  }, [subjects, weakOnly])

  return (
    <div className={styles.page}>
      <PageHeader
        title="知识体系"
        description="学科、章节与知识点管理"
        actions={
          <div className={styles.headerActions}>
            <label className={styles.weakToggle}>
              <input
                type="checkbox"
                checked={weakOnly}
                onChange={(e) => setWeakOnly(e.target.checked)}
              />
              <span>仅看薄弱</span>
            </label>
            <Button onClick={() => setShowSubjectModal(true)}>添加学科</Button>
          </div>
        }
      />

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : subjectsWithWeakFilter.length === 0 ? (
        <EmptyState
          icon="📚"
          title={weakOnly ? '没有薄弱知识点' : '还没有学科'}
          description={weakOnly ? '所有知识点都掌握得很好！' : '点击上方按钮添加第一个学科'}
          action={!weakOnly ? <Button onClick={() => setShowSubjectModal(true)}>添加学科</Button> : undefined}
        />
      ) : (
        <div className={styles.tree}>
          {subjectsWithWeakFilter.map((subject) => (
            <Card key={subject.id} className={styles.subjectCard}>
              <div className={styles.subjectHeader}>
                <button
                  className={styles.subjectToggle}
                  onClick={() => toggleSubject(subject.id)}
                >
                  <span className={`${styles.chevron} ${expandedSubject === subject.id ? styles.chevronOpen : ''}`}>
                    ▶
                  </span>
                  <h3 className={styles.subjectName}>{subject.name}</h3>
                  <span className={styles.countBadge}>
                    {subject.chapters.length} 章 · {subject.chapters.reduce((s, ch) => s + ch.topics.length, 0)} 知识点
                  </span>
                </button>
                <div className={styles.subjectActions}>
                  {confirmDeleteSubject === subject.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteSubject(subject.id)}>
                        确认删除
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteSubject(null)}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteSubject(subject.id)}>
                      删除
                    </Button>
                  )}
                </div>
              </div>

              {expandedSubject === subject.id && (
                <div className={styles.chapterList}>
                  {subject.chapters.map((chapter) => (
                    <div key={chapter.id} className={styles.chapterItem}>
                      <div className={styles.chapterHeader}>
                        <button
                          className={styles.chapterToggle}
                          onClick={() => toggleChapter(chapter.id)}
                        >
                          <span className={`${styles.chevron} ${expandedChapter === chapter.id ? styles.chevronOpen : ''}`}>
                            ▶
                          </span>
                          <span className={styles.chapterName}>{chapter.name}</span>
                          <span className={styles.chapterCount}>{chapter.topics.length} 知识点</span>
                        </button>
                        <div className={styles.chapterActions}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAddingTopicFor({ subjectId: subject.id, chapterId: chapter.id })
                              setNewTopicName('')
                            }}
                          >
                            +知识点
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteChapter(subject.id, chapter.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </div>

                      {expandedChapter === chapter.id && (
                        <div className={styles.topicList}>
                          {addingTopicFor?.chapterId === chapter.id && (
                            <div className={styles.inlineAdd}>
                              <input
                                className={styles.inlineInput}
                                placeholder="新知识点名称..."
                                value={newTopicName}
                                onChange={(e) => setNewTopicName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddTopic()
                                  if (e.key === 'Escape') setAddingTopicFor(null)
                                }}
                                autoFocus
                              />
                              <Button size="sm" onClick={handleAddTopic}>添加</Button>
                              <Button size="sm" variant="ghost" onClick={() => setAddingTopicFor(null)}>
                                取消
                              </Button>
                            </div>
                          )}

                          {chapter.topics.length === 0 && !addingTopicFor && (
                            <div className={styles.emptyTopic}>暂无知识点</div>
                          )}

                          {chapter.topics.map((topic) => {
                            const mastery = topic.mastery
                            const flashcardCount = getFlashcardCount(topic.id)
                            const lastReview = getLastReviewDate(topic.id)

                            return (
                              <div key={topic.id} className={styles.topicItem}>
                                <div className={styles.topicInfo}>
                                  <span className={styles.topicName}>{topic.name}</span>
                                  <div className={styles.topicBadges}>
                                    <button
                                      className={styles.masteryBadge}
                                      onClick={() =>
                                        handleMasteryToggle(subject.id, chapter.id, topic.id, mastery)
                                      }
                                      title="点击切换掌握程度"
                                    >
                                      <Badge variant={MASTERY_VARIANTS[mastery]}>
                                        {MASTERY_LABELS[mastery]}
                                      </Badge>
                                    </button>
                                    {topic.relatedMistakes.length > 0 && (
                                      <Badge variant="danger">
                                        错题 {topic.relatedMistakes.length}
                                      </Badge>
                                    )}
                                    {flashcardCount > 0 && (
                                      <Badge variant="info">
                                        闪卡 {flashcardCount}
                                      </Badge>
                                    )}
                                    {lastReview && (
                                      <span className={styles.lastReview}>
                                        最近复习: {lastReview}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className={styles.topicActions}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenFlashcardModal(subject.name, chapter.name, topic.id)
                                    }
                                  >
                                    新建闪卡
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteTopic(subject.id, chapter.id, topic.id)
                                    }
                                  >
                                    删除
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add chapter inline */}
                  {addingChapterFor === subject.id ? (
                    <div className={styles.inlineAdd}>
                      <input
                        className={styles.inlineInput}
                        placeholder="新章节名称..."
                        value={newChapterName}
                        onChange={(e) => setNewChapterName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddChapter(subject.id)
                          if (e.key === 'Escape') {
                            setAddingChapterFor(null)
                            setNewChapterName('')
                          }
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleAddChapter(subject.id)}>添加</Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setAddingChapterFor(null)
                        setNewChapterName('')
                      }}>
                        取消
                      </Button>
                    </div>
                  ) : (
                    <button
                      className={styles.addChapterBtn}
                      onClick={() => {
                        setAddingChapterFor(subject.id)
                        setNewChapterName('')
                      }}
                    >
                      + 添加章节
                    </button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add subject modal */}
      <Modal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        title="添加学科"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>学科名称</label>
            <input
              className={styles.input}
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="例如：数学、英语、物理"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubject()
              }}
              autoFocus
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setShowSubjectModal(false)}>
              取消
            </Button>
            <Button onClick={handleAddSubject}>添加</Button>
          </div>
        </div>
      </Modal>

      {/* Flashcard create modal */}
      <Modal
        isOpen={flashcardModal.open}
        onClose={() => setFlashcardModal({ open: false, subject: '', chapter: '', knowledgeId: '' })}
        title="新建闪卡"
      >
        <div className={styles.form}>
          <p className={styles.flashcardInfo}>
            将在 <strong>{flashcardModal.subject}</strong> - <strong>{flashcardModal.chapter}</strong> 下创建闪卡
          </p>
          <div className={styles.formActions}>
            <Button
              variant="secondary"
              onClick={() => setFlashcardModal({ open: false, subject: '', chapter: '', knowledgeId: '' })}
            >
              取消
            </Button>
            <Button onClick={handleCreateFlashcard}>创建并前往编辑</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/study/MistakesPage.module.css`

```css
/* ============================================================
   Personal Workbench V8 — MistakesPage Styles
   ============================================================ */

.filterBar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filterBar select,
.filterBar input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color var(--transition-fast);
}

.filterBar select:focus,
.filterBar input:focus {
  border-color: var(--color-border-focus);
}

.toggleBtn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.toggleBtn:hover {
  background: var(--color-surface-2);
}

.toggleBtnActive {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

/* ---- Flip Card ---- */
.flipCard {
  perspective: 1000px;
  height: 260px;
  cursor: pointer;
}

.flipCardInner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s ease;
  transform-style: preserve-3d;
}

.flipped .flipCardInner {
  transform: rotateY(180deg);
}

.flipCardFront,
.flipCardBack {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: var(--radius-md);
  padding: 18px;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.flipCardBack {
  transform: rotateY(180deg);
}

.cardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
  flex-shrink: 0;
}

.subjectBadge {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.errorTypeTag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.questionText {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  flex: 1;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  margin-bottom: 8px;
}

.answerText {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.6;
  flex: 1;
  overflow-y: auto;
  margin-bottom: 8px;
}

.cardFooter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
}

.date {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
}

.backActions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-light);
}

.backActions button {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.backActions button:hover {
  background: var(--color-surface-2);
}

.masteredBtn {
  border-color: var(--color-success) !important;
  color: var(--color-success) !important;
}

.notMasteredBtn {
  border-color: var(--color-warning) !important;
  color: var(--color-warning) !important;
}

.flashcardBtn {
  border-color: var(--color-accent) !important;
  color: var(--color-accent) !important;
}

/* ---- Modal Form ---- */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.formGroup label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.formGroup select,
.formGroup textarea,
.formGroup input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  transition: border-color var(--transition-fast);
}

.formGroup select:focus,
.formGroup textarea:focus,
.formGroup input:focus {
  border-color: var(--color-border-focus);
}

.formGroup textarea {
  min-height: 80px;
}

.errorTypeGroup {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.errorTypeOption {
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 12px;
  cursor: pointer;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.errorTypeOption:hover {
  background: var(--color-surface-2);
}

.errorTypeOptionActive {
  background: var(--color-warning-light);
  color: var(--color-warning);
  border-color: var(--color-warning);
}

.tagInput {
  display: flex;
  gap: 8px;
}

.tagInput input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
}

.tagsList {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tagChip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-size: 12px;
}

.tagChip button {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
}

.knowledgeSelect {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 160px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 8px;
}

.knowledgeItem {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
}

.knowledgeItem:hover {
  background: var(--color-surface-2);
}

.knowledgeItem input {
  margin: 0;
}

.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  text-align: center;
  margin-top: 12px;
}
```

### `src/pages/study/MistakesPage.tsx`

```tsx
// ============================================================
// Personal Workbench V8 — MistakesPage (Task 15)
// ============================================================

import { useState, useEffect } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useStudyStore } from '@/stores/studyStore'
import { useFlashcardStore } from '@/stores/flashcardStore'
import { formatDate } from '@/utils/helpers'
import type { Mistake } from '@/types'
import styles from './MistakesPage.module.css'

const ERROR_TYPES = ['概念错误', '计算错误', '审题错误', '其他']

const emptyMistake = (): Partial<Mistake> => ({
  subject: '',
  question: '',
  answer: '',
  errorType: '',
  tags: [],
  linkedKnowledge: [],
  mastered: false,
})

export default function MistakesPage() {
  const {
    mistakes,
    subjects,
    loading,
    loadMistakes,
    loadSubjects,
    addMistake,
    updateMistake,
    deleteMistake,
  } = useStudyStore()
  const { addFlashcard } = useFlashcardStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Mistake | null>(null)
  const [form, setForm] = useState<Partial<Mistake>>(emptyMistake())

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('')
  const [onlyUnmastered, setOnlyUnmastered] = useState(false)
  const [tagFilter, setTagFilter] = useState('')

  // Tag input
  const [tagInput, setTagInput] = useState('')

  // Flashcard modal
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false)
  const [fCardForm, setFCardForm] = useState({ question: '', answer: '', subject: '', chapter: '', tags: '', difficulty: 3 })

  useEffect(() => {
    loadMistakes()
    loadSubjects()
  }, [loadMistakes, loadSubjects])

  // ---- Helpers ----

  const allTags = Array.from(new Set(mistakes.flatMap((m) => m.tags))).sort()

  const filtered = mistakes.filter((m) => {
    if (subjectFilter && m.subject !== subjectFilter) return false
    if (onlyUnmastered && m.mastered) return false
    if (tagFilter && !m.tags.includes(tagFilter)) return false
    return true
  })

  const openAdd = () => {
    setEditing(null)
    setForm(emptyMistake())
    setModalOpen(true)
  }

  const openEdit = (m: Mistake) => {
    setEditing(m)
    setForm({ ...m })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.question || !form.subject) return
    if (editing) {
      await updateMistake(editing.id, form)
    } else {
      await addMistake(form as Parameters<typeof addMistake>[0])
    }
    setModalOpen(false)
  }

  const handleDelete = async () => {
    if (editing && window.confirm('确定删除这条错题？')) {
      await deleteMistake(editing.id)
      setModalOpen(false)
    }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !(form.tags || []).includes(t)) {
      setForm({ ...form, tags: [...(form.tags || []), t] })
      setTagInput('')
    }
  }

  const removeTag = (t: string) => {
    setForm({ ...form, tags: (form.tags || []).filter((x) => x !== t) })
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const toggleKnowledge = (kid: string) => {
    const current = form.linkedKnowledge || []
    if (current.includes(kid)) {
      setForm({ ...form, linkedKnowledge: current.filter((k) => k !== kid) })
    } else {
      setForm({ ...form, linkedKnowledge: [...current, kid] })
    }
  }

  // ---- Flashcard generation ----

  const openFlashcardFromMistake = (m: Mistake) => {
    setFCardForm({
      question: m.question,
      answer: m.answer,
      subject: m.subject,
      chapter: '',
      tags: m.tags.join(', '),
      difficulty: 3,
    })
    setFlashcardModalOpen(true)
  }

  const handleCreateFlashcard = async () => {
    if (!fCardForm.question || !fCardForm.answer) return
    await addFlashcard({
      question: fCardForm.question,
      answer: fCardForm.answer,
      subject: fCardForm.subject,
      chapter: fCardForm.chapter,
      tags: fCardForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      difficulty: fCardForm.difficulty,
    })
    setFlashcardModalOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="错题本"
        description="记录与复习错题"
        actions={<Button onClick={openAdd}>+ 新增错题</Button>}
      />

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <select value={subjectFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSubjectFilter(e.target.value)}>
          <option value="">全部学科</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
        <button
          className={`${styles.toggleBtn} ${onlyUnmastered ? styles.toggleBtnActive : ''}`}
          onClick={() => setOnlyUnmastered(!onlyUnmastered)}
        >
          {onlyUnmastered ? '仅未掌握' : '全部'}
        </button>
        <select value={tagFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setTagFilter(e.target.value)}>
          <option value="">全部标签</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Loading / Empty */}
      {loading && <EmptyState icon="⏳" title="加载中..." />}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="📝"
          title="暂无错题"
          description="点击「新增错题」开始记录你的错题"
          action={<Button onClick={openAdd}>新增错题</Button>}
        />
      )}

      {/* Cards Grid */}
      {!loading && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map((m) => (
            <MistakeCard
              key={m.id}
              mistake={m}
              onEdit={() => openEdit(m)}
              onToggleMastered={() => updateMistake(m.id, { mastered: !m.mastered })}
              onGenerateFlashcard={() => openFlashcardFromMistake(m)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑错题' : '新增错题'}
        size="lg"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>学科</label>
            <select
              value={form.subject || ''}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, subject: e.target.value })}
            >
              <option value="">选择学科</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>题目</label>
            <textarea
              value={form.question || ''}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, question: e.target.value })}
              placeholder="输入错题题目..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>正确答案</label>
            <textarea
              value={form.answer || ''}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, answer: e.target.value })}
              placeholder="输入正确答案..."
            />
          </div>

          <div className={styles.formGroup}>
            <label>错误类型</label>
            <div className={styles.errorTypeGroup}>
              {ERROR_TYPES.map((et) => (
                <button
                  key={et}
                  type="button"
                  className={`${styles.errorTypeOption} ${form.errorType === et ? styles.errorTypeOptionActive : ''}`}
                  onClick={() => setForm({ ...form, errorType: form.errorType === et ? '' : et })}
                >
                  {et}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>标签</label>
            <div className={styles.tagInput}>
              <input
                value={tagInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="输入标签后按回车..."
              />
              <Button size="sm" variant="secondary" onClick={addTag}>添加</Button>
            </div>
            {(form.tags || []).length > 0 && (
              <div className={styles.tagsList}>
                {(form.tags || []).map((t) => (
                  <span key={t} className={styles.tagChip}>
                    {t}
                    <button onClick={() => removeTag(t)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>关联知识点</label>
            <div className={styles.knowledgeSelect}>
              {subjects.map((sub) =>
                sub.chapters.map((ch) =>
                  ch.topics.map((topic) => (
                    <label key={topic.id} className={styles.knowledgeItem}>
                      <input
                        type="checkbox"
                        checked={(form.linkedKnowledge || []).includes(topic.id)}
                        onChange={() => toggleKnowledge(topic.id)}
                      />
                      {sub.name} › {ch.name} › {topic.name}
                    </label>
                  ))
                )
              )}
              {subjects.every((s) => s.chapters.length === 0) && (
                <span className={styles.hint}>暂无知识点，请先在知识体系中创建</span>
              )}
            </div>
          </div>

          <div className={styles.modalFooter}>
            {editing && (
              <Button variant="danger" onClick={handleDelete}>删除</Button>
            )}
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSave}>{editing ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>

      {/* Generate Flashcard Modal */}
      <Modal
        isOpen={flashcardModalOpen}
        onClose={() => setFlashcardModalOpen(false)}
        title="生成闪卡"
        size="md"
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label>问题</label>
            <textarea
              value={fCardForm.question}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFCardForm({ ...fCardForm, question: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>答案</label>
            <textarea
              value={fCardForm.answer}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFCardForm({ ...fCardForm, answer: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>学科</label>
            <select
              value={fCardForm.subject}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFCardForm({ ...fCardForm, subject: e.target.value })}
            >
              <option value="">选择学科</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>章节</label>
            <input
              value={fCardForm.chapter}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFCardForm({ ...fCardForm, chapter: e.target.value })}
              placeholder="可选"
            />
          </div>
          <div className={styles.formGroup}>
            <label>标签（逗号分隔）</label>
            <input
              value={fCardForm.tags}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFCardForm({ ...fCardForm, tags: e.target.value })}
              placeholder="标签1, 标签2"
            />
          </div>
          <div className={styles.formGroup}>
            <label>难度: {fCardForm.difficulty}</label>
            <input
              type="range"
              min="1"
              max="5"
              value={fCardForm.difficulty}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFCardForm({ ...fCardForm, difficulty: Number(e.target.value) })}
            />
          </div>
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setFlashcardModalOpen(false)}>取消</Button>
            <Button onClick={handleCreateFlashcard}>创建闪卡</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---- MistakeCard Component (with flip) ----

function MistakeCard({
  mistake,
  onEdit,
  onToggleMastered,
  onGenerateFlashcard,
}: {
  mistake: Mistake
  onEdit: () => void
  onToggleMastered: () => void
  onGenerateFlashcard: () => void
}) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className={`${styles.flipCard} ${flipped ? styles.flipped : ''}`}
      onClick={() => setFlipped(!flipped)}
    >
      <div className={styles.flipCardInner}>
        {/* Front */}
        <div className={styles.flipCardFront}>
          <div className={styles.cardHeader}>
            <span className={styles.subjectBadge}>{mistake.subject}</span>
            {mistake.errorType && (
              <span className={styles.errorTypeTag}>{mistake.errorType}</span>
            )}
          </div>
          <div className={styles.questionText}>{mistake.question}</div>
          <div className={styles.cardFooter}>
            <span className={styles.date}>{formatDate(new Date(mistake.createdAt))}</span>
            <div className={styles.tags}>
              {mistake.tags.map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Back */}
        <div className={styles.flipCardBack}>
          <div className={styles.cardHeader}>
            <span className={styles.subjectBadge}>{mistake.subject}</span>
            <span className={styles.date}>{formatDate(new Date(mistake.createdAt))}</span>
          </div>
          <div className={styles.answerText}>{mistake.answer || '（暂无答案）'}</div>
          <div className={styles.backActions}>
            <button
              className={mistake.mastered ? styles.masteredBtn : styles.notMasteredBtn}
              onClick={(e) => { e.stopPropagation(); onToggleMastered() }}
            >
              {mistake.mastered ? '✓ 已掌握' : '待掌握'}
            </button>
            <button
              className={styles.flashcardBtn}
              onClick={(e) => { e.stopPropagation(); onGenerateFlashcard() }}
            >
              生成闪卡
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
            >
              编辑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### `src/pages/study/ReadingPage.module.css`

```css
.page {
  padding: 0 24px 24px;
}

.loading {
  text-align: center;
  color: var(--color-text-tertiary);
  padding: 48px 0;
  font-size: 14px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.card {
  padding: 20px;
  position: relative;
}

.pinned {
  border: 1px solid var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent-light);
}

.cardHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.titleRow {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.pinIcon {
  font-size: 14px;
}

.completeBadge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-success);
  background: var(--color-success-light);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  width: fit-content;
}

.cardActions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

/* Progress */
.progressSection {
  margin-bottom: 14px;
}

.progressBar {
  height: 10px;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 8px;
}

.progressFill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width var(--transition-normal);
  min-width: 2px;
}

.progressComplete {
  background: var(--color-success);
}

.progressInfo {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progressText {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.progressPercent {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* Step controls */
.stepControls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

/* Note */
.note {
  margin: 0;
  padding: 10px 12px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  white-space: pre-wrap;
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 12px;
  align-items: end;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.input {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.input:focus {
  border-color: var(--color-border-focus);
}

.textarea {
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color var(--transition-fast);
}

.textarea:focus {
  border-color: var(--color-border-focus);
}

.pinLabel {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.pinLabel input {
  accent-color: var(--color-accent);
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
}

@media (max-width: 500px) {
  .formRow {
    grid-template-columns: 1fr 1fr;
  }
}
```

### `src/pages/study/ReadingPage.tsx`

```tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useStudyStore } from '@/stores/studyStore'
import { useToast } from '@/components/ui/Toast'
import styles from './ReadingPage.module.css'

const UNITS = ['页', '章', '本', 'min']

interface FormData {
  title: string
  current: number
  target: number
  unit: string
  note: string
  pinned: boolean
}

const EMPTY_FORM: FormData = {
  title: '',
  current: 0,
  target: 0,
  unit: '页',
  note: '',
  pinned: false,
}

export default function ReadingPage() {
  const { toast } = useToast()
  const { reading, loading, loadReading, addReading, updateReading, deleteReading } =
    useStudyStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    loadReading()
  }, [loadReading])

  const sorted = useMemo(() => {
    return [...reading].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [reading])

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((r: typeof reading[0]) => {
    setEditingId(r.id)
    setForm({
      title: r.title,
      current: r.current,
      target: r.target,
      unit: r.unit,
      note: r.note,
      pinned: r.pinned,
    })
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    const title = form.title.trim()
    if (!title) {
      toast('请输入书名', 'warning')
      return
    }
    if (form.target <= 0) {
      toast('请设置目标数量', 'warning')
      return
    }

    if (editingId) {
      await updateReading(editingId, {
        title,
        current: form.current,
        target: form.target,
        unit: form.unit,
        note: form.note,
        pinned: form.pinned,
      })
      toast('已更新', 'success')
    } else {
      await addReading({
        title,
        current: form.current,
        target: form.target,
        unit: form.unit,
        note: form.note,
        pinned: form.pinned,
      })
      toast('已添加', 'success')
    }
    setModalOpen(false)
  }, [form, editingId, addReading, updateReading, toast])

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteReading(id)
      setConfirmId(null)
      toast('已删除', 'info')
    },
    [deleteReading, toast],
  )

  const handleStep = useCallback(
    async (id: string, current: number, target: number, delta: number) => {
      const next = current + delta
      if (next < 0) return
      if (target > 0 && next > target) return
      await updateReading(id, { current: next })
    },
    [updateReading],
  )

  const handleTogglePin = useCallback(
    async (id: string, pinned: boolean) => {
      await updateReading(id, { pinned: !pinned })
    },
    [updateReading],
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title="阅读"
        description="追踪阅读进度与笔记"
        actions={<Button onClick={openCreate}>添加阅读目标</Button>}
      />

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : reading.length === 0 ? (
        <EmptyState
          icon="📖"
          title="还没有阅读目标"
          description="点击上方按钮添加你的第一个阅读目标"
          action={<Button onClick={openCreate}>添加阅读目标</Button>}
        />
      ) : (
        <div className={styles.grid}>
          {sorted.map((r) => {
            const progress = r.target > 0 ? Math.min((r.current / r.target) * 100, 100) : 0
            const isComplete = r.target > 0 && r.current >= r.target

            return (
              <Card key={r.id} className={`${styles.card} ${r.pinned ? styles.pinned : ''}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.titleRow}>
                    <h3 className={styles.title}>
                      {r.pinned && <span className={styles.pinIcon}>📌</span>}
                      {r.title}
                    </h3>
                    {isComplete && <span className={styles.completeBadge}>✓ 完成</span>}
                  </div>
                  <div className={styles.cardActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePin(r.id, r.pinned)}
                      title={r.pinned ? '取消置顶' : '置顶'}
                    >
                      {r.pinned ? '📌' : '📌'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                      编辑
                    </Button>
                    {confirmId === r.id ? (
                      <>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(r.id)}>
                          确认删除
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                          取消
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmId(r.id)}>
                        删除
                      </Button>
                    )}
                  </div>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressBar}>
                    <div
                      className={`${styles.progressFill} ${isComplete ? styles.progressComplete : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className={styles.progressInfo}>
                    <span className={styles.progressText}>
                      {r.current} / {r.target} {r.unit}
                    </span>
                    <span className={styles.progressPercent}>
                      {isComplete ? '100%' : `${Math.round(progress)}%`}
                    </span>
                  </div>
                </div>

                <div className={styles.stepControls}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStep(r.id, r.current, r.target, -1)}
                    disabled={r.current <= 0}
                  >
                    -1 {r.unit === 'min' ? 'min' : r.unit}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStep(r.id, r.current, r.target, 1)}
                    disabled={r.target > 0 && r.current >= r.target}
                  >
                    +1 {r.unit === 'min' ? 'min' : r.unit}
                  </Button>
                </div>

                {r.note && (
                  <p className={styles.note}>{r.note}</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? '编辑阅读目标' : '添加阅读目标'}
      >
        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>书名/标题</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：《三体》"
              autoFocus
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>当前进度</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                value={form.current}
                onChange={(e) => setForm((f) => ({ ...f, current: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>目标</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: parseInt(e.target.value, 10) || 0 }))}
                placeholder="例如：300"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>单位</label>
              <select
                className={styles.input}
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>备注</label>
            <textarea
              className={styles.textarea}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="阅读笔记..."
              rows={3}
            />
          </div>

          <label className={styles.pinLabel}>
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))}
            />
            <span>置顶</span>
          </label>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>{editingId ? '保存' : '添加'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/study/StudyLayout.tsx`

```tsx
import { Outlet } from 'react-router-dom'

export default function StudyLayout() {
  return <Outlet />
}
```

### `src/pages/today/TodayPage.module.css`

```css
/* ============================================================
   TodayPage — 今日概览首页
   ============================================================ */

.page {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-bottom: 40px;
}

/* ---- Greeting ---- */

.greetingSection {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.greeting {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.3px;
  margin: 0;
}

.date {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin: 0;
}

.countdowns {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}

.countdown {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: 13px;
  color: var(--color-accent);
  background: var(--color-accent-light);
  border-radius: var(--radius-full);
  white-space: nowrap;
}

/* ---- Section ---- */

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

/* ---- Task List ---- */

.taskList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.taskItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.taskItem:hover {
  background: var(--color-surface-2);
}

.checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  padding: 0;
}

.checkbox:hover {
  border-color: var(--color-accent);
}

.checked {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.checkmark {
  display: none;
}

.checked .checkmark {
  display: block;
  width: 6px;
  height: 10px;
  border: solid var(--color-text-inverse);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-top: -2px;
}

.taskTitle {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.taskDone {
  text-decoration: line-through;
  color: var(--color-text-tertiary);
}

.priority {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.p0 {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.p1 {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.p2 {
  background: var(--color-surface-2);
  color: var(--color-text-tertiary);
}

/* ---- Loading / Empty ---- */

.loading {
  text-align: center;
  padding: 24px;
  color: var(--color-text-tertiary);
  font-size: 14px;
}

.emptyText {
  text-align: center;
  padding: 24px;
  color: var(--color-text-tertiary);
  font-size: 14px;
  margin: 0;
}

/* ---- Pomodoro Stats ---- */

.pomodoroStats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 16px 0;
}

.statItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 32px;
}

.statValue {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.statLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.statDivider {
  width: 1px;
  height: 40px;
  background: var(--color-border);
}

/* ---- Study List ---- */

.studyList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.studyItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.studyItem:hover {
  background: var(--color-surface-2);
}

.studySubject {
  font-size: 14px;
  color: var(--color-text-primary);
}

.studyTime {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
}

/* ---- Review ---- */

.reviewDone {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 8px 0;
}

.reviewCheck {
  font-size: 24px;
  flex-shrink: 0;
  line-height: 1.4;
}

.reviewSummary {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.reviewExcerpt {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.reviewPending {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  text-align: center;
}

.reviewPendingText {
  font-size: 15px;
  color: var(--color-text-secondary);
  margin: 0;
}

/* ---- Responsive ---- */

@media (max-width: 768px) {
  .page {
    gap: 20px;
    padding-bottom: 24px;
  }

  .greeting {
    font-size: 22px;
  }

  .date {
    font-size: 14px;
  }

  .countdowns {
    gap: 8px;
    margin-top: 8px;
  }

  .countdown {
    font-size: 12px;
    padding: 3px 10px;
  }

  .sectionTitle {
    font-size: 15px;
  }

  .pomodoroStats {
    flex-direction: column;
    gap: 16px;
    padding: 12px 0;
  }

  .statDivider {
    width: 80%;
    height: 1px;
  }

  .statItem {
    padding: 0;
  }

  .statValue {
    font-size: 24px;
  }

  .taskItem {
    padding: 12px 8px;
  }

  .reviewDone {
    flex-direction: column;
    gap: 8px;
  }

  .reviewPending {
    padding: 12px 0;
    gap: 12px;
  }
}
```

### `src/pages/today/TodayPage.tsx`

```tsx
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/stores/taskStore'
import { useRecurringStore } from '@/stores/recurringStore'
import { useToolStore } from '@/stores/toolStore'
import { useStudyStore } from '@/stores/studyStore'
import { useReviewStore } from '@/stores/reviewStore'
import { getGreeting, formatDate, isToday, getDaysDiff } from '@/utils/helpers'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import type { Task } from '@/types'
import styles from './TodayPage.module.css'

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 }

function formatChineseDate(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = WEEKDAY_NAMES[date.getDay()]
  return `${y}年${m}月${d}日 · ${w}`
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export default function TodayPage() {
  const navigate = useNavigate()

  const { tasks, loading: tasksLoading, loadTasks, toggleDone } = useTaskStore()
  const { recurringTasks, loadRecurring, generateTodayTasks } = useRecurringStore()
  const { pomodoroLogs, countdowns, loadPomodoroLogs, loadCountdowns } = useToolStore()
  const { subjects, loadSubjects } = useStudyStore()
  const { reviews, loadAll: loadReviews } = useReviewStore()

  useEffect(() => {
    loadTasks()
    loadRecurring()
    loadPomodoroLogs()
    loadCountdowns()
    loadSubjects()
    loadReviews()
  }, [loadTasks, loadRecurring, loadPomodoroLogs, loadCountdowns, loadSubjects, loadReviews])

  useEffect(() => {
    generateTodayTasks()
  }, [recurringTasks, generateTodayTasks])

  const today = formatDate(new Date())
  const now = new Date()

  // ---- Today's tasks (not done) ----
  const todayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate === today && !t.done)
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 99
        const pb = PRIORITY_ORDER[b.priority] ?? 99
        if (pa !== pb) return pa - pb
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return 0
      })
  }, [tasks, today])

  const topThreeTasks = todayTasks.slice(0, 3)

  // ---- Recurring tasks (tasks with sourceRecurringId) ----
  const recurringTodayTasks = useMemo(() => {
    return tasks.filter((t) => t.sourceRecurringId && t.dueDate === today && !t.done)
  }, [tasks, today])

  // ---- Pomodoro stats for today ----
  const pomodoroStats = useMemo(() => {
    const todayLogs = pomodoroLogs.filter((l) => l.date === today && l.completed)
    const totalMinutes = todayLogs.reduce((sum, l) => sum + l.duration, 0)
    const completedCount = todayLogs.length
    return { totalMinutes, completedCount }
  }, [pomodoroLogs, today])

  // ---- Study time by subject (from pomodoro logs with subject) ----
  const studyTimeBySubject = useMemo(() => {
    const todayLogs = pomodoroLogs.filter((l) => l.date === today && l.completed && l.subject)
    const map: Record<string, number> = {}
    for (const log of todayLogs) {
      const subj = log.subject!
      map[subj] = (map[subj] || 0) + log.duration
    }
    // Sort by time descending
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [pomodoroLogs, today])

  // ---- Today's daily review ----
  const todayReview = useMemo(() => {
    return reviews.find(
      (r) => r.type === 'daily' && isToday(r.dateRange.start),
    )
  }, [reviews])

  // ---- Countdowns for home ----
  const homeCountdowns = useMemo(() => {
    return countdowns
      .filter((c) => c.showOnHome)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
  }, [countdowns])

  const isLoading = tasksLoading

  return (
    <div className={styles.page}>
      {/* ===== 1. Top Greeting ===== */}
      <section className={styles.greetingSection}>
        <h1 className={styles.greeting}>{getGreeting()}，Marty</h1>
        <p className={styles.date}>{formatChineseDate(now)}</p>
        {homeCountdowns.length > 0 && (
          <div className={styles.countdowns}>
            {homeCountdowns.map((c) => {
              const daysLeft = getDaysDiff(today, c.targetDate)
              const dayLabel = daysLeft === 0 ? '今天' : daysLeft > 0 ? `还有 ${daysLeft} 天` : `已过 ${Math.abs(daysLeft)} 天`
              return (
                <span key={c.id} className={styles.countdown}>
                  {c.title} · {dayLabel}
                </span>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== 2. 今日三件最重要的事 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🎯 今日三件最重要的事</h2>
        <Card>
          {isLoading ? (
            <div className={styles.loading}>加载中...</div>
          ) : topThreeTasks.length === 0 ? (
            <EmptyState
              icon="📋"
              title="今天还没有安排任务"
              description="开始规划今天要做的事情吧"
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate('/plan/inbox')}>
                  去计划
                </Button>
              }
            />
          ) : (
            <ul className={styles.taskList}>
              {topThreeTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={() => toggleDone(task.id)} />
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* ===== 3. 今日周期计划 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🔁 今日周期计划</h2>
        <Card>
          {isLoading ? (
            <div className={styles.loading}>加载中...</div>
          ) : recurringTodayTasks.length === 0 ? (
            <p className={styles.emptyText}>暂无周期计划</p>
          ) : (
            <ul className={styles.taskList}>
              {recurringTodayTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={() => toggleDone(task.id)} />
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* ===== 4. 今日专注 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🍅 今日专注</h2>
        <Card>
          {pomodoroStats.completedCount === 0 ? (
            <p className={styles.emptyText}>今天还没有完成番茄钟</p>
          ) : (
            <div className={styles.pomodoroStats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{formatMinutes(pomodoroStats.totalMinutes)}</span>
                <span className={styles.statLabel}>总专注时长</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statValue}>{pomodoroStats.completedCount}</span>
                <span className={styles.statLabel}>完成番茄数</span>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* ===== 5. 今日学习 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🧠 今日学习</h2>
        <Card>
          {subjects.length === 0 && studyTimeBySubject.length === 0 ? (
            <EmptyState
              icon="📚"
              title="还没有学习科目"
              description="添加科目后，在学习专注时可关联科目"
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate('/study')}>
                  去学习
                </Button>
              }
            />
          ) : studyTimeBySubject.length === 0 ? (
            <p className={styles.emptyText}>今天还没有学习记录</p>
          ) : (
            <ul className={styles.studyList}>
              {studyTimeBySubject.map(([subject, minutes]) => (
                <li key={subject} className={styles.studyItem}>
                  <span className={styles.studySubject}>{subject}</span>
                  <span className={styles.studyTime}>{formatMinutes(minutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* ===== 6. 今日复盘 ===== */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>🌙 今日复盘</h2>
        <Card>
          {todayReview ? (
            <div className={styles.reviewDone}>
              <span className={styles.reviewCheck}>✅</span>
              <div>
                <p className={styles.reviewSummary}>今日复盘已完成</p>
                {todayReview.reflections.length > 0 && (
                  <p className={styles.reviewExcerpt}>
                    {todayReview.reflections[0]}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.reviewPending}>
              <p className={styles.reviewPendingText}>今晚还有一份复盘等待完成</p>
              <Button onClick={() => navigate('/review/daily')}>
                开始今日复盘
              </Button>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}

// ---- Task Row ----

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <li className={styles.taskItem}>
      <button
        className={`${styles.checkbox} ${task.done ? styles.checked : ''}`}
        onClick={onToggle}
        aria-label={task.done ? '标记为未完成' : '标记为已完成'}
      >
        <span className={styles.checkmark} />
      </button>
      <span className={`${styles.taskTitle} ${task.done ? styles.taskDone : ''}`}>
        {task.title}
      </span>
      <span className={`${styles.priority} ${styles[task.priority.toLowerCase()]}`}>
        {task.priority}
      </span>
    </li>
  )
}
```

### `src/pages/tools/CountdownsPage.module.css`

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: box-shadow var(--transition-fast);
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.cardTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.cardInfo {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.targetDate {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
}

.daysRemaining {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-accent);
  margin: 0;
  line-height: 1.2;
}

.daysLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 2px 0 0;
}

.cardBottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.typeBadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
}

.typeIcon {
  font-size: 14px;
}

.showHome {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.actions {
  display: flex;
  gap: 4px;
}

.actionBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.actionBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.typeSelect {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.typeOption {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  font-size: 13px;
  border-radius: var(--radius-full);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.typeOption:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.typeOptionActive {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.toggleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  background: var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: background var(--transition-fast);
  border: none;
  padding: 0;
}

.toggleOn {
  background: var(--color-accent);
}

.toggleKnob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.toggleOn .toggleKnob {
  transform: translateX(20px);
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.homeBadge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--color-success);
  padding: 2px 8px;
  background: var(--color-success-light);
  border-radius: var(--radius-full);
}
```

### `src/pages/tools/CountdownsPage.tsx`

```tsx
import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useToolStore } from '@/stores/toolStore'
import { useToast } from '@/components/ui/Toast'
import { getDaysDiff, formatDate } from '@/utils/helpers'
import type { Countdown, CountdownType } from '@/types'
import styles from './CountdownsPage.module.css'

const TYPE_CONFIG: { value: CountdownType; label: string; icon: string }[] = [
  { value: 'exam', label: '考试', icon: '📝' },
  { value: 'travel', label: '旅行', icon: '✈️' },
  { value: 'birthday', label: '生日', icon: '🎂' },
  { value: 'event', label: '事件', icon: '📅' },
  { value: 'custom', label: '自定义', icon: '🏷' },
]

const TYPE_LABEL: Record<CountdownType, string> = {
  exam: '考试',
  travel: '旅行',
  birthday: '生日',
  event: '事件',
  custom: '自定义',
}

const TYPE_ICON: Record<CountdownType, string> = {
  exam: '📝',
  travel: '✈️',
  birthday: '🎂',
  event: '📅',
  custom: '🏷',
}

const emptyForm = {
  title: '',
  targetDate: '',
  type: 'event' as CountdownType,
  showOnHome: true,
}

export default function CountdownsPage() {
  const { countdowns, loading, loadCountdowns, addCountdown, updateCountdown, deleteCountdown } = useToolStore()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCountdowns()
  }, [loadCountdowns])

  const openAdd = useCallback(() => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((c: Countdown) => {
    setEditingId(c.id)
    setForm({
      title: c.title,
      targetDate: c.targetDate,
      type: c.type,
      showOnHome: c.showOnHome,
    })
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingId(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.targetDate) {
      toast('请填写标题和日期', 'warning')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateCountdown(editingId, form)
        toast('倒数日已更新', 'success')
      } else {
        await addCountdown({
          title: form.title.trim(),
          targetDate: form.targetDate,
          type: form.type,
          showOnHome: form.showOnHome,
        })
        toast('倒数日已创建', 'success')
      }
      closeModal()
    } catch {
      toast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }, [form, editingId, addCountdown, updateCountdown, closeModal, toast])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定要删除这个倒数日吗？')) return
    try {
      await deleteCountdown(id)
      toast('倒数日已删除', 'success')
    } catch {
      toast('删除失败', 'error')
    }
  }, [deleteCountdown, toast])

  const today = formatDate(new Date())

  const sorted = [...countdowns].sort((a, b) => {
    const diffA = getDaysDiff(today, a.targetDate)
    const diffB = getDaysDiff(today, b.targetDate)
    return Math.abs(diffA) - Math.abs(diffB)
  })

  return (
    <div className={styles.page}>
      <PageHeader
        title="倒数日"
        description="重要日期倒计时提醒"
        actions={
          <Button onClick={openAdd}>新增倒数日</Button>
        }
      />

      {loading ? (
        <EmptyState icon="⏳" title="加载中..." />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="📅"
          title="还没有倒数日"
          description="点击「新增倒数日」添加你的重要日期"
          action={<Button onClick={openAdd}>新增倒数日</Button>}
        />
      ) : (
        <div className={styles.list}>
          {sorted.map((c) => {
            const diff = getDaysDiff(today, c.targetDate)
            const isPast = diff < 0
            const absDiff = Math.abs(diff)

            return (
              <div key={c.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.title}>{c.title}</h3>
                    <p className={styles.targetDate}>{c.targetDate}</p>
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => openEdit(c)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleDelete(c.id)}
                      title="删除"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <div>
                  <p className={styles.daysRemaining}>
                    {isPast ? `已过 ${absDiff} 天` : `还剩 ${absDiff} 天`}
                  </p>
                  <p className={styles.daysLabel}>
                    {isPast ? '已经过去' : '距离目标日期'}
                    {diff === 0 ? ' 🎯 就是今天！' : ''}
                  </p>
                </div>

                <div className={styles.cardBottom}>
                  <span className={styles.typeBadge}>
                    <span className={styles.typeIcon}>{TYPE_ICON[c.type]}</span>
                    {TYPE_LABEL[c.type]}
                  </span>
                  {c.showOnHome && (
                    <span className={styles.homeBadge}>🏠 首页显示</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? '编辑倒数日' : '新增倒数日'}
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>标题</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：高考、旅行、生日..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>目标日期</label>
            <Input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>类型</label>
            <div className={styles.typeSelect}>
              {TYPE_CONFIG.map((t) => (
                <button
                  key={t.value}
                  className={`${styles.typeOption} ${form.type === t.value ? styles.typeOptionActive : ''}`}
                  onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.toggleRow}>
              <label className={styles.label}>在首页显示</label>
              <button
                className={`${styles.toggle} ${form.showOnHome ? styles.toggleOn : ''}`}
                onClick={() => setForm((f) => ({ ...f, showOnHome: !f.showOnHome }))}
                role="switch"
                aria-checked={form.showOnHome}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={closeModal}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/tools/FinancePage.module.css`

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Summary Cards */
.summaryRow {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 640px) {
  .summaryRow {
    grid-template-columns: 1fr;
  }
}

.summaryCard {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.summaryLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.summaryValue {
  font-size: 24px;
  font-weight: 700;
}

.summaryIncome {
  color: var(--color-success);
}

.summaryExpense {
  color: var(--color-danger);
}

/* Month Selector */
.monthSelector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.monthBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 20px;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.monthBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.monthLabel {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  min-width: 100px;
  text-align: center;
}

/* Charts */
.chartsRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .chartsRow {
    grid-template-columns: 1fr;
  }
}

.chartCard {
  padding: 20px;
}

.chartTitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 12px;
}

/* Transaction List */
.listTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.transactionList {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.transactionItem {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  transition: box-shadow var(--transition-fast);
}

.transactionItem:hover {
  box-shadow: var(--shadow-sm);
}

.transactionIcon {
  flex-shrink: 0;
}

.iconIncome,
.iconExpense {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 18px;
  font-weight: 700;
}

.iconIncome {
  background: var(--color-success-light);
  color: var(--color-success);
}

.iconExpense {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.transactionInfo {
  flex: 1;
  min-width: 0;
}

.transactionTitle {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.transactionMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  flex-wrap: wrap;
}

.transactionCategory {
  font-size: 12px;
  padding: 1px 8px;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
}

.transactionDate {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.transactionNote {
  font-size: 12px;
  color: var(--color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.transactionAmount {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.amountIncome {
  color: var(--color-success);
}

.amountExpense {
  color: var(--color-danger);
}

.transactionActions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.actionBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.actionBtn:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Type Toggle */
.typeToggle {
  display: flex;
  gap: 0;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  padding: 3px;
}

.typeOption {
  flex: 1;
  padding: 6px 0;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}

.typeOption:hover {
  color: var(--color-text-primary);
}

.typeOptionActive {
  background: var(--color-surface);
  color: var(--color-text-primary);
  box-shadow: var(--shadow-sm);
}

/* Category Select */
.categorySelect {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.categoryOption {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: var(--radius-full);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.categoryOption:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.categoryOptionActive {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.categoryInput {
  margin-top: 6px;
}

/* Form Actions */
.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
```

### `src/pages/tools/FinancePage.tsx`

```tsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import Card from '@/components/ui/Card'
import { useToolStore } from '@/stores/toolStore'
import { useToast } from '@/components/ui/Toast'
import ReactEChartsCore from 'echarts-for-react'
import type { Finance, FinanceType } from '@/types'
import styles from './FinancePage.module.css'

const CATEGORIES = [
  '餐饮', '交通', '购物', '住房', '娱乐',
  '医疗', '教育', '通讯', '日用', '其他',
]

const emptyForm = {
  type: 'expense' as FinanceType,
  title: '',
  amount: 0,
  category: '',
  tags: '',
  date: '',
  note: '',
}

export default function FinancePage() {
  const { finance, loading, loadFinance, addFinance, updateFinance, deleteFinance } = useToolStore()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Month navigation
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)

  useEffect(() => {
    loadFinance()
  }, [loadFinance])

  const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

  const monthFinance = useMemo(
    () => finance.filter((f) => f.date.startsWith(monthKey)),
    [finance, monthKey],
  )

  const monthIncome = useMemo(
    () => monthFinance.filter((f) => f.type === 'income').reduce((sum, f) => sum + f.amount, 0),
    [monthFinance],
  )

  const monthExpense = useMemo(
    () => monthFinance.filter((f) => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0),
    [monthFinance],
  )

  const balance = monthIncome - monthExpense

  // Expense by category pie chart data
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    monthFinance
      .filter((f) => f.type === 'expense')
      .forEach((f) => {
        const cat = f.category || '其他'
        map[cat] = (map[cat] || 0) + f.amount
      })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [monthFinance])

  // Last 6 months income vs expense bar chart
  const last6Months = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const items = finance.filter((f) => f.date.startsWith(key))
      months.push({
        month: `${d.getMonth() + 1}月`,
        income: items.filter((f) => f.type === 'income').reduce((s, f) => s + f.amount, 0),
        expense: items.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0),
      })
    }
    return months
  }, [finance, currentYear, currentMonth])

  const pieOption = useMemo(() => ({
    tooltip: { trigger: 'item' as const },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      label: { show: true, formatter: '{b}\n{d}%' },
      emphasis: { label: { fontSize: 16, fontWeight: 'bold' } },
      data: expenseByCategory,
    }],
  }), [expenseByCategory])

  const barOption = useMemo(() => ({
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['收入', '支出'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'category' as const, data: last6Months.map((m) => m.month) },
    yAxis: { type: 'value' as const },
    series: [
      { name: '收入', type: 'bar', data: last6Months.map((m) => m.income), itemStyle: { color: '#10b981' } },
      { name: '支出', type: 'bar', data: last6Months.map((m) => m.expense), itemStyle: { color: '#ef4444' } },
    ],
  }), [last6Months])

  const goPrevMonth = useCallback(() => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1)
      setCurrentMonth(12)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }, [currentMonth])

  const goNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1)
      setCurrentMonth(1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }, [currentMonth])

  const openAdd = useCallback(() => {
    setEditingId(null)
    const now = new Date()
    setForm({
      ...emptyForm,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    })
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((f: Finance) => {
    setEditingId(f.id)
    setForm({
      type: f.type,
      title: f.title,
      amount: f.amount,
      category: f.category,
      tags: f.tags.join(', '),
      date: f.date,
      note: f.note,
    })
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingId(null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.amount || !form.date) {
      toast('请填写标题、金额和日期', 'warning')
      return
    }
    setSaving(true)
    try {
      const data = {
        type: form.type,
        title: form.title.trim(),
        amount: Number(form.amount),
        category: form.category || '其他',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        date: form.date,
        note: form.note?.trim() || '',
      }
      if (editingId) {
        await updateFinance(editingId, data)
        toast('记录已更新', 'success')
      } else {
        await addFinance(data)
        toast('记录已添加', 'success')
      }
      closeModal()
    } catch {
      toast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }, [form, editingId, addFinance, updateFinance, closeModal, toast])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定删除此记录？')) return
    await deleteFinance(id)
    toast('记录已删除', 'success')
  }, [deleteFinance, toast])

  const sortedFinance = useMemo(
    () => [...monthFinance].sort((a, b) => b.date.localeCompare(a.date)),
    [monthFinance],
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title="记账本"
        description="收支记录与财务管理"
        actions={
          <Button onClick={openAdd}>记一笔</Button>
        }
      />

      {/* Summary Cards */}
      <div className={styles.summaryRow}>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>本月收入</span>
          <span className={`${styles.summaryValue} ${styles.summaryIncome}`}>
            ¥{monthIncome.toFixed(2)}
          </span>
        </Card>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>本月支出</span>
          <span className={`${styles.summaryValue} ${styles.summaryExpense}`}>
            ¥{monthExpense.toFixed(2)}
          </span>
        </Card>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>结余</span>
          <span className={`${styles.summaryValue} ${balance >= 0 ? styles.summaryIncome : styles.summaryExpense}`}>
            ¥{balance >= 0 ? '+' : ''}{balance.toFixed(2)}
          </span>
        </Card>
      </div>

      {/* Month Selector */}
      <div className={styles.monthSelector}>
        <button className={styles.monthBtn} onClick={goPrevMonth}>
          ‹
        </button>
        <span className={styles.monthLabel}>
          {currentYear}年{currentMonth}月
        </span>
        <button className={styles.monthBtn} onClick={goNextMonth}>
          ›
        </button>
      </div>

      {/* Charts */}
      <div className={styles.chartsRow}>
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>支出分类</h3>
          {expenseByCategory.length > 0 ? (
            <ReactEChartsCore option={pieOption} style={{ height: 260 }} />
          ) : (
            <EmptyState icon="📊" title="暂无支出数据" />
          )}
        </Card>
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>近6月收支趋势</h3>
          {last6Months.some((m) => m.income > 0 || m.expense > 0) ? (
            <ReactEChartsCore option={barOption} style={{ height: 260 }} />
          ) : (
            <EmptyState icon="📈" title="暂无历史数据" />
          )}
        </Card>
      </div>

      {/* Transaction List */}
      <h3 className={styles.listTitle}>交易记录</h3>
      {loading ? (
        <EmptyState icon="⏳" title="加载中..." />
      ) : sortedFinance.length === 0 ? (
        <EmptyState
          icon="💰"
          title="本月暂无记录"
          description="点击「记一笔」开始记账"
          action={<Button onClick={openAdd}>记一笔</Button>}
        />
      ) : (
        <div className={styles.transactionList}>
          {sortedFinance.map((item) => (
            <div key={item.id} className={styles.transactionItem}>
              <div className={styles.transactionIcon}>
                {item.type === 'income' ? (
                  <span className={styles.iconIncome}>↑</span>
                ) : (
                  <span className={styles.iconExpense}>↓</span>
                )}
              </div>
              <div className={styles.transactionInfo}>
                <div className={styles.transactionTitle}>{item.title}</div>
                <div className={styles.transactionMeta}>
                  <span className={styles.transactionCategory}>{item.category || '其他'}</span>
                  <span className={styles.transactionDate}>{item.date}</span>
                  {item.note && (
                    <span className={styles.transactionNote}>{item.note}</span>
                  )}
                </div>
              </div>
              <div className={`${styles.transactionAmount} ${item.type === 'income' ? styles.amountIncome : styles.amountExpense}`}>
                {item.type === 'income' ? '+' : '-'}¥{item.amount.toFixed(2)}
              </div>
              <div className={styles.transactionActions}>
                <button
                  className={styles.actionBtn}
                  onClick={() => openEdit(item)}
                  title="编辑"
                >
                  ✏️
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => handleDelete(item.id)}
                  title="删除"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? '编辑记录' : '记一笔'}
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>类型</label>
            <div className={styles.typeToggle}>
              <button
                className={`${styles.typeOption} ${form.type === 'expense' ? styles.typeOptionActive : ''}`}
                onClick={() => setForm((f) => ({ ...f, type: 'expense' }))}
              >
                支出
              </button>
              <button
                className={`${styles.typeOption} ${form.type === 'income' ? styles.typeOptionActive : ''}`}
                onClick={() => setForm((f) => ({ ...f, type: 'income' }))}
              >
                收入
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>标题</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="例如：午餐、工资..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>金额</label>
            <Input
              type="number"
              value={form.amount ? String(form.amount) : ''}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value ? Number(e.target.value) : 0 }))}
              placeholder="0.00"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>分类</label>
            <div className={styles.categorySelect}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`${styles.categoryOption} ${form.category === cat ? styles.categoryOptionActive : ''}`}
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Input
              className={styles.categoryInput}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="或自定义分类..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>日期</label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>标签（逗号分隔）</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="例如：外卖, 零食"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>备注</label>
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="可选备注..."
            />
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={closeModal}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

### `src/pages/tools/PomodoroPage.module.css`

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
  align-items: start;
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

/* Timer Card */
.timerCard {
  padding: 32px;
}

.timerSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* Circular Timer */
.circularTimer {
  position: relative;
  width: 220px;
  height: 220px;
}

.progressCircle {
  transition: stroke-dashoffset 0.3s linear;
}

.timerCenter {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.timerDisplay {
  font-size: 42px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  line-height: 1;
}

.timerState {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* Notification */
.notification {
  background: var(--color-success-light);
  color: var(--color-success);
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Controls */
.controls {
  display: flex;
  gap: 12px;
}

/* Duration Presets */
.durationPresets {
  display: flex;
  align-items: center;
  gap: 8px;
}

.presetLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.presetBtn {
  padding: 4px 14px;
  font-size: 13px;
  border-radius: var(--radius-full);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.presetBtn:hover:not(:disabled) {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}

.presetBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.presetBtnActive {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

/* Subject */
.subjectRow {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 320px;
}

.subjectLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.subjectInput {
  flex: 1;
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.subjectInput:focus {
  border-color: var(--color-border-focus);
}

.subjectInput:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Session Count */
.sessionCount {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.sessionCount strong {
  color: var(--color-accent);
  font-size: 18px;
}

/* Log Card */
.logCard {
  padding: 20px;
  min-height: 300px;
}

.logTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 16px;
}

.logList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.logItem:hover {
  background: var(--color-surface-2);
}

.logInfo {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.logTime {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
  white-space: nowrap;
}

.logSubject {
  font-size: 13px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logDelete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  font-size: 16px;
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.logDelete:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
```

### `src/pages/tools/PomodoroPage.tsx`

```tsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Card from '@/components/ui/Card'
import { useToolStore } from '@/stores/toolStore'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/utils/helpers'
import styles from './PomodoroPage.module.css'

const PRESET_DURATIONS = [
  { label: '25分钟', value: 25 },
  { label: '15分钟', value: 15 },
  { label: '45分钟', value: 45 },
  { label: '5分钟', value: 5 },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PomodoroPage() {
  const {
    timer, pomodoroLogs, loading,
    startTimer, pauseTimer, resetTimer,
    loadPomodoroLogs, addPomodoroLog, deletePomodoroLog,
  } = useToolStore()
  const { toast } = useToast()

  const [subject, setSubject] = useState('')
  const [customDuration, setCustomDuration] = useState(25)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    loadPomodoroLogs()
  }, [loadPomodoroLogs])

  // Watch for timer completion
  useEffect(() => {
    if (timer.remain === 0 && timer.total > 0) {
      setShowNotification(true)
      toast('番茄钟完成！🎉', 'success')
      const handle = setTimeout(() => setShowNotification(false), 5000)
      return () => clearTimeout(handle)
    }
  }, [timer.remain, timer.total, toast])

  const today = formatDate(new Date())
  const todayLogs = useMemo(
    () => pomodoroLogs.filter((l) => l.date === today && l.completed),
    [pomodoroLogs, today],
  )
  const todayCount = todayLogs.length

  const progress = timer.total > 0
    ? ((timer.total - timer.remain) / timer.total) * 100
    : 0

  const circumference = 2 * Math.PI * 90 // radius = 90
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const handleStart = useCallback(() => {
    startTimer(customDuration)
  }, [startTimer, customDuration])

  const handlePause = useCallback(() => {
    pauseTimer()
  }, [pauseTimer])

  const handleReset = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  const handleComplete = useCallback(async () => {
    if (timer.remain <= 0 && timer.total > 0) {
      await addPomodoroLog({
        date: today,
        duration: timer.total / 60,
        subject: subject.trim() || undefined,
        completed: true,
      })
      setSubject('')
      toast('已记录番茄钟', 'success')
    }
  }, [timer.remain, timer.total, today, subject, addPomodoroLog, toast])

  const handleDeleteLog = useCallback(async (id: string) => {
    if (!confirm('确定删除此记录？')) return
    await deletePomodoroLog(id)
    toast('记录已删除', 'success')
  }, [deletePomodoroLog, toast])

  return (
    <div className={styles.page}>
      <PageHeader
        title="番茄钟"
        description="专注计时与番茄工作法"
      />

      <div className={styles.layout}>
        {/* Timer Section */}
        <Card className={styles.timerCard}>
          <div className={styles.timerSection}>
            <div className={styles.circularTimer}>
              <svg width="220" height="220" viewBox="0 0 220 220">
                <circle
                  cx="110"
                  cy="110"
                  r="90"
                  fill="none"
                  stroke="var(--border-color)"
                  strokeWidth="8"
                />
                <circle
                  cx="110"
                  cy="110"
                  r="90"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 110 110)"
                  className={styles.progressCircle}
                />
              </svg>
              <div className={styles.timerCenter}>
                <span className={styles.timerDisplay}>
                  {formatTime(timer.remain)}
                </span>
                <span className={styles.timerState}>
                  {timer.running ? '进行中' : '已暂停'}
                </span>
              </div>
            </div>

            {showNotification && (
              <div className={styles.notification}>
                🎉 番茄钟完成！干得漂亮！
              </div>
            )}

            <div className={styles.controls}>
              {timer.running ? (
                <Button variant="secondary" onClick={handlePause}>
                  暂停
                </Button>
              ) : (
                <Button onClick={handleStart}>
                  开始
                </Button>
              )}
              <Button variant="ghost" onClick={handleReset}>
                重置
              </Button>
            </div>

            <div className={styles.durationPresets}>
              <span className={styles.presetLabel}>时长：</span>
              {PRESET_DURATIONS.map((p) => (
                <button
                  key={p.value}
                  className={`${styles.presetBtn} ${customDuration === p.value && !timer.running ? styles.presetBtnActive : ''}`}
                  onClick={() => !timer.running && setCustomDuration(p.value)}
                  disabled={timer.running}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className={styles.subjectRow}>
              <label className={styles.subjectLabel}>主题（可选）：</label>
              <input
                className={styles.subjectInput}
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="例如：复习数学、写代码..."
                disabled={timer.running}
              />
            </div>

            <div className={styles.sessionCount}>
              今日：<strong>{todayCount}</strong> 次专注
            </div>
          </div>
        </Card>

        {/* Log Section */}
        <Card className={styles.logCard}>
          <h3 className={styles.logTitle}>今日记录</h3>
          {loading ? (
            <EmptyState icon="⏳" title="加载中..." />
          ) : todayLogs.length === 0 ? (
            <EmptyState
              icon="🍅"
              title="暂无今日记录"
              description="开始你的第一个番茄钟吧"
            />
          ) : (
            <div className={styles.logList}>
              {todayLogs.map((log) => (
                <div key={log.id} className={styles.logItem}>
                  <div className={styles.logInfo}>
                    <span className={styles.logTime}>
                      {log.duration} 分钟
                    </span>
                    {log.subject && (
                      <span className={styles.logSubject}>{log.subject}</span>
                    )}
                  </div>
                  <button
                    className={styles.logDelete}
                    onClick={() => handleDeleteLog(log.id)}
                    title="删除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
```

### `src/pages/tools/RandomPage.module.css`

```css
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 4px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.tab:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-2);
}

.tabActive {
  background: var(--color-accent);
  color: var(--color-accent-text);
}

.tabActive:hover {
  background: var(--color-accent-hover);
  color: var(--color-accent-text);
}

.tabIcon {
  font-size: 16px;
}

/* Tab Content */
.tabContent {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Card shared */
.cardTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 8px;
}

.cardDesc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 16px;
}

/* Selector */
.selectorCard,
.historyCard,
.numberCard,
.knowledgeCard,
.taskCard,
.coinCard {
  padding: 24px;
}

.optionsTextarea {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  resize: vertical;
  outline: none;
  transition: border-color var(--transition-fast);
  margin-bottom: 12px;
  box-sizing: border-box;
}

.optionsTextarea:focus {
  border-color: var(--color-border-focus);
}

.optionsTextarea::placeholder {
  color: var(--color-text-tertiary);
}

/* Result Box */
.resultBox {
  margin-top: 16px;
  padding: 14px 18px;
  background: var(--color-accent-light);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-accent);
  display: flex;
  align-items: center;
  gap: 8px;
}

.resultBoxAnimating {
  animation: pulse 0.08s ease infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.resultLabel {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.resultValue {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-accent);
}

/* History */
.historyList {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.historyItem {
  padding: 4px 12px;
  font-size: 13px;
  background: var(--color-surface-2);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
}

/* Number */
.numberInputs {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 16px;
}

.numberField {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.numberLabel {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.numberInput {
  width: 120px;
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.numberInput:focus {
  border-color: var(--color-border-focus);
}

.numberSeparator {
  font-size: 18px;
  color: var(--color-text-tertiary);
  padding-bottom: 6px;
}

.numberResultValue {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-accent);
}

/* Knowledge */
.knowledgeResult {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--color-surface-2);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.knowledgeField {
  display: flex;
  align-items: center;
  gap: 10px;
}

.knowledgeFieldLabel {
  font-size: 12px;
  color: var(--color-text-tertiary);
  width: 48px;
  flex-shrink: 0;
}

.knowledgeFieldValue {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.masteryBadge {
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
}

.masterynotStarted {
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
}

.masterylearning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.masterymastered {
  background: var(--color-success-light);
  color: var(--color-success);
}

.masteryweak {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

/* Task */
.taskResult {
  margin-top: 16px;
  padding: 16px;
  background: var(--color-surface-2);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.taskResultTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.taskResultMeta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.priorityBadge {
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
}

.priorityP0 {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

.priorityP1 {
  background: var(--color-warning-light);
  color: var(--color-warning);
}

.priorityP2 {
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
}

.taskDueDate {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* Coin */
.coinCard {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.coin {
  width: 100px;
  height: 100px;
  cursor: pointer;
  perspective: 600px;
  margin: 16px 0;
}

.coinInner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.8s ease;
  transform-style: preserve-3d;
}

.coinFlipping .coinInner {
  animation: coinFlip 0.8s ease forwards;
}

@keyframes coinFlip {
  0% { transform: rotateY(0deg); }
  25% { transform: rotateY(180deg); }
  50% { transform: rotateY(360deg); }
  75% { transform: rotateY(540deg); }
  100% { transform: rotateY(720deg); }
}

.coinFront,
.coinBack {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  backface-visibility: hidden;
  border-radius: 50%;
}

.coinBack {
  transform: rotateY(180deg);
}

.coinResultText {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.coinStats {
  display: flex;
  gap: 24px;
}

.coinStatItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.coinStatLabel {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.coinStatValue {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent);
}
```

### `src/pages/tools/RandomPage.tsx`

```tsx
import { useState, useCallback, useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { useStudyStore } from '@/stores/studyStore'
import { useTaskStore } from '@/stores/taskStore'
import type { Topic, Task } from '@/types'
import styles from './RandomPage.module.css'

type TabType = 'selector' | 'number' | 'knowledge' | 'task' | 'coin'

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'selector', label: '随机选择', icon: '🎯' },
  { key: 'number', label: '随机数字', icon: '🔢' },
  { key: 'knowledge', label: '随机知识点', icon: '📚' },
  { key: 'task', label: '随机任务', icon: '✅' },
  { key: 'coin', label: '抛硬币', icon: '🪙' },
]

const MASTERY_LABELS: Record<string, string> = {
  notStarted: '未开始',
  learning: '学习中',
  mastered: '已掌握',
  weak: '薄弱',
}

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'P0 · 紧急',
  P1: 'P1 · 重要',
  P2: 'P2 · 普通',
}

export default function RandomPage() {
  const [activeTab, setActiveTab] = useState<TabType>('selector')

  // Selector state
  const [options, setOptions] = useState('')
  const [selectorResult, setSelectorResult] = useState<string | null>(null)
  const [selectorHistory, setSelectorHistory] = useState<string[]>([])
  const [selectorAnimating, setSelectorAnimating] = useState(false)

  // Number state
  const [min, setMin] = useState(1)
  const [max, setMax] = useState(100)
  const [numberResult, setNumberResult] = useState<number | null>(null)

  // Knowledge state
  const [knowledgeResult, setKnowledgeResult] = useState<Topic | null>(null)
  const [knowledgeSubject, setKnowledgeSubject] = useState('')
  const [knowledgeChapter, setKnowledgeChapter] = useState('')

  // Task state
  const [taskResult, setTaskResult] = useState<Task | null>(null)

  // Coin state
  const [coinResult, setCoinResult] = useState<string | null>(null)
  const [coinFlipping, setCoinFlipping] = useState(false)
  const [coinStats, setCoinStats] = useState({ heads: 0, tails: 0 })

  const { subjects } = useStudyStore()
  const { tasks } = useTaskStore()

  const allTopics = useMemo(() => {
    const result: { topic: Topic; subjectName: string; chapterName: string }[] = []
    for (const sub of subjects) {
      for (const ch of sub.chapters) {
        for (const t of ch.topics) {
          result.push({ topic: t, subjectName: sub.name, chapterName: ch.name })
        }
      }
    }
    return result
  }, [subjects])

  const undoneTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks])

  const handleRandomSelect = useCallback(() => {
    const lines = options
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (lines.length === 0) return

    setSelectorAnimating(true)
    let count = 0
    const maxCycles = 15
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * lines.length)
      setSelectorResult(lines[randomIdx])
      count++
      if (count >= maxCycles) {
        clearInterval(interval)
        setSelectorAnimating(false)
        const final = lines[Math.floor(Math.random() * lines.length)]
        setSelectorResult(final)
        setSelectorHistory((prev) => [final, ...prev].slice(0, 20))
      }
    }, 80)
  }, [options])

  const handleRandomNumber = useCallback(() => {
    const mn = Math.min(min, max)
    const mx = Math.max(min, max)
    const result = Math.floor(Math.random() * (mx - mn + 1)) + mn
    setNumberResult(result)
  }, [min, max])

  const handleRandomKnowledge = useCallback(() => {
    if (allTopics.length === 0) return
    const idx = Math.floor(Math.random() * allTopics.length)
    const picked = allTopics[idx]
    setKnowledgeResult(picked.topic)
    setKnowledgeSubject(picked.subjectName)
    setKnowledgeChapter(picked.chapterName)
  }, [allTopics])

  const handleRandomTask = useCallback(() => {
    if (undoneTasks.length === 0) return
    const idx = Math.floor(Math.random() * undoneTasks.length)
    setTaskResult(undoneTasks[idx])
  }, [undoneTasks])

  const handleCoinFlip = useCallback(() => {
    setCoinFlipping(true)
    setCoinResult(null)
    setTimeout(() => {
      const isHeads = Math.random() > 0.5
      const result = isHeads ? '正面' : '反面'
      setCoinResult(result)
      setCoinFlipping(false)
      setCoinStats((prev) =>
        isHeads
          ? { ...prev, heads: prev.heads + 1 }
          : { ...prev, tails: prev.tails + 1 },
      )
    }, 800)
  }, [])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'selector':
        return (
          <div className={styles.tabContent}>
            <Card className={styles.selectorCard}>
              <h3 className={styles.cardTitle}>随机选择器</h3>
              <p className={styles.cardDesc}>每行输入一个选项，点击按钮随机抽取</p>
              <textarea
                className={styles.optionsTextarea}
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder={"选项1\n选项2\n选项3\n..."}
                rows={6}
              />
              <Button onClick={handleRandomSelect} disabled={selectorAnimating || !options.trim()}>
                {selectorAnimating ? '抽取中...' : '随机选择'}
              </Button>
              {selectorResult && (
                <div className={`${styles.resultBox} ${selectorAnimating ? styles.resultBoxAnimating : ''}`}>
                  <span className={styles.resultLabel}>结果：</span>
                  <span className={styles.resultValue}>{selectorResult}</span>
                </div>
              )}
            </Card>
            {selectorHistory.length > 0 && (
              <Card className={styles.historyCard}>
                <h3 className={styles.cardTitle}>历史记录</h3>
                <div className={styles.historyList}>
                  {selectorHistory.map((item, i) => (
                    <span key={i} className={styles.historyItem}>
                      {item}
                    </span>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )

      case 'number':
        return (
          <div className={styles.tabContent}>
            <Card className={styles.numberCard}>
              <h3 className={styles.cardTitle}>随机数字生成器</h3>
              <div className={styles.numberInputs}>
                <div className={styles.numberField}>
                  <label className={styles.numberLabel}>最小值</label>
                  <input
                    type="number"
                    className={styles.numberInput}
                    value={min}
                    onChange={(e) => setMin(Number(e.target.value))}
                  />
                </div>
                <span className={styles.numberSeparator}>—</span>
                <div className={styles.numberField}>
                  <label className={styles.numberLabel}>最大值</label>
                  <input
                    type="number"
                    className={styles.numberInput}
                    value={max}
                    onChange={(e) => setMax(Number(e.target.value))}
                  />
                </div>
              </div>
              <Button onClick={handleRandomNumber}>生成</Button>
              {numberResult !== null && (
                <div className={styles.resultBox}>
                  <span className={styles.resultLabel}>结果：</span>
                  <span className={styles.numberResultValue}>{numberResult}</span>
                </div>
              )}
            </Card>
          </div>
        )

      case 'knowledge':
        return (
          <div className={styles.tabContent}>
            <Card className={styles.knowledgeCard}>
              <h3 className={styles.cardTitle}>随机知识点</h3>
              <p className={styles.cardDesc}>
                从知识库中随机抽取一个知识点进行复习
                {allTopics.length === 0 && '（知识库为空，请先在知识库中添加知识点）'}
              </p>
              <Button onClick={handleRandomKnowledge} disabled={allTopics.length === 0}>
                随机抽取
              </Button>
              {knowledgeResult && (
                <div className={styles.knowledgeResult}>
                  <div className={styles.knowledgeField}>
                    <span className={styles.knowledgeFieldLabel}>学科</span>
                    <span className={styles.knowledgeFieldValue}>{knowledgeSubject}</span>
                  </div>
                  <div className={styles.knowledgeField}>
                    <span className={styles.knowledgeFieldLabel}>章节</span>
                    <span className={styles.knowledgeFieldValue}>{knowledgeChapter}</span>
                  </div>
                  <div className={styles.knowledgeField}>
                    <span className={styles.knowledgeFieldLabel}>知识点</span>
                    <span className={styles.knowledgeFieldValue}>{knowledgeResult.name}</span>
                  </div>
                  <div className={styles.knowledgeField}>
                    <span className={styles.knowledgeFieldLabel}>掌握度</span>
                    <span className={`${styles.masteryBadge} ${styles[`mastery${knowledgeResult.mastery}`]}`}>
                      {MASTERY_LABELS[knowledgeResult.mastery] || knowledgeResult.mastery}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )

      case 'task':
        return (
          <div className={styles.tabContent}>
            <Card className={styles.taskCard}>
              <h3 className={styles.cardTitle}>随机任务</h3>
              <p className={styles.cardDesc}>
                从未完成任务中随机抽取一个
                {undoneTasks.length === 0 && '（没有未完成的任务）'}
              </p>
              <Button onClick={handleRandomTask} disabled={undoneTasks.length === 0}>
                随机任务
              </Button>
              {taskResult && (
                <div className={styles.taskResult}>
                  <div className={styles.taskResultTitle}>{taskResult.title}</div>
                  <div className={styles.taskResultMeta}>
                    <span className={`${styles.priorityBadge} ${styles[`priority${taskResult.priority}`]}`}>
                      {PRIORITY_LABELS[taskResult.priority]}
                    </span>
                    {taskResult.dueDate && (
                      <span className={styles.taskDueDate}>{taskResult.dueDate}</span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )

      case 'coin':
        return (
          <div className={styles.tabContent}>
            <Card className={styles.coinCard}>
              <h3 className={styles.cardTitle}>抛硬币</h3>
              <div
                className={`${styles.coin} ${coinFlipping ? styles.coinFlipping : ''} ${coinResult ? styles.coinResult : ''}`}
                onClick={!coinFlipping ? handleCoinFlip : undefined}
              >
                <div className={styles.coinInner}>
                  <div className={styles.coinFront}>🪙</div>
                  <div className={styles.coinBack}>🪙</div>
                </div>
              </div>
              {coinResult && !coinFlipping && (
                <div className={styles.coinResultText}>
                  {coinResult === '正面' ? '🟢 正面' : '🔴 反面'}
                </div>
              )}
              <div className={styles.coinStats}>
                <div className={styles.coinStatItem}>
                  <span className={styles.coinStatLabel}>正面</span>
                  <span className={styles.coinStatValue}>{coinStats.heads}</span>
                </div>
                <div className={styles.coinStatItem}>
                  <span className={styles.coinStatLabel}>反面</span>
                  <span className={styles.coinStatValue}>{coinStats.tails}</span>
                </div>
              </div>
            </Card>
          </div>
        )
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="随机工具"
        description="随机选择器、抽签等小工具"
      />

      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </div>
  )
}
```

### `src/pages/tools/ToolsLayout.tsx`

```tsx
import { Outlet } from 'react-router-dom'

export default function ToolsLayout() {
  return <Outlet />
}
```

### `src/stores/flashcardStore.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Flashcard Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { uid } from '../utils/helpers'
import type { Flashcard, FlashcardReview, ReviewRating } from '../types'
import {
  isCorrectRating,
  computeNextReviewAt,
  computeMasteryDelta,
  clampMastery,
  scheduleFlashcard,
  createInitialSchedule,
} from '../domain/flashcard/flashcardScheduler'
import { eventBus } from '../domain/events/eventBus'
import type { Subject, Chapter, Topic, FlashcardSchedule } from '../types'

/**
 * 查找或创建「学科 → 章节 → 知识点」层级，返回知识点 id。
 * 用于闪卡导入时自动匹配/创建（W-15）。
 */
async function ensureKnowledgePath(
  subjectName: string,
  chapterName: string,
  knowledgeName: string,
): Promise<string | undefined> {
  if (!subjectName) return undefined
  const subjects = await db.subjects.toArray()
  let subject = subjects.find((s) => s.name === subjectName)
  if (!subject) {
    const next: Subject = { id: uid(), name: subjectName, chapters: [] }
    await db.subjects.add(next)
    subject = next
  }
  if (!chapterName) return undefined
  let chapter = subject.chapters.find((c) => c.name === chapterName)
  if (!chapter) {
    const next: Chapter = { id: uid(), name: chapterName, subjectId: subject.id, topics: [] }
    subject.chapters.push(next)
    await db.subjects.update(subject.id, { chapters: subject.chapters })
    chapter = next
  }
  if (!knowledgeName) return undefined
  let topic = chapter.topics.find((t) => t.name === knowledgeName)
  if (!topic) {
    const next: Topic = {
      id: uid(),
      name: knowledgeName,
      chapterId: chapter.id,
      mastery: 'notStarted',
      notes: '',
      relatedMistakes: [],
    }
    chapter.topics.push(next)
    await db.subjects.update(subject.id, { chapters: subject.chapters })
    topic = next
  }
  return topic.id
}

interface FlashcardState {
  flashcards: Flashcard[]
  reviews: FlashcardReview[]
  schedules: FlashcardSchedule[]
  loading: boolean

  loadAll: () => Promise<void>
  addFlashcard: (card: Partial<Flashcard> & { question: string; answer: string }) => Promise<void>
  updateFlashcard: (id: string, updates: Partial<Flashcard>) => Promise<void>
  deleteFlashcard: (id: string) => Promise<void>
  getDueCards: () => Flashcard[]
  addReview: (flashcardId: string, rating: ReviewRating) => Promise<void>
  importCSV: (csvText: string) => Promise<number>
  importJSON: (jsonText: string) => Promise<number>
  importPaste: (text: string) => Promise<number>
}

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  flashcards: [],
  reviews: [],
  schedules: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    const [flashcards, reviews, schedules] = await Promise.all([
      db.flashcards.toArray(),
      db.flashcardReviews.toArray(),
      db.flashcardSchedule.toArray(),
    ])
    set({ flashcards, reviews, schedules, loading: false })
  },

  addFlashcard: async (card) => {
    const now = new Date().toISOString()
    const newCard: Flashcard = {
      id: uid(),
      question: card.question,
      answer: card.answer,
      subject: card.subject || '',
      chapter: card.chapter || '',
      knowledgeId: card.knowledgeId,
      tags: card.tags || [],
      difficulty: card.difficulty ?? 3,
      mastery: card.mastery ?? 0,
      reviewCount: 0,
      correctCount: 0,
      wrongCount: 0,
      nextReviewAt: now,
      createdAt: now,
    }
    await db.flashcards.add(newCard)
    const schedule = createInitialSchedule(newCard.id)
    await db.flashcardSchedule.add(schedule)
    set((s) => ({
      flashcards: [...s.flashcards, newCard],
      schedules: [...s.schedules, schedule],
    }))
  },

  updateFlashcard: async (id, updates) => {
    await db.flashcards.update(id, updates)
    set((s) => ({
      flashcards: s.flashcards.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    }))
  },

  deleteFlashcard: async (id) => {
    await db.flashcards.delete(id)
    // Also delete associated reviews and schedule
    await db.flashcardReviews.where('flashcardId').equals(id).delete()
    await db.flashcardSchedule.where('flashcardId').equals(id).delete()
    set((s) => ({
      flashcards: s.flashcards.filter((c) => c.id !== id),
      reviews: s.reviews.filter((r) => r.flashcardId !== id),
      schedules: s.schedules.filter((sc) => sc.flashcardId !== id),
    }))
  },

  getDueCards: () => {
    const now = new Date().toISOString()
    return get().flashcards.filter((c) => c.nextReviewAt <= now)
  },

  addReview: async (flashcardId, rating) => {
    const card = get().flashcards.find((c) => c.id === flashcardId)
    if (!card) return

    const now = new Date()
    const nextReviewAt = computeNextReviewAt(now, rating)
    const correct = isCorrectRating(rating)

    const review: FlashcardReview = {
      id: uid(),
      flashcardId,
      rating,
      reviewedAt: now.toISOString(),
      nextReviewAt,
    }
    await db.flashcardReviews.add(review)

    const updates: Partial<Flashcard> = {
      nextReviewAt,
      reviewCount: card.reviewCount + 1,
      correctCount: card.correctCount + (correct ? 1 : 0),
      wrongCount: card.wrongCount + (correct ? 0 : 1),
      mastery: clampMastery(card.mastery + computeMasteryDelta(rating)),
    }
    await db.flashcards.update(flashcardId, updates)

    // 更新 flashcardSchedule（简化 SM-2）
    const existing = await db.flashcardSchedule
      .where('flashcardId')
      .equals(flashcardId)
      .first()
    const nextSchedule = scheduleFlashcard(
      existing ?? createInitialSchedule(flashcardId),
      rating,
    )
    if (existing) {
      await db.flashcardSchedule
        .where('flashcardId')
        .equals(flashcardId)
        .modify(nextSchedule)
    } else {
      await db.flashcardSchedule.add(nextSchedule)
    }

    set((s) => ({
      reviews: [...s.reviews, review],
      flashcards: s.flashcards.map((c) =>
        c.id === flashcardId ? { ...c, ...updates } : c,
      ),
      schedules: existing
        ? s.schedules.map((sc) =>
            sc.flashcardId === flashcardId ? { ...sc, ...nextSchedule } : sc,
          )
        : [...s.schedules, nextSchedule],
    }))

    eventBus.publish({ type: 'flashcard.reviewed', flashcardId, rating })
  },

  importCSV: async (csvText) => {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return 0

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const qIdx = headers.indexOf('question')
    const aIdx = headers.indexOf('answer')
    const sIdx = headers.indexOf('subject')
    const cIdx = headers.indexOf('chapter')
    const kIdx = headers.indexOf('knowledge')

    let count = 0
    const now = new Date().toISOString()

    const cards: Flashcard[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim())
      if (qIdx === -1 || aIdx === -1 || !cols[qIdx] || !cols[aIdx]) continue

      const subjectName = sIdx >= 0 ? cols[sIdx] || '' : ''
      const chapterName = cIdx >= 0 ? cols[cIdx] || '' : ''
      const knowledgeName = kIdx >= 0 ? cols[kIdx] || '' : ''
      // 自动匹配/创建知识点层级，返回知识点 id（W-15）
      const knowledgeId = await ensureKnowledgePath(subjectName, chapterName, knowledgeName)

      cards.push({
        id: uid(),
        question: cols[qIdx],
        answer: cols[aIdx],
        subject: subjectName,
        chapter: chapterName,
        knowledgeId,
        tags: [],
        difficulty: 3,
        mastery: 0,
        reviewCount: 0,
        correctCount: 0,
        wrongCount: 0,
        nextReviewAt: now,
        createdAt: now,
      })
      count++
    }

    if (cards.length > 0) {
      await db.flashcards.bulkAdd(cards)
      set((s) => ({ flashcards: [...s.flashcards, ...cards] }))
    }
    return count
  },

  importJSON: async (jsonText) => {
    try {
      const parsed = JSON.parse(jsonText)
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      const now = new Date().toISOString()

      const cards: Flashcard[] = arr.filter(Boolean).map((item: any) => ({
        id: uid(),
        question: item.question || item.Question || '',
        answer: item.answer || item.Answer || '',
        subject: item.subject || item.Subject || '',
        chapter: item.chapter || item.Chapter || '',
        knowledgeId: item.knowledgeId,
        tags: item.tags || [],
        difficulty: item.difficulty ?? 3,
        mastery: item.mastery ?? 0,
        reviewCount: 0,
        correctCount: 0,
        wrongCount: 0,
        nextReviewAt: now,
        createdAt: now,
      }))

      await db.flashcards.bulkAdd(cards)
      set((s) => ({ flashcards: [...s.flashcards, ...cards] }))
      return cards.length
    } catch {
      return 0
    }
  },

  importPaste: async (text) => {
    // Try to detect format: Q: ... A: ... per line, or JSON
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      return get().importJSON(text)
    }

    // Try Q/A format
    const lines = text.trim().split('\n')
    const cards: Flashcard[] = []
    const now = new Date().toISOString()
    let currentQ = ''
    let currentA = ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (/^[Qq][:：]/.test(trimmed) || /^问[:：]/.test(trimmed)) {
        if (currentQ && currentA) {
          cards.push({
            id: uid(),
            question: currentQ,
            answer: currentA,
            subject: '',
            chapter: '',
            knowledgeId: undefined,
            tags: [],
            difficulty: 3,
            mastery: 0,
            reviewCount: 0,
            correctCount: 0,
            wrongCount: 0,
            nextReviewAt: now,
            createdAt: now,
          })
        }
        currentQ = trimmed.replace(/^[Qq问][:：]\s*/, '')
        currentA = ''
      } else if (/^[Aa][:：]/.test(trimmed) || /^答[:：]/.test(trimmed)) {
        currentA = trimmed.replace(/^[Aa答][:：]\s*/, '')
      } else if (trimmed) {
        currentA += (currentA ? '\n' : '') + trimmed
      }
    }

    if (currentQ && currentA) {
      cards.push({
        id: uid(),
        question: currentQ,
        answer: currentA,
        subject: '',
        chapter: '',
        knowledgeId: undefined,
        tags: [],
        difficulty: 3,
        mastery: 0,
        reviewCount: 0,
        correctCount: 0,
        wrongCount: 0,
        nextReviewAt: now,
        createdAt: now,
      })
    }

    if (cards.length > 0) {
      await db.flashcards.bulkAdd(cards)
      set((s) => ({ flashcards: [...s.flashcards, ...cards] }))
    }
    return cards.length
  },
}))
```

### `src/stores/projectStore.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Project Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
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
    await db.projects.add(project)
    set((s) => ({ projects: [...s.projects, project] }))
  },

  updateProject: async (id, updates) => {
    await db.projects.update(id, updates)
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    }))
  },

  deleteProject: async (id) => {
    await db.projects.delete(id)
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
  },

  changeStage: async (id, stage) => {
    await db.projects.update(id, { stage })
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, stage } : p,
      ),
    }))
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
    if (updated) {
      await db.projects.update(projectId, {
        milestones: updated.milestones,
        progress: updated.progress,
      })
    }
    set({ projects })
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
    if (updated) {
      await db.projects.update(projectId, {
        milestones: updated.milestones,
        progress: updated.progress,
      })
    }
    set({ projects })
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
    if (updated) {
      await db.projects.update(projectId, {
        milestones: updated.milestones,
        progress: updated.progress,
      })
    }
    set({ projects })
  },
}))
```

### `src/stores/recordStore.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Record Store (Memos & Notes)
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { uid } from '../utils/helpers'
import type { Memo, Note, MemoConversion } from '../types'

interface RecordState {
  memos: Memo[]
  notes: Note[]
  loading: boolean

  // Memos
  loadMemos: () => Promise<void>
  addMemo: (content: string) => Promise<void>
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

  addMemo: async (content) => {
    const memo: Memo = {
      id: uid(),
      content,
      createdAt: new Date().toISOString(),
    }
    await db.memos.add(memo)
    set((s) => ({ memos: [memo, ...s.memos] }))
  },

  updateMemo: async (id, updates) => {
    await db.memos.update(id, updates)
    set((s) => ({
      memos: s.memos.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }))
  },

  deleteMemo: async (id) => {
    await db.memos.delete(id)
    set((s) => ({ memos: s.memos.filter((m) => m.id !== id) }))
  },

  convertMemoToTask: async (memoId) => {
    const memo = get().memos.find((m) => m.id === memoId)
    if (!memo) return
    const conversion: MemoConversion = { type: 'task', id: uid() }
    await db.memos.update(memoId, { convertedTo: conversion })
    set((s) => ({
      memos: s.memos.map((m) =>
        m.id === memoId ? { ...m, convertedTo: conversion } : m,
      ),
    }))
  },

  convertMemoToMistake: async (memoId) => {
    const memo = get().memos.find((m) => m.id === memoId)
    if (!memo) return
    const conversion: MemoConversion = { type: 'mistake', id: uid() }
    await db.memos.update(memoId, { convertedTo: conversion })
    set((s) => ({
      memos: s.memos.map((m) =>
        m.id === memoId ? { ...m, convertedTo: conversion } : m,
      ),
    }))
  },

  convertMemoToNote: async (memoId) => {
    const memo = get().memos.find((m) => m.id === memoId)
    if (!memo) return
    const conversion: MemoConversion = { type: 'note', id: uid() }
    await db.memos.update(memoId, { convertedTo: conversion })
    set((s) => ({
      memos: s.memos.map((m) =>
        m.id === memoId ? { ...m, convertedTo: conversion } : m,
      ),
    }))
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
    await db.notes.add(newNote)
    set((s) => ({ notes: [...s.notes, newNote] }))
  },

  updateNote: async (id, updates) => {
    const updatedAt = new Date().toISOString()
    await db.notes.update(id, { ...updates, updatedAt })
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt } : n,
      ),
    }))
  },

  deleteNote: async (id) => {
    await db.notes.delete(id)
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
  },
}))
```

### `src/stores/recurringStore.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Recurring Task Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { uid, formatDate } from '../utils/helpers'
import { shouldGenerateForDate } from '../domain/planning/recurringGenerator'
import type { RecurringTask, Task } from '../types'
import { eventBus } from '../domain/events/eventBus'

interface RecurringState {
  recurringTasks: RecurringTask[]
  loading: boolean

  loadRecurring: () => Promise<void>
  addRecurring: (task: Partial<RecurringTask> & { title: string; rule: RecurringTask['rule'] }) => Promise<void>
  updateRecurring: (id: string, updates: Partial<RecurringTask>) => Promise<void>
  deleteRecurring: (id: string) => Promise<void>
  toggleEnabled: (id: string) => Promise<void>
  generateTodayTasks: () => Promise<Task[]>
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  recurringTasks: [],
  loading: false,

  loadRecurring: async () => {
    set({ loading: true })
    const recurringTasks = await db.recurringTasks.toArray()
    set({ recurringTasks, loading: false })
  },

  addRecurring: async (task) => {
    const newRecurring: RecurringTask = {
      id: uid(),
      title: task.title,
      rule: task.rule,
      time: task.time || '',
      priority: task.priority || 'P2',
      category: task.category || '',
      startDate: task.startDate || formatDate(new Date()),
      endDate: task.endDate || '',
      enabled: task.enabled ?? true,
      lastGeneratedDate: task.lastGeneratedDate,
    }
    await db.recurringTasks.add(newRecurring)
    set((s) => ({ recurringTasks: [...s.recurringTasks, newRecurring] }))
  },

  updateRecurring: async (id, updates) => {
    await db.recurringTasks.update(id, updates)
    set((s) => ({
      recurringTasks: s.recurringTasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    }))
  },

  deleteRecurring: async (id) => {
    await db.recurringTasks.delete(id)
    set((s) => ({ recurringTasks: s.recurringTasks.filter((t) => t.id !== id) }))
  },

  toggleEnabled: async (id) => {
    const task = get().recurringTasks.find((t) => t.id === id)
    if (!task) return
    const enabled = !task.enabled
    await db.recurringTasks.update(id, { enabled })
    set((s) => ({
      recurringTasks: s.recurringTasks.map((t) =>
        t.id === id ? { ...t, enabled } : t,
      ),
    }))
  },

  generateTodayTasks: async () => {
    const today = formatDate(new Date())
    const now = new Date()
    const generatedTasks: Task[] = []
    const byRule: Record<string, string[]> = {}

    for (const rt of get().recurringTasks) {
      if (!shouldGenerateForDate(rt, now)) continue

      const task: Task = {
        id: uid(),
        title: rt.title,
        priority: rt.priority,
        done: false,
        note: '',
        projectId: '',
        dueDate: today,
        pinned: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        sourceRecurringId: rt.id,
      }
      await db.tasks.add(task)
      generatedTasks.push(task)
      byRule[rt.id] = byRule[rt.id] || []
      byRule[rt.id].push(task.id)

      await db.recurringTasks.update(rt.id, { lastGeneratedDate: today })
    }

    // Refresh state
    if (generatedTasks.length > 0) {
      await get().loadRecurring()
      for (const [ruleId, taskIds] of Object.entries(byRule)) {
        eventBus.publish({ type: 'recurring.generated', ruleId, taskIds })
      }
    }

    return generatedTasks
  },
}))
```

### `src/stores/reviewStore.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Review Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { uid, formatDate } from '../utils/helpers'
import type {
  ReviewEntry,
  ReviewTemplate,
  ReviewType,
  DailyMetrics,
  SubjectMetrics,
  WeeklyMetrics,
  MonthlyMetrics,
  ExamMetrics,
} from '../types'
import { eventBus } from '../domain/events/eventBus'
import { getDailyMetrics, getWeeklyMetrics } from '../domain/review/reviewAggregator'

type ReviewSummary = DailyMetrics | SubjectMetrics | WeeklyMetrics | MonthlyMetrics | ExamMetrics

interface ReviewState {
  reviews: ReviewEntry[]
  templates: ReviewTemplate[]
  loading: boolean

  loadAll: () => Promise<void>

  // Reviews
  addReview: (review: Partial<ReviewEntry> & { type: ReviewType; dateRange: { start: string; end: string } }) => Promise<void>
  updateReview: (id: string, updates: Partial<ReviewEntry>) => Promise<void>
  deleteReview: (id: string) => Promise<void>

  // Templates
  addTemplate: (template: Partial<ReviewTemplate> & { name: string; type: string; questions: string[] }) => Promise<void>
  updateTemplate: (id: string, updates: Partial<ReviewTemplate>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>

  // Auto summary
  getAutoSummary: (type: ReviewType, dateRange: { start: string; end: string }) => Promise<ReviewSummary>
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  templates: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    const [reviews, templates] = await Promise.all([
      db.reviewEntries.toArray(),
      db.reviewTemplates.toArray(),
    ])
    set({ reviews, templates, loading: false })
  },

  // ---- Reviews ----

  addReview: async (review) => {
    const newReview: ReviewEntry = {
      id: uid(),
      templateId: review.templateId || '',
      type: review.type,
      dateRange: review.dateRange,
      subjectId: review.subjectId,
      examId: review.examId,
      autoSummary: review.autoSummary,
      answers: review.answers || {},
      reflections: review.reflections || [],
      nextActions: review.nextActions || [],
      createdAt: new Date().toISOString(),
    }
    await db.reviewEntries.add(newReview)
    set((s) => ({ reviews: [...s.reviews, newReview] }))
    eventBus.publish({ type: 'review.completed', reviewId: newReview.id, reviewType: newReview.type })
  },

  updateReview: async (id, updates) => {
    await db.reviewEntries.update(id, updates)
    set((s) => ({
      reviews: s.reviews.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }))
  },

  deleteReview: async (id) => {
    await db.reviewEntries.delete(id)
    set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) }))
  },

  // ---- Templates ----

  addTemplate: async (template) => {
    const newTemplate: ReviewTemplate = {
      id: uid(),
      name: template.name,
      type: template.type,
      questions: template.questions,
    }
    await db.reviewTemplates.add(newTemplate)
    set((s) => ({ templates: [...s.templates, newTemplate] }))
  },

  updateTemplate: async (id, updates) => {
    await db.reviewTemplates.update(id, updates)
    set((s) => ({
      templates: s.templates.map((t) =>
        t.id === id ? { ...t, ...updates } : t,
      ),
    }))
  },

  deleteTemplate: async (id) => {
    await db.reviewTemplates.delete(id)
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
  },

  // ---- Auto Summary ----

  getAutoSummary: async (type, dateRange): Promise<ReviewSummary> => {
    const [tasks, pomodoros, mistakes, flashcardReviews] = await Promise.all([
      db.tasks.toArray(),
      db.pomodoroLogs.toArray(),
      db.mistakes.toArray(),
      db.flashcardReviews.toArray(),
    ])

    // 枚举 dateRange 内每一天（上限 366 天防死循环）
    const dates: string[] = []
    {
      let cursor = new Date(dateRange.start + 'T00:00:00')
      const end = new Date(dateRange.end + 'T00:00:00')
      let guard = 0
      while (cursor <= end && guard < 366) {
        dates.push(formatDate(cursor))
        cursor = new Date(cursor.getTime() + 86_400_000)
        guard++
      }
    }
    if (dates.length === 0) dates.push(dateRange.start)

    const dailyAll = dates.map((date) =>
      getDailyMetrics({ date, tasks, pomodoros, mistakes, flashcardReviews }),
    )
    const daily = dailyAll[0]!

    switch (type) {
      case 'daily':
        return daily
      case 'weekly':
        return getWeeklyMetrics(dateRange.start, dateRange.end, dailyAll)
      case 'monthly': {
        const heatmapData: Record<string, number> = {}
        for (const d of dailyAll) heatmapData[d.date] = d.studyDuration
        return {
          month: dateRange.start.slice(0, 7),
          daily: dailyAll,
          bySubject: [],
          heatmapData,
          totalStudyDuration: dailyAll.reduce((sum, d) => sum + d.studyDuration, 0),
        }
      }
      case 'subject': {
        const totalTasks = dailyAll.reduce((s, d) => s + d.tasksTotal, 0)
        const completed = dailyAll.reduce((s, d) => s + d.tasksCompleted, 0)
        const metrics: SubjectMetrics = {
          subjectId: '',
          subjectName: '',
          studyDuration: dailyAll.reduce((s, d) => s + d.studyDuration, 0),
          taskCompletionRate:
            totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0,
          newMistakes: dailyAll.reduce((s, d) => s + d.mistakesCreated, 0),
          flashcardReviews: dailyAll.reduce((s, d) => s + d.flashcardsReviewed, 0),
          weakKnowledgePoints: [],
        }
        return metrics
      }
      case 'exam': {
        const metrics: ExamMetrics = {
          score: 0,
          scoreChange: 0,
          subjectScores: [],
          mistakeTypeDist: {},
          knowledgeDist: {},
        }
        return metrics
      }
    }
  },
}))

```

### `src/stores/studyStore.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Study Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { uid } from '../utils/helpers'
import type { Subject, Mistake, Exam, Reading, Chapter, Topic } from '../types'
import { eventBus } from '../domain/events/eventBus'

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
    await db.subjects.add(subject)
    set((s) => ({ subjects: [...s.subjects, subject] }))
  },

  updateSubject: async (id, updates) => {
    await db.subjects.update(id, updates)
    set((s) => ({
      subjects: s.subjects.map((sub) =>
        sub.id === id ? { ...sub, ...updates } : sub,
      ),
    }))
  },

  deleteSubject: async (id) => {
    await db.subjects.delete(id)
    set((s) => ({ subjects: s.subjects.filter((sub) => sub.id !== id) }))
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
    if (updated) {
      await db.subjects.update(subjectId, { chapters: updated.chapters })
    }
    set({ subjects })
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
    if (updated) {
      await db.subjects.update(subjectId, { chapters: updated.chapters })
    }
    set({ subjects })
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
    if (updated) {
      await db.subjects.update(subjectId, { chapters: updated.chapters })
    }
    set({ subjects })
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
    await db.mistakes.add(newMistake)
    set((s) => ({ mistakes: [...s.mistakes, newMistake] }))
    eventBus.publish({ type: 'mistake.created', mistakeId: newMistake.id, subject: newMistake.subject })
  },

  updateMistake: async (id, updates) => {
    await db.mistakes.update(id, updates)
    set((s) => ({
      mistakes: s.mistakes.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    }))
  },

  deleteMistake: async (id) => {
    await db.mistakes.delete(id)
    set((s) => ({ mistakes: s.mistakes.filter((m) => m.id !== id) }))
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
    if (updated) {
      await db.subjects.update(subjectId, { chapters: updated.chapters })
    }
    set({ subjects })
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
    if (updated) {
      await db.subjects.update(subjectId, { chapters: updated.chapters })
    }
    set({ subjects })
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
    if (updated) {
      await db.subjects.update(subjectId, { chapters: updated.chapters })
    }
    set({ subjects })
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
      total: exam.total ?? 0,
      rank: exam.rank ?? 0,
      note: exam.note || '',
    }
    await db.exams.add(newExam)
    set((s) => ({ exams: [...s.exams, newExam] }))
    eventBus.publish({ type: 'exam.created', examId: newExam.id })
  },

  updateExam: async (id, updates) => {
    await db.exams.update(id, updates)
    set((s) => ({
      exams: s.exams.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }))
  },

  deleteExam: async (id) => {
    await db.exams.delete(id)
    set((s) => ({ exams: s.exams.filter((e) => e.id !== id) }))
  },

  getExamTrend: () => {
    return get()
      .exams.sort((a, b) => a.date.localeCompare(b.date))
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
    const newReading: Reading = {
      id: uid(),
      title: reading.title,
      current: reading.current ?? 0,
      target: reading.target ?? 0,
      unit: reading.unit || '页',
      note: reading.note || '',
      pinned: reading.pinned ?? false,
      createdAt: new Date().toISOString(),
    }
    await db.reading.add(newReading)
    set((s) => ({ reading: [...s.reading, newReading] }))
  },

  updateReading: async (id, updates) => {
    await db.reading.update(id, updates)
    set((s) => ({
      reading: s.reading.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    }))
  },

  deleteReading: async (id) => {
    await db.reading.delete(id)
    set((s) => ({ reading: s.reading.filter((r) => r.id !== id) }))
  },
}))
```

### `src/stores/systemStore.ts`

```typescript
import { create } from 'zustand'
import type { Theme } from '@/types'

export interface ShortcutBinding {
  id: string
  label: string
  keys: string // e.g. "Ctrl+K"
  defaultKeys: string
}

interface SystemState {
  theme: Theme
  sidebarCollapsed: boolean
  searchOpen: boolean
  searchQuery: string
  shortcuts: ShortcutBinding[]

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  openSearch: () => void
  closeSearch: () => void
  setSearchQuery: (query: string) => void
  setShortcuts: (shortcuts: ShortcutBinding[]) => void
  resetShortcuts: () => void
}

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { id: 'search', label: '全局搜索', keys: 'Ctrl+K', defaultKeys: 'Ctrl+K' },
  { id: 'newTask', label: '新增任务', keys: 'Ctrl+Shift+T', defaultKeys: 'Ctrl+Shift+T' },
  { id: 'dailyReview', label: '每日复盘', keys: 'Ctrl+Shift+R', defaultKeys: 'Ctrl+Shift+R' },
  { id: 'flashcards', label: '闪卡复习', keys: 'Ctrl+Shift+F', defaultKeys: 'Ctrl+Shift+F' },
  { id: 'pomodoro', label: '番茄钟', keys: 'Space', defaultKeys: 'Space' },
]

function loadShortcuts(): ShortcutBinding[] {
  try {
    const raw = localStorage.getItem('wb-shortcuts')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return [...DEFAULT_SHORTCUTS]
}

function saveShortcuts(shortcuts: ShortcutBinding[]) {
  localStorage.setItem('wb-shortcuts', JSON.stringify(shortcuts))
}

/** 旧值兼容：dark → night，light → mist */
function normalizeTheme(value: string | null): Theme {
  if (value === 'dark') return 'night'
  if (value === 'light') return 'mist'
  if (value === 'mist' || value === 'fluent' || value === 'night') return value
  return 'mist'
}

function applyThemeToDom(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

const initialTheme = normalizeTheme(
  typeof localStorage !== 'undefined' ? localStorage.getItem('wb-theme') : null,
)

// 在 React 挂载前应用主题到 document 根节点
applyThemeToDom(initialTheme)

export const useSystemStore = create<SystemState>((set) => ({
  theme: initialTheme,
  sidebarCollapsed: false,
  searchOpen: false,
  searchQuery: '',
  shortcuts: loadShortcuts(),

  setTheme: (theme) => {
    localStorage.setItem('wb-theme', theme)
    applyThemeToDom(theme)
    set({ theme })
  },

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  openSearch: () => set({ searchOpen: true, searchQuery: '' }),

  closeSearch: () => set({ searchOpen: false, searchQuery: '' }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setShortcuts: (shortcuts) => {
    saveShortcuts(shortcuts)
    set({ shortcuts })
  },

  resetShortcuts: () => {
    saveShortcuts([...DEFAULT_SHORTCUTS])
    set({ shortcuts: [...DEFAULT_SHORTCUTS] })
  },
}))

```

### `src/stores/taskStore.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Task Store
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { uid, formatDate } from '../utils/helpers'
import { eventBus } from '../domain/events/eventBus'
import type { Task, TaskPriority } from '../types'

interface TaskState {
  tasks: Task[]
  loading: boolean

  loadTasks: () => Promise<void>
  addTask: (task: Partial<Task> & { title: string }) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>
  getTodayTasks: () => Task[]
  getInboxTasks: () => Task[]
  getFutureTasks: () => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  loadTasks: async () => {
    set({ loading: true })
    try {
      const tasks = await db.tasks.toArray()
      set({ tasks, loading: false })
    } catch (err) {
      console.error('[TaskStore] Failed to load tasks:', err)
      set({ loading: false })
    }
  },

  addTask: async (task) => {
    const now = new Date().toISOString()
    const newTask: Task = {
      id: uid(),
      title: task.title,
      priority: task.priority || 'P2',
      done: false,
      note: task.note || '',
      projectId: task.projectId || '',
      dueDate: task.dueDate || '',
      pinned: task.pinned ?? false,
      createdAt: now,
      updatedAt: now,
      sourceRecurringId: task.sourceRecurringId,
    }
    await db.tasks.add(newTask)
    set((s) => ({ tasks: [...s.tasks, newTask] }))
    eventBus.publish({ type: 'task.created', taskId: newTask.id })
  },

  updateTask: async (id, updates) => {
    await db.tasks.update(id, { ...updates, updatedAt: new Date().toISOString() })
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
      ),
    }))
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id)
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },

  toggleDone: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const done = !task.done
    await db.tasks.update(id, { done, updatedAt: new Date().toISOString() })
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, done, updatedAt: new Date().toISOString() } : t,
      ),
    }))
    if (done) {
      eventBus.publish({
        type: 'task.completed',
        taskId: id,
        completedAt: new Date().toISOString(),
      })
    }
  },

  togglePin: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const pinned = !task.pinned
    await db.tasks.update(id, { pinned, updatedAt: new Date().toISOString() })
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, pinned, updatedAt: new Date().toISOString() } : t,
      ),
    }))
  },

  getTodayTasks: () => {
    const today = formatDate(new Date())
    return get().tasks.filter((t) => t.dueDate === today && !t.done)
  },

  getInboxTasks: () => {
    return get().tasks.filter((t) => !t.dueDate && !t.projectId && !t.done)
  },

  getFutureTasks: () => {
    const today = formatDate(new Date())
    return get().tasks.filter((t) => !t.done && t.dueDate && t.dueDate > today)
  },
}))
```

### `src/stores/toolStore.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Tool Store (Pomodoro, Finance, Countdowns)
// ============================================================

import { create } from 'zustand'
import { db } from '../db/database'
import { uid, formatDate } from '../utils/helpers'
import type { PomodoroLog, Finance, Countdown, FinanceType, CountdownType } from '../types'
import { eventBus } from '../domain/events/eventBus'

interface PomodoroTimerState {
  running: boolean
  remain: number // seconds
  total: number // seconds
}

interface ToolState {
  pomodoroLogs: PomodoroLog[]
  finance: Finance[]
  countdowns: Countdown[]
  loading: boolean

  // Pomodoro timer state
  timer: PomodoroTimerState
  startTimer: (duration?: number) => void
  pauseTimer: () => void
  resetTimer: () => void

  // Pomodoro logs
  loadPomodoroLogs: () => Promise<void>
  addPomodoroLog: (log: Partial<PomodoroLog> & { duration: number; date: string }) => Promise<void>
  updatePomodoroLog: (id: string, updates: Partial<PomodoroLog>) => Promise<void>
  deletePomodoroLog: (id: string) => Promise<void>

  // Finance
  loadFinance: () => Promise<void>
  addFinance: (item: Partial<Finance> & { type: FinanceType; title: string; amount: number; date: string }) => Promise<void>
  updateFinance: (id: string, updates: Partial<Finance>) => Promise<void>
  deleteFinance: (id: string) => Promise<void>

  // Countdowns
  loadCountdowns: () => Promise<void>
  addCountdown: (item: Partial<Countdown> & { title: string; targetDate: string; type: CountdownType }) => Promise<void>
  updateCountdown: (id: string, updates: Partial<Countdown>) => Promise<void>
  deleteCountdown: (id: string) => Promise<void>
}

let timerInterval: ReturnType<typeof setInterval> | null = null

export const useToolStore = create<ToolState>((set, get) => ({
  pomodoroLogs: [],
  finance: [],
  countdowns: [],
  loading: false,

  timer: {
    running: false,
    remain: 25 * 60,
    total: 25 * 60,
  },

  // ---- Pomodoro Timer ----

  startTimer: (duration = 25) => {
    // Clear existing timer
    if (timerInterval) clearInterval(timerInterval)

    const totalSeconds = duration * 60
    set({
      timer: { running: true, remain: totalSeconds, total: totalSeconds },
    })

    timerInterval = setInterval(() => {
      const { timer } = get()
      if (timer.remain <= 1) {
        // Timer complete
        if (timerInterval) clearInterval(timerInterval)
        timerInterval = null
        set({ timer: { running: false, remain: 0, total: timer.total } })

        // Auto-save pomodoro log
        const log: PomodoroLog = {
          id: uid(),
          date: formatDate(new Date()),
          duration: timer.total / 60,
          completed: true,
        }
        db.pomodoroLogs.add(log)
        set((s) => ({ pomodoroLogs: [...s.pomodoroLogs, log] }))
        eventBus.publish({ type: 'pomodoro.completed', duration: log.duration })
      } else {
        set({ timer: { ...timer, remain: timer.remain - 1 } })
      }
    }, 1000)
  },

  pauseTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    set((s) => ({ timer: { ...s.timer, running: false } }))
  },

  resetTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    const total = 25 * 60
    set({ timer: { running: false, remain: total, total } })
  },

  // ---- Pomodoro Logs ----

  loadPomodoroLogs: async () => {
    set({ loading: true })
    const pomodoroLogs = await db.pomodoroLogs.toArray()
    set({ pomodoroLogs, loading: false })
  },

  addPomodoroLog: async (log) => {
    const newLog: PomodoroLog = {
      id: uid(),
      date: log.date,
      duration: log.duration,
      subject: log.subject,
      completed: log.completed ?? true,
    }
    await db.pomodoroLogs.add(newLog)
    set((s) => ({ pomodoroLogs: [...s.pomodoroLogs, newLog] }))
  },

  updatePomodoroLog: async (id, updates) => {
    await db.pomodoroLogs.update(id, updates)
    set((s) => ({
      pomodoroLogs: s.pomodoroLogs.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    }))
  },

  deletePomodoroLog: async (id) => {
    await db.pomodoroLogs.delete(id)
    set((s) => ({ pomodoroLogs: s.pomodoroLogs.filter((p) => p.id !== id) }))
  },

  // ---- Finance ----

  loadFinance: async () => {
    set({ loading: true })
    const finance = await db.finance.toArray()
    set({ finance, loading: false })
  },

  addFinance: async (item) => {
    const newFinance: Finance = {
      id: uid(),
      type: item.type,
      title: item.title,
      amount: item.amount,
      category: item.category || '',
      tags: item.tags || [],
      date: item.date,
      note: item.note || '',
    }
    await db.finance.add(newFinance)
    set((s) => ({ finance: [...s.finance, newFinance] }))
  },

  updateFinance: async (id, updates) => {
    await db.finance.update(id, updates)
    set((s) => ({
      finance: s.finance.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      ),
    }))
  },

  deleteFinance: async (id) => {
    await db.finance.delete(id)
    set((s) => ({ finance: s.finance.filter((f) => f.id !== id) }))
  },

  // ---- Countdowns ----

  loadCountdowns: async () => {
    set({ loading: true })
    const countdowns = await db.countdowns.toArray()
    set({ countdowns, loading: false })
  },

  addCountdown: async (item) => {
    const newCountdown: Countdown = {
      id: uid(),
      title: item.title,
      targetDate: item.targetDate,
      type: item.type,
      showOnHome: item.showOnHome ?? true,
    }
    await db.countdowns.add(newCountdown)
    set((s) => ({ countdowns: [...s.countdowns, newCountdown] }))
  },

  updateCountdown: async (id, updates) => {
    await db.countdowns.update(id, updates)
    set((s) => ({
      countdowns: s.countdowns.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    }))
  },

  deleteCountdown: async (id) => {
    await db.countdowns.delete(id)
    set((s) => ({ countdowns: s.countdowns.filter((c) => c.id !== id) }))
  },
}))
```

### `src/styles/animations.css`

```css
/* ============================================================
   Personal Workbench V8 — Reusable CSS Animations
   ============================================================ */

/* ---- Fade ---- */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* ---- Slide ---- */
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInDown {
  from { opacity: 0; transform: translateY(-16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideOutUp {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-16px); }
}

@keyframes slideOutDown {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(16px); }
}

@keyframes slideOutRight {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(80px); }
}

/* ---- Scale ---- */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes scaleOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.92); }
}

/* ---- Pulse ---- */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); }
}

/* ---- Shimmer ---- */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* ---- Flip ---- */
@keyframes flipIn {
  from { opacity: 0; transform: perspective(800px) rotateY(90deg) scale(0.92); }
  to { opacity: 1; transform: perspective(800px) rotateY(0deg) scale(1); }
}

/* ---- Background effects ---- */
@keyframes slowGlow {
  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.15); }
}

@keyframes noiseShift {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-1%, 0.5%); }
  50% { transform: translate(0.5%, -1%); }
  75% { transform: translate(-0.5%, 1%); }
  100% { transform: translate(0, 0); }
}

@keyframes shineSweep {
  0% { left: -100%; }
  100% { left: 200%; }
}

/* ---- Card entrance ---- */
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(24px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes cardSlideOut {
  from { opacity: 1; transform: translateX(0) scale(1); }
  to { opacity: 0; transform: translateX(-60px) scale(0.95); }
}

/* ---- Rating feedback ---- */
@keyframes ratingPulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
  50% { transform: scale(1.08); box-shadow: 0 0 0 16px rgba(99, 102, 241, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}

/* ---- Celebration ---- */
@keyframes celebratePop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* ---- Staggered list entrance ---- */
@keyframes listItemEnter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- Page transition ---- */
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- Transition utility classes ---- */

.anim-fade-in {
  animation: fadeIn 0.3s ease both;
}

.anim-fade-in-fast {
  animation: fadeIn 0.15s ease both;
}

.anim-fade-out {
  animation: fadeOut 0.3s ease both;
}

.anim-slide-in-up {
  animation: slideInUp 0.35s ease both;
}

.anim-slide-in-down {
  animation: slideInDown 0.3s ease both;
}

.anim-slide-in-left {
  animation: slideInLeft 0.3s ease both;
}

.anim-slide-in-right {
  animation: slideInRight 0.3s ease both;
}

.anim-scale-in {
  animation: scaleIn 0.25s ease both;
}

.anim-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

.anim-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
}

.anim-page-enter {
  animation: pageFadeIn 0.3s ease both;
}

/* Staggered list animations */
.anim-list-stagger > * {
  opacity: 0;
  animation: listItemEnter 0.4s ease forwards;
}

.anim-list-stagger > *:nth-child(1) { animation-delay: 0.05s; }
.anim-list-stagger > *:nth-child(2) { animation-delay: 0.1s; }
.anim-list-stagger > *:nth-child(3) { animation-delay: 0.15s; }
.anim-list-stagger > *:nth-child(4) { animation-delay: 0.2s; }
.anim-list-stagger > *:nth-child(5) { animation-delay: 0.25s; }
.anim-list-stagger > *:nth-child(6) { animation-delay: 0.3s; }
.anim-list-stagger > *:nth-child(7) { animation-delay: 0.35s; }
.anim-list-stagger > *:nth-child(8) { animation-delay: 0.4s; }
.anim-list-stagger > *:nth-child(9) { animation-delay: 0.45s; }
.anim-list-stagger > *:nth-child(10) { animation-delay: 0.5s; }
.anim-list-stagger > *:nth-child(11) { animation-delay: 0.55s; }
.anim-list-stagger > *:nth-child(12) { animation-delay: 0.6s; }
.anim-list-stagger > *:nth-child(13) { animation-delay: 0.65s; }
.anim-list-stagger > *:nth-child(14) { animation-delay: 0.7s; }
.anim-list-stagger > *:nth-child(15) { animation-delay: 0.75s; }
.anim-list-stagger > *:nth-child(16) { animation-delay: 0.8s; }
.anim-list-stagger > *:nth-child(17) { animation-delay: 0.85s; }
.anim-list-stagger > *:nth-child(18) { animation-delay: 0.9s; }
.anim-list-stagger > *:nth-child(19) { animation-delay: 0.95s; }
.anim-list-stagger > *:nth-child(20) { animation-delay: 1s; }

/* Convenience: auto-enter on mount */
.anim-once-fade-in {
  animation: fadeIn 0.4s ease both;
}

.anim-once-slide-up {
  animation: slideInUp 0.4s ease both;
}
```

### `src/styles/global.css`

```css
/* ============================================================
   Personal Workbench V8 — Global Styles
   ============================================================ */

@import './theme.css';

/* ---- Box-sizing reset ---- */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* ---- Scrollbar ---- */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}

/* ---- Button reset ---- */
button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

button:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

/* ---- Input reset ---- */
input,
textarea,
select {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  padding: 8px 12px;
  transition: border-color var(--transition-fast);
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

/* ---- Link reset ---- */
a {
  color: var(--color-accent);
  text-decoration: none;
}

a:hover {
  color: var(--color-accent-hover);
}

/* ---- Utility classes ---- */

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ---- Responsive Utilities ---- */

.hide-mobile {
  display: initial;
}

.show-mobile {
  display: none;
}

@media (max-width: 768px) {
  .hide-mobile {
    display: none !important;
  }

  .show-mobile {
    display: initial;
  }
}

/* ---- Minimum Touch Targets (44px) ---- */

@media (max-width: 768px) {
  button,
  a,
  select,
  input[type='checkbox'],
  input[type='radio'],
  .clickable {
    min-height: 44px;
  }

  button:has(svg),
  a:has(svg) {
    min-width: 44px;
  }

  select,
  input,
  textarea {
    font-size: 16px; /* Prevent iOS zoom on focus */
  }
}

/* ---- Mobile Font Sizes ---- */

@media (max-width: 768px) {
  body {
    font-size: 15px;
    line-height: 1.5;
  }

  h1 {
    font-size: 22px;
  }

  h2 {
    font-size: 18px;
  }
}

/* ---- Responsive Scrollable Containers ---- */

.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 768px) {
  .scrollable {
    max-height: calc(100vh - 120px);
  }
}
```

### `src/styles/theme.css`

```css
/* ============================================================
   Personal Workbench V8 — Design Foundation v2.0
   依据：V8_DESIGN_MASTER_IMPLEMENTATION_SPEC_v1.0.md

   核心：四套主题不是「同一 UI 换四套颜色」，而是同一套 Personal OS
   在四种不同视觉空间中的表达（A 书房 / C 桌面 / D 夜航 / F 观测舱）。
   主题差异 = Color + Material + Surface + Depth + Shape + Light + Motion。

   消费方式（CODE）：
   - 全局主题由 data-theme 驱动，值域仅 mist | fluent | night。
   - 复盘数据驾驶舱为页面级作用域：data-visual-scope="review-data"。
   - 页面与组件只消费 --color-* / --radius-* / --shadow-* / --space-* / --font-* / --transition-*。
   ============================================================ */

/* ============================================================
   1. 基础令牌（跨主题共享的结构令牌 + Brand Accent）
   ============================================================ */
:root {
  --color-brand: #4c6fe8;
  --color-brand-hover: #3855cc;
  --color-brand-light: #e9edfb;
  --color-brand-text: #ffffff;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --radius-full: 9999px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;

  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial,
    sans-serif;
  --font-mono: 'Cascadia Code', 'SF Mono', Consolas, 'JetBrains Mono', Menlo,
    monospace;

  --font-size-xs: 12px;
  --font-size-sm: 13px;
  --font-size-base: 15px;
  --font-size-md: 16px;
  --font-size-lg: 17px;
  --font-size-xl: 20px;
  --font-size-2xl: 26px;
  --font-size-3xl: 32px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --transition-fast: 140ms ease;
  --transition-normal: 240ms ease;
  --transition-slow: 400ms ease;
  --ease-out-soft: cubic-bezier(0.2, 0, 0, 1);

  --border-width: 1px;

  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --sidebar-w: 248px;
  --sidebar-w-collapsed: 64px;
}

/* ============================================================
   2. A「晨雾书房」mist — 白天默认
   命题：「晨光落在书桌上的第一小时」
   纸张 / 晨光 / 书页 / 木质 / 雾气 / 留白 / 温润 / 安静
   不是奶油风，不是卡通手账，也不是普通米白 SaaS。
   ============================================================ */
:root,
[data-theme='mist'] {
  color-scheme: light;

  --color-bg: #f7f3ee;
  --color-surface: rgba(255, 255, 255, 0.78);
  --color-surface-2: rgba(250, 247, 242, 0.92);

  --color-text-primary: #2d2a26;
  --color-text-secondary: #6b6863;
  --color-text-tertiary: #9a9791;
  --color-text-inverse: #ffffff;

  /* 主题 Accent：暖木 / 纸页金棕（非蓝）*/
  --color-accent: #c9b89a;
  --color-accent-hover: #b8a687;
  --color-accent-light: #e6d7c0;
  --color-accent-text: #3b2e1c;

  --color-border: rgba(70, 60, 50, 0.08);
  --color-border-light: rgba(70, 60, 50, 0.045);
  --color-border-focus: #9c815c;

  --color-success: #4f8f68;
  --color-success-light: #e7efe8;
  --color-warning: #b98b3e;
  --color-warning-light: #f3ead7;
  --color-danger: #bc5a50;
  --color-danger-light: #f4e6e3;
  --color-info: #8a9bb0;
  --color-info-light: #eaeef2;

  --shadow-sm: 0 2px 8px rgba(65, 50, 35, 0.025);
  --shadow-md: 0 8px 24px rgba(65, 50, 35, 0.045);
  --shadow-lg: 0 14px 40px rgba(65, 50, 35, 0.06);

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

/* ============================================================
   3. C「Windows Fluent」fluent — 手动切换
   命题：「一个属于桌面的浮空窗口系统」
   Mica / Acrylic / Transparency / Blur / Floating / Depth / Native
   ============================================================ */
[data-theme='fluent'] {
  color-scheme: light;

  --color-bg: #eef4ff;
  --color-surface: rgba(255, 255, 255, 0.58);
  --color-surface-2: rgba(255, 255, 255, 0.72);

  --color-text-primary: #1a2035;
  --color-text-secondary: #5b6580;
  --color-text-tertiary: #8b95b0;
  --color-text-inverse: #ffffff;

  --color-accent: #5b8def;
  --color-accent-hover: #3a6fd6;
  --color-accent-light: #8ab4ff;
  --color-accent-text: #ffffff;

  --color-border: rgba(255, 255, 255, 0.46);
  --color-border-light: rgba(255, 255, 255, 0.26);
  --color-border-focus: #3a6fd6;

  --color-success: #2f9e67;
  --color-success-light: #dff3e9;
  --color-warning: #c07d18;
  --color-warning-light: #fcf0d8;
  --color-danger: #d4483c;
  --color-danger-light: #fbe6e4;
  --color-info: #5b8def;
  --color-info-light: #e6f0ff;

  --shadow-sm: 0 2px 6px rgba(30, 60, 120, 0.06);
  --shadow-md: 0 8px 20px rgba(30, 60, 120, 0.09);
  --shadow-lg: 0 18px 44px rgba(30, 60, 120, 0.12);

  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
}

/* ============================================================
   4. D「深色夜航」night — 夜间默认
   命题：「夜晚仍愿意连续使用几小时的空间」
   Night / Depth / Quiet / Focus / Low Stimulus / Reading
   ============================================================ */
[data-theme='night'] {
  color-scheme: dark;

  --color-bg: #0f121a;
  --color-surface: rgba(30, 34, 48, 0.74);
  --color-surface-2: rgba(40, 45, 65, 0.84);

  --color-text-primary: #e8ebf2;
  --color-text-secondary: #a0a7bd;
  --color-text-tertiary: #6b7390;
  --color-text-inverse: #0f121a;

  /* 主题 Accent：冷紫蓝（低刺激，非霓虹）*/
  --color-accent: #7c6eff;
  --color-accent-hover: #988cff;
  --color-accent-light: #a79cff;
  --color-accent-text: #0f121a;

  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-light: rgba(255, 255, 255, 0.045);
  --color-border-focus: #988cff;

  --color-success: #4cc38a;
  --color-success-light: #12271f;
  --color-warning: #d9a13b;
  --color-warning-light: #2b2113;
  --color-danger: #e06c6c;
  --color-danger-light: #2b1919;
  --color-info: #7c6eff;
  --color-info-light: #1c1b33;

  --shadow-sm: 0 3px 10px rgba(0, 0, 0, 0.22);
  --shadow-md: 0 8px 22px rgba(0, 0, 0, 0.28);
  --shadow-lg: 0 18px 42px rgba(0, 0, 0, 0.34);
}

/* ============================================================
   5. F「数据驾驶舱」review-data — 页面级作用域（非全局主题）
   命题：「不是深色 Dashboard，而是只在复盘时打开的数据观测舱」
   覆盖背景/表面/文字/强调/阴影，形成独立的深色全息空间。
   ============================================================ */
[data-visual-scope='review-data'],
[data-scope='review-data'] {
  color-scheme: dark;

  --color-bg: #050a15;
  --color-surface: rgba(10, 20, 40, 0.46);
  --color-surface-2: rgba(15, 30, 60, 0.58);

  --color-text-primary: #e6f4ff;
  --color-text-secondary: #7eb8ff;
  --color-text-tertiary: #3a6fb0;
  --color-text-inverse: #050a15;

  --color-accent: #00d4ff;
  --color-accent-hover: #40e0ff;
  --color-accent-light: #7b61ff;
  --color-accent-text: #031420;

  --color-border: rgba(0, 212, 255, 0.24);
  --color-border-light: rgba(0, 212, 255, 0.11);
  --color-border-focus: #00d4ff;

  --color-success: #2ee6a8;
  --color-success-light: rgba(46, 230, 168, 0.12);
  --color-warning: #ffd166;
  --color-warning-light: rgba(255, 209, 102, 0.12);
  --color-danger: #ff6b8a;
  --color-danger-light: rgba(255, 107, 138, 0.12);
  --color-info: #00d4ff;
  --color-info-light: rgba(0, 212, 255, 0.12);

  --shadow-sm: 0 0 12px rgba(0, 212, 255, 0.08);
  --shadow-md: 0 0 20px rgba(0, 212, 255, 0.12);
  --shadow-lg: 0 0 34px rgba(0, 212, 255, 0.16);

  /* 分类图表色（全息色系；图表须另配数值/标签/纹理，不得只靠颜色）*/
  --chart-1: #00d4ff;
  --chart-2: #7b61ff;
  --chart-3: #40e0ff;
  --chart-4: #a78bfa;
  --chart-5: #22d3ee;
  --chart-6: #818cf8;
  --chart-7: #38bdf8;
  --chart-8: #67e8f9;
  --chart-axis: #3a6fb0;
  --chart-text: #7eb8ff;
  --chart-grid: rgba(0, 212, 255, 0.1);
  --chart-glow: rgba(0, 212, 255, 0.5);

  --data-font: var(--font-mono);
  --data-num-weight: var(--font-weight-semibold);
}

/* ============================================================
   6. 基础元素（body / 焦点 / 减少动效）
   ============================================================ */
body {
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  line-height: 1.6;
  background: var(--color-bg);
  color: var(--color-text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  margin: 0;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
}

a {
  color: var(--color-accent);
  text-decoration: none;
}
a:hover {
  color: var(--color-accent-hover);
}

input,
textarea,
select {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  padding: 8px 12px;
  transition: border-color var(--transition-fast);
}
input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--color-border-focus);
}

:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* ============================================================
   7. 材质系统（Material System）
   半透明 + 模糊只在关键 Surface 使用；不支持 backdrop-filter 时
   提高背景不透明度并关闭 blur。
   ============================================================ */

/* 材质表面：半透明 + 背板模糊（Fluent / F 关键面板）*/
.material-surface {
  background: var(--color-surface);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

/* 不支持 backdrop-filter 时的降级 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .material-surface {
    background: var(--color-surface-2);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

/* F 全息面板：透明 + 模糊 + 发光边缘 + 内光 */
.holo-panel {
  background: var(--color-surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}
.holo-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    135deg,
    rgba(0, 212, 255, 0.08),
    transparent 40%,
    transparent 60%,
    rgba(123, 97, 255, 0.08)
  );
}

/* ============================================================
   8. 容器系统（Section / List / Panel / Card / Data Block）
   原则：不「全卡片化」，按语义选择容器。
   ============================================================ */
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.section + .section {
  margin-top: var(--space-6);
}

.list {
  display: flex;
  flex-direction: column;
}
.list-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-2);
  border-bottom: var(--border-width) solid var(--color-border-light);
  transition: background var(--transition-fast);
}
.list-item:last-child {
  border-bottom: none;
}
.list-item:hover {
  background: var(--color-surface-2);
}

.panel {
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.card {
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-normal), transform var(--transition-normal);
}
.card.is-interactive:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.card.is-interactive:active {
  box-shadow: var(--shadow-sm);
  transform: translateY(0);
}

.data-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.data-block__value {
  font-family: var(--data-font, var(--font-sans));
  font-size: var(--font-size-2xl);
  font-weight: var(--data-num-weight, var(--font-weight-semibold));
  line-height: 1.25;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}
.data-block__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.data-block__delta {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}
.data-block__delta[data-tone='up'] {
  color: var(--color-success);
}
.data-block__delta[data-tone='down'] {
  color: var(--color-danger);
}

/* ============================================================
   9. 状态系统
   ============================================================ */
.is-disabled,
[aria-disabled='true'],
:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.skeleton {
  position: relative;
  overflow: hidden;
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  color: transparent !important;
  user-select: none;
}
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--color-surface), transparent);
  animation: skeleton-shimmer 1.4s infinite;
}
@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  text-align: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-secondary);
}
.empty-state__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.state-success {
  color: var(--color-success);
}
.state-error {
  color: var(--color-danger);
}
.state-warning {
  color: var(--color-warning);
}

.is-saving {
  opacity: 0.65;
  pointer-events: none;
}
.saved-flash {
  animation: saved-flash 1.2s ease;
}
@keyframes saved-flash {
  0% {
    color: var(--color-success);
  }
  100% {
    color: inherit;
  }
}

/* ============================================================
   10. 动效工具类（有意义才动；reduced-motion 已在 §6 全局压平）
   ============================================================ */
.motion-page-enter {
  animation: motion-page-enter var(--transition-normal) var(--ease-out-soft) both;
}
@keyframes motion-page-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.motion-task-done {
  animation: motion-task-done var(--transition-fast) var(--ease-out-soft);
}
@keyframes motion-task-done {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

.motion-data-change {
  animation: motion-data-change var(--transition-slow) var(--ease-out-soft);
}
@keyframes motion-data-change {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* F 数据脉冲（Data Pulse）*/
.motion-data-pulse {
  animation: motion-data-pulse 2.4s ease-in-out infinite;
}
@keyframes motion-data-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.flashcard-face {
  backface-visibility: hidden;
  transition: transform var(--transition-slow) var(--ease-out-soft);
  transform-style: preserve-3d;
}

/* ============================================================
   11. 主题专属材质类（Theme Material Classes）
   依据：V8_VISUAL_LAB_4THEMES_INTERACTIONS 模板
   四个主题各自拥有独立的材质组合，不是「换色」。这些类供页面/组件
   按主题挂载，让同一语义组件在不同空间里呈现不同材质。
   ============================================================ */

/* ---- A 晨雾书房 · 纸页材质 ---- */
[data-theme='mist'] .mist-paper {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.74),
    rgba(249, 244, 236, 0.72)
  );
  border: 1px solid rgba(100, 80, 55, 0.06);
  box-shadow:
    0 1px 2px rgba(85, 65, 45, 0.03),
    0 10px 28px rgba(85, 65, 45, 0.045);
}
[data-theme='mist'] .paper-strip {
  border-left: 3px solid rgba(201, 184, 154, 0.72);
  padding-left: 14px;
}

/* ---- C Windows Fluent · 窗口 / 浮层材质 ---- */
[data-theme='fluent'] .fluent-window {
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 28px;
  box-shadow:
    0 14px 44px rgba(35, 65, 130, 0.12),
    0 2px 8px rgba(35, 65, 130, 0.06),
    inset 0 1px rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
}
[data-theme='fluent'] .fluent-float {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 22px;
  box-shadow:
    0 18px 48px rgba(35, 65, 130, 0.14),
    inset 0 1px rgba(255, 255, 255, 0.82);
}
[data-theme='fluent'] .fluent-toolbar {
  background: rgba(255, 255, 255, 0.34);
  border-bottom: 1px solid rgba(255, 255, 255, 0.44);
}

/* ---- D 深色夜航 · 深空舞台 / 焦点 ---- */
[data-theme='night'] .night-stage {
  background:
    radial-gradient(circle at 50% -20%, rgba(82, 90, 150, 0.16), transparent 48%),
    linear-gradient(180deg, rgba(18, 22, 34, 0.35), rgba(8, 10, 15, 0.12));
}
[data-theme='night'] .night-focus {
  border-color: rgba(255, 255, 255, 0.07);
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.3),
    inset 0 1px rgba(255, 255, 255, 0.02);
}
[data-theme='night'] .night-pulse {
  box-shadow: 0 0 0 4px rgba(124, 110, 255, 0.08);
}

/* ---- F 数据驾驶舱 · 全息面板 / Hero / 指标芯片 ---- */
.review-space {
  position: relative;
  border: 1px solid rgba(0, 212, 255, 0.16);
  border-radius: 28px;
  padding: 26px;
  overflow: hidden;
  background:
    linear-gradient(140deg, rgba(10, 35, 58, 0.32), rgba(4, 13, 25, 0.14)),
    rgba(4, 10, 20, 0.16);
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.26),
    inset 0 0 60px rgba(0, 190, 255, 0.035);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.holo-panel {
  position: relative;
  overflow: hidden;
  padding: 20px;
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 22px;
  background: rgba(7, 22, 40, 0.38);
  box-shadow:
    0 0 24px rgba(0, 170, 255, 0.06),
    inset 0 0 30px rgba(0, 160, 255, 0.035);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.holo-hero {
  position: relative;
  overflow: hidden;
  padding: 30px;
  border: 1px solid rgba(0, 212, 255, 0.28);
  border-radius: 26px;
  background: linear-gradient(
    140deg,
    rgba(13, 55, 83, 0.42),
    rgba(6, 18, 33, 0.25) 60%,
    rgba(24, 12, 70, 0.24)
  );
  box-shadow:
    0 0 0 1px rgba(0, 212, 255, 0.025),
    0 0 46px rgba(0, 175, 255, 0.08),
    inset 0 0 45px rgba(0, 175, 255, 0.045);
  backdrop-filter: blur(24px) saturate(130%);
  -webkit-backdrop-filter: blur(24px) saturate(130%);
}
.metric-chip {
  padding: 12px;
  border: 1px solid rgba(0, 212, 255, 0.12);
  border-radius: 14px;
  background: rgba(8, 28, 47, 0.3);
}

/* ============================================================
   12. 主题专属交互层（Theme Interaction Language）
   依据：V8_VISUAL_LAB_4THEMES_INTERACTIONS 模板
   四主题各自有独立的 hover 反馈语言，不做「统一浮起 + 发光」。
   机制：JS 给可交互元素挂 .theme-interactive 与 .is-hovered，
   兼容桌面鼠标 / 精确指针；列表行用轻反馈，不重度浮起。
   ============================================================ */
.theme-interactive {
  position: relative;
  transform: translateZ(0);
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 260ms ease,
    background 260ms ease,
    border-color 260ms ease,
    box-shadow 260ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, filter, box-shadow;
}

/* ---- A 晨雾书房 · 晨光照亮纸页 ---- */
[data-theme='mist'] .theme-interactive.is-hovered {
  filter: saturate(1.1) brightness(1.035);
  transform: translateY(-2px);
  border-color: rgba(171, 139, 95, 0.22);
  box-shadow:
    0 12px 30px rgba(78, 58, 38, 0.075),
    0 0 0 1px rgba(201, 184, 154, 0.07),
    inset 0 1px rgba(255, 255, 255, 0.55);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.93), rgba(251, 246, 237, 0.88));
}
[data-theme='mist'] .theme-interactive.is-hovered::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -28%;
  width: 24%;
  pointer-events: none;
  transform: skewX(-18deg);
  background: linear-gradient(90deg, transparent, rgba(255, 227, 177, 0.34), transparent);
  animation: mist-light-sweep 720ms ease-out forwards;
  border-radius: inherit;
}
@keyframes mist-light-sweep {
  from { left: -28%; opacity: 0; }
  18% { opacity: 1; }
  to { left: 115%; opacity: 0; }
}

/* ---- C Windows Fluent · 浮起 + Acrylic 加深 ---- */
[data-theme='fluent'] .theme-interactive.is-hovered {
  transform: translateY(-7px) scale(1.012);
  background: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.88);
  box-shadow:
    0 28px 60px rgba(28, 60, 125, 0.17),
    0 4px 14px rgba(28, 60, 125, 0.08),
    inset 0 1px rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(30px) saturate(155%);
  -webkit-backdrop-filter: blur(30px) saturate(155%);
}
[data-theme='fluent'] .theme-interactive.is-hovered::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.28),
    transparent 32%,
    transparent 68%,
    rgba(130, 180, 255, 0.08)
  );
}
[data-theme='fluent'] .list-item.theme-interactive.is-hovered {
  transform: translateX(5px);
  background: rgba(255, 255, 255, 0.34);
  box-shadow: inset 3px 0 rgba(91, 141, 239, 0.44);
}

/* ---- D 深色夜航 · 月光掠过 + 聚焦 ---- */
[data-theme='night'] .theme-interactive.is-hovered {
  transform: translateY(-3px);
  background: rgba(35, 40, 57, 0.9);
  border-color: rgba(160, 148, 255, 0.22);
  box-shadow:
    0 16px 38px rgba(0, 0, 0, 0.34),
    0 0 0 1px rgba(124, 110, 255, 0.04),
    inset 0 1px rgba(255, 255, 255, 0.028);
}
[data-theme='night'] .theme-interactive.is-hovered::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -38%;
  width: 34%;
  pointer-events: none;
  transform: skewX(-18deg);
  background: linear-gradient(90deg, transparent, rgba(189, 199, 255, 0.065), transparent);
  animation: night-moon-sweep 900ms ease-out forwards;
  border-radius: inherit;
}
@keyframes night-moon-sweep {
  from { left: -38%; opacity: 0; }
  15% { opacity: 1; }
  to { left: 115%; opacity: 0; }
}
[data-theme='night'] .night-focus-zone:has(.theme-interactive.is-hovered)
  .theme-interactive:not(.is-hovered) {
  opacity: 0.76;
  filter: saturate(0.88) brightness(0.93);
}

/* ---- F 数据驾驶舱 · 浮起 + 点亮 + 数据响应 ---- */
[data-scope='review-data'] .theme-interactive.is-hovered,
[data-visual-scope='review-data'] .theme-interactive.is-hovered {
  transform: translateY(-8px) scale(1.012);
  border-color: rgba(0, 212, 255, 0.48);
  box-shadow:
    0 0 44px rgba(0, 212, 255, 0.17),
    0 24px 58px rgba(0, 0, 0, 0.3),
    inset 0 0 38px rgba(0, 180, 255, 0.085);
  background: linear-gradient(145deg, rgba(12, 43, 68, 0.54), rgba(6, 17, 31, 0.38));
}
[data-scope='review-data'] .theme-interactive.is-hovered::after,
[data-visual-scope='review-data'] .theme-interactive.is-hovered::after {
  content: '';
  position: absolute;
  left: 7%;
  right: 7%;
  top: 0;
  height: 2px;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 212, 255, 0.98),
    rgba(123, 97, 255, 0.88),
    transparent
  );
  box-shadow:
    0 0 14px rgba(0, 212, 255, 0.55),
    0 0 24px rgba(123, 97, 255, 0.22);
}
[data-scope='review-data'] .list-item.theme-interactive.is-hovered,
[data-visual-scope='review-data'] .list-item.theme-interactive.is-hovered {
  transform: translateX(4px);
  background: linear-gradient(90deg, rgba(0, 212, 255, 0.065), transparent 70%);
  box-shadow: inset 3px 0 rgba(0, 212, 255, 0.42);
}

/* ---- 交互可见性 ---- */
.theme-interactive:hover {
  z-index: 4;
}

/* ---- 减少动效 ---- */
@media (prefers-reduced-motion: reduce) {
  .theme-interactive,
  .theme-interactive.is-hovered {
    transform: none !important;
    animation: none !important;
    transition: none !important;
  }
}

/* 旧 token 别名已移除（Phase 15 清理完成），页面/组件统一使用 --color-* 命名。 */

```

### `src/types/index.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Core Type Definitions
// ============================================================

// ---- Module / Theme Enums ----

export type ModuleType = 'today' | 'plan' | 'study' | 'record' | 'review' | 'tools' | 'settings'

export type Theme = 'mist' | 'fluent' | 'night'

export type FlashcardTheme = 'morningMist' | 'nightSky' | 'forest' | 'amber' | 'minimal'

// ---- Task ----

export type TaskPriority = 'P0' | 'P1' | 'P2'

export interface Task {
  id: string
  title: string
  priority: TaskPriority
  done: boolean
  note: string
  projectId: string
  dueDate: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  sourceRecurringId?: string
}

// ---- Recurring Task ----

export type RecurringRuleType = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface RecurringRule {
  type: RecurringRuleType
  daysOfWeek?: number[]
  daysOfMonth?: number[]
  intervalDays?: number
}

export interface RecurringTask {
  id: string
  title: string
  rule: RecurringRule
  time: string
  priority: TaskPriority
  category: string
  startDate: string
  endDate: string
  enabled: boolean
  lastGeneratedDate?: string
}

// ---- Project ----

export type ProjectStage = 'plan' | 'active' | 'done' | 'paused'

export interface Milestone {
  id: string
  title: string
  done: boolean
}

export interface Project {
  id: string
  title: string
  stage: ProjectStage
  progress: number
  milestones: Milestone[]
  description: string
  notes: string
  tags: string[]
}

// ---- Memo ----

export interface MemoConversion {
  type: 'task' | 'mistake' | 'note'
  id: string
}

export interface Memo {
  id: string
  content: string
  createdAt: string
  convertedTo?: MemoConversion
}

// ---- Note ----

export interface Note {
  id: string
  title: string
  body: string
  notebook: string
  tags: string[]
  favorite: boolean
  url: string
  createdAt: string
  updatedAt: string
}

// ---- Flashcard / Study ----

export interface Flashcard {
  id: string
  question: string
  answer: string
  subject: string
  chapter: string
  knowledgeId?: string
  tags: string[]
  difficulty: number // 1–5
  mastery: number // 0–100
  reviewCount: number
  correctCount: number
  wrongCount: number
  nextReviewAt: string
  createdAt: string
}

export type ReviewRating = 'forgot' | 'fuzzy' | 'got' | 'mastered'

export interface FlashcardReview {
  id: string
  flashcardId: string
  rating: ReviewRating
  reviewedAt: string
  nextReviewAt: string
}

// ---- Subject / Chapter / Topic ----

export type MasteryLevel = 'notStarted' | 'learning' | 'mastered' | 'weak'

export interface Topic {
  id: string
  name: string
  chapterId: string
  mastery: MasteryLevel
  notes: string
  relatedMistakes: string[]
}

export interface Chapter {
  id: string
  name: string
  subjectId: string
  topics: Topic[]
}

export interface Subject {
  id: string
  name: string
  chapters: Chapter[]
}

// ---- Mistake ----

export interface Mistake {
  id: string
  subject: string
  question: string
  answer: string
  errorType: string
  tags: string[]
  linkedKnowledge: string[]
  mastered: boolean
  reviewCount: number
  source: string
  createdAt: string
}

// ---- Exam ----

export interface Exam {
  id: string
  name: string
  date: string
  scores: Record<string, number>
  total: number
  rank: number
  note: string
}

// ---- Review ----

export type ReviewType = 'daily' | 'subject' | 'weekly' | 'monthly' | 'exam'

export interface Review {
  id: string
  type: ReviewType
  dateRange: { start: string; end: string }
  subjectId?: string
  examId?: string
  autoSummary: any
  answers: Record<string, string>
  reflections: string[]
  nextActions: string[]
  createdAt: string
}

// ---- Review Template ----

export interface ReviewTemplate {
  id: string
  name: string
  type: string
  questions: string[]
}

// ---- Review Metrics（5 类契约，冻结：ERRATA-04 / I-014）----

export interface DailyMetrics {
  date: string
  tasksTotal: number
  tasksCompleted: number
  studyDuration: number // 分钟
  pomodoroCount: number
  mistakesCreated: number
  flashcardsReviewed: number
  flashcardsCorrect: number
}

export interface SubjectMetrics {
  subjectId: string
  subjectName: string
  studyDuration: number
  taskCompletionRate: number
  newMistakes: number
  flashcardReviews: number
  weakKnowledgePoints: string[]
}

export interface WeeklyMetrics {
  weekStart: string
  weekEnd: string
  daily: DailyMetrics[]
  bySubject: SubjectMetrics[]
  totalStudyDuration: number
  totalTasksCompleted: number
}

export interface MonthlyMetrics {
  month: string
  daily: DailyMetrics[]
  bySubject: SubjectMetrics[]
  heatmapData: Record<string, number> // date → study minutes
  totalStudyDuration: number
}

export interface ExamMetrics {
  score: number
  scoreChange: number
  subjectScores: { name: string; current: number; previous: number; change: number }[]
  mistakeTypeDist: Record<string, number>
  knowledgeDist: Record<string, number>
}

// ---- Review Entry（C-12：Entry 与 Template 分离）----

export interface ReviewEntry {
  id: string
  templateId: string
  type: ReviewType
  dateRange: { start: string; end: string }
  subjectId?: string
  examId?: string
  answers: Record<string, string>
  reflections: string[]
  nextActions: string[]
  autoSummary?: DailyMetrics | SubjectMetrics | WeeklyMetrics | MonthlyMetrics | ExamMetrics
  createdAt: string
}

// ---- Knowledge Relation（C-11）----

export type KnowledgeRelationType = 'mistake' | 'flashcard' | 'note' | 'reading'

export interface KnowledgeRelation {
  id: string
  knowledgeId: string
  type: KnowledgeRelationType
  targetId: string
  createdAt: string
}

// ---- Study Session（C-11）----

export interface StudySession {
  id: string
  subjectId?: string
  taskId?: string
  startedAt: string
  endedAt: string
  duration: number // 分钟
  note: string
}

// ---- App Event Log（C-11）----

export interface AppEventLog {
  id: string
  type: string
  payload: any
  timestamp: string
}

// ---- Flashcard Schedule（C-13：调度状态与内容分离）----

export interface FlashcardSchedule {
  flashcardId: string
  nextReviewAt: string
  consecutiveCorrect: number
  interval: number // 天
  easeFactor: number
  reviewCount: number
  lastReviewedAt: string
}

// ---- Reading ----

export interface Reading {
  id: string
  title: string
  current: number
  target: number
  unit: string
  note: string
  pinned: boolean
  createdAt: string
}

// ---- Finance ----

export type FinanceType = 'income' | 'expense'

export interface Finance {
  id: string
  type: FinanceType
  title: string
  amount: number
  category: string
  tags: string[]
  date: string
  note: string
}

// ---- Countdown ----

export type CountdownType = 'event' | 'exam' | 'travel' | 'birthday' | 'custom'

export interface Countdown {
  id: string
  title: string
  targetDate: string
  type: CountdownType
  showOnHome: boolean
}

// ---- Pomodoro ----

export interface PomodoroLog {
  id: string
  date: string
  duration: number
  subject?: string
  completed: boolean
}

// ---- Setting ----

export interface Setting {
  key: string
  value: any
}

// ---- Vault ----

export interface VaultEntry {
  id: string
  platform: string
  username: string
  password: string
  passwordIv: string
  url: string
  note: string
  lastUsed: string
}

// ---- Navigation ----

export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  children?: NavItem[]
}

// ---- Search ----

export interface SearchResult {
  id: string
  type: ModuleType
  title: string
  subtitle: string
  moduleLabel: string
  path: string
}
```

### `src/utils/errorRecovery.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Error Recovery Utilities
// ============================================================

import { db } from '../db/database'
import type { Setting } from '../types'

interface IntegrityResult {
  ok: boolean
  issues: string[]
}

const TABLE_NAMES = [
  'tasks',
  'recurringTasks',
  'projects',
  'memos',
  'notes',
  'flashcards',
  'flashcardReviews',
  'subjects',
  'mistakes',
  'exams',
  'reviewEntries',
  'reviewTemplates',
  'reading',
  'finance',
  'countdowns',
  'pomodoroLogs',
  'vault',
  'settings',
] as const

const LS_BACKUP_KEY = 'wb-latest-backup'
const LS_FALLBACK_PREFIX = 'wb-fallback-'

/**
 * Check data integrity across all IndexedDB tables.
 * Returns { ok: boolean, issues: string[] }
 */
export async function checkDataIntegrity(): Promise<IntegrityResult> {
  const issues: string[] = []

  try {
    const available = await db.isAvailable()
    if (!available) {
      issues.push('IndexedDB is not available')
      return { ok: false, issues }
    }

    for (const tableName of TABLE_NAMES) {
      try {
        const records = await db.table(tableName).toArray()
        if (!Array.isArray(records)) {
          issues.push(`Table "${tableName}" returned non-array data`)
          continue
        }
        // Check for null/undefined records
        const nullCount = records.filter((r) => r == null).length
        if (nullCount > 0) {
          issues.push(`Table "${tableName}" contains ${nullCount} null/undefined records`)
        }
        // Check records have required id field
        const missingId = records.filter((r) => r != null && !r.id).length
        if (missingId > 0) {
          issues.push(`Table "${tableName}" contains ${missingId} records without id`)
        }
      } catch (err) {
        issues.push(`Table "${tableName}" read failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    issues.push(`Integrity check failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return { ok: issues.length === 0, issues }
}

/**
 * Restore data from the latest backup stored in localStorage.
 */
export async function recoverFromBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY)
    if (!raw) {
      return { success: false, message: 'No backup found in localStorage' }
    }

    const backup = JSON.parse(raw)
    if (!backup || typeof backup !== 'object') {
      return { success: false, message: 'Backup data is corrupted' }
    }

    const available = await db.isAvailable()
    if (!available) {
      return { success: false, message: 'IndexedDB is not available' }
    }

    await db.importAllData(backup)
    return { success: true, message: `Restored backup from ${backup._timestamp || 'unknown time'}` }
  } catch (err) {
    return { success: false, message: `Recovery failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/**
 * Save current data as a backup to localStorage.
 */
export async function saveLocalBackup(): Promise<void> {
  try {
    const data = await db.exportAllData()
    ;(data as any)._timestamp = new Date().toISOString()
    localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(data))
  } catch (err) {
    console.warn('[ErrorRecovery] Failed to save local backup:', err)
  }
}

/**
 * Fallback to localStorage mode when IndexedDB is unavailable.
 * Stores data in localStorage under prefixed keys.
 */
export function fallbackToLocalStorage(): boolean {
  try {
    localStorage.setItem(`${LS_FALLBACK_PREFIX}test`, '1')
    localStorage.removeItem(`${LS_FALLBACK_PREFIX}test`)
    return true
  } catch {
    return false
  }
}

/**
 * Read a value from localStorage fallback storage.
 */
export function readFromFallback(key: string): string | null {
  return localStorage.getItem(`${LS_FALLBACK_PREFIX}${key}`)
}

/**
 * Write a value to localStorage fallback storage.
 */
export function writeToFallback(key: string, value: string): void {
  try {
    localStorage.setItem(`${LS_FALLBACK_PREFIX}${key}`, value)
  } catch (err) {
    console.warn('[ErrorRecovery] Failed to write to fallback storage:', err)
  }
}

/**
 * Load all settings from localStorage fallback.
 */
export function loadFallbackSettings(): Setting[] {
  const settings: Setting[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(LS_FALLBACK_PREFIX)) {
      const settingKey = key.slice(LS_FALLBACK_PREFIX.length)
      try {
        const value = JSON.parse(localStorage.getItem(key)!)
        settings.push({ key: settingKey, value })
      } catch {
        settings.push({ key: settingKey, value: localStorage.getItem(key) })
      }
    }
  }
  return settings
}
```

### `src/utils/helpers.ts`

```typescript
// ============================================================
// Personal Workbench V8 — Utility Helpers
// ============================================================

/** Generate a unique ID (crypto-based with fallback) */
export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  )
}

/** Format a Date object to yyyy-MM-dd */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Check if a date string (yyyy-MM-dd) is today */
export function isToday(date: string): boolean {
  return date === formatDate(new Date())
}

/** Return a Chinese greeting based on the current hour */
export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
}

/** Difference in days between two date strings (yyyy-MM-dd) */
export function getDaysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1).getTime()
  const d2 = new Date(date2).getTime()
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24))
}

/** Deep clone an object via structuredClone with JSON fallback */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj)
  }
  return JSON.parse(JSON.stringify(obj))
}
```

