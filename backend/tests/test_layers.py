from io import BytesIO

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from app.processors.layers_processor import LayersProcessor
from app.schemas.layers import ImageLayer, LayersRequest


def encoded_image(mode: str, size: tuple[int, int] = (40, 30), color=None) -> bytes:
    if mode == "RGBA":
        image = Image.new(mode, size, color or (255, 0, 0, 128))
    elif mode == "LA":
        image = Image.new(mode, size, color or (120, 128))
    elif mode == "L":
        image = Image.new(mode, size, color or 120)
    else:
        image = Image.new("RGB", size, color or (255, 0, 0))
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def test_layers_alpha_compositing_opacity_and_transform() -> None:
    base = Image.new("RGBA", (100, 80), (0, 0, 255, 255))
    layer = Image.new("RGBA", (20, 10), (255, 0, 0, 255))
    request = ImageLayer(asset_id="layer", opacity=50, x=10, y=20, scale=2, rotation=0)
    result = LayersProcessor().apply(base, [(request, layer)])
    assert result.mode == "RGBA"
    assert result.size == base.size
    pixel = np.asarray(result)[25, 15]
    assert 120 <= int(pixel[0]) <= 135
    assert 120 <= int(pixel[2]) <= 135
    assert np.array_equal(np.asarray(result)[0, 0], np.asarray(base)[0, 0])


def test_layers_preserve_rgb_rgba_grayscale_and_la_modes() -> None:
    layer = Image.new("RGBA", (8, 8), (20, 40, 60, 128))
    for mode in ("RGB", "RGBA", "L", "LA"):
        base = Image.open(BytesIO(encoded_image(mode, (20, 20))))
        result = LayersProcessor().apply(base, [(ImageLayer(asset_id="layer", x=2, y=2), layer)])
        assert result.mode == mode
        assert result.size == base.size


def test_layers_schema_rejects_invalid_values_and_more_than_ten() -> None:
    try:
        ImageLayer(asset_id="x", opacity=101)
        assert False
    except ValueError:
        pass
    try:
        ImageLayer(asset_id="x", scale=0)
        assert False
    except ValueError:
        pass
    try:
        LayersRequest(asset_id="base", layers=[ImageLayer(asset_id=str(index)) for index in range(11)])
        assert False
    except ValueError:
        pass


def test_layers_api_preview_cleanup_apply_and_missing_layer() -> None:
    app = create_app()
    client = TestClient(app)
    base = client.post("/api/v1/assets", files={"file": ("base.png", encoded_image("RGBA", (60, 40), (0, 0, 255, 255)), "image/png")})
    layer = client.post("/api/v1/assets", files={"file": ("layer.png", encoded_image("RGBA", (20, 10), (255, 0, 0, 200)), "image/png")})
    assert base.status_code == 201
    assert layer.status_code == 201
    base_id = base.json()["asset_id"]
    layer_id = layer.json()["asset_id"]
    payload = {"asset_id": base_id, "layers": [{"asset_id": layer_id, "name": "Foreground", "visible": True, "opacity": 75, "x": 10, "y": 5, "scale": 1.5, "rotation": 12}], "preview": True}
    preview = client.post("/api/v1/advanced/layers", json=payload)
    assert preview.status_code == 201
    preview_asset = preview.json()
    assert app.state.temporary_storage.preview_count() == 1
    applied = client.post("/api/v1/advanced/layers", json={**payload, "preview": False, "previous_preview_asset_id": preview_asset["asset_id"]})
    assert applied.status_code == 201
    assert applied.json()["asset_id"] != base_id
    assert applied.json()["metadata"]["width"] == 60
    assert app.state.temporary_storage.preview_count() == 0
    missing = client.post("/api/v1/advanced/layers", json={**payload, "layers": [{"asset_id": "00000000-0000-0000-0000-000000000000"}]})
    assert missing.status_code == 400
