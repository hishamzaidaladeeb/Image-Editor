from fastapi import APIRouter, Query, Request
from app.schemas.common import ApiInfoResponse, HealthResponse
from app.services.foundation_service import HealthService

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health(request: Request, verbose: bool = Query(default=False)) -> HealthResponse:
    service: HealthService = request.app.state.health_service
    result = service.status()
    if verbose:
        result["status"] = "ok"
    return HealthResponse(**result)


@router.get("/info", response_model=ApiInfoResponse)
def info(request: Request) -> ApiInfoResponse:
    settings = request.app.state.settings
    return ApiInfoResponse(
        name=settings.app_name,
        version=request.app.version,
        environment=settings.environment,
        api_prefix=settings.api_prefix
    )
