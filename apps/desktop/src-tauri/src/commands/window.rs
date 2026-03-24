use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

const SETTINGS_WINDOW_LABEL: &str = "settings";

#[tauri::command]
pub fn show_settings_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(SETTINGS_WINDOW_LABEL) {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app_handle,
        SETTINGS_WINDOW_LABEL,
        WebviewUrl::App("/settings/".into()),
    )
    .title("My Pet Assistant Settings")
    .inner_size(1120.0, 780.0)
    .min_inner_size(960.0, 680.0)
    .resizable(true)
    .center()
    .build()
    .map(|_| ())
    .map_err(|error| error.to_string())
}
