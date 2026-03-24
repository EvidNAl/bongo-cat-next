import { randomUUID } from "node:crypto";
import { ALLOWED_COMMANDS } from "@my-pet/shared-config";
import type { PlannedToolCall } from "@my-pet/shared-types";

export function buildRunCommandPlan(commandId: string, args: string[] = []): PlannedToolCall {
  const command = ALLOWED_COMMANDS.find((item) => item.id === commandId);

  return {
    id: randomUUID(),
    tool: "run_command",
    title: command ? `执行 ${command.label}` : `执行 ${commandId}`,
    rationale: "桌面桥会把这个请求映射到白名单命令。",
    risk: command?.risk ?? "medium",
    requiresConfirmation: true,
    payload: {
      commandId,
      args
    }
  };
}
