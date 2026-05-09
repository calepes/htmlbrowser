mod commands;
mod paths;
mod protocol;
mod state;
mod storage;
mod watcher;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = state::new_state();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .register_uri_scheme_protocol(protocol::SCHEME, |ctx, req| protocol::handle(ctx, req))
        .invoke_handler(tauri::generate_handler![
            commands::workspace::get_startup_state,
            commands::workspace::open_workspace,
            commands::workspace::push_recent_workspace,
            commands::workspace::remove_recent_workspace,
            commands::fs::read_directory,
            commands::fs::read_workspace_file,
            commands::settings::get_trust_mode,
            commands::settings::set_trust_mode,
            commands::preview::show_preview,
            commands::preview::update_preview_bounds,
            commands::system::reveal_in_finder,
        ])
        .setup(|app| {
            // Force the main window to show; on macOS the transparent +
            // hudWindow effect can otherwise remain hidden until interaction.
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
