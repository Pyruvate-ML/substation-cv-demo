import os
from pydantic import BaseModel


class AppConfig(BaseModel):
    title: str = "Substation Local OCR Service"
    version: str = "2.0.0"
    allow_origins: list[str] = ["*"]


def _parse_allow_origins(value: str) -> list[str]:
    raw = (value or "").strip()
    if not raw:
        return ["*"]
    if raw == "*":
        return ["*"]
    return [item.strip() for item in raw.split(",") if item.strip()]


settings = AppConfig(
    allow_origins=_parse_allow_origins(os.environ.get("ALLOW_ORIGINS", "*")),
)
