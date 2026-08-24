from io import BytesIO

from PIL import Image

from app.core.config import Settings
from app.errors.exceptions import UploadValidationError
from app.processors.layers_processor import LayersProcessor
from app.schemas.assets import AssetResponse
from app.schemas.layers import LayersRequest
from app.storage.temporary import SafeTemporaryStorage
from app.validators.images import inspect_image


class LayersService:
    def __init__(self, settings: Settings, storage: SafeTemporaryStorage) -> None:
        self.settings = settings
        self.storage = storage
        self.processor = LayersProcessor()

    def apply(self, request: LayersRequest) -> AssetResponse:
        if request.previous_preview_asset_id:
            self.storage.delete_preview(request.previous_preview_asset_id)
        source_path = self.storage.get(request.asset_id)
        if source_path is None:
            raise ValueError("ASSET_NOT_FOUND")
        try:
            with Image.open(source_path) as source:
                source.load()
                layer_images: list[tuple[object, Image.Image]] = []
                for layer in request.layers:
                    layer_path = self.storage.get(layer.asset_id)
                    if layer_path is None:
                        raise ValueError("LAYER_ASSET_NOT_FOUND")
                    with Image.open(layer_path) as layer_image:
                        layer_image.load()
                        layer_images.append((layer, layer_image.copy()))
                result = self.processor.apply(source.copy(), layer_images)
        except (OSError, ValueError, KeyError) as error:
            raise UploadValidationError("LAYERS_PROCESSING_FAILED", "تعذر تنفيذ طبقات الصور.") from error
        output = BytesIO()
        result.save(output, format="PNG")
        data = output.getvalue()
        asset_id, _ = self.storage.save(data, ".png", preview=request.preview)
        metadata = inspect_image(data, f"layers-{asset_id}.png", "image/png", self.settings)
        return AssetResponse(
            asset_id=asset_id,
            filename=f"{source_path.stem}-layers.png",
            content_url=f"{self.settings.api_prefix}/assets/{asset_id}/content",
            metadata=metadata
        )
