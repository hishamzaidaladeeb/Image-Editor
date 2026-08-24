from fastapi import APIRouter, Request

from app.errors.exceptions import UploadValidationError
from app.schemas.creative import CreativeAssetResponse, CreativeRequest, CreativeSampleRequest, PixelSampleResponse
from app.services.creative_service import CreativeService


router = APIRouter(prefix="/creative", tags=["creative"])


@router.post("", response_model=CreativeAssetResponse, status_code=201)
async def apply_creative(request: Request, payload: CreativeRequest) -> CreativeAssetResponse:
    service = CreativeService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.apply(payload)
    except ValueError as error:
        code = str(error)
        messages = {
            "ASSET_NOT_FOUND": "الصورة المطلوبة غير موجودة.",
            "PRESET_REQUIRED": "يجب اختيار Filter Preset.",
            "LOOK_REQUIRED": "يجب اختيار Creative Look.",
        }
        raise UploadValidationError(code, messages.get(code, "تعذر التحقق من إعدادات الميزة الإبداعية.")) from error


@router.post("/sample", response_model=PixelSampleResponse)
async def sample_pixel(request: Request, payload: CreativeSampleRequest) -> PixelSampleResponse:
    service = CreativeService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.sample(payload)
    except ValueError as error:
        code = str(error)
        messages = {
            "ASSET_NOT_FOUND": "الصورة المطلوبة غير موجودة.",
            "SAMPLE_OUT_OF_BOUNDS": "الإحداثيات خارج حدود الصورة.",
        }
        raise UploadValidationError(code, messages.get(code, "تعذر قراءة قيمة البكسل من الصورة.")) from error
