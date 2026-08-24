from fastapi import APIRouter, Request

from app.errors.exceptions import UploadValidationError
from app.schemas.assets import AssetResponse
from app.schemas.text import TextRequest
from app.services.text_service import TextService


router = APIRouter(prefix="/advanced", tags=["advanced"])


@router.post("/text", response_model=AssetResponse, status_code=201)
def text(payload: TextRequest, request: Request) -> AssetResponse:
    service = TextService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.apply(payload)
    except ValueError as error:
        code = str(error)
        messages = {
            "ASSET_NOT_FOUND": "الصورة المطلوبة غير متاحة.",
            "FONT_UNAVAILABLE": "الخط المحدد غير متاح.",
            "TEXT_PROCESSING_FAILED": "تعذر تنفيذ أداة النص المتقدم."
        }
        raise UploadValidationError(code, messages.get(code, "تعذر تنفيذ أداة النص المتقدم.")) from error
