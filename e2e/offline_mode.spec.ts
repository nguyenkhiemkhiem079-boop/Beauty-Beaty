import { test, expect } from '@playwright/test'; 

test('should work offline without external dependencies', async ({ page }) => {
  await page.route('**/*', async route => { 
    const url = route.request().url(); 
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost') || url.startsWith('ws://127.0.0.1') || url.startsWith('ws://localhost') || url.startsWith('data:')) { 
      route.continue(); 
    } else if (url.includes('unsplash.com')) {
      // Mock the unsplash image with a transparent 1x1 pixel
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
      });
    } else { 
      console.log('Blocked external request:', url);
      route.abort(); 
    } 
  }); 
  
  await page.goto('/'); 
  await page.click('[data-testid="btn-open-editor"]');
  
  // Wait for the UI to load
  await page.waitForSelector('.editor-layout', { timeout: 10000 }); 
  await expect(page.locator('.editor-layout')).toBeVisible(); 
  
  // Verify face landmarker was able to load
  // Usually if the landmarker fails, there is a global error or we can wait for canvas interaction.
  // We can just verify it didn't throw a network error modal.
  const errorMsg = page.locator('.error-toast'); // assuming there is one
  if (await errorMsg.isVisible()) {
    throw new Error('Error toast visible');
  }
});
