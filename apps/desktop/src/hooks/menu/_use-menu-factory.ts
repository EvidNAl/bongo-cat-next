import { useCallback } from "react";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { useTranslation } from "react-i18next";
import { exit } from "@tauri-apps/plugin-process";
import { toast } from "sonner";
import { _useMenuBuilder } from "@/hooks/menu/_use-menu-builder";
import { showSettingsWindow } from "@/services/tauri-client";
import { useCatStore } from "@/stores/cat-store";
import { usePetInteractionStore } from "@/stores/pet-interaction-store";
import { useModelStore } from "@/stores/model-store";

export type MenuType = "context" | "tray";

export interface MenuOptions {
  type: MenuType;
  includeAppInfo?: boolean;
  includeAppControls?: boolean;
}

export function _useMenuFactory() {
  const { t } = useTranslation(["system"]);
  const { visible, setVisible } = useCatStore();
  const { currentModel } = useModelStore();
  const { followEnabled, issueCommand } = usePetInteractionStore();
  const {
    createModeSubmenu,
    createPenetrableMenuItem,
    createAlwaysOnTopMenuItem,
    createMirrorModeMenuItem,
    createScaleSubmenu,
    createOpacitySubmenu,
    createSelectorsVisibilityMenuItem,
    createLanguageSubmenu,
    menuStates
  } = _useMenuBuilder();

  const createCoreMenuItems = useCallback(async () => {
    return [
      await createModeSubmenu(),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await createPenetrableMenuItem(),
      await createAlwaysOnTopMenuItem(),
      await createMirrorModeMenuItem(),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await createScaleSubmenu(),
      await createOpacitySubmenu(),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await createSelectorsVisibilityMenuItem()
    ];
  }, [
    createAlwaysOnTopMenuItem,
    createMirrorModeMenuItem,
    createModeSubmenu,
    createOpacitySubmenu,
    createPenetrableMenuItem,
    createScaleSubmenu,
    createSelectorsVisibilityMenuItem
  ]);

  const createAppInfoMenuItems = useCallback(async () => {
    const { getVersion } = await import("@tauri-apps/api/app");
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    const appVersion = await getVersion();

    return [
      await MenuItem.new({
        text: t("system:sourceCode"),
        action: () => void openUrl("https://github.com/liwenka1/bongo-cat-next")
      }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await MenuItem.new({
        text: `${t("system:version")} ${appVersion}`,
        enabled: false
      })
    ];
  }, [t]);

  const createAppControlMenuItems = useCallback(async () => {
    const { relaunch } = await import("@tauri-apps/plugin-process");

    return [
      await MenuItem.new({
        text: "Settings",
        action: () => void showSettingsWindow()
      }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await MenuItem.new({
        text: t("system:restart"),
        action: () => void relaunch()
      }),
      await MenuItem.new({
        text: t("system:quit"),
        accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
        action: () => void exit(0)
      })
    ];
  }, [t]);

  const createInteractivePetMenuItems = useCallback(async () => {
    if (currentModel?.mode !== "interactive") {
      return [];
    }

    return [
      await MenuItem.new({
        text: "摸摸",
        action: () => {
          issueCommand("pet");
        }
      }),
      await MenuItem.new({
        text: "喂鱼",
        action: () => {
          issueCommand("feed");
        }
      }),
      await MenuItem.new({
        text: "逗球",
        action: () => {
          issueCommand("play");
        }
      }),
      await MenuItem.new({
        text: followEnabled ? "停止跟随" : "跟随鼠标",
        action: () => {
          issueCommand("toggle_follow");
        }
      })
    ];
  }, [currentModel?.mode, followEnabled, issueCommand]);

  const createMenu = useCallback(
    async (options: MenuOptions) => {
      const items = [];

      items.push(
        await MenuItem.new({
          text: visible ? t("system:hideCat") : t("system:showCat"),
          action: () => {
            setVisible(!visible);
          }
        }),
        await PredefinedMenuItem.new({ item: "Separator" })
      );

      items.push(...(await createCoreMenuItems()));

      switch (options.type) {
        case "tray":
          items.push(await PredefinedMenuItem.new({ item: "Separator" }), await createLanguageSubmenu());

          if (options.includeAppInfo !== false) {
            items.push(await PredefinedMenuItem.new({ item: "Separator" }), ...(await createAppInfoMenuItems()));
          }

          if (options.includeAppControls !== false) {
            items.push(await PredefinedMenuItem.new({ item: "Separator" }), ...(await createAppControlMenuItems()));
          }
          break;

        case "context":
          if (currentModel?.mode === "interactive") {
            items.push(await PredefinedMenuItem.new({ item: "Separator" }), ...(await createInteractivePetMenuItems()));
          }

          items.push(await PredefinedMenuItem.new({ item: "Separator" }), await createLanguageSubmenu());
          items.push(
            await PredefinedMenuItem.new({ item: "Separator" }),
            await MenuItem.new({
              text: "Settings",
              action: () => void showSettingsWindow()
            }),
            await MenuItem.new({
              text: t("system:quit"),
              action: () => void exit(0)
            })
          );
          break;
      }

      return Menu.new({ items });
    },
    [
      createAppControlMenuItems,
      createAppInfoMenuItems,
      createCoreMenuItems,
      createInteractivePetMenuItems,
      createLanguageSubmenu,
      currentModel?.mode,
      setVisible,
      t,
      visible
    ]
  );

  const showMenu = useCallback(
    async (options: MenuOptions) => {
      try {
        const menu = await createMenu(options);

        if (options.type === "context") {
          await menu.popup();
        }

        return menu;
      } catch (error) {
        toast.error(`Failed to show ${options.type} menu: ${String(error)}`);
      }
    },
    [createMenu]
  );

  return {
    createMenu,
    showMenu,
    menuStates: {
      visible,
      ...menuStates
    }
  };
}
