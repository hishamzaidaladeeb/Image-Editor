from typing import Literal
from pydantic import BaseModel, Field


class TransformRequest(BaseModel):
    asset_id: str
    operation: Literal["crop", "resize", "rotate", "flip", "translate", "scale", "perspective"]
    x: int = 0
    y: int = 0
    width: int | None = Field(default=None, gt=0)
    height: int | None = Field(default=None, gt=0)
    percentage: float | None = Field(default=None, gt=0, le=800)
    angle: float = 0
    flip_axis: Literal["horizontal", "vertical"] | None = None
    scale_x: float = Field(default=1, gt=0, le=8)
    scale_y: float = Field(default=1, gt=0, le=8)
    lock_aspect: bool = True
    interpolation: Literal["nearest", "linear", "cubic", "lanczos"] = "lanczos"
    points: list[tuple[float, float]] | None = None
    preview: bool = False
    previous_preview_asset_id: str | None = None
