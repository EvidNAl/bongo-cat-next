use tauri::{AppHandle, Emitter};

use crate::{commands::hotkey, storage, types::SettingsBundle};

#[tauri::command]
pub fn load_settings_bundle() -> Result<SettingsBundle, String> {
    storage::load_settings_bundle()
}

#[tauri::command]
pub fn save_settings_bundle(
    app_handle: AppHandle,
    bundle: SettingsBundle,
) -> Result<SettingsBundle, String> {
    let saved = storage::save_settings_bundle(&bundle)?;
    hotkey::apply_assistant_hotkey(&app_handle, &saved.settings.general.assistant_hotkey)?;
    app_handle
        .emit("settings-updated", &saved)
        .map_err(|error| error.to_string())?;
    storage::write_audit_log(
        "settings_update",
        "success",
        "Settings updated from desktop UI",
        None,
    )?;
    Ok(saved)
}
