from fastapi import APIRouter, Request

from app.errors.exceptions import UploadValidationError
from app.schemas.assets import AssetResponse
from app.schemas.blur import BlurAreaRequest
from app.services.blur_service import BlurAreaService

router = APIRouter(prefix="/advanced/blur-area", tags=["advanced"])


@router.post("", response_model=AssetResponse, status_code=201)
def blur_area(request: Request, payload: BlurAreaRequest) -> AssetResponse:
    service = BlurAreaService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.apply(payload)
    except ValueError as error:
        code = str(error)
        messages = {
            "ASSET_NOT_FOUND": "الصورة المطلوبة غير متاحة.",
            "BLUR_REGION_INVALID": "منطقة التمويه غير صالحة.",
            "KERNEL_SIZE_MUST_BE_ODD": "يجب أن يكون Kernel Size رقماً فردياً.",
        }
        raise UploadValidationError(code, messages.get(code, "تعذر تنفيذ Blur Area.")) from error
