"use client";

import { CheckCircle2, Clock3, PlayCircle, RotateCcw, Search, TerminalSquare } from "lucide-react";
import type { AgentTask, PlannedToolCall } from "@my-pet/shared-types";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  action: PlannedToolCall;
}

interface TasksPanelProps {
  tasks: AgentTask[];
  quickActions: QuickAction[];
  onRunQuickAction: (action: PlannedToolCall) => void;
  onRefresh: () => Promise<void>;
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

export function TasksPanel({ tasks, quickActions, onRunQuickAction, onRefresh }: TasksPanelProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      <div className="rounded-[2rem] border border-white/15 bg-[#0e1627]/85 p-5 shadow-[0_20px_70px_rgba(7,10,23,0.42)] backdrop-blur-xl">
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

      <div className="rounded-[2rem] border border-white/15 bg-[#0e1627]/85 p-5 shadow-[0_20px_70px_rgba(7,10,23,0.42)] backdrop-blur-xl">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200/65">Quick Actions</p>
          <h3 className="text-lg font-semibold text-white">MVP 工具桥</h3>
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
    </section>
  );
}
