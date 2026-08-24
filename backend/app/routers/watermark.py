from fastapi import APIRouter, Request

from app.errors.exceptions import UploadValidationError
from app.schemas.assets import AssetResponse
from app.schemas.watermark import WatermarkRequest
from app.services.watermark_service import WatermarkService


router = APIRouter(prefix="/advanced", tags=["advanced"])


@router.post("/watermark", response_model=AssetResponse, status_code=201)
def watermark(payload: WatermarkRequest, request: Request) -> AssetResponse:
    service = WatermarkService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.apply(payload)
    except ValueError as error:
        code = str(error)
        messages = {
            "ASSET_NOT_FOUND": "الصورة المطلوبة غير متاحة.",
            "FONT_UNAVAILABLE": "الخط المحدد غير متاح.",
            "WATERMARK_PROCESSING_FAILED": "تعذر تنفيذ العلامة المائية النصية."
        }
        raise UploadValidationError(code, messages.get(code, "تعذر تنفيذ العلامة المائية النصية.")) from error
