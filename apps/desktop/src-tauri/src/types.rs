use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneralSettings {
    pub launch_on_startup: bool,
    pub enable_tray: bool,
    pub language: String,
    pub assistant_hotkey: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PetSettings {
    pub opacity: u8,
    pub mirror_mode: bool,
    pub always_on_top: bool,
    pub click_through: bool,
    pub model_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSettings {
    pub api_key: String,
    pub base_url: String,
    pub default_model: String,
    pub codex_enabled: bool,
    pub codex_model: String,
    pub service_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionSettings {
    pub allowed_apps: Vec<String>,
    pub allowed_directories: Vec<String>,
    pub allowed_commands: Vec<String>,
    pub dangerous_action_confirmation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub general: GeneralSettings,
    pub pet: PetSettings,
    pub ai: AiSettings,
    pub permissions: PermissionSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsBundle {
    pub settings: AppSettings,
    pub permissions: PermissionSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolExecutionResult {
    pub success: bool,
    pub summary: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub matches: Option<Vec<String>>,
}

impl Default for PermissionSettings {
    fn default() -> Self {
        Self {
            allowed_apps: vec![
                "vs-code".to_string(),
                "browser".to_string(),
                "notepad".to_string(),
            ],
            allowed_directories: vec!["workspace".to_string()],
            allowed_commands: vec![
                "show_date".to_string(),
                "list_workspace".to_string(),
                "git_status".to_string(),
                "whoami".to_string(),
            ],
            dangerous_action_confirmation: true,
        }
    }
}

impl Default for AppSettings {
    fn default() -> Self {
        let permissions = PermissionSettings::default();

        Self {
            general: GeneralSettings {
                launch_on_startup: false,
                enable_tray: true,
                language: "zh-CN".to_string(),
                assistant_hotkey: "Alt+Shift+B".to_string(),
            },
            pet: PetSettings {
                opacity: 92,
                mirror_mode: false,
                always_on_top: true,
                click_through: false,
                model_id: "ink_cat".to_string(),
            },
            ai: AiSettings {
                api_key: String::new(),
                base_url: "https://api.openai.com/v1".to_string(),
                default_model: String::new(),
                codex_enabled: false,
                codex_model: String::new(),
                service_url: "http://127.0.0.1:4343".to_string(),
            },
            permissions: permissions.clone(),
        }
    }
}

impl Default for SettingsBundle {
    fn default() -> Self {
        let settings = AppSettings::default();
        let permissions = settings.permissions.clone();

        Self {
            settings,
            permissions,
        }
    }
}
