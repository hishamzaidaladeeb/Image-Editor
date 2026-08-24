from __future__ import annotations

import cv2
import numpy as np
from PIL import Image

from app.schemas.filter import FilterRequest


class FilterProcessor:
    def apply(self, image: Image.Image, request: FilterRequest) -> Image.Image:
        source, alpha = self.to_cv(image)
        operation = request.operation
        if operation == "average_blur":
            result = cv2.blur(source, (request.kernel_size, request.kernel_size))
        elif operation == "gaussian_blur":
            result = cv2.GaussianBlur(source, (request.kernel_size, request.kernel_size), request.sigma)
        elif operation == "median_blur":
            result = cv2.medianBlur(source, request.kernel_size)
        elif operation == "bilateral":
            result = cv2.bilateralFilter(source, request.diameter, request.sigma_color, request.sigma_space)
        elif operation == "laplacian":
            gray = self.to_gray(source)
            result = cv2.convertScaleAbs(cv2.Laplacian(gray, cv2.CV_64F, ksize=request.kernel_size))
        elif operation == "unsharp_mask":
            blurred = cv2.GaussianBlur(source, (request.kernel_size, request.kernel_size), request.sigma)
            result = cv2.addWeighted(source, 1 + request.amount, blurred, -request.amount, 0)
        elif operation == "sharpen_kernel":
            kernel = np.array([[0, -request.amount, 0], [-request.amount, 1 + 4 * request.amount, -request.amount], [0, -request.amount, 0]], dtype=np.float32)
            result = cv2.filter2D(source, -1, kernel)
        elif operation == "sobel":
            result = self.sobel(source, request)
        elif operation == "scharr":
            result = self.scharr(source, request)
        elif operation == "canny":
            gray = self.to_gray(source)
            result = cv2.Canny(gray, request.low_threshold, request.high_threshold, apertureSize=request.aperture_size, L2gradient=request.l2_gradient)
        else:
            result = self.morphology(source, request)
        return self.from_cv(result, alpha)

    def to_cv(self, image: Image.Image) -> tuple[np.ndarray, np.ndarray | None]:
        alpha = np.asarray(image.getchannel("A"), dtype=np.uint8).copy() if "A" in image.getbands() else None
        if image.mode in {"L", "LA"}:
            source = np.asarray(image.getchannel("L"), dtype=np.uint8).copy()
        else:
            rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
            source = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        return source, alpha

    def from_cv(self, image: np.ndarray, alpha: np.ndarray | None) -> Image.Image:
        if image.ndim == 2:
            result = Image.fromarray(image.astype(np.uint8))
        else:
            rgb = cv2.cvtColor(image.astype(np.uint8), cv2.COLOR_BGR2RGB)
            result = Image.fromarray(rgb)
        if alpha is not None and result.size == (alpha.shape[1], alpha.shape[0]):
            result.putalpha(Image.fromarray(alpha))
        return result

    def to_gray(self, image: np.ndarray) -> np.ndarray:
        return image if image.ndim == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    def sobel(self, image: np.ndarray, request: FilterRequest) -> np.ndarray:
        gray = self.to_gray(image)
        depth = cv2.CV_64F
        x = cv2.Sobel(gray, depth, 1, 0, ksize=request.kernel_size)
        y = cv2.Sobel(gray, depth, 0, 1, ksize=request.kernel_size)
        if request.axis == "x":
            return cv2.convertScaleAbs(x)
        if request.axis == "y":
            return cv2.convertScaleAbs(y)
        return cv2.convertScaleAbs(cv2.magnitude(x, y))

    def scharr(self, image: np.ndarray, request: FilterRequest) -> np.ndarray:
        gray = self.to_gray(image)
        x = cv2.Scharr(gray, cv2.CV_64F, 1, 0)
        y = cv2.Scharr(gray, cv2.CV_64F, 0, 1)
        if request.axis == "x":
            return cv2.convertScaleAbs(x)
        if request.axis == "y":
            return cv2.convertScaleAbs(y)
        return cv2.convertScaleAbs(cv2.magnitude(x, y))

    def morphology(self, image: np.ndarray, request: FilterRequest) -> np.ndarray:
        kind = {"rect": cv2.MORPH_RECT, "ellipse": cv2.MORPH_ELLIPSE, "cross": cv2.MORPH_CROSS}[request.shape]
        kernel = cv2.getStructuringElement(kind, (request.kernel_size, request.kernel_size))
        operation = {
            "erosion": cv2.MORPH_ERODE,
            "dilation": cv2.MORPH_DILATE,
            "opening": cv2.MORPH_OPEN,
            "closing": cv2.MORPH_CLOSE,
            "morphological_gradient": cv2.MORPH_GRADIENT,
        }[request.operation]
        return cv2.morphologyEx(image, operation, kernel, iterations=request.iterations)
