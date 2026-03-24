use std::sync::Mutex;

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutEvent, ShortcutState};

const MAIN_WINDOW_LABEL: &str = "main";

#[derive(Default)]
pub struct AssistantHotkeyState {
    pub current: Mutex<Option<Shortcut>>,
}

pub fn initialize_saved_hotkey<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let bundle = crate::storage::load_settings_bundle()?;
    apply_assistant_hotkey(app, &bundle.settings.general.assistant_hotkey)
}

pub fn apply_assistant_hotkey<R: Runtime>(
    app: &AppHandle<R>,
    shortcut_text: &str,
) -> Result<(), String> {
    let state = app.state::<AssistantHotkeyState>();
    let mut current_shortcut = state
        .current
        .lock()
        .map_err(|_| "Failed to access assistant hotkey state.".to_string())?;

    if let Some(previous) = current_shortcut.take() {
        app.global_shortcut()
            .unregister(previous)
            .map_err(|error| error.to_string())?;
    }

    let trimmed = shortcut_text.trim();
    if trimmed.is_empty() {
        return Ok(());
    }

    let shortcut: Shortcut = trimmed
        .parse()
        .map_err(|error| format!("Invalid shortcut `{trimmed}`: {error}"))?;

    app.global_shortcut()
        .register(shortcut.clone())
        .map_err(|error| error.to_string())?;

    *current_shortcut = Some(shortcut);

    Ok(())
}

pub fn on_shortcut_event<R: Runtime>(
    app: &AppHandle<R>,
    shortcut: &Shortcut,
    event: ShortcutEvent,
) {
    if event.state() != ShortcutState::Pressed {
        return;
    }

    let should_toggle = app
        .state::<AssistantHotkeyState>()
        .current
        .lock()
        .ok()
        .and_then(|current| current.clone())
        .as_ref()
        == Some(shortcut);

    if should_toggle {
        let _ = toggle_main_window(app);
    }
}

fn toggle_main_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "Main window not found.".to_string())?;

    let is_visible = window.is_visible().map_err(|error| error.to_string())?;
    let is_focused = if is_visible {
        window.is_focused().unwrap_or(false)
    } else {
        false
    };

    if is_visible && is_focused {
        window.hide().map_err(|error| error.to_string())?;
    } else {
        let _ = window.unminimize();
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn register_assistant_hotkey(
    app_handle: AppHandle,
    shortcut: String,
) -> Result<String, String> {
    apply_assistant_hotkey(&app_handle, &shortcut)?;
    Ok(shortcut)
}
