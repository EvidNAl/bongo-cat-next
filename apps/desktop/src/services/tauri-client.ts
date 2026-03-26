import { invoke } from "@tauri-apps/api/core";
import type { SettingsBundle, ToolExecutionResult } from "@my-pet/shared-types";
import { isTauriRuntime } from "@/utils/tauri";

export interface ExternalPetAppStatus {
  available: boolean;
  running: boolean;
  executablePath: string | null;
  executableName: string | null;
  pid: number | null;
  message: string;
}

function assertTauriRuntime() {
  if (!isTauriRuntime()) {
    throw new Error("This action is only available inside the Tauri desktop shell.");
  }
}

function navigateCurrentWindow(path: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedPath = path.endsWith("/") ? path : `${path}/`;
  const currentPath = window.location.pathname.endsWith("/")
    ? window.location.pathname
    : `${window.location.pathname}/`;

  if (currentPath === normalizedPath) {
    return;
  }

  window.location.assign(normalizedPath);
}

export async function showSettingsWindow() {
  navigateCurrentWindow("/settings/");
}

export async function showAssistantWindow() {
  navigateCurrentWindow("/");
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

export async function getPetAppStatus() {
  assertTauriRuntime();
  return invoke<ExternalPetAppStatus>("get_pet_app_status");
}

export async function launchPetApp() {
  assertTauriRuntime();
  return invoke<ExternalPetAppStatus>("launch_pet_app");
}

export async function stopPetApp() {
  assertTauriRuntime();
  return invoke<ExternalPetAppStatus>("stop_pet_app");
}

export async function revealPetApp() {
  assertTauriRuntime();
  return invoke("reveal_pet_app");
}
