from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.assets import AssetResponse


class BlendingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str
    second_asset_id: str
    operation: Literal["alpha", "side_by_side", "overlay", "blend", "difference"] = "alpha"
    opacity: float = Field(default=0.5, ge=0.0, le=1.0)
    weight_a: float = Field(default=0.5, ge=0.0, le=1.0)
    weight_b: float = Field(default=0.5, ge=0.0, le=1.0)
    preview: bool = False
    previous_preview_asset_id: str | None = None

    @model_validator(mode="after")
    def validate_distinct_assets(self) -> "BlendingRequest":
        if self.asset_id == self.second_asset_id:
            raise ValueError("asset_id and second_asset_id must be different")
        if self.operation == "blend" and self.weight_a + self.weight_b <= 0:
            raise ValueError("blend weights must have a positive sum")
        return self


class BlendingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    second_asset_id: str
    operation: Literal["alpha", "side_by_side", "overlay", "blend", "difference"]
    processed_asset: AssetResponse
