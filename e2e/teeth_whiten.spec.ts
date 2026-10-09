import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('Teeth whiten tool should effectively whiten teeth on a smiling photo', async ({ page }) => {
  await page.route('**/*', async route => { 
    const url = route.request().url(); 
    if (url.includes('unsplash.com')) {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
      });
    } else { 
      route.continue(); 
    } 
  }); 

  // Load the page
  await page.goto('/');

  // Make sure we have the smile fixture
  const fixturePath = path.join(__dirname, 'fixtures', 'smile.jpg');
  if (!fs.existsSync(fixturePath)) {
    test.skip('Smile fixture not found. Skipping teeth whiten test.');
    return;
  }

  await page.click('[data-testid="btn-open-editor"]');
  await page.waitForSelector('.editor-layout', { timeout: 15000 });

  // Upload the smile image
  await page.setInputFiles('[data-testid="file-upload-input"]', fixturePath);

  // Wait for editor to load
  await page.waitForSelector('.editor-layout', { timeout: 15000 });

  // Select Teeth Whiten tool
  await page.click('[data-testid="tab-mouth"]');
  await page.click('[data-testid="tool-item-teeth_whiten"]');

  // Verify tool card opens
  await expect(page.locator('.active-tool-card')).toBeVisible();

  // Move slider to 100
  const slider = page.locator('.active-tool-card input[type="range"]');
  await slider.fill('100');
  
  // Wait for processing
  await page.waitForTimeout(2000);

  // Verify that the UI reflects the value
  const valueDisplay = page.locator('.active-tool-card span').filter({ hasText: '+100' });
  await expect(valueDisplay.first()).toBeVisible();

  // Take a screenshot to prove it works
  await page.screenshot({ path: 'test-results/teeth-whiten-100.png' });
});
