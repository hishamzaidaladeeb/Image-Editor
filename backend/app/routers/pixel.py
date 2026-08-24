from fastapi import APIRouter, Request

from app.errors.exceptions import UploadValidationError
from app.schemas.assets import AssetResponse
from app.schemas.pixel import PixelRequest
from app.services.pixel_service import PixelService


router = APIRouter(prefix="/operations/pixel", tags=["pixel"])


@router.post("", response_model=AssetResponse, status_code=201)
def pixel_operation(request: Request, payload: PixelRequest) -> AssetResponse:
    service = PixelService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.apply(payload)
    except ValueError as error:
        code = str(error)
        messages = {
            "ASSET_NOT_FOUND": "الصورة المطلوبة غير متاحة.",
            "ADAPTIVE_BLOCK_SIZE_INVALID": "حجم نافذة Adaptive Threshold يجب أن يكون رقماً فردياً.",
            "ADAPTIVE_MODE_REQUIRES_THRESHOLD": "وضع Adaptive متاح ضمن عملية Threshold فقط.",
            "UNSUPPORTED_OPERATION": "عملية تحسين البكسل غير مدعومة."
        }
        raise UploadValidationError(code, messages.get(code, "تعذر تنفيذ عملية البكسل.")) from error
