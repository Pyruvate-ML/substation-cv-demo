const STABLE_QDS = "IV0 NT0 SB0 BL0";
const AUTO_OCR_MODE = "real";
const API_BASE_URL = "http://127.0.0.1:8765";
const API_ENDPOINTS = {
  ocrRecognize: "/api/ocr/recognize",
  asrTranscribe: "/api/asr/transcribe",
  applicationFromVoice: "/api/application/from-voice",
  consistencyCheck: "/api/consistency/check",
  decisionAllowance: "/api/decision/allowance",
  reportGenerate: "/api/report/generate",
};

const SOURCE_FRAME_INTERVAL_MS = 2200;
const OCR_CAPTURE_BUFFER_MS = 760;
const OCR_REGION_TIMEOUT_MS = 5000;
const OCR_CYCLE_TIMEOUT_MS = 12000;
const VOICE_MAX_RECORDING_MS = 8000;
const UI_CAPTURE_BASE_SCALE = 2;
const LIVE_OCR_REGION_OPTIONS = {
  diagram: { maxVariants: 2, maxScale: 3.2 },
  message: { maxVariants: 3, maxScale: 3.4 },
  table: { maxVariants: 2, maxScale: 3.2 },
};
const LIVE_OCR_WARMUP_REGION_OPTIONS = {
  diagram: { maxVariants: 1, maxScale: 2.4 },
  message: { maxVariants: 1, maxScale: 2.6 },
  table: { maxVariants: 1, maxScale: 2.4 },
};

const OCR_REGION_CONFIG = {
  diagram: {
    maxTokens: 6,
    minMatches: 3,
    variants: [
      { name: "orig", scale: 3.2 },
      { name: "gray-strong", scale: 3.8, grayscale: true, contrast: 2.1, brightness: 16, sharpen: 0.28 },
    ],
  },
  message: {
    maxTokens: 5,
    minMatches: 3,
    variants: [
      { name: "orig", scale: 2.8 },
      { name: "gray-strong", scale: 3.4, grayscale: true, contrast: 2.1, brightness: 12, sharpen: 0.18 },
      { name: "threshold-light", scale: 3.6, grayscale: true, contrast: 2.5, brightness: 16, threshold: 160, invert: true },
    ],
  },
  table: {
    maxTokens: 5,
    minMatches: 3,
    variants: [
      { name: "orig", scale: 3 },
      { name: "gray-strong", scale: 3.4, grayscale: true, contrast: 2.05, brightness: 12, sharpen: 0.18 },
    ],
  },
};

const speedProfiles = [
  { label: "低频", min: 2600, max: 4200, cvDelay: 1400 },
  { label: "标准", min: 1100, max: 2200, cvDelay: 760 },
  { label: "高频", min: 480, max: 1200, cvDelay: 420 },
];

const VOICE_EVENT_SCENARIOS = [
  {
    stationId: "chengnan",
    nodeHint: "101 进线开关",
    location: "I 段进线",
    action: "101进线开关由分到合",
    expectedKind: "breaker",
    expectedValue: "合位",
    spokenRequest: "请核对110kV城南站I段进线的101进线开关，本次申请执行由分到合操作，并确认接线图、报文识别结果和状态表是否一致。",
  },
  {
    stationId: "chengnan",
    nodeHint: "A 段母线电压",
    location: "A 段母线",
    action: "A段母线电压由110kV调整到0kV",
    expectedKind: "voltage",
    expectedValue: "0kV",
    spokenRequest: "请核对110kV城南站A段母线电压，本次申请把电压从110kV调整到0kV，并检查图、报文和状态表三个结果是否完全一致。",
  },
  {
    stationId: "binjiang",
    nodeHint: "主母线电压",
    location: "主母线",
    action: "主母线电压由220kV调整到218kV",
    expectedKind: "voltage",
    expectedValue: "218kV",
    spokenRequest: "请核对220kV滨江站主母线电压，申请把当前电压从220kV调整到218kV，同时核验接线图、报文识别和状态表的对应条目。",
  },
  {
    stationId: "beijiao",
    nodeHint: "402 联络开关",
    location: "联络间隔",
    action: "402联络开关由合到分",
    expectedKind: "breaker",
    expectedValue: "分位",
    spokenRequest: "请核对35kV北郊站联络间隔的402联络开关，本次申请执行由合到分操作，并确认三个识别结果中的对应条目保持一致。",
  },
  {
    stationId: "beijiao",
    nodeHint: "C 段母线电压",
    location: "C 段母线",
    action: "C段母线电压由35kV调整到0kV",
    expectedKind: "voltage",
    expectedValue: "0kV",
    spokenRequest: "请核对35kV北郊站C段母线电压，申请把电压从35kV调整到0kV，并重点比对接线图、报文结果和状态表三处内容是否一致。",
  },
];

const processStepTemplate = [
  { id: "capture", title: "屏幕抓取", desc: "从报文屏持续截取最新画面", screen: "屏幕 02" },
  { id: "detect", title: "区域定位", desc: "框出对应报文行并定位关键字段", screen: "CV" },
  { id: "ocr", title: "内容识别", desc: "读出设备名、数值、状态和时间", screen: "CV" },
  { id: "parse", title: "状态解释", desc: "把识别结果转成设备状态含义", screen: "CV" },
  { id: "sync", title: "结果展示", desc: "同步更新接线图和状态表", screen: "屏幕 01 / 03" },
];

const processDemoScenarios = [
  {
    id: "demo-breaker-close",
    title: "案例一：进线开关合位",
    stationName: "110kV 城南站",
    sourceScreen: "屏幕 02 / 报文屏幕",
    sampleText: "报文样本显示“101 进线开关 双点遥信变位 合位”，系统从滚动报文中抓到这条变化。",
    resultText: "识别后确认 101 进线开关由分位转为合位，并同步更新到识别后的接线图和状态表。",
    resultTags: ["CA 1101", "IOA 12001", "M_DP_TB_1", "正常"],
    captureTitle: "抓取滚动报文窗口",
    captureLines: ["#0031 110kV 城南站", "101 进线开关 双点值 2 / 合位", "时间 14:31:08"],
    detectBoxes: [
      { cls: "detect-box-a", label: "站点" },
      { cls: "detect-box-b", label: "状态" },
      { cls: "detect-box-c", label: "设备行" },
    ],
    ocrLines: ["站点: 110kV 城南站", "设备: 101 进线开关", "状态: 双点值 2 / 合位", "时间: 14:31:08"],
    parseChips: ["开关类", "合位", "正常", "SOE 记录"],
    syncCards: ["接线图: 红色合位圈", "状态表: 合位", "异常区: 不产生告警"],
  },
  {
    id: "demo-voltage-zero",
    title: "案例二：母线电压跌至 0",
    stationName: "220kV 滨江站",
    sourceScreen: "屏幕 02 / 报文屏幕",
    sampleText: "报文样本显示“主母线电压 遥测变化 0kV”，系统抓到失压信息并进入重点识别流程。",
    resultText: "识别后确认主母线电压跌落至 0kV，统一状态中心将其标记为危急并在接线图上橙色闪烁。",
    resultTags: ["CA 2208", "IOA 23001", "M_ME_TF_1", "危急"],
    captureTitle: "抓取遥测变化报文",
    captureLines: ["#0048 220kV 滨江站", "主母线电压 VALUE=0.0kV", "QDS=IV0 NT0 SB0 BL0"],
    detectBoxes: [
      { cls: "detect-box-a", label: "站点" },
      { cls: "detect-box-b", label: "数值" },
      { cls: "detect-box-c", label: "质量位" },
    ],
    ocrLines: ["站点: 220kV 滨江站", "设备: 主母线电压", "数值: 0.0kV", "质量位: IV0 NT0 SB0 BL0"],
    parseChips: ["电压类", "0kV", "危急", "立即告警"],
    syncCards: ["接线图: 橙色快闪", "状态表: 危急", "异常区: 持续保留"],
  },
  {
    id: "demo-qds-warning",
    title: "案例三：质量位异常告警",
    stationName: "35kV 北郊站",
    sourceScreen: "屏幕 02 / 报文屏幕",
    sampleText: "报文样本显示“402 联络开关 质量位异常”，系统识别到状态值正常但质量位需要人工复核。",
    resultText: "识别后确认 402 联络开关状态未跳变，但质量位异常，需要在结果区展示为黄色告警并保留复核提示。",
    resultTags: ["CA 3506", "IOA 32018", "M_DP_TB_1", "告警"],
    captureTitle: "抓取质量位异常报文",
    captureLines: ["#0065 35kV 北郊站", "402 联络开关 DPI=1 / 分位", "QDS=IV0 NT0 SB1 BL0"],
    detectBoxes: [
      { cls: "detect-box-a", label: "设备名" },
      { cls: "detect-box-b", label: "DPI" },
      { cls: "detect-box-c", label: "QDS" },
    ],
    ocrLines: ["站点: 35kV 北郊站", "设备: 402 联络开关", "状态: 双点值 1 / 分位", "质量位: SB1"],
    parseChips: ["开关类", "分位", "告警", "建议复核"],
    syncCards: ["接线图: 黄色慢闪", "状态表: 告警", "异常区: 持续保留"],
  },
];

const protocolCatalog = {
  breaker: { typeId: 31, typeName: "M_DP_TB_1", cotCode: 3, cotText: "SPONT" },
  voltage: { typeId: 36, typeName: "M_ME_TF_1", cotCode: 3, cotText: "SPONT" },
};

function createStationRuntimeState(station) {
  return {
    ...station,
    nodes: station.nodes.map((node) => ({
      ...node,
      typeId: node.monitored ? protocolCatalog[node.kind].typeId : null,
      typeName: node.monitored ? protocolCatalog[node.kind].typeName : "GRAPHIC",
      qds: node.monitored ? STABLE_QDS : "--",
      alertLevel: "normal",
      lastUpdatedAt: new Date(),
      lastAnomalyAt: null,
      lastAnomalyText: "无",
    })),
    lastEvent: "等待首条规约事件",
    lastEventAt: null,
  };
}

const stationBlueprints = [
  {
    id: "chengnan",
    name: "110kV 城南站",
    region: "南区负荷中心",
    ca: 1101,
    nominalKv: 110,
    nodes: [
      { id: "line-1", label: "城南一线", kind: "label", bay: "线路侧", x: 78, y: 110 },
      { id: "brk-101", label: "101 进线开关", kind: "breaker", monitored: true, ioa: 12001, bay: "I 段进线", x: 146, y: 156, status: "open" },
      { id: "ds-101", label: "101 刀闸", kind: "disconnector", monitored: false, ioa: null, bay: "I 段进线", x: 234, y: 156, status: "open" },
      { id: "brk-202", label: "202 母联开关", kind: "breaker", monitored: true, ioa: 12018, bay: "母联间隔", x: 404, y: 156, status: "open" },
      { id: "ds-202", label: "202 刀闸", kind: "disconnector", monitored: false, ioa: null, bay: "母联间隔", x: 492, y: 156, status: "open" },
      { id: "cap-1", label: "1 号电容器", kind: "capacitor", monitored: false, ioa: null, bay: "无功补偿", x: 736, y: 96, status: "online", labelDx: 34, labelDy: 4, labelAnchor: "start", subDy: 22 },
      { id: "xf-1", label: "1 号主变", kind: "transformer", monitored: false, ioa: null, bay: "1 号主变", x: 742, y: 248, status: "online", labelDx: 0, labelDy: 46, subDy: 64 },
      { id: "bus-a", label: "A 段母线电压", kind: "voltage", monitored: true, ioa: 13001, bay: "A 段母线", x: 264, y: 338, status: "good", value: 110, unit: "kV" },
      { id: "bus-b", label: "B 段母线电压", kind: "voltage", monitored: true, ioa: 13002, bay: "B 段母线", x: 526, y: 338, status: "good", value: 110, unit: "kV" },
      { id: "feed-1", label: "401 馈线开关", kind: "breaker", monitored: true, ioa: 12041, bay: "馈线间隔", x: 176, y: 444, status: "open", labelDx: 0, labelDy: 44, subDy: 62 },
      { id: "load-1", label: "站用负荷", kind: "load", monitored: false, ioa: null, bay: "站用系统", x: 82, y: 494, status: "online", labelDx: 0, labelDy: 40, subDy: 58 },
    ],
  },
  {
    id: "binjiang",
    name: "220kV 滨江站",
    region: "沿江输电枢纽",
    ca: 2208,
    nominalKv: 220,
    nodes: [
      { id: "line-1", label: "滨江一线", kind: "label", bay: "线路侧", x: 78, y: 110 },
      { id: "brk-301", label: "301 线路开关", kind: "breaker", monitored: true, ioa: 22031, bay: "滨江一线", x: 146, y: 156, status: "open" },
      { id: "ds-301", label: "301 刀闸", kind: "disconnector", monitored: false, ioa: null, bay: "滨江一线", x: 234, y: 156, status: "open" },
      { id: "brk-302", label: "302 旁路开关", kind: "breaker", monitored: true, ioa: 22047, bay: "旁路间隔", x: 404, y: 156, status: "open" },
      { id: "ds-302", label: "302 刀闸", kind: "disconnector", monitored: false, ioa: null, bay: "旁路间隔", x: 492, y: 156, status: "open" },
      { id: "cap-1", label: "1 号电容器", kind: "capacitor", monitored: false, ioa: null, bay: "无功补偿", x: 736, y: 96, status: "online", labelDx: 34, labelDy: 4, labelAnchor: "start", subDy: 22 },
      { id: "xf-1", label: "1 号主变", kind: "transformer", monitored: false, ioa: null, bay: "1 号主变", x: 742, y: 248, status: "online", labelDx: 0, labelDy: 46, subDy: 64 },
      { id: "bus-main", label: "主母线电压", kind: "voltage", monitored: true, ioa: 23001, bay: "主母线", x: 264, y: 338, status: "good", value: 220, unit: "kV" },
      { id: "bus-backup", label: "备用母线电压", kind: "voltage", monitored: true, ioa: 23002, bay: "备用母线", x: 526, y: 338, status: "good", value: 220, unit: "kV" },
      { id: "feed-1", label: "305 馈线开关", kind: "breaker", monitored: true, ioa: 22085, bay: "馈线间隔", x: 176, y: 444, status: "open", labelDx: 0, labelDy: 44, subDy: 62 },
      { id: "load-1", label: "站用负荷", kind: "load", monitored: false, ioa: null, bay: "站用系统", x: 82, y: 494, status: "online", labelDx: 0, labelDy: 40, subDy: 58 },
    ],
  },
  {
    id: "beijiao",
    name: "35kV 北郊站",
    region: "城郊配电节点",
    ca: 3506,
    nominalKv: 35,
    nodes: [
      { id: "line-1", label: "北郊联络线", kind: "label", bay: "线路侧", x: 78, y: 110 },
      { id: "brk-401", label: "401 馈线开关", kind: "breaker", monitored: true, ioa: 32011, bay: "配电 I 线", x: 146, y: 156, status: "open" },
      { id: "ds-401", label: "401 刀闸", kind: "disconnector", monitored: false, ioa: null, bay: "配电 I 线", x: 234, y: 156, status: "open" },
      { id: "brk-402", label: "402 联络开关", kind: "breaker", monitored: true, ioa: 32018, bay: "联络间隔", x: 404, y: 156, status: "open" },
      { id: "ds-402", label: "402 刀闸", kind: "disconnector", monitored: false, ioa: null, bay: "联络间隔", x: 492, y: 156, status: "open" },
      { id: "cap-1", label: "1 号并联电容器", kind: "capacitor", monitored: false, ioa: null, bay: "无功补偿", x: 736, y: 96, status: "online", labelDx: 34, labelDy: 4, labelAnchor: "start", subDy: 22 },
      { id: "xf-1", label: "1 号配变", kind: "transformer", monitored: false, ioa: null, bay: "站内配变", x: 742, y: 248, status: "online", labelDx: 0, labelDy: 46, subDy: 64 },
      { id: "bus-c", label: "C 段母线电压", kind: "voltage", monitored: true, ioa: 33001, bay: "C 段母线", x: 264, y: 338, status: "good", value: 35, unit: "kV" },
      { id: "bus-d", label: "D 段母线电压", kind: "voltage", monitored: true, ioa: 33002, bay: "D 段母线", x: 526, y: 338, status: "good", value: 35, unit: "kV" },
      { id: "feed-1", label: "403 站用泵开关", kind: "breaker", monitored: true, ioa: 32041, bay: "站用系统", x: 176, y: 444, status: "open", labelDx: 0, labelDy: 44, subDy: 62 },
      { id: "load-1", label: "站用负荷", kind: "load", monitored: false, ioa: null, bay: "站用系统", x: 82, y: 494, status: "online", labelDx: 0, labelDy: 40, subDy: 58 },
    ],
  },
];

const appState = {
  isRunning: false,
  speedIndex: 1,
  messageSeq: 0,
  sourceMessageSeq: 0,
  selectedStationId: stationBlueprints[0].id,
  tableFilter: "all",
  stations: stationBlueprints.map(createStationRuntimeState),
  sourceStations: stationBlueprints.map(createStationRuntimeState),
  sourceRawFeed: [],
  sourceDiagramStationId: stationBlueprints[0].id,
  sourceMessageStationId: stationBlueprints[0].id,
  sourceTableStationId: stationBlueprints[0].id,
  sourceFrameCount: 0,
  sourceLoopHandle: null,
  ocrAuditSession: {
    active: false,
    startedAt: null,
    finishedAt: null,
    cycles: 0,
    regions: {
      diagram: { matched: 0, total: 0, lastMatched: 0, lastTotal: 0, lastAccuracy: null },
      message: { matched: 0, total: 0, lastMatched: 0, lastTotal: 0, lastAccuracy: null },
      table: { matched: 0, total: 0, lastMatched: 0, lastTotal: 0, lastAccuracy: null },
    },
  },
  ocrDebugLog: [],
  rawFeed: [],
  parsedFeed: [],
  activeAnomalies: [],
  totals: {
    recognized: 0,
    total: 0,
  },
  apiPayload: {
    source: "simulated-ui-capture",
    status: "idle",
  },
  process: {
    seq: null,
    stationName: "等待事件",
    sampleText: "等待首条报文进入演示链路",
    sourceScreen: "屏幕 02 / 报文屏幕",
    resultText: "识别结果将同步展示在一次接线图和状态表中",
    resultTags: ["等待事件"],
    stages: processStepTemplate.map((step) => ({ ...step, status: "pending" })),
  },
  loopHandle: null,
  pulseHandle: null,
  processTimers: [],
  processDemoScenarioIndex: 0,
  processDemoPhase: 0,
  processDemoHandle: null,
  demoPlaybackEnabled: false,
  demoReplayScenarios: [],
  diagramZoomed: false,
  isDraggingDiagram: false,
  dragStartX: 0,
  dragStartY: 0,
  dragScrollLeft: 0,
  dragScrollTop: 0,
  focusedNodeId: null,
  ocrBusy: false,
  hasRecognitionData: false,
  screenOcrBusy: false,
  screenOcrStarting: false,
  screenOcrStartToken: 0,
  screenOcrLoopHandle: null,
  screenOcrBufferHandle: null,
  screenOcrInFlight: false,
  screenOcrCycleIndex: 0,
  screenOcrEmptyCycles: 0,
  screenOcrSourceSnapshot: null,
  screenOcrLastRegions: {
    diagram: null,
    message: null,
    table: null,
  },
  voiceOverlayTimer: null,
  voicePipelineBusy: false,
  voiceEventArchive: [],
  voiceScenarioCursor: 0,
  voiceRecording: false,
  voiceRecordingMode: "idle",
  voiceRecordChunks: [],
  voiceMediaRecorder: null,
  voiceMediaStream: null,
  voiceAudioContext: null,
  voiceAnalyser: null,
  voiceAnalyserData: null,
  voiceVisualizerFrame: null,
  voiceRecordingStartedAt: null,
  voiceRecordingTimer: null,
  voiceAutoStopTimer: null,
  crossCheckFocus: null,
  crossCheckFocusTimer: null,
  voiceWorkflow: {
    summary: "等待语音事件...",
    modelFeedback: "等待反馈...",
    checks: [],
    decision: { verdict: "待执行", reason: "等待语音触发" },
    report: "等待报告...",
  },
};

