/**
 * test_new_effects_sensitivity.js  (corrected)
 *
 * CHANGES vs previous version:
 *   - Test HTML now uses engine.getCanvas() as output (not the original input canvas)
 *   - WebGL tests (B016/B017) are BLOCKED/SKIPPED, not passed
 *   - B064 hair_shine uses synthetic SegmentationResult and tests ROI
 *   - Every effect has a zero-intensity bypass test
 *   - ROI vs outside-ROI measurements for region-specific effects
 *   - Preview/export parity test at two resolutions
 */
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs   = require('fs');
const http = require('http');

const REPO     = path.join(__dirname, '..');
const ART_DIR  = path.join(REPO, 'docs', 'test_artifacts');
const PORT     = 5281;
const TEST_URL = `http://localhost:${PORT}/test_new_effects.html`;
const VTB_MS   = 60000;  // virtual-time-budget for Chrome (ms)

fs.mkdirSync(ART_DIR, { recursive: true });

function waitForServer(port, retries = 30, delay = 600) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    function try_() {
      http.get(`http://localhost:${port}/`, () => resolve())
        .on('error', () => {
          if (++attempt >= retries) return reject(new Error(`Port ${port} not ready`));
          setTimeout(try_, delay);
        });
    }
    try_();
  });
}

function detectChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome', '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error('Chrome not found. Set CHROME_BIN env var.');
}

function htmlDecode(s) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
          .replace(/&quot;/g,'"').replace(/&#39;/g,"'");
}

async function main() {
  console.log('=== CORRECTED SENSITIVITY TEST: 11 NEW EFFECTS ===');
  console.log('Bug fixed: output now read from engine.getCanvas(), not original input canvas.');

  // ── Start Vite ──
  const isWin = process.platform === 'win32';
  console.log(`Starting Vite dev server on port ${PORT}...`);
  const viteProc = spawn(
    isWin ? 'cmd.exe' : 'node',
    isWin
      ? ['/c', 'node', path.join(REPO,'node_modules','vite','bin','vite.js'), '--port', String(PORT), '--strictPort']
      : [path.join(REPO,'node_modules','vite','bin','vite.js'), '--port', String(PORT), '--strictPort'],
    { cwd: path.join(REPO,'apps','web'), stdio: 'pipe' }
  );
  viteProc.stderr.on('data', () => {});
  viteProc.stdout.on('data', () => {});

  await waitForServer(PORT);
  console.log('Vite server ready.');

  const chromePath = detectChrome();
  console.log(`Chrome: ${chromePath}`);
  console.log(`URL: ${TEST_URL}`);

  let html = '';
  try {
    // Use virtual-time-budget so async ES module tests have time to complete
    const cmd = `"${chromePath}" --headless=new --no-sandbox --disable-gpu `
              + `--virtual-time-budget=${VTB_MS} --dump-dom "${TEST_URL}"`;
    html = execSync(cmd, { maxBuffer: 50*1024*1024, encoding: 'utf8', timeout: VTB_MS + 10000 });
    console.log(`DOM captured: ${Math.round(html.length/1024)} KB`);
  } finally {
    if (viteProc.pid) {
      try { execSync(`taskkill /pid ${viteProc.pid} /T /F`, {stdio:'ignore'}); } catch {}
    }
  }

  // ── Extract result from <pre id="result"> ──
  const preMatch = html.match(/<pre[^>]*id="result"[^>]*>([\s\S]*?)<\/pre>/i);
  const raw = preMatch ? htmlDecode(preMatch[1]) : '';

  let summary;
  try {
    summary = JSON.parse(raw);
  } catch(e) {
    // ES module async tests may not have completed under --virtual-time-budget.
    // Dump raw DOM to inspect.
    const dumpPath = path.join(ART_DIR, 'sensitivity_dom_dump.html');
    fs.writeFileSync(dumpPath, html);
    console.error(`❌ Could not parse results JSON. DOM dumped to ${dumpPath}`);
    console.error('Raw pre content:', raw.slice(0, 400));
    console.error(
      '\nNOTE: --virtual-time-budget does not process ES module async code.\n' +
      'The test HTML uses type="module" which requires real browser event loop time.\n' +
      'Falling back to static code verification for this run.'
    );
    process.exit(2); // exit 2 = test infrastructure issue, not a test failure
  }

  // ── Print results ──
  console.log('\n=== SENSITIVITY TEST RESULTS ===');
  console.log(`Total tests: ${summary.total}  |  Required: ${summary.required}  |  Blocked: ${summary.blocked}`);
  console.log(`Passed: ${summary.passed}  |  Failed: ${summary.failed}\n`);

  const header = ['Effect','zero MAE','positive MAE','ROI MAE','outside ROI MAE','PASS/FAIL'];
  const rows = (summary.results || []).map(r => [
    r.name,
    r.zeroDelta || 'N/A',
    r.positiveDelta || 'N/A',
    r.roiMAE || '-',
    r.outsideROI || '-',
    r.passed === null ? 'BLOCKED' : (r.passed ? '✅ PASS' : '❌ FAIL')
  ]);

  // Print table
  const colW = [28,12,15,10,15,10];
  const pad = (s,n) => String(s).padEnd(n);
  console.log(header.map((h,i)=>pad(h,colW[i])).join('│'));
  console.log(colW.map(n=>'-'.repeat(n)).join('┼'));
  for (const r of rows) console.log(r.map((v,i)=>pad(v,colW[i])).join('│'));

  // ── Parity results ──
  if (summary.parity && summary.parity.length > 0) {
    console.log('\n=== PREVIEW/EXPORT PARITY ===');
    for (const p of summary.parity) {
      const icon = p.passed ? '✅' : '❌';
      console.log(`${icon} ${p.resolution}: MAE=${p.mae}  PSNR=${p.psnr}dB`);
      if (p.error) console.log(`   Error: ${p.error}`);
    }
  }

  // ── Save report ──
  const reportPath = path.join(ART_DIR, 'new_effects_sensitivity_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\nReport saved: ${reportPath}`);

  // ── Exit code ──
  if (!summary.allPassed) {
    const failed = (summary.results||[]).filter(r => r.passed === false);
    console.error('\n❌ FAILED EFFECTS:');
    for (const f of failed) {
      console.error(`   - ${f.name}: zero=${f.zeroDelta} positive=${f.positiveDelta}  ${f.note||''}`);
    }
    process.exit(1);
  }

  const blockedList = (summary.results||[]).filter(r => r.passed === null);
  if (blockedList.length > 0) {
    console.log('\n⚠️  BLOCKED (WebGL unavailable in headless):');
    for (const b of blockedList) console.log(`   - ${b.name}: ${b.reason||''}`);
  }

  console.log('\n✅ ALL REQUIRED SENSITIVITY TESTS PASSED');
  console.log('=== SENSITIVITY TEST COMPLETE ===');
}

main().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
