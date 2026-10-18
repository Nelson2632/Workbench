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

/// Show (and focus) the pomodoro floating window
fn show_pomodoro_float(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("pomodoro-float") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
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

#[tauri::command]
fn open_pomodoro_float(app: tauri::AppHandle) {
    show_pomodoro_float(&app);
}

// ---- V9 Private Files（SECURITY_CONTRACT §24：只开放 PrivateWorkbench/**）----

fn private_files_root(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("PrivateWorkbench")
        .join("files");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// 防路径逃逸：拒绝上级目录、绝对路径与盘符（只允许 PrivateWorkbench/files 内相对路径）
fn validate_rel_path(rel_path: &str) -> Result<(), String> {
    if rel_path.is_empty()
        || rel_path.contains("..")
        || rel_path.starts_with('/')
        || rel_path.starts_with('\\')
        || rel_path.contains(':')
    {
        return Err("invalid path: only PrivateWorkbench/files relative paths allowed".into());
    }
    Ok(())
}

#[tauri::command]
fn v9_save_private_file(app: tauri::AppHandle, rel_path: String, data: Vec<u8>) -> Result<(), String> {
    validate_rel_path(&rel_path)?;
    let full = private_files_root(&app)?.join(&rel_path);
    std::fs::write(&full, &data).map_err(|e| e.to_string())
}

#[tauri::command]
fn v9_load_private_file(app: tauri::AppHandle, rel_path: String) -> Result<Option<Vec<u8>>, String> {
    validate_rel_path(&rel_path)?;
    let full = private_files_root(&app)?.join(&rel_path);
    match std::fs::read(&full) {
        Ok(data) => Ok(Some(data)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn v9_delete_private_file(app: tauri::AppHandle, rel_path: String) -> Result<(), String> {
    validate_rel_path(&rel_path)?;
    let full = private_files_root(&app)?.join(&rel_path);
    match std::fs::remove_file(&full) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

// ---- V9 Backup Snapshot 持久化（DP1.7 v1.7 / Q1.10：快照落盘 PrivateWorkbench/backup/）----

fn backup_root(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("PrivateWorkbench")
        .join("backup");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// 快照 id 防注入：拒绝路径分隔符 / 上级目录 / 盘符
fn validate_snapshot_id(id: &str) -> Result<(), String> {
    if id.is_empty()
        || id.contains("..")
        || id.contains('/')
        || id.contains('\\')
        || id.contains(':')
    {
        return Err("invalid snapshot id".into());
    }
    Ok(())
}

#[tauri::command]
fn v9_save_backup_snapshot(app: tauri::AppHandle, snapshot_id: String, data: String) -> Result<(), String> {
    validate_snapshot_id(&snapshot_id)?;
    let full = backup_root(&app)?.join(format!("{snapshot_id}.json"));
    std::fs::write(&full, data.as_bytes()).map_err(|e| e.to_string())
}

#[tauri::command]
fn v9_load_backup_snapshot(app: tauri::AppHandle, snapshot_id: String) -> Result<Option<String>, String> {
    validate_snapshot_id(&snapshot_id)?;
    let full = backup_root(&app)?.join(format!("{snapshot_id}.json"));
    match std::fs::read_to_string(&full) {
        Ok(data) => Ok(Some(data)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn v9_delete_backup_snapshot(app: tauri::AppHandle, snapshot_id: String) -> Result<(), String> {
    validate_snapshot_id(&snapshot_id)?;
    let full = backup_root(&app)?.join(format!("{snapshot_id}.json"));
    match std::fs::remove_file(&full) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn v9_list_backup_snapshots(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = backup_root(&app)?;
    let mut ids = Vec::new();
    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if let Some(id) = name.strip_suffix(".json") {
            ids.push(id.to_string());
        }
    }
    Ok(ids)
}

// ---- Platform shortcuts (macOS 用 Cmd 系，其余平台保持 Ctrl 系) ----

/// macOS：Cmd+Shift+Space（快捷备忘）/ Cmd+Option+B（显隐主窗）
#[cfg(target_os = "macos")]
fn app_shortcuts() -> (Shortcut, Shortcut) {
    (
        Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::Space),
        Shortcut::new(Some(Modifiers::SUPER | Modifiers::ALT), Code::KeyB),
    )
}

/// Windows / Linux：Ctrl+Shift+Space / Ctrl+Alt+B（保持既有行为不变）
#[cfg(not(target_os = "macos"))]
fn app_shortcuts() -> (Shortcut, Shortcut) {
    (
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::Space),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyB),
    )
}

/// 托盘菜单「快捷备忘」文案：macOS 显示 ⌘ 样式
#[cfg(target_os = "macos")]
const MEMO_MENU_LABEL: &str = "快捷备忘 (⌘⇧Space)";
#[cfg(not(target_os = "macos"))]
const MEMO_MENU_LABEL: &str = "快捷备忘 (Ctrl+Shift+Space)";

/// 日志中的快捷键描述
#[cfg(target_os = "macos")]
const SHORTCUT_MEMO_DESC: &str = "Cmd+Shift+Space";
#[cfg(not(target_os = "macos"))]
const SHORTCUT_MEMO_DESC: &str = "Ctrl+Shift+Space";
#[cfg(target_os = "macos")]
const SHORTCUT_TOGGLE_DESC: &str = "Cmd+Option+B";
#[cfg(not(target_os = "macos"))]
const SHORTCUT_TOGGLE_DESC: &str = "Ctrl+Alt+B";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Global shortcuts (Tauri native registration)
    let (shortcut_memo, shortcut_toggle) = app_shortcuts();

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
        .invoke_handler(tauri::generate_handler![
            quit_app,
            open_pomodoro_float,
            v9_save_private_file,
            v9_load_private_file,
            v9_delete_private_file,
            v9_save_backup_snapshot,
            v9_load_backup_snapshot,
            v9_delete_backup_snapshot,
            v9_list_backup_snapshots
        ])
        .setup(move |app| {
            // Register global shortcuts — 安全降级（RF-01）：
            // 快捷键被其他进程占用 / 重复启动导致注册失败时，绝不令主进程退出；
            // 已注册则幂等跳过，避免重复注册与托盘生命周期冲突。
            let gs = app.global_shortcut();
            if !gs.is_registered(shortcut_memo) {
                if let Err(e) = gs.register(shortcut_memo) {
                    eprintln!("[workbench] global shortcut {SHORTCUT_MEMO_DESC} register failed (degraded): {e}");
                }
            }
            if !gs.is_registered(shortcut_toggle) {
                if let Err(e) = gs.register(shortcut_toggle) {
                    eprintln!("[workbench] global shortcut {SHORTCUT_TOGGLE_DESC} register failed (degraded): {e}");
                }
            }

            // ---- System tray ----
            let show = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let memo = MenuItem::with_id(
                app,
                "memo",
                MEMO_MENU_LABEL,
                true,
                None::<&str>,
            )?;
            let pomodoro = MenuItem::with_id(app, "pomodoro", "番茄钟浮窗", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &memo, &pomodoro, &quit])?;

            // macOS 分支会重新赋值（icon_as_template），其余平台不需要 mut
            #[allow(unused_mut)]
            let mut tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("个人工作台 V8")
                .menu(&menu)
                .show_menu_on_left_click(false);

            // macOS：菜单栏图标用模板（单色）样式渲染
            #[cfg(target_os = "macos")]
            {
                tray = tray.icon_as_template(true);
            }

            tray
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "memo" => show_quick_memo(app),
                    "pomodoro" => show_pomodoro_float(app),
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
                } else if window.label() == "quick-memo" || window.label() == "pomodoro-float" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // macOS：窗口全部隐藏后点击 Dock 图标（Reopen）恢复主窗口
            // （RunEvent::Reopen 是 macOS 专属变体，需 cfg 门控）
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.unminimize();
                    let _ = w.set_focus();
                }
            }
            // 其他平台：暂无需要处理的 RunEvent
            #[cfg(not(target_os = "macos"))]
            let _ = (&app, &event);
        });
}
