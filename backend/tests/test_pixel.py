from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.pixel_processor import PixelProcessor
from app.schemas.pixel import PixelRequest


def image_bytes(mode: str, size: tuple[int, int], values: tuple[int, ...], image_format: str = "PNG") -> bytes:
    image = Image.new(mode, size, values)
    output = BytesIO()
    image.save(output, format=image_format)
    return output.getvalue()


def upload(client: TestClient, filename: str, payload: bytes, mime: str) -> str:
    response = client.post("/api/v1/assets", files={"file": (filename, payload, mime)})
    assert response.status_code == 201
    return response.json()["asset_id"]


def apply(client: TestClient, asset_id: str, **payload: object) -> dict:
    response = client.post("/api/v1/operations/pixel", json={"asset_id": asset_id, **payload})
    assert response.status_code == 201
    return response.json()


def test_adjustment_is_real_for_rgb_and_preserves_dimensions() -> None:
    client = TestClient(create_app())
    asset_id = upload(client, "rgb.png", image_bytes("RGB", (8, 6), (40, 50, 60)), "image/png")
    result = apply(client, asset_id, operation="adjust", brightness=100, contrast=1, gamma=1, saturation=1, hue=0, exposure=0, sharpness=0)
    assert result["metadata"]["width"] == 8
    assert result["metadata"]["height"] == 6
    content = client.get(result["content_url"])
    assert content.status_code == 200
    with Image.open(BytesIO(content.content)) as output:
        assert output.getpixel((0, 0))[0] > 40


def test_rgba_invert_preserves_alpha() -> None:
    client = TestClient(create_app())
    asset_id = upload(client, "transparent.png", image_bytes("RGBA", (5, 4), (20, 40, 60, 77)), "image/png")
    result = apply(client, asset_id, operation="invert")
    assert result["metadata"]["channels"] == 4
    assert result["metadata"]["has_transparency"] is True
    response = client.get(result["content_url"])
    with Image.open(BytesIO(response.content)) as output:
        assert output.mode == "RGBA"
        assert output.getpixel((0, 0)) == (235, 215, 195, 77)


def test_grayscale_supports_grayscale_input() -> None:
    client = TestClient(create_app())
    asset_id = upload(client, "gray.png", image_bytes("L", (7, 3), (120,)), "image/png")
    result = apply(client, asset_id, operation="grayscale")
    assert result["metadata"]["channels"] == 1
    assert result["metadata"]["color_mode"] == "L"


def test_global_binary_and_adaptive_thresholds_are_real() -> None:
    processor = PixelProcessor()
    source = Image.frombytes("L", (3, 3), np.array([[0, 100, 200], [50, 150, 250], [25, 125, 225]], dtype=np.uint8).tobytes())
    global_result = processor.apply(source, PixelRequest(asset_id="unit", operation="threshold", threshold_mode="global", threshold=128))
    binary_result = processor.apply(source, PixelRequest(asset_id="unit", operation="threshold", threshold_mode="binary", threshold=100, max_value=200))
    adaptive_result = processor.apply(source, PixelRequest(asset_id="unit", operation="threshold", threshold_mode="adaptive", block_size=3, adaptive_c=0))
    assert np.array_equal(np.asarray(global_result), np.array([[0, 0, 255], [0, 255, 255], [0, 0, 255]], dtype=np.uint8))
    assert set(np.unique(np.asarray(binary_result))).issubset({0, 200})
    assert set(np.unique(np.asarray(adaptive_result))).issubset({0, 255})


def test_out_of_range_and_invalid_adaptive_parameters_are_rejected() -> None:
    client = TestClient(create_app())
    asset_id = upload(client, "source.png", image_bytes("RGB", (4, 4), (10, 20, 30)), "image/png")
    out_of_range = client.post("/api/v1/operations/pixel", json={"asset_id": asset_id, "operation": "adjust", "gamma": 0})
    invalid_block = client.post("/api/v1/operations/pixel", json={"asset_id": asset_id, "operation": "threshold", "threshold_mode": "adaptive", "block_size": 10})
    unknown_operation = client.post("/api/v1/operations/pixel", json={"asset_id": asset_id, "operation": "unknown"})
    assert out_of_range.status_code == 422
    assert invalid_block.status_code == 400
    assert invalid_block.json()["code"] == "ADAPTIVE_BLOCK_SIZE_INVALID"
    assert unknown_operation.status_code == 422


def test_pixel_apply_creates_new_asset_revision() -> None:
    client = TestClient(create_app())
    asset_id = upload(client, "source.png", image_bytes("RGB", (4, 4), (10, 20, 30)), "image/png")
    result = apply(client, asset_id, operation="adjust", brightness=30)
    assert result["asset_id"] != asset_id
    assert result["content_url"].endswith(f"/assets/{result['asset_id']}/content")
