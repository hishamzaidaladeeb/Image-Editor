from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.transform_processor import TransformProcessor
from app.schemas.transform import TransformRequest


def png_bytes(size: tuple[int, int] = (20, 12)) -> bytes:
    image = Image.fromarray(np.arange(size[0] * size[1] * 3, dtype=np.uint8).reshape(size[1], size[0], 3))
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def test_transform_processor_uses_requested_resize_interpolation() -> None:
    image = Image.open(BytesIO(png_bytes()))
    processor = TransformProcessor()
    for interpolation in ("nearest", "linear", "cubic", "lanczos"):
        result = processor.apply(image, TransformRequest(asset_id="a", operation="resize", width=10, height=6, interpolation=interpolation))
        assert result.size == (10, 6)


def test_perspective_supports_all_declared_interpolations() -> None:
    image = Image.open(BytesIO(png_bytes()))
    processor = TransformProcessor()
    points = [(0, 0), (20, 0), (20, 12), (0, 12)]
    for interpolation in ("nearest", "linear", "cubic", "lanczos"):
        result = processor.apply(image, TransformRequest(asset_id="a", operation="perspective", points=points, interpolation=interpolation))
        assert result.size == image.size


def test_resize_lock_aspect_and_unlock_behavior() -> None:
    image = Image.open(BytesIO(png_bytes()))
    processor = TransformProcessor()
    locked = processor.apply(image, TransformRequest(asset_id="a", operation="resize", width=10, height=10, lock_aspect=True))
    unlocked = processor.apply(image, TransformRequest(asset_id="a", operation="resize", width=10, height=10, lock_aspect=False))
    assert locked.size == (10, 6)
    assert unlocked.size == (10, 10)


def test_transform_preview_is_cleaned_when_applied() -> None:
    app = create_app()
    client = TestClient(app)
    upload = client.post("/api/v1/assets", files={"file": ("source.png", png_bytes(), "image/png")})
    assert upload.status_code == 201
    asset_id = upload.json()["asset_id"]
    preview = client.post("/api/v1/operations/transform", json={"asset_id": asset_id, "operation": "resize", "width": 10, "height": 6, "preview": True})
    assert preview.status_code == 201
    assert app.state.temporary_storage.preview_count() == 1
    applied = client.post("/api/v1/operations/transform", json={"asset_id": asset_id, "operation": "resize", "width": 10, "height": 6, "preview": False, "previous_preview_asset_id": preview.json()["asset_id"]})
    assert applied.status_code == 201
    assert app.state.temporary_storage.preview_count() == 0
