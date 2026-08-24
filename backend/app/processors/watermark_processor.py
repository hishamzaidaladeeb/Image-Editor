from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageFont

from app.schemas.watermark import WatermarkRequest


FONT_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"

FONT_PATHS = {
    "dejavu_sans": FONT_DIR / "DejaVuSans.ttf",
    "dejavu_sans_bold": FONT_DIR / "DejaVuSans-Bold.ttf",
    "liberation_sans": FONT_DIR / "LiberationSans-Regular.ttf",
    "liberation_sans_bold": FONT_DIR / "LiberationSans-Bold.ttf"
}


class WatermarkProcessor:
    def apply(self, image: Image.Image, request: WatermarkRequest) -> Image.Image:
        original_mode = image.mode
        base = image.convert("RGBA")
        text_color = ImageColor.getcolor(request.color, "RGBA")
        text_color = (*text_color[:3], round(text_color[3] * request.opacity / 100))
        font_path = FONT_PATHS[request.font_family]
        if not font_path.is_file():
            raise ValueError("FONT_UNAVAILABLE")
        font = ImageFont.truetype(str(font_path), request.font_size)
        draw_probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        bbox = draw_probe.multiline_textbbox((0, 0), request.text, font=font, spacing=max(1, request.font_size // 5), align=request.horizontal_alignment)
        text_width = max(1, bbox[2] - bbox[0])
        text_height = max(1, bbox[3] - bbox[1])
        padding = max(4, request.font_size // 2)
        layer = Image.new("RGBA", (text_width + padding * 2, text_height + padding * 2), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        draw.multiline_text((padding - bbox[0], padding - bbox[1]), request.text, font=font, fill=text_color, spacing=max(1, request.font_size // 5), align=request.horizontal_alignment)
        if request.rotation:
            layer = layer.rotate(-request.rotation, expand=True, resample=Image.Resampling.BICUBIC)
        if request.horizontal_alignment == "center":
            left = request.x - layer.width // 2
        elif request.horizontal_alignment == "right":
            left = request.x - layer.width
        else:
            left = request.x
        if request.vertical_alignment == "middle":
            top = request.y - layer.height // 2
        elif request.vertical_alignment == "bottom":
            top = request.y - layer.height
        else:
            top = request.y
        overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
        overlay.alpha_composite(layer, (left, top))
        result = Image.alpha_composite(base, overlay)
        if original_mode == "RGBA":
            result.putalpha(image.getchannel("A"))
            return result
        if original_mode == "RGB":
            return result.convert("RGB")
        if original_mode == "LA":
            luminance = result.convert("L")
            alpha = image.getchannel("A")
            return Image.merge("LA", (luminance, alpha))
        if original_mode == "L":
            return result.convert("L")
        return result.convert(original_mode)
