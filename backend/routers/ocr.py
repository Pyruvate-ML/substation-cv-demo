from functools import lru_cache

from fastapi import APIRouter, Depends, File, UploadFile

from backend.models import OcrHealthResponse, OcrRecognizeResponse
from backend.services.ocr_service import OcrService

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


@lru_cache
def get_ocr_service() -> OcrService:
    return OcrService()


@router.get("/health", response_model=OcrHealthResponse)
def health(service: OcrService = Depends(get_ocr_service)) -> OcrHealthResponse:
    return service.health()


@router.post("/recognize", response_model=OcrRecognizeResponse)
async def recognize(
    image: UploadFile = File(...),
    service: OcrService = Depends(get_ocr_service),
) -> OcrRecognizeResponse:
    content = await image.read()
    return service.recognize(content=content, filename=image.filename)

