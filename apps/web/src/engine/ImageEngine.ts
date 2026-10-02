import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { WebGLWarpEngine } from './WebGLWarpEngine';
import type { SegmentationResult } from './SegmenterManager';

export class ImageEngine {
  private originalCanvas: HTMLCanvasElement;
  private workCanvas: HTMLCanvasElement;
  private webGLWarp: WebGLWarpEngine | null = null;
  private segmentationMask: SegmentationResult | null = null;

  constructor(image: HTMLImageElement | HTMLCanvasElement) {
    this.originalCanvas = document.createElement('canvas');
    this.workCanvas = document.createElement('canvas');
    
    this.originalCanvas.width = image.width;
    this.originalCanvas.height = image.height;
    this.workCanvas.width = image.width;
    this.workCanvas.height = image.height;

    const ctxOrg = this.originalCanvas.getContext('2d', { willReadFrequently: true })!;
    ctxOrg.drawImage(image, 0, 0);
    
    const ctxWork = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    ctxWork.drawImage(image, 0, 0);
    
    try {
      this.webGLWarp = new WebGLWarpEngine(this.workCanvas);
    } catch(e) {
      console.warn("WebGLWarpEngine failed to init, falling back to CPU if needed", e);
    }
  }

  setSegmentationMask(mask: SegmentationResult) {
    this.segmentationMask = mask;
  }

  getCanvas() {
    return this.workCanvas;
  }

  reset() {
    const ctxWork = this.workCanvas.getContext('2d')!;
    ctxWork.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctxWork.drawImage(this.originalCanvas, 0, 0);
  }

  private drawScaledSegmentationMask(targetCtx: CanvasRenderingContext2D, targetW: number, targetH: number, categoryId: number) {
    if (!this.segmentationMask) return;
    const { mask, width: sW, height: sH } = this.segmentationMask;
    
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = sW;
    smallCanvas.height = sH;
    const smallCtx = smallCanvas.getContext('2d')!;
    const mData = smallCtx.createImageData(sW, sH);
    
    for (let i = 0; i < mask.length; i++) {
        const isMatch = mask[i] === categoryId;
        mData.data[i * 4] = 255;
        mData.data[i * 4 + 1] = 255;
        mData.data[i * 4 + 2] = 255;
        mData.data[i * 4 + 3] = isMatch ? 255 : 0;
    }
    smallCtx.putImageData(mData, 0, 0);

    // Scale it to target size
    targetCtx.drawImage(smallCanvas, 0, 0, targetW, targetH);
  }

  // Effect 1: Skin Smoothing (Mịn da)
  applySkinSmoothing(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    
    const scale = Math.max(w, h) / 800; // Relative to 800px preview

    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const bCtx = blurCanvas.getContext('2d')!;
    bCtx.filter = `blur(${intensity * 0.15 * scale}px)`;
    bCtx.drawImage(this.originalCanvas, 0, 0);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mCtx = maskCanvas.getContext('2d')!;
    
    // Transparent background, so alpha is 0 outside the face
    mCtx.clearRect(0, 0, w, h);

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
      mCtx.fillStyle = 'rgba(255, 255, 255, 1)';
      
      mCtx.filter = `blur(${10 * scale}px)`;
      mCtx.fill();
      mCtx.filter = 'none';

      mCtx.globalCompositeOperation = 'destination-out';
      
      const drawFeature = (pts: number[]) => {
        mCtx.beginPath();
        pts.forEach((idx, i) => {
          const pt = landmarks[idx];
          if (!pt) return;
          if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
          else mCtx.lineTo(pt.x * w, pt.y * h);
        });
        mCtx.closePath();
        mCtx.filter = `blur(${8 * scale}px)`; 
        mCtx.fill();
        mCtx.filter = 'none';
      };

      drawFeature([33, 160, 158, 133, 153, 144]); // Left eye
      drawFeature([362, 385, 387, 263, 373, 380]); // Right eye
      drawFeature([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]); // Lips
      drawFeature([70, 63, 105, 66, 107, 55, 65, 52, 53, 46]); // Left Brow
      drawFeature([300, 293, 334, 296, 336, 285, 295, 282, 283, 276]); // Right Brow
      
      // Exclude hair using segmentation mask (Hair category = 1)
      if (this.segmentationMask) {
        // We draw the hair mask but we blur it slightly so the boundary is smooth
        mCtx.filter = `blur(${5 * scale}px)`;
        this.drawScaledSegmentationMask(mCtx, w, h, 1);
        mCtx.filter = 'none';
      }
    }
    
