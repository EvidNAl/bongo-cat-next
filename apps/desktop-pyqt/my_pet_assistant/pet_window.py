from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from PyQt5.QtCore import QPoint, QPointF, QRectF, QSize, Qt, QTimer, pyqtSignal
from PyQt5.QtGui import QBrush, QColor, QCursor, QFont, QIcon, QPainter, QPainterPath, QPen, QPixmap
from PyQt5.QtWidgets import QAction, QDesktopWidget, QMenu, QWidget

from .config import APP_NAME, ICON_PATH, PET_SEQUENCE_DIR

PET_LINES = {
    "sleeping": ["呼噜...", "先睡一会。", "我在打盹。"],
    "watching": ["我跟着你走。", "你动一下，我追一下。", "别跑太快。"],
    "petting": ["这里摸得刚刚好。", "呼噜呼噜。", "再摸一下。"],
    "fed": ["小鱼干收到。", "这一口很满足。", "吃完更有精神了。"],
    "playful": ["球呢，再来一轮。", "我还没玩够。", "继续逗我。"],
    "clingy": ["你停下来了，那我来撒娇。", "别走，陪我一会。", "看看我。"],
}

MOOD_TO_SEQUENCE = {
    "sleeping": "默认睡觉",
    "watching": "鼠标跟随",
    "petting": "抚摸",
    "fed": "喂食",
    "playful": "逗球",
    "clingy": "停住撒娇",
}

MOOD_HOLD_SECONDS = {
    "petting": 2.2,
    "fed": 2.8,
    "playful": 2.2,
    "clingy": 2.8,
}

ONE_SHOT_MOODS = {"petting", "fed", "playful", "clingy"}

WINDOW_WIDTH = 180
WINDOW_HEIGHT = 180
BUBBLE_TOP = 4.0
BUBBLE_SIDE_MARGIN = 8.0
BUBBLE_HEIGHT = 34.0
SPRITE_SIDE_MARGIN = 10
SPRITE_BOTTOM_MARGIN = 6
SPRITE_TOP_MARGIN = 42
IDLE_GLANCE_INTERVAL_RANGE = (9.0, 17.0)
IDLE_GLANCE_DURATION_RANGE = (2.8, 4.5)
FOLLOW_BURST_STEP_RANGE = (2, 4)
FOLLOW_STEP_INTERVAL_RANGE = (0.05, 0.09)
FOLLOW_PAUSE_RANGE = (0.12, 0.26)
FOLLOW_SETTLE_DISTANCE = 18
FOLLOW_CLINGY_DISTANCE = 26
FOLLOW_REPOSITION_DISTANCE = 34
AUTONOMOUS_ACTION_INTERVAL_RANGE = (14.0, 26.0)
NEEDY_ACTION_INTERVAL_RANGE = (8.0, 14.0)
SATIETY_DECAY_INTERVAL_RANGE = (22.0, 34.0)
AFFECTION_DECAY_INTERVAL_RANGE = (28.0, 42.0)
LOW_SATIETY_THRESHOLD = 38
LOW_AFFECTION_THRESHOLD = 46
HIGH_ENERGY_SATIETY_THRESHOLD = 68
HIGH_ENERGY_AFFECTION_THRESHOLD = 72


@dataclass
class FloatingEffect:
    kind: str
    x: float
    y: float
    ttl: int


@dataclass(frozen=True)
class AnimationBeat:
    frame_index: int
    duration_ms: int


