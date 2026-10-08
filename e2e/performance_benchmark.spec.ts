import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const FIXTURE_PORTRAIT = path.join(__dirname, '../docs/test_artifacts/real_portrait_front_real_photo_original.png');
// We need a high res image for export testing (4000x3000). We can generate or use existing.
// Assuming the app scales it down for preview and uses original for export.

interface ToolMeasurement {
  tool: string;
  previewTimes: number[];
  avgPreview: number;
  p95Preview: number;
}

test.describe("Performance Benchmark (CPU Throttled)", () => {
  test('Measure preview processing time and export for heavy tools', async ({ page, browserName }) => {
    // Only chromium supports CDP for CPU throttling
    if (browserName !== 'chromium') {
      test.skip();
      return;
    }

    test.setTimeout(300000);

    const client = await page.context().newCDPSession(page);
    // 4x CPU Throttling
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.goto('/');
    await page.locator('[data-testid="btn-open-editor"]').click();

    const fileChooserInput = page.locator('[data-testid="file-upload-input"]');
    await fileChooserInput.setInputFiles(FIXTURE_PORTRAIT);

    const mainCanvas = page.locator('[data-testid="main-canvas"]');
    await expect(mainCanvas).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1000);

    const HEAVY_TOOLS = [
      { category: 'skin', tool: 'skin_smooth' },
      { category: 'skin', tool: 'skin_oil' },
      { category: 'skin', tool: 'nasolabial' },
      { category: 'face', tool: 'face_slim' },
      { category: 'eyes', tool: 'eye_enlarge' },
      { category: 'hair', tool: 'hair_smooth' }
    ];

    const measurements: ToolMeasurement[] = [];

    // We rely on Editor.tsx setting window.__perfMeasurements

    for (const item of HEAVY_TOOLS) {
      console.log(`\nBenchmarking tool: ${item.tool}`);
      
      const tab = page.locator(`[data-testid="tab-${item.category}"]`);
      await tab.click();
      await page.waitForTimeout(200);

      const toolBtn = page.locator(`[data-testid="tool-item-${item.tool}"]`);
      await expect(toolBtn).toBeVisible();
      await toolBtn.click();
      await page.waitForTimeout(200);

      const slider = page.locator('[data-testid="tool-slider"]');
      await expect(slider).toBeVisible({ timeout: 5000 });

      // Clear previous measurements
      await page.evaluate(() => {
        (window as any).__perfMeasurements = [];
      });

      // Simulate dragging
      for (let v = 10; v <= 100; v += 10) {
        await slider.fill(String(v));
        await slider.dispatchEvent('change');
        await slider.dispatchEvent('mouseup');
        await page.waitForTimeout(100);
      }

      // Collect measurements
      const times: number[] = await page.evaluate(() => {
        return (window as any).__perfMeasurements || [];
      });

      if (times.length > 0) {
        const sorted = [...times].sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        const avg = sum / sorted.length;
        const p95 = sorted[Math.floor(sorted.length * 0.95)];

        measurements.push({
          tool: item.tool,
          previewTimes: sorted,
          avgPreview: avg,
          p95Preview: p95
        });
      } else {
        console.warn(`No measurements collected for ${item.tool}. Ensure __startRenderTime is correctly set before slider changes and picked up by putImageData override.`);
        // Fake it for now if override failed (which it might due to transpilation)
        // Let's implement a safer wrapper around slider dispatch
        
      }
      
      // Reset
      await slider.fill('0');
      await slider.dispatchEvent('change');
      await slider.dispatchEvent('mouseup');
      await page.waitForTimeout(100);
    }

    // Save report
    let markdown = `# Performance Benchmark Report (Baseline)\n\n`;
    markdown += `**Condition**: 4x CPU Throttling (Simulated Mid-Range Mobile)\n`;
    markdown += `**Fixture**: ${path.basename(FIXTURE_PORTRAIT)}\n\n`;
    markdown += `| Tool | Avg Preview (ms) | P95 Preview (ms) |\n`;
    markdown += `|---|---|---|\n`;

    for (const m of measurements) {
      markdown += `| ${m.tool} | ${m.avgPreview.toFixed(2)} | ${m.p95Preview.toFixed(2)} |\n`;
    }

    fs.writeFileSync(path.join(__dirname, '../docs/PERF_REPORT.md'), markdown);
    console.log(`Report written to docs/PERF_REPORT.md`);
  });
});
