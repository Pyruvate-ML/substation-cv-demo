from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import tempfile
from functools import lru_cache
from datetime import datetime
from pathlib import Path
from urllib import error as urlerror
from urllib import request as urlrequest

from backend.models import (
    AsrSegment,
    AsrTranscribeResponse,
    ConsistencyCheckRequest,
    ConsistencyCheckResponse,
    ConsistencyDiff,
    ConsistencyStatus,
    DecisionRequest,
    DecisionResponse,
    OfficialApplicationDoc,
    ReportGenerateRequest,
    ReportGenerateResponse,
    StructuredVoiceRequest,
)


class PipelineService:
    def __init__(self) -> None:
        self.local_env = self._read_local_env_file()
        self.mlx_model_name = self._get_env_value("MLX_MODEL", "mlx-community/Qwen2.5-0.5B-Instruct-4bit")
        self.mlx_max_tokens = int(self._get_env_value("MLX_MAX_TOKENS", "512") or "512")
        self.mlx_whisper_model = self._get_env_value("MLX_WHISPER_MODEL", "mlx-community/whisper-tiny")
        self.ollama_base_url = self._get_env_value("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
        self.ollama_model = self._get_env_value("OLLAMA_MODEL", "qwen2.5:3b")
        self.local_asr_command = self._get_env_value("LOCAL_ASR_COMMAND", "")
        self.whisper_cpp_command = self._get_env_value("WHISPER_CPP_COMMAND", "")
        self.whisper_model_path = self._get_env_value("WHISPER_MODEL_PATH", "")
        self.local_asr_language = self._get_env_value("LOCAL_ASR_LANGUAGE", "zh")

    def transcribe(self, filename: str | None, raw_bytes: bytes) -> AsrTranscribeResponse:
        if not raw_bytes:
            return AsrTranscribeResponse(
                filename=filename,
                text="",
                segments=[],
                note="未收到音频内容。",
            )

        suffix = Path(filename or "voice.wav").suffix or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
            handle.write(raw_bytes)
            audio_path = Path(handle.name)

        try:
            transcript_text, note, raw_segments = self._transcribe_with_local_stack(audio_path)
        finally:
            audio_path.unlink(missing_ok=True)

        cleaned_text = self._normalize_transcript_text(transcript_text)
        segments = self._build_asr_segments(raw_segments, cleaned_text)

        return AsrTranscribeResponse(
            filename=filename,
            text=cleaned_text,
            segments=segments,
            note=note,
        )

    def extract_voice_request(self, raw_text: str) -> StructuredVoiceRequest:
        llm_result = self._extract_with_local_llm(raw_text)
        pattern_result = self._extract_with_patterns(raw_text)
        payload = dict(pattern_result)
        for key, value in llm_result.items():
            if not value:
                continue
            if self._is_generic_llm_value(key, value):
                continue
            existing = payload.get(key, "")
            if not existing or len(value) >= len(existing):
                payload[key] = value
        event_id = payload.get("event_id") or self._make_event_id()
        station = payload.get("station") or self._guess_station_from_text(raw_text)
        location = payload.get("location") or self._guess_location_from_text(raw_text)
        happen_time = payload.get("happen_time") or self._guess_time_from_text(raw_text)
        request_text = payload.get("request") or self._summarize_request(raw_text, location)

        return StructuredVoiceRequest(
            event_id=event_id,
            station=station,
            location=location,
            request=request_text,
            happen_time=happen_time,
            raw_text=raw_text,
        )

    def build_application_doc(self, structured: StructuredVoiceRequest) -> OfficialApplicationDoc:
        return OfficialApplicationDoc(
            event_id=structured.event_id or self._make_event_id(),
            station=structured.station,
            location=structured.location,
            happen_time=structured.happen_time,
            request=structured.request,
            source="voice_transcript",
            generated_at=datetime.now(),
        )

    def check_consistency(self, payload: ConsistencyCheckRequest) -> ConsistencyCheckResponse:
        diffs: list[ConsistencyDiff] = []
        matched_count = 0
        comparable_count = 0
        found_mismatch = False

        for item in payload.items:
            raw_values = [item.graph_value, item.message_value, item.table_value]
            values = [self._normalize_compare_value(value) for value in raw_values if value]

            if len(values) < 2:
                diffs.append(
                    ConsistencyDiff(
                        label=item.label,
                        graph_value=item.graph_value,
                        message_value=item.message_value,
                        table_value=item.table_value,
                        reason="三路识别数据不足，暂时无法完成交叉核对。",
                    )
                )
                continue

            comparable_count += 1
            if len(set(values)) == 1:
                matched_count += 1
                continue

            found_mismatch = True
            diffs.append(
                ConsistencyDiff(
                    label=item.label,
                    graph_value=item.graph_value,
                    message_value=item.message_value,
                    table_value=item.table_value,
                    reason="接线图、报文和状态表对应条目存在差异。",
                )
            )

        if found_mismatch:
            status = ConsistencyStatus.inconsistent
        elif comparable_count == 0 or len(diffs) > 0:
            status = ConsistencyStatus.insufficient_data
        else:
            status = ConsistencyStatus.consistent

        return ConsistencyCheckResponse(
            event_id=payload.event_id,
            station=payload.station,
            status=status,
            matched_count=matched_count,
            total_count=len(payload.items),
            diffs=diffs,
        )

    def make_decision(self, payload: DecisionRequest) -> DecisionResponse:
        consistency = payload.consistency
        if consistency.status == ConsistencyStatus.consistent:
            verdict = "允许"
            reason = "三路识别结果一致，申请信息与现场状态可相互印证。"
            allow = True
        elif consistency.status == ConsistencyStatus.inconsistent:
            labels = "、".join(diff.label for diff in consistency.diffs[:3]) or "关键测点"
            verdict = "不允许"
            reason = f"{labels}存在不一致，需先复核现场信息后再执行操作。"
            allow = False
        else:
            verdict = "暂不允许"
            reason = "当前三路识别信息不完整，建议补齐图像、报文或状态表后再确认。"
            allow = False

        return DecisionResponse(
            allow=allow,
            verdict=verdict,
            reason=reason,
            generated_at=datetime.now(),
        )

    def generate_report(self, payload: ReportGenerateRequest) -> ReportGenerateResponse:
        fallback_markdown = self._build_fallback_report(payload)
        llm_markdown = self._generate_report_with_local_llm(payload)
        markdown = llm_markdown if self._is_usable_llm_report(llm_markdown, payload) else fallback_markdown
        summary = self._build_summary(payload)
        return ReportGenerateResponse(
            markdown=markdown,
            summary=summary,
            generated_at=datetime.now(),
        )

    def _transcribe_with_local_stack(self, audio_path: Path) -> tuple[str, str, list[dict[str, object]]]:
        if self.local_asr_command:
            transcript = self._run_local_command(
                self.local_asr_command,
                audio_path,
                {
                    "audio": shlex.quote(str(audio_path)),
                    "language": shlex.quote(self.local_asr_language),
                    "model": shlex.quote(self.whisper_model_path),
                },
            )
            return transcript, "已通过本地 ASR 命令完成转写。", []

        if self.whisper_cpp_command and self.whisper_model_path:
            template = self.whisper_cpp_command
            if "{audio}" not in template:
                template = f"{template} -f {{audio}}"
            if "{model}" not in template:
                template = f"{template} -m {{model}}"
            if "{language}" not in template:
                template = f"{template} -l {{language}}"
            transcript = self._run_local_command(
                template,
                audio_path,
                {
                    "audio": shlex.quote(str(audio_path)),
                    "language": shlex.quote(self.local_asr_language),
                    "model": shlex.quote(self.whisper_model_path),
                },
            )
            return transcript, "已通过 whisper.cpp 本地模型完成转写。", []

        mlx_transcript, mlx_note, mlx_segments = self._transcribe_with_mlx_whisper(audio_path)
        if mlx_transcript:
            return mlx_transcript, mlx_note, mlx_segments

        return "", "本地 ASR 未配置，可通过 whisper.cpp、MLX Whisper 或 LOCAL_ASR_COMMAND 接入。", []

    def _transcribe_with_mlx_whisper(self, audio_path: Path) -> tuple[str, str, list[dict[str, object]]]:
        try:
            import mlx_whisper

            result = mlx_whisper.transcribe(
                str(audio_path),
                path_or_hf_repo=self.mlx_whisper_model,
                verbose=False,
                language=self.local_asr_language,
                condition_on_previous_text=False,
            )
        except Exception:
            return "", "", []

        text = self._normalize_transcript_text(str(result.get("text", "")))
        if not text:
            return "", "", []
        return text, f"已通过 MLX Whisper 本地模型完成转写（{self.mlx_whisper_model}）。", result.get("segments", [])

    def _build_asr_segments(self, raw_segments: list[dict[str, object]], cleaned_text: str) -> list[AsrSegment]:
        segments: list[AsrSegment] = []
        for segment in raw_segments:
            text = self._normalize_transcript_text(str(segment.get("text", "")))
            if not text:
                continue
            try:
                start = max(float(segment.get("start", 0) or 0), 0.0)
                end = max(float(segment.get("end", start) or start), start)
            except (TypeError, ValueError):
                start, end = 0.0, 0.0
            segments.append(AsrSegment(start=start, end=end, text=text))

        if segments:
            return segments
        if cleaned_text:
            return [AsrSegment(start=0, end=0, text=cleaned_text)]
        return []

    def _run_local_command(self, command_template: str, audio_path: Path, placeholders: dict[str, str]) -> str:
        command = command_template.format(**placeholders)
        completed = subprocess.run(
            command,
            shell=True,
            check=False,
            capture_output=True,
            text=True,
            cwd=audio_path.parent,
        )
        stdout = completed.stdout.strip()
        stderr = completed.stderr.strip()
        if completed.returncode != 0:
            return stderr or stdout
        return stdout or stderr

    def _extract_with_local_llm(self, raw_text: str) -> dict[str, str]:
        prompt = f"""
你是变电站操作申请整理助手。请从下面这段中文申请中提取字段，并只返回 JSON 对象。

字段要求：
- event_id: 如果原文没有明确编号，留空字符串
- station: 站点名称
- location: 具体测点、间隔或设备位置
- request: 申请操作内容，保留自然语言
- happen_time: 原文中的时间，没有就留空字符串

申请原文：
{raw_text}
""".strip()

        content = self._call_local_llm(prompt, system_prompt="你只输出 JSON，不要附带解释。")
        if not content:
            return {}
        parsed = self._parse_json_object(content)
        if not isinstance(parsed, dict):
            return {}
        return {key: str(parsed.get(key, "")).strip() for key in ["event_id", "station", "location", "request", "happen_time"]}

    def _generate_report_with_local_llm(self, payload: ReportGenerateRequest) -> str:
        consistency_text = self._format_consistency_for_prompt(payload)
        prompt = f"""
请根据以下变电站操作语音事件信息，生成一份简洁正式的中文 Markdown 报告。

要求：
1. 使用以下固定标题：
   - 事件概述
   - 申请信息
   - 三路核对结果
   - 处置建议
   - 最终结论
2. 内容简洁、正式、适合演示。
3. 不要输出代码块。
4. 只能使用输入中明确提供的信息，不要杜撰时间、编号、申请单号或测点。
5. 对缺失字段明确写“未提供”。

事件编号：{payload.event_id or "未提供"}
站点：{payload.station or "未识别"}
语音文本：{payload.transcript or "未提供"}
OCR 文本：{payload.ocr_text or "未提供"}
一致性结果：
{consistency_text}
""".strip()

        return self._call_local_llm(prompt, system_prompt="你是调控业务报告助手，请输出正式中文 Markdown。")

    def _call_local_llm(self, prompt: str, system_prompt: str = "") -> str:
        mlx_result = self._call_mlx(prompt, system_prompt=system_prompt)
        if mlx_result:
            return mlx_result
        return self._call_ollama(prompt, system_prompt=system_prompt)

    def _call_mlx(self, prompt: str, system_prompt: str = "") -> str:
        try:
            model, tokenizer = self._get_mlx_model_and_tokenizer(self.mlx_model_name)
        except Exception:
            return ""

        full_prompt = self._build_chat_prompt(system_prompt, prompt)
        try:
            from mlx_lm import generate

            return generate(
                model,
                tokenizer,
                full_prompt,
                verbose=False,
                max_tokens=self.mlx_max_tokens,
            ).strip()
        except Exception:
            return ""

    def _call_ollama(self, prompt: str, system_prompt: str = "") -> str:
        body = {
            "model": self.ollama_model,
            "stream": False,
            "messages": [
                {"role": "system", "content": system_prompt or "你是一个可靠的本地中文助手。"},
                {"role": "user", "content": prompt},
            ],
        }
        api_url = f"{self.ollama_base_url.rstrip('/')}/api/chat"

        try:
            request = urlrequest.Request(
                api_url,
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urlrequest.urlopen(request, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (urlerror.URLError, TimeoutError, json.JSONDecodeError, OSError):
            return ""

        message = payload.get("message", {})
        content = message.get("content", "")
        return content.strip()

    @staticmethod
    @lru_cache(maxsize=2)
    def _get_mlx_model_and_tokenizer(model_name: str):
        from mlx_lm import load

        return load(model_name)

    def _build_chat_prompt(self, system_prompt: str, user_prompt: str) -> str:
        system_text = system_prompt or "你是一个可靠的本地中文助手。"
        return (
            f"<|im_start|>system\n{system_text}<|im_end|>\n"
            f"<|im_start|>user\n{user_prompt}<|im_end|>\n"
            "<|im_start|>assistant\n"
        )

    def _build_fallback_report(self, payload: ReportGenerateRequest) -> str:
        consistency = payload.consistency
        consistency_lines = []
        if consistency:
            consistency_lines.append(f"- 状态：{consistency.status.value}")
            consistency_lines.append(f"- 已匹配：{consistency.matched_count}/{consistency.total_count}")
            if consistency.diffs:
                for diff in consistency.diffs[:5]:
                    consistency_lines.append(
                        f"- {diff.label}：图={diff.graph_value or '空'}，报文={diff.message_value or '空'}，表={diff.table_value or '空'}，原因：{diff.reason}"
                    )
        else:
            consistency_lines.append("- 尚未提供一致性结果。")

        return "\n".join(
            [
                "# 事件处置报告",
                "",
                "## 事件概述",
                f"- 事件编号：{payload.event_id or '未提供'}",
                f"- 站点：{payload.station or '未识别'}",
                "",
                "## 申请信息",
                f"- 语音文本：{payload.transcript or '未提供'}",
                "",
                "## 三路核对结果",
                *consistency_lines,
                "",
                "## 处置建议",
                "- 建议以三路一致条目作为操作依据，对差异项继续复核现场值班信息。",
                "",
                "## 最终结论",
                f"- {self._build_summary(payload)}",
            ]
        )

    def _build_summary(self, payload: ReportGenerateRequest) -> str:
        consistency = payload.consistency
        if not consistency:
            return "已生成报告，待补充三路核对结果。"
        if consistency.status == ConsistencyStatus.consistent:
            return "三路识别结果一致，可进入后续操作确认。"
        if consistency.status == ConsistencyStatus.inconsistent:
            return "三路识别结果存在差异，当前不建议执行操作。"
        return "三路识别信息不完整，建议补齐后再判定。"

    def _format_consistency_for_prompt(self, payload: ReportGenerateRequest) -> str:
        consistency = payload.consistency
        if not consistency:
            return "未提供一致性结果。"
        lines = [f"状态：{consistency.status.value}", f"匹配：{consistency.matched_count}/{consistency.total_count}"]
        for diff in consistency.diffs[:5]:
            lines.append(
                f"{diff.label}: 图={diff.graph_value or '空'}; 报文={diff.message_value or '空'}; 表={diff.table_value or '空'}; 原因={diff.reason}"
            )
        return "\n".join(lines)

    def _is_usable_llm_report(self, markdown: str, payload: ReportGenerateRequest) -> bool:
        if not markdown:
            return False

        required_sections = [
            "## 事件概述",
            "## 申请信息",
            "## 三路核对结果",
            "## 处置建议",
            "## 最终结论",
        ]
        if not all(section in markdown for section in required_sections):
            return False

        provided_text = " ".join(
            [
                payload.event_id or "",
                payload.station or "",
                payload.transcript or "",
                payload.ocr_text or "",
            ]
        )
        invented_date_patterns = [
            r"\d{4}年\d{1,2}月\d{1,2}日",
            r"\d{4}[/-]\d{1,2}[/-]\d{1,2}",
        ]
        for pattern in invented_date_patterns:
            for match in re.findall(pattern, markdown):
                if match not in provided_text:
                    return False

        return True

    def _normalize_compare_value(self, value: str) -> str:
        normalized = value.strip().lower()
        normalized = normalized.replace("kv", "kV")
        normalized = normalized.replace(" ", "")
        normalized = normalized.replace("：", ":")
        return normalized

    def _normalize_transcript_text(self, text: str) -> str:
        cleaned = re.sub(r"\s+", " ", text or "").strip()
        replacements = {
            "請": "请",
            "請核隊": "请核对",
            "核隊": "核对",
            "千福": "千伏",
            "戰": "站",
            "進線": "进线",
            "近線": "进线",
            "開關": "开关",
            "準備": "准备",
            "和衛": "合位",
            "轉分為": "转分位",
            "轉": "转",
            "為": "位",
            "10億": "101",
        }
        for source, target in replacements.items():
            cleaned = cleaned.replace(source, target)
        return cleaned

    def _guess_station_from_text(self, raw_text: str) -> str:
        cleaned = re.sub(r"^(请|麻烦|现在|帮我|需要|准备|申请|请求|请核对|请确认|核对|确认)+", "", raw_text).strip()
        match = re.search(r"((?:\d{2,3}kV)?[\u4e00-\u9fa5A-Za-z0-9]+站)", cleaned)
        return match.group(1) if match else ""

    def _guess_location_from_text(self, raw_text: str) -> str:
        patterns = [
            r"([一二三四五六七八九十IVX\d]+段(?:进线|母线|母联))",
            r"(\d+\s*(?:进线开关|母联开关|线路|主变))",
            r"([\u4e00-\u9fa5A-Za-z0-9]+间隔)",
        ]
        for pattern in patterns:
            match = re.search(pattern, raw_text)
            if match:
                return match.group(1).replace(" ", "")
        return ""

    def _guess_time_from_text(self, raw_text: str) -> str:
        patterns = [
            r"(\d{4}[/-]\d{1,2}[/-]\d{1,2}\s*\d{1,2}:\d{2}(?::\d{2})?)",
            r"(\d{1,2}:\d{2}(?::\d{2})?)",
            r"(今天\d{1,2}点\d{0,2}分?)",
            r"(明天\d{1,2}点\d{0,2}分?)",
        ]
        for pattern in patterns:
            match = re.search(pattern, raw_text)
            if match:
                return match.group(1)
        return datetime.now().strftime("%Y-%m-%d %H:%M")

    def _summarize_request(self, raw_text: str, location: str) -> str:
        cleaned = raw_text.strip().rstrip("。")
        if location and location not in cleaned:
            return f"{cleaned}，涉及测点：{location}"
        return cleaned

    def _extract_with_patterns(self, raw_text: str) -> dict[str, str]:
        station = self._guess_station_from_text(raw_text)
        location = self._guess_location_from_text(raw_text)
        happen_time = self._guess_time_from_text(raw_text)

        event_id = ""
        event_match = re.search(r"(?:事件编号|编号|单号)[：: ]*([A-Za-z0-9_-]+)", raw_text)
        if event_match:
            event_id = event_match.group(1).strip()

        request_match = re.search(r"(?:申请|请求|准备|需要|计划)(.*)", raw_text)
        if request_match:
            request_text = request_match.group(1).strip(" ：:")
        else:
            request_text = raw_text.strip()

        return {
            "event_id": event_id,
            "station": station,
            "location": location,
            "request": request_text,
            "happen_time": happen_time,
        }

    def _make_event_id(self) -> str:
        return f"AUTO-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    def _parse_json_object(self, text: str) -> dict[str, object] | None:
        content = text.strip()
        if not content:
            return None
        try:
            parsed = json.loads(content)
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            pass

        match = re.search(r"\{[\s\S]*\}", content)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None

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
            values[key.strip()] = value.strip().strip("'").strip('"')
        return values

    def _get_env_value(self, name: str, default: str = "") -> str:
        return os.environ.get(name) or self.local_env.get(name, default)

    def _is_generic_llm_value(self, key: str, value: str) -> bool:
        normalized = value.strip()
        generic_values = {
            "request": {"申请操作内容", "操作申请", "未提供", "无", "待确认"},
            "location": {"操作位置", "设备位置", "未提供", "无"},
            "station": {"变电站", "站点", "未提供", "无"},
        }
        return normalized in generic_values.get(key, set())
