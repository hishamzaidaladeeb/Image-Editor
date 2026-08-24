from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient
from app.main import create_app


def image_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (100, 60), (200, 20, 20)).save(buffer, format="PNG")
    return buffer.getvalue()


def uploaded_client() -> tuple[TestClient, str]:
    test_client = TestClient(create_app())
    response = test_client.post("/api/v1/assets", files={"file": ("source.png", image_bytes(), "image/png")})
    return test_client, response.json()["asset_id"]


def transform(test_client: TestClient, asset_id: str, operation: str, **values: object) -> dict:
    response = test_client.post("/api/v1/operations/transform", json={"asset_id": asset_id, "operation": operation, **values})
    assert response.status_code == 201
    return response.json()


def test_crop_resize_rotate_flip_scale_and_translate() -> None:
    test_client, asset_id = uploaded_client()
    assert transform(test_client, asset_id, "crop", x=10, y=10, width=40, height=20)["metadata"]["width"] == 40
    assert transform(test_client, asset_id, "resize", width=50, height=50, lock_aspect=True)["metadata"]["height"] == 30
    assert transform(test_client, asset_id, "rotate", angle=90)["metadata"]["width"] == 60
    assert transform(test_client, asset_id, "flip", flip_axis="horizontal")["metadata"]["width"] == 100
    assert transform(test_client, asset_id, "scale", scale_x=2, scale_y=0.5)["metadata"]["height"] == 30
    assert transform(test_client, asset_id, "translate", x=5, y=5)["metadata"]["width"] == 100


def test_resize_percentage_and_perspective() -> None:
    test_client, asset_id = uploaded_client()
    resized = transform(test_client, asset_id, "resize", percentage=50)
    assert resized["metadata"]["width"] == 50
    assert resized["metadata"]["height"] == 30
    perspective = transform(test_client, asset_id, "perspective", points=[[0, 0], [100, 0], [100, 60], [0, 60]])
    assert perspective["metadata"]["width"] == 100


def test_transform_errors_are_unified() -> None:
    test_client = TestClient(create_app())
    response = test_client.post("/api/v1/operations/transform", json={"asset_id": "missing", "operation": "crop", "width": 10, "height": 10})
    assert response.status_code == 400
    assert response.json()["code"] == "ASSET_NOT_FOUND"
