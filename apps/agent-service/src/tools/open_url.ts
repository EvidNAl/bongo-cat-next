import { randomUUID } from "node:crypto";
import type { PlannedToolCall } from "@my-pet/shared-types";

export function buildOpenUrlPlan(url: string): PlannedToolCall {
  return {
    id: randomUUID(),
    tool: "open_url",
    title: `Open ${url}`,
    rationale: "URL requests can be handed to the default system browser.",
    risk: "low",
    requiresConfirmation: false,
    payload: {
      url
    }
  };
}
