from io import BytesIO
from typing import Any

import numpy as np
from fastapi import HTTPException
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

from backend.models import OcrHealthResponse, OcrRecognizeResponse


class OcrService:
    def __init__(self) -> None:
        self.backend = "rapidocr"
        self._rapid_engine = RapidOCR()
        self._paddle_engine = None
        self._try_init_paddle()

    def _try_init_paddle(self) -> None:
        try:
            from paddleocr import PaddleOCR

            self._paddle_engine = PaddleOCR(use_angle_cls=True, lang="ch")
            self.backend = "paddleocr"
        except Exception:
            self._paddle_engine = None

    @staticmethod
    def _image_to_ndarray(content: bytes) -> np.ndarray:
        try:
            image = Image.open(BytesIO(content)).convert("RGB")
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail=f"无效图片文件: {exc}") from exc
        return np.array(image)

    @staticmethod
    def _extract_lines_paddle(ocr_result: Any) -> list[str]:
        lines: list[str] = []
        if not ocr_result:
            return lines
        for block in ocr_result:
            if not block:
                continue
            for item in block:
                if len(item) < 2 or len(item[1]) < 1:
                    continue
                text = str(item[1][0]).strip()
                if text:
                    lines.append(text)
        return lines

    @staticmethod
    def _extract_lines_rapid(ocr_result: Any) -> list[str]:
        lines: list[str] = []
        if not ocr_result:
            return lines
        for item in ocr_result:
            if len(item) < 2:
                continue
            text = str(item[1]).strip()
            if text:
                lines.append(text)
        return lines

    def health(self) -> OcrHealthResponse:
        return OcrHealthResponse(status="ok", backend=self.backend)

    def recognize(self, content: bytes, filename: str | None = None) -> OcrRecognizeResponse:
        if not content:
            raise HTTPException(status_code=400, detail="空文件")

        ndarray = self._image_to_ndarray(content)
        if self._paddle_engine is not None:
            result = self._paddle_engine.ocr(ndarray, cls=True)
            lines = self._extract_lines_paddle(result)
        else:
            result, _ = self._rapid_engine(ndarray)
            lines = self._extract_lines_rapid(result)

        return OcrRecognizeResponse(
            filename=filename,
            line_count=len(lines),
            lines=lines,
            full_text=" ".join(lines),
            backend=self.backend,
        )

