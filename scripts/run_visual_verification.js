const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('=== STARTING VISUAL & GEOMETRIC VERIFICATION SUITE ===');

  const artifactsDir = path.join(__dirname, '../docs/test_artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const url = 'http://localhost:5173/test_runner.html';

  console.log(`Running Headless Chrome on ${url}...`);
  const cmd = `"${chromePath}" --headless=new --virtual-time-budget=6000 --dump-dom "${url}"`;

  const html = execSync(cmd, { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8' });
  console.log('Page DOM successfully captured.');

  // Extract all cards and images
  const testCardRegex = /<div class="test-case-card">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
  const cards = html.match(testCardRegex) || [];
  console.log(`Detected ${cards.length} test case cards.`);

  const imageRegex = /<p[^>]*>([A-Za-z0-9_\-\s\(\)%]+)<\/p>\s*<img src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/gi;
  let imgMatch;
  let savedCount = 0;
  
  // Track test cases
  const caseNames = [
    'horizontal_landscape_800x600',
    'vertical_portrait_600x800',
    'widescreen_16_9_small_face_960x540'
  ];

  let currentCaseIdx = 0;
  let imagesInCurrentCase = 0;

  while ((imgMatch = imageRegex.exec(html)) !== null) {
    const rawLabel = imgMatch[1].trim();
    const base64Data = imgMatch[2];
    const caseName = caseNames[currentCaseIdx] || `case_${currentCaseIdx}`;

    let labelSlug = rawLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const filename = `${caseName}_${labelSlug}.png`;
    const filePath = path.join(artifactsDir, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    console.log(`✅ Saved artifact: ${filename} (${Math.round(base64Data.length * 0.75 / 1024)} KB)`);
    savedCount++;

    imagesInCurrentCase++;
    if (imagesInCurrentCase >= 5) {
      currentCaseIdx++;
      imagesInCurrentCase = 0;
    }
  }

  // Extract metrics from paragraphs
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pMatch;
  const metricsLines = [];
  while ((pMatch = pRegex.exec(html)) !== null) {
    const text = pMatch[1].replace(/<[^>]+>/g, '').trim();
    if (text.includes('Lip Protection:') || text.includes('Submental Chin Lift:') || text.includes('Background Straight Lines:') || text.includes('Preview & Export Sync:')) {
      metricsLines.push(text);
      console.log(`  METRIC: ${text}`);
    }
  }

  // Check overall pass/fail
  const passed = html.includes('ALL TEST CASES PASSED VERIFICATION');
  console.log(`\nVerification Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

  const report = {
    timestamp: new Date().toISOString(),
    status: passed ? 'PASSED' : 'FAILED',
    artifactsCount: savedCount,
    metrics: metricsLines
  };

  fs.writeFileSync(path.join(artifactsDir, 'test_report.json'), JSON.stringify(report, null, 2));
  console.log(`Test report saved to ${path.join(artifactsDir, 'test_report.json')}`);

  if (!passed) {
    throw new Error('Visual verification assertions did not all pass');
  }

  console.log('=== ALL VISUAL & GEOMETRIC VERIFICATIONS COMPLETED SUCCESSFULLY! ===');
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
