import { randomUUID } from "node:crypto";
import type { PlannedToolCall } from "@my-pet/shared-types";

export function buildOpenAppPlan(appName: string): PlannedToolCall {
  return {
    id: randomUUID(),
    tool: "open_app",
    title: `Open ${appName}`,
    rationale: "This request maps cleanly to the local application launcher.",
    risk: "medium",
    requiresConfirmation: true,
    payload: {
      appName
    }
  };
}
