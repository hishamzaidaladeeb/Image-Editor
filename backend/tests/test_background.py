from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.background_processor import BackgroundRemovalProcessor
from app.schemas.background import BackgroundRemovalRequest


def subject_image(mode: str = "RGB", size: tuple[int, int] = (32, 24)) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, (238, 238, 238))
    for y in range(height // 4, height * 3 // 4):
        for x in range(width // 4, width * 3 // 4):
            image.putpixel((x, y), (220, 30, 30))
    if mode == "RGBA":
        return image.convert("RGBA")
    if mode == "L":
        return image.convert("L")
    return image


def encoded(image: Image.Image, image_format: str = "PNG") -> bytes:
    output = BytesIO()
    image.save(output, format=image_format)
    return output.getvalue()


def request(**overrides: object) -> BackgroundRemovalRequest:
    values: dict[str, object] = {"asset_id": "asset", **overrides}
    return BackgroundRemovalRequest(**values)


def test_grabcut_creates_a_real_nontrivial_mask() -> None:
    image = subject_image()
    result = BackgroundRemovalProcessor().apply(image, request())
    alpha = np.asarray(result.image.getchannel("A"))
    assert result.image.mode == "RGBA"
    assert result.image.size == image.size
    assert 0.0 < result.foreground_coverage < 1.0
    assert alpha[image.height // 2, image.width // 2] > 0
    assert alpha[0, 0] == 0


def test_rgb_rgba_grayscale_and_sizes_produce_new_rgba_images() -> None:
    processor = BackgroundRemovalProcessor()
    for mode, size in (("RGB", (8, 6)), ("RGBA", (32, 24)), ("L", (96, 72))):
        source = subject_image(mode, size)
        result = processor.apply(source, request())
        assert result.image is not source
        assert result.image.mode == "RGBA"
        assert result.image.size == size


def test_transparent_color_and_image_backgrounds_are_composited() -> None:
    processor = BackgroundRemovalProcessor()
    source = subject_image()
    transparent = processor.apply(source, request(background_mode="transparent"))
    colored = processor.apply(source, request(background_mode="color", background_color="#123456"))
    background = Image.new("RGB", source.size, (8, 90, 180))
    image_result = processor.apply(source, request(background_mode="image", background_asset_id="background"), background)
    assert transparent.image.getpixel((0, 0))[3] == 0
    assert colored.image.getpixel((0, 0)) == (18, 52, 86, 255)
    assert colored.image.getchannel("A").getextrema() == (255, 255)
    assert image_result.image.getpixel((0, 0)) == (8, 90, 180, 255)
    assert transparent.image.getpixel((source.width // 2, source.height // 2))[3] > 0


def test_scale_position_and_opacity_change_foreground_pixels_without_changing_canvas() -> None:
    source = subject_image()
    result = BackgroundRemovalProcessor().apply(source, request(foreground_scale=1.5, position_x=0.5, position_y=-0.5, opacity=0.5))
    alpha = np.asarray(result.image.getchannel("A"))
    assert result.image.size == source.size
    assert int(alpha.max()) <= 128
    assert np.count_nonzero(alpha) > 0


def test_request_validates_background_mode_color_and_range() -> None:
    for values in ({"background_mode": "image"}, {"background_mode": "color", "background_color": "red"}, {"opacity": 2.0}, {"foreground_scale": 0.01}):
        try:
            request(**values)
            assert False
        except ValueError:
            pass


def test_background_removal_api_creates_preview_and_revision() -> None:
    app = create_app()
    client = TestClient(app)
    upload = client.post("/api/v1/assets", files={"file": ("subject.png", encoded(subject_image()), "image/png")})
    assert upload.status_code == 201
    asset_id = upload.json()["asset_id"]
    preview = client.post("/api/v1/background/remove", json={"asset_id": asset_id, "background_mode": "transparent", "preview": True})
    assert preview.status_code == 200
    preview_data = preview.json()
    assert preview_data["processed_asset"]["asset_id"] != asset_id
    assert preview_data["processed_asset"]["metadata"]["has_transparency"] is True
    assert 0.0 < preview_data["foreground_coverage"] < 1.0
    assert app.state.temporary_storage.preview_count() == 1
    applied = client.post("/api/v1/background/remove", json={"asset_id": asset_id, "background_mode": "transparent", "preview": False, "previous_preview_asset_id": preview_data["processed_asset"]["asset_id"]})
    assert applied.status_code == 200
    assert applied.json()["processed_asset"]["asset_id"] != asset_id
    assert app.state.temporary_storage.preview_count() == 0


def test_background_image_api_validates_secondary_asset_and_cleans_replaced_preview() -> None:
    app = create_app()
    client = TestClient(app)
    source_upload = client.post("/api/v1/assets", files={"file": ("subject.png", encoded(subject_image()), "image/png")})
    background_upload = client.post("/api/v1/assets", files={"file": ("background.jpg", encoded(Image.new("RGB", (20, 12), (10, 30, 80)), "JPEG"), "image/jpeg")})
    source_id = source_upload.json()["asset_id"]
    background_id = background_upload.json()["asset_id"]
    first = client.post("/api/v1/background/remove", json={"asset_id": source_id, "background_mode": "image", "background_asset_id": background_id, "preview": True})
    assert first.status_code == 200
    first_preview_id = first.json()["processed_asset"]["asset_id"]
    second = client.post("/api/v1/background/remove", json={"asset_id": source_id, "background_mode": "color", "background_color": "#abcdef", "preview": True, "previous_preview_asset_id": first_preview_id})
    assert second.status_code == 200
    assert app.state.temporary_storage.preview_count() == 1
    missing = client.post("/api/v1/background/remove", json={"asset_id": source_id, "background_mode": "image", "background_asset_id": "missing"})
    assert missing.status_code == 400


def test_background_removal_schema_rejects_unknown_fields() -> None:
    try:
        BackgroundRemovalRequest(asset_id="asset", unknown=True)
        assert False
    except ValueError:
        pass
