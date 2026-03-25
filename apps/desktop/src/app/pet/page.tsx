"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { MessageSquareMore, Settings2 } from "lucide-react";
import type { SettingsBundle } from "@my-pet/shared-types";
import { InkCatPet } from "@/components/ink-cat-pet";
import { useSharedMenu } from "@/hooks/use-shared-menu";
import { useTray } from "@/hooks/use-tray";
import { useWindowEffects } from "@/hooks/use-window-effects";
import { loadSettingsBundle } from "@/services/settings-client";
import { showAssistantWindow, showSettingsWindow } from "@/services/tauri-client";
import { useCatStore } from "@/stores/cat-store";
import { useModelStore } from "@/stores/model-store";
import { isTauriRuntime } from "@/utils/tauri";

const CatViewer = dynamic(() => import("@/components/cat-viewer"), {
  ssr: false
});

const SPRITE_PREVIEWS: Partial<Record<string, string>> = {
  standard: "/img/standard.gif",
  keyboard: "/img/keyboard.gif",
  naximofu_2: "/img/naximofu_2.gif"
};

interface DesktopWindowHandle {
  startDragging: () => Promise<void>;
}

export default function PetWindowPage() {
  const { createTray } = useTray();
  const { showContextMenu } = useSharedMenu();
  const { currentModel, setCurrentModel } = useModelStore();
  const { mirrorMode, opacity, currentModelPath, setOpacity, setAlwaysOnTop, setPenetrable, setMirrorMode, setCurrentModelPath } =
    useCatStore();
  const windowRef = useRef<DesktopWindowHandle | null>(null);

  useWindowEffects();

  useEffect(() => {
    const applySettings = async (bundle: SettingsBundle) => {
      setOpacity(bundle.settings.pet.opacity);
      setAlwaysOnTop(bundle.settings.pet.alwaysOnTop);
      setPenetrable(bundle.settings.pet.clickThrough);
      setMirrorMode(bundle.settings.pet.mirrorMode);
      setCurrentModelPath(bundle.settings.pet.modelId);
      setCurrentModel(bundle.settings.pet.modelId);

      if (bundle.settings.general.enableTray && isTauriRuntime()) {
        await createTray();
      }
    };

    const bootstrap = async () => {
      if (isTauriRuntime()) {
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        windowRef.current = getCurrentWebviewWindow() as unknown as DesktopWindowHandle;
      }

      const bundle = await loadSettingsBundle();
      await applySettings(bundle);
    };

    void bootstrap();

    if (!isTauriRuntime()) {
      return;
    }

    let cleanup: (() => void) | undefined;

    const bind = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      cleanup = await listen<SettingsBundle>("settings-updated", ({ payload }) => {
        void applySettings(payload);
      });
    };

    void bind();

    return () => {
      cleanup?.();
    };
  }, [createTray, setAlwaysOnTop, setCurrentModel, setCurrentModelPath, setMirrorMode, setOpacity, setPenetrable]);

  const handleDrag = async (event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0 || !windowRef.current) {
      return;
    }

    try {
      await windowRef.current.startDragging();
    } catch {
      // Ignore drag failures for the pet overlay.
    }
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    if (!isTauriRuntime()) {
      return;
    }

    event.preventDefault();
    void showContextMenu();
  };

  const isInteractiveModel = currentModel?.mode === "interactive";
  const isSpriteModel = currentModel?.mode === "sprite";
  const previewSrc = currentModel?.previewSrc ?? SPRITE_PREVIEWS[currentModelPath] ?? SPRITE_PREVIEWS.standard ?? "/img/standard.gif";

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-transparent select-none"
      onMouseDown={(event) => {
        if (isInteractiveModel) {
          return;
        }

        void handleDrag(event);
      }}
      onContextMenu={handleContextMenu}
    >
      <div className="absolute inset-0">
        {isInteractiveModel ? (
          <InkCatPet mode="pet" mirrored={mirrorMode} opacity={opacity} />
        ) : isSpriteModel ? (
          <div className="relative h-full w-full">
            <div
              className={`relative h-full w-full transition-transform duration-300 ${mirrorMode ? "-scale-x-100" : "scale-x-100"}`}
              style={{ opacity: opacity / 100 }}
            >
              <Image
                src={previewSrc}
                alt="Desktop pet"
                fill
                className="object-contain object-bottom drop-shadow-[0_24px_48px_rgba(15,23,42,0.28)]"
                priority
                unoptimized
              />
            </div>
          </div>
        ) : (
          <div className={mirrorMode ? "h-full w-full -scale-x-100" : "h-full w-full scale-x-100"}>
            <CatViewer mode="pet" showBackground={false} showKeyboard={false} />
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/5 to-transparent" />

      {!isInteractiveModel && (
        <div className="absolute right-4 top-4 z-30 flex gap-2">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-900/72 text-slate-100 shadow-lg backdrop-blur transition hover:bg-slate-800/85"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onClick={() => {
              void showAssistantWindow();
            }}
            title="打开助手窗口"
          >
            <MessageSquareMore className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-900/72 text-slate-100 shadow-lg backdrop-blur transition hover:bg-slate-800/85"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onClick={() => {
              void showSettingsWindow();
            }}
            title="打开设置"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isInteractiveModel && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-30 rounded-full border border-white/16 bg-slate-900/58 px-4 py-2 text-xs text-slate-100 shadow-lg backdrop-blur">
          左键拖动桌宠，右键打开菜单
        </div>
      )}
    </main>
  );
}
