from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image, ImageColor, ImageOps

from app.schemas.background import BackgroundRemovalRequest


@dataclass(frozen=True)
class BackgroundResult:
    image: Image.Image
    foreground_coverage: float


class BackgroundRemovalProcessor:
    def apply(self, image: Image.Image, request: BackgroundRemovalRequest, background: Image.Image | None = None) -> BackgroundResult:
        source = image.convert("RGBA")
        rgba = np.asarray(source, dtype=np.uint8)
        mask = self.create_mask(rgba[:, :, :3])
        foreground = source.copy()
        foreground.putalpha(Image.fromarray(mask))
        foreground = self.transform_foreground(foreground, request)
        canvas = self.create_background(source.size, request, background)
        canvas.alpha_composite(foreground, dest=(self.position(foreground.width, source.width, request.position_x), self.position(foreground.height, source.height, request.position_y)))
        coverage = float(np.count_nonzero(mask)) / float(mask.size)
        return BackgroundResult(canvas, coverage)

    def create_mask(self, rgb: np.ndarray) -> np.ndarray:
        height, width = rgb.shape[:2]
        if width < 3 or height < 3:
            return self.fallback_mask(rgb)
        grabcut_mask = np.full((height, width), cv2.GC_PR_BGD, dtype=np.uint8)
        margin_x = max(1, width // 20)
        margin_y = max(1, height // 20)
        rectangle = (margin_x, margin_y, max(1, width - 2 * margin_x), max(1, height - 2 * margin_y))
        background_model = np.zeros((1, 65), dtype=np.float64)
        foreground_model = np.zeros((1, 65), dtype=np.float64)
        cv2.grabCut(rgb, grabcut_mask, rectangle, background_model, foreground_model, 5, cv2.GC_INIT_WITH_RECT)
        result = np.where((grabcut_mask == cv2.GC_FGD) | (grabcut_mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
        ratio = float(np.count_nonzero(result)) / float(result.size)
        return self.fallback_mask(rgb) if ratio in {0.0, 1.0} else result

    def fallback_mask(self, rgb: np.ndarray) -> np.ndarray:
        height, width = rgb.shape[:2]
        border = np.concatenate((rgb[0, :, :], rgb[-1, :, :], rgb[:, 0, :], rgb[:, -1, :]), axis=0)
        background_color = np.median(border.astype(np.float32), axis=0)
        distance = np.linalg.norm(rgb.astype(np.float32) - background_color, axis=2)
        border_distance = np.concatenate((distance[0, :], distance[-1, :], distance[:, 0], distance[:, -1]))
        threshold = max(12.0, float(np.percentile(border_distance, 95)) + 2.0)
        mask = np.where(distance > threshold, 255, 0).astype(np.uint8)
        if np.count_nonzero(mask) == 0:
            return np.zeros((height, width), dtype=np.uint8)
        return mask

    def transform_foreground(self, foreground: Image.Image, request: BackgroundRemovalRequest) -> Image.Image:
        width = max(1, round(foreground.width * request.foreground_scale))
        height = max(1, round(foreground.height * request.foreground_scale))
        transformed = foreground.resize((width, height), Image.Resampling.LANCZOS)
        if request.opacity < 1.0:
            alpha = transformed.getchannel("A").point(lambda value: round(value * request.opacity))
            transformed.putalpha(alpha)
        return transformed

    def create_background(self, size: tuple[int, int], request: BackgroundRemovalRequest, background: Image.Image | None) -> Image.Image:
        if request.background_mode == "transparent":
            return Image.new("RGBA", size, (0, 0, 0, 0))
        if request.background_mode == "color":
            red, green, blue = ImageColor.getrgb(request.background_color)
            return Image.new("RGBA", size, (red, green, blue, 255))
        if background is None:
            raise ValueError("BACKGROUND_ASSET_REQUIRED")
        return ImageOps.fit(background.convert("RGBA"), size, method=Image.Resampling.LANCZOS)

    def position(self, foreground_size: int, canvas_size: int, normalized_position: float) -> int:
        centered = (canvas_size - foreground_size) / 2
        offset = normalized_position * abs(canvas_size - foreground_size) / 2
        return round(centered + offset)
