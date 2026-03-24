import type { AgentTask, ServiceHealth } from "@my-pet/shared-types";
import { dataFiles, readJsonFile } from "../config/runtime";

export function getHealth(startedAt: number): ServiceHealth {
  const tasks = readJsonFile<AgentTask[]>(dataFiles.tasks);
  const pendingTasks = tasks.filter((task) => task.status !== "completed" && task.status !== "failed").length;

  return {
    status: "ok",
    service: "agent-service",
    version: "0.1.0",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    pendingTasks,
    checkedAt: new Date().toISOString()
  };
}
