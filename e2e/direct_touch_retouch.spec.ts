import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURE = path.join(__dirname, '../docs/test_artifacts/real_portrait_front_real_photo_original.png');

async function canvasDataUrl(page: any) {
  return page.locator('[data-testid="main-canvas"]').evaluate((c: HTMLCanvasElement) => c.toDataURL('image/png'));
}

test.describe('Direct touch retouch interaction', () => {
  test('zoom controls and local skin/warp gestures replay through history', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await page.locator('[data-testid="btn-open-editor"]').click();
    await page.locator('[data-testid="file-upload-input"]').setInputFiles(FIXTURE);

    const canvas = page.locator('[data-testid="main-canvas"]');
    await expect(canvas).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1200);

    // Zoom in and ensure only the view transform changes.
    const stage = page.locator('[data-testid="canvas-transform-stage"]');
    const beforeTransform = await stage.getAttribute('style');
    await page.getByRole('button', { name: 'Phóng to ảnh' }).click();
    const afterTransform = await stage.getAttribute('style');
    expect(afterTransform).not.toBe(beforeTransform);

    // Direct skin smoothing: drag over a cheek-sized region.
    await page.locator('[data-testid="tool-item-skin_smooth"]').click();
    await expect(page.locator('[data-testid="btn-direct-interaction-mode"]')).toBeVisible();

    const original = await canvasDataUrl(page);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    await page.mouse.move(box.x + box.width * 0.38, box.y + box.height * 0.46);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.47, box.y + box.height * 0.48, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(450);

    const smoothed = await canvasDataUrl(page);
    expect(smoothed).not.toBe(original);

    await page.locator('[data-testid="btn-undo"]').click();
    await page.waitForTimeout(300);
    const undone = await canvasDataUrl(page);
    expect(undone).toBe(original);

    await page.locator('[data-testid="btn-redo"]').click();
    await page.waitForTimeout(300);
    const redone = await canvasDataUrl(page);
    expect(redone).toBe(smoothed);

    // Direct face warp: drag inward from one cheek.
    await page.locator('[data-testid="tool-item-face_slim"]').click();
    const beforeWarp = await canvasDataUrl(page);
    const box2 = await canvas.boundingBox();
    expect(box2).not.toBeNull();
    if (!box2) return;

    await page.mouse.move(box2.x + box2.width * 0.28, box2.y + box2.height * 0.54);
    await page.mouse.down();
    await page.mouse.move(box2.x + box2.width * 0.35, box2.y + box2.height * 0.54, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(450);

    const warped = await canvasDataUrl(page);
    expect(warped).not.toBe(beforeWarp);
  });
});
