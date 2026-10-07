/**
 * Browser-driven sensitivity verification.
 *
 * Uses Playwright instead of Chrome --dump-dom because ES-module tests,
 * Canvas/WebGL work and async browser tasks need a real event loop.
 */
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const http = require('http');

const REPO = path.join(__dirname, '..');
const ART_DIR = path.join(REPO, 'docs', 'test_artifacts');
const PORT = 5281;
const TEST_URL = `http://127.0.0.1:${PORT}/test_new_effects.html`;

fs.mkdirSync(ART_DIR, { recursive: true });

function waitForServer(url, timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
          return;
        }
        setTimeout(probe, 250);
      });
      req.on('error', () => {
        if (Date.now() - started >= timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
          return;
        }
        setTimeout(probe, 250);
      });
      req.setTimeout(2000, () => req.destroy());
    };
    probe();
  });
}

async function terminateProcessTree(proc) {
  if (!proc || !proc.pid) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  const signalGroup = (signal) => {
    try {
      process.kill(-proc.pid, signal);
      return true;
    } catch {
      try {
        proc.kill(signal);
        return true;
      } catch {
        return false;
      }
    }
  };

  signalGroup('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    process.kill(proc.pid, 0);
    signalGroup('SIGKILL');
  } catch {
    // already stopped
  }
}

function printSummary(summary) {
  console.log('\n=== SENSITIVITY TEST RESULTS ===');
  console.log(`Total tests: ${summary.total} | Required: ${summary.required} | Blocked: ${summary.blocked}`);
  console.log(`Passed: ${summary.passed} | Failed: ${summary.failed}`);

  for (const result of summary.results || []) {
    const verdict = result.passed === null ? 'BLOCKED' : result.passed ? 'PASS' : 'FAIL';
    console.log(
      `${verdict.padEnd(7)} ${String(result.name).padEnd(28)} zero=${result.zeroDelta ?? 'N/A'} positive=${result.positiveDelta ?? 'N/A'} roi=${result.roiMAE ?? '-'} outside=${result.outsideROI ?? '-'}`
    );
  }

  for (const parity of summary.parity || []) {
    console.log(
      `${parity.passed ? 'PASS' : 'FAIL'} parity ${parity.resolution}: MAE=${parity.mae ?? '-'} PSNR=${parity.psnr ?? '-'}`
    );
  }
}

async function main() {
  console.log('=== PLAYWRIGHT EFFECT SENSITIVITY VERIFICATION ===');

  const viteBin = path.join(REPO, 'node_modules', 'vite', 'bin', 'vite.js');
  const viteProc = spawn(
    process.execPath,
    [viteBin, '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    {
      cwd: path.join(REPO, 'apps', 'web'),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32'
    }
  );

  viteProc.stdout.on('data', (buf) => process.stdout.write(`[vite] ${buf}`));
  viteProc.stderr.on('data', (buf) => process.stderr.write(`[vite] ${buf}`));

  let browser;
  try {
    await waitForServer(TEST_URL, 30000);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('[browser]', msg.text());
    });

    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(
      () => {
        const text = document.querySelector('#result')?.textContent?.trim() || '';
        return text.startsWith('{') || text.startsWith('FATAL ERROR:');
      },
      undefined,
      { timeout: 120000 }
    );

    const raw = (await page.locator('#result').textContent())?.trim() || '';
    if (raw.startsWith('FATAL ERROR:')) {
      throw new Error(raw);
    }

    let summary;
    try {
      summary = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Could not parse effect summary JSON: ${error.message}\n${raw.slice(0, 1000)}`);
    }

    fs.writeFileSync(
      path.join(ART_DIR, 'new_effects_sensitivity_report.json'),
      JSON.stringify(summary, null, 2)
    );
    printSummary(summary);

    if (pageErrors.length) {
      console.warn('Browser page errors:', pageErrors);
    }

    if (!summary.allPassed) {
      const failed = (summary.results || []).filter((r) => r.passed === false);
      throw new Error(
        `Effect sensitivity verification failed: ${failed.map((r) => r.name).join(', ') || 'unknown failure'}`
      );
    }

    console.log('\nALL REQUIRED EFFECT SENSITIVITY TESTS PASSED');
  } finally {
    if (browser) await browser.close();
    await terminateProcessTree(viteProc);
  }
}

main().catch((error) => {
  console.error('Effect sensitivity verification failed:', error);
  process.exit(1);
});
