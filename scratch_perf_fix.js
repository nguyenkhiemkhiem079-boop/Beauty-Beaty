  applyBatchedLocalSkinSmoothing(
    strokes: LocalBrushOperation[],
    w_n: number,
    h_n: number,
    x_n: number,
    y_n: number,
    landmarks?: NormalizedLandmark[]
  ) {
    if (!strokes || strokes.length === 0) return;

    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;
    
    // Find max intensity for the global filter
    let maxIntensity = 0;
    for (const op of strokes) {
      if (op.intensity > maxIntensity) maxIntensity = op.intensity;
    }
    if (maxIntensity <= 0) return;

    // 1. Frequency separation ONE TIME
    const fineBlur = document.createElement('canvas');
    fineBlur.width = w; fineBlur.height = h;
    const fineCtx = fineBlur.getContext('2d')!;
    fineCtx.filter = `blur(${Math.max(1, 1.5 * scale)}px)`;
    fineCtx.drawImage(this.workCanvas, 0, 0);

    const smooth = document.createElement('canvas');
    smooth.width = w; smooth.height = h;
    const smoothCtx = smooth.getContext('2d')!;
    const blurRadius = Math.max(2, (maxIntensity / 100) * 8) * scale;
    smoothCtx.filter = `blur(${blurRadius}px)`;
    smoothCtx.drawImage(this.workCanvas, 0, 0);
    smoothCtx.filter = 'none';

    // Reintroduce a controlled amount of high-frequency detail.
    smoothCtx.save();
    smoothCtx.globalCompositeOperation = 'soft-light';
    smoothCtx.globalAlpha = 0.22;
    smoothCtx.drawImage(this.workCanvas, 0, 0);
    smoothCtx.globalAlpha = 0.10;
    smoothCtx.drawImage(fineBlur, 0, 0);
    smoothCtx.restore();

    // 2. Build ONE aggregated mask
    const mask = document.createElement('canvas');
    mask.width = w; mask.height = h;
    const mCtx = mask.getContext('2d')!;

    for (const op of strokes) {
      const u = (op.x - x_n) / w_n;
      const v = (op.y - y_n) / h_n;
      if (u < -0.2 || u > 1.2 || v < -0.2 || v > 1.2) continue;

      const cx = u * w;
      const cy = v * h;
      const radiusPx = Math.max(8, (op.radiusNorm / h_n) * h);
      
      // Compute alpha based on individual stroke intensity compared to maxIntensity
      const strokeAlpha = op.intensity / maxIntensity;
      
      const radial = mCtx.createRadialGradient(cx, cy, radiusPx * 0.45, cx, cy, radiusPx);
      radial.addColorStop(0, `rgba(255,255,255,${1 * strokeAlpha})`);
      radial.addColorStop(0.72, `rgba(255,255,255,${0.9 * strokeAlpha})`);
      radial.addColorStop(1, 'rgba(255,255,255,0)');
      
      mCtx.globalCompositeOperation = 'source-over';
      mCtx.fillStyle = radial;
      mCtx.beginPath();
      mCtx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
      mCtx.fill();
    }

    // Intersect with actual face segmentation when available.
    if (this.segmentationMask) {
      mCtx.globalCompositeOperation = 'destination-in';
      this.drawScaledSegmentationMask(mCtx, w, h, SEGMENT_FACE);
      // Never smooth hair.
      mCtx.globalCompositeOperation = 'destination-out';
      this.drawScaledSegmentationMask(mCtx, w, h, SEGMENT_HAIR);
    }

    // Protect eyes / brows / lips if landmarks are available.
    if (landmarks && landmarks.length > 0) {
      mCtx.globalCompositeOperation = 'destination-out';
      const protect = (ids: number[], featherPx: number) => {
        mCtx.beginPath();
        ids.forEach((idx, i) => {
          const p = landmarks[idx];
          if (!p) return;
          if (i === 0) mCtx.moveTo(p.x * w, p.y * h);
          else mCtx.lineTo(p.x * w, p.y * h);
        });
        mCtx.closePath();
        mCtx.filter = `blur(${featherPx}px)`;
        mCtx.fillStyle = '#fff';
        mCtx.fill();
        mCtx.filter = 'none';
      };
      protect([33, 160, 158, 133, 153, 144], 2.5 * scale);
      protect([362, 385, 387, 263, 373, 380], 2.5 * scale);
      protect([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95], 2 * scale);
      protect([70, 63, 105, 66, 107, 55, 65, 52, 53, 46], 2 * scale);
      protect([300, 293, 334, 296, 336, 285, 295, 282, 283, 276], 2 * scale);
    }

    // 3. Blend smooth via mask
    smoothCtx.globalCompositeOperation = 'destination-in';
    smoothCtx.drawImage(mask, 0, 0);

    ctx.save();
    ctx.globalAlpha = Math.min(0.82, 0.18 + (maxIntensity / 100) * 0.62);
    ctx.drawImage(smooth, 0, 0);
    ctx.restore();
  }
