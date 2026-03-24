import type { MemoryProfile } from "@my-pet/shared-types";
import { loadMemoryProfile, saveMemoryProfile } from "../memory/repository";

export function getMemoryProfile() {
  return loadMemoryProfile();
}

export function rememberFavoritePath(baseDir: string) {
  const memory = loadMemoryProfile();

  if (!memory.favoriteProjectPaths.includes(baseDir)) {
    const updated: MemoryProfile = {
      ...memory,
      favoriteProjectPaths: [...memory.favoriteProjectPaths, baseDir].slice(-8)
    };
    saveMemoryProfile(updated);
  }
}
