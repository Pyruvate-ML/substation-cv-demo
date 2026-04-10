import os
from pathlib import Path
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


def _read_local_env_file() -> dict[str, str]:
    env_path = Path(".env.local")
    if not env_path.exists():
        return {}
    values: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'\"")
    return values


_local_env = _read_local_env_file()
settings = AppConfig(
    allow_origins=_parse_allow_origins(os.environ.get("ALLOW_ORIGINS") or _local_env.get("ALLOW_ORIGINS", "*")),
)
