from io import BytesIO

from PIL import Image

from app.schemas.export import ExportRequest


class ExportProcessor:
    def process(self, source: Image.Image, request: ExportRequest) -> tuple[bytes, dict]:
        image = source.copy()
        if request.width is not None and request.height is not None and image.size != (request.width, request.height):
            image = image.resize((request.width, request.height), Image.Resampling.LANCZOS)
        target_format = "JPEG" if request.format in {"jpg", "jpeg"} else request.format.upper()
        has_alpha = "A" in image.getbands() or image.mode in {"LA", "P"} and "transparency" in image.info
        preserve_alpha = request.preserve_transparency and has_alpha and target_format in {"PNG", "WEBP"}
        if target_format == "JPEG":
            output_image = image.convert("RGB")
        elif target_format in {"PNG", "WEBP"}:
            if preserve_alpha:
                output_image = image.convert("RGBA")
            elif image.mode in {"L", "I", "F"}:
                output_image = image.convert("L")
            else:
                output_image = image.convert("RGB")
        else:
            raise ValueError("UNSUPPORTED_EXPORT_FORMAT")
        output = BytesIO()
        save_kwargs = {"format": target_format}
        if target_format in {"JPEG", "WEBP"}:
            save_kwargs["quality"] = request.quality
        if target_format == "PNG":
            save_kwargs["compress_level"] = round((100 - request.quality) * 9 / 99)
        output_image.save(output, **save_kwargs)
        data = output.getvalue()
        with Image.open(BytesIO(data)) as verified:
            verified.load()
            actual_format = (verified.format or "").upper()
            expected_format = "JPEG" if request.format in {"jpg", "jpeg"} else request.format.upper()
            if actual_format != expected_format or verified.size != image.size:
                raise ValueError("EXPORT_SIGNATURE_MISMATCH")
            metadata = {
                "format": actual_format,
                "width": verified.width,
                "height": verified.height,
                "file_size": len(data),
                "channels": len(verified.getbands()),
                "color_mode": verified.mode,
                "has_transparency": "A" in verified.getbands() or "transparency" in verified.info
            }
        return data, metadata
