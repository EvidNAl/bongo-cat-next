import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { OperationLogEntry } from "@my-pet/shared-types";
import { logDir } from "../config/runtime";

const LOG_FILES = ["desktop.jsonl", "agent-service.jsonl"] as const;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

function readJsonLines(filePath: string) {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as OperationLogEntry];
      } catch {
        return [];
      }
    });
}

export function getAuditEntries(limit = DEFAULT_LIMIT) {
  const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));

  return LOG_FILES.map((fileName) => join(logDir, fileName))
    .flatMap((filePath) => readJsonLines(filePath))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, safeLimit);
}
