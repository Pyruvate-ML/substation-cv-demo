import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function parseArgs(argv) {
  const options = {
    cycles: 3,
    port: 0,
    ocrBaseUrl: "http://127.0.0.1:8765",
    outputDir: path.join(projectRoot, "ocr-auto-debug-output"),
    headless: true,
    mode: "ui",
    cycleTimeoutMs: 120000,
  };

  for (const arg of argv) {
    if (arg.startsWith("--cycles=")) options.cycles = Number(arg.split("=")[1]) || options.cycles;
    else if (arg.startsWith("--port=")) options.port = Number(arg.split("=")[1]) || 0;
    else if (arg.startsWith("--ocr-base-url=")) options.ocrBaseUrl = arg.split("=")[1] || options.ocrBaseUrl;
    else if (arg.startsWith("--output-dir=")) options.outputDir = path.resolve(projectRoot, arg.split("=")[1]);
    else if (arg.startsWith("--mode=")) options.mode = arg.split("=")[1] || options.mode;
    else if (arg.startsWith("--cycle-timeout-ms=")) options.cycleTimeoutMs = Number(arg.split("=")[1]) || options.cycleTimeoutMs;
    else if (arg === "--headed") options.headless = false;
  }

  return options;
}

function createStaticServer(rootDir) {
  return createServer(async (req, res) => {
    try {
      const requestPath = new URL(req.url || "/", "http://127.0.0.1").pathname;
      const safePath = path
        .normalize(decodeURIComponent(requestPath))
        .replace(/^(\.\.[/\\])+/, "")
        .replace(/^[/\\]+/, "");
      let filePath = path.join(rootDir, safePath ? safePath : "index.html");
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }
      const statPath = filePath;
      const ext = path.extname(statPath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      createReadStream(statPath).pipe(res);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error?.message || error));
    }
  });
}

async function waitForHealth(url, attempts = 20) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

async function requestOcr(imageBuffer, filename, ocrBaseUrl) {
  const formData = new FormData();
  formData.append("image", new Blob([imageBuffer], { type: "image/png" }), filename);

  try {
    const response = await fetch(`${ocrBaseUrl}/api/ocr/recognize`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      return {
        lines: [],
        full_text: "",
        ocr_error: await response.text(),
      };
    }
    return await response.json();
  } catch (error) {
    return {
      lines: [],
      full_text: "",
      ocr_error: String(error?.message || error),
    };
  }
}

function summarizeEntry(entry) {
  const regions = entry.regions || {};
  const diagram = regions.diagram?.score ?? 0;
  const message = regions.message?.score ?? 0;
  const table = regions.table?.score ?? 0;
  return `cycle=${entry.cycle} diagram=${Math.round(diagram * 100)}% message=${Math.round(message * 100)}% table=${Math.round(table * 100)}%`;
}

async function waitForCycleComplete(page, nextCycle, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const runtime = await page.evaluate(() => window.__demoDebug.getRuntimeStatus());
    if (runtime.ocrAuditCycles >= nextCycle) {
      return runtime;
    }
    if (runtime.feedStatus.includes("自动OCR未启动")) {
      throw new Error(`自动识别启动失败：${runtime.feedStatus}`);
    }
    await page.waitForTimeout(300);
  }
  const runtime = await page.evaluate(() => window.__demoDebug.getRuntimeStatus());
  throw new Error(`等待第 ${nextCycle} 轮超时（${timeoutMs}ms），当前状态：${runtime.feedStatus}`);
}

async function captureCycleScreenshots(page, cycle, outputDir) {
  const takeStableScreenshot = async (selector, name) => {
    let lastError = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const locator = page.locator(selector).first();
        await locator.waitFor({ state: "visible", timeout: 3000 });
        return await locator.screenshot();
      } catch (error) {
        lastError = error;
        await page.waitForTimeout(120);
      }
    }
    throw new Error(`${name} 截图失败：${String(lastError?.message || lastError)}`);
  };

  const diagramBuffer = await takeStableScreenshot("#sourceDiagramScreen .source-diagram-svg", "diagram");
  const messageBuffer = await takeStableScreenshot("#sourceMessageScreen .source-message-ocr-focus", "message");
  const tableBuffer = await takeStableScreenshot("#sourceTableScreen .source-table-ocr-focus", "table");
  await writeFile(path.join(outputDir, `cycle-${String(cycle).padStart(2, "0")}-diagram.png`), diagramBuffer);
  await writeFile(path.join(outputDir, `cycle-${String(cycle).padStart(2, "0")}-message.png`), messageBuffer);
  await writeFile(path.join(outputDir, `cycle-${String(cycle).padStart(2, "0")}-table.png`), tableBuffer);
}

