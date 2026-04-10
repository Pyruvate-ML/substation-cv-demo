from functools import lru_cache

from fastapi import APIRouter, File, Form, UploadFile

from backend.models import (
    AsrTranscribeResponse,
    ConsistencyCheckRequest,
    ConsistencyCheckResponse,
    DecisionRequest,
    DecisionResponse,
    OfficialApplicationDoc,
    ReportGenerateRequest,
    ReportGenerateResponse,
    StructuredVoiceRequest,
)
from backend.services.pipeline_service import PipelineService

router = APIRouter(prefix="/api", tags=["pipeline"])


@lru_cache
def get_pipeline_service() -> PipelineService:
    return PipelineService()


@router.post("/asr/transcribe", response_model=AsrTranscribeResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
) -> AsrTranscribeResponse:
    service = get_pipeline_service()
    content = await audio.read()
    return service.transcribe(filename=audio.filename, raw_bytes=content)


@router.post("/application/from-voice", response_model=OfficialApplicationDoc)
async def build_application_from_voice(
    transcript_text: str = Form(...),
) -> OfficialApplicationDoc:
    service = get_pipeline_service()
    structured: StructuredVoiceRequest = service.extract_voice_request(transcript_text)
    return service.build_application_doc(structured)


@router.post("/consistency/check", response_model=ConsistencyCheckResponse)
def check_consistency(payload: ConsistencyCheckRequest) -> ConsistencyCheckResponse:
    service = get_pipeline_service()
    return service.check_consistency(payload)


@router.post("/decision/allowance", response_model=DecisionResponse)
def generate_allowance_decision(payload: DecisionRequest) -> DecisionResponse:
    service = get_pipeline_service()
    return service.make_decision(payload)


@router.post("/report/generate", response_model=ReportGenerateResponse)
def generate_report(payload: ReportGenerateRequest) -> ReportGenerateResponse:
    service = get_pipeline_service()
    return service.generate_report(payload)

