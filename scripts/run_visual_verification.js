/**
 * Real-portrait and preview/export parity verification.
 *
 * Uses Playwright so MediaPipe, ES modules, Canvas and WebGL finish on the
 * browser's real event loop before evidence is collected.
 */
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const http = require('http');

const REPO = path.join(__dirname, '..');
const artifactsDir = path.join(REPO, 'docs', 'test_artifacts');
const PORT = 5282;
const TEST_URL = `http://127.0.0.1:${PORT}/test_runner.html`;

fs.mkdirSync(artifactsDir, { recursive: true });

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

function slug(value) {
  return String(value || 'artifact')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 110);
}

async function main() {
  console.log('=== PLAYWRIGHT REAL-PORTRAIT & RESOLUTION VERIFICATION ===');

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
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
      console.error('[pageerror]', err.message);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('[browser]', msg.text());
    });

    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForFunction(
      () => Boolean(window.__TEST_REPORT__) ||
        /ALL REAL-WORLD & RESOLUTION TESTS PASSED|VERIFICATION FAILED/.test(
          document.querySelector('#results')?.textContent || ''
        ),
      { timeout: 180000 }
    );

    const testReport = await page.evaluate(() => window.__TEST_REPORT__ || null);
    if (!testReport) {
      throw new Error(
        `Visual test page completed without __TEST_REPORT__. Browser errors: ${pageErrors.join(' | ') || 'none'}`
      );
    }

    const images = await page.$$eval('#image-grid img', (nodes) =>
      nodes.map((img, index) => ({
        index,
        src: img.src,
        label: img.parentElement?.querySelector('p')?.textContent || `artifact_${index}`,
        caseTitle: img.closest('.test-case-card')?.querySelector('h3')?.textContent || 'visual_case'
      }))
    );

    let savedCount = 0;
    for (const item of images) {
      if (!item.src.startsWith('data:image/png;base64,')) continue;
      const filename = `${String(item.index).padStart(2, '0')}_${slug(item.caseTitle)}_${slug(item.label)}.png`;
      const base64 = item.src.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.join(artifactsDir, filename), Buffer.from(base64, 'base64'));
      savedCount++;
    }

    await page.screenshot({
      path: path.join(artifactsDir, 'visual_verification_full_page.png'),
      fullPage: true
    });
    savedCount++;

    const report = {
      timestamp: new Date().toISOString(),
      status: testReport.allPassed === true ? 'PASSED' : 'FAILED',
      artifactsCount: savedCount,
      details: testReport,
      pageErrors
    };

    fs.writeFileSync(
      path.join(artifactsDir, 'test_report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('Portrait results:', JSON.stringify(testReport.realPortraits, null, 2));
    console.log('High-res parity:', JSON.stringify(testReport.highResExportComparison, null, 2));
    console.log('Export/reopen:', JSON.stringify(testReport.uiExportReopenTest, null, 2));

    if (testReport.allPassed !== true) {
      throw new Error('Real-world or resolution assertions failed; inspect test_report.json and uploaded screenshots.');
    }

    console.log('ALL REAL-WORLD & RESOLUTION VERIFICATIONS PASSED');
  } finally {
    if (browser) await browser.close();
    await terminateProcessTree(viteProc);
  }
}

main().catch((error) => {
  console.error('Verification run failed:', error);
  process.exit(1);
});
