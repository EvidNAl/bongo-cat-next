use crate::{
    storage,
    types::{PermissionSettings, SettingsBundle},
};

#[tauri::command]
pub fn load_permissions() -> Result<PermissionSettings, String> {
    storage::load_permissions()
}

#[tauri::command]
pub fn save_permissions(permissions: PermissionSettings) -> Result<PermissionSettings, String> {
    let mut bundle: SettingsBundle = storage::load_settings_bundle()?;
    bundle.settings.permissions = permissions.clone();
    bundle.permissions = permissions.clone();
    storage::save_settings_bundle(&bundle)?;
    storage::write_audit_log(
        "settings_update",
        "success",
        "Permissions updated from desktop UI",
        None,
    )?;
    Ok(permissions)
}
