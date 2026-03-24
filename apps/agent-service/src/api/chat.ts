import { randomUUID } from "node:crypto";
import type { AppSettings, ChatRequest, ChatResponse, PermissionSettings } from "@my-pet/shared-types";
import { dataFiles, readJsonFile } from "../config/runtime";
import { writeAuditLog } from "../audit/logger";
import { queueTasks } from "../orchestrator/executor";
import { planUserMessage } from "../orchestrator/planner";

export function handleChat(request: ChatRequest): ChatResponse {
  const settings = readJsonFile<AppSettings>(dataFiles.settings);
  const permissions = readJsonFile<PermissionSettings>(dataFiles.permissions);
  const plan = planUserMessage(request.message, settings, permissions);
  const tasks = queueTasks(plan.actions);

  writeAuditLog({
    source: "agent-service",
    action: tasks[0]?.toolCall?.tool ?? "settings_update",
    status: "success",
    summary: request.message,
    detail: plan.replyText
  });

  return {
    reply: {
      id: randomUUID(),
      role: "assistant",
      content: plan.replyText,
      createdAt: new Date().toISOString(),
      actions: plan.actions
    },
    tasks
  };
}
