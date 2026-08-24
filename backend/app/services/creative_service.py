from io import BytesIO

from PIL import Image

from app.core.config import Settings
from app.errors.exceptions import UploadValidationError
from app.processors.creative_processor import CreativeProcessor
from app.schemas.assets import AssetResponse
from app.schemas.creative import CreativeAssetResponse, CreativeRequest, CreativeSampleRequest, PixelSampleResponse
from app.storage.temporary import SafeTemporaryStorage


class CreativeService:
    def __init__(self, settings: Settings, storage: SafeTemporaryStorage) -> None:
        self.settings = settings
        self.storage = storage
        self.processor = CreativeProcessor()

    def apply(self, request: CreativeRequest) -> CreativeAssetResponse:
        if request.previous_preview_asset_id:
            self.storage.delete_preview(request.previous_preview_asset_id)
        source_path = self.storage.get(request.asset_id)
        if source_path is None:
            raise ValueError("ASSET_NOT_FOUND")
        try:
            with Image.open(source_path) as source:
                source.load()
                result, parameters = self.processor.apply(source, request)
        except (OSError, ValueError) as error:
            raise UploadValidationError("CREATIVE_PROCESSING_FAILED", "تعذر تنفيذ الميزة الإبداعية على الصورة.") from error
        result_format = "PNG" if "A" in result.getbands() or result.mode in {"L", "LA"} else "JPEG"
        output = BytesIO()
        save_image = result.convert("RGB") if result_format == "JPEG" and result.mode != "RGB" else result
        if result_format == "JPEG":
            save_image.save(output, format=result_format, quality=95)
        else:
            save_image.save(output, format=result_format)
        data = output.getvalue()
        extension = ".png" if result_format == "PNG" else ".jpg"
        asset_id, _ = self.storage.save(data, extension, preview=request.preview)
        target_name = request.preset or request.look or request.operation
        return CreativeAssetResponse(
            asset_id=asset_id,
            filename=f"{source_path.stem}-creative-{target_name}{extension}",
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
            },
            applied_parameters=parameters
        )

    def sample(self, request: CreativeSampleRequest) -> PixelSampleResponse:
        source_path = self.storage.get(request.asset_id)
        if source_path is None:
            raise ValueError("ASSET_NOT_FOUND")
        try:
            with Image.open(source_path) as source:
                source.load()
                red, green, blue, alpha, luminance, hex_color, color_mode, channels = self.processor.sample(source, request.x, request.y)
        except (OSError, ValueError) as error:
            code = str(error)
            if code == "SAMPLE_OUT_OF_BOUNDS":
                raise UploadValidationError(code, "الإحداثيات خارج حدود الصورة.") from error
            raise UploadValidationError("SAMPLE_FAILED", "تعذر قراءة قيمة البكسل من الصورة.") from error
        return PixelSampleResponse(
            asset_id=request.asset_id,
            mode=request.mode,
            x=request.x,
            y=request.y,
            red=red,
            green=green,
            blue=blue,
            alpha=alpha,
            luminance=luminance,
            hex_color=hex_color,
            color_mode=color_mode,
            channels=channels
        )
