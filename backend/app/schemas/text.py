from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


TextFont = Literal["dejavu_sans", "dejavu_sans_bold", "liberation_sans", "liberation_sans_bold"]
TextWeight = Literal["regular", "bold"]
TextStyle = Literal["normal", "italic"]
TextAlign = Literal["left", "center", "right"]
TextDirection = Literal["auto", "ltr", "rtl"]


class TextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(min_length=1)
    text: str = Field(min_length=1, max_length=4096)
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int | None = Field(default=None, ge=1, le=20000)
    height: int | None = Field(default=None, ge=1, le=20000)
    font_family: TextFont = "dejavu_sans"
    font_size: int = Field(default=32, ge=8, le=512)
    font_weight: TextWeight = "regular"
    font_style: TextStyle = "normal"
    color: str = Field(default="#ffffff")
    opacity: int = Field(default=100, ge=0, le=100)
    alignment: TextAlign = "left"
    direction: TextDirection = "auto"
    rotation: float = Field(default=0, ge=-180, le=180)
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

    @field_validator("height")
    @classmethod
    def validate_height(cls, value: int | None, info):
        width = info.data.get("width")
        if value is not None and width is None:
            raise ValueError("TEXT_WIDTH_REQUIRED")
        return value
