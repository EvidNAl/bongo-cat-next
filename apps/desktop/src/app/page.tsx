"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { PlannedToolCall, SettingsBundle, ToolExecutionResult } from "@my-pet/shared-types";
import { ChatPanel } from "@/features/chat/chat-panel";
import { PermissionDialog } from "@/features/permissions/permission-dialog";
import { PetStage } from "@/features/pet/pet-stage";
import { TasksPanel } from "@/features/tasks/tasks-panel";
import { useSharedMenu } from "@/hooks/use-shared-menu";
import { useTray } from "@/hooks/use-tray";
import { useWindowEffects } from "@/hooks/use-window-effects";
import { getMemoryProfileFromAgent, getOperationLogs, getServiceHealth, getTasks, sendChat, updateTaskEvent } from "@/services/agent-client";
import { loadSettingsBundle } from "@/services/settings-client";
import { fileSearch, openApp, openUrl, runCommand, showSettingsWindow } from "@/services/tauri-client";
import { useAssistantStore } from "@/stores/assistant-store";
import { useCatStore } from "@/stores/cat-store";
import { useModelStore } from "@/stores/model-store";
import { isTauriRuntime } from "@/utils/tauri";

function getProjectName(projectPath: string) {
  const normalized = projectPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);

  return segments.at(-1) ?? projectPath;
}

