from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.pixel_processor import PixelProcessor
from app.schemas.pixel import PixelRequest


def encoded(mode: str, size: tuple[int, int], values: object) -> bytes:
    image = Image.new(mode, size, values)
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def upload(client: TestClient, name: str, data: bytes) -> str:
    response = client.post("/api/v1/assets", files={"file": (name, data, "image/png")})
    assert response.status_code == 201
    return response.json()["asset_id"]


def apply(client: TestClient, asset_id: str, **payload: object) -> dict:
    response = client.post("/api/v1/operations/pixel", json={"asset_id": asset_id, **payload})
    assert response.status_code == 201
    return response.json()


def content(client: TestClient, asset: dict) -> Image.Image:
    response = client.get(asset["content_url"])
    assert response.status_code == 200
    return Image.open(BytesIO(response.content))


def test_brightness_and_contrast_use_explicit_pixel_formula() -> None:
    processor = PixelProcessor()
    source = Image.new("L", (1, 1), 100)
    request = PixelRequest(asset_id="unit", operation="adjust", brightness=10, contrast=2, gamma=1, exposure=0, sharpness=0)
    result = processor.apply(source, request)
    expected = round((100 + 10 - 127.5) * 2 + 127.5)
    assert result.getpixel((0, 0)) == expected


def test_gamma_and_exposure_have_expected_direction() -> None:
    processor = PixelProcessor()
    source = Image.new("L", (2, 1))
    source.putdata([64, 192])
    gamma_result = processor.apply(source, PixelRequest(asset_id="unit", operation="adjust", gamma=2))
    exposure_result = processor.apply(source, PixelRequest(asset_id="unit", operation="adjust", exposure=1))
    assert gamma_result.getpixel((0, 0)) > 64
    assert gamma_result.getpixel((1, 0)) > 192
    assert exposure_result.getpixel((0, 0)) == 128
    assert exposure_result.getpixel((1, 0)) == 255


def test_hue_saturation_and_sharpness_are_not_contrast_only() -> None:
    processor = PixelProcessor()
    red = Image.new("RGB", (1, 1), (255, 0, 0))
    hue_result = processor.apply(red, PixelRequest(asset_id="unit", operation="adjust", hue=120, saturation=1))
    desaturated = processor.apply(red, PixelRequest(asset_id="unit", operation="adjust", saturation=0))
    edge = Image.frombytes("L", (5, 3), np.array([[20, 20, 20, 20, 20], [20, 20, 150, 20, 20], [20, 20, 150, 20, 20]], dtype=np.uint8).tobytes())
    sharp_result = processor.apply(edge, PixelRequest(asset_id="unit", operation="adjust", sharpness=3))
    assert hue_result.getpixel((0, 0))[1] > 200
    assert len(set(desaturated.getpixel((0, 0)))) == 1
    assert np.any(np.asarray(sharp_result) != np.asarray(edge))


def test_alpha_is_preserved_for_adjust_grayscale_and_threshold() -> None:
    client = TestClient(create_app())
    asset_id = upload(client, "alpha.png", encoded("RGBA", (3, 2), (20, 80, 140, 61)))
    for operation, payload in [("adjust", {"brightness": 20}), ("grayscale", {}), ("threshold", {"threshold_mode": "binary"})]:
        result = apply(client, asset_id, operation=operation, **payload)
        output = content(client, result)
        assert "A" in output.getbands()
        assert output.getchannel("A").getextrema() == (61, 61)


def test_preview_assets_are_replaced_and_deleted_on_cancel() -> None:
    app = create_app()
    client = TestClient(app)
    asset_id = upload(client, "source.png", encoded("RGB", (6, 4), (20, 30, 40)))
    first = apply(client, asset_id, operation="adjust", brightness=20, preview=True)
    assert app.state.temporary_storage.preview_count() == 1
    second = apply(client, asset_id, operation="adjust", brightness=40, preview=True, previous_preview_asset_id=first["asset_id"])
    assert app.state.temporary_storage.preview_count() == 1
    deleted = client.delete(f"/api/v1/assets/{second['asset_id']}/preview")
    assert deleted.status_code == 204
    assert app.state.temporary_storage.preview_count() == 0


def test_preview_does_not_change_source_asset() -> None:
    client = TestClient(create_app())
    asset_id = upload(client, "source.png", encoded("RGB", (2, 2), (10, 20, 30)))
    preview = apply(client, asset_id, operation="invert", preview=True)
    source_response = client.get(f"/api/v1/assets/{asset_id}/content")
    preview_response = client.get(preview["content_url"])
    with Image.open(BytesIO(source_response.content)) as source, Image.open(BytesIO(preview_response.content)) as result:
        assert source.getpixel((0, 0)) == (10, 20, 30)
        assert result.getpixel((0, 0)) == (245, 235, 225)
