/**
 * CV 识别动态演示（主干提取版）
 *
 * 用途：
 * 1) 作为独立“动画主干”交给其他 agent/代码生成器 修改。
 * 2) 不依赖项目构建系统，可直接按函数片段回贴到 app.js / styles.css。
 *
 * 说明：
 * - JS 主干：步骤模板、视觉卡片渲染、流程渲染、轮播调度。
 * - CSS 主干：流程卡和关键动画（扫描/ROI/OCR/解析/同步）。
 * - 性能优化：已解耦 DOM 生成与状态更新，并强制开启 GPU 加速避免重绘抽搐。
 */

export const processStepTemplateCore = [
  { id: "capture", title: "屏幕抓取", desc: "从报文屏持续截取最新画面", screen: "屏幕 02" },
  { id: "detect", title: "区域定位", desc: "框出需要识别的报文行与关键字段", screen: "CV" },
  { id: "ocr", title: "内容识别", desc: "读出设备名、数值、状态和时间", screen: "CV" },
  { id: "parse", title: "状态解释", desc: "把识别结果转成设备状态含义", screen: "CV" },
  { id: "sync", title: "结果展示", desc: "同步更新接线图和状态表", screen: "屏幕 01 / 03" },
];

export function getScenarioSeverityToneCore(scenario) {
  if (scenario.resultTags.includes("危急")) return "critical";
  if (scenario.resultTags.includes("告警")) return "warning";
  return "normal";
}

export function getScenarioShortLineCore(scenario) {
  return scenario.captureLines[1] ?? scenario.captureLines[0] ?? "等待示例";
}

export function buildMessageThumbnailCore(lines) {
  return `
    <div class="process-thumb process-thumb-message">
      <div class="process-thumb-bar"></div>
      <div class="process-thumb-lines">
        ${lines.map((line) => `<div class="process-thumb-line">${line}</div>`).join("")}
      </div>
    </div>
  `;
}

export function getProcessVisualMarkupCore(stage, scenario) {
  const tone = getScenarioSeverityToneCore(scenario);
  const zoomLine = getScenarioShortLineCore(scenario);

  if (stage.id === "capture") {
    return `
      <div class="process-visual process-visual-capture">
        <div class="process-scene capture-scene">
          <div class="process-capture-frame">
            ${buildMessageThumbnailCore(scenario.captureLines)}
            <div class="process-scan-overlay"></div>
          </div>
          <div class="process-caption">沿上下往返路径扫描源屏缩略图，持续截取报文</div>
        </div>
      </div>
    `;
  }

  if (stage.id === "detect") {
    return `
      <div class="process-visual process-visual-detect">
        <div class="process-scene detect-scene">
          <div class="process-thumb-wrap">
            ${buildMessageThumbnailCore(scenario.captureLines)}
            <span class="roi-frame"></span>
          </div>
          <div class="process-zoom-card tone-${tone}">
            <div class="zoom-label">定位区域放大</div>
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
            ${scenario.ocrLines.map((line, index) => `<div class="ocr-sheet-line line-${index + 1}">${line}</div>`).join("")}
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
          <div class="parse-arrow">→</div>
          <div class="parse-chip-stack">
            ${scenario.parseChips.map((chip) => `<span class="process-parse-chip">${chip}</span>`).join("")}
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

/**
 * 渲染主函数：解耦 DOM 生成与状态更新
 * @param {object} appState - 至少包含 processDemoPhase / processDemoScenarioIndex
 * @param {object} elements - 至少包含 processBoard / processNarrative / processResult
 * @param {Array<object>} scenarios - 三套循环案例
 */
export function renderProcessBoardCore(appState, elements, scenarios) {
  const scenario = scenarios[appState.processDemoScenarioIndex];
  const currentPhase = appState.processDemoPhase;

  // 1. 判断是否需要全量重新渲染（场景切换或首次加载时）
  const needsFullRender = elements.processBoard.dataset.scenarioIndex !== String(appState.processDemoScenarioIndex);

  if (needsFullRender) {
    // 仅在场景切换时重新生成 DOM，避免打断 CSS 动画
    elements.processBoard.innerHTML = processStepTemplateCore
      .map(
        (stage, index) => `
        <article class="process-step" data-index="${index}">
          <div class="process-head">
            <span class="process-index">0${index + 1}</span>
            <span class="process-status">等待</span>
          </div>
          <strong>${stage.title}</strong>
          <p>${stage.desc}</p>
          ${getProcessVisualMarkupCore(stage, scenario)}
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

    // 记录当前场景索引
    elements.processBoard.dataset.scenarioIndex = appState.processDemoScenarioIndex;
  }

  // 2. 轻量级状态更新：只修改 class 和局部文本，触发 CSS 过渡
  const steps = elements.processBoard.querySelectorAll(".process-step");
  steps.forEach((step, index) => {
    // 清除旧状态
    step.classList.remove("process-completed", "process-active", "process-pending");

    const statusEl = step.querySelector(".process-status");

    // 应用新状态
    if (index < currentPhase) {
      step.classList.add("process-completed");
      if (statusEl) statusEl.textContent = "已完成";
    } else if (index === currentPhase) {
      step.classList.add("process-active");
      if (statusEl) statusEl.textContent = "处理中";
    } else {
      step.classList.add("process-pending");
      if (statusEl) statusEl.textContent = "等待";
    }
  });
}

