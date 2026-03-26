from __future__ import annotations

import copy
from typing import Any

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import (
    QCheckBox,
    QComboBox,
    QDialog,
    QDialogButtonBox,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QSlider,
    QVBoxLayout,
    QWidget,
)

from .config import APP_VERSION


class SettingsDialog(QDialog):
    def __init__(self, settings: dict[str, Any], parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._base_settings = copy.deepcopy(settings)
        self._updated_settings = copy.deepcopy(settings)

        self.setWindowTitle(f"桌宠设置 - PyQt5 {APP_VERSION}")
        self.setModal(True)
        self.resize(500, 500)
        self.setStyleSheet(
            """
            QDialog {
              background: #eef3f8;
              color: #172033;
            }
            QGroupBox {
              background: #ffffff;
              color: #172033;
              border: 1px solid #cdd8e6;
              border-radius: 16px;
              margin-top: 10px;
              padding-top: 14px;
              font-size: 15px;
              font-weight: 700;
            }
            QGroupBox::title {
              subcontrol-origin: margin;
              left: 14px;
              padding: 0 6px;
            }
            QLabel {
              color: #25324a;
              font-size: 14px;
            }
            QCheckBox {
              color: #1f2937;
              font-size: 15px;
              spacing: 8px;
            }
            QCheckBox::indicator {
              width: 18px;
              height: 18px;
            }
            QComboBox, QLineEdit {
              background: #ffffff;
              border: 1px solid #b9c7d8;
              border-radius: 10px;
              color: #172033;
              min-height: 38px;
              padding: 0 12px;
              selection-background-color: #dbeafe;
            }
            QComboBox::drop-down {
              border: none;
              width: 30px;
            }
            QSlider::groove:horizontal {
              border: none;
              height: 8px;
              border-radius: 4px;
              background: #d7e1ec;
            }
            QSlider::sub-page:horizontal {
              border-radius: 4px;
              background: #2b7be4;
            }
            QSlider::handle:horizontal {
              background: #ffffff;
              border: 2px solid #2b7be4;
              width: 18px;
              margin: -6px 0;
              border-radius: 9px;
            }
            QPushButton {
              min-height: 38px;
              border-radius: 19px;
              padding: 0 20px;
              font-size: 14px;
              font-weight: 700;
            }
            QPushButton#saveButton {
              background: #1677ff;
              color: #ffffff;
              border: 1px solid #1368df;
            }
            QPushButton#saveButton:hover {
              background: #126be5;
            }
            QPushButton#cancelButton {
              background: #ffffff;
              color: #223047;
              border: 1px solid #b9c7d8;
            }
            QPushButton#cancelButton:hover {
              background: #f5f8fc;
            }
            """
        )

        general = settings["general"]
        pet = settings["pet"]

        self.opacity_value_label = QLabel(f"{pet['opacity']}%")
        self.opacity_value_label.setStyleSheet("font-size: 14px; font-weight: 700; color: #223047;")

        self.opacity_slider = QSlider(Qt.Horizontal)
        self.opacity_slider.setRange(35, 100)
        self.opacity_slider.setValue(int(pet["opacity"]))
        self.opacity_slider.valueChanged.connect(self._sync_opacity_label)

        self.always_on_top_checkbox = QCheckBox("始终置顶")
        self.always_on_top_checkbox.setChecked(bool(pet["alwaysOnTop"]))

        self.click_through_checkbox = QCheckBox("点击穿透")
        self.click_through_checkbox.setChecked(bool(pet["clickThrough"]))

        self.mirror_checkbox = QCheckBox("镜像显示")
        self.mirror_checkbox.setChecked(bool(pet["mirrorMode"]))

        self.enable_tray_checkbox = QCheckBox("启用系统托盘")
        self.enable_tray_checkbox.setChecked(bool(general["enableTray"]))

        self.launch_on_startup_checkbox = QCheckBox("开机自启桌宠")
        self.launch_on_startup_checkbox.setChecked(bool(general["launchOnStartup"]))

        self.language_combo = QComboBox()
        self.language_combo.addItem("中文", "zh-CN")
        self.language_combo.addItem("English", "en-US")
        self._set_combo_value(self.language_combo, general["language"])

        self.model_combo = QComboBox()
        self.model_combo.addItem("ink_cat", "ink_cat")
        self.model_combo.addItem("standard", "standard")
        self.model_combo.addItem("keyboard", "keyboard")
        self.model_combo.addItem("naximofu_2", "naximofu_2")
        self._set_combo_value(self.model_combo, pet["modelId"])

        self.hotkey_input = QLineEdit(str(general["assistantHotkey"]))
        self.service_url_input = QLineEdit(str(settings["ai"]["serviceUrl"]))

        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 18, 20, 18)
        layout.setSpacing(14)

        layout.addWidget(self._build_pet_group())
        layout.addWidget(self._build_general_group())

        footer = QLabel("当前桌面端已切换为 Python + PyQt5，序列帧素材与 settings.json 会一起复用。")
        footer.setWordWrap(True)
        footer.setStyleSheet("color: #4b5d78; font-size: 13px;")
        layout.addWidget(footer)

        self.button_box = QDialogButtonBox(Qt.Horizontal, self)
        self.save_button = QPushButton("保存")
        self.save_button.setObjectName("saveButton")
        self.save_button.setDefault(True)
        self.cancel_button = QPushButton("取消")
        self.cancel_button.setObjectName("cancelButton")
        self.button_box.addButton(self.save_button, QDialogButtonBox.AcceptRole)
        self.button_box.addButton(self.cancel_button, QDialogButtonBox.RejectRole)
        self.button_box.accepted.connect(self._accept)
        self.button_box.rejected.connect(self.reject)
        layout.addWidget(self.button_box)

    @property
    def updated_settings(self) -> dict[str, Any]:
        return copy.deepcopy(self._updated_settings)

    def _build_pet_group(self) -> QGroupBox:
        group = QGroupBox("桌宠")
        form = QFormLayout(group)
        form.setContentsMargins(18, 18, 18, 18)
        form.setHorizontalSpacing(16)
        form.setVerticalSpacing(14)

        opacity_row = QWidget()
        opacity_layout = QHBoxLayout(opacity_row)
        opacity_layout.setContentsMargins(0, 0, 0, 0)
        opacity_layout.setSpacing(12)
        opacity_layout.addWidget(self.opacity_slider, 1)
        opacity_layout.addWidget(self.opacity_value_label)

        form.addRow("透明度", opacity_row)
        form.addRow("模型", self.model_combo)
        form.addRow("", self.always_on_top_checkbox)
        form.addRow("", self.click_through_checkbox)
        form.addRow("", self.mirror_checkbox)
        return group

    def _build_general_group(self) -> QGroupBox:
        group = QGroupBox("通用")
        form = QFormLayout(group)
        form.setContentsMargins(18, 18, 18, 18)
        form.setHorizontalSpacing(16)
        form.setVerticalSpacing(14)

        form.addRow("", self.enable_tray_checkbox)
        form.addRow("", self.launch_on_startup_checkbox)
        form.addRow("语言", self.language_combo)
        form.addRow("助手快捷键", self.hotkey_input)
        form.addRow("服务地址", self.service_url_input)
        return group

    def _sync_opacity_label(self, value: int) -> None:
        self.opacity_value_label.setText(f"{value}%")

    def _set_combo_value(self, combo: QComboBox, value: str) -> None:
        index = combo.findData(value)
        if index >= 0:
            combo.setCurrentIndex(index)

    def _accept(self) -> None:
        updated = copy.deepcopy(self._base_settings)
        updated["pet"]["opacity"] = int(self.opacity_slider.value())
        updated["pet"]["alwaysOnTop"] = self.always_on_top_checkbox.isChecked()
        updated["pet"]["clickThrough"] = self.click_through_checkbox.isChecked()
        updated["pet"]["mirrorMode"] = self.mirror_checkbox.isChecked()
        updated["pet"]["modelId"] = str(self.model_combo.currentData())

        updated["general"]["enableTray"] = self.enable_tray_checkbox.isChecked()
        updated["general"]["launchOnStartup"] = self.launch_on_startup_checkbox.isChecked()
        updated["general"]["language"] = str(self.language_combo.currentData())
        updated["general"]["assistantHotkey"] = self.hotkey_input.text().strip() or "Alt+Shift+B"
        updated["ai"]["serviceUrl"] = self.service_url_input.text().strip() or "http://127.0.0.1:4343"

        if updated["pet"]["clickThrough"] and not updated["general"]["enableTray"]:
            QMessageBox.information(
                self,
                "已自动修正",
                "开启点击穿透时必须保留系统托盘，否则将无法再次打开设置。",
            )
            updated["general"]["enableTray"] = True

        self._updated_settings = updated
        self.accept()
