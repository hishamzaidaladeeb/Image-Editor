from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.blending_processor import BlendingProcessor
from app.schemas.blending import BlendingRequest


def solid(color: tuple[int, ...], size: tuple[int, int] = (4, 3), mode: str = "RGB") -> Image.Image:
    return Image.new(mode, size, color)


def encode(image: Image.Image, image_format: str = "PNG") -> bytes:
    output = BytesIO()
    image.save(output, format=image_format)
    return output.getvalue()


def blend_request(operation: str = "alpha", **overrides: object) -> BlendingRequest:
    values: dict[str, object] = {"asset_id": "first", "second_asset_id": "second", "operation": operation, **overrides}
    return BlendingRequest(**values)


def test_alpha_blending_uses_real_weighted_pixel_math() -> None:
    processor = BlendingProcessor()
    result = processor.apply(solid((40, 60, 80)), solid((200, 180, 160)), blend_request(opacity=0.25))
    assert result.mode == "RGBA"
    assert result.getpixel((0, 0)) == (80, 90, 100, 255)


def test_weighted_blend_and_difference_are_numerically_correct() -> None:
    processor = BlendingProcessor()
    first = solid((40, 60, 80))
    second = solid((200, 180, 160))
    weighted = processor.apply(first, second, blend_request("blend", weight_a=0.25, weight_b=0.75, opacity=1.0))
    weighted_half_opacity = processor.apply(first, second, blend_request("blend", weight_a=0.25, weight_b=0.75, opacity=0.5))
    difference = processor.apply(first, second, blend_request("difference"))
    assert weighted.getpixel((0, 0)) == (160, 150, 140, 255)
    assert weighted_half_opacity.getpixel((0, 0)) == (100, 105, 110, 255)
    assert difference.getpixel((0, 0)) == (160, 120, 80, 255)


def test_overlay_respects_opacity_and_alpha_channels() -> None:
    processor = BlendingProcessor()
    first = solid((40, 60, 80, 255), mode="RGBA")
    second = solid((200, 180, 160, 128), mode="RGBA")
    result = processor.apply(first, second, blend_request("overlay", opacity=0.5))
    assert result.mode == "RGBA"
    assert result.getpixel((0, 0))[0] > 40
    assert result.getpixel((0, 0))[3] == 255


def test_side_by_side_keeps_both_images_and_supports_different_sizes() -> None:
    result = BlendingProcessor().apply(solid((10, 20, 30), (4, 3)), solid((200, 210, 220), (2, 5)), blend_request("side_by_side"))
    assert result.size == (6, 5)
    assert result.getpixel((0, 2))[:3] == (10, 20, 30)
    assert result.getpixel((5, 2))[:3] == (200, 210, 220)


def test_all_operations_produce_new_rgba_images_for_rgb_rgba_and_grayscale() -> None:
    processor = BlendingProcessor()
    for mode, first, second in (("RGB", solid((20, 30, 40), mode="RGB"), solid((200, 210, 220), mode="RGB")), ("RGBA", solid((20, 30, 40, 90), mode="RGBA"), solid((200, 210, 220, 180), mode="RGBA")), ("L", solid((40,), mode="L"), solid((200,), mode="L"))):
        for operation in ("alpha", "overlay", "blend", "difference", "side_by_side"):
            result = processor.apply(first, second, blend_request(operation))
            assert result is not first
            assert result.mode == "RGBA"
            assert result.width > 0 and result.height > 0


def test_request_validates_distinct_assets_weights_and_ranges() -> None:
    invalid_requests = ({"asset_id": "same", "second_asset_id": "same"}, {"operation": "blend", "weight_a": 0, "weight_b": 0}, {"opacity": 2}, {"weight_a": -0.1})
    for values in invalid_requests:
        try:
            BlendingRequest(**values)
            assert False
        except ValueError:
            pass


def test_blending_api_creates_preview_and_final_revision_and_cleans_preview() -> None:
    app = create_app()
    client = TestClient(app)
    first_upload = client.post("/api/v1/assets", files={"file": ("first.png", encode(solid((20, 30, 40))), "image/png")})
    second_upload = client.post("/api/v1/assets", files={"file": ("second.png", encode(solid((220, 210, 200))), "image/png")})
    assert first_upload.status_code == 201
    assert second_upload.status_code == 201
    first_id = first_upload.json()["asset_id"]
    second_id = second_upload.json()["asset_id"]
    preview = client.post("/api/v1/blending", json={"asset_id": first_id, "second_asset_id": second_id, "operation": "alpha", "opacity": 0.25, "preview": True})
    assert preview.status_code == 200
    preview_id = preview.json()["processed_asset"]["asset_id"]
    assert preview_id != first_id
    assert app.state.temporary_storage.preview_count() == 1
    applied = client.post("/api/v1/blending", json={"asset_id": first_id, "second_asset_id": second_id, "operation": "difference", "preview": False, "previous_preview_asset_id": preview_id})
    assert applied.status_code == 200
    assert applied.json()["processed_asset"]["asset_id"] != first_id
    assert app.state.temporary_storage.preview_count() == 0


def test_blending_api_returns_unified_error_for_missing_second_asset() -> None:
    app = create_app()
    client = TestClient(app)
    first_upload = client.post("/api/v1/assets", files={"file": ("first.png", encode(solid((20, 30, 40))), "image/png")})
    response = client.post("/api/v1/blending", json={"asset_id": first_upload.json()["asset_id"], "second_asset_id": "missing", "operation": "alpha"})
    assert response.status_code == 400
    assert response.json()["code"] == "SECOND_ASSET_NOT_FOUND"
    assert response.json()["message"] == "الصورة الثانية غير متاحة."
    assert response.json()["request_id"]
