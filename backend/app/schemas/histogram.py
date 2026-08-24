from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.assets import AssetResponse


class HistogramRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str
    operation: Literal["original", "equalize", "clahe"] = "original"
    clahe_clip_limit: float = Field(default=2.0, ge=0.1, le=40.0)
    clahe_tile_grid_size: int = Field(default=8, ge=2, le=32)
    preview: bool = False
    previous_preview_asset_id: str | None = None


class HistogramChannels(BaseModel):
    grayscale: list[int]
    red: list[int]
    green: list[int]
    blue: list[int]
    alpha: list[int] | None = None


class HistogramResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    operation: Literal["original", "equalize", "clahe"]
    before: HistogramChannels
    after: HistogramChannels
    processed_asset: AssetResponse | None = None
