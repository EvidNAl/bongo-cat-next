import type { MemoryProfile } from "@my-pet/shared-types";
import { getMemoryProfile, updateMemoryProfile } from "../providers/memory";

export function getMemory() {
  return getMemoryProfile();
}

export function saveMemory(profile: Partial<MemoryProfile>) {
  return updateMemoryProfile(profile);
}
