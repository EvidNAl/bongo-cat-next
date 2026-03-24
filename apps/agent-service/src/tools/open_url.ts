import { randomUUID } from "node:crypto";
import type { PlannedToolCall } from "@my-pet/shared-types";

export function buildOpenUrlPlan(url: string): PlannedToolCall {
  return {
    id: randomUUID(),
    tool: "open_url",
    title: "打开网址",
    rationale: `会交给系统默认浏览器处理：${url}`,
    risk: "low",
    requiresConfirmation: false,
    payload: {
      url
    }
  };
}
