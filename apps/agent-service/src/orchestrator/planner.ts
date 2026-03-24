import { WORKSPACE_ALIAS } from "@my-pet/shared-config";
import type { AppSettings, PermissionSettings, PlannedToolCall } from "@my-pet/shared-types";
import { describeCodexAvailability } from "../providers/codex";
import { getMemoryProfile } from "../providers/memory";
import { describeOpenAIAvailability } from "../providers/openai";
import { routeMessage } from "./router";
import { buildFileSearchPlan } from "../tools/file_ops";
import { buildOpenAppPlan } from "../tools/open_app";
import { buildOpenUrlPlan } from "../tools/open_url";
import { buildRunCommandPlan } from "../tools/run_command";
import { requiresConfirmation } from "../guard/confirm";
import { validatePlanAgainstPermissions } from "../guard/policy";
import { normalizeUrl } from "../tools/browser";

export interface PlanResult {
  replyText: string;
  actions: PlannedToolCall[];
}

function getProjectName(projectPath: string) {
  const normalized = projectPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);

  return segments.at(-1) ?? projectPath;
}

function buildMemorySummary() {
  const memory = getMemoryProfile();
  const preferenceLine = memory.preferences.length
    ? `已记住你的偏好：${memory.preferences.slice(0, 2).join("；")}。`
    : "";
  const favoriteProjects = memory.favoriteProjectPaths.map((projectPath) => getProjectName(projectPath));
  const projectLine = favoriteProjects.length ? `常用项目：${favoriteProjects.slice(0, 3).join("、")}。` : "";

  return {
    memory,
    summaryText: [preferenceLine, projectLine].filter(Boolean).join("\n")
  };
}

export function planUserMessage(message: string, settings: AppSettings, permissions: PermissionSettings): PlanResult {
  const { memory, summaryText } = buildMemorySummary();
  const route = routeMessage(message, memory.favoriteProjectPaths);
  const greeting = memory.nickname ? `${memory.nickname}，` : "";

  let actions: PlannedToolCall[] = [];

  switch (route.kind) {
    case "open_url":
      actions = [buildOpenUrlPlan(normalizeUrl(route.url))];
      break;
    case "open_app":
      actions = [buildOpenAppPlan(route.appName)];
      break;
    case "run_command":
      actions = [buildRunCommandPlan(route.commandId, route.args)];
      break;
    case "file_search":
      actions = [buildFileSearchPlan(route.baseDir, route.keyword)];
      break;
    case "chat":
      actions = [];
      break;
  }

  const allowedActions = actions.filter((action) => validatePlanAgainstPermissions(action, permissions));
  const blockedActions = actions.filter((action) => !validatePlanAgainstPermissions(action, permissions));
  const memoryHint =
    route.kind === "file_search" && route.baseDir !== WORKSPACE_ALIAS
      ? `这次会优先在你记住的常用项目「${getProjectName(route.baseDir)}」里检索。`
      : memory.preferences[0]
        ? `会沿用你的偏好：${memory.preferences[0]}。`
        : "";
  const blockedHint = blockedActions.some(
    (action) => action.tool === "file_search" && action.payload.baseDir !== WORKSPACE_ALIAS
  )
    ? "如果你希望搜索常用项目，请先在权限页把对应目录加入允许访问列表。"
    : "";

  if (!allowedActions.length) {
    return {
      replyText:
        actions.length === 0
          ? [
              `${greeting}我已经把桌宠、聊天、工具桥和任务队列的骨架准备好了。你现在可以直接让我打开软件、打开网址、运行白名单命令，或者在允许目录里搜索文件。${describeOpenAIAvailability(settings)} ${describeCodexAvailability(settings)}`,
              summaryText,
              memory.favoriteProjectPaths[0]
                ? `例如你可以直接说：“在 ${getProjectName(memory.favoriteProjectPaths[0])} 搜索 README”。`
                : ""
            ]
              .filter(Boolean)
              .join("\n")
          : [
              `${greeting}我识别到了一个工具请求，但它目前不在权限白名单里。你可以先去设置页补充允许的软件、目录或命令，再让我继续。`,
              blockedHint
            ]
              .filter(Boolean)
              .join("\n"),
      actions: []
    };
  }

  const planLines = allowedActions.map((action) => {
    const confirmLine = requiresConfirmation(action, permissions) ? "执行前会再次确认。" : "可以直接执行。";
    return `- ${action.title}。${action.rationale}${confirmLine}`;
  });

  const blockedLine = blockedActions.length
    ? `另外有 ${blockedActions.length} 个动作被权限策略拦住了。`
    : "";

  return {
    replyText: [`${greeting}我已经整理出一份可执行计划：`, memoryHint, planLines.join("\n"), blockedLine, blockedHint]
      .filter(Boolean)
      .join("\n")
      .trim(),
    actions: allowedActions
  };
}
