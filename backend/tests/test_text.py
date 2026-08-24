from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.text_processor import TextProcessor
from app.schemas.text import TextRequest


def encoded_image(mode: str, size: tuple[int, int] = (160, 100)) -> bytes:
    if mode == "RGBA":
        image = Image.new("RGBA", size, (30, 80, 140, 90))
    elif mode == "LA":
        image = Image.new("LA", size, (80, 90))
    elif mode == "L":
        image = Image.new("L", size, 80)
    else:
        image = Image.new("RGB", size, (30, 80, 140))
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def request_for() -> TextRequest:
    return TextRequest(asset_id="unit", text="Hello\nمرحبا ✓", x=12, y=14, width=120, height=60, font_family="dejavu_sans", font_size=20, font_weight="bold", font_style="italic", color="#ff0000", opacity=75, alignment="left", direction="auto", rotation=0)


def test_text_rasterization_changes_pixels_and_preserves_dimensions() -> None:
    source = Image.new("RGB", (160, 100), (30, 80, 140))
    result = TextProcessor().apply(source, request_for())
    assert result.size == source.size
    assert result.mode == "RGB"
    assert np.any(np.asarray(result) != np.asarray(source))


def test_text_supports_rgb_rgba_grayscale_and_la() -> None:
    for mode in ("RGB", "RGBA", "L", "LA"):
        source = Image.open(BytesIO(encoded_image(mode)))
        result = TextProcessor().apply(source, request_for())
        assert result.size == source.size
        assert result.mode == mode
        if mode in {"RGBA", "LA"}:
            assert np.array_equal(np.asarray(result.getchannel("A")), np.asarray(source.getchannel("A")))


def test_text_schema_rejects_invalid_inputs() -> None:
    invalid_values = [
        {"text": "", "color": "#ffffff"},
        {"text": "   ", "color": "#ffffff"},
        {"text": "x", "color": "red"},
        {"text": "x", "color": "#gggggg"},
        {"text": "x", "font_family": "/tmp/font.ttf"},
        {"text": "x", "opacity": 101},
        {"text": "x", "direction": "sideways"},
        {"text": "x", "width": 20, "height": 0},
        {"text": "x", "height": 20}
    ]
    for values in invalid_values:
        try:
            TextRequest(asset_id="unit", x=0, y=0, **values)
            assert False
        except ValueError:
            pass


def test_text_api_preview_cleanup_and_apply_revision() -> None:
    app = create_app()
    client = TestClient(app)
    upload = client.post("/api/v1/assets", files={"file": ("text.png", encoded_image("RGBA"), "image/png")})
    assert upload.status_code == 201
    asset_id = upload.json()["asset_id"]
    payload = {"asset_id": asset_id, "text": "مرحبا\nHello ✓", "x": 12, "y": 14, "width": 120, "height": 60, "font_family": "dejavu_sans", "font_size": 20, "font_weight": "bold", "font_style": "italic", "color": "#00ff00", "opacity": 65, "alignment": "left", "direction": "auto", "rotation": 0, "preview": True}
    preview = client.post("/api/v1/advanced/text", json=payload)
    assert preview.status_code == 201
    preview_asset = preview.json()
    assert preview_asset["metadata"]["width"] == 160
    assert preview_asset["metadata"]["height"] == 100
    assert app.state.temporary_storage.preview_count() == 1
    applied = client.post("/api/v1/advanced/text", json={**payload, "preview": False, "previous_preview_asset_id": preview_asset["asset_id"]})
    assert applied.status_code == 201
    assert applied.json()["asset_id"] != asset_id
    assert applied.json()["metadata"]["has_transparency"] is True
    assert app.state.temporary_storage.preview_count() == 0
