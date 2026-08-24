from io import BytesIO

from PIL import Image

from app.core.config import Settings
from app.errors.exceptions import UploadValidationError
from app.processors.text_processor import TextProcessor
from app.schemas.assets import AssetResponse
from app.schemas.text import TextRequest
from app.storage.temporary import SafeTemporaryStorage


class TextService:
    def __init__(self, settings: Settings, storage: SafeTemporaryStorage) -> None:
        self.settings = settings
        self.storage = storage
        self.processor = TextProcessor()

    def apply(self, request: TextRequest) -> AssetResponse:
        if request.previous_preview_asset_id:
            self.storage.delete_preview(request.previous_preview_asset_id)
        source_path = self.storage.get(request.asset_id)
        if source_path is None:
            raise ValueError("ASSET_NOT_FOUND")
        try:
            with Image.open(source_path) as source:
                source.load()
                process_image = source.copy()
                process_request = request
                if request.preview:
                    process_image, process_request = self.preview_input(source, request)
                result = self.processor.apply(process_image, process_request)
                if request.preview and result.size != source.size:
                    result = result.resize(source.size, Image.Resampling.BILINEAR)
        except (OSError, ValueError, KeyError) as error:
            raise UploadValidationError("TEXT_PROCESSING_FAILED", "تعذر تنفيذ أداة النص المتقدم.") from error
        output = BytesIO()
        result.save(output, format="PNG")
        data = output.getvalue()
        asset_id, _ = self.storage.save(data, ".png", preview=request.preview)
        return AssetResponse(
            asset_id=asset_id,
            filename=f"{source_path.stem}-text.png",
            content_url=f"{self.settings.api_prefix}/assets/{asset_id}/content",
            metadata={
                "width": result.width,
                "height": result.height,
                "format": "PNG",
                "file_size": len(data),
                "channels": len(result.getbands()),
                "color_mode": result.mode,
                "color_space": None,
                "has_transparency": "A" in result.getbands()
            }
        )

    def preview_input(self, source: Image.Image, request: TextRequest) -> tuple[Image.Image, TextRequest]:
        max_dimension = 1280
        scale = min(1.0, max_dimension / max(source.width, source.height))
        if scale == 1.0:
            return source.copy(), request
        width = max(1, round(source.width * scale))
        height = max(1, round(source.height * scale))
        resized = source.resize((width, height), Image.Resampling.LANCZOS)
        scaled_request = request.model_copy(update={
            "x": round(request.x * scale),
            "y": round(request.y * scale),
            "width": round(request.width * scale) if request.width else None,
            "height": round(request.height * scale) if request.height else None,
            "font_size": max(8, round(request.font_size * scale))
        })
        return resized, scaled_request
