  applyBlemishHealing(centerNorm: { x: number; y: number }, radiusPx: number) {
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const cx = Math.round(centerNorm.x * w);
    const cy = Math.round(centerNorm.y * h);

    const r = Math.max(4, Math.round(radiusPx));
    
    // Define a bounding box that includes the target blemish and a source patch for texture cloning
    // We'll search for a clean texture patch offset by ~1.8r
    const shiftX = (cx + r * 2.5 < w) ? Math.round(r * 1.8) : Math.round(-r * 1.8);
    const shiftY = (cy + r * 2.5 < h) ? Math.round(r * 1.8) : Math.round(-r * 1.8);

    const x0 = Math.max(0, cx - r - Math.abs(shiftX));
    const y0 = Math.max(0, cy - r - Math.abs(shiftY));
    const x1 = Math.min(w, cx + r + Math.abs(shiftX));
    const y1 = Math.min(h, cy + r + Math.abs(shiftY));
    const pw = x1 - x0;
    const ph = y1 - y0;
    if (pw <= 0 || ph <= 0) return;

    // 1. Get original pixels
    const imgData = ctx.getImageData(x0, y0, pw, ph);
    const data = imgData.data;

    // 2. Create a blurred version for low-frequency color base
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = pw; patchCanvas.height = ph;
    const pCtx = patchCanvas.getContext('2d')!;
    pCtx.putImageData(imgData, 0, 0);

    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = pw; blurCanvas.height = ph;
    const bCtx = blurCanvas.getContext('2d', { willReadFrequently: true })!;
    bCtx.filter = `blur(${Math.max(2, r * 0.4)}px)`;
    bCtx.drawImage(patchCanvas, 0, 0);
    const blurData = bCtx.getImageData(0, 0, pw, ph).data;

    // 3. Frequency separation blend
    // For each pixel in the target blemish radius:
    // Result = Target_LowFreq (blur) + (Source_Original - Source_LowFreq)
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const dist = Math.hypot((x0 + x) - cx, (y0 + y) - cy);
        if (dist <= r) {
          // Soft radial mask for blending
          const t = Math.cos((dist / r) * (Math.PI / 2));
          const weight = Math.min(1.0, Math.max(0.0, t));
          
          // Target pixel index
          const tIdx = (y * pw + x) * 4;
          
          // Source pixel index (shifted)
          let sx = x + shiftX;
          let sy = y + shiftY;
          // clamp to patch bounds just in case
          sx = Math.max(0, Math.min(pw - 1, sx));
          sy = Math.max(0, Math.min(ph - 1, sy));
          const sIdx = (sy * pw + sx) * 4;

          // Compute Source High Frequency (Detail)
          const detailR = data[sIdx] - blurData[sIdx];
          const detailG = data[sIdx + 1] - blurData[sIdx + 1];
          const detailB = data[sIdx + 2] - blurData[sIdx + 2];

          // Reconstruct: Target Base (blur) + Source Detail
          const outR = blurData[tIdx] + detailR;
          const outG = blurData[tIdx + 1] + detailG;
          const outB = blurData[tIdx + 2] + detailB;

          // Blend into original data using radial weight
          data[tIdx] = Math.round(data[tIdx] * (1 - weight) + Math.min(255, Math.max(0, outR)) * weight);
          data[tIdx + 1] = Math.round(data[tIdx + 1] * (1 - weight) + Math.min(255, Math.max(0, outG)) * weight);
          data[tIdx + 2] = Math.round(data[tIdx + 2] * (1 - weight) + Math.min(255, Math.max(0, outB)) * weight);
        }
      }
    }

    ctx.putImageData(imgData, x0, y0);
  }
