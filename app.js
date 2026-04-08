const STABLE_QDS = "IV0 NT0 SB0 BL0";

const speedProfiles = [
  { label: "低频", min: 2600, max: 4200, cvDelay: 1400 },
  { label: "标准", min: 1100, max: 2200, cvDelay: 760 },
  { label: "高频", min: 480, max: 1200, cvDelay: 420 },
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
  isRunning: true,
  speedIndex: 1,
  messageSeq: 0,
  selectedStationId: stationBlueprints[0].id,
  tableFilter: "all",
  stations: stationBlueprints.map((station) => ({
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
  })),
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
  diagramZoomed: false,
  isDraggingDiagram: false,
  dragStartX: 0,
  dragStartY: 0,
  dragScrollLeft: 0,
  dragScrollTop: 0,
  focusedNodeId: null,
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
  injectButton: document.querySelector("#injectButton"),
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
};

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

function getMonitoredNodes(station) {
  return station.nodes.filter((node) => node.monitored);
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

function buildRawMessage(station, node) {
  const now = new Date();
  const catalog = protocolCatalog[node.kind];
  const seq = ++appState.messageSeq;

  if (node.kind === "breaker") {
    const nextStatus = node.status === "open" ? "closed" : "open";
    const dpValue = nextStatus === "closed" ? 2 : 1;
    const qds = Math.random() < 0.18 ? "IV0 NT0 SB1 BL0" : STABLE_QDS;
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

  const nextStatus = node.status === "good" ? "zero" : "good";
  const jitter = getRandomInt(-4, 4) / 10;
  const qds = nextStatus === "zero" ? STABLE_QDS : Math.random() < 0.14 ? "IV0 NT0 BL1 SB0" : STABLE_QDS;
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
  elements.stationCount.textContent = String(appState.stations.length);
  elements.messageCount.textContent = String(appState.totals.recognized);
  elements.anomalyCount.textContent = String(appState.activeAnomalies.length);
  elements.speedLabel.textContent = speedProfiles[appState.speedIndex].label;
  elements.liveIndicator.textContent = appState.isRunning ? "实时中" : "已暂停";
  elements.liveIndicator.className = `badge ${appState.isRunning ? "badge-live" : ""}`.trim();
  elements.feedStatus.textContent = appState.isRunning ? "CV 监听中" : "CV 暂停";
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

function upsertActiveAnomaly(station, node, summary, timestamp) {
  const existingIndex = appState.activeAnomalies.findIndex(
    (item) => item.stationId === station.id && item.nodeId === node.id
  );

  const entry = {
    stationId: station.id,
    stationName: station.name,
    nodeId: node.id,
    nodeLabel: node.label,
    ioa: node.ioa,
    typeName: node.typeName,
    severity: node.alertLevel,
    summary,
    startedAt:
      existingIndex >= 0 ? appState.activeAnomalies[existingIndex].startedAt : timestamp,
    updatedAt: timestamp,
  };

  if (existingIndex >= 0) {
    appState.activeAnomalies[existingIndex] = entry;
  } else {
    appState.activeAnomalies.unshift(entry);
  }

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
  const breakers = getMonitoredNodes(station).filter((node) => node.kind === "breaker").slice(0, 4);
  const voltages = getMonitoredNodes(station).filter((node) => node.kind === "voltage").slice(0, 2);
  const branchXs = [134, 202, 270, 338];

  const breakerMarkup = breakers
    .map((node, index) => {
      const x = branchXs[index];
      const color = node.alertLevel === "critical" ? "#fb923c" : node.alertLevel === "warning" ? "#facc15" : node.status === "closed" ? "#ef4444" : "#22c55e";
      const label = node.label.split(" ")[0];
      return `
        <text x="${x - 16}" y="40" fill="#ff7d6f" font-size="9" font-weight="700">${label}</text>
        <text x="${x - 12}" y="56" fill="#8bf5ac" font-size="8.5">${node.status === "closed" ? "1" : "0"}.0</text>
        <line x1="${x}" y1="56" x2="${x}" y2="134" stroke="#eef4ff" stroke-width="2" />
        <circle cx="${x}" cy="86" r="8" fill="none" stroke="${color}" stroke-width="2.2" />
        <line x1="${x - 5}" y1="86" x2="${x + 5}" y2="86" stroke="${color}" stroke-width="2" stroke-linecap="round" />
      `;
    })
    .join("");

  const voltageMarkup = voltages
    .map((node, index) => {
      const x = index === 0 ? 184 : 300;
      const valueColor = node.status === "zero" ? "#fb923c" : "#34d2ff";
      return `
        <rect x="${x - 28}" y="164" width="56" height="28" rx="8" fill="rgba(15,35,58,0.88)" stroke="${valueColor}" stroke-width="2" />
        <text x="${x}" y="182" fill="#eef4ff" font-size="11" font-weight="700" text-anchor="middle">${node.value}${node.unit}</text>
        <text x="${x}" y="212" fill="#8fc2f2" font-size="9" text-anchor="middle">${node.bay}</text>
      `;
    })
    .join("");

  return `
    <svg class="source-diagram-svg" viewBox="0 0 420 248" aria-hidden="true">
      <rect x="0" y="0" width="420" height="248" rx="16" fill="#02070d" />
      <rect x="12" y="12" width="102" height="84" rx="10" fill="none" stroke="#28e06c" stroke-dasharray="4 3" />
      <text x="18" y="30" fill="#d7efff" font-size="10" font-weight="700">${station.name}</text>
      <text x="18" y="48" fill="#88f7ab" font-size="8.5">一次接线图原始画面</text>
      <line x1="108" y1="56" x2="352" y2="56" stroke="#eef4ff" stroke-width="2.4" />
      <line x1="108" y1="136" x2="352" y2="136" stroke="#eef4ff" stroke-width="2.4" />
      ${breakerMarkup}
      ${voltageMarkup}
      <line x1="360" y1="32" x2="360" y2="208" stroke="#28e06c" stroke-width="1.6" stroke-dasharray="5 4" />
      <text x="394" y="84" fill="#ff7d6f" font-size="14" font-weight="700" transform="rotate(90 394 84)">${station.name}</text>
    </svg>
  `;
}

function getCurrentProcessDemo() {
  return processDemoScenarios[appState.processDemoScenarioIndex];
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
  const currentPhase = appState.processDemoPhase;
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

  appState.processDemoHandle = window.setInterval(() => {
    if (appState.processDemoPhase >= processStepTemplate.length - 1) {
      appState.processDemoPhase = 0;
      appState.processDemoScenarioIndex = (appState.processDemoScenarioIndex + 1) % processDemoScenarios.length;
    } else {
      appState.processDemoPhase += 1;
    }
    renderProcessBoard();
  }, 3600);
}

function renderSourceScreens() {
  const station = getSelectedStation();
  const monitoredNodes = getMonitoredNodes(station);
  const latestMessages = appState.rawFeed.filter((item) => item.stationId === station.id).slice(0, 6);

  elements.sourceDiagramScreen.innerHTML = `
    ${buildSourceDiagramPreview(station)}
  `;

  elements.sourceMessageScreen.innerHTML =
    latestMessages
      .map(
        (message) => `
      <div class="source-message-line">
        [${formatTime(message.timestamp)}] #${String(message.seq).padStart(4, "0")} ${message.stationName}<br />
        ${message.apdu}
      </div>
    `
      )
      .join("") || `<div class="source-message-line">等待报文屏产生滚动内容...</div>`;

  elements.sourceTableScreen.innerHTML =
    monitoredNodes
      .slice(0, 6)
      .map(
        (node) => `
      <article class="source-table-row">
        <div class="source-table-main">
          <span class="source-state-dot ${node.alertLevel === "warning" ? "warning" : node.alertLevel === "critical" ? "critical" : ""}"></span>
          <span>${node.label}</span>
        </div>
        <div class="source-table-meta">${describeNodeStatus(node)}</div>
      </article>
    `
      )
      .join("");
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
  const feedItems = appState.rawFeed.filter((item) => item.stationId === stationId).slice(0, 6);
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
}

function renderParsedFeed() {
  if (!elements.parsedFeed) return;
  const stationId = appState.selectedStationId;
  const feedItems = appState.parsedFeed.filter((item) => item.stationId === stationId).slice(0, 6);
  elements.parsedFeed.innerHTML =
    feedItems
      .map(
        (item) => `
      <article class="feed-item parsed compact ${severityClass(item.severity)} ${appState.focusedNodeId === item.nodeId ? "targeted" : ""}" data-node-id="${item.nodeId}">
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

  elements.statusTableBody.innerHTML =
    nodes
      .map(
        (node) => `
      <tr class="${severityClass(node.alertLevel)} ${appState.focusedNodeId === node.id ? "targeted" : ""}" data-node-id="${node.id}">
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
          <span>${formatTime(item.updatedAt)}</span>
        </div>
        <strong>${item.nodeLabel}</strong>
        <p>${item.summary}</p>
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

function updateCvMeta(entry) {
  if (!elements.cvMeta) return;
  elements.cvMeta.textContent = "结果 02 · CV 理解";
}

function syncView() {
  renderHeaderStats();
  renderStationSelector();
  renderStationCards(elements.stationSearch.value);
  renderAnomalyCards();
  renderProcessBoard();
  renderSourceScreens();
  renderDiagram();
  renderRawFeed();
  renderParsedFeed();
  renderStatusTable();
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
    upsertActiveAnomaly(station, node, summary, parsedAt);
  } else {
    node.lastAnomalyText = "无";
    removeActiveAnomaly(station.id, node.id);
  }

  station.lastEvent = `${message.typeName} / IOA ${message.ioa} / ${summary}`;
  station.lastEventAt = parsedAt;

  const parsedEntry = {
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
  syncView();
}

function emitNextMessage() {
  if (!appState.isRunning) {
    scheduleLoop();
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
    elements.toggleRunButton.textContent = appState.isRunning ? "暂停模拟" : "恢复模拟";
    renderHeaderStats();
    scheduleLoop();
  });

  elements.injectButton.addEventListener("click", injectManualMessage);

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
}

function init() {
  document.body.appendChild(elements.nodeTooltip);
  attachEvents();
  syncView();
  startProcessDemoLoop();
  scheduleLoop();
}

init();
