"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { MonitorPlay, Settings2, Sparkles, Wand2 } from "lucide-react";
import { ExpressionSelector } from "@/components/expression-selector";
import { MotionSelector } from "@/components/motion-selector";
import { useCatStore } from "@/stores/cat-store";
import { isTauriRuntime } from "@/utils/tauri";

const CatViewer = dynamic(() => import("@/components/cat-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-[2rem] bg-white/10 text-sm text-slate-300">
      正在加载 Live2D 舞台...
    </div>
  )
});

const WEB_PREVIEW_GIFS: Record<string, string> = {
  standard: "/img/standard.gif",
  keyboard: "/img/keyboard.gif"
};

interface PetStageProps {
  onOpenSettings: () => void;
  onStagePointerDown: (event: React.MouseEvent<HTMLElement>) => void;
  onStageContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
}

function WebPetPreview({ modelId, mirrorMode, opacity }: { modelId: string; mirrorMode: boolean; opacity: number }) {
  const previewSrc = WEB_PREVIEW_GIFS[modelId] ?? WEB_PREVIEW_GIFS.standard;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(251,191,36,0.12),_transparent_28%)]" />

      <div className="relative flex h-full items-end justify-center px-8 pb-10 pt-6">
        <div
          className={`relative h-full w-full max-w-[720px] transition-transform duration-300 ${mirrorMode ? "-scale-x-100" : "scale-x-100"}`}
          style={{ opacity: opacity / 100 }}
        >
          <Image src={previewSrc} alt="Pet preview" fill className="object-contain object-bottom" priority unoptimized />
        </div>
      </div>

      <div className="absolute left-5 top-5 rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-50 backdrop-blur">
        <div className="flex items-center gap-2 font-medium">
          <MonitorPlay className="h-4 w-4" />
          Web 预览模式
        </div>
        <p className="mt-1 max-w-xs text-xs leading-5 text-sky-100/80">
          浏览器里先用 GIF 预览桌宠形态；切回 Tauri 桌面壳后，会恢复真实 Live2D、托盘和窗口能力。
        </p>
      </div>
    </div>
  );
}

export function PetStage({ onOpenSettings, onStagePointerDown, onStageContextMenu }: PetStageProps) {
  const tauriRuntime = isTauriRuntime();
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
            {tauriRuntime ? (penetrable ? "点击穿透中" : "可交互") : "Web 预览"}
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
        <div className="absolute inset-0 transition-transform duration-300">
          {tauriRuntime ? (
            <div className={mirrorMode ? "-scale-x-100" : "scale-x-100"}>
              <CatViewer />
            </div>
          ) : (
            <WebPetPreview modelId={currentModelPath} mirrorMode={mirrorMode} opacity={opacity} />
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#0f1728] to-transparent" />

        {tauriRuntime && selectorsVisible && (
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
          {tauriRuntime
            ? "这里保留 Live2D 舞台、动作和表情能力，右侧继续承接聊天、任务和权限控制。"
            : "当前是浏览器预览版本，先确认界面和流程；桌面壳可用后再切回真实 Live2D 与系统级控制。"}
        </div>
      </div>
    </section>
  );
}
