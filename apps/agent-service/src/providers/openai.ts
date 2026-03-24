import type { AppSettings } from "@my-pet/shared-types";

export function describeOpenAIAvailability(settings: AppSettings) {
  if (!settings.ai.apiKey) {
    return "当前还没有填入 OpenAI API Key，所以先使用本地规则编排。";
  }

  if (!settings.ai.defaultModel) {
    return "检测到 API Key，但默认模型还没配置，建议先在设置页补齐。";
  }

  return `已检测到 OpenAI 配置，后续可以把普通聊天接到 ${settings.ai.defaultModel}。`;
}
