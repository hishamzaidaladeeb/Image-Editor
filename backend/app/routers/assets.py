from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from app.errors.exceptions import UploadValidationError
from app.schemas.assets import AssetResponse
from app.services.asset_service import AssetService

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("", response_model=AssetResponse, status_code=201)
async def upload_asset(request: Request, file: UploadFile = File(...)) -> AssetResponse:
    service = AssetService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return await service.upload(file)
    except ValueError as error:
        messages = {
            "SUSPICIOUS_FILENAME": "اسم الملف أو مساره غير مسموح.",
            "UNSUPPORTED_EXTENSION": "امتداد الملف غير مدعوم.",
            "EMPTY_FILE": "الملف فارغ.",
            "FILE_TOO_LARGE": "حجم الملف يتجاوز الحد المسموح.",
            "MIME_MISMATCH": "نوع MIME لا يطابق محتوى الصورة.",
            "UNSUPPORTED_FORMAT": "صيغة الصورة غير مدعومة.",
            "INVALID_IMAGE_CONTENT": "محتوى الملف ليس صورة سليمة.",
            "DIMENSIONS_INVALID": "أبعاد الصورة غير مسموحة.",
            "PIXEL_LIMIT_EXCEEDED": "عدد بكسلات الصورة يتجاوز الحد المسموح."
        }
        code = str(error)
        raise UploadValidationError(code, messages.get(code, "تعذر التحقق من الصورة.")) from error


@router.delete("/{asset_id}/preview", status_code=204)
def delete_preview(request: Request, asset_id: str) -> None:
    if not request.app.state.temporary_storage.delete_preview(asset_id):
        raise HTTPException(status_code=404, detail="Preview not found")


@router.get("/{asset_id}/content")
def asset_content(request: Request, asset_id: str) -> FileResponse:
    path = request.app.state.temporary_storage.get(asset_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return FileResponse(path)
