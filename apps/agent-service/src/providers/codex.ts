import type { AppSettings } from "@my-pet/shared-types";

export function describeCodexAvailability(settings: AppSettings) {
  if (!settings.ai.codexEnabled) {
    return "Codex 入口已经预留，但当前处于关闭状态。";
  }

  if (!settings.ai.codexModel) {
    return "Codex 已开启，但还没有配置模型名称。";
  }

  return `Codex 已启用，后续可以把代码类任务路由到 ${settings.ai.codexModel}。`;
}
