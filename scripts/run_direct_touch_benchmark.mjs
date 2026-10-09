/**
 * Reproducible opt-in direct-smoothing benchmark.
 * Run from repository root: node scripts/run_direct_touch_benchmark.mjs
 * Requires Playwright Chromium installed (npx playwright install chromium).
 * Uses a real repo portrait and CDP 4x CPU throttling.
 * It is intentionally NOT part of the standard CI/E2E suite.
 */
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const cwd = process.cwd();
const fixturePath = path.resolve(cwd, 'docs/test_artifacts/real_portrait_front_real_photo_original.png');
const resultPath = path.resolve(cwd, 'docs/test_artifacts/direct_touch_benchmark_raw.json');
const benchmarkUrl = 'http://127.0.0.1:5173/benchmark.html';

async function isReady() {
  try {
    const response = await fetch(benchmarkUrl, { signal: AbortSignal.timeout(2000) });
    return response.ok && (await response.text()).includes('Direct Retouch Performance Benchmark');
  } catch {
    return false;
  }
}

async function main() {
  if (!existsSync(fixturePath)) throw new Error('Missing real-portrait fixture: ' + fixturePath);

  let server = null;
  let browser = null;
  try {
    if (!(await isReady())) {
      server = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
        'run', 'dev:web', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'
      ], { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
      let ready = false;
      for (let i = 0; i < 60; i++) {
        if (await isReady()) { ready = true; break; }
        if (server.exitCode !== null) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!ready) throw new Error('Vite benchmark server did not start on port 5173');
    }

    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.goto(benchmarkUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.locator('#fixture').setInputFiles(fixturePath);
    await page.locator('#start').click();
    await page.waitForFunction(() => window.__benchmarkComplete === true, undefined, { timeout: 300000 });

    const results = await page.evaluate(() => window.__benchmarkResult);
    if (!results?.success) throw new Error('Benchmark validation failed: ' + JSON.stringify(results));

    const getSha = () => {
      try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim(); }
      catch { return 'UNKNOWN'; }
    };
    const raw = {
      ...results,
      measuredAtUtc: new Date().toISOString(),
      gitSha: getSha(),
      platform: os.platform() + '/' + os.arch(),
      node: process.version,
      chromium: browser.version(),
      cpuThrottlingRate: 4,
      fixturePath: path.relative(cwd, fixturePath),
      limitations: [
        'Measures local batched ImageEngine.applyPipeline only',
        'Does not measure MediaPipe, segmentation, PNG encoding, download or network',
        'Does not prove full end-to-end user interaction or perceptual skin quality',
        'Does not provide a before/after speedup without matched baseline measurements'
      ]
    };
    mkdirSync(path.dirname(resultPath), { recursive: true });
    writeFileSync(resultPath, JSON.stringify(raw, null, 2) + '\n');
    console.log('Benchmark SHA:', raw.gitSha);
    console.log('4x CPU throttling, Chromium', raw.chromium);
    for (const row of raw.results) {
      console.log(row.width + 'x' + row.height + ', strokes=' + row.strokes +
        ', validated=' + row.changedStrokeCount +
        ', avg=' + row.averageMs.toFixed(2) + 'ms, p95=' + row.p95Ms.toFixed(2) + 'ms');
    }
    console.log('Raw results:', resultPath);
  } finally {
    if (browser) await browser.close();
    if (server) {
      if (process.platform === 'win32') {
        try { execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {}
      } else {
        server.kill('SIGTERM');
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
