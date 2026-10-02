import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export class ImageEngine {
  private originalCanvas: HTMLCanvasElement;
  private workCanvas: HTMLCanvasElement;

  constructor(image: HTMLImageElement | HTMLCanvasElement) {
    this.originalCanvas = document.createElement('canvas');
    this.workCanvas = document.createElement('canvas');
    
    this.originalCanvas.width = image.width;
    this.originalCanvas.height = image.height;
    this.workCanvas.width = image.width;
    this.workCanvas.height = image.height;

    const ctxOrg = this.originalCanvas.getContext('2d')!;
    ctxOrg.drawImage(image, 0, 0);
    
    const ctxWork = this.workCanvas.getContext('2d')!;
    ctxWork.drawImage(image, 0, 0);
  }

  getCanvas() {
    return this.workCanvas;
  }

  reset() {
    const ctxWork = this.workCanvas.getContext('2d')!;
    ctxWork.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctxWork.drawImage(this.originalCanvas, 0, 0);
  }

  // Effect 1: Skin Smoothing (Mịn da)
  // Uses a bilateral-like approach via multiple canvas passes and mask
  applySkinSmoothing(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    // 1. Create a blurred version of the original image
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const bCtx = blurCanvas.getContext('2d')!;
    bCtx.filter = `blur(${intensity * 0.1}px)`;
    bCtx.drawImage(this.originalCanvas, 0, 0);

    // 2. Create a mask based on face landmarks (simplified for spike)
    // Face outline: indices 10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mCtx = maskCanvas.getContext('2d')!;
    
    // Fill mask with black
    mCtx.fillStyle = 'black';
    mCtx.fillRect(0, 0, w, h);

    // Draw white face polygon
    if (landmarks && landmarks.length > 0) {
      const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
      
      mCtx.beginPath();
      faceOval.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
        else mCtx.lineTo(pt.x * w, pt.y * h);
      });
      mCtx.closePath();
      mCtx.fillStyle = 'white';
      mCtx.fill();

      // Exclude eyes and mouth (draw black over them)
      mCtx.globalCompositeOperation = 'destination-out';
      
      // Left eye rough bounding
      const leftEye = [33, 160, 158, 133, 153, 144];
      mCtx.beginPath();
      leftEye.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
        else mCtx.lineTo(pt.x * w, pt.y * h);
      });
      mCtx.closePath();
      mCtx.fill();

      // Right eye
      const rightEye = [362, 385, 387, 263, 373, 380];
      mCtx.beginPath();
      rightEye.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
        else mCtx.lineTo(pt.x * w, pt.y * h);
      });
      mCtx.closePath();
      mCtx.fill();

      // Lips
      const lips = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
      mCtx.beginPath();
      lips.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
        else mCtx.lineTo(pt.x * w, pt.y * h);
      });
      mCtx.closePath();
      mCtx.fill();
    }
    
    // Restore composite operation for mask
    mCtx.globalCompositeOperation = 'source-over';

    // 3. Blend blurred image onto original using the mask
    ctx.save();
    ctx.drawImage(this.originalCanvas, 0, 0); // start fresh
    
    // Apply mask to blurred canvas
    bCtx.globalCompositeOperation = 'destination-in';
    bCtx.drawImage(maskCanvas, 0, 0);
    
    // Draw masked blur over original
    ctx.globalAlpha = intensity / 100.0;
    ctx.drawImage(blurCanvas, 0, 0);
    ctx.restore();
  }

  // Effect 3: Face Slimming (Thon mặt)
  applyFaceSlimming(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    
    // A real WebGL mesh warp is too complex for this single file spike.
    // For this checkpoint, we will approximate a localized pinch effect using Canvas 2D
    // By slicing the image and squishing the horizontal center.
    // This demonstrates an image transformation targeting the face width.
    
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const ctx = this.workCanvas.getContext('2d')!;
    
    // Find left and right cheek landmarks
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const nose = landmarks[1];
    
    if (!leftCheek || !rightCheek || !nose) return;


    const faceLeft = leftCheek.x * w;
    const faceRight = rightCheek.x * w;
    
    const faceWidth = faceRight - faceLeft;
    
    // Maximum shrink is ~10% of face width
    const maxShrink = (faceWidth * 0.1) * (intensity / 100);
    
    // We will draw the image in 3 vertical slices to fake a pinch.
    // Left slice: 0 to faceLeft (draw normally)
    // Middle slice: faceLeft to faceRight (draw compressed)
    // Right slice: faceRight to w (draw shifted left, with transparent gap? No, we stretch outer edges slightly)
    
    const scratch = document.createElement('canvas');
    scratch.width = w;
    scratch.height = h;
    const sCtx = scratch.getContext('2d')!;
    sCtx.drawImage(this.workCanvas, 0, 0);
    
    ctx.clearRect(0, 0, w, h);
    
    // Left edge to left cheek (stretch rightwards to fill gap)
    ctx.drawImage(scratch, 
      0, 0, faceLeft, h,
      0, 0, faceLeft + maxShrink, h
    );
    
    // Middle (shrink)
    ctx.drawImage(scratch,
      faceLeft, 0, faceWidth, h,
      faceLeft + maxShrink, 0, faceWidth - (maxShrink * 2), h
    );
    
    // Right cheek to right edge (stretch leftwards to fill gap)
    ctx.drawImage(scratch,
      faceRight, 0, w - faceRight, h,
      faceRight - maxShrink, 0, w - faceRight + maxShrink, h
    );
    
    // Note: This is a hacky 2D slice warp. A real implementation in M3 will use WebGL inverse warp.
    // But it satisfies the requirement of transforming real pixels based on landmarks for the spike.
  }
}
