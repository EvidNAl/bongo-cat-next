import { AGENT_SERVICE_URL } from "@my-pet/shared-config";
import type { AgentTask, ChatRequest, ChatResponse, ServiceHealth, SettingsBundle, TaskEventUpdate } from "@my-pet/shared-types";

async function request<TResponse>(path: string, init?: RequestInit, serviceUrl = AGENT_SERVICE_URL): Promise<TResponse> {
  const response = await fetch(`${serviceUrl}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as TResponse;
}

export function getServiceHealth(serviceUrl?: string) {
  return request<ServiceHealth>("/api/health", undefined, serviceUrl);
}

export function getTasks(serviceUrl?: string) {
  return request<AgentTask[]>("/api/tasks", undefined, serviceUrl);
}

export function sendChat(requestBody: ChatRequest, serviceUrl?: string) {
  return request<ChatResponse>(
    "/api/chat",
    {
      method: "POST",
      body: JSON.stringify(requestBody)
    },
    serviceUrl
  );
}

export function getSettingsFromAgent(serviceUrl?: string) {
  return request<SettingsBundle>("/api/settings", undefined, serviceUrl);
}

export function saveSettingsToAgent(bundle: SettingsBundle, serviceUrl?: string) {
  return request<SettingsBundle>(
    "/api/settings",
    {
      method: "PUT",
      body: JSON.stringify(bundle)
    },
    serviceUrl
  );
}

export function updateTaskEvent(taskId: string, payload: TaskEventUpdate, serviceUrl?: string) {
  return request<AgentTask>(
    `/api/tasks/${taskId}/events`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    serviceUrl
  );
}
