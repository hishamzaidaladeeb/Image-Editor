from PIL import Image

from app.core.config import Settings
from app.errors.exceptions import UploadValidationError
from app.processors.export_processor import ExportProcessor
from app.schemas.export import ExportRequest, ExportResponse
from app.storage.temporary import SafeTemporaryStorage


class ExportService:
    def __init__(self, settings: Settings, storage: SafeTemporaryStorage) -> None:
        self.settings = settings
        self.storage = storage
        self.processor = ExportProcessor()

    def export(self, request: ExportRequest) -> ExportResponse:
        if request.previous_preview_export_id:
            self.storage.delete_export_preview(request.previous_preview_export_id)
        source_path = self.storage.get(request.asset_id)
        if source_path is None or self.storage.is_asset_preview(request.asset_id):
            raise UploadValidationError("ASSET_NOT_FOUND", "الصورة المعتمدة غير موجودة.")
        try:
            with Image.open(source_path) as source:
                source.load()
                target_width = request.width or source.width
                target_height = request.height or source.height
                if target_width > self.settings.max_image_dimension or target_height > self.settings.max_image_dimension:
                    raise ValueError("DIMENSIONS_INVALID")
                if target_width * target_height > self.settings.max_image_pixels:
                    raise ValueError("PIXEL_LIMIT_EXCEEDED")
                data, metadata = self.processor.process(source, request)
        except (OSError, ValueError) as error:
            code = str(error)
            messages = {
                "DIMENSIONS_INVALID": "أبعاد التصدير غير مسموحة.",
                "PIXEL_LIMIT_EXCEEDED": "عدد بكسلات التصدير يتجاوز الحد المسموح.",
                "EXPORT_SIGNATURE_MISMATCH": "تعذر التحقق من صيغة ملف التصدير.",
                "UNSUPPORTED_EXPORT_FORMAT": "صيغة التصدير غير مدعومة.",
            }
            raise UploadValidationError(code, messages.get(code, "تعذر تصدير الصورة.")) from error
        extension = ".jpg" if request.format in {"jpg", "jpeg"} else f".{request.format}"
        filename = f"{request.filename}{extension}"
        media_type = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}[request.format]
        export_id, _ = self.storage.save_export(data, extension, filename, media_type, preview=request.preview)
        base = self.settings.api_prefix
        return ExportResponse(
            export_id=export_id,
            source_asset_id=request.asset_id,
            filename=filename,
            format=metadata["format"],
            quality=request.quality,
            width=metadata["width"],
            height=metadata["height"],
            file_size=metadata["file_size"],
            channels=metadata["channels"],
            color_mode=metadata["color_mode"],
            has_transparency=metadata["has_transparency"],
            preview=request.preview,
            preview_url=f"{base}/export/{export_id}/content",
            download_url=f"{base}/export/{export_id}/download"
        )
