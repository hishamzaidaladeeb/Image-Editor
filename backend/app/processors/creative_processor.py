from typing import TypedDict

import numpy as np
from PIL import Image

from app.processors.filter_processor import FilterProcessor
from app.processors.histogram_processor import HistogramProcessor
from app.processors.pixel_processor import PixelProcessor
from app.schemas.creative import CreativeLook, CreativePreset, CreativeRequest
from app.schemas.pixel import PixelRequest
from app.schemas.filter import FilterRequest


class AutoAnalysis(TypedDict):
    mean_luminance: float
    low_percentile: int
    high_percentile: int
    tonal_spread: int
    derived_brightness: float
    derived_contrast: float
    derived_gamma: float
    derived_saturation: float


class CreativeProcessor:
    def __init__(self) -> None:
        self.pixel_processor = PixelProcessor()
        self.filter_processor = FilterProcessor()
        self.histogram_processor = HistogramProcessor()

    def apply(self, image: Image.Image, request: CreativeRequest) -> tuple[Image.Image, dict[str, float | str]]:
        if request.operation == "preset":
            return self.apply_preset(image, request.preset)
        if request.operation == "look":
            return self.apply_look(image, request.look)
        if request.operation == "tonal":
            result = self.apply_tonal(image, request.temperature, request.tint, request.shadows, request.highlights)
            return result, {
                "operation": "tonal",
                "temperature": request.temperature,
                "tint": request.tint,
                "shadows": request.shadows,
                "highlights": request.highlights,
            }
        result, analysis = self.apply_auto(image)
        return result, {
            "operation": "auto_enhancement",
            "mean_luminance": analysis["mean_luminance"],
            "low_percentile": float(analysis["low_percentile"]),
            "high_percentile": float(analysis["high_percentile"]),
            "tonal_spread": float(analysis["tonal_spread"]),
            "derived_brightness": analysis["derived_brightness"],
            "derived_contrast": analysis["derived_contrast"],
            "derived_gamma": analysis["derived_gamma"],
            "derived_saturation": analysis["derived_saturation"],
        }

    def apply_preset(self, image: Image.Image, preset: CreativePreset | None) -> tuple[Image.Image, dict[str, float | str]]:
        if preset == "vivid":
            result = self.apply_pixel_adjust(image, brightness=2, contrast=1.12, saturation=1.28, gamma=0.98)
            return result, {"operation": "preset", "preset": "vivid", "contrast": 1.12, "saturation": 1.28, "gamma": 0.98}
        if preset == "soft_portrait":
            result = self.filter_processor.apply(image, FilterRequest(asset_id="preset", operation="gaussian_blur", kernel_size=5, sigma=1.2))
            return result, {"operation": "preset", "preset": "soft_portrait", "kernel_size": 5, "sigma": 1.2}
        if preset == "crisp_detail":
            result = self.filter_processor.apply(image, FilterRequest(asset_id="preset", operation="unsharp_mask", kernel_size=3, sigma=1.0, amount=0.85))
            return result, {"operation": "preset", "preset": "crisp_detail", "kernel_size": 3, "sigma": 1.0, "amount": 0.85}
        result = self.apply_pixel_adjust(image, contrast=1.2, saturation=0, gamma=1.0)
        result = self.ensure_grayscale(result)
        return result, {"operation": "preset", "preset": "mono_contrast", "contrast": 1.2, "grayscale": "luminance"}

    def apply_look(self, image: Image.Image, look: CreativeLook | None) -> tuple[Image.Image, dict[str, float | str]]:
        if look == "vintage":
            result = self.apply_pixel_adjust(image, brightness=3, contrast=0.96, gamma=1.04, saturation=0.72, hue=8, exposure=-0.08)
            result = self.apply_tonal(result, 18, 6, 8, -12)
            return result, {"operation": "look", "look": "vintage", "temperature": 18, "tint": 6, "shadows": 8, "highlights": -12, "saturation": 0.72, "hue": 8, "exposure": -0.08}
        if look == "cinematic":
            result = self.apply_pixel_adjust(image, contrast=1.18, gamma=0.98, saturation=0.88, hue=-4, exposure=-0.08, sharpness=0.25)
            result = self.apply_tonal(result, -8, 5, -14, -22)
            return result, {"operation": "look", "look": "cinematic", "temperature": -8, "tint": 5, "shadows": -14, "highlights": -22, "contrast": 1.18, "saturation": 0.88, "sharpness": 0.25}
        if look == "warm":
            result = self.apply_pixel_adjust(image, saturation=1.08)
            result = self.apply_tonal(result, 30, 8, 4, -4)
            return result, {"operation": "look", "look": "warm", "temperature": 30, "tint": 8, "shadows": 4, "highlights": -4, "saturation": 1.08}
        if look == "cool":
            result = self.apply_pixel_adjust(image, saturation=1.02)
            result = self.apply_tonal(result, -30, -5, 4, -4)
            return result, {"operation": "look", "look": "cool", "temperature": -30, "tint": -5, "shadows": 4, "highlights": -4, "saturation": 1.02}
        if look == "black_white":
            result = self.pixel_processor.grayscale(image)
            result = self.apply_pixel_adjust(result, contrast=1.12)
            return result, {"operation": "look", "look": "black_white", "contrast": 1.12, "grayscale": "luminance"}
        result = self.apply_pixel_adjust(image, contrast=1.3, saturation=1.1, exposure=-0.05, sharpness=0.35)
        result = self.apply_tonal(result, 0, 0, -18, -24)
        return result, {"operation": "look", "look": "dramatic", "contrast": 1.3, "saturation": 1.1, "exposure": -0.05, "sharpness": 0.35, "shadows": -18, "highlights": -24}

    def apply_pixel_adjust(self, image: Image.Image, brightness: float = 0, contrast: float = 1, gamma: float = 1, saturation: float = 1, hue: float = 0, exposure: float = 0, sharpness: float = 0) -> Image.Image:
        request = PixelRequest(asset_id="creative", operation="adjust", brightness=brightness, contrast=contrast, gamma=gamma, saturation=saturation, hue=hue, exposure=exposure, sharpness=sharpness)
        return self.pixel_processor.apply(image, request)

    def apply_tonal(self, image: Image.Image, temperature: float, tint: float, shadows: float, highlights: float) -> Image.Image:
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        is_grayscale = image.mode in {"L", "LA"}
        rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
        if not is_grayscale:
            rgb[:, :, 0] += temperature * 0.6 + tint * 0.35
            rgb[:, :, 1] += temperature * 0.15 - tint * 0.35
            rgb[:, :, 2] -= temperature * 0.6 - tint * 0.35
        luminance = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
        normalized = np.clip(luminance / 255.0, 0, 1)
        rgb += (shadows * 0.75) * ((1.0 - normalized) ** 2)[:, :, None]
        rgb += (highlights * 0.75) * (normalized ** 2)[:, :, None]
        rgb = np.clip(rgb, 0, 255).astype(np.uint8)
        if is_grayscale:
            gray = np.clip(0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2], 0, 255).astype(np.uint8)
            result = Image.fromarray(gray)
            if image.mode == "LA" and alpha is not None:
                result.putalpha(alpha)
            return result
        result = Image.fromarray(rgb)
        if alpha is not None:
            result.putalpha(alpha)
        return result

    def apply_auto(self, image: Image.Image) -> tuple[Image.Image, AutoAnalysis]:
        histogram = self.histogram_processor.calculate(image)
        counts = np.asarray(histogram["grayscale"], dtype=np.float64)
        values = np.arange(256, dtype=np.float64)
        total = max(float(counts.sum()), 1.0)
        mean = float((counts * values).sum() / total)
        cumulative = np.cumsum(counts)
        low = self.histogram_percentile(cumulative, total * 0.02)
        high = self.histogram_percentile(cumulative, total * 0.98)
        spread = max(high - low, 1)
        brightness = float(np.clip((128.0 - mean) * 0.35, -48, 48))
        contrast = float(np.clip(128.0 / spread, 0.82, 1.45))
        gamma = float(np.clip(1.0 + (128.0 - mean) / 255.0 * 0.35, 0.78, 1.22))
        rgb_spread = np.mean([np.std(np.asarray(image.convert("RGB"))[:, :, index]) for index in range(3)])
        saturation = float(np.clip(1.0 + (rgb_spread - 42.0) / 500.0, 0.92, 1.16))
        result = self.apply_pixel_adjust(image, brightness=brightness, contrast=contrast, gamma=gamma, saturation=saturation)
        analysis: AutoAnalysis = {
            "mean_luminance": round(mean, 4),
            "low_percentile": low,
            "high_percentile": high,
            "tonal_spread": spread,
            "derived_brightness": round(brightness, 4),
            "derived_contrast": round(contrast, 4),
            "derived_gamma": round(gamma, 4),
            "derived_saturation": round(saturation, 4),
        }
        return result, analysis

    def histogram_percentile(self, cumulative: np.ndarray, target: float) -> int:
        index = int(np.searchsorted(cumulative, target, side="left"))
        return int(np.clip(index, 0, 255))

    def ensure_grayscale(self, image: Image.Image) -> Image.Image:
        if image.mode in {"L", "LA"}:
            return image
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        result = image.convert("L")
        if alpha is not None:
            result.putalpha(alpha)
        return result

    def sample(self, image: Image.Image, x: int, y: int) -> tuple[int, int, int, int, int, str, str, int]:
        if x >= image.width or y >= image.height:
            raise ValueError("SAMPLE_OUT_OF_BOUNDS")
        if image.mode in {"L", "LA"}:
            pixel = image.convert("LA").getpixel((x, y))
            luminance, alpha = int(pixel[0]), int(pixel[1])
            red = green = blue = luminance
        else:
            red, green, blue, alpha = [int(value) for value in image.convert("RGBA").getpixel((x, y))]
            luminance = int(round(0.2126 * red + 0.7152 * green + 0.0722 * blue))
        return red, green, blue, alpha, luminance, f"#{red:02X}{green:02X}{blue:02X}", image.mode, len(image.getbands())
