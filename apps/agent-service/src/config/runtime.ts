import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_MEMORY, DEFAULT_PERMISSIONS, DEFAULT_SETTINGS, DEFAULT_TASKS } from "@my-pet/shared-config";
import type { AgentTask, AppSettings, MemoryProfile, PermissionSettings } from "@my-pet/shared-types";

function findRepoRoot(startDir: string) {
  let current = startDir;

  while (!existsSync(join(current, "pnpm-workspace.yaml"))) {
    const parent = dirname(current);
    if (parent === current) {
      throw new Error("Unable to locate workspace root.");
    }
    current = parent;
  }

  return current;
}

export const repoRoot = findRepoRoot(process.cwd());
export const dataDir = join(repoRoot, "data");
export const logDir = join(dataDir, "logs");

export const dataFiles = {
  settings: join(dataDir, "settings.json"),
  permissions: join(dataDir, "permissions.json"),
  memories: join(dataDir, "memories.json"),
  tasks: join(dataDir, "tasks.json")
};

export function ensureDataFiles() {
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });

  if (!existsSync(dataFiles.settings)) {
    writeJsonFile<AppSettings>(dataFiles.settings, DEFAULT_SETTINGS);
  }

  if (!existsSync(dataFiles.permissions)) {
    writeJsonFile<PermissionSettings>(dataFiles.permissions, DEFAULT_PERMISSIONS);
  }

  if (!existsSync(dataFiles.memories)) {
    writeJsonFile<MemoryProfile>(dataFiles.memories, DEFAULT_MEMORY);
  }

  if (!existsSync(dataFiles.tasks)) {
    writeJsonFile<AgentTask[]>(dataFiles.tasks, DEFAULT_TASKS);
  }
}

export function readJsonFile<TValue>(filePath: string): TValue {
  return JSON.parse(readFileSync(filePath, "utf8")) as TValue;
}

function formatJsonValue(value: unknown, indentLevel = 0): string {
  const indent = "  ".repeat(indentLevel);
  const nextIndent = "  ".repeat(indentLevel + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    const canInline = value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item));
    const inlineValue = `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;

    if (canInline && inlineValue.length <= 88) {
      return inlineValue;
    }

    return `[\n${value.map((item) => `${nextIndent}${formatJsonValue(item, indentLevel + 1)}`).join(",\n")}\n${indent}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return "{}";
    }

    return `{\n${entries
      .map(([key, entryValue]) => `${nextIndent}${JSON.stringify(key)}: ${formatJsonValue(entryValue, indentLevel + 1)}`)
      .join(",\n")}\n${indent}}`;
  }

  return JSON.stringify(value);
}

export function writeJsonFile<TValue>(filePath: string, value: TValue) {
  writeFileSync(filePath, formatJsonValue(value) + "\n", "utf8");
}
