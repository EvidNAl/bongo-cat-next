"use client";

import { CheckCircle2, Clock3, FolderSearch, History, PlayCircle, RotateCcw, Search, ShieldCheck, TerminalSquare, TriangleAlert, UserRound } from "lucide-react";
import type { AgentTask, MemoryProfile, OperationLogEntry, PlannedToolCall } from "@my-pet/shared-types";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  action: PlannedToolCall;
}

interface TasksPanelProps {
  tasks: AgentTask[];
  logs: OperationLogEntry[];
  memory: MemoryProfile;
  quickActions: QuickAction[];
  onRunQuickAction: (action: PlannedToolCall) => void;
  onRefresh: () => Promise<void>;
}

function getProjectName(projectPath: string) {
  const normalized = projectPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);

  return segments.at(-1) ?? projectPath;
}

function getStatusTone(status: AgentTask["status"]) {
  switch (status) {
    case "completed":
      return "border-emerald-300/20 bg-emerald-300/10 text-emerald-100";
    case "failed":
      return "border-rose-300/20 bg-rose-300/10 text-rose-100";
    case "needs_confirmation":
      return "border-amber-300/20 bg-amber-300/10 text-amber-100";
    default:
      return "border-white/10 bg-white/5 text-slate-200";
  }
}

function getQuickActionIcon(tool: PlannedToolCall["tool"]) {
  switch (tool) {
    case "open_app":
      return <PlayCircle className="h-4 w-4" />;
    case "run_command":
      return <TerminalSquare className="h-4 w-4" />;
    case "file_search":
      return <Search className="h-4 w-4" />;
    default:
      return <RotateCcw className="h-4 w-4" />;
  }
}

function getLogIcon(entry: OperationLogEntry) {
  if (entry.status === "failure") {
    return <TriangleAlert className="h-4 w-4 text-rose-200" />;
  }

  if (entry.source === "desktop") {
    return <ShieldCheck className="h-4 w-4 text-sky-200" />;
  }

  return <History className="h-4 w-4 text-emerald-200" />;
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function TasksPanel({ tasks, logs, memory, quickActions, onRunQuickAction, onRefresh }: TasksPanelProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      <div className="manager-panel rounded-[2rem] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200/65">Tasks</p>
            <h3 className="text-lg font-semibold text-white">当前队列</h3>
          </div>

          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/12"
            onClick={() => {
              void onRefresh();
            }}
          >
            刷新
          </button>
        </div>

        <div className="space-y-3">
          {tasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-400">
              暂时还没有任务。你可以先从右边的快捷动作开始，或者直接聊天下达请求。
            </div>
          )}

          {tasks.slice(0, 6).map((task) => (
            <article key={task.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-medium text-white">{task.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{task.summary ?? "等待执行结果..."}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs ${getStatusTone(task.status)}`}>{task.status}</span>
              </div>

              {(task.result ?? task.error) && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-slate-200">
                  {task.result ?? task.error}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      <div className="manager-panel rounded-[2rem] p-5">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200/65">Quick Actions</p>
          <h3 className="text-lg font-semibold text-white">工具桥与记忆</h3>
        </div>

        <div className="manager-panel-soft mb-4 rounded-3xl p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full border border-cyan-300/15 bg-cyan-300/12 p-2 text-cyan-100">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-medium text-white">用户记忆</h4>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-slate-300">
                  称呼：{memory.nickname || "朋友"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {memory.preferences.length > 0 ? (
                  memory.preferences.slice(0, 4).map((preference) => (
                    <span
                      key={preference}
                      className="rounded-full border border-cyan-300/20 bg-black/20 px-3 py-1 text-xs text-cyan-50"
                    >
                      {preference}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">还没有记录对话偏好。</span>
                )}
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                  <FolderSearch className="h-3.5 w-3.5" />
                  常用项目
                </div>

                <div className="space-y-2">
                  {memory.favoriteProjectPaths.length > 0 ? (
                    memory.favoriteProjectPaths.slice(0, 3).map((projectPath) => (
                      <div key={projectPath} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                        <div className="text-sm text-white">{getProjectName(projectPath)}</div>
                        <div className="mt-1 truncate text-xs text-slate-400">{projectPath}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-xs text-slate-400">
                      还没有常用项目路径。你可以去设置页手动添加，之后桌宠会优先拿它们做搜索目标。
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {quickActions.map((quickAction) => (
            <button
              key={quickAction.id}
              type="button"
              className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
              onClick={() => {
                onRunQuickAction(quickAction.action);
              }}
            >
              <div className="mt-1 rounded-full border border-white/10 bg-white/5 p-2 text-slate-100">
                {getQuickActionIcon(quickAction.action.tool)}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  {quickAction.title}
                  {quickAction.action.risk === "low" && <CheckCircle2 className="h-4 w-4 text-emerald-200" />}
                  {quickAction.action.risk !== "low" && <Clock3 className="h-4 w-4 text-amber-200" />}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">{quickAction.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="manager-panel rounded-[2rem] p-5 lg:col-span-2">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.28em] text-sky-200/65">Audit</p>
          <h3 className="text-lg font-semibold text-white">最近操作</h3>
        </div>

        <div className="space-y-3">
          {logs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-slate-400">
              还没有记录到最近操作。执行一次快捷动作或保存设置后，这里会显示审计日志。
            </div>
          )}

          {logs.slice(0, 8).map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 rounded-full border border-white/10 bg-black/20 p-2">{getLogIcon(entry)}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{entry.summary}</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                        {entry.source}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] ${
                          entry.status === "success"
                            ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                            : "border-rose-300/20 bg-rose-300/10 text-rose-100"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </div>
                    {entry.detail && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-400">{entry.detail}</p>}
                  </div>
                </div>

                <span className="text-xs text-slate-400">{formatTime(entry.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
