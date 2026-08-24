from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.filter_processor import FilterProcessor
from app.schemas.filter import FilterRequest


def image_bytes(mode: str, size: tuple[int, int]) -> bytes:
    if mode == "L":
        image = Image.frombytes("L", size, bytes((index * 17) % 256 for index in range(size[0] * size[1])))
    elif mode == "RGBA":
        values = [(index * 13 % 256, index * 29 % 256, index * 47 % 256, 80 + index % 170) for index in range(size[0] * size[1])]
        image = Image.new("RGBA", size)
        image.putdata(values)
    else:
        values = [(index * 13 % 256, index * 29 % 256, index * 47 % 256) for index in range(size[0] * size[1])]
        image = Image.new("RGB", size)
        image.putdata(values)
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def apply_processor(mode: str, operation: str, size: tuple[int, int] = (9, 7), **kwargs: object) -> Image.Image:
    image = Image.open(BytesIO(image_bytes(mode, size)))
    request = FilterRequest(asset_id="unit", operation=operation, **kwargs)
    return FilterProcessor().apply(image, request)


def test_all_required_filters_produce_real_output() -> None:
    operations = [
        ("average_blur", {}),
        ("gaussian_blur", {"sigma": 1.2}),
        ("median_blur", {}),
        ("bilateral", {}),
        ("laplacian", {}),
        ("unsharp_mask", {"amount": 1.5}),
        ("sharpen_kernel", {"amount": 1.5}),
        ("sobel", {}),
        ("scharr", {}),
        ("canny", {"low_threshold": 20, "high_threshold": 80}),
        ("erosion", {}),
        ("dilation", {}),
        ("opening", {}),
        ("closing", {}),
        ("morphological_gradient", {}),
    ]
    source = Image.open(BytesIO(image_bytes("RGB", (9, 7))))
    source_array = np.asarray(source)
    for operation, kwargs in operations:
        result = apply_processor("RGB", operation, **kwargs)
        assert result.size == source.size
        assert np.asarray(result).size > 0
        result_array = np.asarray(result)
        baseline = source_array if result_array.shape == source_array.shape else np.asarray(source.convert("L"))
        assert np.any(result_array != baseline) or operation == "median_blur"


def test_filters_support_rgb_rgba_and_grayscale() -> None:
    for mode in ("RGB", "RGBA", "L"):
        for operation in ("gaussian_blur", "median_blur", "unsharp_mask", "erosion", "dilation"):
            result = apply_processor(mode, operation)
            if mode == "RGBA":
                assert "A" in result.getbands()
                assert result.getchannel("A").getextrema()[0] >= 80
            elif mode == "L":
                assert result.mode == "L"
            else:
                assert result.mode == "RGB"


def test_alpha_is_preserved_for_color_and_edge_filters() -> None:
    image = Image.new("RGBA", (9, 7), (40, 100, 180, 123))
    processor = FilterProcessor()
    for operation in ("gaussian_blur", "bilateral", "unsharp_mask", "sobel", "canny", "dilation"):
        result = processor.apply(image, FilterRequest(asset_id="unit", operation=operation, low_threshold=20, high_threshold=80))
        assert "A" in result.getbands()
        assert result.getchannel("A").getextrema() == (123, 123)


def test_edge_detection_and_morphology_have_expected_properties() -> None:
    source = Image.fromarray(np.array([[0, 0, 0, 0, 0], [0, 0, 255, 0, 0], [0, 0, 255, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], dtype=np.uint8))
    processor = FilterProcessor()
    for operation in ("sobel", "scharr", "canny", "laplacian"):
        result = processor.apply(source, FilterRequest(asset_id="unit", operation=operation, low_threshold=20, high_threshold=80))
        assert result.mode == "L"
        assert np.asarray(result).max() > 0
    dilated = processor.apply(source, FilterRequest(asset_id="unit", operation="dilation", kernel_size=3))
    eroded = processor.apply(source, FilterRequest(asset_id="unit", operation="erosion", kernel_size=3))
    assert np.asarray(dilated).sum() > np.asarray(source).sum()
    assert np.asarray(eroded).sum() < np.asarray(source).sum()


def test_invalid_filter_parameters_are_rejected() -> None:
    try:
        FilterRequest(asset_id="unit", operation="gaussian_blur", kernel_size=4)
        assert False
    except ValueError:
        pass
    try:
        FilterRequest(asset_id="unit", operation="canny", low_threshold=100, high_threshold=50)
        assert False
    except ValueError:
        pass


def test_filter_preview_cleanup_and_revision() -> None:
    app = create_app()
    client = TestClient(app)
    upload = client.post("/api/v1/assets", files={"file": ("filter.png", image_bytes("RGB", (9, 7)), "image/png")})
    assert upload.status_code == 201
    asset_id = upload.json()["asset_id"]
    preview = client.post("/api/v1/filters", json={"asset_id": asset_id, "operation": "gaussian_blur", "preview": True})
    assert preview.status_code == 201
    preview_asset = preview.json()
    assert app.state.temporary_storage.preview_count() == 1
    applied = client.post("/api/v1/filters", json={"asset_id": asset_id, "operation": "gaussian_blur", "preview": False, "previous_preview_asset_id": preview_asset["asset_id"]})
    assert applied.status_code == 201
    assert applied.json()["asset_id"] != asset_id
    assert app.state.temporary_storage.preview_count() == 0
