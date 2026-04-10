# 变电站黑盒报文视觉识别平台 Demo

这是一个前端演示 + 可选本地 OCR 服务的 Demo，用来模拟以下链路：

- 多个变电站监控画面上的黑盒报文以不同速度刷新
- 中间层通过“CV / OCR”识别画面中的规约字段
- 左侧一次接线图节点状态与右侧结构化状态表同步更新
- 底部输出 SOE 风格的最近事件时间线

## 当前版本特点

- 页面风格调整为更正式的调控平台视觉
- 模拟字段参考 104 类规约常见元素：
  - `CA`
  - `IOA`
  - `TypeID`
  - `COT`
  - `QDS`
  - `CP56Time2a`
- 典型事件包含：
  - `M_DP_TB_1` 双点遥信变位
  - `M_ME_TF_1` 短浮点遥测变化

说明：
当前版本是“风格模拟 Demo”，不是逐字节精确复刻真实报文。
重点是验证视觉识别、状态映射、图表联动和多站点切换这条链路。

## 运行方式

直接打开 `index.html` 即可，也可以使用本地静态服务器：

```bash
cd /Users/mxw/Documents/codex/demo
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 启用后端服务（云端模型版）

1. 安装依赖（建议 Python 3.10+）：

```bash
cd /Users/mxw/Documents/codex/demo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-ocr.txt
```

2. 配置环境变量（复制模板）：

```bash
cp .env.local.example .env.local
```

必填：`DASHSCOPE_API_KEY`。  
建议：`ALLOW_ORIGINS` 设置为你的前端域名（逗号分隔）。

3. 启动后端服务：

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8765 --reload
```

兼容旧命令（仍可用）：

```bash
uvicorn ocr_server:app --host 127.0.0.1 --port 8765 --reload
```

4. 本地打开网页：

```bash
python3 -m http.server 8080
```

4. 页面点击“开始自动识别”后，系统会直接截取当前 Demo 页面里的三个仿真窗口，不再依赖浏览器共享屏幕授权。
5. 自动识别只会盯这三块固定区域：
   - `#sourceDiagramScreen .source-diagram-svg`
   - `#sourceMessageScreen .source-message-ocr-focus`
   - `#sourceTableScreen .source-table-ocr-focus`

## 自动化调试 OCR

如果你不想每次手工点页面，可以直接跑自动化测试 / 调试脚本：

```bash
cd /Users/mxw/Documents/codex/demo
npm install
npm run debug:auto:install
uvicorn backend.main:app --host 127.0.0.1 --port 8765 --reload
npm run test:ocr -- --cycles=3
```

说明：

- 脚本会自动启动一个本地静态页面
- 用无头浏览器打开 Demo 并点击“开始自动识别”
- 自动刷新三块源窗口
- 自动截图图 / 报文 / 表格三个识别区
- 使用页面真实自动识别链路得到调试日志（默认 `--mode=ui`）
- 自动生成调试日志和每轮截图到 `ocr-auto-debug-output/`

如果想多跑几轮，可以把 `--cycles=3` 改成 `--cycles=5` 或更高。
项目里也保留了兼容脚本 `npm run debug:auto -- --cycles=3`。
如果要切回旧的旁路对照模式，可显式传 `--mode=direct`。

前端 API 地址规则：
- 本地（`localhost`）默认走 `http://127.0.0.1:8765`
- 非本地默认走同域 `"/api"`（即 `API_BASE_URL=""`）
- 也可显式指定：
  - URL 参数：`?api_base=https://your-api-domain`
  - 控制台设置：`localStorage.setItem("demo_api_base_url","https://your-api-domain")`

## 云端部署（完全脱离本地）

目标：别人直接打开网页即可体验全部功能（OCR/ASR/报告）。

1. 部署后端（FastAPI）到公网（Render/Railway/Fly.io/ECS 等）
2. 在后端环境变量配置：
   - `DASHSCOPE_API_KEY`
   - `DASHSCOPE_OCR_MODEL=qwen-vl-ocr`
   - `DASHSCOPE_ASR_MODEL=qwen3-asr-flash`
   - `DASHSCOPE_TEXT_MODEL=qwen-turbo`
   - `ALLOW_ORIGINS=https://<你的前端域名>`
3. 部署前端（GitHub Pages/Vercel/静态托管）
4. 让前端指向云端后端：
   - 推荐：访问 URL 带 `?api_base=https://<你的后端域名>`
   - 或在前端打包时注入 `window.__DEMO_API_BASE_URL__`

## 后端接口（已重构）

当前后端已拆分为 `backend/routers + backend/services + backend/models`，便于后续封装和扩展。

- OCR（已实现）
  - `GET /api/ocr/health`
  - `POST /api/ocr/recognize`
