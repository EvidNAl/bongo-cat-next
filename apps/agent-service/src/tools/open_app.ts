import { randomUUID } from "node:crypto";
import { ALLOWED_APPS } from "@my-pet/shared-config";
import type { PlannedToolCall } from "@my-pet/shared-types";

export function buildOpenAppPlan(appName: string): PlannedToolCall {
  const matchedApp = ALLOWED_APPS.find((app) => app.id === appName);

  return {
    id: randomUUID(),
    tool: "open_app",
    title: matchedApp ? `打开 ${matchedApp.label}` : `打开 ${appName}`,
    rationale: "这个请求可以直接映射到本地应用启动器。",
    risk: "medium",
    requiresConfirmation: true,
    payload: {
      appName
    }
  };
}
