from fastapi import APIRouter, Request

from app.errors.exceptions import UploadValidationError
from app.schemas.assets import AssetResponse
from app.schemas.filter import FilterRequest
from app.services.filter_service import FilterService

router = APIRouter(prefix="/filters", tags=["filters"])


@router.post("", response_model=AssetResponse, status_code=201)
async def apply_filter(request: Request, payload: FilterRequest) -> AssetResponse:
    service = FilterService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.apply(payload)
    except ValueError as error:
        messages = {
            "ASSET_NOT_FOUND": "الصورة المطلوبة غير موجودة.",
            "KERNEL_SIZE_MUST_BE_ODD": "يجب أن يكون حجم Kernel رقماً فردياً.",
            "CANNY_HIGH_THRESHOLD_INVALID": "يجب أن تكون قيمة Canny العليا أكبر من القيمة الدنيا.",
        }
        code = str(error)
        raise UploadValidationError(code, messages.get(code, "تعذر التحقق من إعدادات الفلتر.")) from error
