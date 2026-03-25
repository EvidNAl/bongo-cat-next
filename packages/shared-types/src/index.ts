export type ToolName = "open_app" | "open_url" | "run_command" | "file_search";
export type RiskLevel = "low" | "medium" | "high";
export type TaskStatus = "queued" | "pending" | "running" | "needs_confirmation" | "completed" | "failed";
export type ChatRole = "user" | "assistant" | "system";

export interface OpenAppPayload {
  appName: string;
}

export interface OpenUrlPayload {
  url: string;
}

export interface RunCommandPayload {
  commandId: string;
  args: string[];
}

export interface FileSearchPayload {
  baseDir: string;
  keyword: string;
}

export type ToolPayload = OpenAppPayload | OpenUrlPayload | RunCommandPayload | FileSearchPayload;

interface PlannedToolCallBase<TTool extends ToolName, TPayload extends ToolPayload> {
  id: string;
  tool: TTool;
  title: string;
  rationale: string;
  risk: RiskLevel;
  requiresConfirmation: boolean;
  payload: TPayload;
}

export type OpenAppToolCall = PlannedToolCallBase<"open_app", OpenAppPayload>;
export type OpenUrlToolCall = PlannedToolCallBase<"open_url", OpenUrlPayload>;
export type RunCommandToolCall = PlannedToolCallBase<"run_command", RunCommandPayload>;
export type FileSearchToolCall = PlannedToolCallBase<"file_search", FileSearchPayload>;
export type PlannedToolCall = OpenAppToolCall | OpenUrlToolCall | RunCommandToolCall | FileSearchToolCall;

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  actions?: PlannedToolCall[];
}

export interface AgentTask {
  id: string;
  title: string;
  source: "chat" | "quick_action" | "settings";
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  summary?: string;
  toolCall?: PlannedToolCall;
  result?: string;
  error?: string;
}

export interface ChatRequest {
  message: string;
  conversation: ChatMessage[];
}

export interface ChatResponse {
  reply: ChatMessage;
  tasks: AgentTask[];
}

export interface GeneralSettings {
  launchOnStartup: boolean;
  enableTray: boolean;
  language: "zh-CN" | "en-US";
  assistantHotkey: string;
}

export interface PetSettings {
  opacity: number;
  mirrorMode: boolean;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  modelId: "standard" | "keyboard" | "naximofu_2";
}

export interface AiSettings {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  codexEnabled: boolean;
  codexModel: string;
  serviceUrl: string;
}

export interface PermissionSettings {
  allowedApps: string[];
  allowedDirectories: string[];
  allowedCommands: string[];
  dangerousActionConfirmation: boolean;
}

export interface AppSettings {
  general: GeneralSettings;
  pet: PetSettings;
  ai: AiSettings;
  permissions: PermissionSettings;
}

export interface SettingsBundle {
  settings: AppSettings;
  permissions: PermissionSettings;
}

export interface MemoryProfile {
  nickname: string;
  preferences: string[];
  favoriteProjectPaths: string[];
}

export interface ServiceHealth {
  status: "ok" | "degraded";
  service: string;
  version: string;
  uptimeSeconds: number;
  pendingTasks: number;
  checkedAt: string;
}

export interface TaskEventUpdate {
  status: TaskStatus;
  result?: string;
  error?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  summary: string;
  output?: string;
  matches?: string[];
}

export interface AllowedApp {
  id: string;
  label: string;
  aliases: string[];
}

export interface AllowedCommand {
  id: string;
  label: string;
  description: string;
  risk: RiskLevel;
}

export type OperationAction = ToolName | "settings_update" | "memory_update";

export interface OperationLogEntry {
  id: string;
  source: "desktop" | "agent-service";
  action: OperationAction;
  status: "success" | "failure";
  summary: string;
  createdAt: string;
  detail?: string;
}
