from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient
from app.main import create_app


def encoded(mode: str, size: tuple[int, int], image_format: str) -> bytes:
    image = Image.new(mode, size)
    output = BytesIO()
    image.save(output, format=image_format)
    return output.getvalue()


def upload(test_client: TestClient, filename: str, data: bytes, mime: str) -> str:
    response = test_client.post("/api/v1/assets", files={"file": (filename, data, mime)})
    assert response.status_code == 201
    return response.json()["asset_id"]


def apply(test_client: TestClient, asset_id: str, operation: str, **values: object) -> dict:
    response = test_client.post("/api/v1/operations/transform", json={"asset_id": asset_id, "operation": operation, **values})
    assert response.status_code == 201
    return response.json()


def test_varied_channels_formats_and_sizes() -> None:
    test_client = TestClient(create_app())
    cases = [
        ("rgba.png", encoded("RGBA", (320, 180), "PNG"), "image/png", 4),
        ("gray.jpg", encoded("L", (64, 48), "JPEG"), "image/jpeg", 1),
        ("rgb.bmp", encoded("RGB", (40, 30), "BMP"), "image/bmp", 3),
        ("rgba.tiff", encoded("RGBA", (17, 11), "TIFF"), "image/tiff", 4),
    ]
    for filename, data, mime, channels in cases:
        asset_id = upload(test_client, filename, data, mime)
        response = apply(test_client, asset_id, "flip", flip_axis="horizontal")
        assert response["metadata"]["channels"] == channels
        assert response["metadata"]["width"] == Image.open(BytesIO(data)).width
        rotated = apply(test_client, asset_id, "rotate", angle=90)
        assert rotated["metadata"]["width"] == Image.open(BytesIO(data)).height
        assert rotated["metadata"]["height"] == Image.open(BytesIO(data)).width


def test_crop_and_resize_boundaries() -> None:
    test_client = TestClient(create_app())
    asset_id = upload(test_client, "large.png", encoded("RGB", (1000, 700), "PNG"), "image/png")
    cropped = apply(test_client, asset_id, "crop", x=900, y=600, width=300, height=300)
    assert cropped["metadata"]["width"] == 100
    assert cropped["metadata"]["height"] == 100
    resized = apply(test_client, asset_id, "resize", width=300, height=300, lock_aspect=False)
    assert resized["metadata"]["width"] == 300
    assert resized["metadata"]["height"] == 300
