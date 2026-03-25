"use client";

import { useRef } from "react";
import { getName, getVersion } from "@tauri-apps/api/app";
import { resolveResource } from "@tauri-apps/api/path";
import { TrayIcon } from "@tauri-apps/api/tray";
import type { TrayIconOptions } from "@tauri-apps/api/tray";
import { toast } from "sonner";
import { _useMenuFactory } from "@/hooks/menu/_use-menu-factory";

const TRAY_ID = "BONGO_CAT_TRAY";

let traySingleton: TrayIcon | null = null;
let trayCreationPromise: Promise<TrayIcon | undefined> | null = null;

export function useTray() {
  const { createMenu } = _useMenuFactory();
  const trayRef = useRef<TrayIcon | null>(null);

  const updateTrayMenu = async (tray: TrayIcon) => {
    try {
      const menu = await createMenu({ type: "tray" });
      await tray.setMenu(menu);
    } catch (error) {
      toast.error(`Failed to update tray menu: ${String(error)}`);
    }
  };

  const createTray = async () => {
    if (traySingleton) {
      trayRef.current = traySingleton;
      await updateTrayMenu(traySingleton);
      return traySingleton;
    }

    if (trayCreationPromise) {
      const tray = await trayCreationPromise;
      if (tray) {
        trayRef.current = tray;
      }
      return tray;
    }

    trayCreationPromise = (async () => {
      try {
        const existingTray = await TrayIcon.getById(TRAY_ID);
        if (existingTray) {
          traySingleton = existingTray;
          trayRef.current = existingTray;
          await updateTrayMenu(existingTray);
          return existingTray;
        }

        const appName = await getName();
        const appVersion = await getVersion();
        const menu = await createMenu({ type: "tray" });
        const icon = await resolveResource("assets/tray.png");

        const options: TrayIconOptions = {
          menu,
          icon,
          id: TRAY_ID,
          tooltip: `${appName} v${appVersion}`,
          iconAsTemplate: false,
          menuOnLeftClick: true
        };

        const tray = await TrayIcon.new(options);
        traySingleton = tray;
        trayRef.current = tray;
        return tray;
      } catch (error) {
        toast.error(`Failed to create system tray: ${String(error)}`);
      } finally {
        trayCreationPromise = null;
      }
    })();

    return trayCreationPromise;
  };

  return {
    createTray,
    refreshTrayMenu: async () => {
      const tray = trayRef.current ?? traySingleton;
      if (tray) {
        await updateTrayMenu(tray);
      }
    }
  };
}
