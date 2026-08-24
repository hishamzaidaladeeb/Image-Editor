from io import BytesIO

from PIL import Image

from app.core.config import Settings
from app.processors.histogram_processor import HistogramProcessor
from app.schemas.assets import AssetResponse
from app.schemas.histogram import HistogramChannels, HistogramRequest, HistogramResponse
from app.storage.temporary import SafeTemporaryStorage


class HistogramService:
    def __init__(self, settings: Settings, storage: SafeTemporaryStorage) -> None:
        self.settings = settings
        self.storage = storage
        self.processor = HistogramProcessor()

    def analyze(self, request: HistogramRequest) -> HistogramResponse:
        if request.previous_preview_asset_id:
            self.storage.delete_preview(request.previous_preview_asset_id)
        source_path = self.storage.get(request.asset_id)
        if source_path is None:
            raise ValueError("ASSET_NOT_FOUND")
        with Image.open(source_path) as source:
            source.load()
            before = self.to_channels(self.processor.calculate(source))
            result = self.processor.process(source, request.operation, request.clahe_clip_limit, request.clahe_tile_grid_size)
            after = self.to_channels(self.processor.calculate(result))
            processed_asset = None
            if request.operation != "original":
                processed_asset = self.save_result(source_path.stem, result, request)
            return HistogramResponse(asset_id=request.asset_id, operation=request.operation, before=before, after=after, processed_asset=processed_asset)

    def to_channels(self, data: dict[str, object]) -> HistogramChannels:
        return HistogramChannels(**data)

    def save_result(self, source_stem: str, result: Image.Image, request: HistogramRequest) -> AssetResponse:
        result_format = "PNG" if "A" in result.getbands() or result.mode in {"L", "LA", "P"} else "JPEG"
        output = BytesIO()
        save_image = result.convert("RGB") if result_format == "JPEG" and result.mode != "RGB" else result
        save_image.save(output, format=result_format)
        data = output.getvalue()
        extension = ".png" if result_format == "PNG" else ".jpg"
        asset_id, _ = self.storage.save(data, extension, preview=request.preview)
        return AssetResponse(asset_id=asset_id, filename=f"{source_stem}-histogram-{request.operation}{extension}", content_url=f"{self.settings.api_prefix}/assets/{asset_id}/content", metadata={"width": result.width, "height": result.height, "format": result_format, "file_size": len(data), "channels": len(result.getbands()), "color_mode": result.mode, "color_space": None, "has_transparency": "A" in result.getbands()})
