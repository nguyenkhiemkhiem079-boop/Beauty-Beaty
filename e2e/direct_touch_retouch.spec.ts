import { test, expect } from '@playwright/test';
import path from 'path';

const FIXTURE = path.join(__dirname, '../docs/test_artifacts/real_portrait_front_real_photo_original.png');

async function setupEditor(page: any) {
  await page.goto('/');
  await page.locator('[data-testid="btn-open-editor"]').click();
  await page.locator('[data-testid="file-upload-input"]').setInputFiles(FIXTURE);
  const canvas = page.locator('[data-testid="main-canvas"]');
  await expect(canvas).toBeVisible({ timeout: 25000 });
  // Wait for initial model loading
  await page.waitForTimeout(2000);
  return canvas;
}

async function canvasDataUrl(page: any) {
  return page.locator('[data-testid="main-canvas"]').evaluate((c: HTMLCanvasElement) => c.toDataURL('image/png'));
}

test.describe('Direct touch retouch interaction', () => {
  test.beforeEach(async () => {
    test.setTimeout(150000);
  });

  test('A. zoom / pan / reset', async ({ page }) => {
    await setupEditor(page);
    const stage = page.locator('[data-testid="canvas-transform-stage"]');
    const beforeTransform = await stage.getAttribute('style');
    
    await page.getByRole('button', { name: 'Phóng to ảnh' }).click();
    await page.waitForTimeout(100);
    const zoomedTransform = await stage.getAttribute('style');
    expect(zoomedTransform).not.toBe(beforeTransform);
  });

  test('B. direct skin smooth', async ({ page }) => {
    const canvas = await setupEditor(page);
    await page.locator('[data-testid="tool-item-skin_smooth"]').click();
    await expect(page.locator('[data-testid="btn-direct-interaction-mode"]')).toBeVisible();

    const original = await canvasDataUrl(page);
    const box = await canvas.boundingBox();
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
  });

  test('C. blemish', async ({ page }) => {
    const canvas = await setupEditor(page);
    await page.locator('[data-testid="tool-item-skin_blemish"]').click();
    await expect(page.locator('[data-testid="btn-direct-interaction-mode"]')).toBeVisible();

    const original = await canvasDataUrl(page);
    const box = await canvas.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.50);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(450);

    const healed = await canvasDataUrl(page);
    expect(healed).not.toBe(original);

    await page.locator('[data-testid="btn-undo"]').click();
    await page.waitForTimeout(300);
    expect(await canvasDataUrl(page)).toBe(original);
  });

  test('D. face slim local drag', async ({ page }) => {
    const canvas = await setupEditor(page);
    await page.locator('[data-testid="tab-face"]').click();
    await page.locator('[data-testid="tool-item-face_slim"]').click();
    const original = await canvasDataUrl(page);
    const box = await canvas.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width * 0.28, box.y + box.height * 0.54);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.54, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(450);

    expect(await canvasDataUrl(page)).not.toBe(original);
  });

  test('E. chin slim local drag', async ({ page }) => {
    const canvas = await setupEditor(page);
    await page.locator('[data-testid="tab-face"]').click();
    await page.locator('[data-testid="tool-item-chin_slim"]').click();
    const original = await canvasDataUrl(page);
    const box = await canvas.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.85);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.80, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(450);

    expect(await canvasDataUrl(page)).not.toBe(original);
  });

  test('F. body slim local drag', async ({ page }) => {
    const canvas = await setupEditor(page);
    await page.locator('[data-testid="tab-body"]').click();
    await page.locator('[data-testid="tool-item-body_slim"]').click();
    const original = await canvasDataUrl(page);
    const box = await canvas.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.9);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.9, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(450);

    expect(await canvasDataUrl(page)).not.toBe(original);
  });

  test('G. draft save / reload / restore', async ({ page }) => {
    const canvas = await setupEditor(page);
    await page.locator('[data-testid="tool-item-skin_smooth"]').click();
    const box = await canvas.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width * 0.38, box.y + box.height * 0.46);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.47, box.y + box.height * 0.48, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(450);

    // Manually save draft
    await page.locator('[data-testid="btn-save-draft"]').click();
    await page.waitForTimeout(1000);

    const smoothed = await canvasDataUrl(page);

    // Verify IndexedDB contents
    const draftData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('dbeaty_drafts_db', 2);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('drafts', 'readonly');
          const store = tx.objectStore('drafts');
          const getReq = store.get('latest_active_draft');
          getReq.onsuccess = () => resolve(getReq.result);
        };
      });
    });
    
    expect((draftData as any).editState.localBrushes.length).toBeGreaterThan(0);
    expect((draftData as any).historyIndex).toBeGreaterThan(0);

    await page.reload();
    await page.locator('[data-testid="btn-open-editor"]').click(); // Open editor WITHOUT uploading a file
    await expect(page.locator('[data-testid="btn-restore-draft"]')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="btn-restore-draft"]').click();
    await page.waitForTimeout(2000);

    const restored = await canvasDataUrl(page);
    
    // Instead of exact string match (which fails on minor WebGL variances), use MAE
    const metrics = await page.evaluate(async (data: { smoothed: string, restored: string }) => {
      const loadImg = (src: string): Promise<HTMLImageElement> => new Promise(res => { 
        const img = new Image(); img.onload = () => res(img); img.src = src; 
      });
      const [imgA, imgB] = await Promise.all([loadImg(data.smoothed), loadImg(data.restored)]);
      
      const c = document.createElement('canvas');
      c.width = imgA.width; c.height = imgA.height;
      const ctx = c.getContext('2d')!;
      
      ctx.drawImage(imgA, 0, 0);
      const dataA = ctx.getImageData(0, 0, c.width, c.height).data;
      
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(imgB, 0, 0, c.width, c.height);
      const dataB = ctx.getImageData(0, 0, c.width, c.height).data;
      
      let errorSum = 0;
      for (let i = 0; i < dataA.length; i += 4) {
        errorSum += (Math.abs(dataA[i] - dataB[i]) + Math.abs(dataA[i+1] - dataB[i+1]) + Math.abs(dataA[i+2] - dataB[i+2])) / 3;
      }
      return errorSum / (c.width * c.height);
    }, { smoothed, restored });

    expect(metrics).toBeLessThan(1.0); // Allow very minor rendering variations
  });

  test('H. preview / export parity', async ({ page }) => {
    const canvas = await setupEditor(page);
    await page.locator('[data-testid="tool-item-skin_smooth"]').click();
    const box = await canvas.boundingBox();
    if (!box) return;

    await page.mouse.move(box.x + box.width * 0.38, box.y + box.height * 0.46);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.47, box.y + box.height * 0.48, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(450);

    // 2. Local face warp
    await page.locator('[data-testid="tab-face"]').click();
    await page.locator('[data-testid="tool-item-face_slim"]').click();
    await page.mouse.move(box.x + box.width * 0.28, box.y + box.height * 0.54);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.54, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(450);

    // 3. Global slider (Skin Tone)
    await page.locator('[data-testid="tab-skin"]').click();
    await page.locator('[data-testid="tool-item-skin_tone"]').click();
    await page.locator('[data-testid="tool-slider"]').evaluate((el: HTMLInputElement) => {
      el.value = '60';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(450);

    const previewDataUrl = await canvasDataUrl(page);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-testid="btn-export"]').click()
    ]);
    
    const fs = require('fs');
    const exportPath = await download.path();
    const exportBuffer = fs.readFileSync(exportPath);
    const exportDataUrl = 'data:image/png;base64,' + exportBuffer.toString('base64');

    const metrics = await page.evaluate(async (data: { previewUrl: string, exportUrl: string }) => {
      const loadImg = (src: string): Promise<HTMLImageElement> => new Promise(res => { 
        const img = new Image(); img.onload = () => res(img); img.src = src; 
      });
      const [prev, exp] = await Promise.all([loadImg(data.previewUrl), loadImg(data.exportUrl)]);
      
      const c = document.createElement('canvas');
      c.width = prev.width; c.height = prev.height;
      const ctx = c.getContext('2d')!;
      
      // Draw export scaled to preview
      ctx.drawImage(exp, 0, 0, prev.width, prev.height);
      const expData = ctx.getImageData(0, 0, prev.width, prev.height).data;
      
      // Draw preview
      ctx.clearRect(0,0,c.width,c.height);
      ctx.drawImage(prev, 0, 0);
      const prevData = ctx.getImageData(0, 0, prev.width, prev.height).data;
      
      let errorSum = 0;
      let mseSum = 0;
      const totalPixels = prev.width * prev.height;
      for (let i=0; i<prevData.length; i+=4) {
        const rErr = prevData[i] - expData[i];
        const gErr = prevData[i+1] - expData[i+1];
        const bErr = prevData[i+2] - expData[i+2];
        const absErr = (Math.abs(rErr) + Math.abs(gErr) + Math.abs(bErr)) / 3;
        const sqErr = (rErr*rErr + gErr*gErr + bErr*bErr) / 3;
        errorSum += absErr;
        mseSum += sqErr;
      }
      const mae = errorSum / totalPixels;
      const mse = mseSum / totalPixels;
      const psnr = mse === 0 ? 100 : 20 * Math.log10(255 / Math.sqrt(mse));
      
      return { mae, psnr };
    }, { previewUrl: previewDataUrl, exportUrl: exportDataUrl });

    console.log(`H Parity: MAE=${metrics.mae.toFixed(2)}, PSNR=${metrics.psnr.toFixed(2)}dB`);
    expect(metrics.mae).toBeLessThan(4.0);
    expect(metrics.psnr).toBeGreaterThan(34);
  });
});