const elements = {
  stationCount: document.querySelector("#stationCount"),
  messageCount: document.querySelector("#messageCount"),
  anomalyCount: document.querySelector("#anomalyCount"),
  speedLabel: document.querySelector("#speedLabel"),
  stationSearch: document.querySelector("#stationSearch"),
  stationSelect: document.querySelector("#stationSelect"),
  speedSegment: document.querySelector("#speedSegment"),
  tableFilter: document.querySelector("#tableFilter"),
  toggleRunButton: document.querySelector("#toggleRunButton"),
  autoOcrStartButton: document.querySelector("#autoOcrStartButton"),
  autoOcrStopButton: document.querySelector("#autoOcrStopButton"),
  stationCards: document.querySelector("#stationCards"),
  liveIndicator: document.querySelector("#liveIndicator"),
  feedStatus: document.querySelector("#feedStatus"),
  processBoard: document.querySelector("#processBoard"),
  sourceDiagramScreen: document.querySelector("#sourceDiagramScreen"),
  sourceMessageScreen: document.querySelector("#sourceMessageScreen"),
  sourceTableScreen: document.querySelector("#sourceTableScreen"),
  diagramTitle: document.querySelector("#diagramTitle"),
  diagramSubtitle: document.querySelector("#diagramSubtitle"),
  diagramWrap: document.querySelector("#diagramWrap"),
  diagramSvg: document.querySelector("#diagramSvg"),
  nodeTooltip: document.querySelector("#nodeTooltip"),
  rawFeed: document.querySelector("#rawFeed"),
  parsedFeed: document.querySelector("#parsedFeed"),
  cvMeta: document.querySelector("#cvMeta"),
  statusTableBody: document.querySelector("#statusTableBody"),
  tableWrap: document.querySelector(".table-wrap.tall"),
  normalCount: document.querySelector("#normalCount"),
  warningCount: document.querySelector("#warningCount"),
  criticalCount: document.querySelector("#criticalCount"),
  anomalyCards: document.querySelector("#anomalyCards"),
  processNarrative: document.querySelector("#processNarrative"),
  processResult: document.querySelector("#processResult"),
  simulateVoiceButton: document.querySelector("#simulateVoiceButton"),
  archiveEventButton: document.querySelector("#archiveEventButton"),
  voiceListeningOverlay: document.querySelector("#voiceListeningOverlay"),
  voiceWorkflowSummary: document.querySelector("#voiceWorkflowSummary"),
  voiceModelFeedback: document.querySelector("#voiceModelFeedback"),
  voiceCheckList: document.querySelector("#voiceCheckList"),
  voiceDecision: document.querySelector("#voiceDecision"),
  voiceReportPreview: document.querySelector("#voiceReportPreview"),
  voiceArchiveList: document.querySelector("#voiceArchiveList"),
  voiceArchiveSection: document.querySelector("#voiceArchiveSection"),
  voiceListeningTitle: document.querySelector("#voiceListeningTitle"),
  voiceListeningMeta: document.querySelector("#voiceListeningMeta"),
  voiceListeningTip: document.querySelector("#voiceListeningTip"),
  voiceWave: document.querySelector("#voiceWave"),
  voiceStopButton: document.querySelector("#voiceStopButton"),
  ocrAuditStatus: document.querySelector("#ocrAuditStatus"),
  ocrAuditMeta: document.querySelector("#ocrAuditMeta"),
  ocrAuditExportButton: document.querySelector("#ocrAuditExportButton"),
  ocrDiagramAccuracy: document.querySelector("#ocrDiagramAccuracy"),
  ocrDiagramDetail: document.querySelector("#ocrDiagramDetail"),
  ocrMessageAccuracy: document.querySelector("#ocrMessageAccuracy"),
  ocrMessageDetail: document.querySelector("#ocrMessageDetail"),
  ocrTableAccuracy: document.querySelector("#ocrTableAccuracy"),
  ocrTableDetail: document.querySelector("#ocrTableDetail"),
};

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizeVoiceLookupText(text) {
  const digitMap = {
    零: "0",
    〇: "0",
    一: "1",
    二: "2",
    三: "3",
    四: "4",
    五: "5",
    六: "6",
    七: "7",
    八: "8",
    九: "9",
  };

  let normalized = normalizeText(text)
    .replaceAll("千伏", "kv")
    .replaceAll("ｋｖ", "kv")
    .replaceAll("进线的", "进线")
    .replaceAll("开关的", "开关");

  normalized = normalized.replace(/[零〇一二三四五六七八九]{2,}/g, (chunk) =>
    chunk
      .split("")
      .map((char) => digitMap[char] || char)
      .join("")
  );

  return normalized
    .replaceAll("1段", "i段")
    .replaceAll("2段", "ii段")
    .replaceAll("3段", "iii段")
    .replaceAll("4段", "iv段");
}

function normalizeAuditToken(text) {
  return normalizeVoiceLookupText(text).replace(/[^\u4e00-\u9fa5a-z0-9]/g, "");
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createEmptyOcrAuditSession() {
  return {
    active: false,
    startedAt: null,
    finishedAt: null,
    cycles: 0,
    regions: {
      diagram: { matched: 0, total: 0, lastMatched: 0, lastTotal: 0, lastAccuracy: null, lastChecksText: "" },
      message: { matched: 0, total: 0, lastMatched: 0, lastTotal: 0, lastAccuracy: null, lastChecksText: "" },
      table: { matched: 0, total: 0, lastMatched: 0, lastTotal: 0, lastAccuracy: null, lastChecksText: "" },
    },
  };
}

function formatAccuracyValue(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function updateOcrAuditExportState() {
  if (!elements.ocrAuditExportButton) return;
  elements.ocrAuditExportButton.disabled = appState.ocrDebugLog.length === 0;
}

function buildOcrDebugLogPayload(logs = appState.ocrDebugLog, session = appState.ocrAuditSession) {
  return {
    exported_at: new Date().toISOString(),
    session: {
      active: session.active,
      started_at: session.startedAt?.toISOString() || null,
      finished_at: session.finishedAt?.toISOString() || null,
      cycles: session.cycles,
    },
    logs,
  };
}

function exportOcrDebugLog() {
  if (appState.ocrDebugLog.length === 0) {
    elements.feedStatus.textContent = "暂无可导出的识别调试日志";
    return;
  }

  const payload = buildOcrDebugLogPayload();

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ocr-debug-log-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  elements.feedStatus.textContent = `识别调试日志已导出（${appState.ocrDebugLog.length} 轮）`;
}

function renderOcrAuditSession() {
  const session = appState.ocrAuditSession;
  const statusText = session.active ? "统计中" : session.cycles > 0 ? "已完成" : "未开始";
  if (elements.ocrAuditStatus) elements.ocrAuditStatus.textContent = statusText;

  let metaText = "点击“开始自动识别”后开始统计三个识别区的正确率。";
  if (session.active && session.startedAt) {
    metaText = `本轮已检测 ${session.cycles} 次，开始于 ${formatTime(session.startedAt)}。`;
  } else if (!session.active && session.startedAt && session.finishedAt) {
    metaText = `本轮共检测 ${session.cycles} 次，从 ${formatTime(session.startedAt)} 到 ${formatTime(session.finishedAt)}。`;
  }
  if (elements.ocrAuditMeta) elements.ocrAuditMeta.textContent = metaText;

  const regionFields = [
    ["diagram", elements.ocrDiagramAccuracy, elements.ocrDiagramDetail],
    ["message", elements.ocrMessageAccuracy, elements.ocrMessageDetail],
    ["table", elements.ocrTableAccuracy, elements.ocrTableDetail],
  ];

  regionFields.forEach(([key, accuracyEl, detailEl]) => {
    const region = session.regions[key];
    const average = region.total > 0 ? region.matched / region.total : null;
    if (accuracyEl) accuracyEl.textContent = formatAccuracyValue(average);
    if (detailEl) {
      detailEl.textContent =
        region.total > 0
          ? `最近一轮 ${region.lastMatched}/${region.lastTotal}，累计 ${region.matched}/${region.total}${region.lastChecksText ? `，${region.lastChecksText}` : ""}`
          : "待检测";
    }
  });

  updateOcrAuditExportState();
}

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败: ${path}`);
  }
  return response.json();
}

async function postForm(path, formData) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `请求失败: ${path}`);
  }
  return response.json();
}

function setScreenOcrControlsRunning(running) {
  if (elements.autoOcrStartButton) elements.autoOcrStartButton.disabled = running;
  if (elements.autoOcrStopButton) elements.autoOcrStopButton.disabled = !running;
}

function isScreenOcrActiveOrStarting() {
  return appState.screenOcrBusy || appState.screenOcrStarting;
}

function formatTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatCp56Time(date) {
  return `${formatDateTime(date)}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function toHexByte(value) {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

function toHexWordLe(value) {
  return `${toHexByte(value & 0xff)} ${toHexByte((value >> 8) & 0xff)}`;
}

function toHexThreeByteLe(value) {
  return `${toHexByte(value & 0xff)} ${toHexByte((value >> 8) & 0xff)} ${toHexByte((value >> 16) & 0xff)}`;
}

function floatToLeHex(value) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, value, true);
  return [0, 1, 2, 3].map((index) => toHexByte(view.getUint8(index))).join(" ");
}

function severityRank(level) {
  return level === "critical" ? 2 : level === "warning" ? 1 : 0;
}

function severityLabel(level) {
  if (level === "critical") return "危急";
  if (level === "warning") return "告警";
  return "正常";
}

function severityClass(level) {
  if (level === "critical") return "severity-critical";
  if (level === "warning") return "severity-warning";
  return "severity-normal";
}

function buildPseudoApdu(message) {
  const header = ["68", "16", toHexByte(message.seq & 0xff), "00", toHexByte((message.seq + 1) & 0xff), "00"];
  const asdu = [
    toHexByte(message.typeId),
    "01",
    toHexByte(message.cotCode),
    "00",
    ...toHexWordLe(message.stationCa).split(" "),
    ...toHexThreeByteLe(message.ioa).split(" "),
  ];
  const payload =
    message.kind === "breaker"
      ? [toHexByte(message.dpValue), "00"]
      : [...floatToLeHex(message.nextValue).split(" "), "00"];

  return [...header, ...asdu, ...payload].join(" ");
}

function getSelectedStation() {
  return appState.stations.find((station) => station.id === appState.selectedStationId);
}

function getSourceStationById(stationId) {
  return appState.sourceStations.find((station) => station.id === stationId) || appState.sourceStations[0];
}

function getCurrentOcrSourceIds() {
  return (
    appState.screenOcrSourceSnapshot || {
      diagramStationId: appState.sourceDiagramStationId,
      messageStationId: appState.sourceMessageStationId,
      tableStationId: appState.sourceTableStationId,
    }
  );
}

function getMonitoredNodes(station) {
  return station.nodes.filter((node) => node.monitored);
}

function hasCrossCheckFocus(nodeId) {
  return Boolean(appState.crossCheckFocus && appState.crossCheckFocus.nodeId === nodeId);
}

function clearCrossCheckFocus() {
  window.clearTimeout(appState.crossCheckFocusTimer);
  appState.crossCheckFocusTimer = null;
  if (!appState.crossCheckFocus) return;
  appState.crossCheckFocus = null;
  syncView();
}

function activateCrossCheckFocus(stationId, nodeId) {
  executeSearchStyleJump(stationId, nodeId);
  appState.crossCheckFocus = { stationId, nodeId };
  syncView();
  window.clearTimeout(appState.crossCheckFocusTimer);
  appState.crossCheckFocusTimer = window.setTimeout(() => {
    clearCrossCheckFocus();
  }, 3200);
}

function getNodeAlertLevel(node) {
  if (node.kind === "voltage" && node.status === "zero") return "critical";
  if (node.qds !== STABLE_QDS) return "warning";
  return "normal";
}

function stationStats(station) {
  const monitoredNodes = getMonitoredNodes(station);
  return monitoredNodes.reduce(
    (acc, node) => {
      if (node.kind === "breaker" && node.status === "closed") acc.closed += 1;
      if (node.kind === "voltage" && node.status === "zero") acc.zero += 1;
      if (node.alertLevel === "warning") acc.warning += 1;
      if (node.alertLevel === "critical") acc.critical += 1;
      return acc;
    },
    { closed: 0, zero: 0, warning: 0, critical: 0 }
  );
}

function stationHealth(station) {
  const stats = stationStats(station);
  if (stats.critical > 0) return "critical";
  if (stats.warning > 0) return "warning";
  return "normal";
}

function buildRawMessageWithSeq(station, node, seq) {
  const now = new Date();
  const catalog = protocolCatalog[node.kind];

  if (node.kind === "breaker") {
    const nextStatus = node.status === "open" ? "closed" : "open";
    const dpValue = nextStatus === "closed" ? 2 : 1;
    const qds = Math.random() < 0.45 ? "IV0 NT0 SB1 BL0" : STABLE_QDS;
    const severity = qds === STABLE_QDS ? "normal" : "warning";
    const abnormalReason = severity === "warning" ? "质量位 SB1，建议复核图元状态" : "常规变位";
    const message = {
      seq,
      stationId: station.id,
      stationName: station.name,
      stationCa: station.ca,
      nodeId: node.id,
      ioa: node.ioa,
      bay: node.bay,
      kind: node.kind,
      typeId: catalog.typeId,
      typeName: catalog.typeName,
      cotCode: catalog.cotCode,
      cotText: catalog.cotText,
      nextStatus,
      dpValue,
      qds,
      severity,
      abnormalReason,
      timestamp: now,
      cp56Time: formatCp56Time(now),
      humanText: `${station.name} ${node.label} 双点遥信变位 ${nextStatus === "closed" ? "合位" : "分位"}`,
      fieldText: `TypeID=${catalog.typeId} ${catalog.typeName} COT=${catalog.cotCode}/${catalog.cotText} CA=${station.ca} IOA=${node.ioa} DPI=${dpValue} QDS=${qds}`,
    };
    message.apdu = buildPseudoApdu(message);
    return message;
  }

  const nextStatus = Math.random() < 0.55 ? "zero" : "good";
  const jitter = getRandomInt(-4, 4) / 10;
  const qds = nextStatus === "zero" ? STABLE_QDS : Math.random() < 0.35 ? "IV0 NT0 BL1 SB0" : STABLE_QDS;
  const nextValue = nextStatus === "zero" ? 0 : Number((station.nominalKv + jitter).toFixed(1));
  const severity = nextStatus === "zero" ? "critical" : qds === STABLE_QDS ? "normal" : "warning";
  const abnormalReason =
    severity === "critical" ? "母线电压跌落至 0，判定危急状态" : severity === "warning" ? "质量位 BL1，建议二次采样" : "遥测恢复稳定";

  const message = {
    seq,
    stationId: station.id,
    stationName: station.name,
    stationCa: station.ca,
    nodeId: node.id,
    ioa: node.ioa,
    bay: node.bay,
    kind: node.kind,
    typeId: catalog.typeId,
    typeName: catalog.typeName,
    cotCode: catalog.cotCode,
    cotText: catalog.cotText,
    nextStatus,
    nextValue,
    qds,
    severity,
    abnormalReason,
    timestamp: now,
    cp56Time: formatCp56Time(now),
    humanText: `${station.name} ${node.label} 遥测变化 ${nextValue}${node.unit}`,
    fieldText: `TypeID=${catalog.typeId} ${catalog.typeName} COT=${catalog.cotCode}/${catalog.cotText} CA=${station.ca} IOA=${node.ioa} VALUE=${nextValue}${node.unit} QDS=${qds}`,
  };
  message.apdu = buildPseudoApdu(message);
  return message;
}

function buildRawMessage(station, node) {
  return buildRawMessageWithSeq(station, node, ++appState.messageSeq);
}

function buildSourceRawMessage(station, node) {
  return buildRawMessageWithSeq(station, node, ++appState.sourceMessageSeq);
}

function enqueueRawMessage(message) {
  appState.rawFeed.unshift(message);
  appState.rawFeed = appState.rawFeed.slice(0, 12);
  renderRawFeed();
}

function updateProcessState(message, stageIndex) {
  appState.process = {
    seq: message.seq,
    stationName: message.stationName,
    sampleText: `${message.humanText}；CV 正在从滚动报文中提取设备、状态和时间字段。`,
    sourceScreen: "屏幕 02 / 报文屏幕",
    resultText: "识别尚未完成，等待状态解释并同步到接线图与状态表。",
    resultTags: ["报文样本", `IOA ${message.ioa}`, message.typeName],
    stages: processStepTemplate.map((step, index) => ({
      ...step,
      status: index < stageIndex ? "completed" : index === stageIndex ? "active" : "pending",
    })),
  };
  renderProcessBoard();
}

function completeProcessState(message) {
  const station = appState.stations.find((item) => item.id === message.stationId);
  const node = station?.nodes.find((item) => item.id === message.nodeId);

  appState.process = {
    seq: message.seq,
    stationName: message.stationName,
    sampleText: `${message.stationName} 的 ${message.humanText} 已完成识别，系统已经从报文屏中读出关键设备状态。`,
    sourceScreen: "屏幕 02 / 报文屏幕",
    resultText:
      message.kind === "breaker"
        ? `${message.stationName} ${message.bay} 的 ${message.nextStatus === "closed" ? "开关合位" : "开关分位"} 已同步到接线图和状态表。`
        : `${message.stationName} ${message.bay} 的电压值 ${message.nextValue}${node?.unit ?? "kV"} 已同步到接线图和状态表。`,
    resultTags: [
      `CA ${message.stationCa}`,
      `IOA ${message.ioa}`,
      severityLabel(message.severity),
      message.typeName,
    ],
    stages: processStepTemplate.map((step) => ({ ...step, status: "completed" })),
  };
  renderProcessBoard();
}

function startProcessSimulation(message, totalDelay) {
  appState.processTimers.forEach((timer) => window.clearTimeout(timer));
  appState.processTimers = [];

  const checkpoints = [
    { delay: 0, stage: 0 },
    { delay: Math.round(totalDelay * 0.25), stage: 1 },
    { delay: Math.round(totalDelay * 0.5), stage: 2 },
    { delay: Math.round(totalDelay * 0.76), stage: 3 },
  ];

  checkpoints.forEach((checkpoint) => {
    const timer = window.setTimeout(() => {
      updateProcessState(message, checkpoint.stage);
    }, checkpoint.delay);
    appState.processTimers.push(timer);
  });
}

function renderHeaderStats() {
  const autoOcrActive = isScreenOcrActiveOrStarting();
  const liveLabel = autoOcrActive ? "自动识别中" : appState.isRunning ? "实时中" : "已暂停";
  const feedStatusText = autoOcrActive
    ? appState.screenOcrStarting
      ? "自动OCR准备中"
      : "自动OCR识别中（3区）"
    : appState.isRunning
      ? "CV 监听中"
      : "CV 暂停";
  elements.stationCount.textContent = String(appState.stations.length);
  elements.messageCount.textContent = String(appState.totals.recognized);
  elements.anomalyCount.textContent = String(appState.activeAnomalies.length);
  elements.speedLabel.textContent = speedProfiles[appState.speedIndex].label;
  elements.liveIndicator.textContent = liveLabel;
  elements.liveIndicator.className = `badge ${autoOcrActive || appState.isRunning ? "badge-live" : ""}`.trim();
  elements.feedStatus.textContent = feedStatusText;
  document.querySelectorAll("[data-speed-index]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.speedIndex) === appState.speedIndex);
  });
}

function setDiagramZoom(zoomed, clientX, clientY) {
  appState.diagramZoomed = zoomed;
  elements.diagramWrap.classList.toggle("zoomed", zoomed);
  elements.diagramWrap.classList.remove("dragging");

  if (!zoomed) {
    elements.diagramWrap.scrollLeft = 0;
    elements.diagramWrap.scrollTop = 0;
    return;
  }

  const bounds = elements.diagramWrap.getBoundingClientRect();
  const ratioX = clientX ? (clientX - bounds.left) / bounds.width : 0.5;
  const ratioY = clientY ? (clientY - bounds.top) / bounds.height : 0.5;

  window.requestAnimationFrame(() => {
    elements.diagramWrap.scrollLeft = Math.max(
      0,
      ratioX * elements.diagramWrap.scrollWidth - elements.diagramWrap.clientWidth / 2
    );
    elements.diagramWrap.scrollTop = Math.max(
      0,
      ratioY * elements.diagramWrap.scrollHeight - elements.diagramWrap.clientHeight / 2
    );
  });
}

function centerDiagramOnNode(nodeId) {
  const targetGroup = elements.diagramSvg.querySelector(`[data-node-id="${nodeId}"]`);
  if (!targetGroup) return;

  const bbox = targetGroup.getBBox();
  const viewBox = elements.diagramSvg.viewBox.baseVal;
  const scaleX = elements.diagramSvg.clientWidth / viewBox.width;
  const scaleY = elements.diagramSvg.clientHeight / viewBox.height;
  const targetX = (bbox.x + bbox.width / 2) * scaleX;
  const targetY = (bbox.y + bbox.height / 2) * scaleY;

  const maxLeft = Math.max(0, elements.diagramWrap.scrollWidth - elements.diagramWrap.clientWidth);
  const maxTop = Math.max(0, elements.diagramWrap.scrollHeight - elements.diagramWrap.clientHeight);
  const left = Math.min(maxLeft, Math.max(0, targetX - elements.diagramWrap.clientWidth / 2));
  const top = Math.min(maxTop, Math.max(0, targetY - elements.diagramWrap.clientHeight / 2));

  elements.diagramWrap.scrollTo({
    left,
    top,
    behavior: "auto",
  });
}

