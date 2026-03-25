use tauri::{AppHandle, Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub const MAIN_WINDOW_LABEL: &str = "main";
pub const SETTINGS_WINDOW_LABEL: &str = "settings";
pub const PET_WINDOW_LABEL: &str = "pet";

fn focus_window(window: &WebviewWindow) -> Result<(), String> {
    let _ = window.unminimize();
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

fn position_pet_window(window: &WebviewWindow) -> Result<(), String> {
    let Some(monitor) = window
        .current_monitor()
        .map_err(|error| error.to_string())?
    else {
        return Ok(());
    };

    let monitor_position = monitor.position();
    let monitor_size = monitor.size();
    let window_size = window.outer_size().map_err(|error| error.to_string())?;

    let margin_x = 36;
    let margin_y = 56;
    let min_x = monitor_position.x + 16;
    let min_y = monitor_position.y + 16;
    let target_x =
        monitor_position.x + monitor_size.width as i32 - window_size.width as i32 - margin_x;
    let target_y =
        monitor_position.y + monitor_size.height as i32 - window_size.height as i32 - margin_y;

    window
        .set_position(PhysicalPosition::new(target_x.max(min_x), target_y.max(min_y)))
        .map_err(|error| error.to_string())
}

pub fn ensure_pet_window(app_handle: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(window) = app_handle.get_webview_window(PET_WINDOW_LABEL) {
        return Ok(window);
    }

    let window = WebviewWindowBuilder::new(app_handle, PET_WINDOW_LABEL, WebviewUrl::App("/pet/".into()))
        .title("My Pet Assistant Pet")
        .inner_size(420.0, 420.0)
        .min_inner_size(320.0, 320.0)
        .resizable(false)
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .shadow(false)
        .skip_taskbar(true)
        .center()
        .build()
        .map_err(|error| error.to_string())?;

    position_pet_window(&window)?;
    Ok(window)
}

#[tauri::command]
pub fn show_main_window(app_handle: AppHandle) -> Result<(), String> {
    let window = app_handle
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "Main window not found.".to_string())?;

    focus_window(&window)
}

#[tauri::command]
pub fn show_pet_window(app_handle: AppHandle) -> Result<(), String> {
    let window = ensure_pet_window(&app_handle)?;
    focus_window(&window)?;
    position_pet_window(&window)
}

#[tauri::command]
pub fn show_settings_window(app_handle: AppHandle) -> Result<(), String> {
    if let Some(pet_window) = app_handle.get_webview_window(PET_WINDOW_LABEL) {
        let _ = pet_window.hide();
    }

    if let Some(window) = app_handle.get_webview_window(SETTINGS_WINDOW_LABEL) {
        return focus_window(&window);
    }

    let window = WebviewWindowBuilder::new(
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
    .map_err(|error| error.to_string())?;

    focus_window(&window)
}
