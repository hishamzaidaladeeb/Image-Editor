from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


WatermarkFont = Literal["dejavu_sans", "dejavu_sans_bold", "liberation_sans", "liberation_sans_bold"]
WatermarkAlign = Literal["left", "center", "right"]
WatermarkVerticalAlign = Literal["top", "middle", "bottom"]


class WatermarkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(min_length=1)
    text: str = Field(min_length=1, max_length=256)
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    font_family: WatermarkFont = "dejavu_sans"
    font_size: int = Field(default=32, ge=8, le=512)
    color: str = Field(default="#ffffff")
    opacity: int = Field(default=60, ge=0, le=100)
    rotation: float = Field(default=0, ge=-180, le=180)
    horizontal_alignment: WatermarkAlign = "left"
    vertical_alignment: WatermarkVerticalAlign = "top"
    preview: bool = False
    previous_preview_asset_id: str | None = None

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("TEXT_REQUIRED")
        return value

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) not in {7, 9} or not normalized.startswith("#"):
            raise ValueError("INVALID_COLOR")
        try:
            int(normalized[1:], 16)
        except ValueError as error:
            raise ValueError("INVALID_COLOR") from error
        return normalized.lower()
