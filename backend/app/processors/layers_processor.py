from PIL import Image

from app.schemas.layers import ImageLayer


class LayersProcessor:
    def apply(self, base: Image.Image, layers: list[tuple[ImageLayer, Image.Image]]) -> Image.Image:
        original_mode = base.mode
        output = base.convert("RGBA")
        for layer, source in layers:
            if not layer.visible or layer.opacity == 0:
                continue
            transformed = source.convert("RGBA")
            width = max(1, round(transformed.width * layer.scale))
            height = max(1, round(transformed.height * layer.scale))
            transformed = transformed.resize((width, height), Image.Resampling.LANCZOS)
            if layer.rotation:
                transformed = transformed.rotate(layer.rotation, expand=True, resample=Image.Resampling.BICUBIC)
            if layer.opacity < 100:
                alpha = transformed.getchannel("A").point(lambda value: round(value * layer.opacity / 100))
                transformed.putalpha(alpha)
            output.alpha_composite(transformed, (layer.x, layer.y))
        if original_mode == "RGBA":
            return output
        if original_mode == "RGB":
            return output.convert("RGB")
        if original_mode == "LA":
            return output.convert("LA")
        return output.convert("L")
