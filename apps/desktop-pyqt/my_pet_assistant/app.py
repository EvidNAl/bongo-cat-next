from __future__ import annotations

import argparse
import sys

from PyQt5.QtGui import QIcon
from PyQt5.QtWidgets import QApplication, QMessageBox, QSystemTrayIcon

from .config import APP_NAME, APP_VERSION, ICON_PATH, TRAY_ICON_PATH, load_settings, save_settings
from .pet_window import PetWindow
from .settings_dialog import SettingsDialog


class DesktopPetController:
    def __init__(self) -> None:
        self.settings = load_settings()
        self.app = QApplication(sys.argv)
        self.app.setApplicationName(APP_NAME)
        self.app.setQuitOnLastWindowClosed(False)

        icon_path = TRAY_ICON_PATH if TRAY_ICON_PATH.exists() else ICON_PATH
        self.app.setWindowIcon(QIcon(str(icon_path)))

        self.pet_window = PetWindow(self.settings)
        self.pet_window.settings_requested.connect(self.open_settings)
        self.pet_window.quit_requested.connect(self.quit)

        self.tray_icon: QSystemTrayIcon | None = None
        self.sync_tray()

    def sync_tray(self) -> None:
        enable_tray = bool(self.settings["general"]["enableTray"])
        if not enable_tray:
            if self.tray_icon is not None:
                self.tray_icon.hide()
                self.tray_icon.deleteLater()
                self.tray_icon = None
            return

        icon_path = TRAY_ICON_PATH if TRAY_ICON_PATH.exists() else ICON_PATH
        if self.tray_icon is None:
            self.tray_icon = QSystemTrayIcon(QIcon(str(icon_path)), self.app)
            self.tray_icon.activated.connect(self._handle_tray_activation)

        self.tray_icon.setContextMenu(self.pet_window.build_tray_menu())
        self.tray_icon.setToolTip(f"{APP_NAME} PyQt5 {APP_VERSION}")
        self.tray_icon.show()

    def open_settings(self) -> None:
        dialog = SettingsDialog(self.settings, self.pet_window)
        if dialog.exec_() != SettingsDialog.Accepted:
            return

        self.settings = save_settings(dialog.updated_settings)
        self.pet_window.apply_settings(self.settings)
        self.sync_tray()

        save_message = "设置已保存并立即生效。"
        if self.settings["pet"]["clickThrough"]:
            save_message += "\n点击穿透已开启，如需再次打开设置，请使用系统托盘。"

        QMessageBox.information(self.pet_window, "保存成功", save_message)

        if self.tray_icon is not None:
            self.tray_icon.showMessage(APP_NAME, "设置已保存并立即生效。")

    def _handle_tray_activation(self, reason: QSystemTrayIcon.ActivationReason) -> None:
        if reason == QSystemTrayIcon.Trigger:
            self.pet_window.toggle_visibility()

    def run(self) -> int:
        return self.app.exec_()

    def quit(self) -> None:
        if self.tray_icon is not None:
            self.tray_icon.hide()
        self.app.quit()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="My Pet Assistant PyQt5 desktop pet")
    parser.add_argument("--smoke-test", action="store_true", help="Validate Python entrypoint and settings loading.")
    args = parser.parse_args(argv)

    if args.smoke_test:
        settings = load_settings()
        if not isinstance(settings, dict) or "pet" not in settings:
            raise SystemExit("settings_failed")
        print(f"smoke_ok {APP_VERSION}")
        return 0

    controller = DesktopPetController()

    try:
        return controller.run()
    except Exception as error:  # pragma: no cover
        QMessageBox.critical(None, APP_NAME, f"桌宠启动失败：{error}")
        return 1
