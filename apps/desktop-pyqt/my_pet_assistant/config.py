from __future__ import annotations

import copy
import json
import sys
from pathlib import Path
from typing import Any

APP_NAME = "My Pet Assistant"
APP_VERSION = "0.3.11"

ROOT_DIR = Path(__file__).resolve().parents[3]
IS_FROZEN = bool(getattr(sys, "frozen", False))

if IS_FROZEN:
    RESOURCE_ROOT = Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
    APP_HOME = Path(sys.executable).resolve().parent
else:
    RESOURCE_ROOT = ROOT_DIR
    APP_HOME = ROOT_DIR

DATA_DIR = APP_HOME / "data"
SETTINGS_PATH = DATA_DIR / "settings.json"
ICON_PATH = (
    RESOURCE_ROOT / "assets" / "icon.ico"
    if IS_FROZEN
    else ROOT_DIR / "apps" / "desktop" / "src-tauri" / "icons" / "icon.ico"
)
TRAY_ICON_PATH = (
    RESOURCE_ROOT / "assets" / "tray.png"
    if IS_FROZEN
    else ROOT_DIR / "apps" / "desktop" / "src-tauri" / "assets" / "tray.png"
)
PET_SEQUENCE_DIR = (
    RESOURCE_ROOT / "assets" / "luo_xiaohei_sequences"
    if IS_FROZEN
    else ROOT_DIR / "apps" / "desktop-pyqt" / "assets" / "luo_xiaohei_sequences"
)

DEFAULT_SETTINGS: dict[str, Any] = {
    "general": {
        "launchOnStartup": False,
        "enableTray": True,
        "language": "zh-CN",
        "assistantHotkey": "Alt+Shift+B",
    },
    "pet": {
        "opacity": 92,
        "mirrorMode": False,
        "alwaysOnTop": True,
        "clickThrough": False,
        "modelId": "ink_cat",
    },
    "ai": {
        "apiKey": "",
        "baseUrl": "https://api.openai.com/v1",
        "defaultModel": "",
        "codexEnabled": False,
        "codexModel": "",
        "serviceUrl": "http://127.0.0.1:4343",
    },
    "permissions": {
        "allowedApps": ["vs-code", "browser", "notepad"],
        "allowedDirectories": ["workspace"],
        "allowedCommands": ["show_date", "list_workspace", "git_status", "whoami"],
        "dangerousActionConfirmation": True,
    },
}


def _merge_dict(defaults: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    merged: dict[str, Any] = copy.deepcopy(defaults)

    for key, value in incoming.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _merge_dict(merged[key], value)
        else:
            merged[key] = value

    return merged


def load_settings() -> dict[str, Any]:
    if not SETTINGS_PATH.exists():
        return copy.deepcopy(DEFAULT_SETTINGS)

    try:
        raw = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return copy.deepcopy(DEFAULT_SETTINGS)

    if not isinstance(raw, dict):
        return copy.deepcopy(DEFAULT_SETTINGS)

    return _merge_dict(DEFAULT_SETTINGS, raw)


def save_settings(settings: dict[str, Any]) -> dict[str, Any]:
    normalized = _merge_dict(DEFAULT_SETTINGS, settings)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SETTINGS_PATH.write_text(json.dumps(normalized, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return normalized
