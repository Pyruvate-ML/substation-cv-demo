# API Contract (MVP)

## 1) OCR

### `GET /api/ocr/health`
- Response: `{"status":"ok","backend":"dashscope-vl-ocr"}`

### `POST /api/ocr/recognize`
- FormData: `image=<file>`
- Response:

```json
{
  "filename": "capture.png",
  "line_count": 3,
  "lines": ["..."],
  "full_text": "...",
  "backend": "dashscope-vl-ocr"
}
```

## 2) ASR

### `POST /api/asr/transcribe`
- FormData: `audio=<file>`
- Response includes transcript text from DashScope ASR model.

## 3) Voice -> Official Application

### `POST /api/application/from-voice`
- FormData: `transcript_text=<string>`
- Response:

```json
{
  "title": "操作申请单",
  "event_id": "AUTO-20260409010101",
  "station": "",
  "location": "",
  "happen_time": "",
  "request": "...",
  "source": "voice_transcript",
  "generated_at": "2026-04-09T01:01:01"
}
```

## 4) Three-Channel Consistency Check

### `POST /api/consistency/check`
- JSON request:

```json
{
  "event_id": "EVT-1",
  "station": "XX站",
  "items": [
    {
      "label": "A相电压",
      "graph_value": "500kV",
      "message_value": "500kV",
      "table_value": "0.00kV"
    }
  ]
}
```

## 5) Allowance Decision

### `POST /api/decision/allowance`
- JSON request:
  - `application`: from `/api/application/from-voice`
  - `consistency`: from `/api/consistency/check`

Returns one-line verdict and reason.

## 6) Report Generation

### `POST /api/report/generate`
- Combines transcript, OCR text and consistency result into Markdown.
- 当前实现会优先调用 DashScope 文本模型生成报告，失败时自动回退模板报告。
