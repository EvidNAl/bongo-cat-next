from __future__ import annotations

import argparse
import json
import sys
from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

BEHAVIOR_NAMES = (
    "抚摸",
    "喂食",
    "逗球",
    "鼠标跟随",
    "停住撒娇",
    "默认睡觉",
)
GRID_ROWS = 6
GRID_COLS = 5
WHITE_THRESHOLD = 242
MIN_COMPONENT_PIXELS = 3000
CLUSTER_TOLERANCE_X = 75
CLUSTER_TOLERANCE_Y = 60
BACKGROUND_MEAN_THRESHOLD = 220
BACKGROUND_MIN_CHANNEL = 170
BACKGROUND_CHROMA_THRESHOLD = 70
EDGE_DECONTAMINATION_RADIUS = 2
EDGE_ALPHA_CUTOFF = 10
CORNER_LABEL_SCAN_SIZE = 45
CORNER_LABEL_MAX_PIXELS = 320
CORNER_LABEL_MAX_RIGHT = 24
CORNER_LABEL_MAX_BOTTOM = 34
INTERIOR_GRAY_MEAN_MIN = 90
INTERIOR_GRAY_MEAN_MAX = 190
INTERIOR_GRAY_CHROMA_MAX = 18
INTERIOR_GRAY_ALPHA_MIN = 40
INTERIOR_GRAY_COMPONENT_MIN_PIXELS = 180
INTERIOR_GRAY_EDGE_MARGIN = 4
BRIGHT_NEUTRAL_MEAN_MIN = 120
BRIGHT_NEUTRAL_MEAN_MAX = 255
BRIGHT_NEUTRAL_CHROMA_MAX = 35
BRIGHT_NEUTRAL_ALPHA_MIN = 50
BRIGHT_NEUTRAL_COMPONENT_MIN_PIXELS = 20
BRIGHT_NEUTRAL_COMPONENT_MAX_PIXELS = 160
BRIGHT_NEUTRAL_EDGE_MARGIN = 8
DARK_NEIGHBOR_MEAN_MAX = 75
DARK_NEIGHBOR_ALPHA_MIN = 80
BRIGHT_NEUTRAL_MIN_DARK_NEIGHBORS = 18
REAR_REPAIR_COLOR = (1, 1, 1, 255)

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SHEET_PATH = REPO_ROOT / "Gemini_Generated_Image_42uc6l42uc6l42uc.png"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent / "assets" / "luo_xiaohei_sequences"
FRAME_EXPORT_LIMITS = {6: 4}


@dataclass(frozen=True)
class CropBox:
    left: int
    top: int
    right: int
    bottom: int

    @property
    def center_x(self) -> int:
        return (self.left + self.right) // 2

    @property
    def center_y(self) -> int:
        return (self.top + self.bottom) // 2

    def as_tuple(self) -> tuple[int, int, int, int]:
        return (self.left, self.top, self.right + 1, self.bottom + 1)