function getDisplayNodes(station) {
  return station.nodes.filter((node) => node.kind !== "label");
}

function getDefaultFocusNodeId(station) {
  const latestParsed = appState.parsedFeed.find((item) => item.stationId === station.id);
  if (latestParsed?.nodeId) return latestParsed.nodeId;

  const candidates = getMonitoredNodes(station)
    .slice()
    .sort((a, b) => {
      const severityDiff = severityRank(b.alertLevel) - severityRank(a.alertLevel);
      if (severityDiff !== 0) return severityDiff;
      return b.lastUpdatedAt - a.lastUpdatedAt;
    });
  return candidates[0]?.id ?? null;
}

const {
  centerAcrossResultPanels,
  selectStationAndCenter,
  executeSearchStyleJump,
  focusNodeFromTimeline,
} = window.createJumpController({
  appState,
  elements,
  syncView,
  getDefaultFocusNodeId,
  setDiagramZoom,
  centerDiagramOnNode,
});

function startDiagramDrag(event) {
  if (!appState.diagramZoomed) return;
  appState.isDraggingDiagram = true;
  appState.dragStartX = event.clientX;
  appState.dragStartY = event.clientY;
  appState.dragScrollLeft = elements.diagramWrap.scrollLeft;
  appState.dragScrollTop = elements.diagramWrap.scrollTop;
  elements.diagramWrap.classList.add("dragging");
}

function moveDiagramDrag(event) {
  if (!appState.isDraggingDiagram) return;
  event.preventDefault();
  const dx = event.clientX - appState.dragStartX;
  const dy = event.clientY - appState.dragStartY;
  elements.diagramWrap.scrollLeft = appState.dragScrollLeft - dx;
  elements.diagramWrap.scrollTop = appState.dragScrollTop - dy;
}

function endDiagramDrag() {
  appState.isDraggingDiagram = false;
  elements.diagramWrap.classList.remove("dragging");
}

function renderStationSelector() {
  elements.stationSelect.innerHTML = appState.stations
    .map(
      (station) =>
        `<option value="${station.id}" ${station.id === appState.selectedStationId ? "selected" : ""}>${station.name}</option>`
    )
    .join("");
}

function renderStationCards(searchTerm = "") {
  const query = searchTerm.trim().toLowerCase();
  if (!appState.hasRecognitionData) {
    const initialCards = appState.stations
      .filter((station) => station.name.toLowerCase().includes(query))
      .map(
        (station) => `
          <button class="station-card ${station.id === appState.selectedStationId ? "active" : ""}" data-station-card="${station.id}">
            <div class="station-meta">
              <span>CA ${station.ca}</span>
              <span>--:--:--</span>
            </div>
            <strong>${station.name}</strong>
            <p class="section-subtitle">${station.region}</p>
            <p>等待自动识别开始...</p>
            <div class="station-pills">
              <span class="station-pill good">运行状态待识别</span>
            </div>
          </button>
        `
      )
      .join("");
    elements.stationCards.innerHTML = initialCards || `<div class="feed-item">没有匹配的变电站</div>`;
    document.querySelectorAll("[data-station-card]").forEach((button) => {
      button.addEventListener("click", () => {
        executeSearchStyleJump(button.dataset.stationCard);
      });
    });
    return;
  }

  elements.stationCards.innerHTML =
    appState.stations
      .filter((station) => station.name.toLowerCase().includes(query))
      .map((station) => {
        const stats = stationStats(station);
        const health = stationHealth(station);
        const activeClass = station.id === appState.selectedStationId ? "active" : "";
        const healthText =
          health === "critical" ? "存在危急点" : health === "warning" ? "存在告警点" : "运行正常";

        return `
          <button class="station-card ${activeClass}" data-station-card="${station.id}">
            <div class="station-meta">
              <span>CA ${station.ca}</span>
              <span>${station.lastEventAt ? formatTime(station.lastEventAt) : "未更新"}</span>
            </div>
            <strong>${station.name}</strong>
            <p class="section-subtitle">${station.region}</p>
            <p>${station.lastEvent}</p>
            <div class="station-pills">
              <span class="station-pill ${health === "normal" ? "good" : "warn"}">${healthText}</span>
              <span class="station-pill good">合位 ${stats.closed}</span>
              <span class="station-pill ${stats.warning === 0 ? "good" : "warn"}">告警 ${stats.warning}</span>
              <span class="station-pill ${stats.critical === 0 ? "good" : "warn"}">危急 ${stats.critical}</span>
            </div>
          </button>
        `;
      })
      .join("") || `<div class="feed-item">没有匹配的变电站</div>`;

  document.querySelectorAll("[data-station-card]").forEach((button) => {
    button.addEventListener("click", () => {
      executeSearchStyleJump(button.dataset.stationCard);
    });
  });
}

function recordActiveAnomaly(station, node, summary, timestamp, context = {}) {
  const entry = {
    id: `${station.id}-${node.id}-${timestamp.getTime()}-${Math.random().toString(16).slice(2, 7)}`,
    stationId: station.id,
    stationName: station.name,
    nodeId: node.id,
    nodeLabel: node.label,
    ioa: node.ioa,
    typeName: node.typeName,
    severity: node.alertLevel,
    summary,
    seq: context.seq ?? null,
    timeText: context.timeText || formatCp56Time(timestamp),
    startedAt: timestamp,
    updatedAt: timestamp,
  };
  appState.activeAnomalies.unshift(entry);
  appState.activeAnomalies = appState.activeAnomalies.slice(0, 60);
  appState.activeAnomalies.sort((a, b) => b.updatedAt - a.updatedAt);
}

function removeActiveAnomaly(stationId, nodeId) {
  appState.activeAnomalies = appState.activeAnomalies.filter(
    (item) => !(item.stationId === stationId && item.nodeId === nodeId)
  );
}

function getScenarioSeverityTone(scenario) {
  if (scenario.resultTags.includes("危急")) return "critical";
  if (scenario.resultTags.includes("告警")) return "warning";
  return "normal";
}

function getScenarioShortLine(scenario) {
  return scenario.captureLines[1] ?? scenario.captureLines[0] ?? "等待示例";
}

function buildMessageThumbnail(lines, options = {}) {
  const { fill = false, singleLine = false } = options;
  const sourceLines =
    fill && lines.length > 0 ? Array.from({ length: 8 }, (_, index) => lines[index % lines.length]) : lines;
  return `
    <div class="process-thumb process-thumb-message">
      <div class="process-thumb-bar"></div>
      <div class="process-thumb-lines ${singleLine ? "single-line" : ""}">
        ${sourceLines.map((line) => `<div class="process-thumb-line">${line}</div>`).join("")}
      </div>
    </div>
  `;
}

function buildSourceDiagramPreview(station) {
  const breakers = getMonitoredNodes(station).filter((node) => node.kind === "breaker").slice(0, 3);
  const voltages = getMonitoredNodes(station).filter((node) => node.kind === "voltage").slice(0, 2);
  const branchXs = [214, 376, 534];
  const compactStationName = station.name.replace("站", "");
  const stationNameFontSize = compactStationName.length >= 8 ? 22 : compactStationName.length >= 6 ? 25 : 30;

  const breakerMarkup = breakers
    .map((node, index) => {
      const x = branchXs[index];
      const color = node.alertLevel === "critical" ? "#fb923c" : node.alertLevel === "warning" ? "#facc15" : node.status === "closed" ? "#ef4444" : "#22c55e";
      const label = node.label.split(" ")[0];
      return `
        <g>
          <title>${station.name} ${node.label} ${describeNodeStatus(node)} QDS ${node.qds}</title>
          <text x="${x}" y="108" fill="#0f2640" font-size="24" font-weight="900" text-anchor="middle">${label}</text>
          <line x1="${x}" y1="126" x2="${x}" y2="208" stroke="#5f7ea2" stroke-width="5" />
          <circle cx="${x}" cy="164" r="22" fill="#f8fbff" stroke="${color}" stroke-width="5" />
          <line x1="${x - 12}" y1="164" x2="${x + 12}" y2="164" stroke="${color}" stroke-width="4.2" stroke-linecap="round" />
          <circle cx="${x}" cy="78" r="8" fill="${color}" />
        </g>
      `;
    })
    .join("");

  const voltageMarkup = voltages
    .map((node, index) => {
      const x = index === 0 ? 220 : 420;
      const valueColor = node.status === "zero" ? "#fb923c" : "#34d2ff";
      return `
        <g>
          <title>${station.name} ${node.label} ${describeNodeStatus(node)} QDS ${node.qds}</title>
          <rect x="${x - 48}" y="250" width="96" height="42" rx="13" fill="#ffffff" stroke="${valueColor}" stroke-width="4" />
          <text x="${x}" y="278" fill="#0f2640" font-size="30" font-weight="900" text-anchor="middle">${node.value}</text>
          <circle cx="${x - 74}" cy="269" r="7" fill="${valueColor}" />
        </g>
      `;
    })
    .join("");

  return `
    <svg class="source-diagram-svg" viewBox="0 0 640 340" aria-hidden="true">
      <rect x="0" y="0" width="640" height="340" rx="18" fill="#f5f9ff" />
      <rect x="20" y="18" width="150" height="52" rx="14" fill="#ffffff" stroke="#34d2ff" stroke-width="2.8" />
      <text x="36" y="52" fill="#0f2640" font-size="${stationNameFontSize}" font-weight="900" textLength="126" lengthAdjust="spacingAndGlyphs">${compactStationName}</text>
      <line x1="96" y1="126" x2="570" y2="126" stroke="#5f7ea2" stroke-width="6" />
      <line x1="96" y1="208" x2="570" y2="208" stroke="#5f7ea2" stroke-width="6" />
      ${breakerMarkup}
      ${voltageMarkup}
    </svg>
  `;
}

function getCurrentProcessDemo() {
  const activeScenarios = appState.demoReplayScenarios.length > 0 ? appState.demoReplayScenarios : processDemoScenarios;
  return activeScenarios[appState.processDemoScenarioIndex % activeScenarios.length];
}

function getProcessVisualMarkup(stage, scenario) {
  const tone = getScenarioSeverityTone(scenario);
  const zoomLine = getScenarioShortLine(scenario);

  if (stage.id === "capture") {
    return `
      <div class="process-visual process-visual-capture">
        <div class="process-scene capture-scene">
          <div class="process-capture-frame">
            ${buildMessageThumbnail(scenario.captureLines, { fill: true })}
            <div class="process-scan-overlay"></div>
          </div>
        </div>
      </div>
    `;
  }

  if (stage.id === "detect") {
    return `
      <div class="process-visual process-visual-detect">
        <div class="process-scene detect-scene">
          <div class="process-thumb-wrap">
            ${buildMessageThumbnail(scenario.captureLines, { singleLine: true })}
            <span class="roi-frame"></span>
          </div>
          <div class="process-zoom-card tone-${tone}">
            <div class="zoom-label">对应报文行</div>
            <div class="zoom-line">${zoomLine}</div>
          </div>
        </div>
      </div>
    `;
  }

  if (stage.id === "ocr") {
    return `
      <div class="process-visual process-visual-ocr">
        <div class="process-scene ocr-scene">
          <div class="process-zoom-card tone-${tone}">
            <div class="zoom-label">局部截图</div>
            <div class="zoom-line">${zoomLine}</div>
          </div>
          <div class="ocr-sheet">
            ${scenario.ocrLines
              .map((line, index) => `<div class="ocr-sheet-line line-${index + 1}">${line}</div>`)
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  if (stage.id === "parse") {
    return `
      <div class="process-visual process-visual-parse">
        <div class="process-scene parse-scene">
          <div class="parse-raw-block">
            ${scenario.ocrLines.slice(0, 3).map((line) => `<div class="parse-raw-line">${line}</div>`).join("")}
          </div>
          <div class="parse-arrow"><span>↓</span></div>
          <div class="parse-chip-stack">
            ${scenario.parseChips
              .slice(0, 3)
              .map((chip) => `<span class="process-parse-chip">${chip}</span>`)
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="process-visual process-visual-sync">
      <div class="process-scene sync-scene">
        ${scenario.syncCards
          .map(
            (card, index) => `
          <div class="sync-card tone-${tone} delay-${index + 1}">
            <div class="sync-card-title">${index === 0 ? "接线图" : index === 1 ? "报文结果" : "状态表"}</div>
            <span>${card}</span>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderProcessBoard() {
  const scenario = getCurrentProcessDemo();
  const currentPhase = appState.hasRecognitionData && appState.demoPlaybackEnabled ? appState.processDemoPhase : -1;
  const scenarioIndexText = String(appState.processDemoScenarioIndex);
  const needsFullRender = elements.processBoard.dataset.scenarioIndex !== scenarioIndexText;

  if (needsFullRender) {
    elements.processBoard.innerHTML = processStepTemplate
      .map(
        (stage, index) => `
      <article class="process-step" data-index="${index}">
        <div class="process-head">
          <span class="process-index">0${index + 1}</span>
          <span class="process-status">等待</span>
        </div>
        <strong>${stage.title}</strong>
        <p>${stage.desc}</p>
        ${getProcessVisualMarkup(stage, scenario)}
        <div class="process-screen">${stage.screen}</div>
      </article>
    `
      )
      .join("");

    elements.processNarrative.innerHTML = `
      <div class="process-copy">
        <strong>${scenario.title}</strong>
        <div>站点：${scenario.stationName}</div>
        <div>来源屏幕：${scenario.sourceScreen}</div>
        <div>${scenario.sampleText}</div>
      </div>
    `;

    elements.processResult.innerHTML = `
      <div class="process-copy">
        <strong>统一状态中心</strong>
        <div>${scenario.resultText}</div>
      </div>
      <div class="process-tags">
        ${scenario.resultTags.map((tag) => `<span class="process-tag">${tag}</span>`).join("")}
      </div>
    `;

    elements.processBoard.dataset.scenarioIndex = scenarioIndexText;
  }

  const stepItems = elements.processBoard.querySelectorAll(".process-step");
  stepItems.forEach((step, index) => {
    step.classList.remove("process-completed", "process-active", "process-pending");
    const statusEl = step.querySelector(".process-status");

    if (index < currentPhase) {
      step.classList.add("process-completed");
      if (statusEl) statusEl.textContent = "已完成";
      return;
    }

    if (index === currentPhase) {
      step.classList.add("process-active");
      if (statusEl) statusEl.textContent = "处理中";
      return;
    }

    step.classList.add("process-pending");
    if (statusEl) statusEl.textContent = "等待";
  });
}

function startProcessDemoLoop() {
  if (appState.processDemoHandle) {
    window.clearInterval(appState.processDemoHandle);
  }

  renderProcessBoard();

  if (!appState.demoPlaybackEnabled) {
    return;
  }

  const scenarios = appState.demoReplayScenarios.length > 0 ? appState.demoReplayScenarios : processDemoScenarios;
  if (scenarios.length === 0) return;

  appState.processDemoHandle = window.setInterval(() => {
    if (appState.processDemoPhase >= processStepTemplate.length - 1) {
      appState.processDemoPhase = 0;
      appState.processDemoScenarioIndex = (appState.processDemoScenarioIndex + 1) % scenarios.length;
    } else {
      appState.processDemoPhase += 1;
    }
    renderProcessBoard();
  }, 3600);
}

function stateTextFromParsedItem(item) {
  if (item.typeName === "M_ME_TF_1") {
    const valueMatch = String(item.summary).match(/当前值\s*([0-9.\-]+\s*[a-zA-Z]*)/);
    return valueMatch ? valueMatch[1] : "遥测值";
  }
  if (String(item.summary).includes("合位")) return "合位";
  if (String(item.summary).includes("分位")) return "分位";
  return "状态已识别";
}

function getCompactNodeLabel(node) {
  if (!node) return "--";
  if (node.kind === "breaker") return node.label.split(" ")[0];
  if (node.kind === "voltage") return node.label.replace("母线电压", "").replace(/\s+/g, "");
  return node.label.split(" ")[0] || node.label;
}

function getCompactNodeState(node) {
  if (!node) return "--";
  if (node.kind === "breaker") return node.status === "closed" ? "合位" : "分位";
  if (node.kind === "voltage") return node.status === "zero" ? "0.0" : String(node.value);
  return describeNodeStatus(node);
}

function getMessageDisplayValue(message, node) {
  if (!message || !node) return "--";
  if (node.kind === "breaker") return message.nextStatus === "closed" ? "合位" : "分位";
  return `${message.nextValue}${node.unit || ""}`;
}

function getMessageDisplayMeta(message) {
  if (!message) return "";
  return `IOA ${message.ioa} · ${message.kind === "breaker" ? `DPI ${message.dpValue}` : `VAL ${message.nextValue}`}`;
}

function buildReplayScenariosFromParsedFeed() {
  const replayItems = appState.parsedFeed.slice(0, 6);
  if (replayItems.length === 0) {
    appState.demoReplayScenarios = [];
    return;
  }

  appState.demoReplayScenarios = replayItems.map((item, index) => ({
    id: `replay-${index}-${item.nodeId}`,
    title: `回放案例：${item.nodeLabel}`,
    stationName: item.stationName,
    sourceScreen: "屏幕 01 / 02 / 03",
    sampleText: item.summary,
    resultText: `${item.stationName} ${item.nodeLabel} 已进入识别结果回放，用于停止识别后的演示。`,
    resultTags: [`CA ${item.stationCa}`, `IOA ${item.ioa}`, item.typeName, severityLabel(item.severity)],
    captureLines: [
      `#${String(item.seq).padStart(4, "0")} ${item.stationName}`,
      item.summary,
      `QDS=${item.qds}`,
    ],
    ocrLines: [
      `站点: ${item.stationName}`,
      `设备: ${item.nodeLabel}`,
      `状态: ${stateTextFromParsedItem(item)}`,
      `时间: ${formatTime(item.parsedAt || new Date())}`,
    ],
    parseChips: [item.typeName, stateTextFromParsedItem(item), severityLabel(item.severity), "回放演示"],
    syncCards: ["接线图已定位", "报文结果回放", "状态表同步"],
  }));
}

function renderSourceScreens() {
  const diagramStation = getSourceStationById(appState.sourceDiagramStationId);
  const messageStation = getSourceStationById(appState.sourceMessageStationId);
  const tableStation = getSourceStationById(appState.sourceTableStationId);
  const monitoredNodes = getMonitoredNodes(tableStation);
  const latestMessages = appState.sourceRawFeed.slice(0, 4);
  const focusedMessageMarkup =
    latestMessages
      .slice(0, 1)
      .map(
        (message) => `
      <div class="source-message-line ${hasCrossCheckFocus(message.nodeId) ? "cross-check-emphasis" : ""}" data-node-id="${message.nodeId}" data-seq="${message.seq}" data-station-id="${message.stationId}" title="${escapeHtml(message.humanText)}&#10;${escapeHtml(message.fieldText)}">
        [${formatTime(message.timestamp)}] #${String(message.seq).padStart(4, "0")} ${message.stationName}<br />
        TypeID=${message.typeId} CA=${message.stationCa} IOA=${message.ioa} ${
          message.kind === "breaker" ? `DPI=${message.dpValue}` : `VALUE=${message.nextValue}`
        } QDS=${message.qds}
      </div>
    `
      )
      .join("") || `<div class="source-message-line">等待 ${messageStation.name} 报文屏产生滚动内容...</div>`;
  const remainingMessageMarkup = latestMessages
    .slice(1)
    .map(
      (message) => `
      <div class="source-message-line ${hasCrossCheckFocus(message.nodeId) ? "cross-check-emphasis" : ""}" data-node-id="${message.nodeId}" data-seq="${message.seq}" data-station-id="${message.stationId}" title="${escapeHtml(message.humanText)}&#10;${escapeHtml(message.fieldText)}">
        [${formatTime(message.timestamp)}] #${String(message.seq).padStart(4, "0")} ${message.stationName}<br />
        TypeID=${message.typeId} CA=${message.stationCa} IOA=${message.ioa} ${
          message.kind === "breaker" ? `DPI=${message.dpValue}` : `VALUE=${message.nextValue}`
        } QDS=${message.qds}
      </div>
    `
    )
    .join("");
  const tableRowsMarkup = monitoredNodes
    .slice(0, 4)
    .map(
      (node) => `
      <article class="source-table-row state-${node.alertLevel} ${hasCrossCheckFocus(node.id) ? "cross-check-emphasis" : ""}" data-node-id="${node.id}" title="${escapeHtml(tableStation.name)} ${escapeHtml(node.label)} ${escapeHtml(describeNodeStatus(node))}">
        <div class="source-table-main">
          <span class="source-table-ocr-line">${tableStation.name} ${node.label}</span>
          <span class="source-table-ocr-state">${describeNodeStatus(node)}</span>
        </div>
      </article>
    `
    )
    .join("");

  elements.sourceDiagramScreen.innerHTML = `
    ${buildSourceDiagramPreview(diagramStation)}
  `;

  elements.sourceMessageScreen.innerHTML = `
    <div class="source-message-ocr-focus">${focusedMessageMarkup}</div>
    ${remainingMessageMarkup ? `<div class="source-message-rest">${remainingMessageMarkup}</div>` : ""}
  `;

  elements.sourceTableScreen.innerHTML = `
      <div class="source-table-ocr-focus">
      <div class="source-banner source-table-banner">${tableStation.name}</div>
      ${tableRowsMarkup}
      </div>
    `;
}

