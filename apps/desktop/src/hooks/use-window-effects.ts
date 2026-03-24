import { useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useCatStore } from "@/stores/cat-store";
import { isTauriRuntime } from "@/utils/tauri";

interface DesktopWindowHandle {
  setAlwaysOnTop: (value: boolean) => Promise<void>;
  setIgnoreCursorEvents: (value: boolean) => Promise<void>;
  show: () => Promise<void>;
  hide: () => Promise<void>;
  setFocus: () => Promise<void>;
}

export function useWindowEffects() {
  const { penetrable, alwaysOnTop, visible, opacity } = useCatStore();
  const windowRef = useRef<DesktopWindowHandle | null>(null);
  const isInitializedRef = useRef(false);

  const getWindow = useCallback(async () => {
    if (!isTauriRuntime()) {
      return null;
    }

    if (!windowRef.current) {
      const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      windowRef.current = getCurrentWebviewWindow() as unknown as DesktopWindowHandle;
    }

    return windowRef.current;
  }, []);

  useEffect(() => {
    if (!isTauriRuntime() || isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    const initAlwaysOnTop = async () => {
      try {
        const window = await getWindow();
        await window?.setAlwaysOnTop(alwaysOnTop);
      } catch (error) {
        toast.error(`Failed to set window always on top: ${String(error)}`);
      }
    };

    void initAlwaysOnTop();
  }, [alwaysOnTop, getWindow]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    const applyPenetrable = async () => {
      try {
        const window = await getWindow();
        await window?.setIgnoreCursorEvents(penetrable);
      } catch (error) {
        toast.error(`Failed to set window click-through: ${String(error)}`);
      }
    };

    void applyPenetrable();
  }, [penetrable, getWindow]);

  useEffect(() => {
    if (!isTauriRuntime() || !isInitializedRef.current) {
      return;
    }

    const applyAlwaysOnTop = async () => {
      try {
        const window = await getWindow();
        await window?.setAlwaysOnTop(alwaysOnTop);
      } catch (error) {
        toast.error(`Failed to update window always on top: ${String(error)}`);
      }
    };

    void applyAlwaysOnTop();
  }, [alwaysOnTop, getWindow]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    const applyVisibility = async () => {
      try {
        const window = await getWindow();
        if (!window) {
          return;
        }

        if (visible) {
          await window.show();
          await window.setFocus();
        } else {
          await window.hide();
        }
      } catch (error) {
        toast.error(`Failed to set window visibility: ${String(error)}`);
      }
    };

    void applyVisibility();
  }, [visible, getWindow]);

  useEffect(() => {
    document.documentElement.style.setProperty("--window-opacity", (opacity / 100).toString());
  }, [opacity]);
}
