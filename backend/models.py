from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class OcrHealthResponse(BaseModel):
    status: str
    backend: str


class OcrRecognizeResponse(BaseModel):
    filename: str | None = None
    line_count: int
    lines: list[str]
    full_text: str
    backend: str


class AsrSegment(BaseModel):
    start: float = Field(ge=0)
    end: float = Field(ge=0)
    text: str


class AsrTranscribeResponse(BaseModel):
    filename: str | None = None
    text: str
    segments: list[AsrSegment] = Field(default_factory=list)
    note: str = "ASR service not connected yet."


class StructuredVoiceRequest(BaseModel):
    event_id: str = ""
    station: str = ""
    location: str = ""
    request: str = ""
    happen_time: str = ""
    raw_text: str


class OfficialApplicationDoc(BaseModel):
    title: str = "操作申请单"
    event_id: str
    station: str
    location: str
    happen_time: str
    request: str
    source: str = "voice_transcript"
    generated_at: datetime


class ConsistencyStatus(str, Enum):
    consistent = "consistent"
    inconsistent = "inconsistent"
    insufficient_data = "insufficient_data"


class RecognitionTuple(BaseModel):
    label: str
    graph_value: str = ""
    message_value: str = ""
    table_value: str = ""


class ConsistencyCheckRequest(BaseModel):
    event_id: str = ""
    station: str = ""
    items: list[RecognitionTuple] = Field(default_factory=list)


class ConsistencyDiff(BaseModel):
    label: str
    graph_value: str
    message_value: str
    table_value: str
    reason: str


class ConsistencyCheckResponse(BaseModel):
    event_id: str
    station: str
    status: ConsistencyStatus
    matched_count: int
    total_count: int
    diffs: list[ConsistencyDiff] = Field(default_factory=list)


class DecisionRequest(BaseModel):
    application: OfficialApplicationDoc
    consistency: ConsistencyCheckResponse


class DecisionResponse(BaseModel):
    allow: bool
    verdict: str
    reason: str
    generated_at: datetime


class ReportGenerateRequest(BaseModel):
    event_id: str = ""
    station: str = ""
    transcript: str = ""
    ocr_text: str = ""
    consistency: ConsistencyCheckResponse | None = None


class ReportGenerateResponse(BaseModel):
    markdown: str
    summary: str
    generated_at: datetime

