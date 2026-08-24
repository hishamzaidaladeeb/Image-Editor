from __future__ import annotations

import numpy as np
from PIL import Image, ImageFilter, ImageOps

from app.schemas.pixel import PixelRequest


class PixelProcessor:
    def apply(self, image: Image.Image, request: PixelRequest) -> Image.Image:
        request.validate_adaptive_block()
        if request.operation == "invert":
            return self.invert(image)
        if request.operation == "grayscale":
            return self.grayscale(image)
        if request.operation == "threshold":
            return self.threshold_image(image, request)
        return self.adjust(image, request)

    def adjust(self, image: Image.Image, request: PixelRequest) -> Image.Image:
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        if image.mode in {"L", "LA"}:
            values = np.asarray(image.getchannel("L"), dtype=np.float32)
            values = self.adjust_values(values, request)
            result = Image.fromarray(values.astype(np.uint8))
        else:
            values = np.asarray(image.convert("RGB"), dtype=np.float32)
            values = self.adjust_values(values, request)
            result = Image.fromarray(values.astype(np.uint8))
            result = self.apply_hue_saturation(result, request.hue, request.saturation)
        if request.sharpness > 0:
            radius = 1.0
            blurred = result.filter(ImageFilter.GaussianBlur(radius=radius))
            base = np.asarray(result, dtype=np.float32)
            blur = np.asarray(blurred, dtype=np.float32)
            sharpened = np.clip(base + request.sharpness * (base - blur), 0, 255).astype(np.uint8)
            result = Image.fromarray(sharpened)
        if alpha:
            result.putalpha(alpha)
        return result

    def adjust_values(self, values: np.ndarray, request: PixelRequest) -> np.ndarray:
        result = values + request.brightness
        result = (result - 127.5) * request.contrast + 127.5
        result = np.power(np.clip(result, 0, 255) / 255, 1 / request.gamma) * 255
        result = result * (2 ** request.exposure)
        return np.clip(result, 0, 255)

    def invert(self, image: Image.Image) -> Image.Image:
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        result = ImageOps.invert(image.convert("RGB"))
        if image.mode in {"L", "LA"}:
            result = ImageOps.invert(image.getchannel("L"))
        if alpha:
            result.putalpha(alpha)
        return result

    def grayscale(self, image: Image.Image) -> Image.Image:
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        result = ImageOps.grayscale(image)
        if alpha:
            result.putalpha(alpha)
        return result

    def threshold_image(self, image: Image.Image, request: PixelRequest) -> Image.Image:
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        gray = np.asarray(ImageOps.grayscale(image), dtype=np.uint8)
        if request.threshold_mode in {"global", "binary"}:
            result = np.where(gray >= request.threshold, request.max_value, 0).astype(np.uint8)
        else:
            result = self.adaptive_threshold(gray, request.block_size, request.adaptive_c)
            result = np.where(result, request.max_value, 0).astype(np.uint8)
        output = Image.fromarray(result)
        if alpha:
            output.putalpha(alpha)
        return output

    def apply_hue_saturation(self, image: Image.Image, hue: float, saturation: float) -> Image.Image:
        hsv = np.asarray(image.convert("HSV"), dtype=np.uint8).copy()
        hue_shift = int(round(hue / 360 * 255))
        hsv[:, :, 0] = (hsv[:, :, 0].astype(np.int16) + hue_shift) % 256
        hsv[:, :, 1] = np.clip(hsv[:, :, 1].astype(np.float32) * saturation, 0, 255).astype(np.uint8)
        return Image.frombytes("HSV", image.size, hsv.tobytes()).convert("RGB")

    def adaptive_threshold(self, gray: np.ndarray, block_size: int, constant: float) -> np.ndarray:
        radius = block_size // 2
        padded = np.pad(gray.astype(np.float32), radius, mode="edge")
        integral = np.pad(padded, ((1, 0), (1, 0)), mode="constant")
        integral = integral.cumsum(axis=0).cumsum(axis=1)
        height, width = gray.shape
        area = float(block_size * block_size)
        sums = integral[block_size:height + block_size, block_size:width + block_size]
        sums -= integral[:height, block_size:width + block_size]
        sums -= integral[block_size:height + block_size, :width]
        sums += integral[:height, :width]
        return gray.astype(np.float32) > (sums / area - constant)
