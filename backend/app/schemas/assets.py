from pydantic import BaseModel, ConfigDict


class ImageMetadata(BaseModel):
    width: int
    height: int
    format: str
    file_size: int
    channels: int
    color_mode: str
    color_space: str | None = None
    has_transparency: bool


class AssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    filename: str
    content_url: str
    metadata: ImageMetadata
