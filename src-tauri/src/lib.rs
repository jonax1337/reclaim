mod catalog;
mod error;
mod registry;
mod services;
mod appx;
mod powershell;
mod system;
mod backup;
mod commands;
mod inventory;
mod startup;
mod hardware;
mod drivers;
mod detect;
mod profiles;

use tracing_subscriber::EnvFilter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            commands::list_tweaks,
            commands::get_tweak_state,
            commands::apply_tweak,
            commands::revert_tweak,
            commands::apply_batch,
            commands::system_info,
            commands::list_winget_apps,
            commands::install_winget_app,
            commands::list_services,
            commands::set_service_startup,
            commands::start_service,
            commands::stop_service,
            commands::create_restore_point,
            commands::restart_as_admin,
            commands::list_activity,
            commands::list_apps_inventory,
            commands::install_known_app,
            commands::remove_app_package,
            commands::list_startup,
            commands::set_startup_enabled,
            commands::hardware_info,
            commands::list_drivers,
            commands::scan_driver_updates,
            commands::install_driver_updates,
            commands::detect_all_tweaks,
            commands::detect_one_tweak,
            commands::list_drift,
            commands::list_profiles,
            commands::export_config,
            commands::import_config,
            commands::diff_tweaks,
            commands::read_text_file,
            commands::write_text_file,
        ])
        .setup(|_app| {
            tracing::info!("reclaim started");
            // Fail loud if the compile-time tweak catalog has parse errors. Better to
            // refuse to start than to ship a silently-incomplete catalog.
            let errs = catalog::parse_errors();
            if !errs.is_empty() {
                let joined = errs.join("\n  - ");
                panic!("tweak catalog has parse errors:\n  - {joined}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