class PetWindow(QWidget):
    settings_requested = pyqtSignal()
    quit_requested = pyqtSignal()

    def __init__(self, settings: dict[str, Any]) -> None:
        super().__init__(None)
        self.settings = settings
        self.follow_enabled = False
        self.mood = "sleeping"
        self.speech = self._pick_line("sleeping")
        self.affection = 90
        self.satiety = 70
        self.effects: list[FloatingEffect] = []
        self.drag_active = False
        self.drag_press_global = QPoint()
        self.drag_window_origin = QPoint()
        self.last_cursor_pos = QCursor.pos()
        self.last_move_at = time.monotonic()
        self.last_mood_at = self.last_move_at
        self.frame_index = 0
        self.animation_plan: list[AnimationBeat] = []
        self.animation_step_index = 0
        self.next_frame_at = self.last_move_at
        self.next_idle_action_at = self.last_move_at
        self.follow_pause_until = self.last_move_at
        self.follow_next_step_at = self.last_move_at
        self.follow_steps_remaining = 0
        self.mood_hold_until = 0.0
        self.next_autonomous_action_at = self.last_move_at
        self.next_satiety_decay_at = self.last_move_at
        self.next_affection_decay_at = self.last_move_at

        self.sequence_frames = self._load_sequence_frames()
        self.has_sprite_assets = all(self.sequence_frames.get(name) for name in MOOD_TO_SEQUENCE.values())
        self.max_frame_size = self._measure_max_frame_size()
        self._schedule_next_idle_action(self.last_move_at)
        self._schedule_next_autonomous_action(self.last_move_at)
        self._schedule_next_need_decay(self.last_move_at)
        self._reset_animation(self.last_move_at)

        self.setWindowTitle(f"{APP_NAME} PyQt5")
        self.setFixedSize(WINDOW_WIDTH, WINDOW_HEIGHT)
        self.setMouseTracking(True)
        self.setWindowIcon(QIcon(str(ICON_PATH)))
        self._configure_transparent_window()

        self.timer = QTimer(self)
        self.timer.setInterval(33)
        self.timer.timeout.connect(self._tick)
        self.timer.start()

        self.apply_settings(settings, keep_position=False)
        self.show()

    def apply_settings(self, settings: dict[str, Any], keep_position: bool = True) -> None:
        self.settings = settings
        current_pos = self.pos()

        flags = self._build_window_flags()
        if settings["pet"]["alwaysOnTop"]:
            flags |= Qt.WindowStaysOnTopHint

        transparent_input_flag = getattr(Qt, "WindowTransparentForInput", 0)
        if settings["pet"]["clickThrough"] and transparent_input_flag:
            flags |= transparent_input_flag

        self.setWindowFlags(flags)
        self.setWindowOpacity(max(0.35, min(1.0, settings["pet"]["opacity"] / 100.0)))
        self._configure_transparent_window()

        if keep_position:
            self.move(current_pos)
        else:
            self.move(self._default_position())

        self.show()
        self.update()

    def trigger_pet(self) -> None:
        self._apply_reaction("petting", affection_delta=2, effect_kind="heart")

    def trigger_feed(self) -> None:
        self._apply_reaction("fed", affection_delta=1, satiety_delta=8, effect_kind="snack", effect_count=3)

    def trigger_play(self) -> None:
        self._apply_reaction("playful", affection_delta=2, satiety_delta=-2, effect_kind="spark", effect_count=3)

    def toggle_follow(self) -> None:
        self.follow_enabled = not self.follow_enabled
        self._reset_drag()
        now = time.monotonic()
        self.last_move_at = now
        self._reset_follow_motion(now)
        if self.follow_enabled:
            self._set_mood("watching")
        else:
            self._set_sleeping("我停下来了。")
        self.update()

    def stop_follow(self) -> None:
        if not self.follow_enabled:
            return
        self.follow_enabled = False
        self._reset_follow_motion(time.monotonic())
        self._set_sleeping("我停下来了。")

    def toggle_visibility(self) -> None:
        if self.isVisible():
            self.hide()
        else:
            self.show()

    def build_tray_menu(self, parent: QWidget | None = None) -> QMenu:
        menu = QMenu(parent)
        menu.addAction(self._create_action(menu, "显示/隐藏桌宠", self.toggle_visibility))
        menu.addSeparator()
        menu.addAction(self._create_action(menu, "抚摸", self.trigger_pet))
        menu.addAction(self._create_action(menu, "喂食", self.trigger_feed))
        menu.addAction(self._create_action(menu, "逗球", self.trigger_play))
        menu.addAction(self._create_action(menu, "停止跟随" if self.follow_enabled else "跟随鼠标", self.toggle_follow))
        menu.addSeparator()
        menu.addAction(self._create_action(menu, "打开设置", lambda: self.settings_requested.emit()))
        menu.addAction(self._create_action(menu, "退出", lambda: self.quit_requested.emit()))
        return menu

    def paintEvent(self, _event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing, True)
        painter.setRenderHint(QPainter.SmoothPixmapTransform, True)
        painter.setPen(Qt.NoPen)
        self._draw_speech_bubble(painter)
        self._draw_effects(painter)
        self._draw_pet(painter)

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.LeftButton:
            self.trigger_pet()
            if not self.follow_enabled:
                self.drag_active = True
                self.drag_press_global = event.globalPos()
                self.drag_window_origin = self.pos()
                event.accept()
                return
        elif event.button() == Qt.RightButton:
            self._show_context_menu(event.globalPos())
            event.accept()
            return

        super().mousePressEvent(event)

    def mouseMoveEvent(self, event) -> None:
        if self.drag_active and not self.follow_enabled and event.buttons() & Qt.LeftButton:
            delta = event.globalPos() - self.drag_press_global
            self.move(self.drag_window_origin + delta)
            event.accept()
            return

        super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event) -> None:
        if event.button() == Qt.LeftButton:
            self._reset_drag()
            event.accept()
            return

        super().mouseReleaseEvent(event)

    def mouseDoubleClickEvent(self, event) -> None:
        if event.button() == Qt.LeftButton:
            self.stop_follow()

    def contextMenuEvent(self, event) -> None:
        self._show_context_menu(event.globalPos())

    def closeEvent(self, event) -> None:
        self.quit_requested.emit()
        event.ignore()

    def _create_action(self, menu: QMenu, text: str, callback: Callable[[], None]) -> QAction:
        action = QAction(text, menu)
        action.triggered.connect(callback)
        return action

    def _show_context_menu(self, global_pos: QPoint) -> None:
        menu = self.build_tray_menu(self)
        menu.exec_(global_pos)

    def _build_window_flags(self) -> Qt.WindowFlags:
        return Qt.Tool | Qt.FramelessWindowHint

    def _configure_transparent_window(self) -> None:
        self.setAttribute(Qt.WA_TranslucentBackground, True)
        self.setAutoFillBackground(False)

    def _reset_drag(self) -> None:
        self.drag_active = False
        self.drag_press_global = QPoint()
        self.drag_window_origin = QPoint()

    def _reset_follow_motion(self, now: float) -> None:
        self.follow_pause_until = now
        self.follow_next_step_at = now
        self.follow_steps_remaining = 0

    def _schedule_next_idle_action(self, now: float) -> None:
        self.next_idle_action_at = now + random.uniform(*IDLE_GLANCE_INTERVAL_RANGE)

    def _schedule_next_autonomous_action(self, now: float, needy: bool = False) -> None:
        interval_range = NEEDY_ACTION_INTERVAL_RANGE if needy else AUTONOMOUS_ACTION_INTERVAL_RANGE
        self.next_autonomous_action_at = now + random.uniform(*interval_range)

    def _schedule_next_need_decay(self, now: float) -> None:
        self.next_satiety_decay_at = now + random.uniform(*SATIETY_DECAY_INTERVAL_RANGE)
        self.next_affection_decay_at = now + random.uniform(*AFFECTION_DECAY_INTERVAL_RANGE)

    def _tick_needs(self, now: float) -> None:
        while now >= self.next_satiety_decay_at:
            self.satiety = max(0, self.satiety - 1)
            self.next_satiety_decay_at += random.uniform(*SATIETY_DECAY_INTERVAL_RANGE)

        while now >= self.next_affection_decay_at:
            self.affection = max(0, self.affection - 1)
            self.next_affection_decay_at += random.uniform(*AFFECTION_DECAY_INTERVAL_RANGE)

    def _maybe_trigger_idle_behavior(self, now: float) -> None:
        if self.follow_enabled:
            return

        if self.mood != "sleeping":
            return

        if now < self.next_idle_action_at:
            return

        self._set_mood(
            "watching",
            random.choice(["嗯？", "看看周围。", "醒一下。"]),
            hold_seconds=random.uniform(*IDLE_GLANCE_DURATION_RANGE),
        )
        self._schedule_next_idle_action(now)

    def _maybe_trigger_autonomous_behavior(self, now: float) -> None:
        if self.follow_enabled:
            return

        if self.mood != "sleeping":
            return

        if now < self.next_autonomous_action_at:
            return

        needy = self.satiety <= LOW_SATIETY_THRESHOLD or self.affection <= LOW_AFFECTION_THRESHOLD

        if self.satiety <= LOW_SATIETY_THRESHOLD:
            self._set_mood(
                "watching",
                random.choice(["肚子有点饿。", "想吃小鱼。", "可以喂我吗？"]),
                hold_seconds=random.uniform(3.6, 5.2),
            )
        elif self.affection <= LOW_AFFECTION_THRESHOLD:
            self._set_mood(
                "clingy",
                random.choice(["摸摸我。", "陪我一下。", "今天想黏着你。"]),
                hold_seconds=random.uniform(2.8, 4.2),
            )
            self._spawn_effect("heart", 1)
        elif self.satiety >= HIGH_ENERGY_SATIETY_THRESHOLD and self.affection >= HIGH_ENERGY_AFFECTION_THRESHOLD and random.random() < 0.42:
            self._set_mood(
                "playful",
                random.choice(["想玩球。", "动一下嘛。", "我想活动活动。"]),
                hold_seconds=random.uniform(2.6, 3.4),
            )
            self._spawn_effect("spark", 2)
            self.satiety = max(0, self.satiety - 1)
        else:
            self._set_mood(
                "watching",
                random.choice(["我在守着你。", "让我看看你在做什么。", "先观察一下。"]),
                hold_seconds=random.uniform(2.4, 3.6),
            )

        self._schedule_next_autonomous_action(now, needy=needy)

    def _bounded_follow_step(self, delta: int, minimum: int, maximum: int) -> int:
        if delta == 0:
            return 0

        distance = abs(delta)
        step = max(minimum, int(distance * 0.35))
        step = min(step, maximum)
        return step if delta > 0 else -step

    def _begin_follow_burst(self, now: float) -> None:
        self.follow_steps_remaining = random.randint(*FOLLOW_BURST_STEP_RANGE)
        self.follow_next_step_at = now

    def _tick(self) -> None:
        now = time.monotonic()
        self._update_effects()
        self._tick_needs(now)

        if self.follow_enabled:
            self._follow_cursor(now)
        else:
            self._maybe_trigger_idle_behavior(now)
            self._maybe_trigger_autonomous_behavior(now)
            if self.mood != "sleeping" and self.mood_hold_until and now >= self.mood_hold_until:
                self._set_sleeping()

        self._advance_frame(now)
        self.update()

    def _follow_cursor(self, now: float) -> None:
        cursor = QCursor.pos()
        cursor_moved = cursor != self.last_cursor_pos
        if cursor_moved:
            self.last_cursor_pos = cursor
            self.last_move_at = now
            if self.mood in {"sleeping", "clingy"}:
                self._set_mood("watching")

        available = QDesktopWidget().availableGeometry(cursor)
        target_x = int(cursor.x() - self.width() * 0.36)
        target_y = int(cursor.y() - self.height() * 0.78)
        target_x = max(available.left(), min(target_x, available.right() - self.width()))
        target_y = max(available.top(), min(target_y, available.bottom() - self.height()))

        current = self.pos()
        delta_x = target_x - current.x()
        delta_y = target_y - current.y()
        distance = max(abs(delta_x), abs(delta_y))

        if cursor_moved and self.mood == "clingy":
            self._set_mood("watching")

        if distance <= FOLLOW_SETTLE_DISTANCE:
            self.follow_steps_remaining = 0
            idle_for = now - self.last_move_at
            if idle_for > 1.7 and distance <= FOLLOW_CLINGY_DISTANCE and self.mood != "clingy":
                self._apply_reaction("clingy", affection_delta=1, effect_kind="heart", effect_count=2)
            return

        if self.follow_steps_remaining <= 0 and now >= self.follow_pause_until and distance > FOLLOW_SETTLE_DISTANCE:
            self._begin_follow_burst(now)

        if now < self.follow_pause_until or now < self.follow_next_step_at:
            return

        move_x = self._bounded_follow_step(delta_x, 6, 24)
        move_y = self._bounded_follow_step(delta_y, 4, 20)
        self.move(current.x() + move_x, current.y() + move_y)
        self.follow_steps_remaining = max(0, self.follow_steps_remaining - 1)
        self.follow_next_step_at = now + random.uniform(*FOLLOW_STEP_INTERVAL_RANGE)

        if self.follow_steps_remaining == 0:
            extra_pause = random.uniform(*FOLLOW_PAUSE_RANGE)
            if distance > 90:
                extra_pause += 0.06
            self.follow_pause_until = now + extra_pause

    def _update_effects(self) -> None:
        next_effects: list[FloatingEffect] = []
        for effect in self.effects:
            effect.ttl -= 1
            effect.y -= 1.4
            if effect.ttl > 0:
                next_effects.append(effect)
        self.effects = next_effects

    def _advance_frame(self, now: float) -> None:
        frames = self._current_frames()
        if len(frames) <= 1:
            return

        if now < self.next_frame_at:
            return

        if not self.animation_plan:
            self._reset_animation(now)
            return

        if self.mood in ONE_SHOT_MOODS and self.animation_step_index >= len(self.animation_plan) - 1:
            return

        self.animation_step_index += 1
        if self.animation_step_index >= len(self.animation_plan):
            self._reset_animation(now)
            return

        beat = self.animation_plan[self.animation_step_index]
        self.frame_index = min(beat.frame_index, len(frames) - 1)
        self.next_frame_at = now + beat.duration_ms / 1000.0

    def _apply_reaction(
        self,
        mood: str,
        affection_delta: int = 0,
        satiety_delta: int = 0,
        effect_kind: str | None = None,
        effect_count: int = 2,
    ) -> None:
        self._set_mood(mood)
        self._schedule_next_idle_action(time.monotonic())
        self._schedule_next_autonomous_action(time.monotonic())
        self.affection = max(0, min(100, self.affection + affection_delta))
        self.satiety = max(0, min(100, self.satiety + satiety_delta))

        if effect_kind:
            self._spawn_effect(effect_kind, effect_count)

    def _spawn_effect(self, effect_kind: str, effect_count: int = 2) -> None:
        for _ in range(effect_count):
            self.effects.append(
                FloatingEffect(
                    kind=effect_kind,
                    x=random.uniform(-70.0, 70.0),
                    y=random.uniform(-12.0, 22.0),
                    ttl=34,
                )
            )

    def _set_mood(self, mood: str, speech: str | None = None, hold_seconds: float | None = None) -> None:
        mood_changed = mood != self.mood
        self.mood = mood
        self.speech = speech or self._pick_line(mood)
        self.last_mood_at = time.monotonic()

        if hold_seconds is None:
            default_hold = MOOD_HOLD_SECONDS.get(mood, 0.0)
            self.mood_hold_until = self.last_mood_at + default_hold if default_hold else 0.0
        else:
            self.mood_hold_until = self.last_mood_at + hold_seconds if hold_seconds > 0 else 0.0

        if mood_changed or mood in ONE_SHOT_MOODS:
            self._reset_animation(self.last_mood_at)

    def _set_sleeping(self, speech: str | None = None) -> None:
        self._set_mood("sleeping", speech)
        self._schedule_next_idle_action(self.last_mood_at)
        self._schedule_next_autonomous_action(self.last_mood_at)

    def _pick_line(self, mood: str) -> str:
        return random.choice(PET_LINES[mood])

    def _default_position(self) -> QPoint:
        available = QDesktopWidget().availableGeometry(QCursor.pos())
        return QPoint(available.right() - self.width() - 36, available.bottom() - self.height() - 56)

    def _load_sequence_frames(self) -> dict[str, list[QPixmap]]:
        sequences: dict[str, list[QPixmap]] = {}
        for sequence_name in MOOD_TO_SEQUENCE.values():
            folder = PET_SEQUENCE_DIR / sequence_name
            frames: list[QPixmap] = []
            if folder.exists():
                for frame_path in sorted(folder.glob("*.png")):
                    pixmap = QPixmap(str(frame_path))
                    if not pixmap.isNull():
                        frames.append(pixmap)
            sequences[sequence_name] = frames
        return sequences

    def _measure_max_frame_size(self) -> QSize:
        max_width = 0
        max_height = 0
        for frames in self.sequence_frames.values():
            for frame in frames:
                max_width = max(max_width, frame.width())
                max_height = max(max_height, frame.height())
        return QSize(max_width or 168, max_height or 134)

    def _current_frames(self) -> list[QPixmap]:
        return self.sequence_frames.get(MOOD_TO_SEQUENCE[self.mood], [])

    def _reset_animation(self, now: float | None = None) -> None:
        now = now or time.monotonic()
        frames = self._current_frames()
        if not frames:
            self.frame_index = 0
            self.animation_plan = []
            self.animation_step_index = 0
            self.next_frame_at = now + 1.0
            return

        self.animation_plan = self._build_animation_plan(self.mood, len(frames))
        if not self.animation_plan:
            self.animation_plan = [AnimationBeat(0, 1000)]

        self.animation_step_index = 0
        first_beat = self.animation_plan[0]
        self.frame_index = min(first_beat.frame_index, len(frames) - 1)
        self.next_frame_at = now + first_beat.duration_ms / 1000.0

    def _build_animation_plan(self, mood: str, frame_count: int) -> list[AnimationBeat]:
        if frame_count <= 0:
            return []
        if mood == "sleeping":
            return self._build_sleeping_plan(frame_count)
        if mood == "watching":
            return self._build_watching_plan(frame_count)
        if mood == "petting":
            return self._build_petting_plan(frame_count)
        if mood == "fed":
            return self._build_fed_plan(frame_count)
        if mood == "playful":
            return self._build_playful_plan(frame_count)
        if mood == "clingy":
            return self._build_clingy_plan(frame_count)
        return [AnimationBeat(0, 900)]

    def _build_sleeping_plan(self, frame_count: int) -> list[AnimationBeat]:
        plan = [AnimationBeat(0, random.randint(2400, 4200))]

        if frame_count >= 3:
            plan.extend(
                [
                    AnimationBeat(1, random.randint(420, 620)),
                    AnimationBeat(2, random.randint(620, 980)),
                    AnimationBeat(1, random.randint(460, 660)),
                ]
            )
        elif frame_count == 2:
            plan.extend(
                [
                    AnimationBeat(1, random.randint(700, 1000)),
                    AnimationBeat(0, random.randint(1200, 1800)),
                ]
            )

        if frame_count >= 4 and random.random() < 0.35:
            plan.append(AnimationBeat(3, random.randint(900, 1500)))

        plan.append(AnimationBeat(0, random.randint(2200, 3600)))
        return plan

    def _build_watching_plan(self, frame_count: int) -> list[AnimationBeat]:
        if frame_count == 1:
            return [AnimationBeat(0, 850)]

        if frame_count >= 5 and random.random() < 0.45:
            sequence = [0, 1, 2, 3, 4, 3, 2, 1, 0]
        elif frame_count >= 4:
            sequence = [0, 1, 2, 3, 2, 1, 0]
        elif frame_count == 3:
            sequence = [0, 1, 2, 1, 0]
        else:
            sequence = [0, 1, 0]

        plan: list[AnimationBeat] = []
        for index, frame_index in enumerate(sequence):
            if index == 0:
                duration = random.randint(500, 900)
            elif index == len(sequence) - 1:
                duration = random.randint(700, 1200)
            else:
                duration = random.randint(150, 260)
            plan.append(AnimationBeat(frame_index, duration))
        return plan

    def _build_petting_plan(self, frame_count: int) -> list[AnimationBeat]:
        return self._build_one_shot_plan(frame_count, [0, 1, 2, 3, 2, 1], 180, 280, 650, 900)

    def _build_fed_plan(self, frame_count: int) -> list[AnimationBeat]:
        return self._build_one_shot_plan(frame_count, [0, 1, 2, 3, 4, 3], 220, 320, 760, 1100)

    def _build_playful_plan(self, frame_count: int) -> list[AnimationBeat]:
        return self._build_one_shot_plan(frame_count, [0, 1, 2, 3, 4, 3, 2], 130, 220, 420, 700)

    def _build_clingy_plan(self, frame_count: int) -> list[AnimationBeat]:
        return self._build_one_shot_plan(frame_count, [0, 1, 2, 3, 4, 3, 2, 1], 180, 280, 820, 1200)

    def _build_one_shot_plan(
        self,
        frame_count: int,
        pattern: list[int],
        motion_min: int,
        motion_max: int,
        peak_hold_min: int,
        peak_hold_max: int,
    ) -> list[AnimationBeat]:
        if frame_count <= 0:
            return []

        sequence = self._fit_pattern(frame_count, pattern)
        peak_index = max(sequence) if sequence else 0
        plan: list[AnimationBeat] = []

        for position, frame_index in enumerate(sequence):
            if position == 0:
                duration = random.randint(180, 260)
            elif frame_index == peak_index:
                duration = random.randint(peak_hold_min, peak_hold_max)
            elif position == len(sequence) - 1:
                duration = random.randint(320, 520)
            else:
                duration = random.randint(motion_min, motion_max)
            plan.append(AnimationBeat(frame_index, duration))

        if not plan:
            plan.append(AnimationBeat(0, peak_hold_max))
        return plan

    def _fit_pattern(self, frame_count: int, pattern: list[int]) -> list[int]:
        if frame_count <= 0:
            return []

        fitted: list[int] = []
        last_value: int | None = None
        for value in pattern:
            clamped = max(0, min(frame_count - 1, value))
            if clamped != last_value:
                fitted.append(clamped)
                last_value = clamped
        return fitted or [0]

    def _draw_speech_bubble(self, painter: QPainter) -> None:
        bubble_rect = QRectF(
            BUBBLE_SIDE_MARGIN,
            BUBBLE_TOP,
            self.width() - BUBBLE_SIDE_MARGIN * 2,
            BUBBLE_HEIGHT,
        )
        bubble_color = QColor(67, 76, 94, 228)
        if self.mood == "clingy":
            bubble_color = QColor(117, 61, 80, 228)

        painter.setBrush(QBrush(bubble_color))
        painter.drawRoundedRect(bubble_rect, 16.0, 16.0)
        painter.setPen(QColor(248, 250, 252))
        painter.setFont(QFont("Microsoft YaHei UI", 10 if self.mood == "sleeping" else 11, QFont.Medium))
        painter.drawText(bubble_rect, Qt.AlignCenter, self.speech)

    def _draw_effects(self, painter: QPainter) -> None:
        painter.save()
        center_x = self.width() * 0.5
        center_y = self.height() * 0.5
        for effect in self.effects:
            alpha = max(40, min(255, int(effect.ttl * 7)))
            x = center_x + effect.x
            y = center_y + effect.y
            if effect.kind == "heart":
                painter.setPen(QPen(QColor(251, 113, 133, alpha), 2))
                painter.setBrush(QColor(251, 113, 133, alpha))
                path = QPainterPath(QPointF(x, y))
                path.cubicTo(x - 8, y - 10, x - 20, y + 4, x, y + 18)
                path.cubicTo(x + 20, y + 4, x + 8, y - 10, x, y)
                painter.drawPath(path)
            elif effect.kind == "spark":
                painter.setPen(QPen(QColor(125, 211, 252, alpha), 2))
                painter.drawLine(QPointF(x - 8, y), QPointF(x + 8, y))
                painter.drawLine(QPointF(x, y - 8), QPointF(x, y + 8))
                painter.drawLine(QPointF(x - 5, y - 5), QPointF(x + 5, y + 5))
                painter.drawLine(QPointF(x - 5, y + 5), QPointF(x + 5, y - 5))
            else:
                painter.setPen(Qt.NoPen)
                painter.setBrush(QColor(252, 211, 77, alpha))
                painter.drawRoundedRect(QRectF(x - 10, y - 4, 20, 8), 4.0, 4.0)
        painter.restore()

    def _draw_pet(self, painter: QPainter) -> None:
        frames = self._current_frames()
        if not self.has_sprite_assets or not frames:
            self._draw_missing_asset_placeholder(painter)
            return

        current_frame = frames[self.frame_index % len(frames)]
        sprite_width = max(1, self.max_frame_size.width())
        sprite_height = max(1, self.max_frame_size.height())
        available_width = self.width() - SPRITE_SIDE_MARGIN * 2
        available_height = self.height() - SPRITE_TOP_MARGIN - SPRITE_BOTTOM_MARGIN
        scale = min(available_width / sprite_width, available_height / sprite_height)
        draw_width = max(1, int(current_frame.width() * scale))
        draw_height = max(1, int(current_frame.height() * scale))
        draw_x = (self.width() - draw_width) // 2
        draw_y = self.height() - draw_height - SPRITE_BOTTOM_MARGIN
        offset_x, offset_y = self._sprite_offset()
        draw_x += offset_x
        draw_y += offset_y

        painter.save()
        if self.settings["pet"]["mirrorMode"]:
            painter.translate(self.width() / 2.0, 0.0)
            painter.scale(-1.0, 1.0)
            painter.translate(-self.width() / 2.0, 0.0)

        scaled_frame = current_frame.scaled(draw_width, draw_height, Qt.KeepAspectRatio, Qt.SmoothTransformation)
        painter.drawPixmap(draw_x, draw_y, scaled_frame)
        painter.restore()

    def _sprite_offset(self) -> tuple[int, int]:
        current_time = time.monotonic()
        if self.mood == "sleeping":
            return (0, round(math.sin(current_time * 1.1) * 1.5))
        if self.mood == "watching":
            return (round(math.sin(current_time * 1.7) * 1.2), 0)
        if self.mood == "clingy":
            return (0, round(math.sin(current_time * 2.6) * 1.0))
        return (0, 0)

    def _draw_missing_asset_placeholder(self, painter: QPainter) -> None:
        rect = QRectF(16.0, 44.0, self.width() - 32.0, self.height() - 60.0)
        painter.setBrush(QColor(17, 24, 39, 170))
        painter.drawRoundedRect(rect, 16.0, 16.0)
        painter.setPen(QColor(226, 232, 240))
        painter.setFont(QFont("Microsoft YaHei UI", 8))
        painter.drawText(rect, Qt.AlignCenter, f"缺少桌宠序列素材\n{Path(PET_SEQUENCE_DIR).name}")
