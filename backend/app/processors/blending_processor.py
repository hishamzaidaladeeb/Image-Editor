from __future__ import annotations

import numpy as np
from PIL import Image, ImageOps

from app.schemas.blending import BlendingRequest


class BlendingProcessor:
    def apply(self, first: Image.Image, second: Image.Image, request: BlendingRequest) -> Image.Image:
        first_rgba = first.convert("RGBA")
        second_rgba = second.convert("RGBA")
        if request.operation == "side_by_side":
            return self.side_by_side(first_rgba, second_rgba)
        second_fitted = ImageOps.fit(second_rgba, first_rgba.size, method=Image.Resampling.LANCZOS)
        if request.operation == "alpha":
            return self.alpha_blend(first_rgba, second_fitted, request.opacity)
        if request.operation == "overlay":
            return self.overlay(first_rgba, second_fitted, request.opacity)
        if request.operation == "blend":
            return self.weighted_blend(first_rgba, second_fitted, request.weight_a, request.weight_b, request.opacity)
        return self.difference(first_rgba, second_fitted)

    def alpha_blend(self, first: Image.Image, second: Image.Image, opacity: float) -> Image.Image:
        first_array = np.asarray(first, dtype=np.float32)
        second_array = np.asarray(second, dtype=np.float32)
        ratio = float(opacity)
        output = first_array * (1.0 - ratio) + second_array * ratio
        return Image.fromarray(np.clip(np.rint(output), 0, 255).astype(np.uint8))

    def overlay(self, first: Image.Image, second: Image.Image, opacity: float) -> Image.Image:
        adjusted = second.copy()
        adjusted.putalpha(second.getchannel("A").point(lambda value: round(value * opacity)))
        return Image.alpha_composite(first, adjusted)

    def weighted_blend(self, first: Image.Image, second: Image.Image, weight_a: float, weight_b: float, opacity: float) -> Image.Image:
        total = weight_a + weight_b
        first_array = np.asarray(first, dtype=np.float32)
        second_array = np.asarray(second, dtype=np.float32)
        weighted = (first_array * weight_a + second_array * weight_b) / total
        output = first_array * (1.0 - opacity) + weighted * opacity
        return Image.fromarray(np.clip(np.rint(output), 0, 255).astype(np.uint8))

    def difference(self, first: Image.Image, second: Image.Image) -> Image.Image:
        first_array = np.asarray(first, dtype=np.int16)
        second_array = np.asarray(second, dtype=np.int16)
        output = np.abs(first_array - second_array)
        output[:, :, 3] = np.maximum(first_array[:, :, 3], second_array[:, :, 3])
        return Image.fromarray(np.clip(output, 0, 255).astype(np.uint8))

    def side_by_side(self, first: Image.Image, second: Image.Image) -> Image.Image:
        canvas = Image.new("RGBA", (first.width + second.width, max(first.height, second.height)), (0, 0, 0, 0))
        first_y = (canvas.height - first.height) // 2
        second_y = (canvas.height - second.height) // 2
        canvas.alpha_composite(first, dest=(0, first_y))
        canvas.alpha_composite(second, dest=(first.width, second_y))
        return canvas