- 语音与大模型接口（支持通过本地小模型接入）
  - `POST /api/asr/transcribe`
  - `POST /api/application/from-voice`
  - `POST /api/consistency/check`
  - `POST /api/decision/allowance`
  - `POST /api/report/generate`

## （可选）本地开源模型回退

当前版本支持在后端通过本地模型完成以下能力：

- 语音申请自然语言整理
- 语音转写（可选）
- 报告生成

推荐组合：

- `MLX + Qwen2.5-0.5B/3B`：优先用于本机直接推理，适合 Apple Silicon
- `Ollama + qwen2.5:3b`：作为本地服务型备选
- `MLX Whisper`、`whisper.cpp` 或自定义本地脚本：负责语音转写

示例环境变量：

```bash
export MLX_MODEL=mlx-community/Qwen2.5-0.5B-Instruct-4bit
export MLX_MAX_TOKENS=512
export MLX_WHISPER_MODEL=mlx-community/whisper-tiny
export OLLAMA_BASE_URL=http://127.0.0.1:11434
export OLLAMA_MODEL=qwen2.5:3b
# 可选，自定义本地转写命令，需包含 {audio}
# export LOCAL_ASR_COMMAND="/path/to/your_asr.sh {audio}"
# 可选，直接接 whisper.cpp
# export WHISPER_CPP_COMMAND="/path/to/whisper-cli"
# export WHISPER_MODEL_PATH="/path/to/ggml-small.bin"
uvicorn backend.main:app --host 127.0.0.1 --port 8765 --reload
```

如果本地模型未启动，系统会自动回退到规则模板，不影响页面演示。

## 安装本地模型建议

1. Apple Silicon 推荐直接使用 MLX 小模型：

```bash
export MLX_MODEL=mlx-community/Qwen2.5-0.5B-Instruct-4bit
export MLX_WHISPER_MODEL=mlx-community/whisper-tiny
uvicorn backend.main:app --host 127.0.0.1 --port 8765 --reload
```

首次调用时会自动从 Hugging Face 下载模型。

2. 如果你更希望走 Ollama，也可以拉取中文小模型：

```bash
ollama pull qwen2.5:3b
ollama serve
```

3. 如果要接真实语音转写，可以选一条：

```bash
# 方案一：直接用 MLX Whisper
export MLX_WHISPER_MODEL=mlx-community/whisper-tiny

# 方案二：接 whisper.cpp
export WHISPER_CPP_COMMAND="/absolute/path/to/whisper-cli"
export WHISPER_MODEL_PATH="/absolute/path/to/ggml-small.bin"

# 方案三：接你自己的本地转写脚本
export LOCAL_ASR_COMMAND="/absolute/path/to/transcribe.sh {audio}"
```

4. 重新启动后端：

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8765 --reload
```

## 后续真实化方向

1. 将 `app.js` 中的报文生成器替换为真实截图采集。
2. 引入 ROI 标注，分区识别黑盒报文区、状态表区和图元区。
3. 接入 OCR 或 OpenCV 识别文本、颜色和图标状态。
4. 用统一事件总线管理 `站点-节点-状态-时间戳-质量位`。
5. 对接后端存储，沉淀 SOE、告警和回放能力。

## 公开资料参考

- [GB/T 18657.1-2002 远动设备及系统 第5部分:传输规约 第1篇:传输帧格式](https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=0B2552FFD8C32703E4109A8FB0B13F3C)
- [GB/T 18657.3-2002 远动设备及系统 第5部分:传输规约 第3篇:应用数据的一般结构](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=1CD68F8302871D2C48AFFE47425388E3)
- [GB/T 18657.4-2002 远动设备及系统 第5部分:传输规约 第4篇:应用信息元素的定义和编码](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=C59D7273506E7567E3107AE2E25A112C)
- [MZ Automation IEC 60870-5-101/104 Test Client 文档](https://support.mz-automation.de/doc/iec60870_test_client/latest/user_guide/user_guide.html)
- [ABB REC615 IEC 60870-5-101/104 Communication Protocol Manual](https://library.e.abb.com/public/f46ecc91c2154b54a9a653dea2525b4d/REC615_IEC101-104point_2NGA002479_ENa.pdf?x-sign=sIfP1q3N3Ysv2NjlKPsbdR2%2B6ZT8QdxuzbLMRDbvWpJb28qST7Hf13BO3SCz6I4A)

补充说明：
目前公开可直接访问的资料更容易拿到“标准框架、应用数据结构、TypeID 分类和地址字段说明”，不容易拿到国家电网某个具体生产系统的界面报文模板。
所以本 Demo 采用的是“符合 104 系列公开特征的行业风格模拟”。
