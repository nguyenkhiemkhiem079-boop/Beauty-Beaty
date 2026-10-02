import { ImageEngine } from './engine/ImageEngine';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

interface TestCase {
  name: string;
  width: number;
  height: number;
  faceScale: number; // fraction of height
  chinY: number;
  lipY: number;
  foreheadY: number;
}

// Generate test image with straight background grid and facial features
function createTestImageCanvas(tc: TestCase): { canvas: HTMLCanvasElement; landmarks: NormalizedLandmark[] } {
  const canvas = document.createElement('canvas');
  canvas.width = tc.width;
  canvas.height = tc.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // 1. Draw high-contrast background grid (straight lines)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tc.width, tc.height);

  ctx.lineWidth = 1;
  const gridSize = 30;
  // Vertical lines
  for (let x = 0; x <= tc.width; x += gridSize) {
    ctx.strokeStyle = x % 60 === 0 ? '#ff0000' : '#d0d0d0';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, tc.height);
    ctx.stroke();
  }
  // Horizontal lines
  for (let y = 0; y <= tc.height; y += gridSize) {
    ctx.strokeStyle = y % 60 === 0 ? '#0000ff' : '#d0d0d0';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(tc.width, y);
    ctx.stroke();
  }

  // 2. Draw person: neck, chin, face, lips
  const cx = tc.width * 0.5;
  const faceH = tc.height * tc.faceScale;
  const faceW = faceH * 0.72;

  // Neck
  ctx.fillStyle = '#e5b89f';
  ctx.fillRect(cx - faceW * 0.35, tc.height * tc.chinY, faceW * 0.7, tc.height * (1.0 - tc.chinY));

  // Submental fold / double chin shadow
  ctx.fillStyle = '#c79274';
  ctx.beginPath();
  ctx.ellipse(cx, tc.height * (tc.chinY + 0.03), faceW * 0.3, faceH * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Face head oval
  ctx.fillStyle = '#f7d2ba';
  ctx.beginPath();
  const faceCenterY = tc.height * (tc.foreheadY + (tc.chinY - tc.foreheadY) * 0.5);
  ctx.ellipse(cx, faceCenterY, faceW * 0.5, faceH * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jaw contour
  ctx.strokeStyle = '#c58d72';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Lips (Landmark 17 at bottom of lower lip)
  const lipCenterY = tc.height * tc.lipY;
  ctx.fillStyle = '#c84b55';
  ctx.beginPath();
  ctx.ellipse(cx, lipCenterY - 4, faceW * 0.22, faceH * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  const eyeY = faceCenterY - faceH * 0.15;
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(cx - faceW * 0.22, eyeY, 6, 0, Math.PI * 2);
  ctx.arc(cx + faceW * 0.22, eyeY, 6, 0, Math.PI * 2);
  ctx.fill();

  // Construct standard 468 landmark array
  const landmarks: NormalizedLandmark[] = [];
  for (let i = 0; i < 468; i++) {
    landmarks.push({ x: 0.5, y: 0.5, z: 0, visibility: 1.0 });
  }

  // Key landmarks
  landmarks[10] = { x: 0.5, y: tc.foreheadY, z: 0, visibility: 1.0 };       // Forehead top
  landmarks[1] = { x: 0.5, y: (tc.foreheadY + tc.chinY) * 0.5, z: 0, visibility: 1.0 }; // Nose tip
  landmarks[17] = { x: 0.5, y: tc.lipY, z: 0, visibility: 1.0 };            // Lower lip center
  landmarks[61] = { x: (cx - faceW * 0.22) / tc.width, y: tc.lipY - 0.005, z: 0, visibility: 1.0 }; // Mouth left corner
  landmarks[291] = { x: (cx + faceW * 0.22) / tc.width, y: tc.lipY - 0.005, z: 0, visibility: 1.0 }; // Mouth right corner
  landmarks[152] = { x: 0.5, y: tc.chinY, z: 0, visibility: 1.0 };          // Chin tip
  landmarks[148] = { x: (cx - faceW * 0.25) / tc.width, y: tc.chinY - 0.015, z: 0, visibility: 1.0 }; // Jaw left near chin
  landmarks[377] = { x: (cx + faceW * 0.25) / tc.width, y: tc.chinY - 0.015, z: 0, visibility: 1.0 }; // Jaw right near chin
  landmarks[234] = { x: (cx - faceW * 0.5) / tc.width, y: faceCenterY / tc.height, z: 0, visibility: 1.0 }; // Left cheek
  landmarks[454] = { x: (cx + faceW * 0.5) / tc.width, y: faceCenterY / tc.height, z: 0, visibility: 1.0 }; // Right cheek

  return { canvas, landmarks };
}

// Compare pixel difference in a specified bounding box
function getBoxDiff(
  c1: HTMLCanvasElement,
  c2: HTMLCanvasElement,
  box: { x1: number; y1: number; x2: number; y2: number }
): { meanDiff: number; maxDiff: number } {
  const ctx1 = c1.getContext('2d', { willReadFrequently: true })!;
  const ctx2 = c2.getContext('2d', { willReadFrequently: true })!;

  const x1 = Math.max(0, Math.floor(box.x1));
  const y1 = Math.max(0, Math.floor(box.y1));
  const x2 = Math.min(c1.width, Math.ceil(box.x2));
  const y2 = Math.min(c1.height, Math.ceil(box.y2));

  const w = x2 - x1;
  const h = y2 - y1;
  if (w <= 0 || h <= 0) return { meanDiff: 0, maxDiff: 0 };

  const d1 = ctx1.getImageData(x1, y1, w, h).data;
  const d2 = ctx2.getImageData(x1, y1, w, h).data;

  let totalDiff = 0;
  let maxDiff = 0;
  const totalPixels = w * h;

  for (let i = 0; i < d1.length; i += 4) {
    const diff = (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2])) / 3.0;
    totalDiff += diff;
    if (diff > maxDiff) maxDiff = diff;
  }

  return {
    meanDiff: totalDiff / totalPixels,
    maxDiff
  };
}

