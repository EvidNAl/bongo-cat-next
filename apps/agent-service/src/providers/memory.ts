import { DEFAULT_MEMORY } from "@my-pet/shared-config";
import type { MemoryProfile } from "@my-pet/shared-types";
import { loadMemoryProfile, saveMemoryProfile } from "../memory/repository";

export function getMemoryProfile() {
  return loadMemoryProfile();
}

function normalizeEntries(entries: string[] | undefined, limit: number) {
  if (!entries) {
    return undefined;
  }

  return Array.from(
    new Set(
      entries
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  ).slice(0, limit);
}

export function updateMemoryProfile(profile: Partial<MemoryProfile>) {
  const current = loadMemoryProfile();

  const nextProfile: MemoryProfile = {
    nickname:
      typeof profile.nickname === "string"
        ? profile.nickname.trim() || current.nickname || DEFAULT_MEMORY.nickname
        : current.nickname || DEFAULT_MEMORY.nickname,
    preferences: normalizeEntries(profile.preferences, 12) ?? current.preferences,
    favoriteProjectPaths: normalizeEntries(profile.favoriteProjectPaths, 8) ?? current.favoriteProjectPaths
  };

  saveMemoryProfile(nextProfile);
  return nextProfile;
}

export function rememberFavoritePath(baseDir: string) {
  const memory = loadMemoryProfile();

  updateMemoryProfile({
    favoriteProjectPaths: [...memory.favoriteProjectPaths, baseDir]
  });
}
