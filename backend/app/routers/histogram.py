from fastapi import APIRouter, Request

from app.errors.exceptions import UploadValidationError
from app.schemas.histogram import HistogramRequest, HistogramResponse
from app.services.histogram_service import HistogramService


router = APIRouter(prefix="/histogram", tags=["histogram"])


@router.post("", response_model=HistogramResponse, status_code=200)
def histogram(request: Request, payload: HistogramRequest) -> HistogramResponse:
    service = HistogramService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.analyze(payload)
    except ValueError as error:
        code = str(error)
        messages = {"ASSET_NOT_FOUND": "الصورة المطلوبة غير متاحة."}
        raise UploadValidationError(code, messages.get(code, "تعذر حساب Histogram.")) from error