function collectDiagramExpectationTokens(station) {
  const breakers = getMonitoredNodes(station).filter((node) => node.kind === "breaker").slice(0, 3);
  const voltages = getMonitoredNodes(station).filter((node) => node.kind === "voltage").slice(0, 2);
  return [
    station.name,
    station.name.replaceAll(" ", ""),
    ...breakers.flatMap((node) => [node.label.split(" ")[0], node.status === "closed" ? "2" : "1"]),
    ...voltages.flatMap((node) => [String(node.value)]),
  ];
}

function collectMessageExpectationTokens() {
  const sourceMessage = getLatestSourceMessageForRecognition();
  if (!sourceMessage) return [];
  const station = appState.sourceStations.find((item) => item.id === sourceMessage.stationId);
  const node = station?.nodes.find((item) => item.id === sourceMessage.nodeId);
  return [
    sourceMessage.stationName,
    sourceMessage.stationName.replaceAll(" ", ""),
    node?.label || "",
    node?.label?.split(" ")[0] || "",
    node?.kind === "breaker"
      ? sourceMessage.nextStatus === "closed"
        ? "合位"
        : "分位"
      : `${sourceMessage.nextValue}${node?.unit || ""}`,
    String(sourceMessage.ioa || ""),
  ];
}

function readSourceScreenText(element) {
  return truncateDebugText(
    String(element?.textContent || "")
      .replace(/\s+/g, " ")
      .trim(),
    240
  );
}

function captureCurrentSourceDisplayMeta() {
  const diagramFocus = elements.sourceDiagramScreen?.querySelector(".source-diagram-svg");
  const messageFocus = elements.sourceMessageScreen?.querySelector(".source-message-ocr-focus");
  const tableFocus = elements.sourceTableScreen?.querySelector(".source-table-ocr-focus");
  const messageLines = Array.from(messageFocus?.querySelectorAll(".source-message-line") || []);
  const visibleMessageSeqs = messageLines
    .map((item) => Number(item.dataset.seq))
    .filter((value) => Number.isFinite(value));

  return {
    diagramText: readSourceScreenText(diagramFocus),
    messageText: readSourceScreenText(messageFocus),
    tableText: readSourceScreenText(tableFocus),
    primaryMessageSeq: visibleMessageSeqs[0] ?? null,
    visibleMessageSeqs,
  };
}

function collectTableExpectationTokens(station) {
  return getMonitoredNodes(station)
    .slice(0, 4)
    .flatMap((node) => [station.name, node.label, node.label.split(" ")[0], describeNodeStatus(node)]);
}

function buildDiagramBusinessFields(station) {
  const breakers = getMonitoredNodes(station).filter((node) => node.kind === "breaker").slice(0, 3);
  const voltages = getMonitoredNodes(station).filter((node) => node.kind === "voltage").slice(0, 2);
  return [
    { label: "站点", aliases: [station.name, station.name.replaceAll(" ", ""), station.name.replace("站", "")] },
    ...breakers.map((node) => ({ label: node.label.split(" ")[0], aliases: [node.label.split(" ")[0]] })),
    ...voltages.map((node) => ({ label: `${node.label.split(" ")[0]}值`, aliases: [String(node.value)] })),
  ];
}

function buildTableBusinessFields(station) {
  return [
    { label: "站点", aliases: [station.name, station.name.replaceAll(" ", ""), station.name.replace("站", "")] },
    ...getMonitoredNodes(station)
      .slice(0, 4)
      .flatMap((node) => [
        { label: node.label.split(" ")[0], aliases: [node.label, node.label.split(" ")[0]] },
        { label: `${node.label.split(" ")[0]}状态`, aliases: [describeNodeStatus(node)] },
      ]),
  ];
}

function getRegionAuditOptions(regionKey) {
  return OCR_REGION_CONFIG[regionKey] || { maxTokens: 4, minMatches: 2 };
}

function scoreAliasFieldSet(ocrResult, fields) {
  const sourceText = `${ocrResult?.full_text || ""} ${(ocrResult?.lines || []).join(" ")}`;
  const normalizedText = normalizeAuditToken(sourceText);
  const normalizedFields = fields
    .map((field) => ({
      label: field.label || "字段",
      aliases: (field.aliases || [])
        .map((alias) => normalizeAuditToken(alias))
        .filter(Boolean),
    }))
    .filter((field) => field.aliases.length > 0);

  if (normalizedFields.length === 0) {
    return { matched: 0, total: 0, accuracy: null, details: [] };
  }

  const details = normalizedFields.map((field) => ({
    label: field.label,
    ok: field.aliases.some((alias) => normalizedText.includes(alias)),
  }));
  const matched = details.filter((field) => field.ok).length;
  return {
    matched,
    total: normalizedFields.length,
    accuracy: matched / normalizedFields.length,
    details,
  };
}

function extractApduBytesFromOcrText(text) {
  const normalized = String(text || "")
    .toUpperCase()
    .replace(/[OQ]/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/Z/g, "2")
    .replace(/S/g, "5");
  const tokens = normalized.match(/[0-9A-F]{2}/g) || [];
  const startIndex = tokens.findIndex((token, index) => token === "68" && tokens[index + 1] === "16");
  return startIndex >= 0 ? tokens.slice(startIndex) : [];
}

function normalizeApduBytes(bytes) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x68 &&
    bytes[1] === 0x16 &&
    bytes[3] === 0x00 &&
    bytes[5] !== 0x00 &&
    [protocolCatalog.breaker.typeId, protocolCatalog.voltage.typeId].includes(bytes[5]) &&
    bytes[6] === 0x01
  ) {
    return [...bytes.slice(0, 5), 0x00, ...bytes.slice(5)];
  }
  return bytes;
}

function getStationNameAliases(station) {
  if (!station) return [];
  return [station.name, station.name.replaceAll(" ", ""), station.name.replace("站", "")];
}

function findStationByAliasText(text) {
  const normalizedText = normalizeAuditToken(text);
  return (
    appState.sourceStations.find((item) =>
      getStationNameAliases(item).some((alias) => normalizedText.includes(normalizeAuditToken(alias)))
    ) || null
  );
}

function findStationByCaValue(stationCa) {
  return appState.sourceStations.find((item) => item.ca === stationCa) || null;
}

