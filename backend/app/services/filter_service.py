from io import BytesIO

from PIL import Image

from app.core.config import Settings
from app.errors.exceptions import UploadValidationError
from app.processors.filter_processor import FilterProcessor
from app.schemas.assets import AssetResponse
from app.schemas.filter import FilterRequest
from app.storage.temporary import SafeTemporaryStorage


class FilterService:
    def __init__(self, settings: Settings, storage: SafeTemporaryStorage) -> None:
        self.settings = settings
        self.storage = storage
        self.processor = FilterProcessor()

    def apply(self, request: FilterRequest) -> AssetResponse:
        if request.previous_preview_asset_id:
            self.storage.delete_preview(request.previous_preview_asset_id)
        source_path = self.storage.get(request.asset_id)
        if source_path is None:
            raise ValueError("ASSET_NOT_FOUND")
        try:
            with Image.open(source_path) as source:
                source.load()
                result = self.processor.apply(source, request)
        except (OSError, ValueError) as error:
            raise UploadValidationError("FILTER_PROCESSING_FAILED", "تعذر تنفيذ الفلتر على الصورة.") from error
        result_format = "PNG" if "A" in result.getbands() or result.mode == "L" else "JPEG"
        output = BytesIO()
        save_image = result.convert("RGB") if result_format == "JPEG" and result.mode != "RGB" else result
        save_image.save(output, format=result_format)
        data = output.getvalue()
        extension = ".png" if result_format == "PNG" else ".jpg"
        asset_id, _ = self.storage.save(data, extension, preview=request.preview)
        return AssetResponse(
            asset_id=asset_id,
            filename=f"{source_path.stem}-filter-{request.operation}{extension}",
            content_url=f"{self.settings.api_prefix}/assets/{asset_id}/content",
            metadata={
                "width": result.width,
                "height": result.height,
                "format": result_format,
                "file_size": len(data),
                "channels": len(result.getbands()),
                "color_mode": result.mode,
                "color_space": None,
                "has_transparency": "A" in result.getbands()
            }
        )
