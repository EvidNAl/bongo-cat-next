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

export function planUserMessage(message: string, settings: AppSettings, permissions: PermissionSettings): PlanResult {
  const route = routeMessage(message);
  const memory = getMemoryProfile();
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

  if (!allowedActions.length) {
    return {
      replyText:
        actions.length === 0
          ? `${greeting}我已经把桌宠、聊天、工具桥和任务队列的骨架准备好了。你现在可以直接让我打开软件、打开网址、运行白名单命令，或者在允许目录里搜索文件。${describeOpenAIAvailability(settings)} ${describeCodexAvailability(settings)}`
          : `${greeting}我识别到了一个工具请求，但它目前不在权限白名单里。你可以先去设置页补充允许的软件、目录或命令，再让我继续。`,
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
    replyText: `${greeting}我已经整理出一份可执行计划：\n${planLines.join("\n")}\n${blockedLine}`.trim(),
    actions: allowedActions
  };
}
