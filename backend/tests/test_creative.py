from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.creative_processor import CreativeProcessor
from app.schemas.creative import CreativeRequest


def encoded(mode: str, size: tuple[int, int], values: object) -> bytes:
    image = Image.new(mode, size)
    if isinstance(values, list):
        image.putdata(values)
    else:
        image.paste(values, (0, 0, size[0], size[1]))
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def upload(client: TestClient, name: str, data: bytes) -> str:
    response = client.post("/api/v1/assets", files={"file": (name, data, "image/png")})
    assert response.status_code == 201
    return response.json()["asset_id"]


def apply(client: TestClient, asset_id: str, **payload: object) -> dict:
    response = client.post("/api/v1/creative", json={"asset_id": asset_id, **payload})
    assert response.status_code == 201
    return response.json()


def content(client: TestClient, asset: dict) -> Image.Image:
    response = client.get(asset["content_url"])
    assert response.status_code == 200
    return Image.open(BytesIO(response.content))


def test_tonal_temperature_and_tint_are_real_and_alpha_safe() -> None:
    processor = CreativeProcessor()
    source = Image.new("RGBA", (2, 1), (100, 120, 140, 77))
    warm = processor.apply_tonal(source, 50, 0, 0, 0)
    cool = processor.apply_tonal(source, -50, 0, 0, 0)
    tinted = processor.apply_tonal(source, 0, 50, 0, 0)
    assert warm.getpixel((0, 0)) != cool.getpixel((0, 0))
    assert tinted.getpixel((0, 0)) != source.getpixel((0, 0))
    assert warm.getchannel("A").getextrema() == (77, 77)
    assert cool.getchannel("A").getextrema() == (77, 77)


def test_shadows_and_highlights_target_tonal_regions() -> None:
    processor = CreativeProcessor()
    source = Image.fromarray(np.array([[[20, 20, 20], [230, 230, 230]]], dtype=np.uint8))
    lifted = processor.apply_tonal(source, 0, 0, 60, 0)
    reduced = processor.apply_tonal(source, 0, 0, 0, -60)
    assert sum(lifted.getpixel((0, 0))) > sum(source.getpixel((0, 0)))
    assert sum(reduced.getpixel((1, 0))) < sum(source.getpixel((1, 0)))


def test_all_approved_looks_change_pixels_and_preserve_dimensions() -> None:
    processor = CreativeProcessor()
    source = Image.fromarray(np.array([[[20, 40, 80], [120, 140, 160]], [[200, 180, 100], [240, 220, 200]]], dtype=np.uint8))
    for look in ["vintage", "cinematic", "warm", "cool", "black_white", "dramatic"]:
        result, parameters = processor.apply(source, CreativeRequest(asset_id="unit", operation="look", look=look))
        assert result.size == source.size
        assert np.any(np.asarray(result.convert("RGB")) != np.asarray(source))
        assert parameters["look"] == look


def test_rgba_and_grayscale_modes_keep_expected_channels_and_alpha() -> None:
    processor = CreativeProcessor()
    rgba = Image.new("RGBA", (3, 2), (40, 80, 120, 99))
    warm, _ = processor.apply(rgba, CreativeRequest(asset_id="unit", operation="look", look="warm"))
    tonal, _ = processor.apply(rgba, CreativeRequest(asset_id="unit", operation="tonal", temperature=20, tint=-15, shadows=10, highlights=-10))
    assert warm.mode == "RGBA"
    assert tonal.mode == "RGBA"
    assert warm.getchannel("A").getextrema() == (99, 99)
    assert tonal.getchannel("A").getextrema() == (99, 99)
    grayscale = Image.new("L", (3, 2), 120)
    cinematic, _ = processor.apply(grayscale, CreativeRequest(asset_id="unit", operation="look", look="cinematic"))
    grayscale_tonal, _ = processor.apply(grayscale, CreativeRequest(asset_id="unit", operation="tonal", temperature=20, shadows=20))
    assert cinematic.mode == "L"
    assert grayscale_tonal.mode == "L"


