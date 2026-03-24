import { randomUUID } from "node:crypto";
import type { AgentTask, PlannedToolCall } from "@my-pet/shared-types";
import { dataFiles, readJsonFile, writeJsonFile } from "../config/runtime";

export function queueTasks(actions: PlannedToolCall[]): AgentTask[] {
  if (actions.length === 0) {
    return [];
  }

  const now = new Date().toISOString();
  const existingTasks = readJsonFile<AgentTask[]>(dataFiles.tasks);
  const nextTasks = actions.map<AgentTask>((action) => ({
    id: randomUUID(),
    title: action.title,
    source: "chat",
    status: action.requiresConfirmation ? "needs_confirmation" : "queued",
    createdAt: now,
    updatedAt: now,
    summary: action.rationale,
    toolCall: action
  }));

  writeJsonFile(dataFiles.tasks, [...nextTasks, ...existingTasks].slice(0, 40));

  return nextTasks;
}
