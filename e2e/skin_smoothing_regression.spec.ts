import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURE_PORTRAIT = path.join(__dirname, '../docs/test_artifacts/real_portrait_front_real_photo_original.png');
const ARTIFACTS_DIR = path.join(__dirname, '../docs/test_artifacts');

test.describe("Skin Smoothing Regression", () => {
  test('Verify edge-preserving skin smoothing at different intensities', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Open Landing & Editor
    await page.goto('/');
    await page.locator('[data-testid="btn-open-editor"]').click();

    // 2. Upload real portrait
    const fileChooserInput = page.locator('[data-testid="file-upload-input"]');
    await fileChooserInput.setInputFiles(FIXTURE_PORTRAIT);

    const mainCanvas = page.locator('[data-testid="main-canvas"]');
    await expect(mainCanvas).toBeVisible({ timeout: 25000 });
    
    // Wait for segments to be fully processed (sometimes takes a few seconds)
    await page.waitForTimeout(3000);

    // Navigate to Skin tab
    await page.locator('[data-testid="tab-skin"]').click();
    await page.waitForTimeout(500);

    // Activate skin_smooth tool
    const toolBtn = page.locator(`[data-testid="tool-item-skin_smooth"]`);
    await toolBtn.click();
    await page.waitForTimeout(500);

    const slider = page.locator('[data-testid="tool-slider"]');

    // Helper to set slider, wait for render, and screenshot
    const setAndScreenshot = async (val: number, filename: string) => {
        const sliderBounds = await slider.boundingBox();
        if (sliderBounds) {
          const targetX = sliderBounds.x + (val / 100) * sliderBounds.width;
          const targetY = sliderBounds.y + sliderBounds.height / 2;
          await page.mouse.click(targetX, targetY);
          await page.waitForTimeout(1000); // allow render
          await mainCanvas.screenshot({ path: path.join(ARTIFACTS_DIR, filename) });
        }
    };

    // 0 intensity
    await setAndScreenshot(0, 'skin_smooth_000.png');

    // 30 intensity
    await setAndScreenshot(30, 'skin_smooth_030.png');

    // 60 intensity
    await setAndScreenshot(60, 'skin_smooth_060.png');

    // 100 intensity
    await setAndScreenshot(100, 'skin_smooth_100.png');

    // verify undo
    await page.locator('[data-testid="btn-undo"]').click();
    await page.waitForTimeout(1000);

    // verify redo
    await page.locator('[data-testid="btn-redo"]').click();
    await page.waitForTimeout(1000);

    // Export test
    await page.locator('[data-testid="btn-export"]').click();
    await page.waitForTimeout(1000); // wait for export modal
  });
});
