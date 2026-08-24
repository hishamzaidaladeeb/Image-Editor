from fastapi import APIRouter, Request

from app.errors.exceptions import UploadValidationError
from app.schemas.blending import BlendingRequest, BlendingResponse
from app.services.blending_service import BlendingService


router = APIRouter(prefix="/blending", tags=["blending"])


@router.post("", response_model=BlendingResponse, status_code=200)
def blend_images(request: Request, payload: BlendingRequest) -> BlendingResponse:
    service = BlendingService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.apply(payload)
    except ValueError as error:
        code = str(error)
        messages = {"ASSET_NOT_FOUND": "الصورة الأولى غير متاحة.", "SECOND_ASSET_NOT_FOUND": "الصورة الثانية غير متاحة."}
        raise UploadValidationError(code, messages.get(code, "تعذر دمج الصورتين.")) from error
