import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { OperationLogEntry } from "@my-pet/shared-types";
import { logDir } from "../config/runtime";

export function writeAuditLog(entry: Omit<OperationLogEntry, "id" | "createdAt">) {
  const payload: OperationLogEntry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry
  };

  appendFileSync(join(logDir, "agent-service.jsonl"), JSON.stringify(payload) + "\n", "utf8");
}
