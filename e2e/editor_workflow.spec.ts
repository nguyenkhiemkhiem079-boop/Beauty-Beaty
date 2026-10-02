import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const FIXTURE_PORTRAIT = path.join(__dirname, '../docs/test_artifacts/real_portrait_front_real_photo_original.png');

test.describe("D'Beaty Real Browser End-to-End User Flow", () => {

  test('Full E2E: Upload -> Detection -> Tools -> Slider Delta -> Undo/Redo -> Compare -> Draft -> Export -> Reopen PNG', async ({ page }) => {
    // 1. Open Landing Page
    await page.goto('/');
    await expect(page).toHaveTitle(/D'Beaty/);
    await expect(page.locator('.display')).toContainText('Đẹp theo cách');

    // 2. Open Editor from Landing
    const openEditorBtn = page.locator('[data-testid="btn-open-editor"]');
    await expect(openEditorBtn).toBeVisible();
    await openEditorBtn.click();

    // 3. Upload real portrait fixture
    const fileChooserInput = page.locator('[data-testid="file-upload-input"]');
    await expect(fileChooserInput).toBeAttached();
    await fileChooserInput.setInputFiles(FIXTURE_PORTRAIT);

    // 4. Wait for detection to complete and main canvas to become visible
    const mainCanvas = page.locator('[data-testid="main-canvas"]');
    await expect(mainCanvas).toBeVisible({ timeout: 25000 });

    // Wait 1s for initial render and history commit
    await page.waitForTimeout(1000);

    // Capture initial baseline canvas
    const baselineDataUrl = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    expect(baselineDataUrl.length).toBeGreaterThan(100);

    // 5. Select Category: Da (Skin) and Tool: Mịn da (skin_smooth)
    const tabSkin = page.locator('[data-testid="tab-skin"]');
    await tabSkin.click();

    const toolSmooth = page.locator('[data-testid="tool-item-skin_smooth"]');
    await expect(toolSmooth).toBeVisible();
    await toolSmooth.click();

    // 6. Move slider to 70 and verify canvas delta
    const slider = page.locator('[data-testid="tool-slider"]');
    await expect(slider).toBeVisible();
    await slider.fill('70');
    await slider.dispatchEvent('change');
    await slider.dispatchEvent('mouseup');
    await page.waitForTimeout(400);

    const smoothDataUrl = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    expect(smoothDataUrl).not.toBe(baselineDataUrl);

    // 7. Verify Undo reverts to baseline
    const btnUndo = page.locator('[data-testid="btn-undo"]');
    await expect(btnUndo).toBeEnabled();
    await btnUndo.click();
    await page.waitForTimeout(300);

    const undoDataUrl = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    expect(undoDataUrl).toBe(baselineDataUrl);

    // 8. Verify Redo re-applies effect
    const btnRedo = page.locator('[data-testid="btn-redo"]');
    await expect(btnRedo).toBeEnabled();
    await btnRedo.click();
    await page.waitForTimeout(300);

    const redoDataUrl = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    expect(redoDataUrl).toBe(smoothDataUrl);

    // 9. Verify Before/After Compare (hold compare button)
    const btnCompare = page.locator('[data-testid="btn-compare"]');
    await expect(btnCompare).toBeVisible();
    await btnCompare.dispatchEvent('mousedown');
    await page.waitForTimeout(150);

    const compareDataUrl = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    expect(compareDataUrl).toBe(baselineDataUrl);

    await btnCompare.dispatchEvent('mouseup');
    await page.waitForTimeout(150);
    const postCompareDataUrl = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    expect(postCompareDataUrl).toBe(smoothDataUrl);

    // 10. Test Face Category and Chin Slim Tool
    const tabFace = page.locator('[data-testid="tab-face"]');
    await tabFace.click();

    const toolChinSlim = page.locator('[data-testid="tool-item-chin_slim"]');
    await expect(toolChinSlim).toBeVisible();
    await toolChinSlim.click();

    await slider.fill('60');
    await slider.dispatchEvent('change');
    await slider.dispatchEvent('mouseup');
    await page.waitForTimeout(400);

    const faceDataUrl = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    expect(faceDataUrl).not.toBe(smoothDataUrl);

    // 11. Test Reset Tool
    const btnResetTool = page.locator('[data-testid="btn-reset-tool"]');
    await expect(btnResetTool).toBeVisible();
    await btnResetTool.click();
    await page.waitForTimeout(300);

    const afterResetDataUrl = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    expect(afterResetDataUrl).toBe(smoothDataUrl);

    // 12. Save Draft to IndexedDB
    const btnSaveDraft = page.locator('[data-testid="btn-save-draft"]');
    await expect(btnSaveDraft).toBeVisible();
    await btnSaveDraft.click();
    await page.waitForTimeout(600);

    // 13. Reload page and restore draft
    await page.reload();
    await openEditorBtn.click();

    // Draft banner should appear
    const btnRestoreDraft = page.locator('[data-testid="btn-restore-draft"]');
    await expect(btnRestoreDraft).toBeVisible({ timeout: 10000 });
    await btnRestoreDraft.click();

    // Wait for canvas to restore and render
    await expect(mainCanvas).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    const restoredDataUrl = await mainCanvas.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    expect(restoredDataUrl.length).toBeGreaterThan(100);

    // 14. Export PNG and verify downloaded file
    const downloadPromise = page.waitForEvent('download');
    const btnExport = page.locator('[data-testid="btn-export"]');
    await expect(btnExport).toBeVisible();
    await btnExport.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^DBeaty_Export_.*\.png$/);

    const exportPath = path.join(__dirname, '../docs/test_artifacts/playwright_e2e_export.png');
    await download.saveAs(exportPath);

    expect(fs.existsSync(exportPath)).toBe(true);
    const fileStat = fs.statSync(exportPath);
    expect(fileStat.size).toBeGreaterThan(10000);

    // 15. Verify valid lossless PNG file signature [0x89, 'P', 'N', 'G']
    const pngBuffer = fs.readFileSync(exportPath);
    expect(pngBuffer[0]).toBe(0x89);
    expect(pngBuffer[1]).toBe(0x50); // 'P'
    expect(pngBuffer[2]).toBe(0x4E); // 'N'
    expect(pngBuffer[3]).toBe(0x47); // 'G'

    console.log(`✅ E2E Full Workflow Verified: Exported ${fileStat.size} bytes PNG`);
  });

  test('Tool Search filters tools by Vietnamese and English keywords', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="btn-open-editor"]').click();

    const fileChooserInput = page.locator('[data-testid="file-upload-input"]');
    await fileChooserInput.setInputFiles(FIXTURE_PORTRAIT);
    await expect(page.locator('[data-testid="main-canvas"]')).toBeVisible({ timeout: 25000 });

    const searchInput = page.locator('.tool-search-input');
    await expect(searchInput).toBeVisible();

    // Search for 'cằm'
    await searchInput.fill('cằm');
    await page.waitForTimeout(200);
    await expect(page.locator('[data-testid="tool-item-chin_vline"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-item-chin_length"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-item-skin_smooth"]')).not.toBeVisible();

    // Search for 'mắt'
    await searchInput.fill('mắt');
    await page.waitForTimeout(200);
    await expect(page.locator('[data-testid="tool-item-eye_enlarge"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-item-eye_bright"]')).toBeVisible();
    await expect(page.locator('[data-testid="tool-item-chin_vline"]')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(200);
    await expect(page.locator('[data-testid="tab-skin"]')).toBeVisible();
  });
});
