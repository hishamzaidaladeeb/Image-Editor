import re
from pathlib import PurePath
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


ExportFormat = Literal["png", "jpg", "jpeg", "webp"]


class ExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(min_length=1, max_length=100)
    format: ExportFormat = "png"
    quality: int = Field(default=95, ge=1, le=100)
    width: int | None = Field(default=None, ge=1, le=12000)
    height: int | None = Field(default=None, ge=1, le=12000)
    filename: str = Field(default="export", min_length=1, max_length=120)
    preserve_transparency: bool = True
    preview: bool = False
    previous_preview_export_id: str | None = Field(default=None, min_length=1, max_length=100)

    @model_validator(mode="after")
    def validate_resolution_pair(self) -> "ExportRequest":
        if (self.width is None) != (self.height is None):
            raise ValueError("RESOLUTION_PAIR_REQUIRED")
        if "\x00" in self.filename or "/" in self.filename or "\\" in self.filename:
            raise ValueError("INVALID_FILENAME")
        if PurePath(self.filename).name != self.filename or self.filename in {".", ".."} or re.fullmatch(r"[A-Za-z0-9_-]+", self.filename) is None:
            raise ValueError("INVALID_FILENAME")
        return self


class ExportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    export_id: str
    source_asset_id: str
    filename: str
    format: str
    quality: int
    width: int
    height: int
    file_size: int
    channels: int
    color_mode: str
    has_transparency: bool
    preview: bool
    preview_url: str
    download_url: str
