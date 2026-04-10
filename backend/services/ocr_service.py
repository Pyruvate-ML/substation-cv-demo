from __future__ import annotations

import base64
import json
import os
import ssl
import time
from pathlib import Path
from urllib import error as urlerror
from urllib import request as urlrequest

from fastapi import HTTPException

from backend.models import OcrHealthResponse, OcrRecognizeResponse


class OcrService:
    def __init__(self) -> None:
        self.local_env = self._read_local_env_file()
        self.base_url = self._get_env_value("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        self.api_key = self._get_env_value("DASHSCOPE_API_KEY", "")
        self.model = self._get_env_value("DASHSCOPE_OCR_MODEL", "qwen-vl-ocr")
        self.timeout_sec = int(self._get_env_value("DASHSCOPE_TIMEOUT_SEC", "45") or "45")
        self.max_retries = int(self._get_env_value("DASHSCOPE_RETRIES", "2") or "2")
        self.backend = "dashscope-vl-ocr"
        self.ssl_context = self._build_ssl_context()

    def health(self) -> OcrHealthResponse:
        if not self.api_key:
            return OcrHealthResponse(status="degraded", backend=f"{self.backend}:missing_api_key")
        return OcrHealthResponse(status="ok", backend=self.backend)

    def recognize(self, content: bytes, filename: str | None = None) -> OcrRecognizeResponse:
        if not content:
            raise HTTPException(status_code=400, detail="空文件")
        if not self.api_key:
            raise HTTPException(status_code=500, detail="未配置 DASHSCOPE_API_KEY")

        mime = self._detect_mime_from_filename(filename)
        image_b64 = base64.b64encode(content).decode("utf-8")
        image_url = f"data:{mime};base64,{image_b64}"
        prompt = "请逐行提取图片中可见文字。只返回纯文本，每行一条，不要解释。"

        payload = {
            "model": self.model,
            "temperature": 0,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
        }

        response_json = self._post_chat(payload)
        text = self._extract_message_text(response_json).strip()
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if not lines and text:
            lines = [part.strip() for part in text.split(" ") if part.strip()]

        return OcrRecognizeResponse(
            filename=filename,
            line_count=len(lines),
            lines=lines,
            full_text=" ".join(lines),
            backend=self.backend,
        )

    def _post_chat(self, payload: dict) -> dict:
        api_url = f"{self.base_url.rstrip('/')}/chat/completions"
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            req = urlrequest.Request(
                api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                method="POST",
            )
            try:
                with urlrequest.urlopen(req, timeout=self.timeout_sec, context=self.ssl_context) as resp:
                    raw = resp.read().decode("utf-8")
                    return json.loads(raw)
            except urlerror.HTTPError as exc:
                status = int(getattr(exc, "code", 0) or 0)
                body = ""
                try:
                    body = exc.read().decode("utf-8")[:220]
                except Exception:  # noqa: BLE001
                    body = ""
                last_error = Exception(f"HTTP {status} {body}".strip())
                if attempt < self.max_retries and status in (429, 500, 502, 503, 504):
                    time.sleep(0.4 * (attempt + 1))
                    continue
                break
            except (urlerror.URLError, TimeoutError, json.JSONDecodeError, OSError, ssl.SSLError) as exc:
                last_error = exc
                if attempt < self.max_retries:
                    time.sleep(0.4 * (attempt + 1))
                    continue
                break
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                break

        raise HTTPException(status_code=502, detail=f"OCR云服务调用失败: {last_error}")

    @staticmethod
    def _extract_message_text(payload: dict) -> str:
        choices = payload.get("choices") or []
        if not choices:
            return ""
        message = choices[0].get("message") or {}
        content = message.get("content", "")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            chunks: list[str] = []
            for item in content:
                if isinstance(item, dict):
                    text = item.get("text")
                    if text:
                        chunks.append(str(text))
            return "\n".join(chunks)
        return str(content or "")

    @staticmethod
    def _detect_mime_from_filename(filename: str | None) -> str:
        if not filename:
            return "image/png"
        ext = Path(filename).suffix.lower().lstrip(".")
        mapping = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
            "bmp": "image/bmp",
        }
        return mapping.get(ext, "image/png")

    def _read_local_env_file(self) -> dict[str, str]:
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

    def _get_env_value(self, name: str, default: str = "") -> str:
        return os.environ.get(name) or self.local_env.get(name, default)

    @staticmethod
    def _build_ssl_context():
        try:
            import certifi

            return ssl.create_default_context(cafile=certifi.where())
        except Exception:  # noqa: BLE001
            return ssl.create_default_context()
