import type { AppSettings, PermissionSettings, SettingsBundle } from "@my-pet/shared-types";
import { dataFiles, readJsonFile, writeJsonFile } from "../config/runtime";

export function getSettingsBundle(): SettingsBundle {
  const settings = readJsonFile<AppSettings>(dataFiles.settings);
  const permissions = readJsonFile<PermissionSettings>(dataFiles.permissions);

  return {
    settings,
    permissions
  };
}

export function saveSettingsBundle(bundle: SettingsBundle) {
  writeJsonFile(dataFiles.settings, bundle.settings);
  writeJsonFile(dataFiles.permissions, bundle.permissions);
}
