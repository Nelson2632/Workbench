//! Explicit CI-only diagnostic handshake. Never enabled in ordinary launches.
use std::{collections::BTreeMap, sync::Mutex};
use tauri::Manager;

#[derive(Default)]
pub struct SmokeReports(pub Mutex<BTreeMap<String, serde_json::Value>>);

fn output_path() -> Option<std::path::PathBuf> {
    if std::env::var("CI").as_deref() != Ok("true") { return None; }
    std::env::var_os("WORKBENCH_NATIVE_SMOKE").map(std::path::PathBuf::from)
}
pub fn enabled() -> bool { output_path().is_some() }

#[tauri::command]
pub fn desktop_smoke_enabled() -> bool { enabled() }

#[tauri::command]
pub async fn desktop_smoke_report(app: tauri::AppHandle, window: tauri::WebviewWindow, report: serde_json::Value, state: tauri::State<'_, SmokeReports>) -> Result<(), String> {
    let Some(path) = output_path() else { return Err("diagnostics disabled".into()); };
    let mut reports = state.0.lock().map_err(|e| e.to_string())?;
    reports.insert(window.label().to_owned(), report);
    if !["main", "quick-memo", "pomodoro-float"].iter().all(|label| reports.contains_key(*label)) { return Ok(()); }
    let frontend_ok = reports.values().all(|r| r["ok"] == true);
    let native = (|| -> Result<serde_json::Value, String> {
        if app.tray_by_id("main-tray").is_none() { return Err("tray not created".into()); }
        for label in ["main", "quick-memo", "pomodoro-float"] {
            let w = app.get_webview_window(label).ok_or(format!("missing {label}"))?;
            let size = w.inner_size().map_err(|e| e.to_string())?;
            if size.width == 0 || size.height == 0 { return Err(format!("empty window {label}")); }
            w.hide().map_err(|e| e.to_string())?;
            w.show().map_err(|e| e.to_string())?;
            w.unminimize().map_err(|e| e.to_string())?;
            w.set_focus().map_err(|e| e.to_string())?;
        }
        // Exercise the platform-resolved app data directory with Unicode file names.
        let root = app.path().app_data_dir().map_err(|e| e.to_string())?.join("native-smoke");
        std::fs::create_dir_all(&root).map_err(|e| e.to_string())?;
        let marker = root.join("installed-persistence.txt");
        let persisted = marker.exists();
        if persisted && std::fs::read_to_string(&marker).map_err(|e| e.to_string())? != "中文持久数据🍵" { return Err("reinstall changed data".into()); }
        if !persisted { std::fs::write(&marker, "中文持久数据🍵").map_err(|e| e.to_string())?; }
        let file = root.join("中文 路径验证.txt");
        std::fs::write(&file, "个人工作台🍵").map_err(|e| e.to_string())?;
        if std::fs::read_to_string(&file).map_err(|e| e.to_string())? != "个人工作台🍵" { return Err("unicode roundtrip".into()); }
        std::fs::remove_file(&file).map_err(|e| e.to_string())?;
        Ok(serde_json::json!({"trayCreated":true,"windowApiCalls":true,"unicodeAppData":true,"persistedFromPreviousLaunch":persisted,"os":std::env::consts::OS}))
    })();
    let ok = frontend_ok && native.is_ok();
    let result = serde_json::json!({"ok":ok,"webviews":*reports,"native":native.as_ref().ok(),"nativeError":native.as_ref().err()});
    std::fs::write(path, serde_json::to_vec_pretty(&result).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    app.exit(if ok { 0 } else { 1 });
    Ok(())
}
