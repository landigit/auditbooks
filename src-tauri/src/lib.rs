pub mod db;
pub mod models;

use db::{
  db_close, db_connect, db_create, db_delete, db_delete_all, db_exists, db_get, db_get_all,
  db_get_single_values, db_insert, db_migrate, db_rename, db_set_schema_map, db_update,
  db_call_bespoke, DbState,
};
use std::sync::Mutex;
use tauri::Manager;


pub fn get_platform_inner() -> String {
  #[cfg(target_os = "windows")]
  return "win32".to_string();
  #[cfg(target_os = "macos")]
  return "darwin".to_string();
  #[cfg(not(any(target_os = "windows", target_os = "macos")))]
  return "linux".to_string();
}

#[tauri::command]
fn get_platform() -> String {
  get_platform_inner()
}

pub fn get_version_inner() -> String {
  env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_version() -> String {
  get_version_inner()
}

#[tauri::command]
fn get_db_default_path(
  app: tauri::AppHandle,
  company_name: String,
) -> Result<String, String> {
  let app_dir = app
    .path()
    .app_data_dir()
    .map_err(|e| e.to_string())?;
  std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
  // Sanitize company name for use as a filename
  let safe_name: String = company_name
    .chars()
    .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' { c } else { '_' })
    .collect();
  let db_path = app_dir.join(format!("{}.db", safe_name));
  Ok(db_path.to_string_lossy().to_string())
}

#[tauri::command]
#[allow(unused_variables)]
fn show_item_in_folder(file_path: String) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("explorer")
      .args(["/select,", &file_path])
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .args(["-R", &file_path])
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "linux")]
  {
    // Best effort on Linux: open the parent directory
    if let Some(parent) = std::path::Path::new(&file_path).parent() {
      std::process::Command::new("xdg-open")
        .arg(parent)
        .spawn()
        .map_err(|e| e.to_string())?;
    }
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .manage(DbState {
      conn: Mutex::new(None),
      schema_map: Mutex::new(None),
      current_uri: Mutex::new(None),
      local_path: Mutex::new(None),
    })
    .setup(|app| {
      #[cfg(target_os = "android")]
      {
        if let Some(window) = app.get_webview_window("main") {
          let _ = window.with_webview(|webview| {
            webview.jni_handle().exec(|env, context, _webview| {
              let vm = env.get_java_vm().expect("Failed to get JavaVM");
              let vm_ptr = vm.get_java_vm_pointer() as *mut std::ffi::c_void;
              let ctx_ptr = context.as_raw() as *mut std::ffi::c_void;
              unsafe {
                ndk_context::initialize_android_context(vm_ptr, ctx_ptr);
              }
            });
          });
        }
      }



      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_platform,
      get_version,
      get_db_default_path,
      show_item_in_folder,
      db_connect,
      db_create,
      db_set_schema_map,
      db_migrate,
      db_insert,
      db_get,
      db_get_all,
      db_update,
      db_delete,
      db_delete_all,
      db_exists,
      db_get_single_values,
      db_rename,
      db_close,
      db_call_bespoke,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
  use std::process::Command;

  #[test]
  fn test_frontend_vitest() {
    let output = if cfg!(target_os = "windows") {
      Command::new("powershell")
        .args(["-ExecutionPolicy", "Bypass", "-Command", "pnpm test"])
        .current_dir("../")
        .output()
        .expect("Failed to execute vitest process on Windows")
    } else {
      Command::new("pnpm")
        .arg("test")
        .current_dir("../")
        .output()
        .expect("Failed to execute vitest process on Unix")
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    println!("Vitest stdout:\n{}", stdout);
    println!("Vitest stderr:\n{}", stderr);

    assert!(
      output.status.success(),
      "Vitest frontend tests failed!\nSTDOUT:\n{}\nSTDERR:\n{}",
      stdout,
      stderr
    );
  }
}
