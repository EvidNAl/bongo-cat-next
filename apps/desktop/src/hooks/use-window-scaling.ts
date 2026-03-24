"use client";

import { useCallback, useEffect } from "react";
import { useCatStore } from "@/stores/cat-store";
import type { Live2DInstance } from "@/types";

export function useWindowScaling(
  live2dInstance: () => Live2DInstance | null,
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
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
    const normalizedScale = scale / 100;
    const baseScale = Math.min(width / 960, height / 780);
    const nextScale = Math.max(0.25, baseScale * normalizedScale * 1.35);

    live2d.model.scale.set(nextScale);
    live2d.model.x = width / 2;
    live2d.model.y = height * 0.78;
    live2d.resize();
  }, [canvasRef, live2dInstance, scale]);

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
