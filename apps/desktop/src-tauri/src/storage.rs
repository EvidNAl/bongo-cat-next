use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

use chrono::Utc;
use serde::Serialize;
use serde_json::json;

use crate::types::{PermissionSettings, SettingsBundle};

const WORKSPACE_ALIAS: &str = "workspace";

pub fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("..")
        .canonicalize()
        .unwrap_or_else(|_| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("..")
                .join("..")
                .join("..")
        })
}

pub fn data_dir() -> PathBuf {
    workspace_root().join("data")
}

pub fn settings_path() -> PathBuf {
    data_dir().join("settings.json")
}

pub fn permissions_path() -> PathBuf {
    data_dir().join("permissions.json")
}

pub fn memories_path() -> PathBuf {
    data_dir().join("memories.json")
}

pub fn tasks_path() -> PathBuf {
    data_dir().join("tasks.json")
}

pub fn log_dir() -> PathBuf {
    data_dir().join("logs")
}

pub fn ensure_data_files() -> Result<(), String> {
    fs::create_dir_all(data_dir()).map_err(|error| error.to_string())?;
    fs::create_dir_all(log_dir()).map_err(|error| error.to_string())?;

    if !settings_path().exists() {
        write_json(&settings_path(), &SettingsBundle::default().settings)?;
    }

    if !permissions_path().exists() {
        write_json(&permissions_path(), &PermissionSettings::default())?;
    }

    if !memories_path().exists() {
        write_json(
            &memories_path(),
            &json!({
                "nickname": "朋友",
                "preferences": ["偏好中文交流", "希望先确认高风险操作"],
                "favoriteProjectPaths": []
            }),
        )?;
    }

    if !tasks_path().exists() {
        write_json(&tasks_path(), &json!([]))?;
    }

    Ok(())
}

pub fn load_settings_bundle() -> Result<SettingsBundle, String> {
    ensure_data_files()?;

    let settings = read_json::<crate::types::AppSettings>(&settings_path())?;
    let permissions = read_json::<PermissionSettings>(&permissions_path())?;

    Ok(SettingsBundle {
        settings,
        permissions,
    })
}

pub fn save_settings_bundle(bundle: &SettingsBundle) -> Result<SettingsBundle, String> {
    ensure_data_files()?;
    write_json(&settings_path(), &bundle.settings)?;
    write_json(&permissions_path(), &bundle.permissions)?;
    Ok(bundle.clone())
}

pub fn load_permissions() -> Result<PermissionSettings, String> {
    ensure_data_files()?;
    read_json(&permissions_path())
}

pub fn resolve_allowed_directory(alias: &str, permissions: &PermissionSettings) -> Result<PathBuf, String> {
    if !permissions.allowed_directories.iter().any(|value| value == alias) {
        return Err(format!("Directory alias `{alias}` is not allowed."));
    }

    if alias == WORKSPACE_ALIAS {
        return Ok(workspace_root());
    }

    let candidate = PathBuf::from(alias);
    candidate
        .canonicalize()
        .map_err(|error| format!("Failed to resolve directory `{alias}`: {error}"))
}

pub fn write_audit_log(action: &str, status: &str, summary: &str, detail: Option<&str>) -> Result<(), String> {
    ensure_data_files()?;

    let payload = json!({
        "id": format!("desktop-{}", Utc::now().timestamp_millis()),
        "source": "desktop",
        "action": action,
        "status": status,
        "summary": summary,
        "detail": detail,
        "createdAt": Utc::now().to_rfc3339(),
    });

    let file_path = log_dir().join("desktop.jsonl");
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(file_path)
        .map_err(|error| error.to_string())?;

    writeln!(file, "{}", payload).map_err(|error| error.to_string())
}

fn read_json<TValue>(path: &Path) -> Result<TValue, String>
where
    TValue: serde::de::DeserializeOwned,
{
    let content = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str::<TValue>(&content).map_err(|error| error.to_string())
}

fn write_json<TValue>(path: &Path, value: &TValue) -> Result<(), String>
where
    TValue: Serialize,
{
    let content = serde_json::to_string_pretty(value).map_err(|error| error.to_string())?;
    fs::write(path, format!("{content}\n")).map_err(|error| error.to_string())
}
