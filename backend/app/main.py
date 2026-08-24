from uuid import uuid4
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.errors.exceptions import UploadValidationError
from app.errors.model import ErrorResponse, FieldError
from app.services.foundation_service import HealthService
from app.storage.temporary import SafeTemporaryStorage


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()
    application = FastAPI(title=settings.app_name, version="0.1.0", docs_url=f"{settings.api_prefix}/docs", redoc_url=f"{settings.api_prefix}/redoc")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Request-ID"]
    )
    application.state.settings = settings
    application.state.health_service = HealthService(settings.app_name, application.version)
    application.state.temporary_storage = SafeTemporaryStorage(settings.temporary_directory)
    application.include_router(api_router, prefix=settings.api_prefix)

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        fields = [
            FieldError(field=".".join(str(item) for item in error["loc"]), message="قيمة الطلب غير صالحة.")
            for error in exc.errors()
        ]
        payload = ErrorResponse(
            code="VALIDATION_ERROR",
            message="تعذر التحقق من بيانات الطلب.",
            request_id=request_id,
            field_errors=fields
        )
        return JSONResponse(status_code=422, content=payload.model_dump())

    @application.exception_handler(UploadValidationError)
    async def upload_error_handler(request: Request, exc: UploadValidationError) -> JSONResponse:
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        payload = ErrorResponse(code=exc.code, message=exc.message, request_id=request_id)
        return JSONResponse(status_code=400, content=payload.model_dump())

    @application.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = request.headers.get("X-Request-ID", str(uuid4()))
        payload = ErrorResponse(
            code="INTERNAL_ERROR",
            message="حدث خطأ داخلي. يرجى المحاولة مرة أخرى.",
            request_id=request_id
        )
        return JSONResponse(status_code=500, content=payload.model_dump())

    return application


app = create_app()
