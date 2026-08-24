from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


CreativeOperation = Literal["preset", "look", "auto_enhancement", "tonal"]
CreativePreset = Literal["vivid", "soft_portrait", "crisp_detail", "mono_contrast"]
CreativeLook = Literal["vintage", "cinematic", "warm", "cool", "black_white", "dramatic"]
CreativeSampleMode = Literal["color_picker", "eyedropper", "pixel_inspector"]


class CreativeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(min_length=1)
    operation: CreativeOperation
    preset: CreativePreset | None = None
    look: CreativeLook | None = None
    temperature: float = Field(default=0, ge=-100, le=100)
    tint: float = Field(default=0, ge=-100, le=100)
    shadows: float = Field(default=0, ge=-100, le=100)
    highlights: float = Field(default=0, ge=-100, le=100)
    preview: bool = False
    previous_preview_asset_id: str | None = None

    @model_validator(mode="after")
    def validate_target(self) -> "CreativeRequest":
        if self.operation == "preset" and self.preset is None:
            raise ValueError("PRESET_REQUIRED")
        if self.operation == "look" and self.look is None:
            raise ValueError("LOOK_REQUIRED")
        return self


class CreativeSampleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(min_length=1)
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    mode: CreativeSampleMode


class PixelSampleResponse(BaseModel):
    asset_id: str
    mode: CreativeSampleMode
    x: int
    y: int
    red: int = Field(ge=0, le=255)
    green: int = Field(ge=0, le=255)
    blue: int = Field(ge=0, le=255)
    alpha: int = Field(ge=0, le=255)
    luminance: int = Field(ge=0, le=255)
    hex_color: str
    color_mode: str
    channels: int


class CreativeAssetResponse(BaseModel):
    asset_id: str
    filename: str
    content_url: str
    metadata: dict
    applied_parameters: dict[str, float | str]
