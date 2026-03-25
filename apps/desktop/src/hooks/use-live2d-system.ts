"use client";

import { useEffect } from "react";
import { useCatStore } from "@/stores/cat-store";
import { useModelStore } from "@/stores/model-store";
import { _useCore } from "@/hooks/live2d/_use-core";
import { _useKeyboardSync } from "@/hooks/live2d/_use-keyboard-sync";
import { _useModelLoader } from "@/hooks/live2d/_use-model-loader";
import { _useMotionPlayer } from "@/hooks/live2d/_use-motion-player";
import { _useMouseEvents } from "@/hooks/live2d/_use-mouse-events";
import { useKeyboard } from "@/hooks/use-keyboard";
import { useWindowScaling } from "@/hooks/use-window-scaling";

type ViewerMode = "stage" | "pet";

export function useLive2DSystem(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  mode: ViewerMode = "stage"
) {
  const enableInteractiveSync = mode === "stage";
  useKeyboard();

  const { currentModel, initializeModels } = useModelStore();
  const { pressedLeftKeys, pressedRightKeys, selectedMotion, selectedExpression } = useCatStore();

  const { initializeLive2D, getInstance, setLoading, isLoading } = _useCore();
  const { loadModelAndAssets } = _useModelLoader(initializeLive2D, setLoading, isLoading);
  const { setupMouseEvents, cleanup: cleanupMouseEvents } = _useMouseEvents(initializeLive2D);
  const { updateHandState } = _useKeyboardSync(initializeLive2D);
  const { playMotionByName, playExpressionByName } = _useMotionPlayer(getInstance);

  useWindowScaling(getInstance, canvasRef, mode);

  useEffect(() => {
    void initializeModels();
  }, [initializeModels]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!currentModel || !canvas || currentModel.mode === "sprite" || currentModel.mode === "interactive") {
      return;
    }

    void loadModelAndAssets(currentModel.path, currentModel.modelName, canvas, {
      lowPower: mode === "pet"
    });
  }, [canvasRef, currentModel, loadModelAndAssets, mode]);

  useEffect(() => {
    if (!enableInteractiveSync) {
      return;
    }

    void setupMouseEvents();
    return cleanupMouseEvents;
  }, [cleanupMouseEvents, enableInteractiveSync, setupMouseEvents]);

  useEffect(() => {
    if (!enableInteractiveSync) {
      return;
    }

    void updateHandState(pressedLeftKeys, pressedRightKeys);
  }, [enableInteractiveSync, pressedLeftKeys, pressedRightKeys, updateHandState]);

  useEffect(() => {
    if (selectedMotion) {
      const { group, name } = selectedMotion;
      playMotionByName(group, name);
    }
  }, [playMotionByName, selectedMotion]);

  useEffect(() => {
    if (selectedExpression) {
      const { name } = selectedExpression;
      playExpressionByName(name);
    }
  }, [playExpressionByName, selectedExpression]);

  return {
    live2dInstance: getInstance()
  };
}
