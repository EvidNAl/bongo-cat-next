import { randomUUID } from "node:crypto";
import { ALLOWED_COMMANDS } from "@my-pet/shared-config";
import type { PlannedToolCall } from "@my-pet/shared-types";

export function buildRunCommandPlan(commandId: string, args: string[] = []): PlannedToolCall {
  const command = ALLOWED_COMMANDS.find((item) => item.id === commandId);

  return {
    id: randomUUID(),
    tool: "run_command",
    title: command ? `Run ${command.label}` : `Run ${commandId}`,
    rationale: "The desktop bridge will map this request to a whitelisted local command.",
    risk: command?.risk ?? "medium",
    requiresConfirmation: true,
    payload: {
      commandId,
      args
    }
  };
}
