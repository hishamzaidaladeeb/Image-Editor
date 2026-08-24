import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.assets import AssetResponse


class BackgroundRemovalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str
    background_mode: Literal["transparent", "color", "image"] = "transparent"
    background_color: str = "#ffffff"
    background_asset_id: str | None = None
    foreground_scale: float = Field(default=1.0, ge=0.1, le=3.0)
    position_x: float = Field(default=0.0, ge=-1.0, le=1.0)
    position_y: float = Field(default=0.0, ge=-1.0, le=1.0)
    opacity: float = Field(default=1.0, ge=0.0, le=1.0)
    preview: bool = False
    previous_preview_asset_id: str | None = None

    @field_validator("background_color")
    @classmethod
    def validate_background_color(cls, value: str) -> str:
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            raise ValueError("background_color must be a six-digit hexadecimal color")
        return value.lower()

    @model_validator(mode="after")
    def validate_background_source(self) -> "BackgroundRemovalRequest":
        if self.background_mode == "image" and not self.background_asset_id:
            raise ValueError("background_asset_id is required when background_mode is image")
        if self.background_mode != "image" and self.background_asset_id:
            raise ValueError("background_asset_id is only allowed when background_mode is image")
        return self


class BackgroundRemovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    background_mode: Literal["transparent", "color", "image"]
    foreground_coverage: float = Field(ge=0.0, le=1.0)
    processed_asset: AssetResponse
