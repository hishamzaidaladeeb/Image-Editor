from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.blur_processor import BlurAreaProcessor
from app.schemas.blur import BlurAreaRequest


def image_bytes(mode: str = "RGB", size: tuple[int, int] = (15, 11)) -> bytes:
    if mode == "L":
        image = Image.fromarray(np.arange(size[0] * size[1], dtype=np.uint8).reshape(size[1], size[0]) * 7)
    elif mode == "RGBA":
        image = Image.new("RGBA", size)
        image.putdata([(x * 11 % 256, y * 17 % 256, (x + y) * 19 % 256, 77 + (x * 3 + y) % 120) for y in range(size[1]) for x in range(size[0])])
    else:
        image = Image.new("RGB", size)
        image.putdata([(x * 11 % 256, y * 17 % 256, (x + y) * 19 % 256) for y in range(size[1]) for x in range(size[0])])
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def test_blur_changes_only_selected_region() -> None:
    source = Image.new("L", (15, 11), 0)
    source.putpixel((7, 5), 255)
    request = BlurAreaRequest(asset_id="unit", x=3, y=2, width=9, height=7, kernel_size=5, sigma=1.2)
    result = BlurAreaProcessor().apply(source, request)
    source_array = np.asarray(source)
    result_array = np.asarray(result)
    assert result.size == source.size
    assert np.array_equal(result_array[:2], source_array[:2])
    assert np.array_equal(result_array[9:], source_array[9:])
    assert np.array_equal(result_array[:, :3], source_array[:, :3])
    assert np.array_equal(result_array[:, 12:], source_array[:, 12:])
    assert np.any(result_array[2:9, 3:12] != source_array[2:9, 3:12])


def test_blur_supports_rgb_rgba_and_grayscale() -> None:
    for mode in ("RGB", "RGBA", "L"):
        source = Image.open(BytesIO(image_bytes(mode)))
        request = BlurAreaRequest(asset_id="unit", x=2, y=2, width=8, height=5, kernel_size=3, sigma=1)
        result = BlurAreaProcessor().apply(source, request)
        assert result.size == source.size
        if mode == "RGBA":
            assert result.mode == "RGBA"
            assert np.array_equal(np.asarray(result.getchannel("A")), np.asarray(source.getchannel("A")))
        elif mode == "L":
            assert result.mode == "L"
        else:
            assert result.mode == "RGB"


def test_blur_invalid_region_and_kernel_are_rejected() -> None:
    try:
        BlurAreaRequest(asset_id="unit", x=0, y=0, width=4, height=4, kernel_size=4)
        assert False
    except ValueError:
        pass
    processor = BlurAreaProcessor()
    try:
        processor.apply(Image.new("RGB", (10, 10)), BlurAreaRequest(asset_id="unit", x=8, y=8, width=4, height=4))
        assert False
    except ValueError as error:
        assert str(error) == "BLUR_REGION_INVALID"


def test_blur_preview_cleanup_and_final_revision() -> None:
    app = create_app()
    client = TestClient(app)
    upload = client.post("/api/v1/assets", files={"file": ("blur.png", image_bytes("RGBA"), "image/png")})
    assert upload.status_code == 201
    asset_id = upload.json()["asset_id"]
    preview = client.post("/api/v1/advanced/blur-area", json={"asset_id": asset_id, "x": 2, "y": 2, "width": 8, "height": 5, "kernel_size": 5, "sigma": 1.2, "preview": True})
    assert preview.status_code == 201
    preview_asset = preview.json()
    assert preview_asset["metadata"]["width"] == 15
    assert preview_asset["metadata"]["height"] == 11
    assert app.state.temporary_storage.preview_count() == 1
    applied = client.post("/api/v1/advanced/blur-area", json={"asset_id": asset_id, "x": 2, "y": 2, "width": 8, "height": 5, "kernel_size": 5, "sigma": 1.2, "preview": False, "previous_preview_asset_id": preview_asset["asset_id"]})
    assert applied.status_code == 201
    assert applied.json()["asset_id"] != asset_id
    assert applied.json()["metadata"]["has_transparency"] is True
    assert app.state.temporary_storage.preview_count() == 0
