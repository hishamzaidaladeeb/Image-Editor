from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageFont

from app.schemas.text import TextRequest


FONT_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"

FONT_PATHS = {
    ("dejavu_sans", "regular", "normal"): FONT_DIR / "DejaVuSans.ttf",
    ("dejavu_sans", "regular", "italic"): FONT_DIR / "DejaVuSans.ttf",
    ("dejavu_sans", "bold", "italic"): FONT_DIR / "DejaVuSans-Bold.ttf",
    ("dejavu_sans_bold", "regular", "normal"): FONT_DIR / "DejaVuSans-Bold.ttf",
    ("dejavu_sans_bold", "regular", "italic"): FONT_DIR / "DejaVuSans-Bold.ttf",
    ("dejavu_sans_bold", "bold", "normal"): FONT_DIR / "DejaVuSans-Bold.ttf",
    ("dejavu_sans_bold", "bold", "italic"): FONT_DIR / "DejaVuSans-Bold.ttf",
    ("liberation_sans", "regular", "normal"): FONT_DIR / "LiberationSans-Regular.ttf",
    ("liberation_sans", "regular", "italic"): FONT_DIR / "LiberationSans-Italic.ttf",
    ("liberation_sans", "bold", "normal"): FONT_DIR / "LiberationSans-Bold.ttf",
    ("liberation_sans", "bold", "italic"): FONT_DIR / "LiberationSans-BoldItalic.ttf",
    ("liberation_sans_bold", "regular", "normal"): FONT_DIR / "LiberationSans-Bold.ttf",
    ("liberation_sans_bold", "regular", "italic"): FONT_DIR / "LiberationSans-Bold.ttf",
    ("liberation_sans_bold", "bold", "normal"): FONT_DIR / "LiberationSans-Bold.ttf",
    ("liberation_sans_bold", "bold", "italic"): FONT_DIR / "LiberationSans-BoldItalic.ttf"
}


class TextProcessor:
    def apply(self, image: Image.Image, request: TextRequest) -> Image.Image:
        original_mode = image.mode
        base = image.convert("RGBA")
        font_path = FONT_PATHS[(request.font_family, request.font_weight, request.font_style)]
        if not font_path.is_file():
            raise ValueError("FONT_UNAVAILABLE")
        font = ImageFont.truetype(str(font_path), request.font_size)
        direction = None if request.direction == "auto" else request.direction
        spacing = max(1, request.font_size // 5)
        probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        bbox = probe.multiline_textbbox((0, 0), request.text, font=font, spacing=spacing, align=request.alignment, direction=direction)
        measured_width = max(1, bbox[2] - bbox[0])
        measured_height = max(1, bbox[3] - bbox[1])
        padding = max(4, request.font_size // 2)
        layer_width = request.width or measured_width + padding * 2
        layer_height = request.height or measured_height + padding * 2
        layer_width = max(layer_width, measured_width + padding * 2 if request.width is None else layer_width)
        layer_height = max(layer_height, measured_height + padding * 2 if request.height is None else layer_height)
        layer = Image.new("RGBA", (layer_width, layer_height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer)
        text_color = ImageColor.getcolor(request.color, "RGBA")
        fill = (*text_color[:3], round(text_color[3] * request.opacity / 100))
        anchor_x = padding - bbox[0] if request.width is None else padding
        anchor_y = padding - bbox[1] if request.height is None else padding
        draw.multiline_text((anchor_x, anchor_y), request.text, font=font, fill=fill, spacing=spacing, align=request.alignment, direction=direction)
        if request.font_style == "italic":
            shear = max(1, round(layer.height * 0.25))
            layer = layer.transform((layer.width + shear, layer.height), Image.Transform.AFFINE, (1, -0.25, shear, 0, 1, 0), resample=Image.Resampling.BICUBIC)
        if request.rotation:
            layer = layer.rotate(-request.rotation, expand=True, resample=Image.Resampling.BICUBIC)
        if request.alignment == "center":
            left = request.x - layer.width // 2
        elif request.alignment == "right":
            left = request.x - layer.width
        else:
            left = request.x
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
            return Image.merge("LA", (result.convert("L"), image.getchannel("A")))
        if original_mode == "L":
            return result.convert("L")
        return result.convert(original_mode)
