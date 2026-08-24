from typing import Literal

from pydantic import BaseModel, Field, field_validator


FilterOperation = Literal[
    "average_blur",
    "gaussian_blur",
    "median_blur",
    "bilateral",
    "laplacian",
    "unsharp_mask",
    "sharpen_kernel",
    "sobel",
    "scharr",
    "canny",
    "erosion",
    "dilation",
    "opening",
    "closing",
    "morphological_gradient",
]


class FilterRequest(BaseModel):
    asset_id: str
    operation: FilterOperation
    kernel_size: int = Field(default=3, ge=1, le=31)
    sigma: float = Field(default=1.0, gt=0, le=50)
    diameter: int = Field(default=5, ge=1, le=31)
    sigma_color: float = Field(default=75.0, gt=0, le=500)
    sigma_space: float = Field(default=75.0, gt=0, le=500)
    amount: float = Field(default=1.0, ge=0, le=5)
    threshold: float = Field(default=0.0, ge=0, le=255)
    axis: Literal["x", "y", "both"] = "both"
    low_threshold: int = Field(default=50, ge=0, le=255)
    high_threshold: int = Field(default=150, ge=0, le=255)
    aperture_size: int = Field(default=3, ge=3, le=7)
    l2_gradient: bool = False
    shape: Literal["rect", "ellipse", "cross"] = "rect"
    iterations: int = Field(default=1, ge=1, le=10)
    preview: bool = False
    previous_preview_asset_id: str | None = None

    @field_validator("kernel_size", "aperture_size")
    @classmethod
    def validate_odd_size(cls, value: int) -> int:
        if value % 2 == 0:
            raise ValueError("KERNEL_SIZE_MUST_BE_ODD")
        return value

    @field_validator("high_threshold")
    @classmethod
    def validate_canny_thresholds(cls, value: int, info) -> int:
        low_threshold = info.data.get("low_threshold", 50)
        if value <= low_threshold:
            raise ValueError("CANNY_HIGH_THRESHOLD_INVALID")
        return value
