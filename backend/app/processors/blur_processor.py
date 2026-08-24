import cv2
import numpy as np
from PIL import Image

from app.schemas.blur import BlurAreaRequest


class BlurAreaProcessor:
    def apply(self, image: Image.Image, request: BlurAreaRequest) -> Image.Image:
        if request.x + request.width > image.width or request.y + request.height > image.height:
            raise ValueError("BLUR_REGION_INVALID")
        if image.mode in {"L", "LA"}:
            source = np.asarray(image.getchannel("L"), dtype=np.uint8).copy()
            blurred = cv2.GaussianBlur(source, (request.kernel_size, request.kernel_size), request.sigma)
            result = source.copy()
            result[request.y:request.y + request.height, request.x:request.x + request.width] = blurred[request.y:request.y + request.height, request.x:request.x + request.width]
            output = Image.fromarray(result)
            if image.mode == "LA":
                output.putalpha(image.getchannel("A"))
            return output
        source = np.asarray(image.convert("RGB"), dtype=np.uint8).copy()
        blurred = cv2.GaussianBlur(source, (request.kernel_size, request.kernel_size), request.sigma)
        result = source.copy()
        result[request.y:request.y + request.height, request.x:request.x + request.width] = blurred[request.y:request.y + request.height, request.x:request.x + request.width]
        output = Image.fromarray(result)
        if "A" in image.getbands():
            output.putalpha(image.getchannel("A"))
        return output