def test_presets_are_real_processing_and_black_white_is_grayscale() -> None:
    processor = CreativeProcessor()
    source = Image.fromarray(np.array([[[20, 40, 80], [120, 140, 160]], [[200, 180, 100], [240, 220, 200]]], dtype=np.uint8))
    for preset in ["vivid", "soft_portrait", "crisp_detail", "mono_contrast"]:
        result, parameters = processor.apply(source, CreativeRequest(asset_id="unit", operation="preset", preset=preset))
        assert result.size == source.size
        assert np.any(np.asarray(result.convert("RGB")) != np.asarray(source))
        assert parameters["preset"] == preset
    mono, _ = processor.apply(source, CreativeRequest(asset_id="unit", operation="preset", preset="mono_contrast"))
    assert mono.mode == "L"


def test_auto_enhancement_derives_parameters_from_image_histogram() -> None:
    processor = CreativeProcessor()
    dark = Image.new("RGB", (16, 1), (20, 20, 20))
    bright = Image.new("RGB", (16, 1), (220, 220, 220))
    dark_result, dark_parameters = processor.apply(dark, CreativeRequest(asset_id="unit", operation="auto_enhancement"))
    bright_result, bright_parameters = processor.apply(bright, CreativeRequest(asset_id="unit", operation="auto_enhancement"))
    assert dark_parameters["mean_luminance"] < bright_parameters["mean_luminance"]
    assert dark_parameters["derived_brightness"] > bright_parameters["derived_brightness"]
    assert dark_result.size == dark.size
    assert bright_result.size == bright.size


def test_sampling_supports_rgb_rgba_and_grayscale_coordinates() -> None:
    processor = CreativeProcessor()
    rgb = Image.new("RGB", (2, 2), (10, 20, 30))
    rgba = Image.new("RGBA", (2, 2), (40, 50, 60, 70))
    gray = Image.new("L", (2, 2), 80)
    assert processor.sample(rgb, 1, 1)[:6] == (10, 20, 30, 255, 19, "#0A141E")
    assert processor.sample(rgba, 0, 1)[:6] == (40, 50, 60, 70, 49, "#28323C")
    assert processor.sample(gray, 0, 0)[:6] == (80, 80, 80, 255, 80, "#505050")


def test_creative_api_preview_apply_and_sampling_lifecycle() -> None:
    app = create_app()
    client = TestClient(app)
    asset_id = upload(client, "source.png", encoded("RGBA", (5, 4), (20, 40, 60, 91)))
    preview = apply(client, asset_id, operation="look", look="warm", preview=True)
    assert app.state.temporary_storage.preview_count() == 1
    preview_image = content(client, preview)
    assert preview_image.getchannel("A").getextrema() == (91, 91)
    committed = apply(client, asset_id, operation="tonal", temperature=20, tint=10, shadows=15, highlights=-10, previous_preview_asset_id=preview["asset_id"])
    assert app.state.temporary_storage.preview_count() == 0
    assert committed["asset_id"] != asset_id
    assert committed["applied_parameters"]["operation"] == "tonal"
    sample_response = client.post("/api/v1/creative/sample", json={"asset_id": asset_id, "x": 2, "y": 3, "mode": "pixel_inspector"})
    assert sample_response.status_code == 200
    assert sample_response.json()["alpha"] == 91


def test_creative_api_rejects_invalid_parameters_and_coordinates() -> None:
    app = create_app()
    client = TestClient(app)
    asset_id = upload(client, "source.png", encoded("RGB", (3, 3), (20, 40, 60)))
    invalid = client.post("/api/v1/creative", json={"asset_id": asset_id, "operation": "tonal", "temperature": 101})
    assert invalid.status_code == 422
    invalid_sample = client.post("/api/v1/creative/sample", json={"asset_id": asset_id, "x": 3, "y": 1, "mode": "eyedropper"})
    assert invalid_sample.status_code == 400
    assert invalid_sample.json()["code"] == "SAMPLE_OUT_OF_BOUNDS"
