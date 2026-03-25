"use client";

import { useCallback, useEffect } from "react";
import { useCatStore } from "@/stores/cat-store";
import type { Live2DInstance } from "@/types";

type LayoutMode = "stage" | "pet";

export function useWindowScaling(
  live2dInstance: () => Live2DInstance | null,
  canvasRef?: React.RefObject<HTMLCanvasElement | null>,
  mode: LayoutMode = "stage"
) {
  const { scale } = useCatStore();

  const applyModelLayout = useCallback(() => {
    const live2d = live2dInstance();
    const canvas = canvasRef?.current;
    const container = canvas?.parentElement;

    if (!live2d?.model || !container) {
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    const normalizedScale = scale / 100;
    const baseScale = mode === "pet" ? Math.min(width / 1200, height / 1100) : Math.min(width / 960, height / 780);
    const nextScale =
      mode === "pet"
        ? Math.max(0.18, baseScale * normalizedScale * 0.95)
        : Math.max(0.25, baseScale * normalizedScale * 1.35);

    live2d.model.scale.set(nextScale);
    live2d.model.x = width / 2;
    live2d.model.y = mode === "pet" ? height * 0.68 : height * 0.78;
    live2d.resize();
  }, [canvasRef, live2dInstance, mode, scale]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      applyModelLayout();
    }, 80);

    const handleResize = () => {
      applyModelLayout();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [applyModelLayout]);
}