def find_large_white_components(image: Image.Image) -> list[CropBox]:
    rgb_image = image.convert("RGB")
    width, height = rgb_image.size
    pixels = rgb_image.load()
    white_mask = bytearray(width * height)

    for y in range(height):
        for x in range(width):
            red, green, blue = pixels[x, y]
            if red >= WHITE_THRESHOLD and green >= WHITE_THRESHOLD and blue >= WHITE_THRESHOLD:
                white_mask[y * width + x] = 1

    seen = bytearray(width * height)
    components: list[CropBox] = []

    for y in range(height):
        for x in range(width):
            start_index = y * width + x
            if not white_mask[start_index] or seen[start_index]:
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen[start_index] = 1
            pixel_count = 0
            min_x = max_x = x
            min_y = max_y = y

            while queue:
                current_x, current_y = queue.popleft()
                pixel_count += 1
                min_x = min(min_x, current_x)
                max_x = max(max_x, current_x)
                min_y = min(min_y, current_y)
                max_y = max(max_y, current_y)

                for next_x, next_y in (
                    (current_x + 1, current_y),
                    (current_x - 1, current_y),
                    (current_x, current_y + 1),
                    (current_x, current_y - 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue

                    next_index = next_y * width + next_x
                    if white_mask[next_index] and not seen[next_index]:
                        seen[next_index] = 1
                        queue.append((next_x, next_y))

            if pixel_count >= MIN_COMPONENT_PIXELS:
                components.append(CropBox(min_x, min_y, max_x, max_y))

    if not components:
        raise RuntimeError("没有找到可用的白底单元格，请确认输入图片是否为当前这张序列图。")

    return components


def cluster_positions(values: list[int], expected_count: int, tolerance: int) -> list[int]:
    clusters: list[list[int]] = []

    for value in sorted(values):
        if not clusters or value - clusters[-1][-1] > tolerance:
            clusters.append([value])
        else:
            clusters[-1].append(value)

    if len(clusters) != expected_count:
        raise RuntimeError(
            f"检测到 {len(clusters)} 个分组，预期 {expected_count} 个。"
            "这通常表示图片规格变了，或阈值需要调整。"
        )

    return [round(sum(cluster) / len(cluster)) for cluster in clusters]


def detect_grid_boxes(image: Image.Image) -> list[list[CropBox]]:
    components = find_large_white_components(image)
    column_centers = cluster_positions(
        [component.center_x for component in components],
        expected_count=GRID_COLS,
        tolerance=CLUSTER_TOLERANCE_X,
    )
    row_centers = cluster_positions(
        [component.center_y for component in components],
        expected_count=GRID_ROWS,
        tolerance=CLUSTER_TOLERANCE_Y,
    )

    merged_cells: dict[tuple[int, int], CropBox] = {}

    for component in components:
        column_index = min(
            range(GRID_COLS),
            key=lambda index: abs(component.center_x - column_centers[index]),
        )
        row_index = min(
            range(GRID_ROWS),
            key=lambda index: abs(component.center_y - row_centers[index]),
        )

        key = (row_index, column_index)
        existing = merged_cells.get(key)
        if existing is None:
            merged_cells[key] = component
            continue

        merged_cells[key] = CropBox(
            left=min(existing.left, component.left),
            top=min(existing.top, component.top),
            right=max(existing.right, component.right),
            bottom=max(existing.bottom, component.bottom),
        )

    grid_boxes: list[list[CropBox]] = []
    for row_index in range(GRID_ROWS):
        row_boxes: list[CropBox] = []
        for column_index in range(GRID_COLS):
            key = (row_index, column_index)
            if key not in merged_cells:
                raise RuntimeError(f"缺少第 {row_index + 1} 行第 {column_index + 1} 列的裁剪区域。")
            row_boxes.append(merged_cells[key])
        grid_boxes.append(row_boxes)

    return grid_boxes


def remove_white_background(frame: Image.Image) -> Image.Image:
    rgba_frame = frame.convert("RGBA")
    pixels = rgba_frame.load()
    width, height = rgba_frame.size

    def pixel_index(x: int, y: int) -> int:
        return y * width + x

    def is_background_candidate(red: int, green: int, blue: int) -> bool:
        channel_max = max(red, green, blue)
        channel_min = min(red, green, blue)
        mean = (red + green + blue) / 3.0
        return (
            mean >= BACKGROUND_MEAN_THRESHOLD
            and channel_min >= BACKGROUND_MIN_CHANNEL
            and channel_max - channel_min <= BACKGROUND_CHROMA_THRESHOLD
        )

    background_mask = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        for y in (0, height - 1):
            red, green, blue, _alpha = pixels[x, y]
            if is_background_candidate(red, green, blue):
                idx = pixel_index(x, y)
                if not background_mask[idx]:
                    background_mask[idx] = 1
                    queue.append((x, y))

    for y in range(height):
        for x in (0, width - 1):
            red, green, blue, _alpha = pixels[x, y]
            if is_background_candidate(red, green, blue):
                idx = pixel_index(x, y)
                if not background_mask[idx]:
                    background_mask[idx] = 1
                    queue.append((x, y))

    while queue:
        current_x, current_y = queue.popleft()
        for next_x, next_y in (
            (current_x - 1, current_y - 1),
            (current_x, current_y - 1),
            (current_x + 1, current_y - 1),
            (current_x - 1, current_y),
            (current_x + 1, current_y),
            (current_x - 1, current_y + 1),
            (current_x, current_y + 1),
            (current_x + 1, current_y + 1),
        ):
            if not (0 <= next_x < width and 0 <= next_y < height):
                continue

            idx = pixel_index(next_x, next_y)
            if background_mask[idx]:
                continue

            red, green, blue, _alpha = pixels[next_x, next_y]
            if is_background_candidate(red, green, blue):
                background_mask[idx] = 1
                queue.append((next_x, next_y))

    def has_background_neighbor(x: int, y: int) -> bool:
        for delta_y in range(-EDGE_DECONTAMINATION_RADIUS, EDGE_DECONTAMINATION_RADIUS + 1):
            for delta_x in range(-EDGE_DECONTAMINATION_RADIUS, EDGE_DECONTAMINATION_RADIUS + 1):
                if delta_x == 0 and delta_y == 0:
                    continue
                next_x = x + delta_x
                next_y = y + delta_y
                if 0 <= next_x < width and 0 <= next_y < height:
                    if background_mask[pixel_index(next_x, next_y)]:
                        return True
        return False

    for y in range(height):
        for x in range(width):
            idx = pixel_index(x, y)
            red, green, blue, _alpha = pixels[x, y]

            if background_mask[idx]:
                pixels[x, y] = (red, green, blue, 0)
                continue

            if not has_background_neighbor(x, y):
                pixels[x, y] = (red, green, blue, 255)
                continue

            matte = min(red, green, blue)
            recovered_alpha = 255 - matte
            if recovered_alpha <= EDGE_ALPHA_CUTOFF:
                pixels[x, y] = (red, green, blue, 0)
                continue

            recovered_channels = []
            for channel in (red, green, blue):
                restored = round((channel - matte) * 255 / recovered_alpha)
                recovered_channels.append(max(0, min(255, restored)))

            pixels[x, y] = (*recovered_channels, recovered_alpha)

    return rgba_frame


def remove_corner_labels(frame: Image.Image) -> Image.Image:
    rgba_frame = frame.convert("RGBA")
    pixels = rgba_frame.load()
    width, height = rgba_frame.size
    scan_width = min(CORNER_LABEL_SCAN_SIZE, width)
    scan_height = min(CORNER_LABEL_SCAN_SIZE, height)

    def pixel_index(x: int, y: int) -> int:
        return y * scan_width + x

    mask = bytearray(scan_width * scan_height)
    for y in range(scan_height):
        for x in range(scan_width):
            if pixels[x, y][3] > 20:
                mask[pixel_index(x, y)] = 1

    seen = bytearray(scan_width * scan_height)
    for y in range(scan_height):
        for x in range(scan_width):
            start_index = pixel_index(x, y)
            if not mask[start_index] or seen[start_index]:
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen[start_index] = 1
            component_pixels: list[tuple[int, int]] = []
            min_x = max_x = x
            min_y = max_y = y

            while queue:
                current_x, current_y = queue.popleft()
                component_pixels.append((current_x, current_y))
                min_x = min(min_x, current_x)
                max_x = max(max_x, current_x)
                min_y = min(min_y, current_y)
                max_y = max(max_y, current_y)

                for next_x, next_y in (
                    (current_x + 1, current_y),
                    (current_x - 1, current_y),
                    (current_x, current_y + 1),
                    (current_x, current_y - 1),
                ):
                    if not (0 <= next_x < scan_width and 0 <= next_y < scan_height):
                        continue

                    next_index = pixel_index(next_x, next_y)
                    if mask[next_index] and not seen[next_index]:
                        seen[next_index] = 1
                        queue.append((next_x, next_y))

            is_corner_label = (
                len(component_pixels) <= CORNER_LABEL_MAX_PIXELS
                and max_x <= CORNER_LABEL_MAX_RIGHT
                and max_y <= CORNER_LABEL_MAX_BOTTOM
            )
            if is_corner_label:
                for current_x, current_y in component_pixels:
                    red, green, blue, _alpha = pixels[current_x, current_y]
                    pixels[current_x, current_y] = (red, green, blue, 0)

    return rgba_frame


def remove_interior_gray_artifacts(frame: Image.Image) -> Image.Image:
    rgba_frame = frame.convert("RGBA")
    pixels = rgba_frame.load()
    width, height = rgba_frame.size

    def pixel_index(x: int, y: int) -> int:
        return y * width + x

    def is_gray_artifact_candidate(x: int, y: int) -> bool:
        red, green, blue, alpha = pixels[x, y]
        if alpha <= INTERIOR_GRAY_ALPHA_MIN:
            return False

        mean = (red + green + blue) / 3.0
        return (
            INTERIOR_GRAY_MEAN_MIN <= mean <= INTERIOR_GRAY_MEAN_MAX
            and max(red, green, blue) - min(red, green, blue) <= INTERIOR_GRAY_CHROMA_MAX
        )

    mask = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            if is_gray_artifact_candidate(x, y):
                mask[pixel_index(x, y)] = 1

    seen = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            start_index = pixel_index(x, y)
            if not mask[start_index] or seen[start_index]:
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen[start_index] = 1
            component_pixels: list[tuple[int, int]] = []
            min_x = max_x = x
            min_y = max_y = y

            while queue:
                current_x, current_y = queue.popleft()
                component_pixels.append((current_x, current_y))
                min_x = min(min_x, current_x)
                max_x = max(max_x, current_x)
                min_y = min(min_y, current_y)
                max_y = max(max_y, current_y)

                for next_x, next_y in (
                    (current_x + 1, current_y),
                    (current_x - 1, current_y),
                    (current_x, current_y + 1),
                    (current_x, current_y - 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue

                    next_index = pixel_index(next_x, next_y)
                    if mask[next_index] and not seen[next_index]:
                        seen[next_index] = 1
                        queue.append((next_x, next_y))

            touches_edge = (
                min_x <= INTERIOR_GRAY_EDGE_MARGIN
                or min_y <= INTERIOR_GRAY_EDGE_MARGIN
                or max_x >= width - 1 - INTERIOR_GRAY_EDGE_MARGIN
                or max_y >= height - 1 - INTERIOR_GRAY_EDGE_MARGIN
            )

            if len(component_pixels) >= INTERIOR_GRAY_COMPONENT_MIN_PIXELS and not touches_edge:
                for current_x, current_y in component_pixels:
                    red, green, blue, _alpha = pixels[current_x, current_y]
                    pixels[current_x, current_y] = (red, green, blue, 0)

    return rgba_frame


def darken_interior_bright_artifacts(frame: Image.Image) -> Image.Image:
    rgba_frame = frame.convert("RGBA")
    pixels = rgba_frame.load()
    width, height = rgba_frame.size

    def pixel_index(x: int, y: int) -> int:
        return y * width + x

    def is_bright_neutral(x: int, y: int) -> bool:
        red, green, blue, alpha = pixels[x, y]
        if alpha <= BRIGHT_NEUTRAL_ALPHA_MIN:
            return False
        mean = (red + green + blue) / 3.0
        return (
            BRIGHT_NEUTRAL_MEAN_MIN <= mean <= BRIGHT_NEUTRAL_MEAN_MAX
            and max(red, green, blue) - min(red, green, blue) <= BRIGHT_NEUTRAL_CHROMA_MAX
        )

    mask = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            if is_bright_neutral(x, y):
                mask[pixel_index(x, y)] = 1

    seen = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            start_index = pixel_index(x, y)
            if not mask[start_index] or seen[start_index]:
                continue

            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen[start_index] = 1
            component_pixels: list[tuple[int, int]] = []
            min_x = max_x = x
            min_y = max_y = y

            while queue:
                current_x, current_y = queue.popleft()
                component_pixels.append((current_x, current_y))
                min_x = min(min_x, current_x)
                max_x = max(max_x, current_x)
                min_y = min(min_y, current_y)
                max_y = max(max_y, current_y)

                for next_x, next_y in (
                    (current_x + 1, current_y),
                    (current_x - 1, current_y),
                    (current_x, current_y + 1),
                    (current_x, current_y - 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue

                    next_index = pixel_index(next_x, next_y)
                    if mask[next_index] and not seen[next_index]:
                        seen[next_index] = 1
                        queue.append((next_x, next_y))

            touches_edge = (
                min_x <= BRIGHT_NEUTRAL_EDGE_MARGIN
                or min_y <= BRIGHT_NEUTRAL_EDGE_MARGIN
                or max_x >= width - 1 - BRIGHT_NEUTRAL_EDGE_MARGIN
                or max_y >= height - 1 - BRIGHT_NEUTRAL_EDGE_MARGIN
            )
            if (
                touches_edge
                or len(component_pixels) < BRIGHT_NEUTRAL_COMPONENT_MIN_PIXELS
                or len(component_pixels) > BRIGHT_NEUTRAL_COMPONENT_MAX_PIXELS
            ):
                continue

            dark_neighbors: list[tuple[int, int, int]] = []
            component_lookup = set(component_pixels)
            for current_x, current_y in component_pixels:
                for next_x, next_y in (
                    (current_x - 1, current_y - 1),
                    (current_x, current_y - 1),
                    (current_x + 1, current_y - 1),
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x - 1, current_y + 1),
                    (current_x, current_y + 1),
                    (current_x + 1, current_y + 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    if (next_x, next_y) in component_lookup:
                        continue

                    red, green, blue, alpha = pixels[next_x, next_y]
                    mean = (red + green + blue) / 3.0
                    if alpha >= DARK_NEIGHBOR_ALPHA_MIN and mean <= DARK_NEIGHBOR_MEAN_MAX:
                        dark_neighbors.append((red, green, blue))

            if len(dark_neighbors) < BRIGHT_NEUTRAL_MIN_DARK_NEIGHBORS:
                continue

            avg_red = round(sum(color[0] for color in dark_neighbors) / len(dark_neighbors))
            avg_green = round(sum(color[1] for color in dark_neighbors) / len(dark_neighbors))
            avg_blue = round(sum(color[2] for color in dark_neighbors) / len(dark_neighbors))

            for current_x, current_y in component_pixels:
                _red, _green, _blue, alpha = pixels[current_x, current_y]
                pixels[current_x, current_y] = (avg_red, avg_green, avg_blue, alpha)

    return rgba_frame


def _darken_neutral_artifact_box(
    frame: Image.Image,
    left: int,
    top: int,
    right: int,
    bottom: int,
) -> Image.Image:
    pixels = frame.load()

    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            red, green, blue, alpha = pixels[x, y]
            mean = (red + green + blue) / 3.0
            chroma = max(red, green, blue) - min(red, green, blue)

            if alpha >= 80 and 18 <= mean <= 175 and chroma <= 35:
                pixels[x, y] = (REAR_REPAIR_COLOR[0], REAR_REPAIR_COLOR[1], REAR_REPAIR_COLOR[2], alpha)

    return frame


def _recolor_opaque_pixels(
    frame: Image.Image,
    left: int,
    top: int,
    right: int,
    bottom: int,
    alpha_min: int = 40,
) -> Image.Image:
    pixels = frame.load()

    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            red, green, blue, alpha = pixels[x, y]
            if alpha >= alpha_min:
                pixels[x, y] = (REAR_REPAIR_COLOR[0], REAR_REPAIR_COLOR[1], REAR_REPAIR_COLOR[2], alpha)

    return frame


def repair_known_frame_defects(frame: Image.Image, row_number: int, frame_number: int) -> Image.Image:
    rgba_frame = frame.convert("RGBA")
    draw = ImageDraw.Draw(rgba_frame)

    if row_number == 6 and frame_number == 5:
        draw.polygon(
            [(50, 68), (60, 59), (74, 56), (87, 63), (93, 77), (87, 92), (69, 94), (55, 86)],
            fill=REAR_REPAIR_COLOR,
        )
        draw.ellipse((53, 58, 90, 94), fill=REAR_REPAIR_COLOR)
        draw.ellipse((63, 60, 86, 88), fill=REAR_REPAIR_COLOR)

        draw.polygon(
            [(86, 64), (95, 58), (108, 58), (120, 66), (125, 80), (119, 93), (104, 99), (89, 96), (83, 83)],
            fill=REAR_REPAIR_COLOR,
        )
        draw.ellipse((87, 59, 124, 98), fill=REAR_REPAIR_COLOR)
        draw.ellipse((95, 63, 118, 92), fill=REAR_REPAIR_COLOR)
        rgba_frame = _darken_neutral_artifact_box(rgba_frame, 80, 62, 126, 99)
        rgba_frame = _recolor_opaque_pixels(rgba_frame, 81, 93, 101, 103, alpha_min=60)
        rgba_frame = _recolor_opaque_pixels(rgba_frame, 111, 91, 123, 103, alpha_min=60)
        rgba_frame = _recolor_opaque_pixels(rgba_frame, 123, 89, 129, 97, alpha_min=60)
        rgba_frame = _recolor_opaque_pixels(rgba_frame, 116, 60, 118, 62, alpha_min=60)

    return rgba_frame


def export_sequences(sheet_path: Path, output_dir: Path) -> Path:
    image = Image.open(sheet_path).convert("RGBA")
    grid_boxes = detect_grid_boxes(image)
    output_dir.mkdir(parents=True, exist_ok=True)

    for behavior_name in BEHAVIOR_NAMES:
        behavior_dir = output_dir / behavior_name
        behavior_dir.mkdir(parents=True, exist_ok=True)
        for existing_file in behavior_dir.glob("*.png"):
            existing_file.unlink()

    manifest_rows: list[dict[str, object]] = []

    for row_index, behavior_name in enumerate(BEHAVIOR_NAMES):
        behavior_dir = output_dir / behavior_name
        frame_entries: list[dict[str, object]] = []

        row_number = row_index + 1
        frame_limit = FRAME_EXPORT_LIMITS.get(row_number, GRID_COLS)
        for column_index, box in enumerate(grid_boxes[row_index][:frame_limit], start=1):
            frame = image.crop(box.as_tuple())
            frame = remove_white_background(frame)
            frame = remove_corner_labels(frame)
            frame = remove_interior_gray_artifacts(frame)
            frame = darken_interior_bright_artifacts(frame)
            frame = repair_known_frame_defects(frame, row_number, column_index)
            frame_name = f"{column_index:02d}.png"
            frame_path = behavior_dir / frame_name
            frame.save(frame_path)
            frame_entries.append(
                {
                    "frame": column_index,
                    "file": str(frame_path.relative_to(output_dir)).replace("\\", "/"),
                    "crop_box": [box.left, box.top, box.right, box.bottom],
                }
            )

        manifest_rows.append(
            {
                "row": row_index + 1,
                "behavior": behavior_name,
                "frames": frame_entries,
            }
        )

    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "source": str(sheet_path),
                "sheet_size": {"width": image.width, "height": image.height},
                "grid": {"rows": GRID_ROWS, "cols": GRID_COLS},
                "behaviors": manifest_rows,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    return manifest_path


def load_sequences(output_dir: Path) -> list[tuple[str, list[Path]]]:
    sequences: list[tuple[str, list[Path]]] = []
    for behavior_name in BEHAVIOR_NAMES:
        behavior_dir = output_dir / behavior_name
        frames = sorted(behavior_dir.glob("*.png"))
        if frames:
            sequences.append((behavior_name, frames))

    if not sequences:
        raise RuntimeError("输出目录里没有找到任何 PNG 帧。")

    return sequences


def launch_preview(output_dir: Path, fps: int) -> int:
    try:
        from PyQt5.QtCore import Qt, QTimer
        from PyQt5.QtGui import QPixmap
        from PyQt5.QtWidgets import (
            QApplication,
            QCheckBox,
            QComboBox,
            QHBoxLayout,
            QLabel,
            QPushButton,
            QSpinBox,
            QVBoxLayout,
            QWidget,
        )
    except ModuleNotFoundError as error:
        raise SystemExit(
            "当前 Python 环境没有安装 PyQt5。"
            "如果仓库里已有 `.venv-pyqt`，请用 `.venv-pyqt\\Scripts\\python.exe` 运行这个脚本。"
        ) from error

    class SequencePlayer(QWidget):
        def __init__(self, sequence_output_dir: Path, sequence_fps: int) -> None:
            super().__init__()
            self.output_dir = sequence_output_dir
            self.sequences = load_sequences(sequence_output_dir)
            self.current_sequence_index = 0
            self.current_frame_index = 0
            self.is_playing = True

            self.setWindowTitle("罗小黑桌宠序列预览")
            self.resize(560, 520)

            self.sequence_selector = QComboBox()
            self.sequence_selector.addItems([name for name, _frames in self.sequences])
            self.sequence_selector.currentIndexChanged.connect(self.change_sequence)

            self.speed_selector = QSpinBox()
            self.speed_selector.setRange(1, 30)
            self.speed_selector.setValue(sequence_fps)
            self.speed_selector.setSuffix(" fps")
            self.speed_selector.valueChanged.connect(self.update_timer_interval)

            self.auto_switch_checkbox = QCheckBox("自动切换行为")
            self.auto_switch_checkbox.setChecked(False)

            self.play_button = QPushButton("暂停")
            self.play_button.clicked.connect(self.toggle_playback)

            self.prev_button = QPushButton("上一组")
            self.prev_button.clicked.connect(self.show_previous_sequence)

            self.next_button = QPushButton("下一组")
            self.next_button.clicked.connect(self.show_next_sequence)

            self.preview_label = QLabel()
            self.preview_label.setAlignment(Qt.AlignCenter)
            self.preview_label.setMinimumSize(420, 320)
            self.preview_label.setStyleSheet(
                "QLabel { background: #111827; border: 1px solid #374151; border-radius: 16px; }"
            )

            self.info_label = QLabel()
            self.info_label.setAlignment(Qt.AlignCenter)

            controls_layout = QHBoxLayout()
            controls_layout.addWidget(QLabel("行为"))
            controls_layout.addWidget(self.sequence_selector, stretch=1)
            controls_layout.addWidget(QLabel("速度"))
            controls_layout.addWidget(self.speed_selector)

            buttons_layout = QHBoxLayout()
            buttons_layout.addWidget(self.prev_button)
            buttons_layout.addWidget(self.play_button)
            buttons_layout.addWidget(self.next_button)
            buttons_layout.addWidget(self.auto_switch_checkbox)

            main_layout = QVBoxLayout()
            main_layout.addLayout(controls_layout)
            main_layout.addWidget(self.preview_label, stretch=1)
            main_layout.addWidget(self.info_label)
            main_layout.addLayout(buttons_layout)
            self.setLayout(main_layout)

            self.timer = QTimer(self)
            self.timer.timeout.connect(self.advance_frame)
            self.update_timer_interval()
            self.render_frame()

        def current_sequence(self) -> tuple[str, list[Path]]:
            return self.sequences[self.current_sequence_index]

        def update_timer_interval(self) -> None:
            current_fps = max(1, self.speed_selector.value())
            self.timer.setInterval(max(33, round(1000 / current_fps)))
            if self.is_playing:
                self.timer.start()

        def toggle_playback(self) -> None:
            self.is_playing = not self.is_playing
            self.play_button.setText("暂停" if self.is_playing else "播放")
            if self.is_playing:
                self.timer.start()
            else:
                self.timer.stop()

        def change_sequence(self, sequence_index: int) -> None:
            if sequence_index < 0:
                return
            self.current_sequence_index = sequence_index
            self.current_frame_index = 0
            self.render_frame()

        def show_previous_sequence(self) -> None:
            next_index = (self.current_sequence_index - 1) % len(self.sequences)
            self.sequence_selector.setCurrentIndex(next_index)

        def show_next_sequence(self) -> None:
            next_index = (self.current_sequence_index + 1) % len(self.sequences)
            self.sequence_selector.setCurrentIndex(next_index)

        def advance_frame(self) -> None:
            _sequence_name, frames = self.current_sequence()
            self.current_frame_index += 1
            if self.current_frame_index >= len(frames):
                self.current_frame_index = 0
                if self.auto_switch_checkbox.isChecked():
                    self.show_next_sequence()
                    return
            self.render_frame()

        def render_frame(self) -> None:
            sequence_name, frames = self.current_sequence()
            frame_path = frames[self.current_frame_index]
            pixmap = QPixmap(str(frame_path))
            if pixmap.isNull():
                self.preview_label.setText(f"加载失败: {frame_path.name}")
                return

            available_size = self.preview_label.contentsRect().size()
            if available_size.width() <= 0 or available_size.height() <= 0:
                available_size = pixmap.size()

            scaled = pixmap.scaled(
                available_size,
                Qt.KeepAspectRatio,
                Qt.SmoothTransformation,
            )
            self.preview_label.setPixmap(scaled)
            self.info_label.setText(
                f"{sequence_name}  |  第 {self.current_frame_index + 1}/{len(frames)} 帧  |  {frame_path}"
            )

        def resizeEvent(self, event) -> None:
            super().resizeEvent(event)
            self.render_frame()

    app = QApplication(sys.argv)
    player = SequencePlayer(output_dir, fps)
    player.show()
    return app.exec_()


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="裁剪 6x5 罗小黑桌宠序列图，并用 PyQt5 预览。")
    parser.add_argument("--sheet", type=Path, default=DEFAULT_SHEET_PATH, help="原始序列图路径。")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="导出的帧目录。")
    parser.add_argument("--fps", type=int, default=8, help="PyQt5 预览帧率。")
    parser.add_argument("--no-preview", action="store_true", help="只裁剪，不打开预览窗口。")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_argument_parser()
    args = parser.parse_args(argv)

    sheet_path = args.sheet.resolve()
    output_dir = args.output_dir.resolve()

    if not sheet_path.exists():
        raise SystemExit(f"找不到序列图: {sheet_path}")

    manifest_path = export_sequences(sheet_path, output_dir)
    print(f"导出完成: {manifest_path}")

    if args.no_preview:
        return 0

    return launch_preview(output_dir, args.fps)


if __name__ == "__main__":
    raise SystemExit(main())
