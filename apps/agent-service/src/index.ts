import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import type { ChatRequest, SettingsBundle, TaskEventUpdate } from "@my-pet/shared-types";
import { AGENT_SERVICE_PORT } from "@my-pet/shared-config";
import { writeAuditLog } from "./audit/logger";
import { handleChat } from "./api/chat";
import { getHealth } from "./api/health";
import { getSettingsBundle, saveSettingsBundle } from "./api/settings";
import { getTasks, updateTask } from "./api/tasks";
import { ensureDataFiles } from "./config/runtime";

function sendJson(response: ServerResponse, statusCode: number, payload: unknown) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody<TValue>(request: IncomingMessage) {
  return new Promise<TValue>((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString("utf8");
    });

    request.on("end", () => {
      try {
        resolve((body ? JSON.parse(body) : {}) as TValue);
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

export function createAgentServer(startedAt = Date.now()) {
  ensureDataFiles();

  return createServer(async (request, response) => {
    if (!request.url || !request.method) {
      sendJson(response, 400, { error: "Invalid request" });
      return;
    }

    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url, "http://127.0.0.1");

    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        sendJson(response, 200, getHealth(startedAt));
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/settings") {
        sendJson(response, 200, getSettingsBundle());
        return;
      }

      if (request.method === "PUT" && url.pathname === "/api/settings") {
        const bundle = await readJsonBody<SettingsBundle>(request);
        saveSettingsBundle(bundle);
        writeAuditLog({
          source: "agent-service",
          action: "settings_update",
          status: "success",
          summary: "Settings updated via agent-service"
        });
        sendJson(response, 200, bundle);
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/tasks") {
        sendJson(response, 200, getTasks());
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/chat") {
        const payload = await readJsonBody<ChatRequest>(request);
        sendJson(response, 200, handleChat(payload));
        return;
      }

      const taskEventMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/events$/);
      if (request.method === "POST" && taskEventMatch) {
        const payload = await readJsonBody<TaskEventUpdate>(request);
        const task = updateTask(taskEventMatch[1], payload);
        sendJson(response, 200, task ?? { error: "Task not found" });
        return;
      }

      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

export function startAgentService(port = AGENT_SERVICE_PORT): Server {
  const server = createAgentServer();

  server.listen(port, "127.0.0.1", () => {
    console.log(`agent-service listening on http://127.0.0.1:${port}`);
  });

  return server;
}

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";

if (import.meta.url === entryUrl) {
  startAgentService();
}
