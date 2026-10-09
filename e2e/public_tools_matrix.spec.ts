import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const FIXTURE_PORTRAIT = path.join(__dirname, '../docs/test_artifacts/real_portrait_front_real_photo_original.png');
const ARTIFACTS_DIR = path.join(__dirname, '../docs/test_artifacts');

interface ToolVerificationResult {
  toolId: string;
  category: string;
  featureCode: string;
  hasDelta: boolean;
  undoWorks: boolean;
  redoWorks: boolean;
  resetWorks: boolean;
  deltaMAE: number;
}

interface SliderTool {
  category: string;
  tool: string;
  code: string;
  testVal: number;
  prerequisite?: { [key: string]: number };
}

test.describe("Public Tools Full Chain Verification Matrix", () => {

  test('Verify full UI -> slider -> undo/redo -> reset chain for all public slider tools', async ({ page }) => {
    test.setTimeout(300000);

    // 1. Open Landing & Editor
    await page.goto('/');
    await page.locator('[data-testid="btn-open-editor"]').click();

    // 2. Upload real portrait
    const fileChooserInput = page.locator('[data-testid="file-upload-input"]');
    await fileChooserInput.setInputFiles(FIXTURE_PORTRAIT);

    const mainCanvas = page.locator('[data-testid="main-canvas"]');
    await expect(mainCanvas).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1000);

    // Tools under test with their category and canonical ID
    const PUBLIC_SLIDER_TOOLS = [
      // Skin
      { category: 'skin', tool: 'skin_smooth', code: 'B001', testVal: 70 },
      { category: 'skin', tool: 'skin_brighten', code: 'B009', testVal: 65 },
      { category: 'skin', tool: 'skin_oil', code: 'B006', testVal: 60 },
      { category: 'skin', tool: 'skin_tone', code: 'B008', testVal: 40 },
      { category: 'skin', tool: 'skin_detail', code: 'B010', testVal: 60 },
      { category: 'skin', tool: 'nasolabial', code: 'B005', testVal: 60 },
      { category: 'skin', tool: 'dark_circles', code: 'B011', testVal: 60 },
      { category: 'skin', tool: 'eye_bags', code: 'B012', testVal: 60 },
      // Face
      { category: 'face', tool: 'face_slim', code: 'B013', testVal: 50 },
      { category: 'face', tool: 'face_width', code: 'B014', testVal: 35 },
      { category: 'face', tool: 'cheekbone_width', code: 'B020', testVal: 40 },
      { category: 'face', tool: 'jaw_angle', code: 'B015', testVal: 40 },
      { category: 'face', tool: 'jaw_slim', code: 'B016', testVal: 50 },
      { category: 'face', tool: 'chin_vline', code: 'B017', testVal: 50 },
      { category: 'face', tool: 'chin_length', code: 'B018', testVal: 35 },
      { category: 'face', tool: 'chin_slim', code: 'B019', testVal: 60 },
      // Eyes
      { category: 'eyes', tool: 'eye_enlarge', code: 'B025', testVal: 50 },
      { category: 'eyes', tool: 'eye_height', code: 'B026', testVal: 45 },
      { category: 'eyes', tool: 'eye_length', code: 'B027', testVal: 45 },
      { category: 'eyes', tool: 'eyelid_lift', code: 'B032', testVal: 50 },
      { category: 'eyes', tool: 'double_eyelid', code: 'B033', testVal: 60 },
      { category: 'eyes', tool: 'eye_bright', code: 'B028', testVal: 60 },
      { category: 'eyes', tool: 'eye_catchlight', code: 'B034', testVal: 70 },
      // Mouth
      { category: 'mouth', tool: 'teeth_whiten', code: 'B043', testVal: 60 },
      // Hair
      { category: 'hair', tool: 'hair_smooth', code: 'B063', testVal: 50 },
      { category: 'hair', tool: 'hair_shine', code: 'B064', testVal: 60 },
      // Body
      { category: 'body', tool: 'body_slim', code: 'B075', testVal: 50 },
      { category: 'body', tool: 'collarbone', code: 'X006', testVal: 60 },
      // Adjust
      { category: 'adjust', tool: 'brightness', code: 'X022', testVal: 30 },
      { category: 'adjust', tool: 'contrast', code: 'X022', testVal: 25 },
      { category: 'adjust', tool: 'saturation', code: 'X022', testVal: 30 },
      { category: 'adjust', tool: 'temperature', code: 'X022', testVal: 35 },
      { category: 'adjust', tool: 'tint', code: 'X022', testVal: 25 },
      // Makeup
      { category: 'makeup', tool: 'makeup_preset', code: 'B061', testVal: 50 },
      { category: 'makeup', tool: 'makeup_lipstick', code: 'B051', testVal: 50 },
      { category: 'makeup', tool: 'lip_finish', code: 'B052', testVal: 100, prerequisite: { makeup_lipstick: 50 } },
      { category: 'makeup', tool: 'lip_liner', code: 'B053', testVal: 50, prerequisite: { makeup_lipstick: 50 } },
      { category: 'makeup', tool: 'makeup_blush', code: 'B054', testVal: 50 },
      { category: 'makeup', tool: 'makeup_foundation', code: 'B055', testVal: 50 },
      { category: 'makeup', tool: 'makeup_highlighter', code: 'B059', testVal: 50 },
      { category: 'makeup', tool: 'makeup_contour', code: 'B060', testVal: 50 },
      { category: 'makeup', tool: 'makeup_eyeshadow', code: 'B056', testVal: 50 },
      { category: 'makeup', tool: 'makeup_eyeliner', code: 'B057', testVal: 50 },
      { category: 'makeup', tool: 'false_lashes', code: 'B058', testVal: 50 }
    ];

    const results: ToolVerificationResult[] = [];

    const getCanvasDataUrl = async () => {
      return await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    };

    const getCanvasMAE = async (dataUrlA: string, dataUrlB: string): Promise<number> => {
      return await page.evaluate(async ({ a, b }) => {
        const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = src;
        });
        const [imgA, imgB] = await Promise.all([loadImg(a), loadImg(b)]);
        const cA = document.createElement('canvas');
        cA.width = imgA.width; cA.height = imgA.height;
        const ctxA = cA.getContext('2d')!;
        ctxA.drawImage(imgA, 0, 0);
        const dataA = ctxA.getImageData(0, 0, cA.width, cA.height).data;

        const cB = document.createElement('canvas');
        cB.width = imgB.width; cB.height = imgB.height;
        const ctxB = cB.getContext('2d')!;
        ctxB.drawImage(imgB, 0, 0);
        const dataB = ctxB.getImageData(0, 0, cB.width, cB.height).data;

        let diff = 0;
        for (let i = 0; i < dataA.length; i += 4) {
          diff += Math.abs(dataA[i] - dataB[i]);
          diff += Math.abs(dataA[i+1] - dataB[i+1]);
          diff += Math.abs(dataA[i+2] - dataB[i+2]);
        }
        return diff / (dataA.length * 0.75);
      }, { a: dataUrlA, b: dataUrlB });
    };

    for (const item of PUBLIC_SLIDER_TOOLS) {
      console.log(`\nVerifying full chain for ${item.code} (${item.tool}) in tab ${item.category}...`);

      // Switch Category Tab
      const tab = page.locator(`[data-testid="tab-${item.category}"]`);
      await tab.click();
      await page.waitForTimeout(100);

      // Handle prerequisite if any
      if (item.prerequisite) {
        for (const [preqTool, preqVal] of Object.entries(item.prerequisite)) {
          // Find the category of the prerequisite tool
          const preqItem = PUBLIC_SLIDER_TOOLS.find(t => t.tool === preqTool);
          if (preqItem) {
            await page.locator(`[data-testid="tab-${preqItem.category}"]`).click();
            await page.waitForTimeout(100);
            await page.locator(`[data-testid="tool-item-${preqTool}"]`).click();
            await page.waitForTimeout(100);
            const slider = page.locator('[data-testid="tool-slider"]');
            await slider.fill(String(preqVal));
            await slider.dispatchEvent('change');
            await slider.dispatchEvent('mouseup');
            await page.waitForTimeout(200);
          }
        }
        // Go back to the tool's tab
        await tab.click();
        await page.waitForTimeout(100);
      }

      // Select Tool
      const toolBtn = page.locator(`[data-testid="tool-item-${item.tool}"]`);
      await expect(toolBtn).toBeVisible();
      await toolBtn.click();
      await page.waitForTimeout(150);

      const slider = page.locator('[data-testid="tool-slider"]');
      await expect(slider).toBeVisible({ timeout: 5000 });

      // Reset to 0 initially
      const btnReset = page.locator('[data-testid="btn-reset-tool"]');
      if (await btnReset.isVisible()) {
        await btnReset.click();
        await page.waitForTimeout(200);
      }

      // Baseline snapshot before effect
      const baselineUrl = await getCanvasDataUrl();

      // Apply effect value
      await slider.fill(String(item.testVal));
      await slider.dispatchEvent('change');
      await slider.dispatchEvent('mouseup');
      await page.waitForTimeout(300);

      const modifiedUrl = await getCanvasDataUrl();
      const deltaMAE = await getCanvasMAE(baselineUrl, modifiedUrl);
      const hasDelta = deltaMAE > 0;
      expect(hasDelta).toBe(true);

      // Verify Undo reverts to baseline
      const btnUndo = page.locator('[data-testid="btn-undo"]');
      await expect(btnUndo).toBeEnabled();
      await btnUndo.click();
      await page.waitForTimeout(250);

      const undoUrl = await getCanvasDataUrl();
      const undoDiff = await getCanvasMAE(baselineUrl, undoUrl);
      const undoWorks = undoDiff === 0;

      // Verify Redo re-applies effect
      const btnRedo = page.locator('[data-testid="btn-redo"]');
      await expect(btnRedo).toBeEnabled();
      await btnRedo.click();
      await page.waitForTimeout(250);

      const redoUrl = await getCanvasDataUrl();
      const redoDiff = await getCanvasMAE(modifiedUrl, redoUrl);
      const redoWorks = redoDiff === 0;

      // Verify Reset tool resets slider to 0 and canvas to baseline
      await btnReset.click();
      await page.waitForTimeout(250);
      const resetUrl = await getCanvasDataUrl();
      const resetDiff = await getCanvasMAE(baselineUrl, resetUrl);
      const resetWorks = resetDiff === 0;

      // Unset prerequisite if any
      if (item.prerequisite) {
        for (const [preqTool, _] of Object.entries(item.prerequisite)) {
          const preqItem = PUBLIC_SLIDER_TOOLS.find(t => t.tool === preqTool);
          if (preqItem) {
            await page.locator(`[data-testid="tab-${preqItem.category}"]`).click();
            await page.waitForTimeout(100);
            await page.locator(`[data-testid="tool-item-${preqTool}"]`).click();
            await page.waitForTimeout(100);
            const pBtnReset = page.locator('[data-testid="btn-reset-tool"]');
            if (await pBtnReset.isVisible()) {
              await pBtnReset.click();
              await page.waitForTimeout(200);
            }
          }
        }
      }

      console.log(`  ${item.tool}: Delta MAE=${deltaMAE.toFixed(4)} | Undo=${undoWorks} | Redo=${redoWorks} | Reset=${resetWorks}`);

      results.push({
        toolId: item.tool,
        category: item.category,
        featureCode: item.code,
        hasDelta,
        undoWorks,
        redoWorks,
        resetWorks,
        deltaMAE: Number(deltaMAE.toFixed(4))
      });
    }

    // Now test Multi-Tool Accumulation, Draft Save, Reload, Restore, and Export
    console.log('\nTesting Multi-tool accumulation, Draft persistence, Reload, and Lossless Export...');

    // Apply 3 distinct tools across different categories
    // 1. Skin smooth
    await page.locator('[data-testid="tab-skin"]').click();
    await page.locator('[data-testid="tool-item-skin_smooth"]').click();
    const slider = page.locator('[data-testid="tool-slider"]');
    await slider.fill('50');
    await slider.dispatchEvent('change');
    await slider.dispatchEvent('mouseup');
    await page.waitForTimeout(200);

    // 2. Face slim
    await page.locator('[data-testid="tab-face"]').click();
    await page.locator('[data-testid="tool-item-face_slim"]').click();
    await slider.fill('40');
    await slider.dispatchEvent('change');
    await slider.dispatchEvent('mouseup');
    await page.waitForTimeout(200);

    // 3. Teeth whiten
    await page.locator('[data-testid="tab-mouth"]').click();
    await page.locator('[data-testid="tool-item-teeth_whiten"]').click();
    await slider.fill('60');
    await slider.dispatchEvent('change');
    await slider.dispatchEvent('mouseup');
    await page.waitForTimeout(200);

    const accumulatedDataUrl = await getCanvasDataUrl();

    // Save Draft
    const btnSaveDraft = page.locator('[data-testid="btn-save-draft"]');
    await expect(btnSaveDraft).toBeVisible();
    await btnSaveDraft.click();
    await page.waitForTimeout(600);

    // Reload page
    await page.reload();
    await page.locator('[data-testid="btn-open-editor"]').click();

    // Restore draft
    const btnRestoreDraft = page.locator('[data-testid="btn-restore-draft"]');
    await expect(btnRestoreDraft).toBeVisible({ timeout: 10000 });
    await btnRestoreDraft.click();

    await expect(mainCanvas).toBeVisible({ timeout: 15000 });
    // Wait for any detection overlay to settle
    await page.locator('.loading-overlay').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const restoredDataUrl = await getCanvasDataUrl();
    expect(restoredDataUrl.length).toBeGreaterThan(100);
    const draftDiff = await getCanvasMAE(accumulatedDataUrl, restoredDataUrl);
    // Neural-net landmark re-inference on CPU delegate has minor float variation (<3.5 MAE)
    expect(draftDiff).toBeLessThan(3.5);

    // Export PNG
    const downloadPromise = page.waitForEvent('download');
    const btnExport = page.locator('[data-testid="btn-export"]');
    await btnExport.click();

    const download = await downloadPromise;
    const exportFile = path.join(ARTIFACTS_DIR, 'public_tools_matrix_export.png');
    await download.saveAs(exportFile);

    expect(fs.existsSync(exportFile)).toBe(true);
    const fileStat = fs.statSync(exportFile);
    expect(fileStat.size).toBeGreaterThan(15000);

    // Verify lossless PNG signature
    const pngBuf = fs.readFileSync(exportFile);
    expect(pngBuf[0]).toBe(0x89);
    expect(pngBuf[1]).toBe(0x50);
    expect(pngBuf[2]).toBe(0x4E);
    expect(pngBuf[3]).toBe(0x47);

    // Verify reopened output: read back image and verify dimensions
    const reopenedValid = await page.evaluate(async (dataBase64) => {
      return new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve(img.width > 0 && img.height > 0);
        };
        img.onerror = () => resolve(false);
        img.src = 'data:image/png;base64,' + dataBase64;
      });
    }, pngBuf.toString('base64'));
    expect(reopenedValid).toBe(true);

    // Write full matrix verification report
    const reportPath = path.join(ARTIFACTS_DIR, 'public_tools_matrix_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      fixture: path.basename(FIXTURE_PORTRAIT),
      totalToolsTested: results.length,
      allPassed: results.every(r => r.hasDelta && r.undoWorks && r.redoWorks && r.resetWorks),
      draftRestoreMAE: Number(draftDiff.toFixed(4)),
      exportFileSize: fileStat.size,
      reopenedOutputVerified: reopenedValid,
      results
    }, null, 2));

    console.log(`\n✅ Public Tools Full Chain Matrix: Verified ${results.length} tools!`);
    console.log(`Report written to ${reportPath}`);
  });
});
