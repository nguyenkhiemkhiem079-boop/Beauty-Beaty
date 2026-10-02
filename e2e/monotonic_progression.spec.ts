import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const FIXTURE_PORTRAIT = path.join(__dirname, '../docs/test_artifacts/real_portrait_front_real_photo_original.png');
const ARTIFACTS_DIR = path.join(__dirname, '../docs/test_artifacts');

interface ProgressionResult {
  tool: string;
  mae0: number;
  mae30: number;
  mae60: number;
  mae100: number;
  isMonotonic: boolean;
  artifacts: {
    val0: string;
    val30: string;
    val60: string;
    val100: string;
  };
}

test.describe("Core Feature Monotonic Progression Verification (0, 30, 60, 100)", () => {

  test('Verify visible monotonic progression across priority beauty tools', async ({ page }) => {
    test.setTimeout(240000);

    // Open editor and upload fixture
    await page.goto('/');
    await page.locator('[data-testid="btn-open-editor"]').click();

    const fileChooserInput = page.locator('[data-testid="file-upload-input"]');
    await fileChooserInput.setInputFiles(FIXTURE_PORTRAIT);

    const mainCanvas = page.locator('[data-testid="main-canvas"]');
    await expect(mainCanvas).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1000);

    const PRIORITY_TOOLS: { category: string; tool: string }[] = [
      { category: 'skin', tool: 'skin_smooth' },
      { category: 'skin', tool: 'skin_brighten' },
      { category: 'skin', tool: 'skin_oil' },
      { category: 'skin', tool: 'nasolabial' },
      { category: 'skin', tool: 'dark_circles' },
      { category: 'face', tool: 'face_slim' },
      { category: 'face', tool: 'chin_slim' },
      { category: 'face', tool: 'jaw_slim' },
      { category: 'face', tool: 'chin_vline' },
      { category: 'eyes', tool: 'eye_enlarge' },
      { category: 'mouth', tool: 'teeth_whiten' },
      { category: 'hair', tool: 'hair_shine' }
    ];

    const results: ProgressionResult[] = [];

    for (const item of PRIORITY_TOOLS) {
      console.log(`\nTesting monotonic progression for ${item.tool}...`);

      // Switch to category
      const tab = page.locator(`[data-testid="tab-${item.category}"]`);
      await tab.click();
      await page.waitForTimeout(100);

      // Select tool
      const toolBtn = page.locator(`[data-testid="tool-item-${item.tool}"]`);
      await expect(toolBtn).toBeVisible();
      await toolBtn.click();
      await page.waitForTimeout(150);

      const slider = page.locator('[data-testid="tool-slider"]');
      await expect(slider).toBeVisible({ timeout: 5000 });

      // Reset tool to 0 if needed
      const btnReset = page.locator('[data-testid="btn-reset-tool"]');
      if (await btnReset.isVisible()) {
        await btnReset.click();
        await page.waitForTimeout(150);
      }

      // 1. Level 0 (Baseline)
      await slider.fill('0');
      await slider.dispatchEvent('change');
      await slider.dispatchEvent('mouseup');
      await page.waitForTimeout(200);

      // Snapshot baseline in page memory
      await mainCanvas.evaluate((canvas: HTMLCanvasElement) => {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const octx = offscreen.getContext('2d')!;
        octx.drawImage(canvas, 0, 0);
        (window as any).__baselineData = octx.getImageData(0, 0, canvas.width, canvas.height).data;
      });

      // Save 0 artifact
      const file0 = `progression_${item.tool}_000.png`;
      const buf0 = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
      fs.writeFileSync(path.join(ARTIFACTS_DIR, file0), Buffer.from(buf0.replace(/^data:image\/\w+;base64,/, ''), 'base64'));

      // Helper to evaluate MAE against baseline directly inside page
      const measureLevel = async (level: number): Promise<{ mae: number; filename: string }> => {
        await slider.fill(String(level));
        await slider.dispatchEvent('change');
        await slider.dispatchEvent('mouseup');
        await page.waitForTimeout(200);

        const mae = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => {
          const baseData = (window as any).__baselineData as Uint8ClampedArray;
          const currCtx = canvas.getContext('2d')!;
          const currData = currCtx.getImageData(0, 0, canvas.width, canvas.height).data;
          let totalDiff = 0;
          const total = baseData.length;
          for (let i = 0; i < total; i += 4) {
            totalDiff += Math.abs(baseData[i] - currData[i]);
            totalDiff += Math.abs(baseData[i+1] - currData[i+1]);
            totalDiff += Math.abs(baseData[i+2] - currData[i+2]);
          }
          return totalDiff / (total * 0.75); // across RGB channels
        });

        const filename = `progression_${item.tool}_${String(level).padStart(3, '0')}.png`;
        const dataUrl = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
        fs.writeFileSync(path.join(ARTIFACTS_DIR, filename), Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64'));

        return { mae, filename };
      };

      const res30 = await measureLevel(30);
      const res60 = await measureLevel(60);
      const res100 = await measureLevel(100);

      console.log(`  Intensity   0: MAE = 0.0000`);
      console.log(`  Intensity  30: MAE = ${res30.mae.toFixed(4)}`);
      console.log(`  Intensity  60: MAE = ${res60.mae.toFixed(4)}`);
      console.log(`  Intensity 100: MAE = ${res100.mae.toFixed(4)}`);

      // Monotonic progression check: MAE(0) < MAE(30) < MAE(60) < MAE(100)
      const isStrictlyMonotonic = res30.mae > 0 && res60.mae > res30.mae && res100.mae > res60.mae;
      expect(isStrictlyMonotonic).toBe(true);

      results.push({
        tool: item.tool,
        mae0: 0,
        mae30: Number(res30.mae.toFixed(4)),
        mae60: Number(res60.mae.toFixed(4)),
        mae100: Number(res100.mae.toFixed(4)),
        isMonotonic: isStrictlyMonotonic,
        artifacts: {
          val0: file0,
          val30: res30.filename,
          val60: res60.filename,
          val100: res100.filename
        }
      });

      // Reset before next tool
      await slider.fill('0');
      await slider.dispatchEvent('change');
      await slider.dispatchEvent('mouseup');
      await page.waitForTimeout(200);
    }

    const reportPath = path.join(ARTIFACTS_DIR, 'monotonic_progression_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      fixture: path.basename(FIXTURE_PORTRAIT),
      totalToolsTested: results.length,
      allMonotonic: results.every(r => r.isMonotonic),
      results
    }, null, 2));

    console.log(`\n✅ Monotonic progression verified for all ${results.length} priority tools!`);
    console.log(`Report written to ${reportPath}`);
  });
});