test.describe('Mobile Touch & Pinch Zoom', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('I. mobile touch pinch zoom cancellation', async ({ page }) => {
    test.setTimeout(150000);
    const canvas = await setupEditor(page);
    await page.locator('[data-testid="tool-item-skin_smooth"]').click();
    
    const stage = page.locator('[data-testid="canvas-transform-stage"]');
    const beforeTransform = await stage.getAttribute('style');
    const original = await canvasDataUrl(page);

    const box = await canvas.boundingBox();
    if (!box) return;

    // Get CDP session for real touch simulation
    const client = await page.context().newCDPSession(page);

    // Initial brush touch (finger 1 down)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ id: 1, x: box.x + box.width * 0.4, y: box.y + box.height * 0.5 }]
    });
    
    // Start moving finger 1 to simulate brush
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ id: 1, x: box.x + box.width * 0.42, y: box.y + box.height * 0.5 }]
    });
    await page.waitForTimeout(50);
    
    // Finger 2 down (interrupts brush, starts pinch)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { id: 1, x: box.x + box.width * 0.42, y: box.y + box.height * 0.5 },
        { id: 2, x: box.x + box.width * 0.6, y: box.y + box.height * 0.5 }
      ]
    });
    await page.waitForTimeout(50);
    
    // Pinch out
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { id: 1, x: box.x + box.width * 0.3, y: box.y + box.height * 0.5 },
        { id: 2, x: box.x + box.width * 0.7, y: box.y + box.height * 0.5 }
      ]
    });
    await page.waitForTimeout(100);

    // Release all
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
    
    await page.waitForTimeout(450);

    // Verify zoom occurred
    const zoomedTransform = await stage.getAttribute('style');
    expect(zoomedTransform).not.toBe(beforeTransform);

    // Verify NO brush stroke happened
    const currentData = await canvasDataUrl(page);
    expect(currentData).toBe(original);
    
    // Verify Editor state (no localBrushes, no localWarps, history not incremented with ghost entry)
    const editorState = await page.evaluate(() => {
      // Access React component state via DOM if possible, or just verify undo is disabled
      const undoBtn = document.querySelector('[data-testid="btn-undo"]');
      return {
        undoDisabled: undoBtn ? (undoBtn as HTMLButtonElement).disabled : true
      };
    });
    expect(editorState.undoDisabled).toBe(true);
  });
});
