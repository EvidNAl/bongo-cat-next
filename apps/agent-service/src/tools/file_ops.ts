import { randomUUID } from "node:crypto";
import { WORKSPACE_ALIAS } from "@my-pet/shared-config";
import type { PlannedToolCall } from "@my-pet/shared-types";

function getProjectName(baseDir: string) {
  const normalized = baseDir.replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);

  return segments.at(-1) ?? baseDir;
}

export function buildFileSearchPlan(baseDir: string, keyword: string): PlannedToolCall {
  const inWorkspace = baseDir === WORKSPACE_ALIAS;
  const projectName = getProjectName(baseDir);

  return {
    id: randomUUID(),
    tool: "file_search",
    title: inWorkspace ? `搜索 ${keyword}` : `在 ${projectName} 搜索 ${keyword}`,
    rationale: inWorkspace ? "会在当前允许的工作区里搜索文件名。" : "会优先使用你记住的常用项目路径搜索文件名。",
    risk: "low",
    requiresConfirmation: false,
    payload: {
      baseDir,
      keyword
    }
  };
}
