from __future__ import annotations

from typing import TypedDict

import cv2
import numpy as np
from PIL import Image


class HistogramData(TypedDict):
    grayscale: list[int]
    red: list[int]
    green: list[int]
    blue: list[int]
    alpha: list[int] | None


class HistogramProcessor:
    def calculate(self, image: Image.Image) -> HistogramData:
        bands = image.getbands()
        alpha = np.asarray(image.getchannel("A"), dtype=np.uint8) if "A" in bands else None
        if "R" in bands and "G" in bands and "B" in bands:
            rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
            red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        else:
            gray = np.asarray(image.convert("L"), dtype=np.uint8)
            red, green, blue = gray, gray, gray
        grayscale = cv2.cvtColor(np.stack([red, green, blue], axis=2), cv2.COLOR_RGB2GRAY)
        return {
            "grayscale": self.histogram(grayscale),
            "red": self.histogram(red),
            "green": self.histogram(green),
            "blue": self.histogram(blue),
            "alpha": self.histogram(alpha) if alpha is not None else None
        }

    def histogram(self, channel: np.ndarray) -> list[int]:
        return np.bincount(channel.reshape(-1), minlength=256).astype(np.int64).tolist()

    def process(self, image: Image.Image, operation: str, clip_limit: float, tile_grid_size: int) -> Image.Image:
        if operation == "original":
            return image.copy()
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        if "R" in image.getbands() and "G" in image.getbands() and "B" in image.getbands():
            rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
            ycrcb = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb)
            luminance = ycrcb[:, :, 0]
            ycrcb[:, :, 0] = self.transform_luminance(luminance, operation, clip_limit, tile_grid_size)
            result = Image.fromarray(cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2RGB))
        else:
            gray = np.asarray(image.convert("L"), dtype=np.uint8)
            result = Image.fromarray(self.transform_luminance(gray, operation, clip_limit, tile_grid_size))
        if alpha is not None:
            if result.mode != "RGBA":
                result = result.convert("RGBA")
            result.putalpha(alpha)
        if image.mode == "LA" and result.mode == "RGBA":
            result = result.convert("LA")
        elif image.mode == "L" and result.mode != "L":
            result = result.convert("L")
        return result

    def transform_luminance(self, channel: np.ndarray, operation: str, clip_limit: float, tile_grid_size: int) -> np.ndarray:
        if operation == "equalize":
            return cv2.equalizeHist(channel)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(tile_grid_size, tile_grid_size))
        return clahe.apply(channel)
