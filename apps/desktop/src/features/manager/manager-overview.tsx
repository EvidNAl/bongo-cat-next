"use client";

import { Bot, FolderOpenDot, PawPrint, RefreshCw, Settings2, Sparkles, Square, Play, ShieldCheck } from "lucide-react";
import type { ExternalPetAppStatus } from "@/services/tauri-client";

interface ManagerOverviewProps {
  serviceReachable: boolean;
  serviceUrl: string;
  petAppStatus: ExternalPetAppStatus | null;
  isRefreshingPetApp: boolean;
  onRefreshPetApp: () => void;
  onLaunchPetApp: () => void;
  onStopPetApp: () => void;
  onRevealPetApp: () => void;
  onOpenSettings: () => void;
}

function StatusBadge({
  active,
  activeText,
  inactiveText
}: {
  active: boolean;
  activeText: string;
  inactiveText: string;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs ${
        active
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          : "border-white/10 bg-white/5 text-slate-200"
      }`}
    >
      {active ? activeText : inactiveText}
    </span>
  );
}

export function ManagerOverview({
  serviceReachable,
  serviceUrl,
  petAppStatus,
  isRefreshingPetApp,
  onRefreshPetApp,
  onLaunchPetApp,
  onStopPetApp,
  onRevealPetApp,
  onOpenSettings
}: ManagerOverviewProps) {
  const petAppAvailable = petAppStatus?.available ?? false;
  const petAppRunning = petAppStatus?.running ?? false;

  return (
    <section className="flex min-h-full flex-col gap-4">
      <div className="manager-panel rounded-[2rem] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/65">Manager</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">My Pet Assistant 管理台</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              旧桌面端现在只负责管理 Codex、桌宠程序和其他工具动作。桌宠本体已经迁到独立的 PyQt5 程序里运行。
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 transition hover:bg-white/10"
            onClick={onOpenSettings}
          >
            <Settings2 className="h-4 w-4" />
            管理端设置
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="manager-panel rounded-[2rem] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-200/65">Codex</p>
              <h2 className="mt-2 text-lg font-semibold text-white">agent-service / 工具桥</h2>
            </div>
            <StatusBadge active={serviceReachable} activeText="在线" inactiveText="离线" />
          </div>

          <div className="manager-panel-soft mt-4 rounded-3xl p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full border border-emerald-300/15 bg-emerald-300/12 p-2 text-emerald-100">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">当前 Codex 管理入口</div>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  管理端负责聊天、任务编排、白名单工具桥，以及本地 agent-service 的联通性检查。
                </p>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-300">
                  服务地址：{serviceUrl || "未配置"}
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="manager-panel rounded-[2rem] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-amber-200/65">Desktop Pet</p>
              <h2 className="mt-2 text-lg font-semibold text-white">独立 PyQt5 桌宠程序</h2>
            </div>
            <StatusBadge
              active={petAppRunning}
              activeText="运行中"
              inactiveText={petAppAvailable ? "未启动" : "未找到"}
            />
          </div>

          <div className="manager-panel-soft mt-4 rounded-3xl p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full border border-amber-300/15 bg-amber-300/12 p-2 text-amber-100">
                <PawPrint className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium text-white">外部桌宠进程</div>
                  {petAppStatus?.pid && (
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-slate-300">
                      PID {petAppStatus.pid}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  外观、互动、跟随和桌宠设置都交给 PyQt5 程序处理。管理端这里只负责启动、停止和查看状态。
                </p>

                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs leading-5 text-slate-300">
                  {petAppStatus?.message ?? "正在检查 PyQt5 桌宠程序..."}
                </div>

                {petAppStatus?.executablePath && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-400">
                    {petAppStatus.executablePath}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-300 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-300/60"
                    disabled={!petAppAvailable || petAppRunning}
                    onClick={onLaunchPetApp}
                  >
                    <Play className="h-4 w-4" />
                    启动桌宠
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!petAppRunning}
                    onClick={onStopPetApp}
                  >
                    <Square className="h-4 w-4" />
                    停止桌宠
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!petAppAvailable}
                    onClick={onRevealPetApp}
                  >
                    <FolderOpenDot className="h-4 w-4" />
                    定位程序
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                    onClick={onRefreshPetApp}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshingPetApp ? "animate-spin" : ""}`} />
                    刷新状态
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="manager-panel rounded-[2rem] p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-sky-300/15 bg-sky-300/12 p-2 text-sky-100">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-white">当前软件分工</h3>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-slate-300">
                管理端 + 独立桌宠
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              管理端负责 Codex、agent-service、任务队列和外部程序调度；桌宠程序负责桌宠动画、互动、跟随和宠物专属设置。
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                内置桌宠预览已移出管理端
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                <PawPrint className="h-3.5 w-3.5" />
                PyQt5 桌宠为独立软件
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
