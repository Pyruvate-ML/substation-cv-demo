const STABLE_QDS = "IV0 NT0 SB0 BL0";

const speedProfiles = [
  { label: "低频", min: 2600, max: 4200, cvDelay: 1400 },
  { label: "标准", min: 1100, max: 2200, cvDelay: 760 },
  { label: "高频", min: 480, max: 1200, cvDelay: 420 },
];

const processStepTemplate = [
  { id: "capture", title: "截图采集", desc: "抓取监控画面 ROI" },
  { id: "ocr", title: "OCR / 图元识别", desc: "提取文本与颜色状态" },
  { id: "parse", title: "规约解析", desc: "映射 CA / IOA / TypeID / QDS" },
  { id: "map", title: "状态回写", desc: "同步一次图、表格与事件流" },
];

const roiRegions = [
  { name: "黑盒报文区", x: 1120, y: 124, w: 508, h: 408, enabled: true, purpose: "滚动报文 OCR" },
  { name: "一次接线图区", x: 112, y: 132, w: 840, h: 560, enabled: true, purpose: "图元颜色与闪烁检测" },
  { name: "状态表区", x: 960, y: 544, w: 668, h: 392, enabled: true, purpose: "结构化状态对照" },
  { name: "悬浮提示区", x: 320, y: 180, w: 320, h: 220, enabled: false, purpose: "按需二次采样" },
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
    stages: processStepTemplate.map((step) => ({ ...step, status: "pending" })),
  },
  loopHandle: null,
  pulseHandle: null,
  processTimers: [],
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
  diagramTitle: document.querySelector("#diagramTitle"),
  diagramSubtitle: document.querySelector("#diagramSubtitle"),
  diagramWrap: document.querySelector("#diagramWrap"),
  diagramSvg: document.querySelector("#diagramSvg"),
  nodeTooltip: document.querySelector("#nodeTooltip"),
  rawFeed: document.querySelector("#rawFeed"),
  parsedFeed: document.querySelector("#parsedFeed"),
  cvMeta: document.querySelector("#cvMeta"),
  statusTableBody: document.querySelector("#statusTableBody"),
  normalCount: document.querySelector("#normalCount"),
  warningCount: document.querySelector("#warningCount"),
  criticalCount: document.querySelector("#criticalCount"),
  anomalyCards: document.querySelector("#anomalyCards"),
  roiList: document.querySelector("#roiList"),
  apiPayload: document.querySelector("#apiPayload"),
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
    stages: processStepTemplate.map((step, index) => ({
      ...step,
      status: index < stageIndex ? "completed" : index === stageIndex ? "active" : "pending",
    })),
  };
  renderProcessBoard();
}

function completeProcessState(message) {
  appState.process = {
    seq: message.seq,
    stationName: message.stationName,
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
    behavior: "smooth",
  });
}

function focusNodeFromTimeline(stationId, nodeId) {
  appState.selectedStationId = stationId;
  appState.focusedNodeId = nodeId;
  syncView();

  setDiagramZoom(true);
  window.requestAnimationFrame(() => {
    centerDiagramOnNode(nodeId);
  });
  window.setTimeout(() => centerDiagramOnNode(nodeId), 120);
  window.setTimeout(() => centerDiagramOnNode(nodeId), 280);
}

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
      appState.selectedStationId = button.dataset.stationCard;
      syncView();
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

function renderProcessBoard() {
  elements.processBoard.innerHTML = appState.process.stages
    .map(
      (stage, index) => `
      <article class="process-step process-${stage.status}">
        <div class="process-head">
          <span class="process-index">0${index + 1}</span>
          <span class="process-status">${stage.status === "active" ? "处理中" : stage.status === "completed" ? "已完成" : "等待"}</span>
        </div>
        <strong>${stage.title}</strong>
        <p>${stage.desc}</p>
        <div class="process-station">${appState.process.stationName}</div>
      </article>
    `
    )
    .join("");
}

function renderRoiList() {
  elements.roiList.innerHTML = roiRegions
    .map(
      (roi) => `
      <article class="roi-item">
        <div class="panel-head">
          <strong>${roi.name}</strong>
          <span class="badge ${roi.enabled ? "badge-live" : ""}">${roi.enabled ? "启用" : "待定"}</span>
        </div>
        <p>${roi.purpose}</p>
        <code>x=${roi.x}, y=${roi.y}, w=${roi.w}, h=${roi.h}</code>
      </article>
    `
    )
    .join("");
}

function renderApiPayload() {
  elements.apiPayload.textContent = JSON.stringify(appState.apiPayload, null, 2);
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
  elements.diagramTitle.textContent = `${station.name} 一次接线图`;
  elements.diagramSubtitle.textContent = `${station.region} · CA ${station.ca} · 支持开关 / 刀闸 / 主变 / 电容器 / 电压节点可视表达`;

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
  elements.rawFeed.innerHTML =
    appState.rawFeed
      .map(
        (item) => `
      <article class="feed-item raw ${severityClass(item.severity)}">
        <div class="feed-item-header">
          <strong>#${String(item.seq).padStart(4, "0")} ${item.stationName}</strong>
          <span class="feed-meta">${formatTime(item.timestamp)}</span>
        </div>
        <p>${item.humanText}</p>
        <div class="feed-meta">${item.fieldText}</div>
        <p>${item.apdu}</p>
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
  elements.parsedFeed.innerHTML =
    appState.parsedFeed
      .map(
        (item) => `
      <article class="feed-item parsed ${severityClass(item.severity)}">
        <div class="feed-item-header">
          <strong>${item.stationName}</strong>
          <span class="confidence">置信度 ${item.confidence}%</span>
        </div>
        <p>${item.summary}</p>
        <div class="feed-meta">${item.fieldText}</div>
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
  const nodes = getMonitoredNodes(station)
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

  const summary = getMonitoredNodes(station).reduce(
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
      <tr class="${severityClass(node.alertLevel)}">
        <td>${node.label}</td>
        <td>${node.bay}</td>
        <td>${node.ioa}</td>
        <td>${node.typeId} / ${node.typeName}</td>
        <td><span class="state-chip ${severityClass(node.alertLevel)}">${describeNodeStatus(node)}</span></td>
        <td><span class="severity-pill ${severityClass(node.alertLevel)}">${severityLabel(node.alertLevel)}</span></td>
        <td>${node.qds}</td>
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
  elements.cvMeta.textContent = `最近识别 ${entry.stationName} · IOA ${entry.ioa} · ${severityLabel(entry.severity)}`;
}

function syncView() {
  renderHeaderStats();
  renderStationSelector();
  renderStationCards(elements.stationSearch.value);
  renderAnomalyCards();
  renderProcessBoard();
  renderDiagram();
  renderRawFeed();
  renderParsedFeed();
  renderStatusTable();
  renderRoiList();
  renderApiPayload();
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
    roiHints: roiRegions.filter((roi) => roi.enabled).map((roi) => roi.name),
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

  elements.stationSelect.addEventListener("change", (event) => {
    appState.selectedStationId = event.target.value;
    syncView();
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
  scheduleLoop();
}

init();
