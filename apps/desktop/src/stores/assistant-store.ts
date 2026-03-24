import { create } from "zustand";
import { DEFAULT_PERMISSIONS, DEFAULT_SETTINGS } from "@my-pet/shared-config";
import type { AgentTask, AppSettings, ChatMessage, PermissionSettings, PlannedToolCall, ServiceHealth } from "@my-pet/shared-types";

function createWelcomeMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content:
      "第一版已经收敛成“桌宠 + 聊天 + 打开软件/网址 + 白名单命令 + 文件搜索 + 设置页 + 权限确认”的开发路线。你可以直接在右侧输入需求，我会先生成可执行计划。",
    createdAt: new Date().toISOString()
  };
}

interface AssistantState {
  messages: ChatMessage[];
  tasks: AgentTask[];
  settings: AppSettings;
  permissions: PermissionSettings;
  health: ServiceHealth | null;
  isBootstrapping: boolean;
  isSending: boolean;
  serviceReachable: boolean;
  pendingAction: PlannedToolCall | null;
  pendingTaskId: string | null;
  setBootstrapState: (value: boolean) => void;
  setSendingState: (value: boolean) => void;
  setServiceReachable: (value: boolean) => void;
  setHealth: (health: ServiceHealth | null) => void;
  setSettingsBundle: (settings: AppSettings, permissions: PermissionSettings) => void;
  setTasks: (tasks: AgentTask[]) => void;
  addMessage: (message: ChatMessage) => void;
  addUserMessage: (content: string) => ChatMessage;
  upsertTask: (task: AgentTask) => void;
  setPendingAction: (action: PlannedToolCall | null, taskId?: string | null) => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  messages: [createWelcomeMessage()],
  tasks: [],
  settings: DEFAULT_SETTINGS,
  permissions: DEFAULT_PERMISSIONS,
  health: null,
  isBootstrapping: true,
  isSending: false,
  serviceReachable: false,
  pendingAction: null,
  pendingTaskId: null,
  setBootstrapState: (isBootstrapping) => {
    set({ isBootstrapping });
  },
  setSendingState: (isSending) => {
    set({ isSending });
  },
  setServiceReachable: (serviceReachable) => {
    set({ serviceReachable });
  },
  setHealth: (health) => {
    set({ health });
  },
  setSettingsBundle: (settings, permissions) => {
    set({
      settings: {
        ...settings,
        permissions
      },
      permissions
    });
  },
  setTasks: (tasks) => {
    set({ tasks });
  },
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },
  addUserMessage: (content) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      messages: [...state.messages, message]
    }));

    return message;
  },
  upsertTask: (task) => {
    set((state) => {
      const nextTasks = state.tasks.some((item) => item.id === task.id)
        ? state.tasks.map((item) => (item.id === task.id ? task : item))
        : [task, ...state.tasks];

      return {
        tasks: nextTasks
      };
    });
  },
  setPendingAction: (pendingAction, pendingTaskId = null) => {
    set({
      pendingAction,
      pendingTaskId
    });
  }
}));
