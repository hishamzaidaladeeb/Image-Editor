from io import BytesIO

from PIL import Image

from app.core.config import Settings
from app.processors.transform_processor import TransformProcessor
from app.schemas.assets import AssetResponse
from app.schemas.transform import TransformRequest
from app.storage.temporary import SafeTemporaryStorage


class TransformService:
    def __init__(self, settings: Settings, storage: SafeTemporaryStorage) -> None:
        self.settings = settings
        self.storage = storage
        self.processor = TransformProcessor()

    def apply(self, request: TransformRequest) -> AssetResponse:
        source_path = self.storage.get(request.asset_id)
        if source_path is None:
            raise ValueError("ASSET_NOT_FOUND")
        if request.previous_preview_asset_id:
            self.storage.delete_preview(request.previous_preview_asset_id)
        with Image.open(source_path) as source:
            source.load()
            result = self.processor.apply(source, request)
            result_format = "PNG" if result.mode in {"RGBA", "LA", "P"} else "JPEG"
            output = BytesIO()
            save_image = result.convert("RGB") if result_format == "JPEG" and result.mode not in {"RGB", "L"} else result
            save_image.save(output, format=result_format)
            data = output.getvalue()
            asset_id, _ = self.storage.save(data, ".png" if result_format == "PNG" else ".jpg", preview=request.preview)
            return AssetResponse(
                asset_id=asset_id,
                filename=f"{source_path.stem}-{request.operation.lower()}.{'png' if result_format == 'PNG' else 'jpg'}",
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
