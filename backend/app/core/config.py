from functools import lru_cache
from os import getenv
from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = "Image Editor API"
    environment: str = Field(default="development")
    api_prefix: str = "/api/v1"
    allowed_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"])
    max_upload_bytes: int = 25 * 1024 * 1024
    max_image_dimension: int = 12000
    max_image_pixels: int = 40_000_000
    temporary_directory: str = "/tmp/image-editor"

    @classmethod
    def from_environment(cls) -> "Settings":
        origins = getenv("IMAGE_EDITOR_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        return cls(
            app_name=getenv("IMAGE_EDITOR_APP_NAME", "Image Editor API"),
            environment=getenv("IMAGE_EDITOR_ENVIRONMENT", "development"),
            api_prefix=getenv("IMAGE_EDITOR_API_PREFIX", "/api/v1"),
            allowed_origins=[item.strip() for item in origins.split(",") if item.strip()],
            max_upload_bytes=int(getenv("IMAGE_EDITOR_MAX_UPLOAD_BYTES", str(25 * 1024 * 1024))),
            max_image_dimension=int(getenv("IMAGE_EDITOR_MAX_IMAGE_DIMENSION", "12000")),
            max_image_pixels=int(getenv("IMAGE_EDITOR_MAX_IMAGE_PIXELS", "40000000")),
            temporary_directory=getenv("IMAGE_EDITOR_TEMPORARY_DIRECTORY", "/tmp/image-editor")
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_environment()
