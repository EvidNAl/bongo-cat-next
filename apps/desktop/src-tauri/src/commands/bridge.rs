use std::process::Command;

use walkdir::WalkDir;

use crate::{
    storage,
    types::{PermissionSettings, ToolExecutionResult},
};

fn run_output_hidden(command: &mut Command) -> Result<std::process::Output, std::io::Error> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    command.output()
}

fn spawn_hidden(command: &mut Command) -> Result<(), std::io::Error> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    command.spawn().map(|_| ())
}

fn ensure_app_allowed(app_name: &str, permissions: &PermissionSettings) -> Result<(), String> {
    if permissions.allowed_apps.iter().any(|value| value == app_name) {
        Ok(())
    } else {
        Err(format!("App `{app_name}` is not allowed by the current permissions."))
    }
}

fn ensure_command_allowed(command_id: &str, permissions: &PermissionSettings) -> Result<(), String> {
    if permissions
        .allowed_commands
        .iter()
        .any(|value| value == command_id)
    {
        Ok(())
    } else {
        Err(format!(
            "Command `{command_id}` is not allowed by the current permissions."
        ))
    }
}

fn escape_powershell_path(path: &str) -> String {
    path.replace('\'', "''")
}

fn truncate_output(value: &str) -> String {
    let trimmed = value.trim();

    if trimmed.chars().count() <= 280 {
        return trimmed.to_string();
    }

    let shortened: String = trimmed.chars().take(280).collect();
    format!("{shortened}...")
}

fn open_url_internal(url: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        spawn_hidden(Command::new("rundll32").args(["url.dll,FileProtocolHandler", url]))
            .map(|_| ())
            .map_err(|error| error.to_string())
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|error| error.to_string())
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|error| error.to_string())
    }
}

#[tauri::command]
pub fn open_app(app_name: String) -> Result<ToolExecutionResult, String> {
    let permissions = storage::load_permissions()?;
    ensure_app_allowed(&app_name, &permissions)?;

    match app_name.as_str() {
        "vs-code" => {
            let mut command = Command::new("code");
            spawn_hidden(&mut command).map_err(|error| error.to_string())?;
        }
        "notepad" => {
            let mut command = Command::new("notepad");
            spawn_hidden(&mut command).map_err(|error| error.to_string())?;
        }
        "browser" => {
            open_url_internal("https://example.com")?;
        }
        _ => {
            return Err(format!("Unsupported app id `{app_name}`."));
        }
    }

    let summary = format!("Opened app `{app_name}`.");
    storage::write_audit_log("open_app", "success", &summary, None)?;

    Ok(ToolExecutionResult {
        success: true,
        summary,
        output: None,
        matches: None,
    })
}

#[tauri::command]
pub fn open_url(url: String) -> Result<ToolExecutionResult, String> {
    open_url_internal(&url)?;
    let summary = format!("Opened URL `{url}`.");
    storage::write_audit_log("open_url", "success", &summary, None)?;

    Ok(ToolExecutionResult {
        success: true,
        summary,
        output: None,
        matches: None,
    })
}

#[tauri::command]
pub fn run_command(command_id: String, _args: Vec<String>) -> Result<ToolExecutionResult, String> {
    let permissions = storage::load_permissions()?;
    ensure_command_allowed(&command_id, &permissions)?;

    let workspace = escape_powershell_path(storage::workspace_root().to_string_lossy().as_ref());
    let script = match command_id.as_str() {
        "show_date" => "Get-Date -Format o".to_string(),
        "list_workspace" => format!("Get-ChildItem -Force '{workspace}'"),
        "git_status" => format!("git -C '{workspace}' status --short"),
        "whoami" => "whoami".to_string(),
        _ => return Err(format!("Unsupported command id `{command_id}`.")),
    };

    let output = run_output_hidden(Command::new("powershell").args(["-NoProfile", "-Command", &script]))
        .map_err(|error| error.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let success = output.status.success();
    let summary = if success {
        format!("Command `{command_id}` executed successfully.")
    } else {
        format!("Command `{command_id}` failed.")
    };

    storage::write_audit_log(
        "run_command",
        if success { "success" } else { "failure" },
        &summary,
        Some(if success { stdout.as_str() } else { stderr.as_str() }),
    )?;

    Ok(ToolExecutionResult {
        success,
        summary,
        output: Some(truncate_output(if success { &stdout } else { &stderr })),
        matches: None,
    })
}

#[tauri::command]
pub fn file_search(base_dir: String, keyword: String) -> Result<ToolExecutionResult, String> {
    let permissions = storage::load_permissions()?;
    let directory = storage::resolve_allowed_directory(&base_dir, &permissions)?;
    let keyword_lower = keyword.to_lowercase();
    let workspace_root = storage::workspace_root();

    let matches = WalkDir::new(&directory)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().to_lowercase();
            if name.contains(&keyword_lower) {
                Some(entry.into_path())
            } else {
                None
            }
        })
        .take(20)
        .map(|path| {
            path.strip_prefix(&workspace_root)
                .map(|relative| relative.to_string_lossy().replace('\\', "/"))
                .unwrap_or_else(|_| path.to_string_lossy().replace('\\', "/"))
        })
        .collect::<Vec<_>>();

    let summary = if matches.is_empty() {
        format!("No files matched `{keyword}` inside `{base_dir}`.")
    } else {
        format!(
            "Found {} file(s) matching `{keyword}` inside `{base_dir}`.",
            matches.len()
        )
    };

    storage::write_audit_log("file_search", "success", &summary, Some(&matches.join("\n")))?;

    Ok(ToolExecutionResult {
        success: true,
        summary,
        output: None,
        matches: Some(matches),
    })
}
