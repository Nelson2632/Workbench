// ============================================================
// Personal Workbench V8 — Desktop (Tauri) Integration Helpers
// ============================================================
// All helpers gracefully degrade to no-ops when running in a
// plain browser instead of the Tauri desktop shell.

/** Whether the app is running inside the Tauri desktop shell */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** Whether the host OS is macOS (used for UI label adaptation only) */
export function isMacOS(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
}

/** Modifier key display label: '⌘' on macOS, 'Ctrl' elsewhere */
export function modKeyLabel(): string {
  return isMacOS() ? '⌘' : 'Ctrl'
}

/**
 * Display form of a shortcut string.
 * Stored keys stay canonical ('Ctrl+...', which the shortcut parser already
 * treats as Ctrl-or-Cmd); only the display is adapted on macOS.
 */
export function formatShortcutDisplay(keys: string): string {
  if (!isMacOS()) return keys
  return keys.replace(/Ctrl/gi, modKeyLabel())
}

/** Whether the current window is the quick memo floating window */
export function isQuickMemoWindow(): boolean {
  if (!isDesktop()) return false
  const label = (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label
  return label === 'quick-memo'
}

/** Whether the current window is the pomodoro floating window */
export function isPomodoroFloatWindow(): boolean {
  if (!isDesktop()) return false
  const label = (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label
  return label === 'pomodoro-float'
}

/** Open the pomodoro floating window (desktop only) */
export async function openPomodoroFloat(): Promise<void> {
  if (!isDesktop()) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('open_pomodoro_float')
  } catch (err) {
    console.warn('[Workbench] Open pomodoro float failed:', err)
  }
}

/**
 * Send a desktop system notification.
 * No-op in the browser (falls back to console log).
 */
export async function sendDesktopNotification(
  title: string,
  body: string,
  route?: string,
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
      sendNotification({ title, body, ...(route ? { extra: { route } } : {}) })
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
