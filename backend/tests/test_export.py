from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app


def image_bytes(mode: str = "RGBA", size: tuple[int, int] = (8, 6)) -> bytes:
    buffer = BytesIO()
    if mode == "RGBA":
        image = Image.new(mode, size, (240, 40, 20, 96))
    elif mode == "RGB":
        image = Image.new(mode, size, (240, 40, 20))
    else:
        image = Image.new(mode, size, 128)
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def client() -> TestClient:
    return TestClient(create_app())


def upload(test_client: TestClient, mode: str = "RGBA") -> dict:
    response = test_client.post("/api/v1/assets", files={"file": ("source.png", image_bytes(mode), "image/png")})
    assert response.status_code == 201
    return response.json()


def test_png_export_preserves_alpha_and_dimensions() -> None:
    test_client = client()
    asset = upload(test_client)
    response = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "png", "width": 4, "height": 3, "filename": "alpha", "preview": False})
    assert response.status_code == 201
    payload = response.json()
    assert payload["format"] == "PNG"
    assert payload["width"] == 4
    assert payload["height"] == 3
    assert payload["has_transparency"] is True
    content = test_client.get(payload["content_url"] if "content_url" in payload else payload["preview_url"])
    assert content.status_code == 200
    assert content.content.startswith(b"\x89PNG\r\n\x1a\n")
    with Image.open(BytesIO(content.content)) as result:
        assert result.size == (4, 3)
        assert result.mode == "RGBA"
        assert result.getpixel((0, 0))[3] == 96


def test_jpeg_export_uses_jpeg_signature_and_removes_alpha() -> None:
    test_client = client()
    asset = upload(test_client)
    response = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "jpg", "quality": 70, "filename": "photo"})
    assert response.status_code == 201
    payload = response.json()
    assert payload["format"] == "JPEG"
    assert payload["has_transparency"] is False
    content = test_client.get(payload["preview_url"])
    assert content.status_code == 200
    assert content.content[:2] == b"\xff\xd8"
    with Image.open(BytesIO(content.content)) as result:
        assert result.format == "JPEG"
        assert result.mode == "RGB"


def test_webp_quality_changes_encoded_bytes() -> None:
    test_client = client()
    asset = upload(test_client, "RGB")
    low = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "webp", "quality": 10, "filename": "low"}).json()
    high = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "webp", "quality": 100, "filename": "high"}).json()
    low_content = test_client.get(low["preview_url"]).content
    high_content = test_client.get(high["preview_url"]).content
    assert low_content[:4] == b"RIFF"
    assert high_content[:4] == b"RIFF"
    assert low_content != high_content


def test_grayscale_export_remains_grayscale() -> None:
    test_client = client()
    asset = upload(test_client, "L")
    response = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "png", "filename": "gray"})
    assert response.status_code == 201
    with Image.open(BytesIO(test_client.get(response.json()["preview_url"]).content)) as result:
        assert result.mode == "L"
        assert result.size == (8, 6)


def test_final_download_has_safe_filename_and_attachment_header() -> None:
    test_client = client()
    asset = upload(test_client, "RGB")
    response = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "jpeg", "filename": "final-image"})
    assert response.status_code == 201
    payload = response.json()
    download = test_client.get(payload["download_url"])
    assert download.status_code == 200
    assert "attachment" in download.headers["content-disposition"]
    assert "final-image.jpg" in download.headers["content-disposition"]


def test_preview_can_be_deleted_and_cannot_be_downloaded() -> None:
    test_client = client()
    asset = upload(test_client, "RGB")
    response = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "png", "filename": "preview", "preview": True})
    assert response.status_code == 201
    payload = response.json()
    assert test_client.get(payload["download_url"]).status_code == 400
    assert test_client.delete(f"/api/v1/export/{payload['export_id']}/preview").status_code == 204
    assert test_client.get(payload["preview_url"]).status_code == 400


def test_invalid_export_parameters_are_rejected() -> None:
    test_client = client()
    asset = upload(test_client, "RGB")
    invalid_format = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "gif"})
    invalid_quality = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "png", "quality": 0})
    invalid_filename = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "png", "filename": "../escape"})
    invalid_resolution = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": "png", "width": 4})
    assert invalid_format.status_code == 422
    assert invalid_quality.status_code == 422
    assert invalid_filename.status_code == 422
    assert invalid_resolution.status_code == 422


def test_preview_source_asset_is_rejected() -> None:
    test_client = client()
    asset = upload(test_client, "RGB")
    preview_asset = test_client.post("/api/v1/assets/preview", json={"source_asset_id": asset["asset_id"]})
    if preview_asset.status_code == 201:
        response = test_client.post("/api/v1/export", json={"asset_id": preview_asset.json()["asset_id"], "format": "png"})
        assert response.status_code == 400


def test_preview_cleanup_cors_allows_delete_for_local_origins() -> None:
    test_client = client()
    response = test_client.options("/api/v1/export/test/preview", headers={"Origin": "http://127.0.0.1:5173", "Access-Control-Request-Method": "DELETE"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
    assert "DELETE" in response.headers["access-control-allow-methods"]


def test_temporary_asset_preview_cannot_be_exported() -> None:
    test_client = client()
    storage = test_client.app.state.temporary_storage
    preview_id, _ = storage.save(image_bytes("RGB"), ".png", preview=True)
    response = test_client.post("/api/v1/export", json={"asset_id": preview_id, "format": "png", "filename": "preview-source"})
    assert response.status_code == 400
    assert response.json()["code"] == "ASSET_NOT_FOUND"


@pytest.mark.parametrize(
    ("format_name", "source_mode", "expected_mode", "expected_transparency"),
    [
        ("png", "RGBA", "RGBA", True),
        ("jpg", "RGB", "RGB", False),
        ("webp", "RGB", "RGB", False),
    ],
)
def test_requested_80_by_320_dimensions_are_encoded_for_each_format(format_name: str, source_mode: str, expected_mode: str, expected_transparency: bool) -> None:
    test_client = client()
    asset = upload(test_client, source_mode)
    response = test_client.post("/api/v1/export", json={"asset_id": asset["asset_id"], "format": format_name, "width": 80, "height": 320, "filename": "dimensions", "preview": False})
    assert response.status_code == 201
    payload = response.json()
    assert payload["width"] == 80
    assert payload["height"] == 320
    assert payload["has_transparency"] is expected_transparency
    content = test_client.get(payload["download_url"])
    assert content.status_code == 200
    if format_name == "png":
        assert content.content.startswith(b"\x89PNG\r\n\x1a\n")
    elif format_name == "jpg":
        assert content.content[:2] == b"\xff\xd8"
    else:
        assert content.content[:4] == b"RIFF" and content.content[8:12] == b"WEBP"
    with Image.open(BytesIO(content.content)) as result:
        assert result.size == (80, 320)
        assert result.mode == expected_mode
