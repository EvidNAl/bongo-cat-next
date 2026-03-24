import { invoke } from "@tauri-apps/api/core";
import type { SettingsBundle, ToolExecutionResult } from "@my-pet/shared-types";
import { isTauriRuntime } from "@/utils/tauri";

function assertTauriRuntime() {
  if (!isTauriRuntime()) {
    throw new Error("This action is only available inside the Tauri desktop shell.");
  }
}

export async function showSettingsWindow() {
  if (!isTauriRuntime()) {
    window.open("/settings", "_blank", "noopener");
    return;
  }

  await invoke("show_settings_window");
}

export async function loadSettingsBundleFromTauri() {
  assertTauriRuntime();
  return invoke<SettingsBundle>("load_settings_bundle");
}

export async function saveSettingsBundleToTauri(bundle: SettingsBundle) {
  assertTauriRuntime();
  return invoke<SettingsBundle>("save_settings_bundle", {
    bundle
  });
}

export async function openApp(appName: string) {
  assertTauriRuntime();
  return invoke<ToolExecutionResult>("open_app", {
    appName
  });
}

export async function openUrl(url: string) {
  if (!isTauriRuntime()) {
    window.open(url, "_blank", "noopener");
    return {
      success: true,
      summary: `Opened ${url} in the browser.`
    } satisfies ToolExecutionResult;
  }

  return invoke<ToolExecutionResult>("open_url", {
    url
  });
}

export async function runCommand(commandId: string, args: string[] = []) {
  assertTauriRuntime();
  return invoke<ToolExecutionResult>("run_command", {
    commandId,
    args
  });
}

export async function fileSearch(baseDir: string, keyword: string) {
  assertTauriRuntime();
  return invoke<ToolExecutionResult>("file_search", {
    baseDir,
    keyword
  });
}
