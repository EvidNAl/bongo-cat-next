import type { MemoryProfile } from "@my-pet/shared-types";
import { dataFiles, readJsonFile, writeJsonFile } from "../config/runtime";

export function loadMemoryProfile() {
  return readJsonFile<MemoryProfile>(dataFiles.memories);
}

export function saveMemoryProfile(profile: MemoryProfile) {
  writeJsonFile(dataFiles.memories, profile);
}
