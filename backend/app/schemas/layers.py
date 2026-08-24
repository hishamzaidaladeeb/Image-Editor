from pydantic import BaseModel, ConfigDict, Field, field_validator


class ImageLayer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(min_length=1)
    name: str = Field(default="Layer", min_length=1, max_length=120)
    visible: bool = True
    opacity: int = Field(default=100, ge=0, le=100)
    x: int = Field(default=0, ge=-20000, le=20000)
    y: int = Field(default=0, ge=-20000, le=20000)
    scale: float = Field(default=1.0, gt=0, le=20)
    rotation: float = Field(default=0, ge=-180, le=180)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("LAYER_NAME_REQUIRED")
        return normalized


class LayersRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    asset_id: str = Field(min_length=1)
    layers: list[ImageLayer] = Field(min_length=1, max_length=10)
    preview: bool = False
    previous_preview_asset_id: str | None = None

    @field_validator("layers")
    @classmethod
    def validate_unique_assets(cls, value: list[ImageLayer]) -> list[ImageLayer]:
        if len(value) > 10:
            raise ValueError("MAX_LAYERS_EXCEEDED")
        return value
