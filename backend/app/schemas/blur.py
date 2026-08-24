from pydantic import BaseModel, Field, model_validator


class BlurAreaRequest(BaseModel):
    asset_id: str
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    kernel_size: int = Field(default=11, ge=3, le=101)
    sigma: float = Field(default=3.0, gt=0, le=50)
    preview: bool = False
    previous_preview_asset_id: str | None = None

    @model_validator(mode="after")
    def validate_kernel(self) -> "BlurAreaRequest":
        if self.kernel_size % 2 == 0:
            raise ValueError("KERNEL_SIZE_MUST_BE_ODD")
        return self
