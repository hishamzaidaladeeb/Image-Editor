from io import BytesIO
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient
from app.main import create_app


def image_bytes(image_format: str = "PNG", size: tuple[int, int] = (8, 6)) -> bytes:
    buffer = BytesIO()
    mode = "RGB" if image_format in {"JPEG", "BMP"} else "RGBA"
    color = (20, 40, 80) if mode == "RGB" else (20, 40, 80, 255)
    Image.new(mode, size, color).save(buffer, format=image_format)
    return buffer.getvalue()


def client() -> TestClient:
    return TestClient(create_app())


def test_upload_returns_asset_and_metadata() -> None:
    response = client().post("/api/v1/assets", files={"file": ("sample.png", image_bytes(), "image/png")})
    assert response.status_code == 201
    payload = response.json()
    assert payload["asset_id"]
    assert payload["metadata"]["width"] == 8
    assert payload["metadata"]["height"] == 6
    assert payload["metadata"]["format"] == "PNG"
    assert payload["metadata"]["channels"] == 4
    assert Path("/tmp/image-editor").joinpath(f"{payload['asset_id']}.png").exists()


def test_asset_content_reference_returns_uploaded_bytes() -> None:
    test_client = client()
    response = test_client.post("/api/v1/assets", files={"file": ("sample.png", image_bytes(), "image/png")})
    assert response.status_code == 201
    asset = response.json()
    content = test_client.get(asset["content_url"])
    assert content.status_code == 200
    assert content.content.startswith(b"\x89PNG")


def test_supported_formats_are_accepted() -> None:
    cases = [("png", "PNG", "image/png"), ("jpg", "JPEG", "image/jpeg"), ("jpeg", "JPEG", "image/jpeg"), ("webp", "WEBP", "image/webp"), ("bmp", "BMP", "image/bmp"), ("tiff", "TIFF", "image/tiff")]
    for extension, image_format, mime in cases:
        response = client().post("/api/v1/assets", files={"file": (f"sample.{extension}", image_bytes(image_format), mime)})
        assert response.status_code == 201


def test_unsupported_extension_is_rejected() -> None:
    response = client().post("/api/v1/assets", files={"file": ("sample.gif", image_bytes(), "image/gif")})
    assert response.status_code == 400
    assert response.json()["code"] == "UNSUPPORTED_EXTENSION"


def test_mime_mismatch_is_rejected() -> None:
    response = client().post("/api/v1/assets", files={"file": ("sample.png", image_bytes(), "image/jpeg")})
    assert response.status_code == 400
    assert response.json()["code"] == "MIME_MISMATCH"


def test_invalid_content_is_rejected() -> None:
    response = client().post("/api/v1/assets", files={"file": ("sample.png", b"not-an-image", "image/png")})
    assert response.status_code == 400
    assert response.json()["code"] == "INVALID_IMAGE_CONTENT"


def test_empty_file_is_rejected() -> None:
    response = client().post("/api/v1/assets", files={"file": ("empty.png", b"", "image/png")})
    assert response.status_code == 400
    assert response.json()["code"] == "EMPTY_FILE"


def test_suspicious_path_is_rejected() -> None:
    response = client().post("/api/v1/assets", files={"file": ("../sample.png", image_bytes(), "image/png")})
    assert response.status_code == 400
    assert response.json()["code"] == "SUSPICIOUS_FILENAME"


def test_oversized_file_is_rejected() -> None:
    response = client().post("/api/v1/assets", files={"file": ("large.png", b"x" * (25 * 1024 * 1024 + 1), "image/png")})
    assert response.status_code == 400
    assert response.json()["code"] == "FILE_TOO_LARGE"
