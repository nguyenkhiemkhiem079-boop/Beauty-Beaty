import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { WebGLWarpEngine, type WarpPoint } from './WebGLWarpEngine';
import type { SegmentationResult } from './SegmenterManager';
import { COLOR_FILTERS } from '../presets/filters';

export interface PipelineParams {
  skin_smooth: number;      // B001
  skin_brighten?: number;   // B004
  face_slim: number;        // B013
  chin_slim: number;        // B019
  eye_enlarge?: number;     // B025
  teeth_whiten?: number;    // B043
  hair_smooth: number;      // B063
  brightness?: number;      // X018
  contrast?: number;        // X018
  saturation?: number;      // X019
  temperature?: number;     // X020
  tint?: number;            // X020 color balance / tint
  filter_id?: string;       // X024
  filter_intensity?: number;// X024
}

export interface ChinSlimParams {
  aspect: number;
  unitUp: { x: number; y: number };
  tiltAngleDeg: number;
  center: { x: number; y: number };
  target: { x: number; y: number };
  radius: number;
  maxShift: number;
  shiftDistance: number;
  warpPoints: WarpPoint[];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = (h % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
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

  // Effect 1: Skin Smoothing (Mịn da - B001)
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
    bCtx.drawImage(this.workCanvas, 0, 0);

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
        mCtx.filter = `blur(${5 * scale}px)`;
        this.drawScaledSegmentationMask(mCtx, w, h, 1);
        mCtx.filter = 'none';
      }
    }
    
    mCtx.globalCompositeOperation = 'source-over';

    // Apply alpha mask to the blurred canvas
    bCtx.globalCompositeOperation = 'destination-in';
    bCtx.drawImage(maskCanvas, 0, 0); 

    // Overlay the blurred masked regions onto current workCanvas
    ctx.save();
    ctx.globalAlpha = intensity / 100.0;
    ctx.drawImage(blurCanvas, 0, 0);
    ctx.restore();
  }

  // Effect 1b: Skin Brightening / Tone Up (Sáng da / Nâng tone - B004)
  applySkinBrightening(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const brightCanvas = document.createElement('canvas');
    brightCanvas.width = w;
    brightCanvas.height = h;
    const bCtx = brightCanvas.getContext('2d')!;
    
    // Tone boost: brighten by up to 25%, subtle contrast curve
    const brightnessVal = 100 + (intensity * 0.25);
    const contrastVal = 100 - (intensity * 0.04);
    bCtx.filter = `brightness(${brightnessVal}%) contrast(${contrastVal}%) saturate(102%)`;
    bCtx.drawImage(this.workCanvas, 0, 0);
    bCtx.filter = 'none';

    // Skin mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mCtx = maskCanvas.getContext('2d')!;
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
      mCtx.filter = `blur(${12 * scale}px)`;
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
      
      if (this.segmentationMask) {
        mCtx.filter = `blur(${6 * scale}px)`;
        this.drawScaledSegmentationMask(mCtx, w, h, 1);
        mCtx.filter = 'none';
      }
    }

    bCtx.globalCompositeOperation = 'destination-in';
    bCtx.drawImage(maskCanvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = intensity / 100.0;
    ctx.drawImage(brightCanvas, 0, 0);
    ctx.restore();
  }

  // Effect 2: Hair Smoothing (Mượt tóc - B063) based on segmentation mask
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

    bCtx.globalCompositeOperation = 'destination-in';
    bCtx.drawImage(blurredMaskCanvas, 0, 0);
    
    ctx.save();
    ctx.globalAlpha = intensity / 100.0;
    ctx.drawImage(blurCanvas, 0, 0);
    ctx.restore();
  }

  // Effect 3: Face Slimming (Thon mặt V-line - B013) - WebGL
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
          { center: leftCheek, target: nose, radius, intensity: mappedIntensity, mode: 0 },
          { center: rightCheek, target: nose, radius, intensity: mappedIntensity, mode: 0 }
        ]);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(glCanvas, 0, 0);
    }
  }

  // Effect 4: Eye Enlargement (Mắt to - B025) - WebGL Radial Bulge
  applyEyeEnlargement(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const aspect = w / h;

    const leftInner = landmarks[133];
    const leftOuter = landmarks[33];
    const leftTop = landmarks[159];
    const leftBottom = landmarks[145];

    const rightInner = landmarks[362];
    const rightOuter = landmarks[263];
    const rightTop = landmarks[386];
    const rightBottom = landmarks[374];

    if (!leftInner || !leftOuter || !rightInner || !rightOuter) return;

    const leftCenter = {
      x: (leftInner.x + leftOuter.x) / 2,
      y: leftTop && leftBottom ? (leftTop.y + leftBottom.y) / 2 : (leftInner.y + leftOuter.y) / 2
    };
    const leftWidth = Math.hypot((leftOuter.x - leftInner.x) * aspect, leftOuter.y - leftInner.y);

    const rightCenter = {
      x: (rightInner.x + rightOuter.x) / 2,
      y: rightTop && rightBottom ? (rightTop.y + rightBottom.y) / 2 : (rightInner.y + rightOuter.y) / 2
    };
    const rightWidth = Math.hypot((rightOuter.x - rightInner.x) * aspect, rightOuter.y - rightInner.y);

    const warpIntensity = (intensity / 100.0) * 0.28;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftCenter, target: leftCenter, radius: leftWidth * 1.15, intensity: warpIntensity, mode: 1.0 },
      { center: rightCenter, target: rightCenter, radius: rightWidth * 1.15, intensity: warpIntensity, mode: 1.0 }
    ]);

    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // Effect 5: Teeth Whitening (Trắng răng - B043)
  applyTeethWhitening(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    // Inner mouth landmark perimeter
    const innerMouthIndices = [13, 82, 312, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 61, 291];
    let minX = w, maxX = 0, minY = h, maxY = 0;

    innerMouthIndices.forEach(idx => {
      const pt = landmarks[idx];
      if (pt) {
        const px = pt.x * w;
        const py = pt.y * h;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    });

    const boxPadding = 6;
    const bx = Math.max(0, Math.floor(minX - boxPadding));
    const by = Math.max(0, Math.floor(minY - boxPadding));
    const bw = Math.min(w - bx, Math.ceil(maxX - minX + boxPadding * 2));
    const bh = Math.min(h - by, Math.ceil(maxY - minY + boxPadding * 2));

    if (bw <= 0 || bh <= 0) return;

    // Create mouth clip mask
    const mouthMask = document.createElement('canvas');
    mouthMask.width = bw;
    mouthMask.height = bh;
    const mCtx = mouthMask.getContext('2d')!;
    mCtx.beginPath();
    innerMouthIndices.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      const lx = pt.x * w - bx;
      const ly = pt.y * h - by;
      if (i === 0) mCtx.moveTo(lx, ly);
      else mCtx.lineTo(lx, ly);
    });
    mCtx.closePath();
    mCtx.fillStyle = '#ffffff';
    mCtx.fill();
    const maskData = mCtx.getImageData(0, 0, bw, bh);

    // Whitening processing on mouth pixels
    const mouthData = ctx.getImageData(bx, by, bw, bh);
    const data = mouthData.data;

    const desatFactor = (intensity / 100.0) * 0.70;
    const lightFactor = (intensity / 100.0) * 0.20;

    for (let i = 0; i < data.length; i += 4) {
      if (maskData.data[i + 3] > 30) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const [hue, sat, lum] = rgbToHsl(r, g, b);

        // Target yellow / warm tones common in teeth discoloration
        if (hue >= 20 && hue <= 75 && lum >= 0.22) {
          const newSat = Math.max(0, sat * (1 - desatFactor));
          const newLum = Math.min(1.0, lum + lightFactor * (1.0 - lum));
          const [nr, ng, nb] = hslToRgb(hue, newSat, newLum);
          data[i] = nr;
          data[i + 1] = ng;
          data[i + 2] = nb;
        }
      }
    }

    ctx.putImageData(mouthData, bx, by);
  }

  // Geometry calculations for B019 Double Chin Reduction
  getChinSlimWarpPoints(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return null;
    
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    
    const chin = landmarks[152];    // Menton (chin tip)
    const lowerLip = landmarks[17]; // Lower lip center
    
    if (!chin || !lowerLip) return null;

    const aspect = w / h;
    const chinToLip = Math.hypot((lowerLip.x - chin.x) * aspect, lowerLip.y - chin.y);

    const forehead = landmarks[10];
    const faceHeight = forehead 
      ? Math.hypot((chin.x - forehead.x) * aspect, chin.y - forehead.y)
      : chinToLip * 5.0;

    const dx = lowerLip.x - chin.x;
    const dy = lowerLip.y - chin.y;
    const distNorm = Math.hypot(dx, dy);
    const unitUpX = distNorm > 1e-5 ? dx / distNorm : 0;
    const unitUpY = distNorm > 1e-5 ? dy / distNorm : -1;
    const tiltAngleDeg = (Math.atan2(unitUpX, -unitUpY) * 180) / Math.PI;

    const submentalOffset = chinToLip * 0.25;
    const center = {
      x: chin.x - unitUpX * submentalOffset,
      y: chin.y - unitUpY * submentalOffset
    };

    const radius = chinToLip * 0.90;
    const maxShift = Math.min(faceHeight * 0.04, chinToLip * 0.26);
    const shiftDistance = maxShift * (intensity / 100.0);

    const target = {
      x: center.x + unitUpX * shiftDistance,
      y: center.y + unitUpY * shiftDistance
    };

    const leftJaw = landmarks[148];
    const rightJaw = landmarks[377];
    const warpPoints: WarpPoint[] = [
      { center, target, radius, intensity: 1.0, mode: 0 }
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
        { center: leftCenter, target: leftTarget, radius: lateralRadius, intensity: 0.8, mode: 0 },
        { center: rightCenter, target: rightTarget, radius: lateralRadius, intensity: 0.8, mode: 0 }
      );
    }

    return {
      aspect,
      unitUp: { x: unitUpX, y: unitUpY },
      tiltAngleDeg,
      center,
      target,
      radius,
      maxShift,
      shiftDistance,
      warpPoints
    };
  }

  // Calculate forward displacement vector at a given normalized coordinate
  getDisplacementVectorAt(pt: { x: number; y: number }, warpPoints: WarpPoint[], aspect: number) {
    let shiftX = 0;
    let shiftY = 0;
    const tcAdjX = pt.x * aspect;
    const tcAdjY = pt.y;

    for (const wp of warpPoints) {
      const cAdjX = wp.center.x * aspect;
      const cAdjY = wp.center.y;
      const dist = Math.hypot(tcAdjX - cAdjX, tcAdjY - cAdjY);
      if (dist < wp.radius) {
        const t = 1.0 - (dist / wp.radius);
        const smoothFactor = t * t * (3.0 - 2.0 * t);
        const factor = smoothFactor * wp.intensity;
        shiftX += (wp.target.x - wp.center.x) * factor;
        shiftY += (wp.target.y - wp.center.y) * factor;
      }
    }
    const magnitude = Math.hypot(shiftX * aspect, shiftY);
    const angleDeg = (Math.atan2(shiftX, -shiftY) * 180) / Math.PI;
    return { shiftX, shiftY, magnitude, angleDeg };
  }

  // Effect 6: Double Chin Reduction (Giảm nọng cằm - B019)
  applyDoubleChinReduction(landmarks: NormalizedLandmark[], intensity: number) {
    const params = this.getChinSlimWarpPoints(landmarks, intensity);
    if (!params || !this.webGLWarp) return;

    const ctx = this.workCanvas.getContext('2d')!;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, params.warpPoints);
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // Effect 7: Basic Adjustments (Độ sáng, Tương phản, Độ bão hòa, Nhiệt độ màu, Tint - X018, X019, X020)
  applyBasicAdjustments(brightness = 0, contrast = 0, saturation = 0, temperature = 0, tint = 0) {
    if (brightness === 0 && contrast === 0 && saturation === 0 && temperature === 0 && tint === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d')!;

    const b = 100 + brightness;
    const c = 100 + contrast;
    const s = 100 + saturation;
    tCtx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    tCtx.drawImage(this.workCanvas, 0, 0);
    tCtx.filter = 'none';

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(tempCanvas, 0, 0);

    // Apply color temperature overlay (warm amber or cool cyan)
    if (temperature !== 0) {
      ctx.save();
      if (temperature > 0) {
        ctx.fillStyle = 'rgba(255, 170, 0, 1)';
        ctx.globalAlpha = (temperature / 100.0) * 0.15;
      } else {
        ctx.fillStyle = 'rgba(0, 140, 255, 1)';
        ctx.globalAlpha = (Math.abs(temperature) / 100.0) * 0.15;
      }
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Apply color tint overlay (magenta pink or spring green)
    if (tint !== 0) {
      ctx.save();
      if (tint > 0) {
        ctx.fillStyle = 'rgba(255, 20, 147, 1)';
        ctx.globalAlpha = (tint / 100.0) * 0.15;
      } else {
        ctx.fillStyle = 'rgba(0, 230, 118, 1)';
        ctx.globalAlpha = (Math.abs(tint) / 100.0) * 0.15;
      }
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // Effect 8: Curated Color Filter Presets (X024) with complete recipe execution
  applyFilter(filterId: string, intensity = 100) {
    if (!filterId || intensity === 0) return;
    const filter = COLOR_FILTERS.find(f => f.id === filterId);
    if (!filter) return;

    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    const factor = intensity / 100.0;
    const s = filter.settings;

    const filterCanvas = document.createElement('canvas');
    filterCanvas.width = w;
    filterCanvas.height = h;
    const fCtx = filterCanvas.getContext('2d')!;

    const b = 100 + s.brightness * factor;
    const c = 100 + s.contrast * factor;
    const sat = 100 + s.saturation * factor;
    const sep = s.sepia ? s.sepia * factor : 0;

    let filterStr = `brightness(${b}%) contrast(${c}%) saturate(${sat}%)`;
    if (sep > 0) filterStr += ` sepia(${sep}%)`;

    fCtx.filter = filterStr;
    fCtx.drawImage(this.workCanvas, 0, 0);
    fCtx.filter = 'none';

    // Temperature execution (warm amber or cool cyan)
    if (s.temperature && s.temperature !== 0) {
      fCtx.save();
      if (s.temperature > 0) {
        fCtx.fillStyle = 'rgba(255, 170, 0, 1)';
        fCtx.globalAlpha = (s.temperature / 100.0) * 0.18 * factor;
      } else {
        fCtx.fillStyle = 'rgba(0, 140, 255, 1)';
        fCtx.globalAlpha = (Math.abs(s.temperature) / 100.0) * 0.18 * factor;
      }
      fCtx.globalCompositeOperation = 'soft-light';
      fCtx.fillRect(0, 0, w, h);
      fCtx.restore();
    }

    // Tint execution (magenta or spring green)
    if (s.tint && s.tint !== 0) {
      fCtx.save();
      if (s.tint > 0) {
        fCtx.fillStyle = 'rgba(255, 20, 147, 1)';
        fCtx.globalAlpha = (s.tint / 100.0) * 0.16 * factor;
      } else {
        fCtx.fillStyle = 'rgba(0, 230, 118, 1)';
        fCtx.globalAlpha = (Math.abs(s.tint) / 100.0) * 0.16 * factor;
      }
      fCtx.globalCompositeOperation = 'soft-light';
      fCtx.fillRect(0, 0, w, h);
      fCtx.restore();
    }

    // Channel balance
    if (s.rTone || s.gTone || s.bTone) {
      fCtx.save();
      const r = Math.round(128 + (s.rTone || 0) * 2 * factor);
      const g = Math.round(128 + (s.gTone || 0) * 2 * factor);
      const bl = Math.round(128 + (s.bTone || 0) * 2 * factor);
      fCtx.fillStyle = `rgb(${r}, ${g}, ${bl})`;
      fCtx.globalAlpha = 0.15 * factor;
      fCtx.globalCompositeOperation = 'color';
      fCtx.fillRect(0, 0, w, h);
      fCtx.restore();
    }

    // Vignette
    if (s.vignette && s.vignette > 0) {
      fCtx.save();
      const grad = fCtx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${(s.vignette / 100) * 0.6 * factor})`);
      fCtx.fillStyle = grad;
      fCtx.fillRect(0, 0, w, h);
      fCtx.restore();
    }

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(filterCanvas, 0, 0);
  }

  // Effect 9: Brush Spot Blemish Healing (B002)
  applyBlemishHealing(centerNorm: { x: number; y: number }, radiusPx: number) {
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const cx = Math.round(centerNorm.x * w);
    const cy = Math.round(centerNorm.y * h);

    const r = Math.max(4, Math.round(radiusPx));
    const x0 = Math.max(0, cx - r);
    const y0 = Math.max(0, cy - r);
    const x1 = Math.min(w, cx + r);
    const y1 = Math.min(h, cy + r);
    const pw = x1 - x0;
    const ph = y1 - y0;
    if (pw <= 0 || ph <= 0) return;

    const imgData = ctx.getImageData(x0, y0, pw, ph);
    const data = imgData.data;

    // Collect surrounding ring samples (from r*0.7 to r)
    let sumR = 0, sumG = 0, sumB = 0, ringCount = 0;
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const dist = Math.hypot((x0 + x) - cx, (y0 + y) - cy);
        if (dist >= r * 0.65 && dist <= r) {
          const idx = (y * pw + x) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          ringCount++;
        }
      }
    }

    if (ringCount === 0) return;
    const avgR = sumR / ringCount;
    const avgG = sumG / ringCount;
    const avgB = sumB / ringCount;

    // Radial blend inward
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const dist = Math.hypot((x0 + x) - cx, (y0 + y) - cy);
        if (dist < r) {
          const t = Math.cos((dist / r) * (Math.PI / 2)); // 1.0 at center, 0.0 at radius
          const weight = Math.min(1.0, Math.max(0.0, t * 0.85));
          const idx = (y * pw + x) * 4;
          data[idx] = Math.round(data[idx] * (1 - weight) + avgR * weight);
          data[idx + 1] = Math.round(data[idx + 1] * (1 - weight) + avgG * weight);
          data[idx + 2] = Math.round(data[idx + 2] * (1 - weight) + avgB * weight);
        }
      }
    }

    ctx.putImageData(imgData, x0, y0);
  }

  // Effect 10: Body Slim / Waist Reshape (B070)
  applyBodySlim(intensity: number, centerYNorm = 0.65) {
    if (intensity === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const factor = (intensity / 100.0) * 0.04; // Max 4% inward warp

    const warpPoints: WarpPoint[] = [
      // Left waist contracting rightward
      {
        center: { x: 0.32, y: centerYNorm },
        target: { x: 0.32 + factor, y: centerYNorm },
        radius: 0.22,
        intensity: 1.0,
        mode: 0.0
      },
      // Right waist contracting leftward
      {
        center: { x: 0.68, y: centerYNorm },
        target: { x: 0.68 - factor, y: centerYNorm },
        radius: 0.22,
        intensity: 1.0,
        mode: 0.0
      }
    ];

    const ctx = this.workCanvas.getContext('2d')!;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, warpPoints);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // Effect 11: Crop to Preset Aspect Ratio (B090)
  cropToAspectRatio(aspectRatio: '1:1' | '4:5' | '3:4' | '9:16') {
    let targetRatio = 1.0;
    switch (aspectRatio) {
      case '1:1': targetRatio = 1.0; break;
      case '4:5': targetRatio = 4 / 5; break;
      case '3:4': targetRatio = 3 / 4; break;
      case '9:16': targetRatio = 9 / 16; break;
    }

    const currentW = this.workCanvas.width;
    const currentH = this.workCanvas.height;
    const currentRatio = currentW / currentH;

    let cropW = currentW;
    let cropH = currentH;

    if (currentRatio > targetRatio) {
      // Current image is wider than target ratio
      cropW = Math.round(currentH * targetRatio);
    } else {
      // Current image is taller than target ratio
      cropH = Math.round(currentW / targetRatio);
    }

    const offsetX = Math.round((currentW - cropW) / 2);
    const offsetY = Math.round((currentH - cropH) / 2);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const cCtx = croppedCanvas.getContext('2d')!;
    cCtx.drawImage(this.workCanvas, offsetX, offsetY, cropW, cropH, 0, 0, cropW, cropH);

    this.workCanvas.width = cropW;
    this.workCanvas.height = cropH;
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.drawImage(croppedCanvas, 0, 0);
  }

  // Unified Pipeline Executor for Preview and Export
  applyPipeline(params: PipelineParams, landmarks?: NormalizedLandmark[]) {
    this.reset();
    
    // Stage 1: Skin Enhancements
    if (params.skin_smooth > 0 && landmarks) {
      this.applySkinSmoothing(landmarks, params.skin_smooth);
    }
    if (params.skin_brighten && params.skin_brighten > 0 && landmarks) {
      this.applySkinBrightening(landmarks, params.skin_brighten);
    }

    // Stage 2: Geometric Feature Shaping
    if (params.face_slim > 0 && landmarks) {
      this.applyFaceSlimming(landmarks, params.face_slim);
    }
    if (params.chin_slim > 0 && landmarks) {
      this.applyDoubleChinReduction(landmarks, params.chin_slim);
    }
    if (params.eye_enlarge && params.eye_enlarge > 0 && landmarks) {
      this.applyEyeEnlargement(landmarks, params.eye_enlarge);
    }

    // Stage 3: Facial Details
    if (params.teeth_whiten && params.teeth_whiten > 0 && landmarks) {
      this.applyTeethWhitening(landmarks, params.teeth_whiten);
    }
    if (params.hair_smooth > 0) {
      this.applyHairSmoothing(params.hair_smooth);
    }

    // Stage 4: Global Tone & Color Filters
    if (params.brightness || params.contrast || params.saturation || params.temperature || params.tint) {
      this.applyBasicAdjustments(
        params.brightness || 0,
        params.contrast || 0,
        params.saturation || 0,
        params.temperature || 0,
        params.tint || 0
      );
    }
    if (params.filter_id) {
      this.applyFilter(params.filter_id, params.filter_intensity ?? 100);
    }
  }

  public dispose() {
    if (this.webGLWarp) {
      this.webGLWarp.dispose();
      this.webGLWarp = null;
    }
    this.originalCanvas.width = 0;
    this.originalCanvas.height = 0;
    this.workCanvas.width = 0;
    this.workCanvas.height = 0;
  }
}
