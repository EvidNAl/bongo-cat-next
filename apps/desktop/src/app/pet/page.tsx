"use client";

import { PawPrint, Settings2 } from "lucide-react";
import { launchPetApp, showAssistantWindow, showSettingsWindow } from "@/services/tauri-client";

export default function PetWindowPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.16),_transparent_30%),linear-gradient(180deg,_#091120,_#0f1728)] px-5 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-[2rem] border border-white/12 bg-[#0f1728]/88 p-6 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="rounded-full border border-amber-300/15 bg-amber-300/12 p-3 text-amber-100">
              <PawPrint className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-amber-200/75">Migration</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">内置桌宠已迁移</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                旧的 Tauri 内置桌宠窗口已经停用。桌宠本体现在由独立的 PyQt5 程序负责，管理端只保留启动、停止和 Codex 管理能力。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/12 bg-[#0f1728]/88 p-6 backdrop-blur-xl">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-emerald-200"
              onClick={() => {
                void launchPetApp();
              }}
            >
              启动 PyQt5 桌宠
            </button>
            <button
              type="button"
              className="rounded-full border border-white/16 bg-white/5 px-5 py-3 text-sm text-slate-100 transition hover:bg-white/10"
              onClick={() => {
                void showAssistantWindow();
              }}
            >
              返回管理台
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/5 px-5 py-3 text-sm text-slate-100 transition hover:bg-white/10"
              onClick={() => {
                void showSettingsWindow();
              }}
            >
              <Settings2 className="h-4 w-4" />
              打开管理端设置
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