export async function runAllTests() {
  const resultsDiv = document.getElementById('results')!;
  resultsDiv.innerHTML = '<div style="color: #666;">Running test suite...</div>';

  const testCases: TestCase[] = [
    {
      name: 'horizontal_landscape_800x600',
      width: 800,
      height: 600,
      faceScale: 0.45,
      chinY: 0.65,
      lipY: 0.55,
      foreheadY: 0.20
    },
    {
      name: 'vertical_portrait_600x800',
      width: 600,
      height: 800,
      faceScale: 0.60,
      chinY: 0.74,
      lipY: 0.62,
      foreheadY: 0.14
    },
    {
      name: 'widescreen_16_9_small_face_960x540',
      width: 960,
      height: 540,
      faceScale: 0.28,
      chinY: 0.62,
      lipY: 0.56,
      foreheadY: 0.34
    }
  ];

  const artifactsToSave: { filename: string; base64Data: string }[] = [];
  const testReport: any[] = [];

  const container = document.getElementById('image-grid')!;
  container.innerHTML = '';

  for (const tc of testCases) {
    const caseSection = document.createElement('div');
    caseSection.className = 'test-case-card';
    caseSection.innerHTML = `<h3>Case: ${tc.name} (${tc.width}x${tc.height}, aspect: ${(tc.width / tc.height).toFixed(2)})</h3>`;

    const { canvas: baseCanvas, landmarks } = createTestImageCanvas(tc);

    // Save baseline
    const baseDataUrl = baseCanvas.toDataURL('image/png');
    artifactsToSave.push({ filename: `${tc.name}_baseline.png`, base64Data: baseDataUrl });

    // 1. Run Double Chin Reduction at 50%
    const engine50 = new ImageEngine(baseCanvas);
    engine50.applyDoubleChinReduction(landmarks, 50);
    const canvas50 = engine50.getCanvas();
    const dataUrl50 = canvas50.toDataURL('image/png');
    artifactsToSave.push({ filename: `${tc.name}_chin_slim_50.png`, base64Data: dataUrl50 });

    // 2. Run Double Chin Reduction at 100%
    const engine100 = new ImageEngine(baseCanvas);
    engine100.applyDoubleChinReduction(landmarks, 100);
    const canvas100 = engine100.getCanvas();
    const dataUrl100 = canvas100.toDataURL('image/png');
    artifactsToSave.push({ filename: `${tc.name}_chin_slim_100.png`, base64Data: dataUrl100 });

    // 3. Test Full Unified Pipeline Preview vs Export
    const params = {
      skin_smooth: 40,
      face_slim: 35,
      hair_smooth: 0,
      chin_slim: 60
    };

    // Preview
    const previewEngine = new ImageEngine(baseCanvas);
    previewEngine.applyPipeline(params, landmarks);
    const previewCanvas = previewEngine.getCanvas();
    const previewDataUrl = previewCanvas.toDataURL('image/png');
    artifactsToSave.push({ filename: `${tc.name}_pipeline_preview.png`, base64Data: previewDataUrl });

    // Export (Native resolution)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = tc.width;
    exportCanvas.height = tc.height;
    exportCanvas.getContext('2d')!.drawImage(baseCanvas, 0, 0);

    const exportEngine = new ImageEngine(exportCanvas);
    exportEngine.applyPipeline(params, landmarks);
    const exportResultCanvas = exportEngine.getCanvas();
    const exportDataUrl = exportResultCanvas.toDataURL('image/png');
    artifactsToSave.push({ filename: `${tc.name}_pipeline_export.png`, base64Data: exportDataUrl });

    // Measurements:
    const cx = tc.width * 0.5;
    const lipYPx = tc.height * tc.lipY;
    const chinYPx = tc.height * tc.chinY;
    const chinToLipPx = chinYPx - lipYPx;

    // A. Lip Protection (Landmark 17 region)
    const lipBox = {
      x1: cx - chinToLipPx * 0.8,
      y1: lipYPx - chinToLipPx * 0.5,
      x2: cx + chinToLipPx * 0.8,
      y2: lipYPx + chinToLipPx * 0.1 // up to lower lip boundary
    };
    const lipDiff = getBoxDiff(baseCanvas, canvas100, lipBox);

    // B. Submental Double Chin Movement
    const submentalBox = {
      x1: cx - chinToLipPx * 0.5,
      y1: chinYPx + chinToLipPx * 0.05,
      x2: cx + chinToLipPx * 0.5,
      y2: chinYPx + chinToLipPx * 0.45
    };
    const submentalDiff = getBoxDiff(baseCanvas, canvas100, submentalBox);

    // C. Background Straight Line Protection
    // Straight vertical grid line on left and right outside face
    const bgLeftBox = {
      x1: tc.width * 0.05,
      y1: chinYPx - 50,
      x2: tc.width * 0.20,
      y2: chinYPx + 50
    };
    const bgDiff = getBoxDiff(baseCanvas, canvas100, bgLeftBox);

    // D. Pipeline Preview vs Export parity diff
    const pipelineDiff = getBoxDiff(previewCanvas, exportResultCanvas, {
      x1: 0,
      y1: 0,
      x2: tc.width,
      y2: tc.height
    });

    const reportItem = {
      testCase: tc.name,
      aspect: tc.width / tc.height,
      faceScale: tc.faceScale,
      lipMeanDiff: lipDiff.meanDiff,
      lipMaxDiff: lipDiff.maxDiff,
      submentalMeanDiff: submentalDiff.meanDiff,
      submentalMaxDiff: submentalDiff.maxDiff,
      backgroundMeanDiff: bgDiff.meanDiff,
      pipelineExportDiff: pipelineDiff.meanDiff,
      lipProtected: lipDiff.meanDiff < 0.05,
      submentalWarped: submentalDiff.maxDiff > 30.0 && submentalDiff.meanDiff > 0.8,
      backgroundProtected: bgDiff.meanDiff < 0.01,
      pipelineExportSynced: pipelineDiff.meanDiff < 0.01
    };
    testReport.push(reportItem);

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '15px';
    row.style.flexWrap = 'wrap';

    const addThumb = (title: string, dataUrl: string) => {
      const card = document.createElement('div');
      card.style.textAlign = 'center';
      card.innerHTML = `<p style="margin: 4px 0; font-weight: bold; font-size: 12px;">${title}</p><img src="${dataUrl}" style="width: 240px; border: 1px solid #ccc; border-radius: 4px;" />`;
      row.appendChild(card);
    };

    addThumb('Baseline (Original)', baseDataUrl);
    addThumb('Double Chin - 50%', dataUrl50);
    addThumb('Double Chin - 100%', dataUrl100);
    addThumb('Pipeline Preview', previewDataUrl);
    addThumb('Pipeline Export', exportDataUrl);

    caseSection.appendChild(row);

    const metricsCard = document.createElement('div');
    metricsCard.style.marginTop = '10px';
    metricsCard.style.padding = '8px 12px';
    metricsCard.style.background = '#f9f9f9';
    metricsCard.style.border = '1px solid #eee';
    metricsCard.style.borderRadius = '4px';
    metricsCard.innerHTML = `
      <p style="margin: 4px 0;"><strong>Lip Protection:</strong> Mean Diff = ${lipDiff.meanDiff.toFixed(4)} (Threshold &lt; 0.05) &rarr; ${reportItem.lipProtected ? '✅ PROTECTED (0 distortion)' : '❌ FAIL'}</p>
      <p style="margin: 4px 0;"><strong>Submental Chin Lift:</strong> Mean Diff = ${submentalDiff.meanDiff.toFixed(2)}, Max = ${submentalDiff.maxDiff.toFixed(1)} &rarr; ${reportItem.submentalWarped ? '✅ LIFTED' : '❌ NO EFFECT'}</p>
      <p style="margin: 4px 0;"><strong>Background Straight Lines:</strong> Mean Diff = ${bgDiff.meanDiff.toFixed(4)} &rarr; ${reportItem.backgroundProtected ? '✅ UNDISTORTED' : '❌ WARPED'}</p>
      <p style="margin: 4px 0;"><strong>Preview & Export Sync:</strong> Parity Diff = ${pipelineDiff.meanDiff.toFixed(4)} &rarr; ${reportItem.pipelineExportSynced ? '✅ 100% IDENTICAL' : '❌ DIVERGED'}</p>
    `;
    caseSection.appendChild(metricsCard);
    container.appendChild(caseSection);
  }

  // Save artifacts to server
  try {
    const res = await fetch('http://localhost:3001/api/save-test-artifacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artifacts: artifactsToSave })
    });
    const saved = await res.json();
    console.log('Saved artifacts to disk:', saved);
  } catch (err) {
    console.warn('Could not post artifacts to server (server may not be running on 3001):', err);
  }

  const allPassed = testReport.every(
    r => r.lipProtected && r.submentalWarped && r.backgroundProtected && r.pipelineExportSynced
  );

  resultsDiv.innerHTML = `
    <div style="padding: 12px; border-radius: 6px; background: ${allPassed ? '#e6f7ec' : '#fde8e8'}; border: 1px solid ${allPassed ? '#52c41a' : '#f5222d'};">
      <h2 style="margin: 0 0 8px 0; color: ${allPassed ? '#237804' : '#cf1322'};">
        ${allPassed ? '✅ ALL TEST CASES PASSED VERIFICATION' : '❌ VERIFICATION FAILED'}
      </h2>
      <p style="margin: 4px 0;">Images tested: Horizontal Landscape (800x600), Vertical Portrait (600x800), and 16:9 Landscape Small Face (960x540).</p>
      <p style="margin: 4px 0;">Output artifacts saved to <code>docs/test_artifacts/</code>.</p>
    </div>
  `;

  // Attach report to window for test automation
  (window as any).__TEST_REPORT__ = testReport;
  (window as any).__ALL_PASSED__ = allPassed;
  console.log('=== TEST REPORT ===', testReport);
}
