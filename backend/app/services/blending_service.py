from io import BytesIO

from PIL import Image

from app.core.config import Settings
from app.processors.blending_processor import BlendingProcessor
from app.schemas.assets import AssetResponse
from app.schemas.blending import BlendingRequest, BlendingResponse
from app.storage.temporary import SafeTemporaryStorage


class BlendingService:
    def __init__(self, settings: Settings, storage: SafeTemporaryStorage) -> None:
        self.settings = settings
        self.storage = storage
        self.processor = BlendingProcessor()

    def apply(self, request: BlendingRequest) -> BlendingResponse:
        if request.previous_preview_asset_id:
            self.storage.delete_preview(request.previous_preview_asset_id)
        first_path = self.storage.get(request.asset_id)
        second_path = self.storage.get(request.second_asset_id)
        if first_path is None:
            raise ValueError("ASSET_NOT_FOUND")
        if second_path is None:
            raise ValueError("SECOND_ASSET_NOT_FOUND")
        with Image.open(first_path) as first, Image.open(second_path) as second:
            first.load()
            second.load()
            result = self.processor.apply(first, second, request)
        asset = self.save_result(first_path.stem, request.operation, result, request)
        return BlendingResponse(asset_id=request.asset_id, second_asset_id=request.second_asset_id, operation=request.operation, processed_asset=asset)

    def save_result(self, source_stem: str, operation: str, result: Image.Image, request: BlendingRequest) -> AssetResponse:
        output = BytesIO()
        result.save(output, format="PNG", optimize=True)
        data = output.getvalue()
        asset_id, _ = self.storage.save(data, ".png", preview=request.preview)
        return AssetResponse(asset_id=asset_id, filename=f"{source_stem}-blend-{operation}.png", content_url=f"{self.settings.api_prefix}/assets/{asset_id}/content", metadata={"width": result.width, "height": result.height, "format": "PNG", "file_size": len(data), "channels": len(result.getbands()), "color_mode": result.mode, "color_space": None, "has_transparency": result.getchannel("A").getextrema()[0] < 255})