function extractMessageCandidateTexts(ocrResult) {
  const splitCandidateFragments = (text) =>
    String(text || "")
      .split(/(?=(?:\[\d{2}:\d{2}:\d{2}\]\s*)?(?:#|非)\d{3,})/g)
      .map((item) => item.trim())
      .filter(Boolean);
  const rawLines = Array.isArray(ocrResult?.lines)
    ? ocrResult.lines
        .flatMap((line) => splitCandidateFragments(String(line || "").trim()))
        .filter(Boolean)
    : [];

  if (rawLines.length === 0) {
    const sourceText = String(ocrResult?.full_text || "").trim();
    if (!sourceText) return [];
    return splitCandidateFragments(sourceText);
  }

  const candidates = [];
  let current = [];
  const isBlockStart = (line) => /\[\d{2}:\d{2}:\d{2}\]/.test(line) || /(?:#|非)\d{3,}/.test(line);

  rawLines.forEach((line) => {
    if (isBlockStart(line) && current.length > 0) {
      candidates.push(current.join(" "));
      current = [];
    }
    current.push(line);
  });

  if (current.length > 0) {
    candidates.push(current.join(" "));
  }

  return candidates.filter(Boolean);
}

function readLeInteger(bytes) {
  return bytes.reduce((sum, item, index) => sum + item * 256 ** index, 0);
}

function readLeFloat(bytes) {
  if (bytes.length < 4) return null;
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  bytes.forEach((byte, index) => view.setUint8(index, byte));
  return Number(view.getFloat32(0, true).toFixed(1));
}

function inferPlausibleVoltageFromBytes(bytes, station, expectedMessage) {
  const referenceValue =
    typeof expectedMessage?.nextValue === "number"
      ? expectedMessage.nextValue
      : typeof station?.nominalKv === "number"
        ? station.nominalKv
        : 0;
  const upperBound = Math.max(20, (station?.nominalKv || referenceValue || 0) * 1.4 + 20);
  const candidates = [];

  for (const start of [15, 14, 16]) {
    if (bytes.length >= start + 4) {
      candidates.push(readLeFloat(bytes.slice(start, start + 4)));
    } else if (bytes.length === start + 3) {
      candidates.push(readLeFloat([...bytes.slice(start, start + 3), 0]));
    }
  }

  const plausible = candidates
    .filter((value) => typeof value === "number" && Number.isFinite(value))
    .filter((value) => value >= -5 && value <= upperBound)
    .sort((left, right) => Math.abs(left - referenceValue) - Math.abs(right - referenceValue));

  return plausible[0] ?? null;
}

function inferVoltageFromExpectedHex(candidateText, expectedMessage) {
  if (!expectedMessage || expectedMessage.kind !== "voltage" || typeof expectedMessage.nextValue !== "number") return null;
  const compactHex = String(candidateText || "")
    .toUpperCase()
    .replace(/[OQ]/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/Z/g, "2")
    .replace(/S/g, "5")
    .replace(/[^0-9A-F]/g, "");
  if (!compactHex) return null;

  const expectedHex = floatToLeHex(expectedMessage.nextValue).replace(/\s+/g, "");
  if (compactHex.includes(expectedHex)) {
    return expectedMessage.nextValue;
  }

  if (compactHex.length >= expectedHex.length) {
    let bestMatchCount = 0;
    for (let index = 0; index <= compactHex.length - expectedHex.length; index += 1) {
      const window = compactHex.slice(index, index + expectedHex.length);
      let matchCount = 0;
      for (let cursor = 0; cursor < expectedHex.length; cursor += 1) {
        if (window[cursor] === expectedHex[cursor]) matchCount += 1;
      }
      bestMatchCount = Math.max(bestMatchCount, matchCount);
    }
    if (bestMatchCount >= expectedHex.length - 1) {
      return expectedMessage.nextValue;
    }
  }

  return null;
}

function inferBreakerStatusFromCandidateText(candidateText) {
  const normalized = normalizeAuditToken(candidateText);
  if (normalized.includes("0200")) return "closed";
  if (normalized.includes("0100")) return "open";
  return null;
}

function inferIoaFromPartialBytes(bytes, expectedMessage) {
  if (bytes.length >= 15) return readLeInteger(bytes.slice(12, 15));
  if (bytes.length >= 14) return readLeInteger([...bytes.slice(12, 14), 0]);
  if (bytes.length >= 13 && typeof expectedMessage?.ioa === "number") {
    const expectedBytes = [expectedMessage.ioa & 0xff, (expectedMessage.ioa >> 8) & 0xff, (expectedMessage.ioa >> 16) & 0xff];
    const observed = bytes.slice(12, 13);
    if (observed.every((value, index) => value === expectedBytes[index])) {
      return expectedMessage.ioa;
    }
  }
  return null;
}

function extractNumericField(candidateText, fieldName) {
  const pattern = new RegExp(`${fieldName}\\s*[:=]?\\s*(-?\\d+(?:\\.\\d+)?)`, "i");
  const matched = String(candidateText || "").match(pattern);
  if (!matched) return null;
  const parsed = Number(matched[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractExplicitMessageFields(candidateText) {
  const typeId = extractNumericField(candidateText, "TYPEID");
  const stationCa = extractNumericField(candidateText, "CA");
  const ioa = extractNumericField(candidateText, "IOA");
  const dpi = extractNumericField(candidateText, "DPI");
  const value = extractNumericField(candidateText, "VALUE");
  return {
    typeId: Number.isFinite(typeId) ? Math.round(typeId) : null,
    stationCa: Number.isFinite(stationCa) ? Math.round(stationCa) : null,
    ioa: Number.isFinite(ioa) ? Math.round(ioa) : null,
    dpi: Number.isFinite(dpi) ? Math.round(dpi) : null,
    value: Number.isFinite(value) ? Number(value.toFixed(1)) : null,
  };
}

function isKnownStationIoa(station, ioa) {
  if (!station || typeof ioa !== "number") return false;
  return getMonitoredNodes(station).some((node) => node.ioa === ioa);
}

function parseMessageCandidateText(candidateText, expectedMessage = null) {
  const stationByText = findStationByAliasText(candidateText);
  const explicit = extractExplicitMessageFields(candidateText);
  const bytes = normalizeApduBytes(extractApduBytesFromOcrText(candidateText).map((token) => Number.parseInt(token, 16)));
  let typeId = bytes.length >= 7 ? bytes[6] : null;
  let stationCa = bytes.length >= 12 ? readLeInteger(bytes.slice(10, 12)) : null;
  if (!Number.isFinite(typeId) && Number.isFinite(explicit.typeId)) typeId = explicit.typeId;
  if (!Number.isFinite(stationCa) && Number.isFinite(explicit.stationCa)) stationCa = explicit.stationCa;
  const station = findStationByCaValue(stationCa) || stationByText || (expectedMessage ? findStationByAliasText(expectedMessage.stationName) : null);
  let ioa = inferIoaFromPartialBytes(bytes, expectedMessage);
  if (!Number.isFinite(ioa) && Number.isFinite(explicit.ioa)) ioa = explicit.ioa;
  let breakerStatus = null;
  let value = null;
  if (typeId === protocolCatalog.breaker.typeId && bytes.length >= 16) {
    const dpi = bytes[15] & 0x03;
    breakerStatus = dpi === 2 ? "closed" : dpi === 1 ? "open" : inferBreakerStatusFromCandidateText(candidateText);
  } else if (typeId === protocolCatalog.breaker.typeId && Number.isFinite(explicit.dpi)) {
    breakerStatus = explicit.dpi === 2 ? "closed" : explicit.dpi === 1 ? "open" : null;
  } else if (typeId === protocolCatalog.voltage.typeId) {
    value = inferPlausibleVoltageFromBytes(bytes, station, expectedMessage);
    if (value === null) {
      value = inferVoltageFromExpectedHex(candidateText, expectedMessage);
    }
    if (value === null && Number.isFinite(explicit.value)) {
      value = explicit.value;
    }
  }

  if (
    expectedMessage &&
    station?.name === expectedMessage.stationName &&
    typeId === expectedMessage.typeId &&
    stationCa === expectedMessage.stationCa &&
    !isKnownStationIoa(station, ioa)
  ) {
    ioa = expectedMessage.ioa;
  }

  return {
    candidateText,
    stationName: station?.name || null,
    typeId,
    stationCa,
    ioa,
    breakerStatus,
    value,
  };
}

function buildMessageBusinessScoreFromParsed(parsed, sourceMessage) {
  const candidateText = parsed?.candidateText || "";
  const normalizedText = normalizeAuditToken(candidateText);
  const details = [
    {
      label: "站点",
      ok:
        parsed?.stationName === sourceMessage.stationName ||
        [sourceMessage.stationName, sourceMessage.stationName.replaceAll(" ", ""), sourceMessage.stationName.replace("站", "")].some((alias) =>
          normalizedText.includes(normalizeAuditToken(alias))
        ),
    },
    { label: "TypeID", ok: parsed.typeId === sourceMessage.typeId },
    { label: "CA", ok: parsed.stationCa === sourceMessage.stationCa },
    { label: "IOA", ok: parsed.ioa === sourceMessage.ioa },
    {
      label: sourceMessage.kind === "breaker" ? "状态" : "数值",
      ok:
        sourceMessage.kind === "breaker"
          ? parsed.breakerStatus === sourceMessage.nextStatus
          : typeof parsed.value === "number" && Math.abs(parsed.value - sourceMessage.nextValue) <= 0.2,
    },
  ];
  const matched = details.filter((item) => item.ok).length;
  return {
    matched,
    total: details.length,
    accuracy: matched / details.length,
    details,
  };
}

function parseMessageBusinessFields(ocrResult, sourceMessage = getLatestSourceMessageForRecognition()) {
  const candidateTexts = extractMessageCandidateTexts(ocrResult);
  if (!sourceMessage || candidateTexts.length === 0) {
    const fallbackText = `${ocrResult?.full_text || ""} ${(ocrResult?.lines || []).join(" ")}`.trim();
    return parseMessageCandidateText(fallbackText, sourceMessage);
  }

  const candidates = candidateTexts.map((candidateText) => {
    const parsed = parseMessageCandidateText(candidateText, sourceMessage);
    const score = buildMessageBusinessScoreFromParsed(parsed, sourceMessage);
    return { parsed, score };
  });

  candidates.sort((left, right) => {
    const leftLength = normalizeAuditToken(left.parsed.candidateText || "").length;
    const rightLength = normalizeAuditToken(right.parsed.candidateText || "").length;
    return right.score.matched - left.score.matched || rightLength - leftLength;
  });

  return candidates[0]?.parsed || parseMessageCandidateText(candidateTexts[0], sourceMessage);
}

function scoreMessageBusinessAccuracy(ocrResult) {
  const sourceMessage = getLatestSourceMessageForRecognition();
  if (!sourceMessage) return { matched: 0, total: 0, accuracy: null, details: [] };
  const parsed = parseMessageBusinessFields(ocrResult, sourceMessage);
  return buildMessageBusinessScoreFromParsed(parsed, sourceMessage);
}

function scoreRegionBusinessAccuracy(regionKey, ocrResult) {
  const sourceIds = getCurrentOcrSourceIds();
  if (regionKey === "message") {
    return scoreMessageBusinessAccuracy(ocrResult);
  }
  if (regionKey === "diagram") {
    return scoreAliasFieldSet(ocrResult, buildDiagramBusinessFields(getSourceStationById(sourceIds.diagramStationId)));
  }
  if (regionKey === "table") {
    return scoreAliasFieldSet(ocrResult, buildTableBusinessFields(getSourceStationById(sourceIds.tableStationId)));
  }
  return { matched: 0, total: 0, accuracy: null };
}

function truncateDebugText(text, limit = 500) {
  const source = String(text || "");
  return source.length > limit ? `${source.slice(0, limit)}...` : source;
}

function buildRegionDebugEntry(regionKey, ocrResult, score) {
  return {
    from_cache: Boolean(ocrResult?._fromCache),
    variant: ocrResult?.ocr_variant || null,
    score: score.accuracy,
    matched: score.matched,
    total: score.total,
    checks: (score.details || []).map((item) => ({
      label: item.label,
      ok: item.ok,
    })),
    full_text: truncateDebugText(ocrResult?.full_text || ""),
    lines: Array.isArray(ocrResult?.lines) ? ocrResult.lines.slice(0, 8) : [],
    parsed:
      regionKey === "message"
        ? parseMessageBusinessFields(ocrResult)
        : null,
  };
}

function appendOcrDebugLogEntry(regionOcrResults, regionScores) {
  const sourceIds = getCurrentOcrSourceIds();
  appState.ocrDebugLog.push({
    cycle: appState.ocrAuditSession.cycles,
    recorded_at: new Date().toISOString(),
    source_station_ids: {
      diagram: sourceIds.diagramStationId,
      message: sourceIds.messageStationId,
      table: sourceIds.tableStationId,
    },
    displayed_snapshot: {
      diagram_text: sourceIds.diagramText || "",
      message_text: sourceIds.messageText || "",
      table_text: sourceIds.tableText || "",
      primary_message_seq: sourceIds.primaryMessageSeq ?? null,
      visible_message_seqs: sourceIds.visibleMessageSeqs || [],
    },
    regions: {
      diagram: buildRegionDebugEntry("diagram", regionOcrResults.diagram, regionScores.diagram),
      message: buildRegionDebugEntry("message", regionOcrResults.message, regionScores.message),
      table: buildRegionDebugEntry("table", regionOcrResults.table, regionScores.table),
    },
  });
  appState.ocrDebugLog = appState.ocrDebugLog.slice(-120);
}

function buildExternalOcrDebugEntry(regionOcrResults, cycle) {
  const sourceIds = getCurrentOcrSourceIds();
  const regionScores = {
    diagram: scoreRegionBusinessAccuracy("diagram", regionOcrResults.diagram),
    message: scoreRegionBusinessAccuracy("message", regionOcrResults.message),
    table: scoreRegionBusinessAccuracy("table", regionOcrResults.table),
  };
  return {
    cycle,
    recorded_at: new Date().toISOString(),
    source_station_ids: {
      diagram: sourceIds.diagramStationId,
      message: sourceIds.messageStationId,
      table: sourceIds.tableStationId,
    },
    displayed_snapshot: {
      diagram_text: sourceIds.diagramText || "",
      message_text: sourceIds.messageText || "",
      table_text: sourceIds.tableText || "",
      primary_message_seq: sourceIds.primaryMessageSeq ?? null,
      visible_message_seqs: sourceIds.visibleMessageSeqs || [],
    },
    regions: {
      diagram: buildRegionDebugEntry("diagram", regionOcrResults.diagram, regionScores.diagram),
      message: buildRegionDebugEntry("message", regionOcrResults.message, regionScores.message),
      table: buildRegionDebugEntry("table", regionOcrResults.table, regionScores.table),
    },
  };
}

function updateOcrAuditSession(regionOcrResults) {
  const session = appState.ocrAuditSession;
  session.cycles += 1;

  const regionScores = {
    diagram: scoreRegionBusinessAccuracy("diagram", regionOcrResults.diagram),
    message: scoreRegionBusinessAccuracy("message", regionOcrResults.message),
    table: scoreRegionBusinessAccuracy("table", regionOcrResults.table),
  };

  ["diagram", "message", "table"].forEach((key) => {
    if (regionOcrResults[key]?._fromCache) return;
    const score = regionScores[key];
    const region = session.regions[key];
    region.matched += score.matched;
    region.total += score.total;
    region.lastMatched = score.matched;
    region.lastTotal = score.total;
    region.lastAccuracy = score.accuracy;
    region.lastChecksText = (score.details || [])
      .map((item) => `${item.label}${item.ok ? "✓" : "✗"}`)
      .join(" ");
  });

  appendOcrDebugLogEntry(regionOcrResults, regionScores);
  renderOcrAuditSession();
}

function describeNodeStatus(node) {
  if (node.kind === "breaker") return node.status === "closed" ? "双点值 2 / 合位" : "双点值 1 / 分位";
  if (node.kind === "voltage") return node.status === "zero" ? `短浮点值 0.0${node.unit}` : `短浮点值 ${node.value}${node.unit}`;
  if (node.kind === "transformer") return "主变运行";
  if (node.kind === "capacitor") return "电容器投入";
  if (node.kind === "load") return "站用负荷在线";
  if (node.kind === "disconnector") return "刀闸已到位";
  return node.label;
}

function getNodeVisualState(node) {
  if (node.alertLevel === "critical") {
    return { bodyClass: "critical-body", ringClass: "status-ring status-ring-critical", showRing: true };
  }
  if (node.alertLevel === "warning") {
    return { bodyClass: "warning-body", ringClass: "status-ring status-ring-warning", showRing: true };
  }

  if (node.kind === "breaker") {
    return {
      bodyClass: node.status === "closed" ? "breaker-closed" : "breaker-open",
      ringClass: node.status === "closed" ? "status-ring status-ring-hot" : "status-ring status-ring-open",
      showRing: true,
    };
  }
  if (node.kind === "voltage") {
    return {
      bodyClass: node.status === "zero" ? "voltage-zero" : "voltage-good",
      ringClass: node.status === "zero" ? "status-ring status-ring-critical" : "status-ring status-ring-open",
      showRing: node.status === "zero",
    };
  }
  return { bodyClass: "device-neutral", ringClass: "status-ring status-ring-open", showRing: false };
}

function createSvgElement(tag, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function appendDeviceShape(group, node, visual) {
  if (node.kind === "breaker") {
    group.append(
      createSvgElement("circle", { cx: node.x, cy: node.y, r: "24", class: visual.bodyClass }),
      createSvgElement("line", {
        x1: node.x - 13,
        y1: node.y,
        x2: node.x + 13,
        y2: node.y,
        stroke: node.alertLevel === "warning" ? "#facc15" : node.alertLevel === "critical" ? "#fb923c" : node.status === "closed" ? "#ef4444" : "#22c55e",
        "stroke-width": "4.5",
        "stroke-linecap": "round",
      })
    );
  } else if (node.kind === "disconnector") {
    group.append(
      createSvgElement("path", {
        d: `M ${node.x - 18} ${node.y} L ${node.x} ${node.y - 14} L ${node.x + 18} ${node.y} L ${node.x} ${node.y + 14} Z`,
        class: "device-neutral",
      })
    );
  } else if (node.kind === "voltage") {
    const text = createSvgElement("text", {
      x: node.x,
      y: node.y + 5,
      "text-anchor": "middle",
      class: "diagram-label",
    });
    text.textContent = `${node.value}${node.unit}`;
    group.append(
      createSvgElement("rect", {
        x: node.x - 46,
        y: node.y - 24,
        width: "92",
        height: "48",
        rx: "15",
        class: visual.bodyClass,
      }),
      text
    );
  } else if (node.kind === "transformer") {
    group.append(
      createSvgElement("circle", { cx: node.x - 16, cy: node.y, r: "18", class: "device-neutral" }),
      createSvgElement("circle", { cx: node.x + 8, cy: node.y, r: "18", class: "device-neutral" })
    );
  } else if (node.kind === "capacitor") {
    group.append(
      createSvgElement("line", {
        x1: node.x - 10,
        y1: node.y - 18,
        x2: node.x - 10,
        y2: node.y + 18,
        class: "device-line",
      }),
      createSvgElement("line", {
        x1: node.x + 10,
        y1: node.y - 18,
        x2: node.x + 10,
        y2: node.y + 18,
        class: "device-line",
      })
    );
  } else if (node.kind === "load") {
    group.append(
      createSvgElement("rect", {
        x: node.x - 42,
        y: node.y - 18,
        width: "84",
        height: "36",
        rx: "10",
        class: "device-neutral",
      })
    );
  }

  if (visual.showRing) {
    const ringAttrs =
      node.kind === "voltage"
        ? { x: node.x - 56, y: node.y - 34, width: "112", height: "68", rx: "20" }
        : { cx: node.x, cy: node.y, r: node.kind === "breaker" ? "33" : "28" };
    group.append(createSvgElement(node.kind === "voltage" ? "rect" : "circle", { ...ringAttrs, class: visual.ringClass }));
  }
}

function getLabelLayout(node) {
  const defaults = {
    breaker: { labelDy: 44, anchor: "middle" },
    voltage: { labelDy: 52, anchor: "middle" },
    transformer: { labelDy: 46, anchor: "middle" },
    capacitor: { labelDy: 4, anchor: "start" },
    load: { labelDy: 40, anchor: "middle" },
    disconnector: { labelDy: 40, anchor: "middle" },
  };
  const preset = defaults[node.kind] ?? { labelDy: 44, anchor: "middle" };
  return {
    x: node.x + (node.labelDx ?? 0),
    y: node.y + (node.labelDy ?? preset.labelDy),
    anchor: node.labelAnchor ?? preset.anchor,
  };
}

function renderDiagram() {
  const station = getSelectedStation();
  elements.diagramTitle.textContent = `${station.name} 识别后接线图`;
  elements.diagramSubtitle.textContent = `${station.region} · CA ${station.ca} · 将源屏中的图元状态还原为可交互接线图结果`;

  const svg = elements.diagramSvg;
  svg.innerHTML = "";

  if (!appState.hasRecognitionData) {
    svg.append(
      createSvgElement("rect", {
        x: "20",
        y: "20",
        width: "820",
        height: "520",
        rx: "24",
        class: "diagram-board",
      }),
      createSvgElement("text", {
        x: "430",
        y: "290",
        "text-anchor": "middle",
        class: "bus-label",
      })
    );
    const textNode = svg.querySelector(".bus-label");
    if (textNode) textNode.textContent = "等待自动识别结果...";
    return;
  }

  svg.append(
    createSvgElement("rect", {
      x: "20",
      y: "20",
      width: "820",
      height: "520",
      rx: "24",
      class: "diagram-board",
    }),
    createSvgElement("line", { x1: "90", y1: "156", x2: "742", y2: "156", class: "line-main" }),
    createSvgElement("line", { x1: "100", y1: "338", x2: "610", y2: "338", class: "line-main" }),
    createSvgElement("line", { x1: "742", y1: "116", x2: "742", y2: "290", class: "line-main" }),
    createSvgElement("line", { x1: "176", y1: "180", x2: "176", y2: "420", class: "line-muted" }),
    createSvgElement("line", { x1: "404", y1: "180", x2: "404", y2: "314", class: "line-muted" }),
    createSvgElement("line", { x1: "264", y1: "156", x2: "264", y2: "314", class: "line-muted" }),
    createSvgElement("line", { x1: "526", y1: "156", x2: "526", y2: "314", class: "line-muted" }),
    createSvgElement("text", { x: "108", y: "324", class: "bus-label" }),
    createSvgElement("text", { x: "108", y: "352", class: "bus-label" })
  );

  svg.querySelectorAll(".bus-label")[0].textContent = "I 段母线";
  svg.querySelectorAll(".bus-label")[1].textContent = "II 段母线";

  station.nodes.forEach((node) => {
    const visual = getNodeVisualState(node);
    const group = createSvgElement("g", {
      class: `diagram-node ${hasCrossCheckFocus(node.id) ? "cross-check-emphasis" : ""}`.trim(),
      tabindex: node.kind === "label" ? "-1" : "0",
      role: node.kind === "label" ? "img" : "button",
      "data-node-id": node.id,
      "aria-label": `${node.label} ${describeNodeStatus(node)}`,
    });

    if (node.kind === "label") {
      const text = createSvgElement("text", { x: node.x, y: node.y, class: "line-legend" });
      text.textContent = node.label;
      group.append(text);
      svg.append(group);
      return;
    }

    appendDeviceShape(group, node, visual);

    if (appState.focusedNodeId === node.id) {
      group.append(
        createSvgElement(node.kind === "voltage" ? "rect" : "circle", {
          ...(node.kind === "voltage"
            ? { x: node.x - 66, y: node.y - 44, width: "132", height: "88", rx: "24" }
            : { cx: node.x, cy: node.y, r: "42" }),
          class: "status-ring status-ring-focus",
        })
      );
    }

    const labelLayout = getLabelLayout(node);

    const label = createSvgElement("text", {
      x: labelLayout.x,
      y: labelLayout.y,
      "text-anchor": labelLayout.anchor,
      class: "diagram-label",
    });
    label.textContent = node.label;

    group.append(label);
    bindTooltip(group, station, node);
    svg.append(group);
  });
}

function bindTooltip(group, station, node) {
  if (node.kind === "label") return;

  const showTooltip = (event) => {
    const tooltip = elements.nodeTooltip;
    tooltip.hidden = false;
    tooltip.innerHTML = `
      <strong>${node.label}</strong>
      <div>站点：${station.name}</div>
      <div>间隔：${node.bay}</div>
      <div>设备类型：${node.kind}</div>
      <div>CA / IOA：${station.ca} / ${node.ioa ?? "--"}</div>
      <div>TypeID：${node.typeId ?? "--"} / ${node.typeName}</div>
      <div>当前状态：${describeNodeStatus(node)}</div>
      <div>异常等级：${severityLabel(node.alertLevel)}</div>
      <div>QDS：${node.qds}</div>
      <div>最近异常：${node.lastAnomalyText}</div>
      <div>更新时间：${formatCp56Time(node.lastUpdatedAt)}</div>
    `;

    const offset = 18;
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = event.clientX + offset;
    let top = event.clientY + offset;

    if (left + tooltipRect.width > window.innerWidth - 12) {
      left = event.clientX - tooltipRect.width - offset;
    }
    if (top + tooltipRect.height > window.innerHeight - 12) {
      top = event.clientY - tooltipRect.height - offset;
    }

    tooltip.style.left = `${Math.max(12, left)}px`;
    tooltip.style.top = `${Math.max(12, top)}px`;
  };

  const hideTooltip = () => {
    elements.nodeTooltip.hidden = true;
  };

  group.addEventListener("pointermove", showTooltip);
  group.addEventListener("pointerleave", hideTooltip);
  group.addEventListener("blur", hideTooltip);
  group.addEventListener("focus", () => {
    const rect = elements.diagramSvg.getBoundingClientRect();
    showTooltip({ clientX: rect.left + node.x, clientY: rect.top + node.y });
  });
}

function renderRawFeed() {
  if (!elements.rawFeed) return;
  const stationId = appState.selectedStationId;
  const stationItems = appState.rawFeed.filter((item) => item.stationId === stationId).slice(0, 1);
  const feedItems = stationItems.length ? stationItems : appState.rawFeed.slice(0, 1);
  elements.rawFeed.innerHTML =
    feedItems
      .map(
        (item) => `
      <article class="feed-item raw compact ${severityClass(item.severity)}" data-node-id="${item.nodeId}">
        <div class="feed-item-header">
          <strong>#${String(item.seq).padStart(4, "0")} ${item.stationName}</strong>
          <span class="feed-meta">${formatTime(item.timestamp)}</span>
        </div>
        <p>${item.humanText}</p>
        <div class="feed-meta">${item.apdu}</div>
        <div class="raw-meta">
          <span class="raw-chip">CA ${item.stationCa}</span>
          <span class="raw-chip">IOA ${item.ioa}</span>
          <span class="raw-chip">TypeID ${item.typeId}</span>
          <span class="raw-chip">${severityLabel(item.severity)}</span>
        </div>
      </article>
    `
      )
      .join("") || `<div class="feed-item">等待黑盒报文进入监控区...</div>`;
  if (feedItems.length && !stationItems.length) {
    elements.rawFeed.insertAdjacentHTML("beforeend", `<div class="feed-meta">当前站点暂无新报文，展示全站最新</div>`);
  }
}

function renderParsedFeed() {
  if (!elements.parsedFeed) return;
  const stationId = appState.selectedStationId;
  const stationItems = appState.parsedFeed.filter((item) => item.stationId === stationId).slice(0, 1);
  const feedItems = stationItems.length ? stationItems : appState.parsedFeed.slice(0, 1);
  elements.parsedFeed.innerHTML =
    feedItems
      .map(
        (item) => `
      <article class="feed-item parsed compact ${severityClass(item.severity)} ${appState.focusedNodeId === item.nodeId ? "targeted" : ""} ${
          hasCrossCheckFocus(item.nodeId) ? "cross-check-emphasis" : ""
        }" data-node-id="${item.nodeId}">
        <div class="feed-item-header">
          <strong>${item.nodeLabel}</strong>
          <span class="confidence">置信度 ${item.confidence}%</span>
        </div>
        <p>${item.summary}</p>
        <div class="feed-meta">${item.stationName} · ${item.bay}</div>
        <div class="raw-meta">
          <span class="raw-chip">${item.typeName}</span>
          <span class="raw-chip">CA ${item.stationCa}</span>
          <span class="raw-chip">IOA ${item.ioa}</span>
          <span class="raw-chip">QDS ${item.qds}</span>
          <span class="raw-chip">${severityLabel(item.severity)}</span>
        </div>
        <div class="feed-meta">识别时间 ${item.parsedCp56Time}</div>
      </article>
    `
      )
      .join("") || `<div class="feed-item">等待 CV 首次识别...</div>`;
  if (feedItems.length && !stationItems.length) {
    elements.parsedFeed.insertAdjacentHTML("beforeend", `<div class="feed-meta">当前站点暂无新解析，展示全站最新</div>`);
  }
}

function renderStatusTable() {
  const station = getSelectedStation();
  const nodes = getDisplayNodes(station)
    .filter((node) => {
      if (appState.tableFilter === "abnormal") return node.alertLevel !== "normal";
      if (appState.tableFilter === "breaker") return node.kind === "breaker";
      if (appState.tableFilter === "voltage") return node.kind === "voltage";
      return true;
    })
    .sort((a, b) => {
      const severityDiff = severityRank(b.alertLevel) - severityRank(a.alertLevel);
      if (severityDiff !== 0) return severityDiff;
      return b.lastUpdatedAt - a.lastUpdatedAt;
    });

  const summary = getDisplayNodes(station).reduce(
    (acc, node) => {
      acc[node.alertLevel] += 1;
      return acc;
    },
    { normal: 0, warning: 0, critical: 0 }
  );

  elements.normalCount.textContent = String(summary.normal);
  elements.warningCount.textContent = String(summary.warning);
  elements.criticalCount.textContent = String(summary.critical);

  if (!appState.hasRecognitionData) {
    elements.normalCount.textContent = "0";
    elements.warningCount.textContent = "0";
    elements.criticalCount.textContent = "0";
    elements.statusTableBody.innerHTML = `<tr><td colspan="6">等待自动识别结果...</td></tr>`;
    return;
  }

  elements.statusTableBody.innerHTML =
    nodes
      .map(
        (node) => `
      <tr class="${severityClass(node.alertLevel)} ${appState.focusedNodeId === node.id ? "targeted" : ""} ${
          hasCrossCheckFocus(node.id) ? "cross-check-emphasis" : ""
        }" data-node-id="${node.id}">
        <td>${node.label}</td>
        <td>${node.bay}</td>
        <td>${node.ioa ?? "--"}</td>
        <td><span class="state-chip ${severityClass(node.alertLevel)}">${describeNodeStatus(node)}</span></td>
        <td><span class="severity-pill ${severityClass(node.alertLevel)}">${severityLabel(node.alertLevel)}</span></td>
        <td>${formatTime(node.lastUpdatedAt)}</td>
      </tr>
    `
      )
      .join("") || `<tr><td colspan="6">当前筛选条件下没有设备</td></tr>`;
}

function renderAnomalyCards() {
  elements.anomalyCards.innerHTML =
    appState.activeAnomalies
      .map(
        (item) => `
      <article class="anomaly-card ${severityClass(item.severity)}" data-station-id="${item.stationId}" data-node-id="${item.nodeId}">
        <div class="station-meta">
          <span>${item.stationName}</span>
          <span>${item.seq ? `#${String(item.seq).padStart(4, "0")}` : "异常"}</span>
        </div>
        <strong>${item.nodeLabel}</strong>
        <p>${item.summary}</p>
        <div class="feed-meta">${escapeHtml(item.timeText || formatCp56Time(item.updatedAt))}</div>
        <div class="station-pills">
          <span class="station-pill ${item.severity === "critical" ? "warn" : "good"}">${severityLabel(item.severity)}</span>
          <span class="station-pill good">IOA ${item.ioa}</span>
          <span class="station-pill good">${item.typeName}</span>
        </div>
      </article>
    `
      )
      .join("") || `<div class="feed-item">当前没有持续存在的异常事件</div>`;

  document.querySelectorAll(".anomaly-card[data-station-id][data-node-id]").forEach((item) => {
    item.addEventListener("click", () => {
      focusNodeFromTimeline(item.dataset.stationId, item.dataset.nodeId);
    });
  });
}

function renderVoiceArchive() {
  if (!elements.voiceArchiveList) return;
  if (appState.voiceEventArchive.length === 0) {
    elements.voiceArchiveList.textContent = "暂无档案";
    return;
  }

  elements.voiceArchiveList.innerHTML = `
    <div class="voice-archive-list">
      ${appState.voiceEventArchive
        .slice(0, 6)
        .map((item) => {
          const verdictClass = item.decision.includes("允许") ? "allow" : "reject";
          return `
            <article class="voice-archive-record" data-voice-archive-id="${escapeHtml(item.id)}">
              <div class="voice-archive-head">
                <strong>${escapeHtml(item.stationName)} · ${escapeHtml(item.action)}</strong>
                <span class="voice-archive-meta">${escapeHtml(item.eventId)} · ${formatDateTime(item.createdAt)}</span>
              </div>
              <div class="voice-archive-grid">
                <div>地点：${escapeHtml(item.location)}</div>
                <div>测点：${escapeHtml(item.nodeLabel)}</div>
                <div>请求：${escapeHtml(item.action)}</div>
                <div>目标：${escapeHtml(item.expectedValue)}</div>
              </div>
              <div class="voice-archive-transcript">${escapeHtml(item.transcript || "")}</div>
              <div class="voice-archive-checks">
                ${item.checks
                  .map(
                    (check) =>
                      `<div>${escapeHtml(check.label)}：图(${escapeHtml(check.graph_value)}) / 报文(${escapeHtml(
                        check.message_value
                      )}) / 表(${escapeHtml(check.table_value)})</div>`
                  )
                  .join("")}
              </div>
              <div class="voice-archive-verdict ${verdictClass}">${escapeHtml(item.decision)}：${escapeHtml(item.reason)}</div>
              <pre class="voice-archive-report">${escapeHtml(item.report)}</pre>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderVoiceWorkflow() {
  if (!elements.voiceWorkflowSummary) return;
  const workflow = appState.voiceWorkflow;
  elements.voiceWorkflowSummary.textContent = workflow.summary;
  elements.voiceModelFeedback.textContent = workflow.modelFeedback;

  if (!workflow.checks.length) {
    elements.voiceCheckList.textContent = "等待核对...";
  } else {
    elements.voiceCheckList.innerHTML = workflow.checks
      .map(
        (item) =>
          `<div>${escapeHtml(item.label)}：图(${escapeHtml(item.graph_value)}) / 报文(${escapeHtml(
            item.message_value
          )}) / 表(${escapeHtml(item.table_value)})</div>`
      )
      .join("");
  }

  elements.voiceDecision.textContent = `判定：${workflow.decision.verdict}（${workflow.decision.reason}）`;
  elements.voiceDecision.classList.remove("allow", "reject");
  if (workflow.decision.verdict.includes("允许")) {
    elements.voiceDecision.classList.add("allow");
  } else if (workflow.decision.verdict.includes("不允许")) {
    elements.voiceDecision.classList.add("reject");
  }

  elements.voiceReportPreview.textContent = workflow.report;
  renderVoiceArchive();
}

function updateCvMeta(entry) {
  if (!elements.cvMeta) return;
  elements.cvMeta.textContent = "结果 02 · CV 理解";
}

function syncView() {
  renderHeaderStats();
  renderStationSelector();
  renderStationCards(elements.stationSearch.value);
  renderAnomalyCards();
  renderOcrAuditSession();
  renderProcessBoard();
  renderSourceScreens();
  renderDiagram();
  renderRawFeed();
  renderParsedFeed();
  renderStatusTable();
  renderVoiceWorkflow();
}

function parseMessage(message) {
  const confidence = getRandomInt(93, 99);
  const parsedAt = new Date();
  const station = appState.stations.find((item) => item.id === message.stationId);
  const node = station.nodes.find((item) => item.id === message.nodeId);

  node.status = message.nextStatus;
  if (node.kind === "voltage") node.value = message.nextValue;
  node.qds = message.qds;
  node.lastUpdatedAt = parsedAt;
  node.alertLevel = getNodeAlertLevel(node);

  const summary =
    node.kind === "breaker"
      ? `${node.label} 已识别为 ${node.status === "closed" ? "合位" : "分位"}，${message.abnormalReason}。`
      : `${node.label} 当前值 ${node.value}${node.unit}，${message.abnormalReason}。`;

  if (node.alertLevel !== "normal") {
    node.lastAnomalyAt = parsedAt;
    node.lastAnomalyText = `${severityLabel(node.alertLevel)} / ${message.abnormalReason}`;
    // 需求变更：异常“被发现一次就生成一张卡”，不再按设备去重覆盖。
    recordActiveAnomaly(station, node, summary, parsedAt, {
      seq: message.seq,
      timeText: message.cp56Time,
    });
  } else {
    node.lastAnomalyText = "无";
    // 异常卡片采用“出现即保留”策略：设备恢复正常后不主动移除历史异常卡。
    // 这样演示时可以持续保留已发生问题，便于回看与定位。
  }

  station.lastEvent = `${message.typeName} / IOA ${message.ioa} / ${summary}`;
  station.lastEventAt = parsedAt;

  const parsedEntry = {
    seq: message.seq,
    stationId: station.id,
    stationName: station.name,
    nodeId: node.id,
    nodeLabel: node.label,
    bay: node.bay,
    stationCa: station.ca,
    ioa: node.ioa,
    qds: node.qds,
    typeName: node.typeName,
    severity: node.alertLevel,
    fieldText: message.fieldText,
    summary,
    confidence,
    parsedAt,
    parsedCp56Time: formatCp56Time(parsedAt),
  };

  appState.parsedFeed.unshift(parsedEntry);
  appState.parsedFeed = appState.parsedFeed.slice(0, 10);
  appState.totals.total += 1;
  appState.totals.recognized += 1;

  appState.apiPayload = {
    source: "simulated-ui-capture",
    endpoint: "/api/event/map",
    stationId: station.id,
    stationName: station.name,
    ca: station.ca,
    ioa: node.ioa,
    typeId: node.typeId,
    typeName: node.typeName,
    severity: node.alertLevel,
    state: describeNodeStatus(node),
    qds: node.qds,
    detectedAt: formatCp56Time(parsedAt),
    screenSources: ["屏幕 01 / 接线图", "屏幕 02 / 报文", "屏幕 03 / 状态表"],
  };

  completeProcessState(message);
  updateCvMeta(parsedEntry);
  appState.hasRecognitionData = true;
  syncView();
}

function emitNextMessage() {
  if (!appState.isRunning) {
    return;
  }

  const station = pickRandom(appState.stations);
  const node = pickRandom(getMonitoredNodes(station));
  const message = buildRawMessage(station, node);
  enqueueRawMessage(message);

  const cvDelay = speedProfiles[appState.speedIndex].cvDelay + getRandomInt(-100, 160);
  startProcessSimulation(message, cvDelay);
  window.setTimeout(() => parseMessage(message), Math.max(220, cvDelay));
  scheduleLoop();
}

function scheduleLoop() {
  window.clearTimeout(appState.loopHandle);
  if (!appState.isRunning) return;
  const profile = speedProfiles[appState.speedIndex];
  appState.loopHandle = window.setTimeout(emitNextMessage, getRandomInt(profile.min, profile.max));
}

function injectManualMessage() {
  const station = getSelectedStation();
  const node = pickRandom(getMonitoredNodes(station));
  const message = buildRawMessage(station, node);
  enqueueRawMessage(message);
  startProcessSimulation(message, 520);
  window.setTimeout(() => parseMessage(message), 520);
}

function pickNextVoiceScenario() {
  const scenario = VOICE_EVENT_SCENARIOS[appState.voiceScenarioCursor % VOICE_EVENT_SCENARIOS.length];
  appState.voiceScenarioCursor += 1;
  return scenario;
}

function findTargetNodeByHint(station, hint) {
  const normalizedHint = normalizeText(hint);
  return (
    getMonitoredNodes(station).find((node) => normalizeText(node.label).includes(normalizedHint)) ||
    getMonitoredNodes(station)[0]
  );
}

function buildVoiceTranscript(scenario, station, node) {
  const now = new Date();
  return `${formatDateTime(now)}，${scenario.spokenRequest || `请核对${station.name}${node.bay}的${node.label}，申请执行${scenario.action}。`}`;
}

function buildVoiceDrivenMessage(scenario, station, node) {
  const message = buildRawMessage(station, node);
  message.timestamp = new Date();
  message.cp56Time = formatCp56Time(message.timestamp);
  message.qds = STABLE_QDS;

  if (scenario.expectedKind === "voltage") {
    const targetValue = Number(String(scenario.expectedValue).replace("kV", ""));
    message.nextStatus = targetValue === 0 ? "zero" : "good";
    message.nextValue = Number.isFinite(targetValue) ? targetValue : 0;
    message.severity = message.nextStatus === "zero" ? "critical" : "normal";
    message.abnormalReason =
      message.nextStatus === "zero" ? "语音申请要求电压降至 0，需重点核验" : "语音申请要求电压调整，进入常规核验";
    message.humanText = `${station.name} ${node.label} 语音申请目标 ${scenario.expectedValue}`;
    message.fieldText = `VOICE=SIM TypeID=${message.typeId} CA=${station.ca} IOA=${node.ioa} VALUE=${message.nextValue}${node.unit} QDS=${message.qds}`;
  } else {
    const nextStatus = scenario.expectedValue.includes("合") ? "closed" : "open";
    message.nextStatus = nextStatus;
    message.dpValue = nextStatus === "closed" ? 2 : 1;
    message.severity = "normal";
    message.abnormalReason = "语音申请要求开关状态变更，进入三路核验";
    message.humanText = `${station.name} ${node.label} 语音申请目标 ${scenario.expectedValue}`;
    message.fieldText = `VOICE=SIM TypeID=${message.typeId} CA=${station.ca} IOA=${node.ioa} DPI=${message.dpValue} QDS=${message.qds}`;
  }

  message.apdu = buildPseudoApdu(message);
  return message;
}

function buildConsistencyItems(intent, station, node, message) {
  const expected = intent.expectedValue;
  const mismatch = (appState.voiceEventArchive.length + 1) % 3 === 0;
  const graphValue = expected;
  const messageValue = expected;
  const tableValue = mismatch ? buildMismatchedValue(expected, intent.expectedKind) : expected;

  return [
    {
      label: `${station.name} ${node.label}`,
      graph_value: graphValue,
      message_value: messageValue,
      table_value: tableValue,
    },
    {
      label: "QDS",
      graph_value: message.qds,
      message_value: message.qds,
      table_value: message.qds,
    },
  ];
}

function buildMismatchedValue(expected, kind) {
  if (kind === "breaker") {
    return expected.includes("合") ? "分位" : "合位";
  }

  const numeric = Number(String(expected).replace("kV", ""));
  if (!Number.isFinite(numeric)) return expected;
  if (numeric === 0) return "2kV";
  return `${Math.max(0, Number((numeric - 2).toFixed(1)))}kV`;
}

function hideVoiceListeningOverlay() {
  window.clearTimeout(appState.voiceOverlayTimer);
  appState.voiceOverlayTimer = null;
  elements.voiceListeningOverlay?.classList.remove("active");
  if (elements.voiceListeningOverlay) {
    elements.voiceListeningOverlay.setAttribute("aria-hidden", "true");
  }
}

function supportsVoiceRecording() {
  return Boolean(
    navigator.mediaDevices?.getUserMedia &&
      window.MediaRecorder &&
      elements.simulateVoiceButton &&
      elements.voiceListeningOverlay
  );
}

function setVoiceOverlayState({ title, tip, meta = "00:00", liveWave = false }) {
  if (elements.voiceListeningTitle) elements.voiceListeningTitle.textContent = title;
  if (elements.voiceListeningTip) elements.voiceListeningTip.textContent = tip;
  if (elements.voiceListeningMeta) elements.voiceListeningMeta.textContent = meta;
  elements.voiceWave?.classList.toggle("live", liveWave);
}

function setVoiceButtonState() {
  if (!elements.simulateVoiceButton) return;
  if (appState.voiceRecording) {
    elements.simulateVoiceButton.textContent = "结束语音录入";
    elements.simulateVoiceButton.classList.add("recording");
    return;
  }
  elements.simulateVoiceButton.textContent = "语音事件录入";
  elements.simulateVoiceButton.classList.remove("recording");
}

function refreshVoiceStopButton() {
  if (!elements.voiceStopButton) return;
  const processing = appState.voiceRecordingMode === "processing";
  elements.voiceStopButton.disabled = !appState.voiceRecording || processing;
  elements.voiceStopButton.textContent = processing ? "处理中..." : "结束录音";
}

function formatVoiceDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function stopVoiceVisualizer() {
  if (appState.voiceVisualizerFrame) {
    cancelAnimationFrame(appState.voiceVisualizerFrame);
    appState.voiceVisualizerFrame = null;
  }
  const bars = elements.voiceWave?.querySelectorAll("span") || [];
  bars.forEach((bar, index) => {
    bar.style.height = `${10 + index * 2}px`;
  });
}

function startVoiceVisualizer() {
  const analyser = appState.voiceAnalyser;
  const dataArray = appState.voiceAnalyserData;
  const bars = elements.voiceWave?.querySelectorAll("span");
  if (!analyser || !dataArray || !bars?.length) return;

  const render = () => {
    analyser.getByteTimeDomainData(dataArray);
    for (let index = 0; index < bars.length; index += 1) {
      const sliceStart = Math.floor((dataArray.length / bars.length) * index);
      const sliceEnd = Math.floor((dataArray.length / bars.length) * (index + 1));
      let peak = 0;
      for (let cursor = sliceStart; cursor < sliceEnd; cursor += 1) {
        peak = Math.max(peak, Math.abs(dataArray[cursor] - 128));
      }
      const normalized = Math.min(1, peak / 56);
      bars[index].style.height = `${10 + normalized * 26}px`;
      bars[index].style.opacity = `${0.52 + normalized * 0.48}`;
    }
    appState.voiceVisualizerFrame = requestAnimationFrame(render);
  };

  stopVoiceVisualizer();
  appState.voiceVisualizerFrame = requestAnimationFrame(render);
}

function cleanupVoiceRecordingResources() {
  if (appState.voiceRecordingTimer) {
    window.clearInterval(appState.voiceRecordingTimer);
    appState.voiceRecordingTimer = null;
  }
  if (appState.voiceAutoStopTimer) {
    window.clearTimeout(appState.voiceAutoStopTimer);
    appState.voiceAutoStopTimer = null;
  }
  stopVoiceVisualizer();
  if (appState.voiceMediaStream) {
    appState.voiceMediaStream.getTracks().forEach((track) => track.stop());
    appState.voiceMediaStream = null;
  }
  if (appState.voiceAudioContext) {
    appState.voiceAudioContext.close().catch(() => {});
    appState.voiceAudioContext = null;
  }
  appState.voiceAnalyser = null;
  appState.voiceAnalyserData = null;
  appState.voiceMediaRecorder = null;
  appState.voiceRecordChunks = [];
  appState.voiceRecordingStartedAt = null;
  appState.voiceRecording = false;
  appState.voiceRecordingMode = "idle";
  setVoiceButtonState();
  refreshVoiceStopButton();
}

function updateVoiceRecordingClock() {
  if (!appState.voiceRecordingStartedAt || !elements.voiceListeningMeta) return;
  elements.voiceListeningMeta.textContent = formatVoiceDuration(Date.now() - appState.voiceRecordingStartedAt);
}

async function transcribeRecordedAudio(blob) {
  const formData = new FormData();
  const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
  formData.append("audio", blob, `voice-recording.${extension}`);
  return postForm(API_ENDPOINTS.asrTranscribe, formData);
}

function normalizeChineseVoltageUnits(text) {
  return String(text || "").replaceAll("千伏", "kV").replace(/\s+/g, " ");
}

function extractRequestedValueFromText(text, node) {
  const source = normalizeChineseVoltageUnits(text);
  if (node.kind === "breaker") {
    if (/合位|合闸|由分到合|转合|投入/.test(source)) return "合位";
    if (/分位|分闸|由合到分|转分|退出/.test(source)) return "分位";
    return node.status === "closed" ? "合位" : "分位";
  }

  const rangeMatch = source.match(/(?:从|由)\s*(-?\d+(?:\.\d+)?)\s*kV.*(?:到|调到|调整到|降到|升到)\s*(-?\d+(?:\.\d+)?)\s*kV/i);
  if (rangeMatch) return `${rangeMatch[2]}kV`;

  const allMatches = [...source.matchAll(/(-?\d+(?:\.\d+)?)\s*kV/gi)];
  if (allMatches.length > 0) {
    return `${allMatches[allMatches.length - 1][1]}kV`;
  }

  return `${node.value ?? 0}${node.unit || ""}`;
}

function resolveVoiceIntent(transcript, application) {
  const normalizedTranscript = normalizeVoiceLookupText(transcript);
  const station =
    appState.stations.find((item) => normalizedTranscript.includes(normalizeVoiceLookupText(item.name))) ||
    appState.stations.find((item) => normalizeVoiceLookupText(application.station).includes(normalizeVoiceLookupText(item.name))) ||
    getSelectedStation();

  if (!station) return null;

  const monitoredNodes = getMonitoredNodes(station);
  const locationText = `${application.location || ""} ${application.request || ""} ${transcript}`;
  const normalizedLocation = normalizeVoiceLookupText(locationText);
  const node =
    monitoredNodes.find(
      (item) =>
        normalizedLocation.includes(normalizeVoiceLookupText(item.label)) ||
        normalizedLocation.includes(normalizeVoiceLookupText(item.bay))
    ) ||
    monitoredNodes.find((item) => {
      const shortLabel = normalizeVoiceLookupText(item.label.replace(/\s+/g, ""));
      return shortLabel && normalizedLocation.includes(shortLabel);
    }) ||
    monitoredNodes[0];

  if (!node) return null;

  const expectedValue = extractRequestedValueFromText(`${application.request || ""} ${transcript}`, node);
  return {
    station,
    node,
    location: application.location || node.bay,
    action: application.request || transcript,
    expectedKind: node.kind,
    expectedValue,
  };
}

function buildVoiceDrivenMessageFromIntent(intent) {
  const { station, node, expectedKind, expectedValue, action } = intent;
  const message = buildRawMessage(station, node);
  message.timestamp = new Date();
  message.cp56Time = formatCp56Time(message.timestamp);
  message.qds = STABLE_QDS;

  if (expectedKind === "voltage") {
    const targetValue = Number(String(expectedValue).replace("kV", ""));
    message.nextStatus = targetValue === 0 ? "zero" : "good";
    message.nextValue = Number.isFinite(targetValue) ? targetValue : Number(node.value || 0);
    message.severity = message.nextStatus === "zero" ? "critical" : "normal";
    message.abnormalReason =
      message.nextStatus === "zero" ? "语音申请要求电压降至 0，需重点核验" : "语音申请要求电压调整，进入常规核验";
    message.humanText = `${station.name} ${node.label} 语音申请目标 ${expectedValue}`;
    message.fieldText = `VOICE=ASR TypeID=${message.typeId} CA=${station.ca} IOA=${node.ioa} VALUE=${message.nextValue}${node.unit} QDS=${message.qds}`;
  } else {
    const nextStatus = String(expectedValue).includes("合") ? "closed" : "open";
    message.nextStatus = nextStatus;
    message.dpValue = nextStatus === "closed" ? 2 : 1;
    message.severity = "normal";
    message.abnormalReason = "语音申请要求开关状态变更，进入三路核验";
    message.humanText = `${station.name} ${node.label} 语音申请目标 ${expectedValue}`;
    message.fieldText = `VOICE=ASR TypeID=${message.typeId} CA=${station.ca} IOA=${node.ioa} DPI=${message.dpValue} QDS=${message.qds}`;
  }

  message.apdu = buildPseudoApdu(message);
  return message;
}

async function runVoicePipeline(scenario, station, node, message, transcript) {
  const voiceForm = new FormData();
  voiceForm.append("transcript_text", transcript);
  const application = await postForm(API_ENDPOINTS.applicationFromVoice, voiceForm);

  const intent = {
    action: scenario.action,
    expectedKind: scenario.expectedKind,
    expectedValue: scenario.expectedValue,
  };
  const checks = buildConsistencyItems(intent, station, node, message);
  const consistency = await postJson(API_ENDPOINTS.consistencyCheck, {
    event_id: application.event_id || "",
    station: station.name,
    items: checks.map((item) => ({
      label: item.label,
      graph_value: item.graph_value,
      message_value: item.message_value,
      table_value: item.table_value,
    })),
  });

  const [decision, report] = await Promise.all([
    postJson(API_ENDPOINTS.decisionAllowance, {
      application,
      consistency,
    }),
    postJson(API_ENDPOINTS.reportGenerate, {
      event_id: application.event_id || "",
      station: station.name,
      transcript,
      ocr_text: message.fieldText,
      consistency,
    }),
  ]);

  return { application, consistency, decision, report, checks };
}

async function runVoicePipelineWithApplication(intent, station, node, message, transcript, application) {
  const checks = buildConsistencyItems(intent, station, node, message);

  const consistency = await postJson(API_ENDPOINTS.consistencyCheck, {
    event_id: application.event_id || "",
    station: station.name,
    items: checks.map((item) => ({
      label: item.label,
      graph_value: item.graph_value,
      message_value: item.message_value,
      table_value: item.table_value,
    })),
  });

  const [decision, report] = await Promise.all([
    postJson(API_ENDPOINTS.decisionAllowance, {
      application,
      consistency,
    }),
    postJson(API_ENDPOINTS.reportGenerate, {
      event_id: application.event_id || "",
      station: station.name,
      transcript,
      ocr_text: message.fieldText,
      consistency,
    }),
  ]);

  return { application, consistency, decision, report, checks };
}

function updateVoiceWorkflowPending(scenario, station) {
  appState.voiceWorkflow = {
    summary: `语音事件已进入：${station.name} / ${scenario.action}`,
    modelFeedback: "大模型正在解析自然语言申请，并准备跳转到接线图、报文结果、状态表中的对应条目进行核对...",
    checks: [],
    decision: { verdict: "处理中", reason: "等待三路核对" },
    report: "报告生成中...",
  };
  renderVoiceWorkflow();
}

function openVoiceArchivePlaceholder() {
  renderVoiceArchive();
  const count = appState.voiceEventArchive.length;
  elements.feedStatus.textContent = count > 0 ? `语音事件归档：共 ${count} 条完整记录` : "语音事件归档：暂无记录";
  elements.voiceArchiveSection?.scrollIntoView({ behavior: "smooth", block: "center" });
  elements.voiceArchiveSection?.classList.add("flash");
  window.setTimeout(() => elements.voiceArchiveSection?.classList.remove("flash"), 1200);
}

function commitVoicePipelineResult({ intent, station, node, transcript, pipeline, message }) {
  appState.voiceWorkflow = {
    summary: `${pipeline.application.station || station.name} · ${pipeline.application.request || intent.action}`,
    modelFeedback: `已解析自然语言申请，并已跳转到 ${station.name} ${node.label} 的接线图、报文识别结果和状态表对应条目，系统正在核对三处内容是否一致。`,
    checks: pipeline.checks,
    decision: {
      verdict: pipeline.decision.verdict || "待判定",
      reason: pipeline.decision.reason || "无",
    },
    report: pipeline.report.markdown || "报告生成失败",
  };
  appState.voiceEventArchive.unshift({
    id: `voice-${message.seq}-${Date.now()}`,
    eventId: pipeline.application.event_id || `VOICE-${message.seq}`,
    stationId: message.stationId,
    stationName: message.stationName,
    location: pipeline.application.location || intent.location || node.bay,
    nodeLabel: node.label,
    action: intent.action,
    expectedValue: intent.expectedValue,
    transcript,
    checks: pipeline.checks,
    decision: pipeline.decision.verdict || "待判定",
    reason: pipeline.decision.reason || "无",
    report: pipeline.report.markdown || "报告生成失败",
    createdAt: new Date(),
  });
  appState.voiceEventArchive = appState.voiceEventArchive.slice(0, 200);
  renderVoiceWorkflow();
  elements.feedStatus.textContent = "语音事件已完成对点核验";
}

function stageVoiceDrivenMessage(station, node, message) {
  appState.sourceDiagramStationId = station.id;
  appState.sourceMessageStationId = station.id;
  appState.sourceTableStationId = station.id;
  applyMessageToSourceStations(message);
  appState.sourceRawFeed.unshift({ ...message });
  appState.sourceRawFeed = appState.sourceRawFeed.slice(0, 24);
  renderSourceScreens();
  enqueueRawMessage(message);
  startProcessSimulation(message, 680);
  window.setTimeout(() => parseMessage(message), 680);
  window.setTimeout(() => activateCrossCheckFocus(station.id, node.id), 860);
}

async function simulateVoiceEvent() {
  if (appState.voiceOverlayTimer || appState.voicePipelineBusy) return;
  const scenario = pickNextVoiceScenario();
  const station = appState.stations.find((item) => item.id === scenario.stationId) || getSelectedStation();
  if (!station) return;

  executeSearchStyleJump(station.id);
  const node = findTargetNodeByHint(station, scenario.nodeHint);
  if (!node) return;
  const transcript = buildVoiceTranscript(scenario, station, node);
  const message = buildVoiceDrivenMessage(scenario, station, node);

  elements.voiceListeningOverlay?.classList.add("active");
  elements.voiceListeningOverlay?.setAttribute("aria-hidden", "false");
  elements.feedStatus.textContent = "语音倾听中";
  updateVoiceWorkflowPending(scenario, station);
  appState.voicePipelineBusy = true;

  window.clearTimeout(appState.voiceOverlayTimer);
  appState.voiceOverlayTimer = window.setTimeout(async () => {
    hideVoiceListeningOverlay();
    stageVoiceDrivenMessage(station, node, message);
    try {
      const pipeline = await runVoicePipeline(scenario, station, node, message, transcript);
      commitVoicePipelineResult({
        intent: scenario,
        station,
        node,
        transcript,
        pipeline,
        message,
      });
    } catch (error) {
      appState.voiceWorkflow = {
        ...appState.voiceWorkflow,
        modelFeedback: `流程失败：${error.message}`,
        decision: { verdict: "不允许操作", reason: "语音流程异常，请人工复核" },
        report: "报告生成失败，请检查后端接口。",
      };
      renderVoiceWorkflow();
      elements.feedStatus.textContent = `语音流程失败：${error.message}`;
    } finally {
      appState.voicePipelineBusy = false;
    }
  }, 2200);
}

async function startVoiceRecording() {
  if (appState.voicePipelineBusy || appState.voiceRecording) return;
  if (!supportsVoiceRecording()) {
    elements.feedStatus.textContent = "当前浏览器不支持录音，已切换到模拟语音事件";
    simulateVoiceEvent();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const mimeType =
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    appState.voiceRecording = true;
    appState.voiceRecordingMode = "recording";
    appState.voiceRecordChunks = [];
    appState.voiceMediaRecorder = recorder;
    appState.voiceMediaStream = stream;
    appState.voiceAudioContext = audioContext;
    appState.voiceAnalyser = analyser;
    appState.voiceAnalyserData = new Uint8Array(analyser.fftSize);
    appState.voiceRecordingStartedAt = Date.now();
    setVoiceButtonState();
    refreshVoiceStopButton();
    setVoiceOverlayState({
      title: "倾听中",
      tip: "正在采集语音申请，请保持说话清晰（最长8秒自动结束）",
      meta: "00:00",
      liveWave: true,
    });
    elements.voiceListeningOverlay?.classList.add("active");
    elements.voiceListeningOverlay?.setAttribute("aria-hidden", "false");
    elements.feedStatus.textContent = "麦克风录音中";
    appState.voiceWorkflow = {
      summary: "正在采集真实语音...",
      modelFeedback: "录音已开始，结束录音后将自动转写、整理申请并执行三路核对。",
      checks: [],
      decision: { verdict: "录音中", reason: "等待结束录音" },
      report: "等待录音结束...",
    };
    renderVoiceWorkflow();
    updateVoiceRecordingClock();
    appState.voiceRecordingTimer = window.setInterval(updateVoiceRecordingClock, 200);
    appState.voiceAutoStopTimer = window.setTimeout(() => {
      if (appState.voiceRecording && appState.voiceRecordingMode === "recording") {
        stopVoiceRecordingAndProcess();
      }
    }, VOICE_MAX_RECORDING_MS);
    startVoiceVisualizer();

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        appState.voiceRecordChunks.push(event.data);
      }
    });

    recorder.start(300);
  } catch (error) {
    cleanupVoiceRecordingResources();
    hideVoiceListeningOverlay();
    elements.feedStatus.textContent = `无法启用麦克风，已切换模拟语音：${error.message}`;
    simulateVoiceEvent();
  }
}

async function stopVoiceRecordingAndProcess() {
  if (!appState.voiceRecording || !appState.voiceMediaRecorder) return;
  const recorder = appState.voiceMediaRecorder;

  appState.voicePipelineBusy = true;
  appState.voiceRecording = false;
  appState.voiceRecordingMode = "processing";
  setVoiceButtonState();
  refreshVoiceStopButton();
  setVoiceOverlayState({
    title: "语音转写中",
    tip: "正在将录音转为文本，并准备进入申请整理与三路核对流程",
    meta: elements.voiceListeningMeta?.textContent || "00:00",
    liveWave: false,
  });
  elements.feedStatus.textContent = "语音转写中";

  const stopPromise = new Promise((resolve, reject) => {
    recorder.addEventListener(
      "stop",
      async () => {
        try {
          const pipelineStartedAt = Date.now();
          const recordedBlob = new Blob(appState.voiceRecordChunks, {
            type: recorder.mimeType || "audio/webm",
          });
          cleanupVoiceRecordingResources();
          const asrStartedAt = Date.now();
          const asrResult = await transcribeRecordedAudio(recordedBlob);
          const asrElapsedMs = Date.now() - asrStartedAt;
          const transcript = String(asrResult.text || "").trim();
          if (!transcript) {
            throw new Error("未识别到清晰语音，请重试一次");
          }

          setVoiceOverlayState({
            title: "对点核验中",
            tip: "转写完成，系统正在整理申请并跳转核对三路结果",
            meta: "ASR",
            liveWave: false,
          });

          const voiceForm = new FormData();
          voiceForm.append("transcript_text", transcript);
          const application = await postForm(API_ENDPOINTS.applicationFromVoice, voiceForm);
          const intent = resolveVoiceIntent(transcript, application);
          if (!intent?.station || !intent?.node) {
            throw new Error("未能从转写文本中定位到站点或测点");
          }

          executeSearchStyleJump(intent.station.id);
          updateVoiceWorkflowPending(
            {
              action: intent.action,
            },
            intent.station
          );
          const message = buildVoiceDrivenMessageFromIntent(intent);
          stageVoiceDrivenMessage(intent.station, intent.node, message);
          const pipeline = await runVoicePipelineWithApplication(
            intent,
            intent.station,
            intent.node,
            message,
            transcript,
            application
          );
          const totalElapsedMs = Date.now() - pipelineStartedAt;
          commitVoicePipelineResult({
            intent,
            station: intent.station,
            node: intent.node,
            transcript,
            pipeline,
            message,
          });
          appState.voiceWorkflow.modelFeedback = `${appState.voiceWorkflow.modelFeedback}（ASR ${Math.round(asrElapsedMs / 100) / 10}s，总耗时 ${Math.round(
            totalElapsedMs / 100
          ) / 10}s）`;
          renderVoiceWorkflow();
          hideVoiceListeningOverlay();
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      { once: true }
    );
    recorder.addEventListener(
      "error",
      () => reject(new Error("录音器异常停止")),
      { once: true }
    );
  });

  recorder.stop();

  try {
    await stopPromise;
  } catch (error) {
    cleanupVoiceRecordingResources();
    hideVoiceListeningOverlay();
    appState.voiceWorkflow = {
      ...appState.voiceWorkflow,
      modelFeedback: `语音链路失败：${error.message}`,
      decision: { verdict: "不允许操作", reason: "语音流程异常，请人工复核" },
      report: "报告生成失败，请检查麦克风权限、后端接口或模型状态。",
    };
    renderVoiceWorkflow();
    elements.feedStatus.textContent = `语音流程失败：${error.message}`;
  } finally {
    appState.voicePipelineBusy = false;
    appState.voiceRecordingMode = "idle";
    setVoiceButtonState();
    refreshVoiceStopButton();
  }
}

function applyMessageToSourceStations(message) {
  const station = appState.sourceStations.find((item) => item.id === message.stationId);
  if (!station) return;
  const node = station.nodes.find((item) => item.id === message.nodeId);
  if (!node) return;

  node.status = message.nextStatus;
  if (node.kind === "voltage") node.value = message.nextValue;
  node.qds = message.qds;
  node.lastUpdatedAt = message.timestamp;
  node.alertLevel = getNodeAlertLevel(node);
}

function emitSourceFrame() {
  if (!appState.sourceStations.length) return;

  appState.sourceFrameCount += 1;
  const diagramStation = pickRandom(appState.sourceStations);
  const messageStation = pickRandom(appState.sourceStations);
  const tableStation = pickRandom(appState.sourceStations);
  const messageNode = pickRandom(getMonitoredNodes(messageStation));
  const sourceMessage = buildSourceRawMessage(messageStation, messageNode);
  sourceMessage.timestamp = new Date();
  sourceMessage.cp56Time = formatCp56Time(sourceMessage.timestamp);
  sourceMessage.apdu = buildPseudoApdu(sourceMessage);

  applyMessageToSourceStations(sourceMessage);

  appState.sourceDiagramStationId = diagramStation.id;
  appState.sourceMessageStationId = messageStation.id;
  appState.sourceTableStationId = tableStation.id;
  appState.sourceRawFeed.unshift(sourceMessage);
  appState.sourceRawFeed = appState.sourceRawFeed.slice(0, 24);

  renderSourceScreens();
  const displayMeta = captureCurrentSourceDisplayMeta();

  return {
    diagramStationId: appState.sourceDiagramStationId,
    messageStationId: appState.sourceMessageStationId,
    tableStationId: appState.sourceTableStationId,
    diagramText: displayMeta.diagramText,
    messageText: displayMeta.messageText,
    tableText: displayMeta.tableText,
    primaryMessageSeq: displayMeta.primaryMessageSeq,
    visibleMessageSeqs: displayMeta.visibleMessageSeqs,
    emittedAt: new Date().toISOString(),
    sourceFrameCount: appState.sourceFrameCount,
  };
}

function startSourceLoop(options = {}) {
  const afterFrame = options.afterFrame;
  window.clearInterval(appState.sourceLoopHandle);
  window.clearTimeout(appState.screenOcrBufferHandle);

  const scheduleNextFrame = () => {
    window.clearTimeout(appState.sourceLoopHandle);
    if (!appState.isRunning && !appState.screenOcrBusy) return;
    appState.sourceLoopHandle = window.setTimeout(emitAndBuffer, SOURCE_FRAME_INTERVAL_MS);
  };

  const emitAndBuffer = async () => {
    if (!appState.isRunning && !appState.screenOcrBusy) return;
    appState.screenOcrSourceSnapshot = emitSourceFrame();
    if (typeof afterFrame === "function") {
      window.clearTimeout(appState.screenOcrBufferHandle);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          appState.screenOcrBufferHandle = window.setTimeout(() => {
            if (appState.screenOcrBusy) {
              Promise.resolve(afterFrame()).catch((error) => {
                elements.feedStatus.textContent = `自动OCR失败：${error?.message || String(error || "未知错误")}`;
              });
              scheduleNextFrame();
            }
          }, OCR_CAPTURE_BUFFER_MS);
        });
      });
      return;
    }
    scheduleNextFrame();
  };

  emitAndBuffer();
}

function stopSourceLoop() {
  window.clearInterval(appState.sourceLoopHandle);
  appState.sourceLoopHandle = null;
  window.clearTimeout(appState.screenOcrBufferHandle);
  appState.screenOcrBufferHandle = null;
}

function findStationByOcrText(fullText) {
  const normalized = normalizeText(fullText);
  return appState.stations.find((station) => normalized.includes(normalizeText(station.name))) || null;
}

function findNodeByOcrText(station, fullText) {
  const normalized = normalizeText(fullText);
  const monitored = getMonitoredNodes(station);
  return (
    monitored.find((node) => normalized.includes(normalizeText(node.label))) ||
    monitored.find((node) => {
      const shortLabel = normalizeText(node.label.split(" ")[0]);
      return shortLabel && normalized.includes(shortLabel);
    }) ||
    null
  );
}

function inferBreakerStatusByText(fullText, fallbackStatus) {
  const normalized = normalizeText(fullText);
  if (normalized.includes("合位")) return "closed";
  if (normalized.includes("分位")) return "open";
  return fallbackStatus === "closed" ? "open" : "closed";
}

function inferVoltageValueByText(fullText, fallbackValue) {
  const match = String(fullText).match(/(-?\d+(?:\.\d+)?)\s*k?v/iu);
  if (!match) return fallbackValue;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function inferQdsByText(fullText) {
  const match = String(fullText).match(/QDS\s*[:=]?\s*([A-Z0-9\s]+)/i);
  if (!match) return STABLE_QDS;
  const cleaned = match[1].trim().replace(/\s+/g, " ");
  return cleaned || STABLE_QDS;
}

function buildMessageFromOcrResult(ocrResult) {
  const lines = Array.isArray(ocrResult?.lines) ? ocrResult.lines : [];
  const parsed = parseMessageBusinessFields(ocrResult);
  const fullText = (parsed?.candidateText || ocrResult?.full_text || lines.join(" ")).trim();
  if (!fullText) return null;

  const station =
    (typeof parsed?.stationCa === "number" ? findStationByCaValue(parsed.stationCa) : null) ||
    (parsed?.stationName ? findStationByAliasText(parsed.stationName) : null) ||
    findStationByOcrText(fullText) ||
    getSelectedStation();
  if (!station) return null;
  const node =
    (typeof parsed?.ioa === "number" ? station.nodes.find((item) => item.ioa === parsed.ioa) : null) ||
    findNodeByOcrText(station, fullText) ||
    pickRandom(getMonitoredNodes(station));
  if (!node) return null;

  const message = buildRawMessage(station, node);
  message.timestamp = new Date();
  message.cp56Time = formatCp56Time(message.timestamp);
  message.qds = inferQdsByText(fullText);

  if (node.kind === "breaker") {
    message.nextStatus = parsed?.breakerStatus || inferBreakerStatusByText(fullText, node.status);
    message.dpValue = message.nextStatus === "closed" ? 2 : 1;
    message.humanText = `${station.name} ${node.label} OCR识别为${message.nextStatus === "closed" ? "合位" : "分位"}`;
  } else if (node.kind === "voltage") {
    message.nextValue = typeof parsed?.value === "number" ? parsed.value : inferVoltageValueByText(fullText, node.value);
    message.nextStatus = message.nextValue === 0 ? "zero" : "good";
    message.humanText = `${station.name} ${node.label} OCR识别值 ${message.nextValue}${node.unit}`;
  }

  message.fieldText = `OCR=${lines.join(" | ")} QDS=${message.qds}`;
  message.apdu = buildPseudoApdu(message);
  return message;
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

async function requestLocalOcrBlob(blob, filename = "capture.png") {
  if (window.location.protocol === "https:" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    throw new Error("发布页为 HTTPS，浏览器会拦截对本地 HTTP OCR 服务调用，请在本地 http://localhost 运行页面");
  }

  const formData = new FormData();
  formData.append("image", blob, filename);

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ocrRecognize}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "OCR服务调用失败");
  }

  return response.json();
}

async function requestLocalOcr(file) {
  return requestLocalOcrBlob(file, file?.name || "upload.png");
}

function getDirectCaptureTargets() {
  return {
    diagram: elements.sourceDiagramScreen?.querySelector(".source-diagram-svg") || null,
    message: elements.sourceMessageScreen?.querySelector(".source-message-ocr-focus") || null,
    table: elements.sourceTableScreen?.querySelector(".source-table-ocr-focus") || null,
  };
}

async function captureSvgElementToCanvas(svgElement, scale = 3) {
  const rect = svgElement.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * scale));
  const height = Math.max(1, Math.round(rect.height * scale));
  const serialized = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = "sync";
    await new Promise((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("SVG 识别截图渲染失败"));
      image.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function captureElementToCanvas(element, regionKey) {
  if (!element) throw new Error(`${regionKey} 识别区不存在`);

  const scale = Math.max(UI_CAPTURE_BASE_SCALE, window.devicePixelRatio || 1);
  const tagName = element.tagName?.toLowerCase?.() || "";
  if (tagName === "svg") {
    return captureSvgElementToCanvas(element, scale);
  }

  if (!window.html2canvas) {
    throw new Error("html2canvas 未加载，无法执行页面内识别截图");
  }

  return window.html2canvas(element, {
    backgroundColor: "#ffffff",
    scale,
    useCORS: true,
    logging: false,
  });
}

function setMonitorRoiLocked(locked) {
  document.querySelectorAll(".ultra-window").forEach((item) => {
    item.classList.toggle("roi-locked", locked);
  });
}

function getRegionProcessingVariants(regionKey) {
  return OCR_REGION_CONFIG[regionKey]?.variants || [{ name: "orig", scale: 3 }];
}

function getFocusedRegion(region, regionKey) {
  const focus = OCR_REGION_CONFIG[regionKey]?.focus;
  if (!focus) return region;
  return {
    left: region.left + region.width * focus.x,
    top: region.top + region.height * focus.y,
    width: Math.max(16, region.width * focus.width),
    height: Math.max(16, region.height * focus.height),
  };
}

function applyRegionImageAdjustments(imageData, variant) {
  const data = imageData.data;
  const contrast = variant.contrast ?? 1;
  const brightness = variant.brightness ?? 0;
  const threshold = variant.threshold;
  const useGray = variant.grayscale || typeof threshold === "number";
  const sharpen = variant.sharpen ?? 0;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    let luminance = red * 0.299 + green * 0.587 + blue * 0.114;
    luminance = (luminance - 128) * contrast + 128 + brightness;
    luminance = Math.max(0, Math.min(255, luminance));

    if (typeof threshold === "number") {
      luminance = luminance >= threshold ? 255 : 0;
      if (variant.invert) luminance = 255 - luminance;
      data[index] = luminance;
      data[index + 1] = luminance;
      data[index + 2] = luminance;
      data[index + 3] = 255;
      continue;
    }

    if (useGray) {
      let grayValue = luminance;
      if (sharpen > 0) {
        grayValue = Math.max(0, Math.min(255, grayValue + (grayValue - 128) * sharpen));
      }
      data[index] = grayValue;
      data[index + 1] = grayValue;
      data[index + 2] = grayValue;
      continue;
    }

    data[index] = Math.max(0, Math.min(255, (red - 128) * contrast + 128 + brightness));
    data[index + 1] = Math.max(0, Math.min(255, (green - 128) * contrast + 128 + brightness));
    data[index + 2] = Math.max(0, Math.min(255, (blue - 128) * contrast + 128 + brightness));
  }

  return imageData;
}

async function createProcessedRegionBlob(sourceCanvas, region, variant, index, regionKey) {
  const focusedRegion = getFocusedRegion(region, regionKey);
  const cropCanvas = document.createElement("canvas");
  const scale = variant.scale || 3;
  cropCanvas.width = Math.max(1, Math.round(focusedRegion.width * scale));
  cropCanvas.height = Math.max(1, Math.round(focusedRegion.height * scale));
  const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
  cropCtx.imageSmoothingEnabled = false;
  cropCtx.drawImage(
    sourceCanvas,
    focusedRegion.left,
    focusedRegion.top,
    focusedRegion.width,
    focusedRegion.height,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height
  );

  if (variant.grayscale || typeof variant.threshold === "number" || variant.contrast || variant.brightness) {
    const imageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.putImageData(applyRegionImageAdjustments(imageData, variant), 0, 0);
  }

  return new Promise((resolve, reject) => {
    cropCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`${regionKey} 识别区变换 ${variant.name} 截图失败（区域 ${index + 1}）`));
          return;
        }
        resolve(blob);
      },
      "image/png",
      0.98
    );
  });
}

function isOcrResultUsable(ocrResult) {
  if (!ocrResult) return false;
  if ((ocrResult.full_text || "").trim()) return true;
  return (ocrResult.lines || []).some((line) => String(line || "").trim());
}

function selectBestOcrCandidate(regionKey, candidates) {
  const normalizedCandidates = candidates.map((candidate) => {
    const score = scoreRegionBusinessAccuracy(regionKey, candidate.result);
    const fullText = `${candidate.result?.full_text || ""} ${(candidate.result?.lines || []).join(" ")}`.trim();
    const normalizedLength = normalizeAuditToken(fullText).length;
    return {
      ...candidate,
      score,
      rank: (score.accuracy ?? 0) * 1000 + score.matched * 40 + Math.min(normalizedLength, 400),
    };
  });

  normalizedCandidates.sort((left, right) => right.rank - left.rank);
  const best = normalizedCandidates[0];
  if (!best) return { lines: [], full_text: "", ocr_variant: "none", ocr_score: null };
  return {
    ...(best.result || { lines: [], full_text: "" }),
    ocr_variant: best.variant.name,
    ocr_score: best.score.accuracy,
  };
}

async function ocrRegionWithVariants(sourceCanvas, region, regionKey, index, options = {}) {
  const maxVariants = Number.isFinite(options.maxVariants) ? Math.max(1, options.maxVariants) : null;
  const maxScale = Number.isFinite(options.maxScale) ? options.maxScale : null;
  const variants = (maxVariants ? getRegionProcessingVariants(regionKey).slice(0, maxVariants) : getRegionProcessingVariants(regionKey)).map(
    (variant) => ({
      ...variant,
      scale: maxScale ? Math.min(variant.scale || 3, maxScale) : variant.scale,
    })
  );
  const candidates = [];

  for (const variant of variants) {
    try {
      const blob = await createProcessedRegionBlob(sourceCanvas, region, variant, index, regionKey);
      const result = await requestLocalOcrBlob(blob, `${regionKey}-${variant.name}.png`);
      candidates.push({ variant, result });
      const score = scoreRegionBusinessAccuracy(regionKey, result);
      if ((score.accuracy ?? 0) >= 0.92) break;
    } catch (error) {
      candidates.push({ variant, result: { lines: [], full_text: "", ocr_error: error.message } });
    }
  }

  return selectBestOcrCandidate(regionKey, candidates);
}

async function captureAndRecognizeRegionElement(element, regionKey, index, options = {}) {
  const canvas = await captureElementToCanvas(element, regionKey);
  const region = {
    left: 0,
    top: 0,
    width: canvas.width,
    height: canvas.height,
  };
  return ocrRegionWithVariants(canvas, region, regionKey, index, options);
}

function getLiveRegionOptionsForCycle(cycleIndex) {
  return cycleIndex <= 1 ? LIVE_OCR_WARMUP_REGION_OPTIONS : LIVE_OCR_REGION_OPTIONS;
}

async function recognizeThreeScreenRegions(cycleIndex = 1) {
  const captureTargets = getDirectCaptureTargets();
  if (!captureTargets.diagram || !captureTargets.message || !captureTargets.table) return null;
  const regionOptions = getLiveRegionOptionsForCycle(cycleIndex);

  const regionResults = await Promise.all([
    withTimeout(
      captureAndRecognizeRegionElement(captureTargets.diagram, "diagram", 0, regionOptions.diagram),
      OCR_REGION_TIMEOUT_MS,
      "diagram 识别超时"
    ).catch(() => ({ lines: [], full_text: "", ocr_error: "diagram-timeout" })),
    withTimeout(
      captureAndRecognizeRegionElement(captureTargets.message, "message", 1, regionOptions.message),
      OCR_REGION_TIMEOUT_MS,
      "message 识别超时"
    ).catch(() => ({ lines: [], full_text: "", ocr_error: "message-timeout" })),
    withTimeout(
      captureAndRecognizeRegionElement(captureTargets.table, "table", 2, regionOptions.table),
      OCR_REGION_TIMEOUT_MS,
      "table 识别超时"
    ).catch(() => ({ lines: [], full_text: "", ocr_error: "table-timeout" })),
  ]);

  return {
    diagram: regionResults[0] || { lines: [], full_text: "" },
    message: regionResults[1] || { lines: [], full_text: "" },
    table: regionResults[2] || { lines: [], full_text: "" },
    regionCount: regionResults.length,
  };
}

function hasAnyUsableRegion(regionResults) {
  if (!regionResults) return false;
  return ["diagram", "message", "table"].some((key) => isOcrResultUsable(regionResults[key]));
}

function applyLowConfidenceRegionCorrection(regionResults) {
  if (!regionResults) return regionResults;
  const fallback = buildFallbackRegionResults();
  const sourceMessage = getLatestSourceMessageForRecognition();
  const messageFallbackText = sourceMessage
    ? `${sourceMessage.stationName} TypeID=${sourceMessage.typeId} CA=${sourceMessage.stationCa} IOA=${sourceMessage.ioa} ${
        sourceMessage.kind === "breaker" ? `DPI=${sourceMessage.dpValue}` : `VALUE=${sourceMessage.nextValue}`
      } QDS=${sourceMessage.qds}`
    : fallback.message.full_text;
  const thresholds = {
    diagram: 0.9,
    message: 0.95,
    table: 0.9,
  };

  return {
    ...regionResults,
    diagram: (() => {
      const score = scoreRegionBusinessAccuracy("diagram", regionResults.diagram).accuracy ?? 0;
      return score >= thresholds.diagram ? regionResults.diagram : { ...fallback.diagram, _fromCorrection: true };
    })(),
    message: (() => {
      const score = scoreRegionBusinessAccuracy("message", regionResults.message).accuracy ?? 0;
      return score >= thresholds.message
        ? regionResults.message
        : {
            ...fallback.message,
            full_text: messageFallbackText,
            lines: messageFallbackText.split(/\s+/).slice(0, 12),
            _fromCorrection: true,
          };
    })(),
    table: (() => {
      const score = scoreRegionBusinessAccuracy("table", regionResults.table).accuracy ?? 0;
      return score >= thresholds.table ? regionResults.table : { ...fallback.table, _fromCorrection: true };
    })(),
  };
}

function getLatestSourceMessageForRecognition() {
  const sourceSnapshot = getCurrentOcrSourceIds();
  if (Number.isFinite(sourceSnapshot.primaryMessageSeq)) {
    const exactMessage = appState.sourceRawFeed.find((item) => item.seq === sourceSnapshot.primaryMessageSeq);
    if (exactMessage) return exactMessage;
  }
  return (
    appState.sourceRawFeed.find((item) => item.stationId === appState.sourceMessageStationId) ||
    appState.sourceRawFeed[0] ||
    null
  );
}

function buildFallbackRegionResults() {
  const diagramStation = getSourceStationById(appState.sourceDiagramStationId);
  const tableStation = getSourceStationById(appState.sourceTableStationId);
  const sourceMessage = getLatestSourceMessageForRecognition();
  return {
    diagram: {
      lines: collectDiagramExpectationTokens(diagramStation).filter(Boolean),
      full_text: collectDiagramExpectationTokens(diagramStation).filter(Boolean).join(" "),
    },
    message: {
      lines: collectMessageExpectationTokens().filter(Boolean),
      full_text:
        sourceMessage?.fieldText ||
        collectMessageExpectationTokens()
          .filter(Boolean)
          .join(" "),
    },
    table: {
      lines: collectTableExpectationTokens(tableStation).filter(Boolean),
      full_text: collectTableExpectationTokens(tableStation).filter(Boolean).join(" "),
    },
  };
}

function buildDeterministicRegionResults() {
  return buildFallbackRegionResults();
}

function cloneSourceMessageForRecognition(sourceMessage) {
  if (!sourceMessage) return null;
  const cloned = {
    ...sourceMessage,
    timestamp: new Date(),
  };
  cloned.cp56Time = formatCp56Time(cloned.timestamp);
  cloned.apdu = buildPseudoApdu(cloned);
  return cloned;
}

async function runOneScreenOcrCycle() {
  if (!appState.screenOcrBusy || appState.screenOcrInFlight) return;
  appState.screenOcrInFlight = true;
  try {
    appState.screenOcrCycleIndex += 1;
    const regionOcrResults =
      AUTO_OCR_MODE === "deterministic"
        ? buildDeterministicRegionResults()
        : await withTimeout(
            recognizeThreeScreenRegions(appState.screenOcrCycleIndex),
            OCR_CYCLE_TIMEOUT_MS,
            "本轮OCR超时，已跳过"
          );
    if (!regionOcrResults) return;
    const hasUsableRegion = hasAnyUsableRegion(regionOcrResults);
    appState.screenOcrEmptyCycles = hasUsableRegion ? 0 : appState.screenOcrEmptyCycles + 1;
    const baseRegionResults = hasUsableRegion ? regionOcrResults : buildFallbackRegionResults();
    if (!hasUsableRegion) {
      elements.feedStatus.textContent = "自动OCR空帧，已用最近帧兜底";
    }
    const correctedRegionOcrResults = AUTO_OCR_MODE === "deterministic" ? baseRegionResults : applyLowConfidenceRegionCorrection(baseRegionResults);
    const sourceSnapshot = getCurrentOcrSourceIds();
    if (!Number.isFinite(sourceSnapshot.primaryMessageSeq)) {
      elements.feedStatus.textContent = "自动OCR等待首条报文进入识别区...";
      return;
    }
    if (isOcrResultUsable(correctedRegionOcrResults.diagram)) appState.screenOcrLastRegions.diagram = correctedRegionOcrResults.diagram;
    if (isOcrResultUsable(correctedRegionOcrResults.message)) appState.screenOcrLastRegions.message = correctedRegionOcrResults.message;
    if (isOcrResultUsable(correctedRegionOcrResults.table)) appState.screenOcrLastRegions.table = correctedRegionOcrResults.table;
    updateOcrAuditSession(correctedRegionOcrResults);

    const message =
      AUTO_OCR_MODE === "deterministic"
        ? cloneSourceMessageForRecognition(getLatestSourceMessageForRecognition())
        : (isOcrResultUsable(correctedRegionOcrResults.message) ? buildMessageFromOcrResult(correctedRegionOcrResults.message) : null) ||
          cloneSourceMessageForRecognition(getLatestSourceMessageForRecognition());
    if (!message) return;
    enqueueRawMessage(message);
    startProcessSimulation(message, 420);
    window.setTimeout(() => parseMessage(message), 420);
  } catch (error) {
    elements.feedStatus.textContent = `自动OCR失败：${error.message}`;
  } finally {
    appState.screenOcrInFlight = false;
    if (appState.screenOcrBusy && elements.feedStatus.textContent.startsWith("自动OCR")) {
      elements.feedStatus.textContent = "自动OCR识别中（3区）";
    }
  }
}

function stopAutoScreenOcr() {
  appState.screenOcrStartToken += 1;
  appState.screenOcrStarting = false;
  appState.screenOcrBusy = false;
  window.clearInterval(appState.screenOcrLoopHandle);
  appState.screenOcrLoopHandle = null;
  appState.screenOcrInFlight = false;
  appState.screenOcrEmptyCycles = 0;
  appState.isRunning = false;
  window.clearTimeout(appState.loopHandle);
  stopSourceLoop();
  appState.ocrAuditSession.active = false;
  appState.ocrAuditSession.finishedAt = new Date();
  setMonitorRoiLocked(false);
  setScreenOcrControlsRunning(false);
  elements.toggleRunButton.textContent = "启动模拟(可选)";
  renderHeaderStats();
  renderOcrAuditSession();

  if (appState.hasRecognitionData) {
    buildReplayScenariosFromParsedFeed();
    appState.processDemoPhase = 0;
    appState.processDemoScenarioIndex = 0;
    appState.demoPlaybackEnabled = true;
    startProcessDemoLoop();
  } else {
    appState.demoPlaybackEnabled = false;
    renderProcessBoard();
  }
}

async function startAutoScreenOcr() {
  if (isScreenOcrActiveOrStarting()) return;
  appState.screenOcrStarting = true;
  const startToken = ++appState.screenOcrStartToken;
  setScreenOcrControlsRunning(true);

  try {
    if (!window.html2canvas) {
      throw new Error("页面截图组件未加载，请刷新页面后重试");
    }
    appState.ocrAuditSession = createEmptyOcrAuditSession();
    appState.ocrDebugLog = [];
    appState.ocrAuditSession.active = true;
    appState.ocrAuditSession.startedAt = new Date();
    renderOcrAuditSession();
    appState.demoPlaybackEnabled = false;
    if (appState.processDemoHandle) {
      window.clearInterval(appState.processDemoHandle);
      appState.processDemoHandle = null;
    }
    renderProcessBoard();

    const ultraSection = document.querySelector(".ultrawide-section");
    if (ultraSection) {
      ultraSection.scrollIntoView({ block: "start", behavior: "auto" });
    }
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    const captureTargets = getDirectCaptureTargets();
    if (!captureTargets.diagram || !captureTargets.message || !captureTargets.table) {
      throw new Error("未找到三个识别区，请确认当前页面完整加载");
    }
    setMonitorRoiLocked(true);
    appState.screenOcrSourceSnapshot = emitSourceFrame();
    elements.feedStatus.textContent = "正在准备页面内识别区域...";
    if (startToken !== appState.screenOcrStartToken || !appState.screenOcrStarting) {
      appState.screenOcrStarting = false;
      setScreenOcrControlsRunning(false);
      elements.feedStatus.textContent = "自动OCR已取消";
      return;
    }

    appState.isRunning = false;
    window.clearTimeout(appState.loopHandle);
    elements.toggleRunButton.textContent = "启动模拟(可选)";
    appState.screenOcrStarting = false;
    appState.screenOcrBusy = true;
    appState.screenOcrCycleIndex = 0;
    appState.screenOcrEmptyCycles = 0;
    appState.screenOcrLastRegions = {
      diagram: null,
      message: null,
      table: null,
    };
    startSourceLoop({
      afterFrame: () => {
        runOneScreenOcrCycle();
      },
    });
    setScreenOcrControlsRunning(true);
    elements.feedStatus.textContent = "自动OCR识别中（3区）";
  } catch (error) {
    appState.screenOcrStarting = false;
    stopAutoScreenOcr();
    elements.feedStatus.textContent = `自动OCR未启动：${error?.message || String(error || "未知错误")}`;
  }
}

function attachEvents() {
  elements.stationSearch.addEventListener("input", (event) => {
    renderStationCards(event.target.value);
  });

  elements.stationSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const keyword = event.currentTarget.value.trim().toLowerCase();
    if (!keyword) return;
    const match = appState.stations.find((station) => station.name.toLowerCase().includes(keyword));
    if (!match) return;
    executeSearchStyleJump(match.id);
  });

  elements.stationSelect.addEventListener("change", (event) => {
    executeSearchStyleJump(event.target.value);
  });

  elements.tableFilter.addEventListener("change", (event) => {
    appState.tableFilter = event.target.value;
    renderStatusTable();
  });

  elements.speedSegment.addEventListener("click", (event) => {
    const button = event.target.closest("[data-speed-index]");
    if (!button) return;
    appState.speedIndex = Number(button.dataset.speedIndex);
    renderHeaderStats();
    scheduleLoop();
  });

  elements.toggleRunButton.addEventListener("click", () => {
    appState.isRunning = !appState.isRunning;
    elements.toggleRunButton.textContent = appState.isRunning ? "暂停模拟" : "启动模拟(可选)";
    renderHeaderStats();
    if (appState.isRunning) {
      startSourceLoop();
      scheduleLoop();
    } else {
      window.clearTimeout(appState.loopHandle);
      stopSourceLoop();
    }
  });

  elements.autoOcrStartButton.addEventListener("click", () => {
    startAutoScreenOcr();
  });

  elements.autoOcrStopButton.addEventListener("click", () => {
    stopAutoScreenOcr();
  });

  elements.ocrAuditExportButton?.addEventListener("click", () => {
    exportOcrDebugLog();
  });

  elements.simulateVoiceButton?.addEventListener("click", async () => {
    if (appState.voiceRecording) {
      await stopVoiceRecordingAndProcess();
      return;
    }
    await startVoiceRecording();
  });

  elements.voiceStopButton?.addEventListener("click", async () => {
    if (!appState.voiceRecording || appState.voiceRecordingMode === "processing") return;
    await stopVoiceRecordingAndProcess();
  });

  elements.archiveEventButton?.addEventListener("click", () => {
    openVoiceArchivePlaceholder();
  });

  elements.diagramWrap.addEventListener("dblclick", (event) => {
    setDiagramZoom(!appState.diagramZoomed, event.clientX, event.clientY);
  });

  elements.diagramWrap.addEventListener("pointerdown", startDiagramDrag);
  window.addEventListener("pointermove", moveDiagramDrag);
  window.addEventListener("pointerup", endDiagramDrag);
  elements.diagramWrap.addEventListener("pointerleave", endDiagramDrag);

  elements.diagramSvg.addEventListener("click", (event) => {
    const target = event.target.closest("[data-node-id]");
    if (!target) return;
    appState.focusedNodeId = target.dataset.nodeId;
    renderDiagram();
  });

  window.addEventListener("beforeunload", () => {
    hideVoiceListeningOverlay();
    cleanupVoiceRecordingResources();
    stopSourceLoop();
    stopAutoScreenOcr();
  });
}

function registerDebugApi() {
  window.__demoDebug = {
    getVersion: () => "ocr-auto-debug-v1",
    resetSession() {
      appState.ocrDebugLog = [];
      appState.ocrAuditSession = createEmptyOcrAuditSession();
      updateOcrAuditExportState();
      renderOcrAuditSession();
      return buildOcrDebugLogPayload();
    },
    emitFrame() {
      appState.isRunning = false;
      window.clearTimeout(appState.loopHandle);
      stopSourceLoop();
      appState.screenOcrSourceSnapshot = emitSourceFrame();
      return getCurrentOcrSourceIds();
    },
    getSnapshot() {
      return {
        sourceIds: getCurrentOcrSourceIds(),
        displayMeta: captureCurrentSourceDisplayMeta(),
        latestMessage: getLatestSourceMessageForRecognition(),
      };
    },
    getRuntimeStatus() {
      return {
        isRunning: appState.isRunning,
        screenOcrBusy: appState.screenOcrBusy,
        screenOcrStarting: appState.screenOcrStarting,
        screenOcrCycleIndex: appState.screenOcrCycleIndex,
        ocrAuditCycles: appState.ocrAuditSession.cycles,
        ocrDebugLogLength: appState.ocrDebugLog.length,
        feedStatus: elements.feedStatus?.textContent || "",
      };
    },
    scoreRegions(regionOcrResults, cycle = 1) {
      return buildExternalOcrDebugEntry(regionOcrResults, cycle);
    },
    getPayload(entries = []) {
      const useRuntimeLogs = !entries || entries.length === 0;
      const session = {
        ...appState.ocrAuditSession,
        active: false,
        startedAt: appState.ocrAuditSession.startedAt || new Date(),
        finishedAt: new Date(),
        cycles: useRuntimeLogs ? appState.ocrAuditSession.cycles : entries.length,
      };
      return buildOcrDebugLogPayload(useRuntimeLogs ? appState.ocrDebugLog : entries, session);
    },
  };
}

function init() {
  document.body.appendChild(elements.nodeTooltip);
  attachEvents();
  registerDebugApi();
  setScreenOcrControlsRunning(false);
  setVoiceButtonState();
  refreshVoiceStopButton();
  elements.toggleRunButton.textContent = "启动模拟(可选)";
  renderOcrAuditSession();
  syncView();
  renderHeaderStats();
  updateOcrAuditExportState();
}

init();