    mCtx.globalCompositeOperation = 'source-over';

    // Apply alpha mask to the blurred canvas
    bCtx.globalCompositeOperation = 'destination-in';
    bCtx.drawImage(maskCanvas, 0, 0); 

    // Draw original image first to preserve texture and background
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.drawImage(this.originalCanvas, 0, 0);
    
    // Overlay the blurred masked regions
    ctx.globalAlpha = intensity / 100.0;
    ctx.drawImage(blurCanvas, 0, 0);
    ctx.restore();
  }

  // Effect 2: Hair Smoothing (Mượt tóc) based on segmentation mask
  applyHairSmoothing(intensity: number) {
    if (intensity === 0 || !this.segmentationMask) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    
    const scale = Math.max(w, h) / 800;

    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const bCtx = blurCanvas.getContext('2d')!;
    bCtx.filter = `blur(${intensity * 0.1 * scale}px)`;
    bCtx.drawImage(this.workCanvas, 0, 0);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mCtx = maskCanvas.getContext('2d')!;
    
    this.drawScaledSegmentationMask(mCtx, w, h, 1); // 1 = Hair

    const blurredMaskCanvas = document.createElement('canvas');
    blurredMaskCanvas.width = w;
    blurredMaskCanvas.height = h;
    const bmCtx = blurredMaskCanvas.getContext('2d')!;
    bmCtx.filter = `blur(${6 * scale}px)`;
    bmCtx.drawImage(maskCanvas, 0, 0);

    ctx.save();
    bCtx.globalCompositeOperation = 'destination-in';
    bCtx.drawImage(blurredMaskCanvas, 0, 0);
    
    ctx.globalAlpha = intensity / 100.0;
    ctx.drawImage(blurCanvas, 0, 0);
    ctx.restore();
  }

  // Effect 3: Face Slimming (Thon mặt) - WebGL
  applyFaceSlimming(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const ctx = this.workCanvas.getContext('2d')!;
    
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const nose = landmarks[1];
    
    if (!leftCheek || !rightCheek || !nose) return;

    if (this.webGLWarp) {
        const aspect = w / h;
        const faceW = Math.abs((rightCheek.x - leftCheek.x) * aspect);
        const radius = faceW * 0.6;
        const mappedIntensity = (intensity / 100.0) * 0.3;

        const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
          { center: leftCheek, target: nose, radius, intensity: mappedIntensity },
          { center: rightCheek, target: nose, radius, intensity: mappedIntensity }
        ]);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(glCanvas, 0, 0);
    }
  }

  // Effect 4: Double Chin Reduction (Giảm nọng cằm)
  applyDoubleChinReduction(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const ctx = this.workCanvas.getContext('2d')!;
    
    const chin = landmarks[152];
    const lowerLip = landmarks[17];
    
    if (!chin || !lowerLip) return;

    if (this.webGLWarp) {
        const aspect = w / h;
        const chinToLip = Math.abs((lowerLip.y - chin.y) * aspect);
        const radius = chinToLip * 2.5; // broad area below chin
        const mappedIntensity = (intensity / 100.0) * 0.4;

        // Create target slightly above chin to pull it upwards
        const target = { x: chin.x, y: chin.y - 0.1 };

        const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
          { center: chin, target, radius, intensity: mappedIntensity }
        ]);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(glCanvas, 0, 0);
    }
  }
}
