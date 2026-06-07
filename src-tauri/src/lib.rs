mod commands;
mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Database state — thread-safe rusqlite connection
        .manage(db::DbState::new())
        // Plugins (tauri-plugin-sql removed — we use our own db_* commands)
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
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
            // Database commands (libsql-rusqlite)
            commands::db_open,
            commands::db_close,
            commands::db_query,
            commands::db_execute,
            // Utility commands
            commands::get_env,
            commands::get_app_data_dir,
            commands::check_db_access,
            commands::delete_file,
            commands::save_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
