import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURE_PORTRAIT = path.join(__dirname, '../docs/test_artifacts/real_portrait_front_real_photo_original.png');
const ARTIFACTS_DIR = path.join(__dirname, '../docs/test_artifacts');

const VIEWPORTS = [
  { width: 1920, height: 1080, name: 'desktop_1080p' },
  { width: 1366, height: 768, name: 'laptop_standard' },
  { width: 1024, height: 768, name: 'tablet_landscape' },
  { width: 768, height: 1024, name: 'tablet_portrait' },
  { width: 390, height: 844, name: 'mobile_standard' }
];

test.describe('Responsive Viewports QA Suite (Section 7 Acceptance)', () => {
  for (const vp of VIEWPORTS) {
    test(`Verify layout integrity and responsiveness at ${vp.width}x${vp.height} (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Check Landing Page
      await page.goto('/');
      await expect(page.locator('.display')).toBeVisible();

      // Verify no horizontal overflow on landing
      const hasLandingHOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasLandingHOverflow).toBe(false);

      // 2. Open Editor
      const openBtn = page.locator('[data-testid="btn-open-editor"]');
      await expect(openBtn).toBeVisible();
      await openBtn.click();

      // 3. Upload fixture
      const fileChooserInput = page.locator('[data-testid="file-upload-input"]');
      await fileChooserInput.setInputFiles(FIXTURE_PORTRAIT);

      const mainCanvas = page.locator('[data-testid="main-canvas"]');
      await expect(mainCanvas).toBeVisible({ timeout: 25000 });
      await page.waitForTimeout(500);

      // Verify no horizontal page overflow in editor
      const hasEditorHOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasEditorHOverflow).toBe(false);

      // 4. Verify category tabs and tools panel are reachable
      const tabSkin = page.locator('[data-testid="tab-skin"]');
      await expect(tabSkin).toBeVisible();

      const tabFace = page.locator('[data-testid="tab-face"]');
      await expect(tabFace).toBeVisible();

      const toolSmooth = page.locator('[data-testid="tool-item-skin_smooth"]');
      await expect(toolSmooth).toBeVisible();

      // 5. Test interaction with tool and slider
      await toolSmooth.click();
      const slider = page.locator('[data-testid="tool-slider"]');
      await expect(slider).toBeVisible();

      await slider.fill('40');
      await slider.dispatchEvent('change');
      await slider.dispatchEvent('mouseup');
      await page.waitForTimeout(300);

      // 6. Capture responsive screenshot artifact
      const screenshotPath = path.join(ARTIFACTS_DIR, `responsive_${vp.width}x${vp.height}_${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      console.log(`✅ Responsive verification PASSED for ${vp.width}x${vp.height} (${vp.name})`);
    });
  }
});
