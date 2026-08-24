from io import BytesIO

from PIL import Image

from app.processors.export_processor import ExportProcessor
from app.schemas.export import ExportRequest


def source_image(mode: str = "RGBA") -> Image.Image:
    image = Image.new(mode, (10, 8))
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            if mode == "RGBA":
                pixels[x, y] = (x * 20, y * 25, (x + y) * 12, 64 + x * 15)
            elif mode == "RGB":
                pixels[x, y] = (x * 20, y * 25, (x + y) * 12)
            else:
                pixels[x, y] = x * 20
    return image


def decode(data: bytes) -> Image.Image:
    image = Image.open(BytesIO(data))
    image.load()
    return image


def test_processor_resizes_and_preserves_rgba_alpha_values_for_png() -> None:
    data, metadata = ExportProcessor().process(source_image(), ExportRequest(asset_id="source", format="png", width=5, height=4, filename="sample"))
    result = decode(data)
    assert data.startswith(b"\x89PNG\r\n\x1a\n")
    assert result.size == (5, 4)
    assert result.mode == "RGBA"
    assert metadata["has_transparency"] is True
    assert result.getextrema()[3][0] < result.getextrema()[3][1]


def test_processor_removes_alpha_for_jpeg_and_keeps_rgb_dimensions() -> None:
    data, metadata = ExportProcessor().process(source_image(), ExportRequest(asset_id="source", format="jpeg", quality=80, filename="sample"))
    result = decode(data)
    assert data[:2] == b"\xff\xd8"
    assert result.format == "JPEG"
    assert result.mode == "RGB"
    assert result.size == (10, 8)
    assert metadata["has_transparency"] is False


def test_processor_keeps_grayscale_mode_for_png() -> None:
    data, metadata = ExportProcessor().process(source_image("L"), ExportRequest(asset_id="source", format="png", filename="gray"))
    result = decode(data)
    assert result.mode == "L"
    assert metadata["channels"] == 1


def test_quality_changes_png_and_webp_encoded_output() -> None:
    image = Image.effect_noise((128, 96), 80).convert("RGB")
    png_low, _ = ExportProcessor().process(image, ExportRequest(asset_id="source", format="png", quality=10, filename="low"))
    png_high, _ = ExportProcessor().process(image, ExportRequest(asset_id="source", format="png", quality=100, filename="high"))
    webp_low, _ = ExportProcessor().process(image, ExportRequest(asset_id="source", format="webp", quality=10, filename="low"))
    webp_high, _ = ExportProcessor().process(image, ExportRequest(asset_id="source", format="webp", quality=100, filename="high"))
    assert png_low != png_high
    assert webp_low != webp_high
    assert webp_low[:4] == b"RIFF"
    assert webp_high[:4] == b"RIFF"
