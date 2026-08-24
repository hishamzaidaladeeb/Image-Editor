from fastapi import APIRouter, Request

from app.errors.exceptions import UploadValidationError
from app.schemas.assets import AssetResponse
from app.schemas.layers import LayersRequest
from app.services.layers_service import LayersService


router = APIRouter(prefix="/advanced", tags=["advanced"])


@router.post("/layers", response_model=AssetResponse, status_code=201)
def layers(payload: LayersRequest, request: Request) -> AssetResponse:
    service = LayersService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.apply(payload)
    except ValueError as error:
        code = str(error)
        messages = {
            "ASSET_NOT_FOUND": "الصورة الأساسية المطلوبة غير متاحة.",
            "LAYER_ASSET_NOT_FOUND": "أحد أصول الطبقات غير متاح.",
            "LAYERS_PROCESSING_FAILED": "تعذر تنفيذ طبقات الصور."
        }
        raise UploadValidationError(code, messages.get(code, "تعذر تنفيذ طبقات الصور.")) from error
