from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.histogram_processor import HistogramProcessor
from app.schemas.histogram import HistogramRequest


def image_bytes(mode: str = "RGB", size: tuple[int, int] = (8, 6)) -> bytes:
    count = size[0] * size[1]
    if mode == "L":
        image = Image.fromarray(np.arange(count, dtype=np.uint8).reshape(size[1], size[0]))
    elif mode == "RGBA":
        values = [(index % 256, (index * 3) % 256, (index * 7) % 256, 50 + index % 200) for index in range(count)]
        image = Image.new("RGBA", size)
        image.putdata(values)
    else:
        values = [(index % 256, (index * 3) % 256, (index * 7) % 256) for index in range(count)]
        image = Image.new("RGB", size)
        image.putdata(values)
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def test_histogram_counts_are_exact_for_rgb() -> None:
    image = Image.new("RGB", (2, 2), (10, 20, 30))
    processor = HistogramProcessor()
    result = processor.calculate(image)
    assert sum(result["red"]) == 4
    assert sum(result["green"]) == 4
    assert sum(result["blue"]) == 4
    assert result["red"][10] == 4
    assert result["green"][20] == 4
    assert result["blue"][30] == 4
    assert sum(result["grayscale"]) == 4


def test_grayscale_histogram_repeats_channel_for_l_image() -> None:
    image = Image.fromarray(np.array([[0, 64], [128, 255]], dtype=np.uint8))
    result = HistogramProcessor().calculate(image)
    assert result["red"] == result["green"] == result["blue"]
    assert result["grayscale"] == result["red"]
    assert result["alpha"] is None


def test_rgba_histogram_counts_and_alpha_are_preserved_by_processing() -> None:
    image = Image.new("RGBA", (4, 3), (40, 80, 120, 137))
    processor = HistogramProcessor()
    before = processor.calculate(image)
    result = processor.process(image, "clahe", 2.0, 8)
    after = processor.calculate(result)
    assert sum(before["alpha"] or []) == 12
    assert before["alpha"] == after["alpha"]
    assert result.getchannel("A").getextrema() == (137, 137)
    assert result.size == image.size


def test_equalization_and_clahe_return_new_processed_images() -> None:
    image = Image.fromarray(np.tile(np.array([20, 20, 40, 80, 120, 180, 220, 220], dtype=np.uint8), (6, 1)))
    processor = HistogramProcessor()
    for operation in ("equalize", "clahe"):
        result = processor.process(image, operation, 2.0, 8)
        assert result is not image
        assert result.mode == "L"
        assert result.size == image.size
        assert np.asarray(result).shape == np.asarray(image).shape


def test_histogram_api_returns_before_after_and_revision() -> None:
    app = create_app()
    client = TestClient(app)
    upload = client.post("/api/v1/assets", files={"file": ("histogram.png", image_bytes(), "image/png")})
    assert upload.status_code == 201
    asset_id = upload.json()["asset_id"]
    original = client.post("/api/v1/histogram", json={"asset_id": asset_id, "operation": "original"})
    assert original.status_code == 200
    original_data = original.json()
    assert original_data["processed_asset"] is None
    assert sum(original_data["before"]["red"]) == 48
    assert sum(original_data["after"]["grayscale"]) == 48
    equalized = client.post("/api/v1/histogram", json={"asset_id": asset_id, "operation": "equalize"})
    assert equalized.status_code == 200
    assert equalized.json()["processed_asset"]["asset_id"] != asset_id
    assert equalized.json()["after"] != equalized.json()["before"]


def test_histogram_preview_is_replaced_and_cleaned_on_apply() -> None:
    app = create_app()
    client = TestClient(app)
    upload = client.post("/api/v1/assets", files={"file": ("histogram.png", image_bytes("RGBA"), "image/png")})
    asset_id = upload.json()["asset_id"]
    first = client.post("/api/v1/histogram", json={"asset_id": asset_id, "operation": "clahe", "preview": True})
    assert first.status_code == 200
    first_preview = first.json()["processed_asset"]["asset_id"]
    assert app.state.temporary_storage.preview_count() == 1
    second = client.post("/api/v1/histogram", json={"asset_id": asset_id, "operation": "equalize", "preview": True, "previous_preview_asset_id": first_preview})
    assert second.status_code == 200
    second_preview = second.json()["processed_asset"]["asset_id"]
    assert second_preview != first_preview
    assert app.state.temporary_storage.preview_count() == 1
    applied = client.post("/api/v1/histogram", json={"asset_id": asset_id, "operation": "equalize", "preview": False, "previous_preview_asset_id": second_preview})
    assert applied.status_code == 200
    assert app.state.temporary_storage.preview_count() == 0


def test_histogram_validates_asset_and_parameters() -> None:
    app = create_app()
    client = TestClient(app)
    missing = client.post("/api/v1/histogram", json={"asset_id": "missing", "operation": "original"})
    assert missing.status_code == 400
    invalid = client.post("/api/v1/histogram", json={"asset_id": "00000000-0000-0000-0000-000000000000", "operation": "clahe", "clahe_clip_limit": 0.01})
    assert invalid.status_code == 422


def test_histogram_schema_rejects_unknown_fields() -> None:
    try:
        HistogramRequest(asset_id="asset", unknown=True)
        assert False
    except ValueError:
        pass
