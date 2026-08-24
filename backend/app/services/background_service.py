from io import BytesIO

from PIL import Image

from app.core.config import Settings
from app.processors.background_processor import BackgroundRemovalProcessor
from app.schemas.assets import AssetResponse
from app.schemas.background import BackgroundRemovalRequest, BackgroundRemovalResponse
from app.storage.temporary import SafeTemporaryStorage


class BackgroundRemovalService:
    def __init__(self, settings: Settings, storage: SafeTemporaryStorage) -> None:
        self.settings = settings
        self.storage = storage
        self.processor = BackgroundRemovalProcessor()

    def apply(self, request: BackgroundRemovalRequest) -> BackgroundRemovalResponse:
        if request.previous_preview_asset_id:
            self.storage.delete_preview(request.previous_preview_asset_id)
        source_path = self.storage.get(request.asset_id)
        if source_path is None:
            raise ValueError("ASSET_NOT_FOUND")
        background_path = self.storage.get(request.background_asset_id) if request.background_asset_id else None
        if request.background_mode == "image" and background_path is None:
            raise ValueError("BACKGROUND_ASSET_NOT_FOUND")
        with Image.open(source_path) as source:
            source.load()
            if background_path:
                with Image.open(background_path) as background_image:
                    background_image.load()
                    processed = self.processor.apply(source, request, background_image)
            else:
                processed = self.processor.apply(source, request)
        asset = self.save_result(source_path.stem, processed.image, request)
        return BackgroundRemovalResponse(asset_id=request.asset_id, background_mode=request.background_mode, foreground_coverage=processed.foreground_coverage, processed_asset=asset)

    def save_result(self, source_stem: str, result: Image.Image, request: BackgroundRemovalRequest) -> AssetResponse:
        output = BytesIO()
        result.save(output, format="PNG", optimize=True)
        data = output.getvalue()
        asset_id, _ = self.storage.save(data, ".png", preview=request.preview)
        return AssetResponse(asset_id=asset_id, filename=f"{source_stem}-background-removed.png", content_url=f"{self.settings.api_prefix}/assets/{asset_id}/content", metadata={"width": result.width, "height": result.height, "format": "PNG", "file_size": len(data), "channels": len(result.getbands()), "color_mode": result.mode, "color_space": None, "has_transparency": result.getchannel("A").getextrema()[0] < 255})
