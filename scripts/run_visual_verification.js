const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const artifactsDir = path.join(__dirname, '../docs/test_artifacts');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          setTimeout(check, 300);
        }
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
        } else {
          setTimeout(check, 300);
        }
      });
    }
    check();
  });
}

function detectChromeBinary() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (isWin) {
    const winCandidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google\\Chrome\\Application\\chrome.exe'),
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const cand of winCandidates) {
      if (cand && fs.existsSync(cand)) return cand;
    }
  } else if (isMac) {
    const macCandidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    ];
    for (const cand of macCandidates) {
      if (fs.existsSync(cand)) return cand;
    }
  } else {
    // Linux / CI
    const linuxCandidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium'
    ];
    for (const cand of linuxCandidates) {
      if (fs.existsSync(cand)) return cand;
    }
  }

  // Fallback to searching PATH via which/where
  try {
    const lookupCmd = isWin ? 'where.exe chrome' : 'which google-chrome || which chromium';
    const resolved = execSync(lookupCmd, { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
    if (resolved && fs.existsSync(resolved)) return resolved;
  } catch {
    // Ignore PATH search failure
  }

  throw new Error('Chrome/Chromium binary not found. Please set CHROME_BIN environment variable.');
}

async function main() {
  console.log('=== STARTING REAL-WORLD & RESOLUTION VERIFICATION SUITE ===');

  let viteProc = null;
  const testUrl = 'http://localhost:5173/test_runner.html';

  // Check if Vite is already running, else spawn it
  let isViteRunning = false;
  try {
    await waitForServer(testUrl, 1000);
    isViteRunning = true;
    console.log('Detected existing Vite dev server on port 5173.');
  } catch {
    console.log('Starting Vite dev server on port 5173...');
    const isWin = process.platform === 'win32';
    viteProc = spawn(isWin ? 'cmd.exe' : 'npm', isWin ? ['/c', 'npm.cmd', 'run', 'dev:web'] : ['run', 'dev:web'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    await waitForServer(testUrl, 25000);
    console.log('Vite server ready.');
  }

  try {
    const chromePath = detectChromeBinary();
    console.log(`Detected browser executable: ${chromePath}`);
    console.log(`Executing Headless Browser on ${testUrl} with virtual-time-budget for MediaPipe...`);

    // Run Chrome with sufficient time budget for neural models and 4000x3000 downsampling
    const cmd = `"${chromePath}" --headless=new --virtual-time-budget=20000 --dump-dom "${testUrl}"`;
    const html = execSync(cmd, { maxBuffer: 100 * 1024 * 1024, encoding: 'utf8' });
    console.log(`Page DOM captured (${Math.round(html.length / 1024)} KB).`);

    // Parse image cards
    const imageRegex = /<p[^>]*>([A-Za-z0-9_\-\s\(\)\+%,]+)<\/p>\s*<img src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/gi;
    let imgMatch;
    let savedCount = 0;

    const casePrefixes = [
      'real_portrait_front',
      'real_portrait_tilted',
      'real_portrait_beard',
      'highres_4000x3000_parity'
    ];
    let currentCaseIdx = 0;
    let imagesInCase = 0;
    const imagesPerCase = [3, 3, 3, 2];

    while ((imgMatch = imageRegex.exec(html)) !== null) {
      const label = imgMatch[1].trim();
      const base64Data = imgMatch[2];
      const prefix = casePrefixes[currentCaseIdx] || `case_${currentCaseIdx}`;

      const labelSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const filename = `${prefix}_${labelSlug}.png`;
      const filePath = path.join(artifactsDir, filename);

      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      console.log(`✅ Saved artifact: ${filename} (${Math.round(base64Data.length * 0.75 / 1024)} KB)`);
      savedCount++;

      imagesInCase++;
      const maxInCase = imagesPerCase[currentCaseIdx] || 3;
      if (imagesInCase >= maxInCase) {
        currentCaseIdx++;
        imagesInCase = 0;
      }
    }

    // Extract metrics paragraphs
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch;
    const metricsLines = [];
    while ((pMatch = pRegex.exec(html)) !== null) {
      const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
      if (
        text.includes('Face Detection:') ||
        text.includes('Vector Direction:') ||
        text.includes('Face Tilt Synchronization:') ||
        text.includes('Lip Protection:') ||
        text.includes('Background / Collar Protection:') ||
        text.includes('Parity Mean Absolute Error') ||
        text.includes('Peak Signal-to-Noise Ratio')
      ) {
        metricsLines.push(text);
        console.log(`  METRIC: ${text}`);
      }
    }

    let passed = false;
    let reportDetails = null;
    const debugSummaryMatch = html.match(/id="debug-summary">([^<]*)<\/p>/);
    if (debugSummaryMatch) {
      console.log('DEBUG SUMMARY FROM DOM:', debugSummaryMatch[1]);
    }
    const debugDetailsMatch = html.match(/id="debug-details"[^>]*>([\s\S]*?)<\/p>/);
    if (debugDetailsMatch) {
      try {
        const rawJson = debugDetailsMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        reportDetails = JSON.parse(rawJson);
        passed = reportDetails.allPassed === true;
      } catch (e) {
        console.error('Failed to parse debugDetailsMatch:', e.message);
      }
    }

    if (!passed) {
      passed = html.includes('ALL REAL-WORLD & RESOLUTION TESTS PASSED') || html.includes('allPassed=true');
    }
    console.log(`\nOverall Verification Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    const report = {
      timestamp: new Date().toISOString(),
      status: passed ? 'PASSED' : 'FAILED',
      artifactsCount: savedCount,
      metrics: metricsLines
    };

    fs.writeFileSync(path.join(artifactsDir, 'test_report.json'), JSON.stringify(report, null, 2));
    console.log(`Report saved to ${path.join(artifactsDir, 'test_report.json')}`);

    if (!passed) {
      throw new Error('Some real-world or resolution test assertions failed');
    }

    console.log('=== ALL REAL-WORLD & RESOLUTION VERIFICATIONS COMPLETED SUCCESSFULLY! ===');
  } finally {
    if (viteProc && viteProc.pid) {
      console.log('Shutting down spawned Vite dev server...');
      try {
        execSync(`taskkill /pid ${viteProc.pid} /T /F`, { stdio: 'ignore' });
      } catch {}
    }
  }
}

main().catch(err => {
  console.error('Verification run failed:', err);
  process.exit(1);
});
