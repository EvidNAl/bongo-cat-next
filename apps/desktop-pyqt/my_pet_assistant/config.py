from __future__ import annotations

import copy
import json
import sys
from pathlib import Path
from typing import Any

APP_NAME = "My Pet Assistant"
APP_VERSION = "0.3.13"
WINDOWS_RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
WINDOWS_RUN_VALUE_NAME = "MyPetAssistantDesktopPet"

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


def _build_launch_on_startup_command() -> str | None:
    if sys.platform != "win32":
        return None

    if IS_FROZEN:
        return f'"{Path(sys.executable).resolve()}"'

    launcher = Path(sys.executable).resolve()
    pythonw_exe = launcher.with_name("pythonw.exe")
    if launcher.name.lower() == "python.exe" and pythonw_exe.exists():
        launcher = pythonw_exe

    main_script = ROOT_DIR / "apps" / "desktop-pyqt" / "main.py"
    return f'"{launcher}" "{main_script}"'


def sync_launch_on_startup_setting(settings: dict[str, Any]) -> dict[str, Any]:
    normalized = _merge_dict(DEFAULT_SETTINGS, settings)

    if sys.platform != "win32":
        normalized["general"]["launchOnStartup"] = False
        return normalized

    import winreg

    desired = bool(normalized["general"]["launchOnStartup"])
    launch_command = _build_launch_on_startup_command()

    with winreg.CreateKeyEx(
        winreg.HKEY_CURRENT_USER,
        WINDOWS_RUN_KEY,
        0,
        winreg.KEY_QUERY_VALUE | winreg.KEY_SET_VALUE,
    ) as run_key:
        if desired and launch_command:
            winreg.SetValueEx(run_key, WINDOWS_RUN_VALUE_NAME, 0, winreg.REG_SZ, launch_command)
            normalized["general"]["launchOnStartup"] = True
            return normalized

        try:
            winreg.DeleteValue(run_key, WINDOWS_RUN_VALUE_NAME)
        except FileNotFoundError:
            pass

    normalized["general"]["launchOnStartup"] = False
    return normalized
