from fastapi import APIRouter, Request
from fastapi.responses import FileResponse

from app.errors.exceptions import UploadValidationError
from app.schemas.export import ExportRequest, ExportResponse
from app.services.export_service import ExportService


router = APIRouter(prefix="/export", tags=["export"])


@router.post("", response_model=ExportResponse, status_code=201)
def create_export(request: Request, payload: ExportRequest) -> ExportResponse:
    service = ExportService(request.app.state.settings, request.app.state.temporary_storage)
    try:
        return service.export(payload)
    except UploadValidationError:
        raise
    except ValueError as error:
        messages = {
            "INVALID_FILENAME": "اسم الملف غير مسموح.",
            "RESOLUTION_PAIR_REQUIRED": "يجب تحديد العرض والارتفاع معاً.",
            "ASSET_NOT_FOUND": "الصورة المعتمدة غير موجودة.",
        }
        code = str(error)
        raise UploadValidationError(code, messages.get(code, "تعذر التحقق من بيانات التصدير.")) from error


@router.delete("/{export_id}/preview", status_code=204)
def delete_export_preview(request: Request, export_id: str) -> None:
    if not request.app.state.temporary_storage.delete_export_preview(export_id):
        raise UploadValidationError("EXPORT_PREVIEW_NOT_FOUND", "ملف المعاينة غير موجود.")


@router.get("/{export_id}/content")
def export_content(request: Request, export_id: str) -> FileResponse:
    storage = request.app.state.temporary_storage
    path = storage.get_export(export_id)
    media_type = storage.export_media_type(export_id)
    if path is None or media_type is None:
        raise UploadValidationError("EXPORT_NOT_FOUND", "ملف التصدير غير موجود.")
    return FileResponse(path, media_type=media_type)


@router.get("/{export_id}/download")
def download_export(request: Request, export_id: str) -> FileResponse:
    storage = request.app.state.temporary_storage
    path = storage.get_export(export_id)
    filename = storage.export_filename(export_id)
    media_type = storage.export_media_type(export_id)
    if path is None or filename is None or media_type is None or storage.is_export_preview(export_id):
        raise UploadValidationError("EXPORT_NOT_FOUND", "ملف التصدير النهائي غير موجود.")
    return FileResponse(path, media_type=media_type, filename=filename)
