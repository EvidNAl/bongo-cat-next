"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { KeyboardVisualization } from "./keyboard-visualization";
import { useLive2DSystem } from "@/hooks/use-live2d-system";
import { useCatStore } from "@/stores/cat-store";
import { useModelStore } from "@/stores/model-store";

type ViewerMode = "stage" | "pet";

interface CatViewerProps {
  mode?: ViewerMode;
  showBackground?: boolean;
  showKeyboard?: boolean;
}

export default function CatViewer({
  mode = "stage",
  showBackground = true,
  showKeyboard = true
}: CatViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useLive2DSystem(canvasRef, mode);
  const { currentModel } = useModelStore();
  const { backgroundImage, scale } = useCatStore();
  const [imageDimensions, setImageDimensions] = useState({
    width: 800,
    height: 600
  });

  const isInteractiveModel = currentModel?.id === "keyboard" || currentModel?.id === "standard";
  const shouldShowBackground = showBackground && isInteractiveModel && Boolean(backgroundImage);
  const shouldShowKeyboard = showKeyboard && isInteractiveModel;

  useEffect(() => {
    if (!backgroundImage || !shouldShowBackground) {
      return;
    }

    const img = document.createElement("img");
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.src = backgroundImage;
  }, [backgroundImage, shouldShowBackground]);

  const scaledWidth = Math.round(imageDimensions.width * (scale / 100));
  const scaledHeight = Math.round(imageDimensions.height * (scale / 100));

  return (
    <>
      {shouldShowBackground && backgroundImage && (
        <NextImage
          src={backgroundImage}
          alt="Background"
          width={scaledWidth}
          height={scaledHeight}
          className="absolute size-full"
          priority
        />
      )}

      <canvas ref={canvasRef} id={`live2dCanvas-${mode}`} className="absolute size-full" />

      {shouldShowKeyboard && <KeyboardVisualization />}
    </>
  );
}
