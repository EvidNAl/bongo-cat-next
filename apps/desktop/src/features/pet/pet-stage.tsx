"use client";

import dynamic from "next/dynamic";
import { Settings2, Sparkles, Wand2 } from "lucide-react";
import { ExpressionSelector } from "@/components/expression-selector";
import { MotionSelector } from "@/components/motion-selector";
import { useCatStore } from "@/stores/cat-store";

const CatViewer = dynamic(() => import("@/components/cat-viewer"), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-[2rem] bg-white/10" />
});

interface PetStageProps {
  onOpenSettings: () => void;
  onStagePointerDown: (event: React.MouseEvent<HTMLElement>) => void;
  onStageContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
}

export function PetStage({ onOpenSettings, onStagePointerDown, onStageContextMenu }: PetStageProps) {
  const { mirrorMode, selectorsVisible, availableExpressions, availableMotions, currentModelPath, penetrable, opacity } =
    useCatStore();

  return (
    <section className="relative flex min-h-[560px] flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-[#0f1728]/80 shadow-[0_24px_80px_rgba(6,10,24,0.55)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4" onMouseDown={onStagePointerDown}>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-sky-200/70">Pet Stage</p>
          <h1 className="text-xl font-semibold text-white">桌宠主舞台</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
            模型 {currentModelPath}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
            透明度 {opacity}%
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
            {penetrable ? "点击穿透中" : "可交互"}
          </span>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-100 transition hover:bg-white/12"
            onClick={onOpenSettings}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.18),_transparent_30%),linear-gradient(160deg,_rgba(15,23,42,0.95),_rgba(17,24,39,0.82))]"
        onContextMenu={onStageContextMenu}
        onMouseDown={onStagePointerDown}
      >
        <div
          className={`absolute inset-0 transition-transform duration-300 ${mirrorMode ? "-scale-x-100" : "scale-x-100"}`}
        >
          <CatViewer />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0f1728] to-transparent" />

        {selectorsVisible && (
          <div className="absolute left-4 top-4 z-20 flex w-[240px] flex-col gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#11192c]/85 p-3 shadow-lg backdrop-blur">
              <div className="mb-2 flex items-center gap-2 text-sm text-sky-100">
                <Sparkles className="h-4 w-4" />
                表情
              </div>
              <ExpressionSelector availableExpressions={availableExpressions} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#11192c]/85 p-3 shadow-lg backdrop-blur">
              <div className="mb-2 flex items-center gap-2 text-sm text-amber-100">
                <Wand2 className="h-4 w-4" />
                动作
              </div>
              <MotionSelector availableMotions={availableMotions} />
            </div>
          </div>
        )}

        <div className="absolute bottom-5 left-5 max-w-sm rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 backdrop-blur">
          这里保留原来的 Live2D 舞台能力，同时把聊天、任务和权限控制放到右侧，让第一版先跑通完整闭环。
        </div>
      </div>
    </section>
  );
}