/**
 * 轮播调度：当前版本为“慢速连贯”，每 3600ms 切一步，与 CSS 动画时长对齐。
 */
export function startProcessDemoLoopCore(appState, renderFn, intervalMs = 3600) {
  if (appState.processDemoHandle) {
    window.clearInterval(appState.processDemoHandle);
  }

  // 首次立即渲染
  renderFn();

  appState.processDemoHandle = window.setInterval(() => {
    if (appState.processDemoPhase >= processStepTemplateCore.length - 1) {
      appState.processDemoPhase = 0;
      appState.processDemoScenarioIndex = (appState.processDemoScenarioIndex + 1) % appState.processDemoScenarioCount;
    } else {
      appState.processDemoPhase += 1;
    }
    renderFn();
  }, intervalMs);
}

/**
 * 关键 CSS（可直接复制到 styles.css 或由构建工具提取）
 */
export const processAnimationCoreCss = `
:root {
  /* 与 JS 调度周期 3600ms 对齐，保证动画周期的完整性 */
  --process-motion-duration: 3.6s;
  --process-motion-ease: cubic-bezier(0.33, 1, 0.68, 1);
}

.process-step {
  overflow: hidden;
  /* 添加状态切换的平滑过渡 */
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.process-visual {
  contain: layout paint style;
}

.process-thumb {
  transform: translateZ(0); /* 强制开启 GPU 渲染层 */
}

/* 核心动画应用 */
.process-scan-overlay::before {
  will-change: transform, opacity;
  animation: scan-path var(--process-motion-duration) linear infinite;
}

.roi-frame {
  will-change: transform, opacity;
  animation: roi-pulse calc(var(--process-motion-duration) * 0.86) var(--process-motion-ease) infinite;
}

.process-zoom-card {
  will-change: transform;
  animation: zoom-float var(--process-motion-duration) var(--process-motion-ease) infinite;
}

.ocr-sheet-line {
  will-change: transform, opacity;
  animation: ocr-line-reveal calc(var(--process-motion-duration) * 0.8) var(--process-motion-ease) infinite;
}

.parse-arrow {
  display: block;
  animation: arrow-flow calc(var(--process-motion-duration) * 0.62) ease-in-out infinite;
}

.process-parse-chip {
  will-change: transform, opacity;
  animation: chip-glow calc(var(--process-motion-duration) * 0.8) ease-in-out infinite;
}

.sync-card {
  will-change: transform, opacity;
  animation: sync-pulse var(--process-motion-duration) cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

/* 状态控制与可见性管理 */
.process-step .process-scan-overlay::before,
.process-step .roi-frame,
.process-step .process-zoom-card,
.process-step .ocr-sheet-line,
.process-step .parse-arrow,
.process-step .process-parse-chip,
.process-step .sync-card {
  animation-play-state: paused;
  opacity: 0; /* 默认隐藏，配合 active 平滑出现 */
  transition: opacity 0.3s ease;
}

.process-active .process-scan-overlay::before,
.process-active .roi-frame,
.process-active .process-zoom-card,
.process-active .ocr-sheet-line,
.process-active .parse-arrow,
.process-active .process-parse-chip,
.process-active .sync-card {
  animation-play-state: running;
  opacity: 1;
}

.process-completed .process-scan-overlay::before,
.process-completed .roi-frame,
.process-completed .process-zoom-card,
.process-completed .ocr-sheet-line,
.process-completed .parse-arrow,
.process-completed .process-parse-chip,
.process-completed .sync-card {
  animation-play-state: paused;
  opacity: 0.6; /* 已完成状态半透明 */
}

/* 关键帧定义 (GPU 友好设计) */
@keyframes scan-path {
  0% { transform: translateY(0); opacity: 0.55; }
  45% { transform: translateY(150px); opacity: 1; } /* 如需动态高度，此处可在外部覆盖 */
  50% { transform: translateY(150px); opacity: 0.95; }
  95% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(0); opacity: 0.55; }
}

@keyframes roi-pulse {
  0% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 10px rgba(0, 120, 255, 0.5); }
  100% { transform: scale(0.95); opacity: 0.5; }
}

@keyframes zoom-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes ocr-line-reveal {
  0% { transform: translateX(-10px); opacity: 0; }
  30%, 100% { transform: translateX(0); opacity: 1; }
}

@keyframes arrow-flow {
  0% { transform: translateX(0); opacity: 0.4; }
  50% { transform: translateX(5px); opacity: 1; }
  100% { transform: translateX(0); opacity: 0.4; }
}

@keyframes chip-glow {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; filter: brightness(1.2); }
}

@keyframes sync-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.02); opacity: 1; }
}

/* 降低动画偏好适配 */
@media (prefers-reduced-motion: reduce) {
  .process-visual * {
    animation: none !important;
    transition: none !important;
  }
}
`;
