from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


PixelOperation = Literal["adjust", "invert", "grayscale", "threshold"]
ThresholdMode = Literal["global", "binary", "adaptive"]


class PixelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(min_length=1)
    operation: PixelOperation = "adjust"
    brightness: float = Field(default=0, ge=-255, le=255)
    contrast: float = Field(default=1, ge=0, le=4)
    gamma: float = Field(default=1, gt=0, le=5)
    saturation: float = Field(default=1, ge=0, le=4)
    hue: float = Field(default=0, ge=-180, le=180)
    exposure: float = Field(default=0, ge=-4, le=4)
    sharpness: float = Field(default=0, ge=0, le=4)
    threshold_mode: ThresholdMode = "global"
    threshold: int = Field(default=128, ge=0, le=255)
    max_value: int = Field(default=255, ge=0, le=255)
    block_size: int = Field(default=11, ge=3, le=99)
    adaptive_c: float = Field(default=2, ge=-128, le=128)
    preview: bool = False
    previous_preview_asset_id: str | None = None

    def validate_adaptive_block(self) -> None:
        if self.block_size % 2 == 0:
            raise ValueError("ADAPTIVE_BLOCK_SIZE_INVALID")
        if self.threshold_mode == "adaptive" and self.operation != "threshold":
            raise ValueError("ADAPTIVE_MODE_REQUIRES_THRESHOLD")
