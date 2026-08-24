from fastapi import APIRouter, Request
from app.errors.exceptions import UploadValidationError
from app.schemas.assets import AssetResponse
from app.schemas.transform import TransformRequest
from app.services.transform_service import TransformService

router = APIRouter(prefix="/operations/transform", tags=["transform"])


@router.post("", response_model=AssetResponse, status_code=201)
def transform(request: Request, payload: TransformRequest) -> AssetResponse:
    service = TransformService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.apply(payload)
    except ValueError as error:
        messages = {
            "ASSET_NOT_FOUND": "الصورة المطلوبة غير متاحة.",
            "FLIP_AXIS_REQUIRED": "يرجى تحديد اتجاه القلب.",
            "CROP_DIMENSIONS_REQUIRED": "يرجى تحديد أبعاد القص.",
            "CROP_REGION_INVALID": "منطقة القص غير صالحة.",
            "RESIZE_DIMENSIONS_REQUIRED": "يرجى تحديد أبعاد تغيير الحجم.",
            "PERSPECTIVE_POINTS_REQUIRED": "يلزم تحديد أربع نقاط للتحويل المنظوري.",
            "UNSUPPORTED_OPERATION": "عملية التحويل غير مدعومة."
        }
        code = str(error)
        raise UploadValidationError(code, messages.get(code, "تعذر تنفيذ التحويل.")) from error
