import type { AgentTask, TaskEventUpdate } from "@my-pet/shared-types";
import { dataFiles, readJsonFile, writeJsonFile } from "../config/runtime";

export function getTasks() {
  return readJsonFile<AgentTask[]>(dataFiles.tasks);
}

export function updateTask(taskId: string, update: TaskEventUpdate) {
  const tasks = readJsonFile<AgentTask[]>(dataFiles.tasks);
  const nextTasks = tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          status: update.status,
          result: update.result ?? task.result,
          error: update.error ?? task.error,
          updatedAt: new Date().toISOString()
        }
      : task
  );

  writeJsonFile(dataFiles.tasks, nextTasks);

  return nextTasks.find((task) => task.id === taskId) ?? null;
}
