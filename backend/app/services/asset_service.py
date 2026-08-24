from fastapi import UploadFile
from app.core.config import Settings
from app.schemas.assets import AssetResponse
from app.storage.temporary import SafeTemporaryStorage
from app.validators.images import inspect_image, validate_filename


class AssetService:
    def __init__(self, settings: Settings, storage: SafeTemporaryStorage) -> None:
        self.settings = settings
        self.storage = storage

    async def upload(self, upload: UploadFile) -> AssetResponse:
        data = await upload.read(self.settings.max_upload_bytes + 1)
        metadata = inspect_image(data, upload.filename, upload.content_type, self.settings)
        extension = validate_filename(upload.filename)
        asset_id, _ = self.storage.save(data, extension)
        return AssetResponse(
            asset_id=asset_id,
            filename=upload.filename or "asset",
            content_url=f"{self.settings.api_prefix}/assets/{asset_id}/content",
            metadata=metadata
        )
