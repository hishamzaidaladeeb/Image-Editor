from io import BytesIO
from pathlib import PurePath
from PIL import Image, UnidentifiedImageError
from fastapi import UploadFile
from app.core.config import Settings


SUPPORTED_FORMATS = {"PNG", "JPEG", "WEBP", "BMP", "TIFF"}
SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
MIME_BY_FORMAT = {
    "PNG": {"image/png"},
    "JPEG": {"image/jpeg", "image/jpg"},
    "WEBP": {"image/webp"},
    "BMP": {"image/bmp", "image/x-ms-bmp"},
    "TIFF": {"image/tiff"}
}


def validate_filename(filename: str | None) -> str:
    if not filename or "\x00" in filename or PurePath(filename).name != filename:
        raise ValueError("SUSPICIOUS_FILENAME")
    extension = PurePath(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError("UNSUPPORTED_EXTENSION")
    return extension


def inspect_image(data: bytes, filename: str | None, content_type: str | None, settings: Settings) -> dict:
    if not data:
        raise ValueError("EMPTY_FILE")
    if len(data) > settings.max_upload_bytes:
        raise ValueError("FILE_TOO_LARGE")
    validate_filename(filename)
    try:
        with Image.open(BytesIO(data)) as image:
            image.verify()
        with Image.open(BytesIO(data)) as image:
            image.load()
            image_format = (image.format or "").upper()
            if image_format not in SUPPORTED_FORMATS:
                raise ValueError("UNSUPPORTED_FORMAT")
            if content_type and content_type not in MIME_BY_FORMAT[image_format]:
                raise ValueError("MIME_MISMATCH")
            width, height = image.size
            if width < 1 or height < 1 or width > settings.max_image_dimension or height > settings.max_image_dimension:
                raise ValueError("DIMENSIONS_INVALID")
            if width * height > settings.max_image_pixels:
                raise ValueError("PIXEL_LIMIT_EXCEEDED")
            channels = len(image.getbands())
            return {
                "width": width,
                "height": height,
                "format": image_format,
                "file_size": len(data),
                "channels": channels,
                "color_mode": image.mode,
                "color_space": image.info.get("icc_profile") and "ICC" or None,
                "has_transparency": "transparency" in image.info or "A" in image.getbands()
            }
    except (UnidentifiedImageError, OSError, SyntaxError) as error:
        raise ValueError("INVALID_IMAGE_CONTENT") from error