async function runUiFlow(page, options) {
  await page.waitForSelector("#autoOcrStartButton");
  const startLabel = await page.locator("#autoOcrStartButton").innerText();
  if (!startLabel.includes("开始自动识别")) {
    throw new Error(`页面按钮文案异常：${startLabel}`);
  }
  await page.click("#autoOcrStartButton");

  const entries = [];
  for (let cycle = 1; cycle <= options.cycles; cycle += 1) {
    await waitForCycleComplete(page, cycle, options.cycleTimeoutMs);
    const payload = await page.evaluate(() => window.__demoDebug.getPayload());
    const entry = payload.logs?.find((item) => item.cycle === cycle) || payload.logs?.[payload.logs.length - 1];
    if (!entry) {
      throw new Error(`第 ${cycle} 轮缺少调试日志记录`);
    }
    entries.push(entry);
    await captureCycleScreenshots(page, cycle, options.outputDir);
    console.log(summarizeEntry(entry));
  }

  await page.click("#autoOcrStopButton");
  return entries;
}

async function runDirectFlow(page, options) {
  const entries = [];
  for (let cycle = 1; cycle <= options.cycles; cycle += 1) {
    await page.evaluate(() => window.__demoDebug.emitFrame());
    await page.waitForTimeout(250);

    const diagramBuffer = await page.locator("#sourceDiagramScreen .source-diagram-svg").screenshot();
    const messageBuffer = await page.locator("#sourceMessageScreen .source-message-ocr-focus").screenshot();
    const tableBuffer = await page.locator("#sourceTableScreen .source-table-ocr-focus").screenshot();

    await writeFile(path.join(options.outputDir, `cycle-${String(cycle).padStart(2, "0")}-diagram.png`), diagramBuffer);
    await writeFile(path.join(options.outputDir, `cycle-${String(cycle).padStart(2, "0")}-message.png`), messageBuffer);
    await writeFile(path.join(options.outputDir, `cycle-${String(cycle).padStart(2, "0")}-table.png`), tableBuffer);

    const [diagramResult, messageResult, tableResult] = await Promise.all([
      requestOcr(diagramBuffer, `cycle-${cycle}-diagram.png`, options.ocrBaseUrl),
      requestOcr(messageBuffer, `cycle-${cycle}-message.png`, options.ocrBaseUrl),
      requestOcr(tableBuffer, `cycle-${cycle}-table.png`, options.ocrBaseUrl),
    ]);

    const entry = await page.evaluate(
      ({ regionOcrResults, cycleNumber }) => window.__demoDebug.scoreRegions(regionOcrResults, cycleNumber),
      {
        cycleNumber: cycle,
        regionOcrResults: {
          diagram: diagramResult,
          message: messageResult,
          table: tableResult,
        },
      }
    );
    entries.push(entry);
    console.log(summarizeEntry(entry));
  }
  return entries;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outputDir, { recursive: true });

  const ocrHealthy = await waitForHealth(`${options.ocrBaseUrl}/api/ocr/health`, 8);
  if (!ocrHealthy) {
    throw new Error(`本地 OCR 服务不可用：${options.ocrBaseUrl}/api/ocr/health`);
  }

  const server = createStaticServer(projectRoot);
  await new Promise((resolve) => server.listen(options.port, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8080;
  const pageUrl = `http://127.0.0.1:${port}/index.html`;

  const browser = await chromium.launch({ headless: options.headless });
  const context = await browser.newContext({ viewport: { width: 1680, height: 1280 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  try {
    await page.goto(pageUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.__demoDebug));
    await page.evaluate(() => window.__demoDebug.resetSession());

    const entries = options.mode === "direct" ? await runDirectFlow(page, options) : await runUiFlow(page, options);

    const payload = await page.evaluate((logs) => window.__demoDebug.getPayload(logs), entries);
    const timestamp = Date.now();
    const outputPath = path.join(options.outputDir, `ocr-auto-debug-${timestamp}.json`);
    await writeFile(outputPath, JSON.stringify(payload, null, 2));
    console.log(`saved=${outputPath}`);
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
