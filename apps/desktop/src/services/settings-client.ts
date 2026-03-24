import { DEFAULT_PERMISSIONS, DEFAULT_SETTINGS } from "@my-pet/shared-config";
import type { SettingsBundle } from "@my-pet/shared-types";
import { isTauriRuntime } from "@/utils/tauri";
import { getSettingsFromAgent, saveSettingsToAgent } from "./agent-client";
import { loadSettingsBundleFromTauri, saveSettingsBundleToTauri } from "./tauri-client";

const fallbackBundle: SettingsBundle = {
  settings: DEFAULT_SETTINGS,
  permissions: DEFAULT_PERMISSIONS
};

export async function loadSettingsBundle() {
  try {
    if (isTauriRuntime()) {
      return await loadSettingsBundleFromTauri();
    }

    return await getSettingsFromAgent();
  } catch {
    return fallbackBundle;
  }
}

export async function saveSettingsBundle(bundle: SettingsBundle) {
  if (isTauriRuntime()) {
    return saveSettingsBundleToTauri(bundle);
  }

  return saveSettingsToAgent(bundle);
}
