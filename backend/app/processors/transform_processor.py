from PIL import Image, ImageOps
from app.schemas.transform import TransformRequest


class TransformProcessor:
    def apply(self, image: Image.Image, request: TransformRequest) -> Image.Image:
        operation = request.operation
        if operation == "crop":
            return self.crop(image, request)
        if operation == "resize":
            return self.resize(image, request)
        if operation == "rotate":
            return image.rotate(request.angle, expand=True, resample=Image.Resampling.BICUBIC)
        if operation == "flip":
            if request.flip_axis == "horizontal":
                return ImageOps.mirror(image)
            if request.flip_axis == "vertical":
                return ImageOps.flip(image)
            raise ValueError("FLIP_AXIS_REQUIRED")
        if operation == "translate":
            result = Image.new(image.mode, image.size)
            result.paste(image, (request.x, request.y))
            return result
        if operation == "scale":
            return image.resize((max(1, round(image.width * request.scale_x)), max(1, round(image.height * request.scale_y))), self.resampling(request.interpolation))
        if operation == "perspective":
            if not request.points or len(request.points) != 4:
                raise ValueError("PERSPECTIVE_POINTS_REQUIRED")
            return image.transform(image.size, Image.Transform.QUAD, tuple(value for point in request.points for value in point), self.resampling(request.interpolation, geometric=True))
        raise ValueError("UNSUPPORTED_OPERATION")

    def crop(self, image: Image.Image, request: TransformRequest) -> Image.Image:
        if request.width is None or request.height is None:
            raise ValueError("CROP_DIMENSIONS_REQUIRED")
        left = max(0, request.x)
        top = max(0, request.y)
        right = min(image.width, left + request.width)
        bottom = min(image.height, top + request.height)
        if right <= left or bottom <= top:
            raise ValueError("CROP_REGION_INVALID")
        return image.crop((left, top, right, bottom))

    def resize(self, image: Image.Image, request: TransformRequest) -> Image.Image:
        if request.percentage is not None:
            factor = request.percentage / 100
            width = max(1, round(image.width * factor))
            height = max(1, round(image.height * factor))
        elif request.width is not None and request.height is not None:
            width, height = request.width, request.height
            if request.lock_aspect:
                factor = min(width / image.width, height / image.height)
                width, height = max(1, round(image.width * factor)), max(1, round(image.height * factor))
        else:
            raise ValueError("RESIZE_DIMENSIONS_REQUIRED")
        return image.resize((width, height), self.resampling(request.interpolation))

    def resampling(self, interpolation: str, geometric: bool = False) -> Image.Resampling:
        if geometric and interpolation == "lanczos":
            return Image.Resampling.BICUBIC
        return {"nearest": Image.Resampling.NEAREST, "linear": Image.Resampling.BILINEAR, "cubic": Image.Resampling.BICUBIC, "lanczos": Image.Resampling.LANCZOS}[interpolation]