export default function Home() {
  const {
    permissions,
    settings,
    messages,
    tasks,
    logs,
    memory,
    isSending,
    serviceReachable,
    pendingAction,
    pendingTaskId,
    setBootstrapState,
    setSendingState,
    setHealth,
    setTasks,
    setLogs,
    setMemory,
    setSettingsBundle,
    addMessage,
    addUserMessage,
    setServiceReachable,
    upsertTask,
    setPendingAction
  } = useAssistantStore();
  const { setOpacity, setAlwaysOnTop, setPenetrable, setMirrorMode, setCurrentModelPath } = useCatStore();
  const { setCurrentModel } = useModelStore();
  const { showContextMenu } = useSharedMenu();
  const { createTray } = useTray();

  useWindowEffects();

  useEffect(() => {
    const bootstrap = async () => {
      let serviceUrl = settings.ai.serviceUrl.trim() || undefined;

      try {
        const bundle = await loadSettingsBundle();
        serviceUrl = bundle.settings.ai.serviceUrl.trim() || undefined;
        setSettingsBundle(bundle.settings, bundle.permissions);

        if (bundle.settings.general.enableTray && isTauriRuntime()) {
          await createTray();
        }

        applyPetSettings(bundle.settings);
      } catch (error) {
        toast.error(`初始化设置失败: ${String(error)}`);
      }

      try {
        const [health, currentTasks, currentLogs] = await Promise.all([
          getServiceHealth(serviceUrl),
          getTasks(serviceUrl),
          getOperationLogs(12, serviceUrl)
        ]);
        const currentMemory = await getMemoryProfileFromAgent(serviceUrl);

        setHealth(health);
        setTasks(currentTasks);
        setLogs(currentLogs);
        setMemory(currentMemory);
        setServiceReachable(true);
      } catch {
        setServiceReachable(false);
      } finally {
        setBootstrapState(false);
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    applyPetSettings(settings);
  }, [settings]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshServiceState();
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [settings.ai.serviceUrl, tasks.length]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let cleanup: (() => void) | undefined;

    const bind = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      cleanup = await listen<SettingsBundle>("settings-updated", ({ payload }) => {
        setSettingsBundle(payload.settings, payload.permissions);
        applyPetSettings(payload.settings);
        toast.success("设置已同步到主窗口");
      });
    };

    void bind();

    return () => {
      cleanup?.();
    };
  }, []);

  const applyPetSettings = (currentSettings = settings) => {
    setOpacity(currentSettings.pet.opacity);
    setAlwaysOnTop(currentSettings.pet.alwaysOnTop);
    setPenetrable(currentSettings.pet.clickThrough);
    setMirrorMode(currentSettings.pet.mirrorMode);
    setCurrentModelPath(currentSettings.pet.modelId);
    setCurrentModel(currentSettings.pet.modelId);
  };

  const refreshServiceState = async () => {
    try {
      const serviceUrl = settings.ai.serviceUrl.trim() || undefined;
      const [health, currentTasks, currentLogs] = await Promise.all([
        getServiceHealth(serviceUrl),
        getTasks(serviceUrl),
        getOperationLogs(12, serviceUrl)
      ]);
      const currentMemory = await getMemoryProfileFromAgent(serviceUrl);

      setHealth(health);
      setTasks(currentTasks);
      setLogs(currentLogs);
      setMemory(currentMemory);
      setServiceReachable(true);
    } catch {
      setServiceReachable(false);
    }
  };

  const handleWindowDrag = async (event: React.MouseEvent) => {
    if (event.button !== 0 || !isTauriRuntime()) {
      return;
    }

    try {
      const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const appWindow = getCurrentWebviewWindow();
      await appWindow.startDragging();
    } catch (error) {
      toast.error(`Failed to handle window drag: ${String(error)}`);
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (!isTauriRuntime()) {
      return;
    }

    event.preventDefault();
    void showContextMenu();
  };

  const runAction = async (action: PlannedToolCall): Promise<ToolExecutionResult> => {
    switch (action.tool) {
      case "open_app":
        return openApp(action.payload.appName);
      case "open_url":
        return openUrl(action.payload.url);
      case "run_command":
        return runCommand(action.payload.commandId, action.payload.args);
      case "file_search":
        return fileSearch(action.payload.baseDir, action.payload.keyword);
    }
  };

  const executeAction = async (action: PlannedToolCall, taskId: string | null = null) => {
    if (!isTauriRuntime() && action.tool !== "open_url") {
      toast.info("这个动作需要在 Tauri 桌面壳里执行。当前 Web 预览仅开放聊天、设置和打开网址。");
      return;
    }

    const requiresConfirmation = permissions.dangerousActionConfirmation && (action.requiresConfirmation || action.risk !== "low");
    if (requiresConfirmation) {
      setPendingAction(action, taskId);
      return;
    }

    try {
      const result = await runAction(action);
      toast.success(result.summary);

      if (taskId) {
        const task = await updateTaskEvent(taskId, { status: "completed", result: result.summary }, settings.ai.serviceUrl);
        upsertTask(task);
      }

      void refreshServiceState();
    } catch (error) {
      const detail = String(error);
      toast.error(detail);

      if (taskId) {
        const task = await updateTaskEvent(taskId, { status: "failed", error: detail }, settings.ai.serviceUrl);
        upsertTask(task);
      }
    }
  };

  const handleSend = async (content: string) => {
    const userMessage = addUserMessage(content);
    setSendingState(true);

    try {
      const response = await sendChat(
        {
          message: content,
          conversation: [...messages, userMessage]
        },
        settings.ai.serviceUrl
      );

      addMessage(response.reply);
      setTasks(response.tasks.concat(tasks).slice(0, 20));
      setServiceReachable(true);
      void refreshServiceState();
    } catch (error) {
      setServiceReachable(false);
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `我现在联系不上本地 agent-service。你可以先运行 \`pnpm dev:agent\`，或者直接使用下方的快捷动作。错误信息：${String(error)}`,
        createdAt: new Date().toISOString()
      });
    } finally {
      setSendingState(false);
    }
  };

  const favoriteSearchPath = memory.favoriteProjectPaths.find((projectPath) =>
    permissions.allowedDirectories.includes(projectPath)
  );
  const favoriteQuickActions: {
    id: string;
    title: string;
    description: string;
    action: PlannedToolCall;
  }[] = favoriteSearchPath
    ? [
        {
          id: "quick-search-favorite-project",
          title: `搜索 ${getProjectName(favoriteSearchPath)}`,
          description: "直接用记忆里的常用项目路径做一次文件搜索。",
          action: {
            id: "quick-search-favorite-project",
            tool: "file_search",
            title: `在 ${getProjectName(favoriteSearchPath)} 搜索 README`,
            rationale: "优先验证记忆里的常用项目路径是否已经打通。",
            risk: "low",
            requiresConfirmation: false,
            payload: {
              baseDir: favoriteSearchPath,
              keyword: "README"
            }
          }
        }
      ]
    : [];

  const quickActions: {
    id: string;
    title: string;
    description: string;
    action: PlannedToolCall;
  }[] = [
    {
      id: "quick-open-code",
      title: "打开 VS Code",
      description: "直接调用本地工具桥，适合开始项目开发。",
      action: {
        id: "quick-open-code",
        tool: "open_app",
        title: "打开 VS Code",
        rationale: "快速拉起代码编辑器。",
        risk: "medium",
        requiresConfirmation: true,
        payload: {
          appName: "vs-code"
        }
      }
    },
    {
      id: "quick-open-platform",
      title: "打开 OpenAI Platform",
      description: "验证浏览器拉起能力和网址类动作。",
      action: {
        id: "quick-open-platform",
        tool: "open_url",
        title: "打开 OpenAI Platform",
        rationale: "浏览器动作属于低风险。",
        risk: "low",
        requiresConfirmation: false,
        payload: {
          url: "https://platform.openai.com"
        }
      }
    },
    {
      id: "quick-git-status",
      title: "执行 git status",
      description: "验证 PowerShell 白名单命令桥。",
      action: {
        id: "quick-git-status",
        tool: "run_command",
        title: "执行 git status",
        rationale: "只运行白名单命令映射。",
        risk: "low",
        requiresConfirmation: true,
        payload: {
          commandId: "git_status",
          args: []
        }
      }
    },
    {
      id: "quick-search-readme",
      title: "搜索 README",
      description: "验证工作区文件搜索。",
      action: {
        id: "quick-search-readme",
        tool: "file_search",
        title: "搜索 README",
        rationale: "只在允许目录别名 workspace 中搜索。",
        risk: "low",
        requiresConfirmation: false,
        payload: {
          baseDir: "workspace",
          keyword: "README"
        }
      }
    },
    ...favoriteQuickActions
  ];

  return (
    <>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(160deg,_#08111d,_#0f1728_52%,_#111827)] px-4 py-4 text-slate-100">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1560px] gap-4 xl:grid-cols-[1.15fr_0.95fr]">
          <PetStage
            onOpenSettings={() => {
              void showSettingsWindow();
            }}
            onStagePointerDown={(event) => {
              void handleWindowDrag(event);
            }}
            onStageContextMenu={handleContextMenu}
          />

          <div className="flex min-h-full flex-col gap-4">
            <ChatPanel
              messages={messages}
              isSending={isSending}
              serviceReachable={serviceReachable}
              onSend={handleSend}
              onExecuteAction={(action) => {
                const relatedTask = tasks.find((task) => task.toolCall?.id === action.id);
                void executeAction(action, relatedTask?.id ?? null);
              }}
              onOpenSettings={() => {
                void showSettingsWindow();
              }}
            />

            <TasksPanel
              tasks={tasks}
              logs={logs}
              memory={memory}
              quickActions={quickActions}
              onRunQuickAction={(action) => {
                void executeAction(action);
              }}
              onRefresh={refreshServiceState}
            />
          </div>
        </div>
      </main>

      <PermissionDialog
        action={pendingAction}
        isOpen={pendingAction !== null}
        onCancel={() => {
          setPendingAction(null, null);
        }}
        onConfirm={async () => {
          if (!pendingAction) {
            return;
          }

          try {
            const result = await runAction(pendingAction);
            toast.success(result.summary);

            if (pendingTaskId) {
              const task = await updateTaskEvent(
                pendingTaskId,
                {
                  status: "completed",
                  result: result.summary
                },
                settings.ai.serviceUrl
              );
              upsertTask(task);
            }
          } catch (error) {
            const detail = String(error);
            toast.error(detail);

            if (pendingTaskId) {
              const task = await updateTaskEvent(
                pendingTaskId,
                {
                  status: "failed",
                  error: detail
                },
                settings.ai.serviceUrl
              );
              upsertTask(task);
            }
          } finally {
            setPendingAction(null, null);
            void refreshServiceState();
          }
        }}
      />
    </>
  );
}
