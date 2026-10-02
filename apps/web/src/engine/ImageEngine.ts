import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { WebGLWarpEngine, type WarpPoint } from './WebGLWarpEngine';
import type { SegmentationResult } from './SegmenterManager';

export interface PipelineParams {
  skin_smooth: number;
  face_slim: number;
  hair_smooth: number;
  chin_slim: number;
}

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

  // Unified Pipeline Executor for Preview and Export
  applyPipeline(params: PipelineParams, landmarks?: NormalizedLandmark[]) {
    this.reset();
    
    if (params.skin_smooth > 0 && landmarks) {
      this.applySkinSmoothing(landmarks, params.skin_smooth);
    }
    if (params.face_slim > 0 && landmarks) {
      this.applyFaceSlimming(landmarks, params.face_slim);
    }
    if (params.hair_smooth > 0) {
      this.applyHairSmoothing(params.hair_smooth);
    }
    if (params.chin_slim > 0 && landmarks) {
      this.applyDoubleChinReduction(landmarks, params.chin_slim);
    }
  }

  // Effect 4: Double Chin Reduction (Giảm nọng cằm) - B019
  applyDoubleChinReduction(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const ctx = this.workCanvas.getContext('2d')!;
    
    const chin = landmarks[152];    // Menton (chin tip)
    const lowerLip = landmarks[17]; // Lower lip center
    
    if (!chin || !lowerLip) return;

    if (this.webGLWarp) {
      const aspect = w / h;

      // In shader coordinate space:
      // dist = sqrt( ((x1 - x2)*aspect)^2 + (y1 - y2)^2 )
      // Y is unscaled (1.0 unit = canvas height h). X is scaled by aspect.
      // Vertical distance deltaY is ALREADY in shader units. We must NOT multiply deltaY by aspect!
      const chinToLip = Math.hypot((lowerLip.x - chin.x) * aspect, lowerLip.y - chin.y);

      // Estimate face height in isotropic shader units
      const forehead = landmarks[10];
      const faceHeight = forehead 
        ? Math.hypot((chin.x - forehead.x) * aspect, chin.y - forehead.y)
        : chinToLip * 5.0;

      // Face orientation vector (from chin towards lower lip/mouth) in normalized coordinates
      const dx = lowerLip.x - chin.x;
      const dy = lowerLip.y - chin.y;
      const distNorm = Math.hypot(dx, dy);
      const unitUpX = distNorm > 1e-5 ? dx / distNorm : 0;
      const unitUpY = distNorm > 1e-5 ? dy / distNorm : -1;

      // Position the warp center strictly in the submental zone (under the chin tip)
      // Moving down along the face axis by 25% of chin-to-lip distance
      const submentalOffset = chinToLip * 0.25;
      const center = {
        x: chin.x - unitUpX * submentalOffset,
        y: chin.y - unitUpY * submentalOffset
      };

      // Radius in shader space:
      // Safe radius: Ensure center-to-lip distance (1.25 * chinToLip) > radius (0.90 * chinToLip)
      // This leaves a 35% margin ensuring the lower lip and mouth are 100% untouched by the warp.
      const radius = chinToLip * 0.90;

      // Displacement is proportional to face size (chinToLip & faceHeight)
      // Rather than a fixed 0.1 of image height, max displacement is ~3.5% of face height
      const maxShift = Math.min(faceHeight * 0.035, chinToLip * 0.22);
      const shiftDistance = maxShift * (intensity / 100.0);

      // Target position moves upward towards the chin bone along the face axis
      const target = {
        x: center.x + unitUpX * shiftDistance,
        y: center.y + unitUpY * shiftDistance
      };

      // Support bilateral submental contouring along left and right jaw curves if available
      // Landmarks 148 (left jaw) and 377 (right jaw)
      const leftJaw = landmarks[148];
      const rightJaw = landmarks[377];
      const warpPoints: WarpPoint[] = [
        { center, target, radius, intensity: 1.0 }
      ];

      if (leftJaw && rightJaw) {
        const lateralOffset = chinToLip * 0.18;
        const lateralRadius = radius * 0.75;
        const lateralShift = shiftDistance * 0.55;

        const leftCenter = {
          x: leftJaw.x - unitUpX * lateralOffset,
          y: leftJaw.y - unitUpY * lateralOffset
        };
        const leftTarget = {
          x: leftCenter.x + unitUpX * lateralShift,
          y: leftCenter.y + unitUpY * lateralShift
        };

        const rightCenter = {
          x: rightJaw.x - unitUpX * lateralOffset,
          y: rightJaw.y - unitUpY * lateralOffset
        };
        const rightTarget = {
          x: rightCenter.x + unitUpX * lateralShift,
          y: rightCenter.y + unitUpY * lateralShift
        };

        warpPoints.push(
          { center: leftCenter, target: leftTarget, radius: lateralRadius, intensity: 0.8 },
          { center: rightCenter, target: rightTarget, radius: lateralRadius, intensity: 0.8 }
        );
      }

      const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, warpPoints);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(glCanvas, 0, 0);
    }
  }
}
