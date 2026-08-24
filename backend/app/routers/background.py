from fastapi import APIRouter, Request

from app.errors.exceptions import UploadValidationError
from app.schemas.background import BackgroundRemovalRequest, BackgroundRemovalResponse
from app.services.background_service import BackgroundRemovalService


router = APIRouter(prefix="/background", tags=["background"])


@router.post("/remove", response_model=BackgroundRemovalResponse, status_code=200)
def remove_background(request: Request, payload: BackgroundRemovalRequest) -> BackgroundRemovalResponse:
    service = BackgroundRemovalService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.apply(payload)
    except ValueError as error:
        code = str(error)
        messages = {"ASSET_NOT_FOUND": "الصورة الأساسية غير متاحة.", "BACKGROUND_ASSET_NOT_FOUND": "صورة الخلفية غير متاحة."}
        raise UploadValidationError(code, messages.get(code, "تعذر إزالة الخلفية.")) from error
