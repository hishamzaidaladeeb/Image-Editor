from fastapi import APIRouter
from app.routers.assets import router as assets_router
from app.routers.health import router as health_router
from app.routers.transform import router as transform_router
from app.routers.pixel import router as pixel_router
from app.routers.filters import router as filters_router
from app.routers.histogram import router as histogram_router
from app.routers.background import router as background_router
from app.routers.blending import router as blending_router
from app.routers.creative import router as creative_router
from app.routers.export import router as export_router
from app.routers.blur import router as blur_router
from app.routers.watermark import router as watermark_router
from app.routers.text import router as text_router
from app.routers.layers import router as layers_router


api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(assets_router)
api_router.include_router(transform_router)
api_router.include_router(pixel_router)
api_router.include_router(filters_router)
api_router.include_router(histogram_router)
api_router.include_router(background_router)
api_router.include_router(blending_router)
api_router.include_router(creative_router)
api_router.include_router(export_router)
api_router.include_router(blur_router)
api_router.include_router(watermark_router)
api_router.include_router(text_router)
api_router.include_router(layers_router)
