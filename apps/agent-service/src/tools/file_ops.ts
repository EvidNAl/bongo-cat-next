import { randomUUID } from "node:crypto";
import type { PlannedToolCall } from "@my-pet/shared-types";

export function buildFileSearchPlan(baseDir: string, keyword: string): PlannedToolCall {
  return {
    id: randomUUID(),
    tool: "file_search",
    title: `Search ${keyword} in ${baseDir}`,
    rationale: "File search stays inside the allowed directory aliases.",
    risk: "low",
    requiresConfirmation: false,
    payload: {
      baseDir,
      keyword
    }
  };
}
