import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { WebGLWarpEngine, type WarpPoint } from './WebGLWarpEngine';
import type { SegmentationResult } from './SegmenterManager';
import type { CropOperation, HealingOperation } from '../types';
import { COLOR_FILTERS } from '../presets/filters';

export interface PipelineParams {
  // Skin
  skin_smooth: number;        // B001
  skin_brighten?: number;     // B009 shadow lift
  skin_oil?: number;          // B006 oil/specular reduction
  skin_tone?: number;         // B008 HSL tone shift
  nasolabial?: number;        // B005 nasolabial folds lift
  dark_circles?: number;      // B011 dark circle reduction
  skin_detail?: number;       // B010 high-pass grain overlay
  eye_bags?: number;          // B012 eye bag reduction
  // Face geometry
  face_slim: number;          // B013
  chin_slim: number;          // B019
  jaw_slim?: number;          // B016 jaw contour
  chin_vline?: number;        // B017 chin V-line
  face_width?: number;        // B014 face width (-100..100)
  jaw_angle?: number;         // B015 jaw angle (0..100)
  chin_length?: number;       // B018 chin length (-100..100)
  cheekbone_width?: number;   // B020 cheekbone width (0..100)
  eye_enlarge?: number;       // B025
  eye_height?: number;        // B026 eye height (0..100)
  eye_length?: number;        // B027 eye length (0..100)
  eye_color?: string;         // B029 eye color hex
  eye_color_intensity?: number; // B029 eye color intensity (0..100)
  eyelid_lift?: number;       // B032 eyelid lift (0..100)
  double_eyelid?: number;     // B033 double eyelid crease (0..100)
  eye_bright?: number;        // B028 sclera brightening
  eye_catchlight?: number;    // B034 catchlight
  teeth_whiten?: number;      // B043
  hair_smooth: number;        // B063
  hair_shine?: number;        // B064
  collarbone?: number;        // X006
  body_slim?: number;         // B075
  // Extended local capable features
  skin_blemish_reduction?: number; // B003
  wrinkle_reduction?: number;      // B004
  skin_evening?: number;           // B007
  midface_ratio?: number;          // B021
  lower_face_ratio?: number;       // B022
  forehead_height?: number;        // B023
  head_scale?: number;             // B024
  gaze_direction?: number;         // B030
  nose_size?: number;              // B035
  nose_tip?: number;               // B038
  lip_position?: number;           // B040
  lip_tilt?: number;               // B041
  eyebrow_height?: number;         // B045
  eyebrow_spacing?: number;        // B047
  eyebrow_tilt?: number;           // B048
  eyebrow_arch?: number;           // B049
  eyebrow_color?: string;          // B050
  eyebrow_color_intensity?: number;// B050
  lip_finish?: 'matte' | 'gloss';  // B052
  lip_finish_intensity?: number;   // B052
  lip_liner?: number;              // B053
  eyeshadow_color?: string;        // B056
  eyeshadow_intensity?: number;    // B056
  eyeliner?: number;               // B057
  false_lashes?: number;           // B058
  makeup_preset?: string;          // B061
  makeup_preset_intensity?: number;// B061
  hair_flyaway?: number;           // B065
  hair_highlight?: string;         // B067
  hair_highlight_intensity?: number;// B067
  hairline_adjust?: number;        // B068
  crown_volume?: number;           // B069
  hair_fill?: number;              // B071
  bangs_preview?: number;          // B072
  arm_slim?: number;               // B076
  leg_slim?: number;               // B077
  height_stretch?: number;         // B079
  hip_shape?: number;              // B080
  tummy_tuck?: number;             // B081
  forehead_width?: number;         // X001
  eye_spacing?: number;            // X002
  chest_volume?: number;           // X004
  buttock_volume?: number;         // X005
  magic_sky?: string;              // X014
  magic_sky_intensity?: number;    // X014
  lens_film_effects?: number;      // X023
  // Global adjustments
  brightness?: number;        // X022
  contrast?: number;          // X022
  saturation?: number;        // X022
  temperature?: number;       // X022
  tint?: number;              // X022
  filter_id?: string;         // X024
  filter_intensity?: number;  // X024
  crop?: CropOperation;       // X020
  healings?: HealingOperation[]; // B002
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
  private currentCropNorm = { x: 0, y: 0, w: 1, h: 1 };

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
    this.currentCropNorm = { x: 0, y: 0, w: 1, h: 1 };
    this.workCanvas.width = this.originalCanvas.width;
    this.workCanvas.height = this.originalCanvas.height;
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

    // Scale and clip to cropped region
    const sx = Math.max(0, Math.round(this.currentCropNorm.x * sW));
    const sy = Math.max(0, Math.round(this.currentCropNorm.y * sH));
    const sw = Math.min(sW - sx, Math.max(1, Math.round(this.currentCropNorm.w * sW)));
    const sh = Math.min(sH - sy, Math.max(1, Math.round(this.currentCropNorm.h * sH)));

    targetCtx.drawImage(smallCanvas, sx, sy, sw, sh, 0, 0, targetW, targetH);
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

  // Effect 1c: Nasolabial Folds Reduction (Giảm rãnh cười - B005)
  applyNasolabialReduction(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    // Nasolabial zone: pts between nose wings and lip corners
    const zones = [
      [92, 165, 167, 164, 393, 391],   // right nasolabial fold
      [322, 391, 394, 395, 165, 92]    // left nasolabial fold
    ];

    zones.forEach(pts => {
      const brightCanvas = document.createElement('canvas');
      brightCanvas.width = w;
      brightCanvas.height = h;
      const bCtx = brightCanvas.getContext('2d')!;
      const brightnessVal = 100 + (intensity * 0.32);
      bCtx.filter = `brightness(${brightnessVal}%) contrast(${100 - intensity * 0.12}%)`;
      bCtx.drawImage(this.workCanvas, 0, 0);
      bCtx.filter = 'none';

      const mCanvas = document.createElement('canvas');
      mCanvas.width = w;
      mCanvas.height = h;
      const mCtx = mCanvas.getContext('2d')!;
      mCtx.clearRect(0, 0, w, h);
      mCtx.beginPath();
      pts.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
        else mCtx.lineTo(pt.x * w, pt.y * h);
      });
      mCtx.closePath();
      mCtx.fillStyle = 'white';
      mCtx.filter = `blur(${12 * scale}px)`;
      mCtx.fill();
      mCtx.filter = 'none';

      bCtx.globalCompositeOperation = 'destination-in';
      bCtx.drawImage(mCanvas, 0, 0);

      ctx.save();
      ctx.globalAlpha = (intensity / 100.0) * 0.88;
      ctx.drawImage(brightCanvas, 0, 0);
      ctx.restore();
    });
  }

  // Effect 1d: Oil/Specular Reduction (Khử bóng dầu - B006)
  applyOilReduction(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0) return;
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    // Build a quick skin polygon from face oval to identify region
    const faceOval = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
    const roiCanvas = document.createElement('canvas');
    roiCanvas.width = w;
    roiCanvas.height = h;
    const rCtx = roiCanvas.getContext('2d')!;
    if (landmarks && landmarks.length > 0) {
      rCtx.beginPath();
      faceOval.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) rCtx.moveTo(pt.x * w, pt.y * h);
        else rCtx.lineTo(pt.x * w, pt.y * h);
      });
      rCtx.closePath();
      rCtx.fillStyle = 'white';
      rCtx.fill();
    } else {
      rCtx.fillStyle = 'white';
      rCtx.fillRect(0, 0, w, h);
    }
    const roiMask = rCtx.getImageData(0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const factor = intensity / 100.0;
    const threshold = 180 - (intensity * 0.45); // calibrated threshold to catch real face specular shine

    for (let i = 0; i < data.length; i += 4) {
      if (roiMask.data[i + 3] < 64) continue;
      const r = data[i], g = data[i+1], b = data[i+2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > threshold) {
        const excess = lum - threshold;
        const reduction = excess * factor * 0.75;
        data[i]   = Math.max(0, Math.min(255, r - Math.round(reduction * (r / lum))));
        data[i+1] = Math.max(0, Math.min(255, g - Math.round(reduction * (g / lum))));
        data[i+2] = Math.max(0, Math.min(255, b - Math.round(reduction * (b / lum))));
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Effect 1e: Skin Tone Adjust (Điều chỉnh tông da - B008)
  applySkinToneAdjust(landmarks: NormalizedLandmark[], toneShift: number) {
    if (toneShift === 0) return;
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    // Mask: face oval only
    const faceOval = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
    const mCanvas = document.createElement('canvas');
    mCanvas.width = w; mCanvas.height = h;
    const mCtx = mCanvas.getContext('2d')!;
    mCtx.clearRect(0, 0, w, h);
    if (landmarks && landmarks.length > 0) {
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
    }
    const maskData = mCtx.getImageData(0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    // toneShift: -50 (warm tan) to +50 (cool pink-white)
    const hShift = toneShift > 0 ? -8 * (toneShift / 50) : 6 * (Math.abs(toneShift) / 50); // cool = pink, warm = amber
    const sShift = toneShift > 0 ? -0.05 * (toneShift / 50) : 0.04 * (Math.abs(toneShift) / 50);
    const lShift = toneShift > 0 ? 0.04 * (toneShift / 50) : -0.02 * (Math.abs(toneShift) / 50);

    for (let i = 0; i < data.length; i += 4) {
      if (maskData.data[i + 3] < 64) continue;
      const alpha = maskData.data[i + 3] / 255;
      const [h2, s, l] = rgbToHsl(data[i], data[i+1], data[i+2]);
      const [nr, ng, nb] = hslToRgb(h2 + hShift, Math.max(0, Math.min(1, s + sShift)), Math.max(0, Math.min(1, l + lShift)));
      data[i]   = Math.round(data[i] * (1 - alpha) + nr * alpha);
      data[i+1] = Math.round(data[i+1] * (1 - alpha) + ng * alpha);
      data[i+2] = Math.round(data[i+2] * (1 - alpha) + nb * alpha);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Effect 1f: High-Frequency Skin Detail Restoration (Chi tiết da - B010)
  applySkinDetail(_landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0) return;
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    // Manual 3×3 box blur to compute low-frequency component.
    // canvas.filter:blur() is unreliable at sub-pixel radii in headless/offscreen contexts.
    const origData = ctx.getImageData(0, 0, w, h);
    const blurred  = new Uint8ClampedArray(origData.data.length);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0, count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                sum += origData.data[(ny * w + nx) * 4 + c];
                count++;
              }
            }
          }
          blurred[(y * w + x) * 4 + c] = Math.round(sum / count);
        }
        blurred[(y * w + x) * 4 + 3] = origData.data[(y * w + x) * 4 + 3];
      }
    }

    const outData = ctx.createImageData(w, h);
    const factor  = (intensity / 100.0) * 0.65;

    for (let i = 0; i < origData.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const hp = origData.data[i+c] - blurred[i+c]; // signed high-pass
        outData.data[i+c] = Math.min(255, Math.max(0,
          Math.round(origData.data[i+c] + hp * factor)
        ));
      }
      outData.data[i+3] = origData.data[i+3];
    }
    ctx.putImageData(outData, 0, 0);
  }

  // Effect 1g: Dark Circle Reduction (Giảm quầng thâm - B011)
  applyDarkCircleReduction(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    // Under-eye ROI landmarks
    const zones = [
      [111, 117, 118, 119, 120, 121, 128, 245, 188, 174],  // left under-eye
      [340, 346, 347, 348, 349, 350, 357, 465, 412, 399]   // right under-eye
    ];

    zones.forEach(pts => {
      const brightCanvas = document.createElement('canvas');
      brightCanvas.width = w; brightCanvas.height = h;
      const bCtx = brightCanvas.getContext('2d')!;
      const lightenVal = 100 + (intensity * 0.38);
      bCtx.filter = `brightness(${lightenVal}%) saturate(${Math.max(50, 100 - intensity * 0.45)}%)`;
      bCtx.drawImage(this.workCanvas, 0, 0);
      bCtx.filter = 'none';

      const mCanvas = document.createElement('canvas');
      mCanvas.width = w; mCanvas.height = h;
      const mCtx = mCanvas.getContext('2d')!;
      mCtx.clearRect(0, 0, w, h);
      mCtx.beginPath();
      pts.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
        else mCtx.lineTo(pt.x * w, pt.y * h);
      });
      mCtx.closePath();
      mCtx.fillStyle = 'white';
      mCtx.filter = `blur(${10 * scale}px)`;
      mCtx.fill();
      mCtx.filter = 'none';

      bCtx.globalCompositeOperation = 'destination-in';
      bCtx.drawImage(mCanvas, 0, 0);

      ctx.save();
      ctx.globalAlpha = (intensity / 100.0) * 0.90;
      ctx.drawImage(brightCanvas, 0, 0);
      ctx.restore();
    });
  }

  // Effect 1h: Eye Bag Reduction (Giảm bọng mắt - B012)
  applyEyeBagReduction(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const aspect = w / h;
    const scale = Math.max(w, h) / 800;

    const leftInner = landmarks[133], leftOuter = landmarks[33], leftBottom = landmarks[145];
    const rightInner = landmarks[362], rightOuter = landmarks[263], rightBottom = landmarks[374];
    if (!leftInner || !leftOuter || !leftBottom || !rightInner || !rightOuter || !rightBottom) return;

    const leftEyeW = Math.hypot((leftOuter.x - leftInner.x) * aspect, leftOuter.y - leftInner.y);
    const rightEyeW = Math.hypot((rightOuter.x - rightInner.x) * aspect, rightOuter.y - rightInner.y);

    // 1. WebGL Upward Warp to lift and flatten the bulging pouch
    if (this.webGLWarp) {
      const warpIntensity = (intensity / 100.0) * 0.35;
      const leftBagCenter = {
        x: (leftInner.x + leftOuter.x) / 2,
        y: leftBottom.y + leftEyeW * 0.28
      };
      const leftBagTarget = {
        x: leftBagCenter.x,
        y: leftBagCenter.y - leftEyeW * 0.26 * warpIntensity
      };

      const rightBagCenter = {
        x: (rightInner.x + rightOuter.x) / 2,
        y: rightBottom.y + rightEyeW * 0.28
      };
      const rightBagTarget = {
        x: rightBagCenter.x,
        y: rightBagCenter.y - rightEyeW * 0.26 * warpIntensity
      };

      const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
        { center: leftBagCenter, target: leftBagTarget, radius: leftEyeW * 0.55, intensity: 0.9, mode: 0 },
        { center: rightBagCenter, target: rightBagTarget, radius: rightEyeW * 0.55, intensity: 0.9, mode: 0 }
      ]);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(glCanvas, 0, 0);
    }

    // 2. Soft-light crease lift along the infraorbital bag groove
    const bagGrooves = [
      [111, 117, 118, 119, 120, 121, 128], // left groove
      [340, 346, 347, 348, 349, 350, 357]  // right groove
    ];

    bagGrooves.forEach(pts => {
      const brightCanvas = document.createElement('canvas');
      brightCanvas.width = w; brightCanvas.height = h;
      const bCtx = brightCanvas.getContext('2d')!;
      const lightenVal = 100 + (intensity * 0.18);
      bCtx.filter = `brightness(${lightenVal}%) saturate(${100 - intensity * 0.2}%)`;
      bCtx.drawImage(this.workCanvas, 0, 0);
      bCtx.filter = 'none';

      const mCanvas = document.createElement('canvas');
      mCanvas.width = w; mCanvas.height = h;
      const mCtx = mCanvas.getContext('2d')!;
      mCtx.clearRect(0, 0, w, h);
      mCtx.beginPath();
      pts.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
        else mCtx.lineTo(pt.x * w, pt.y * h);
      });
      mCtx.lineWidth = 14 * scale;
      mCtx.lineCap = 'round';
      mCtx.lineJoin = 'round';
      mCtx.strokeStyle = 'white';
      mCtx.filter = `blur(${10 * scale}px)`;
      mCtx.stroke();
      mCtx.filter = 'none';

      bCtx.globalCompositeOperation = 'destination-in';
      bCtx.drawImage(mCanvas, 0, 0);

      ctx.save();
      ctx.globalAlpha = (intensity / 100.0) * 0.65;
      ctx.drawImage(brightCanvas, 0, 0);
      ctx.restore();
    });
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

  // Effect 2b: Hair Shine (Bóng tóc - B064)
  applyHairShine(intensity: number) {
    if (intensity === 0 || !this.segmentationMask) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    // Draw hair mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w; maskCanvas.height = h;
    const mCtx = maskCanvas.getContext('2d')!;
    this.drawScaledSegmentationMask(mCtx, w, h, 1); // 1 = hair

    // Shine strip: radial gradient on top portion of image
    const shineCanvas = document.createElement('canvas');
    shineCanvas.width = w; shineCanvas.height = h;
    const sCtx = shineCanvas.getContext('2d')!;
    const grad = sCtx.createLinearGradient(w * 0.25, h * 0.05, w * 0.75, h * 0.4);
    grad.addColorStop(0, `rgba(255,255,255,${(intensity / 100.0) * 0.38})`);
    grad.addColorStop(0.5, `rgba(255,255,255,${(intensity / 100.0) * 0.18})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, w, h);

    // Clip shine to hair mask
    const blurMask = document.createElement('canvas');
    blurMask.width = w; blurMask.height = h;
    const bmCtx = blurMask.getContext('2d')!;
    bmCtx.filter = `blur(${8 * scale}px)`;
    bmCtx.drawImage(maskCanvas, 0, 0);

    sCtx.globalCompositeOperation = 'destination-in';
    sCtx.drawImage(blurMask, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(shineCanvas, 0, 0);
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

  // Effect 3b: Face Width (Bề rộng khuôn mặt - B014) - WebGL Bilateral Warp
  applyFaceWidth(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const aspect = w / h;

    const leftTemple = landmarks[127];
    const rightTemple = landmarks[356];
    const nose = landmarks[1];
    if (!leftTemple || !rightTemple || !nose) return;

    const faceW = Math.abs((rightTemple.x - leftTemple.x) * aspect);
    const radius = faceW * 0.60;
    // intensity > 0 narrows, intensity < 0 widens
    const factor = (intensity / 100.0) * 0.038;

    const leftTarget = { x: leftTemple.x + factor, y: leftTemple.y };
    const rightTarget = { x: rightTemple.x - factor, y: rightTemple.y };

    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftTemple, target: leftTarget, radius, intensity: 0.9, mode: 0 },
      { center: rightTemple, target: rightTarget, radius, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // Effect 3c: Jaw Angle (Góc quai hàm - B015) - WebGL Bilateral Warp
  applyJawAngle(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const aspect = w / h;

    const leftAngle = landmarks[172];
    const rightAngle = landmarks[397];
    const chin = landmarks[152];
    if (!leftAngle || !rightAngle || !chin) return;

    const jawW = Math.abs((rightAngle.x - leftAngle.x) * aspect);
    const radius = jawW * 0.45;
    const mapped = (intensity / 100.0) * 0.040;

    const leftTarget = { x: leftAngle.x + mapped, y: leftAngle.y - mapped * 0.25 };
    const rightTarget = { x: rightAngle.x - mapped, y: rightAngle.y - mapped * 0.25 };

    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftAngle, target: leftTarget, radius, intensity: 0.9, mode: 0 },
      { center: rightAngle, target: rightTarget, radius, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // Effect 3d: Cheekbone Width (Hạ gò má - B020) - WebGL Pinch Warp
  applyCheekboneWidth(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const aspect = w / h;

    const leftCheekbone = landmarks[116];
    const rightCheekbone = landmarks[345];
    const nose = landmarks[1];
    if (!leftCheekbone || !rightCheekbone || !nose) return;

    const cheekW = Math.abs((rightCheekbone.x - leftCheekbone.x) * aspect);
    const radius = cheekW * 0.45;
    const mapped = (intensity / 100.0) * 0.035;

    const leftTarget = { x: leftCheekbone.x + mapped, y: leftCheekbone.y };
    const rightTarget = { x: rightCheekbone.x - mapped, y: rightCheekbone.y };

    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftCheekbone, target: leftTarget, radius, intensity: 0.9, mode: 0 },
      { center: rightCheekbone, target: rightTarget, radius, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0);
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

  // Effect 4b: Eye Height (Chiều cao mắt - B026) - WebGL Vertical Eye Stretch
  applyEyeHeight(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    const leftTop = landmarks[159], leftBottom = landmarks[145];
    const rightTop = landmarks[386], rightBottom = landmarks[374];
    if (!leftTop || !leftBottom || !rightTop || !rightBottom) return;

    const leftH = Math.abs(leftBottom.y - leftTop.y);
    const rightH = Math.abs(rightBottom.y - rightTop.y);
    const shiftLeft = (intensity / 100.0) * Math.max(leftH * 0.45, 0.015);
    const shiftRight = (intensity / 100.0) * Math.max(rightH * 0.45, 0.015);

    const radiusLeft = Math.max(leftH * 1.8, 0.045);
    const radiusRight = Math.max(rightH * 1.8, 0.045);

    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftTop, target: { x: leftTop.x, y: leftTop.y - shiftLeft }, radius: radiusLeft, intensity: 0.85, mode: 0 },
      { center: leftBottom, target: { x: leftBottom.x, y: leftBottom.y + shiftLeft }, radius: radiusLeft, intensity: 0.85, mode: 0 },
      { center: rightTop, target: { x: rightTop.x, y: rightTop.y - shiftRight }, radius: radiusRight, intensity: 0.85, mode: 0 },
      { center: rightBottom, target: { x: rightBottom.x, y: rightBottom.y + shiftRight }, radius: radiusRight, intensity: 0.85, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // Effect 4c: Eye Length (Chiều dài mắt - B027) - WebGL Lateral Eye Warp
  applyEyeLength(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const aspect = w / h;

    const leftOuter = landmarks[33], leftInner = landmarks[133];
    const rightOuter = landmarks[263], rightInner = landmarks[362];
    if (!leftOuter || !leftInner || !rightOuter || !rightInner) return;

    const leftEyeW = Math.hypot((leftOuter.x - leftInner.x) * aspect, leftOuter.y - leftInner.y);
    const rightEyeW = Math.hypot((rightOuter.x - rightInner.x) * aspect, rightOuter.y - rightInner.y);
    const shift = (intensity / 100.0) * 0.65;

    const leftTarget = {
      x: leftOuter.x + (leftOuter.x - leftInner.x) * shift,
      y: leftOuter.y + (leftOuter.y - leftInner.y) * shift * 0.2
    };
    const rightTarget = {
      x: rightOuter.x + (rightOuter.x - rightInner.x) * shift,
      y: rightOuter.y + (rightOuter.y - rightInner.y) * shift * 0.2
    };

    const radiusLeft = Math.max(leftEyeW * 0.95, 0.10);
    const radiusRight = Math.max(rightEyeW * 0.95, 0.10);

    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftOuter, target: leftTarget, radius: radiusLeft, intensity: 1.0, mode: 0 },
      { center: rightOuter, target: rightTarget, radius: radiusRight, intensity: 1.0, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // Effect 4d: Eyelid Lift (Nâng mí sụp - B032) - WebGL Upward Warp
  applyEyelidLift(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const aspect = w / h;

    const leftTop = landmarks[159], leftInner = landmarks[133], leftOuter = landmarks[33];
    const rightTop = landmarks[386], rightInner = landmarks[362], rightOuter = landmarks[263];
    if (!leftTop || !rightTop || !leftInner || !leftOuter || !rightInner || !rightOuter) return;

    const leftEyeW = Math.hypot((leftOuter.x - leftInner.x) * aspect, leftOuter.y - leftInner.y);
    const rightEyeW = Math.hypot((rightOuter.x - rightInner.x) * aspect, rightOuter.y - rightInner.y);
    const liftDist = (intensity / 100.0) * Math.max(leftEyeW * 0.40, 0.05);

    const leftTarget = { x: leftTop.x, y: leftTop.y - liftDist };
    const rightTarget = { x: rightTop.x, y: rightTop.y - liftDist };

    const radiusLeft = Math.max(leftEyeW * 0.95, 0.10);
    const radiusRight = Math.max(rightEyeW * 0.95, 0.10);

    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftTop, target: leftTarget, radius: radiusLeft, intensity: 1.0, mode: 0 },
      { center: rightTop, target: rightTarget, radius: radiusRight, intensity: 1.0, mode: 0 }
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

    const desatFactor = (intensity / 100.0) * 0.85;
    const lightFactor = (intensity / 100.0) * 0.38;

    for (let i = 0; i < data.length; i += 4) {
      if (maskData.data[i + 3] > 30) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const [hue, sat, lum] = rgbToHsl(r, g, b);

        // Target yellow / warm tones common in teeth discoloration
        if (hue >= 15 && hue <= 85 && lum >= 0.18) {
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

    const radius = chinToLip * 1.05;
    const maxShift = Math.min(faceHeight * 0.06, chinToLip * 0.38);
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

  // Effect 5b: Jaw Contour (Định hình đường hàm - B016)
  applyJawContour(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const aspect = w / h;

    const leftJaw = landmarks[148];
    const rightJaw = landmarks[377];
    const chin = landmarks[152];
    const nose = landmarks[1];
    if (!leftJaw || !rightJaw || !chin || !nose) return;

    const faceW = Math.abs((rightJaw.x - leftJaw.x) * aspect);
    const radius = faceW * 0.55;
    // Calibrated for natural visible jawline shaping without background warping
    const mappedIntensity = (intensity / 100.0) * 0.32;

    const centerX = (leftJaw.x + rightJaw.x) / 2;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftJaw, target: { x: leftJaw.x + (centerX - leftJaw.x) * mappedIntensity * 2.8, y: leftJaw.y - (chin.y - leftJaw.y) * mappedIntensity * 0.35 }, radius, intensity: 0.95, mode: 0 },
      { center: rightJaw, target: { x: rightJaw.x + (centerX - rightJaw.x) * mappedIntensity * 2.8, y: rightJaw.y - (chin.y - rightJaw.y) * mappedIntensity * 0.35 }, radius, intensity: 0.95, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // Effect 5c: Chin V-Line (Cằm V-Line - B017)
  applyChinVLine(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const aspect = w / h;

    const chin = landmarks[152];
    const leftChinSide = landmarks[176];
    const rightChinSide = landmarks[400];
    const lowerLip = landmarks[17];
    if (!chin || !leftChinSide || !rightChinSide || !lowerLip) return;

    const faceW = Math.abs((rightChinSide.x - leftChinSide.x) * aspect);
    const radius = faceW * 0.5;
    // Increased to 0.40 with multiplier 2.5 for measurable pixel displacement
    const mappedIntensity = (intensity / 100.0) * 0.40;

    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftChinSide, target: { x: leftChinSide.x + (chin.x - leftChinSide.x) * mappedIntensity * 2.5, y: leftChinSide.y }, radius, intensity: 0.85, mode: 0 },
      { center: rightChinSide, target: { x: rightChinSide.x + (chin.x - rightChinSide.x) * mappedIntensity * 2.5, y: rightChinSide.y }, radius, intensity: 0.85, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // Effect 5d: Chin Length (Chiều dài cằm - B018) - WebGL Directional Warp
  applyChinLength(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const aspect = w / h;

    const chin = landmarks[152];
    const lowerLip = landmarks[17];
    if (!chin || !lowerLip) return;

    const dx = chin.x - lowerLip.x;
    const dy = chin.y - lowerLip.y;
    const len = Math.hypot(dx * aspect, dy);
    if (len < 0.0001) return;

    const ux = (dx * aspect) / len;
    const uy = dy / len;
    // intensity > 0 elongates chin downward, intensity < 0 shortens chin upward
    const shiftDist = (intensity / 100.0) * Math.max(len * 0.75, 0.08);
    const target = {
      x: chin.x + (ux / aspect) * shiftDist,
      y: chin.y + uy * shiftDist
    };
    const radius = Math.max(len * 1.5, 0.22);

    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: chin, target, radius, intensity: 1.0, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(glCanvas, 0, 0);
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

  // Effect 9b: Sclera / Eye Brightening (Sáng mắt - B028)
  applyEyeBrightening(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const eyeZones = [
      [33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173],   // left eye
      [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]  // right eye
    ];

    eyeZones.forEach(pts => {
      const brightCanvas = document.createElement('canvas');
      brightCanvas.width = w; brightCanvas.height = h;
      const bCtx = brightCanvas.getContext('2d')!;
      bCtx.filter = `brightness(${100 + intensity * 0.28}%) saturate(${100 - intensity * 0.2}%)`;
      bCtx.drawImage(this.workCanvas, 0, 0);
      bCtx.filter = 'none';

      const mCanvas = document.createElement('canvas');
      mCanvas.width = w; mCanvas.height = h;
      const mCtx = mCanvas.getContext('2d')!;
      mCtx.clearRect(0, 0, w, h);
      mCtx.beginPath();
      pts.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
        else mCtx.lineTo(pt.x * w, pt.y * h);
      });
      mCtx.closePath();
      mCtx.fillStyle = 'white';
      mCtx.filter = `blur(${6 * scale}px)`;
      mCtx.fill();
      mCtx.filter = 'none';

      bCtx.globalCompositeOperation = 'destination-in';
      bCtx.drawImage(mCanvas, 0, 0);

      ctx.save();
      ctx.globalAlpha = (intensity / 100.0) * 0.85;
      ctx.drawImage(brightCanvas, 0, 0);
      ctx.restore();
    });
  }

  // Effect 9c: Eye Catchlight (Điểm sáng mắt - B034)
  applyEyeCatchlight(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    // Iris center landmarks: 468 (left iris center) and 473 (right iris center)
    const irisCenters = [468, 473];
    const eyeWidthRef = [
      { inner: 133, outer: 33 },  // left eye
      { inner: 362, outer: 263 }  // right eye
    ];

    irisCenters.forEach((irisIdx, zi) => {
      const iris = landmarks[irisIdx];
      if (!iris) return;
      const eyeRef = eyeWidthRef[zi];
      const inner = landmarks[eyeRef.inner];
      const outer = landmarks[eyeRef.outer];
      if (!inner || !outer) return;

      const eyeW = Math.hypot((outer.x - inner.x) * w, (outer.y - inner.y) * h);
      // Increased from 0.1 → 0.22 to produce a larger, more visible catchlight dot
      const dotR = Math.max(4, eyeW * 0.22);
      const offsetX = -dotR * 0.8;
      const offsetY = -dotR * 0.8;

      const cx = iris.x * w + offsetX;
      const cy = iris.y * h + offsetY;

      ctx.save();
      // Increased alpha from 0.9 → full opacity for centre to ensure visible delta
      ctx.globalAlpha = (intensity / 100.0);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.75)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // Effect 9e: Eye Color / Contact Lens (Màu mắt / Lens - B029)
  applyEyeColor(landmarks: NormalizedLandmark[], colorHex: string, intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    const leftIris = landmarks[468], rightIris = landmarks[473];
    const leftInner = landmarks[133], leftOuter = landmarks[33];
    const rightInner = landmarks[362], rightOuter = landmarks[263];
    if (!leftIris || !rightIris || !leftInner || !leftOuter || !rightInner || !rightOuter) return;

    const leftEyeW = Math.hypot((leftOuter.x - leftInner.x) * w, (leftOuter.y - leftInner.y) * h);
    const rightEyeW = Math.hypot((rightOuter.x - rightInner.x) * w, (rightOuter.y - rightInner.y) * h);

    // Parse colorHex to RGB
    let hex = (colorHex || '#3d6b8c').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const cr = parseInt(hex.substring(0, 2), 16) || 61;
    const cg = parseInt(hex.substring(2, 4), 16) || 107;
    const cb = parseInt(hex.substring(4, 6), 16) || 140;

    const eyes = [
      { center: leftIris, eyeW: leftEyeW },
      { center: rightIris, eyeW: rightEyeW }
    ];

    eyes.forEach(eye => {
      const cx = eye.center.x * w;
      const cy = eye.center.y * h;
      const irisR = eye.eyeW * 0.22;
      const pupilR = irisR * 0.36;

      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = w; overlayCanvas.height = h;
      const oCtx = overlayCanvas.getContext('2d')!;

      // Create radial gradient for iris annulus: pupil is preserved (alpha 0),
      // annulus colored, outer edge feathered to 0 (no spill into sclera/skin)
      const grad = oCtx.createRadialGradient(cx, cy, pupilR * 0.7, cx, cy, irisR);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
      grad.addColorStop(0.35, `rgba(${cr},${cg},${cb},0)`); // preserve pupil center
      grad.addColorStop(0.48, `rgba(${cr},${cg},${cb},${(intensity / 100.0) * 0.75})`);
      grad.addColorStop(0.85, `rgba(${cr},${cg},${cb},${(intensity / 100.0) * 0.70})`);
      grad.addColorStop(1.0, `rgba(${cr},${cg},${cb},0)`); // zero spill at border

      oCtx.fillStyle = grad;
      oCtx.beginPath();
      oCtx.arc(cx, cy, irisR, 0, Math.PI * 2);
      oCtx.fill();

      // Blend onto work canvas using soft-light to preserve natural iris texture & striations
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.drawImage(overlayCanvas, 0, 0);
      ctx.restore();
    });
  }

  // Effect 9f: Double Eyelid Crease (Mắt 2 mí - B033)
  applyDoubleEyelid(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const eyeContourLeft = [33, 160, 159, 158, 133];
    const eyeContourRight = [263, 387, 386, 385, 362];

    const pairs = [
      { contour: eyeContourLeft, topIdx: 159, innerIdx: 133, outerIdx: 33 },
      { contour: eyeContourRight, topIdx: 386, innerIdx: 362, outerIdx: 263 }
    ];

    pairs.forEach(pair => {
      const topPt = landmarks[pair.topIdx];
      const innerPt = landmarks[pair.innerIdx];
      const outerPt = landmarks[pair.outerIdx];
      if (!topPt || !innerPt || !outerPt) return;

      const eyeH = Math.hypot((outerPt.x - innerPt.x) * w, (outerPt.y - innerPt.y) * h) * 0.28;
      const creaseHeight = Math.max(6 * scale, eyeH * 0.38);

      const pts = pair.contour.map((idx, i) => {
        const lm = landmarks[idx];
        if (!lm) return null;
        const t = i / (pair.contour.length - 1);
        const arch = 4 * t * (1 - t);
        return {
          x: lm.x * w,
          y: (lm.y * h) - (creaseHeight * arch)
        };
      }).filter(Boolean) as { x: number; y: number }[];

      if (pts.length < 3) return;

      // 1. Soft shadow crease line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);

      ctx.strokeStyle = `rgba(45, 25, 18, ${(intensity / 100.0) * 0.50})`;
      ctx.lineWidth = Math.max(1.2, 1.8 * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = `rgba(35, 18, 10, ${(intensity / 100.0) * 0.40})`;
      ctx.shadowBlur = 2.5 * scale;
      ctx.stroke();
      ctx.restore();

      // 2. Subtle soft highlight above crease for natural eyelid fold depth
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y - 1.5 * scale);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = ((pts[i].y + pts[i + 1].y) / 2) - 1.5 * scale;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y - 1.5 * scale, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y - 1.5 * scale);

      ctx.strokeStyle = `rgba(255, 245, 235, ${(intensity / 100.0) * 0.22})`;
      ctx.lineWidth = Math.max(0.8, 1.2 * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    });
  }

  // Effect 9d: Collarbone Definition (Xương quai xanh - X006)
  applyCollarboneDefinition(intensity: number) {
    if (intensity === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    // Add a subtle shadow below collar zone (lower 1/4 of face area, centered)
    const collarY = h * 0.78;
    const collarH = h * 0.12;

    // Shadow (darken below collarbone line)
    const shadowGrad = ctx.createLinearGradient(0, collarY - collarH * 0.3, 0, collarY + collarH);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(0.4, `rgba(0,0,0,${(intensity / 100.0) * 0.18})`);
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');

    // Highlight above collarbone
    const hlGrad = ctx.createLinearGradient(0, collarY - collarH * 0.8, 0, collarY);
    hlGrad.addColorStop(0, 'rgba(0,0,0,0)');
    hlGrad.addColorStop(1, `rgba(255,255,255,${(intensity / 100.0) * 0.1})`);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(w * 0.15, collarY - collarH * 0.3, w * 0.7, collarH * 1.3);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = hlGrad;
    ctx.fillRect(w * 0.2, collarY - collarH * 0.8, w * 0.6, collarH * 0.8);
    ctx.restore();
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

  // --- EXTENDED LOCAL BEAUTY & GEOMETRY ALGORITHMS (40 REQUIREMENTS) ---

  // B003: Skin Blemish & Spot Reduction (Giảm đốm và khuyết điểm nhỏ)
  applyBlemishReduction(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const faceOval = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
    const mCanvas = document.createElement('canvas');
    mCanvas.width = w; mCanvas.height = h;
    const mCtx = mCanvas.getContext('2d')!;
    mCtx.beginPath();
    faceOval.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
      else mCtx.lineTo(pt.x * w, pt.y * h);
    });
    mCtx.closePath();
    mCtx.fillStyle = 'white';
    mCtx.filter = `blur(${8 * scale}px)`;
    mCtx.fill();

    const smoothCanvas = document.createElement('canvas');
    smoothCanvas.width = w; smoothCanvas.height = h;
    const sCtx = smoothCanvas.getContext('2d')!;
    sCtx.filter = `blur(${Math.max(2, 4 * scale)}px) contrast(${100 - intensity * 0.1}%)`;
    sCtx.drawImage(this.workCanvas, 0, 0);

    sCtx.globalCompositeOperation = 'destination-in';
    sCtx.drawImage(mCanvas, 0, 0);

    ctx.save();
    ctx.globalAlpha = (intensity / 100.0) * 0.55;
    ctx.drawImage(smoothCanvas, 0, 0);
    ctx.restore();
  }

  // B004: Wrinkle Reduction (Giảm nếp nhăn)
  applyWrinkleReduction(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const bands = [
      [10, 67, 109, 10, 338, 297],
      [33, 7, 163, 144, 145],
      [263, 249, 390, 373, 374]
    ];

    bands.forEach(pts => {
      const brightCanvas = document.createElement('canvas');
      brightCanvas.width = w; brightCanvas.height = h;
      const bCtx = brightCanvas.getContext('2d')!;
      bCtx.filter = `brightness(${100 + intensity * 0.16}%) contrast(${100 - intensity * 0.08}%)`;
      bCtx.drawImage(this.workCanvas, 0, 0);

      const mCanvas = document.createElement('canvas');
      mCanvas.width = w; mCanvas.height = h;
      const mCtx = mCanvas.getContext('2d')!;
      mCtx.beginPath();
      pts.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
        else mCtx.lineTo(pt.x * w, pt.y * h);
      });
      mCtx.closePath();
      mCtx.fillStyle = 'white';
      mCtx.filter = `blur(${10 * scale}px)`;
      mCtx.fill();

      bCtx.globalCompositeOperation = 'destination-in';
      bCtx.drawImage(mCanvas, 0, 0);

      ctx.save();
      ctx.globalAlpha = (intensity / 100.0) * 0.70;
      ctx.drawImage(brightCanvas, 0, 0);
      ctx.restore();
    });
  }

  // B007: Skin Tone Evening (Làm đều màu da)
  applySkinEvening(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const faceOval = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
    const mCanvas = document.createElement('canvas');
    mCanvas.width = w; mCanvas.height = h;
    const mCtx = mCanvas.getContext('2d')!;
    mCtx.beginPath();
    faceOval.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      if (i === 0) mCtx.moveTo(pt.x * w, pt.y * h);
      else mCtx.lineTo(pt.x * w, pt.y * h);
    });
    mCtx.closePath();
    mCtx.fillStyle = 'white';
    mCtx.filter = `blur(${12 * scale}px)`;
    mCtx.fill();

    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = w; colorCanvas.height = h;
    const cCtx = colorCanvas.getContext('2d')!;
    cCtx.filter = `blur(${Math.max(4, 14 * scale)}px)`;
    cCtx.drawImage(this.workCanvas, 0, 0);

    cCtx.globalCompositeOperation = 'destination-in';
    cCtx.drawImage(mCanvas, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = (intensity / 100.0) * 0.65;
    ctx.drawImage(colorCanvas, 0, 0);
    ctx.restore();
  }

  // B021: Midface Ratio (Tỷ lệ phần giữa khuôn mặt)
  applyMidfaceRatio(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const nose = landmarks[1], noseBase = landmarks[2];
    if (!nose || !noseBase) return;
    const shiftY = (intensity / 100.0) * 0.025;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: nose, target: { x: nose.x, y: nose.y + shiftY }, radius: 0.18, intensity: 0.9, mode: 0 },
      { center: noseBase, target: { x: noseBase.x, y: noseBase.y + shiftY * 0.8 }, radius: 0.15, intensity: 0.85, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B022: Lower Face Ratio (Tỷ lệ phần dưới khuôn mặt)
  applyLowerFaceRatio(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const chin = landmarks[152], lowerLip = landmarks[17];
    if (!chin || !lowerLip) return;
    const shiftY = (intensity / 100.0) * 0.028;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: chin, target: { x: chin.x, y: chin.y + shiftY }, radius: 0.20, intensity: 0.95, mode: 0 },
      { center: lowerLip, target: { x: lowerLip.x, y: lowerLip.y + shiftY * 0.5 }, radius: 0.14, intensity: 0.8, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B023: Forehead Height (Chiều cao trán)
  applyForeheadHeight(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const forehead = landmarks[10], leftT = landmarks[67], rightT = landmarks[297];
    if (!forehead) return;
    const shiftY = (intensity / 100.0) * -0.030;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: forehead, target: { x: forehead.x, y: forehead.y + shiftY }, radius: 0.28, intensity: 0.95, mode: 0 },
      ...(leftT ? [{ center: leftT, target: { x: leftT.x, y: leftT.y + shiftY * 0.6 }, radius: 0.20, intensity: 0.8, mode: 0 }] : []),
      ...(rightT ? [{ center: rightT, target: { x: rightT.x, y: rightT.y + shiftY * 0.6 }, radius: 0.20, intensity: 0.8, mode: 0 }] : [])
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B024: Head to Body Ratio (Tỷ lệ đầu so với cơ thể)
  applyHeadScale(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const nose = landmarks[1];
    if (!nose) return;
    const mode = intensity > 0 ? -1.0 : 1.0;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: nose, target: nose, radius: 0.45, intensity: (Math.abs(intensity) / 100.0) * 0.35, mode }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B030: Gaze Direction (Điều chỉnh hướng nhìn)
  applyGazeDirection(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const leftIris = landmarks[468], rightIris = landmarks[473];
    if (!leftIris || !rightIris) return;
    const shiftX = (intensity / 100.0) * 0.012;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftIris, target: { x: leftIris.x + shiftX, y: leftIris.y }, radius: 0.06, intensity: 0.9, mode: 0 },
      { center: rightIris, target: { x: rightIris.x + shiftX, y: rightIris.y }, radius: 0.06, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B035: Nose Size (Kích thước mũi)
  applyNoseSize(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const nose = landmarks[1];
    if (!nose) return;
    const mode = intensity > 0 ? -1.0 : 1.0;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: nose, target: nose, radius: 0.16, intensity: (Math.abs(intensity) / 100.0) * 0.30, mode }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B038: Nose Tip Refinement (Điều chỉnh đầu mũi)
  applyNoseTip(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const tip = landmarks[4] || landmarks[1];
    if (!tip) return;
    const shiftY = (intensity / 100.0) * -0.018;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: tip, target: { x: tip.x, y: tip.y + shiftY }, radius: 0.08, intensity: 0.95, mode: 0 },
      { center: tip, target: tip, radius: 0.09, intensity: (intensity / 100.0) * 0.25, mode: -1.0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B040: Lip Position (Vị trí môi)
  applyLipPosition(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const upperLip = landmarks[0], lowerLip = landmarks[17];
    if (!upperLip || !lowerLip) return;
    const shiftY = (intensity / 100.0) * 0.022;
    const mouthCenter = { x: (upperLip.x + lowerLip.x) / 2, y: (upperLip.y + lowerLip.y) / 2 };
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: mouthCenter, target: { x: mouthCenter.x, y: mouthCenter.y + shiftY }, radius: 0.18, intensity: 0.95, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B041: Lip Tilt (Độ nghiêng môi)
  applyLipTilt(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const leftCorner = landmarks[61], rightCorner = landmarks[291];
    if (!leftCorner || !rightCorner) return;
    const shiftY = (intensity / 100.0) * 0.016;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftCorner, target: { x: leftCorner.x, y: leftCorner.y + shiftY }, radius: 0.12, intensity: 0.9, mode: 0 },
      { center: rightCorner, target: { x: rightCorner.x, y: rightCorner.y - shiftY }, radius: 0.12, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B045: Eyebrow Height (Vị trí cao/thấp của mày)
  applyEyebrowHeight(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const leftArch = landmarks[105], rightArch = landmarks[334];
    if (!leftArch || !rightArch) return;
    const shiftY = (intensity / 100.0) * -0.024;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftArch, target: { x: leftArch.x, y: leftArch.y + shiftY }, radius: 0.18, intensity: 0.95, mode: 0 },
      { center: rightArch, target: { x: rightArch.x, y: rightArch.y + shiftY }, radius: 0.18, intensity: 0.95, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B047: Eyebrow Spacing (Khoảng cách lông mày)
  applyEyebrowSpacing(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const leftHead = landmarks[107], rightHead = landmarks[336];
    if (!leftHead || !rightHead) return;
    const shiftX = (intensity / 100.0) * 0.018;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftHead, target: { x: leftHead.x - shiftX, y: leftHead.y }, radius: 0.12, intensity: 0.9, mode: 0 },
      { center: rightHead, target: { x: rightHead.x + shiftX, y: rightHead.y }, radius: 0.12, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B048: Eyebrow Tilt (Độ nghiêng lông mày)
  applyEyebrowTilt(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const leftTail = landmarks[70], rightTail = landmarks[300];
    if (!leftTail || !rightTail) return;
    const shiftY = (intensity / 100.0) * -0.020;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftTail, target: { x: leftTail.x, y: leftTail.y + shiftY }, radius: 0.14, intensity: 0.9, mode: 0 },
      { center: rightTail, target: { x: rightTail.x, y: rightTail.y + shiftY }, radius: 0.14, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B049: Eyebrow Arch (Điểm đỉnh lông mày)
  applyEyebrowArch(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const leftPeak = landmarks[105], rightPeak = landmarks[334];
    if (!leftPeak || !rightPeak) return;
    const shiftY = (intensity / 100.0) * -0.022;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftPeak, target: { x: leftPeak.x, y: leftPeak.y + shiftY }, radius: 0.12, intensity: 0.95, mode: 0 },
      { center: rightPeak, target: { x: rightPeak.x, y: rightPeak.y + shiftY }, radius: 0.12, intensity: 0.95, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B050: Eyebrow Color (Kiểu và màu lông mày)
  applyEyebrowColor(landmarks: NormalizedLandmark[], colorHex = '#3b2f2f', intensity = 50) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const leftBrow = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
    const rightBrow = [300, 296, 334, 293, 336, 285, 295, 282, 283, 276];

    [leftBrow, rightBrow].forEach(pts => {
      ctx.save();
      ctx.beginPath();
      pts.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) ctx.moveTo(pt.x * w, pt.y * h);
        else ctx.lineTo(pt.x * w, pt.y * h);
      });
      ctx.closePath();
      ctx.fillStyle = colorHex;
      ctx.globalAlpha = (intensity / 100.0) * 0.45;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.filter = `blur(${3 * scale}px)`;
      ctx.fill();
      ctx.restore();
    });
  }

  // B052: Lip Finish (Son: chất liệu matte/gloss)
  applyLipFinish(landmarks: NormalizedLandmark[], finish: 'matte' | 'gloss' = 'gloss', intensity = 50) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    const lowerLipCenter = landmarks[14] || landmarks[17];
    if (!lowerLipCenter) return;
    const cx = lowerLipCenter.x * w;
    const cy = lowerLipCenter.y * h;
    const rx = w * 0.045;
    const ry = h * 0.015;

    ctx.save();
    if (finish === 'gloss') {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      grad.addColorStop(0, `rgba(255,255,255,${(intensity / 100.0) * 0.55})`);
      grad.addColorStop(0.5, `rgba(255,255,255,${(intensity / 100.0) * 0.25})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(180, 160, 160, ${(intensity / 100.0) * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 1.2, ry * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // B053: Lip Liner (Son: vùng phủ và viền)
  applyLipLiner(landmarks: NormalizedLandmark[], colorHex = '#c43a53', intensity = 50) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const outerLip = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
    ctx.save();
    ctx.beginPath();
    outerLip.forEach((idx, i) => {
      const pt = landmarks[idx];
      if (!pt) return;
      if (i === 0) ctx.moveTo(pt.x * w, pt.y * h);
      else ctx.lineTo(pt.x * w, pt.y * h);
    });
    ctx.closePath();
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = Math.max(1.5, 2.5 * scale);
    ctx.globalAlpha = (intensity / 100.0) * 0.50;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.filter = `blur(${2 * scale}px)`;
    ctx.stroke();
    ctx.restore();
  }

  // B056: Eye Shadow (Phấn mắt)
  applyEyeShadow(landmarks: NormalizedLandmark[], colorHex = '#8b4513', intensity = 50) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const leftUpperLid = [33, 160, 159, 158, 133];
    const rightUpperLid = [263, 387, 386, 385, 362];

    [leftUpperLid, rightUpperLid].forEach(pts => {
      ctx.save();
      ctx.beginPath();
      pts.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        const ly = pt.y * h - 8 * scale;
        if (i === 0) ctx.moveTo(pt.x * w, ly);
        else ctx.lineTo(pt.x * w, ly);
      });
      ctx.closePath();
      ctx.fillStyle = colorHex;
      ctx.globalAlpha = (intensity / 100.0) * 0.40;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.filter = `blur(${6 * scale}px)`;
      ctx.fill();
      ctx.restore();
    });
  }

  // B057: Eyeliner (Kẻ mắt Eyeliner)
  applyEyeliner(landmarks: NormalizedLandmark[], intensity = 60) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const leftLid = [133, 155, 154, 153, 145, 144, 163, 7, 33];
    const rightLid = [362, 382, 381, 380, 374, 373, 390, 249, 263];

    [leftLid, rightLid].forEach(pts => {
      ctx.save();
      ctx.beginPath();
      pts.forEach((idx, i) => {
        const pt = landmarks[idx];
        if (!pt) return;
        if (i === 0) ctx.moveTo(pt.x * w, pt.y * h);
        else ctx.lineTo(pt.x * w, pt.y * h);
      });
      ctx.strokeStyle = '#1a1110';
      ctx.lineWidth = Math.max(1.2, 2.0 * scale);
      ctx.lineCap = 'round';
      ctx.globalAlpha = (intensity / 100.0) * 0.75;
      ctx.filter = `blur(${0.8 * scale}px)`;
      ctx.stroke();
      ctx.restore();
    });
  }

  // B058: False Eyelashes (Mi giả)
  applyFalseLashes(landmarks: NormalizedLandmark[], intensity = 50) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const leftMargin = [160, 159, 158, 157];
    const rightMargin = [387, 386, 385, 384];

    [leftMargin, rightMargin].forEach(pts => {
      ctx.save();
      ctx.strokeStyle = '#110b0a';
      ctx.lineWidth = Math.max(0.8, 1.2 * scale);
      ctx.globalAlpha = (intensity / 100.0) * 0.70;
      pts.forEach(idx => {
        const pt = landmarks[idx];
        if (!pt) return;
        ctx.beginPath();
        ctx.moveTo(pt.x * w, pt.y * h);
        ctx.quadraticCurveTo(pt.x * w + 2 * scale, pt.y * h - 7 * scale, pt.x * w + 4 * scale, pt.y * h - 11 * scale);
        ctx.stroke();
      });
      ctx.restore();
    });
  }

  // B061: Full Makeup Preset (Preset makeup hoàn chỉnh)
  applyMakeupPreset(landmarks: NormalizedLandmark[], _preset = 'natural', intensity = 60) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    this.applyEyeBrightening(landmarks, intensity * 0.6);
    this.applyEyeCatchlight(landmarks, intensity * 0.5);
    this.applyEyeliner(landmarks, intensity * 0.65);
    this.applyLipFinish(landmarks, 'gloss', intensity * 0.6);
  }

  // B065: Tame Flyaway Hair (Giảm tóc con bay/xù)
  applyFlyawayReduction(intensity: number) {
    if (intensity === 0 || !this.segmentationMask) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w; maskCanvas.height = h;
    const mCtx = maskCanvas.getContext('2d')!;
    this.drawScaledSegmentationMask(mCtx, w, h, 1);

    const smoothMask = document.createElement('canvas');
    smoothMask.width = w; smoothMask.height = h;
    const sCtx = smoothMask.getContext('2d')!;
    sCtx.filter = `blur(${Math.max(2, 6 * scale)}px)`;
    sCtx.drawImage(maskCanvas, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = (intensity / 100.0) * 0.30;
    ctx.drawImage(smoothMask, 0, 0);
    ctx.restore();
  }

  // B067: Hair Highlight Streaks (Nhuộm highlight theo vùng)
  applyHairHighlights(colorHex = '#d4af37', intensity = 50) {
    if (intensity === 0 || !this.segmentationMask) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    const streakCanvas = document.createElement('canvas');
    streakCanvas.width = w; streakCanvas.height = h;
    const sCtx = streakCanvas.getContext('2d')!;

    const grad = sCtx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0.2, 'rgba(0,0,0,0)');
    grad.addColorStop(0.35, colorHex);
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(0.65, colorHex);
    grad.addColorStop(0.8, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, w, h);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w; maskCanvas.height = h;
    const mCtx = maskCanvas.getContext('2d')!;
    this.drawScaledSegmentationMask(mCtx, w, h, 1);

    sCtx.globalCompositeOperation = 'destination-in';
    sCtx.drawImage(maskCanvas, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = (intensity / 100.0) * 0.50;
    ctx.drawImage(streakCanvas, 0, 0);
    ctx.restore();
  }

  // B068: Hairline Adjustment (Điều chỉnh đường chân tóc)
  applyHairlineAdjust(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const forehead = landmarks[10];
    if (!forehead) return;
    const shiftY = (intensity / 100.0) * 0.025;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: forehead, target: { x: forehead.x, y: forehead.y + shiftY }, radius: 0.25, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B069: Crown Hair Volume (Tăng độ phồng đỉnh đầu)
  applyCrownVolume(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const forehead = landmarks[10];
    if (!forehead) return;
    const crownCenter = { x: forehead.x, y: Math.max(0.02, forehead.y - 0.12) };
    const targetCenter = { x: crownCenter.x, y: crownCenter.y - (intensity / 100.0) * 0.035 };
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: crownCenter, target: targetCenter, radius: 0.32, intensity: 0.95, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B071: Hair Gap Fill (Điền vùng tóc thưa)
  applyHairFill(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const forehead = landmarks[10];
    if (!forehead) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(forehead.x * w, (forehead.y * h) - 10 * scale, 24 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#221815';
    ctx.globalAlpha = (intensity / 100.0) * 0.35;
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = `blur(${12 * scale}px)`;
    ctx.fill();
    ctx.restore();
  }

  // B072: Bangs Preview (Thử tóc mái)
  applyBangsPreview(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const scale = Math.max(w, h) / 800;

    const forehead = landmarks[10];
    const leftBrow = landmarks[70];
    const rightBrow = landmarks[300];
    if (!forehead || !leftBrow || !rightBrow) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(leftBrow.x * w - 10 * scale, forehead.y * h - 5 * scale);
    ctx.lineTo(rightBrow.x * w + 10 * scale, forehead.y * h - 5 * scale);
    ctx.lineTo(rightBrow.x * w + 5 * scale, rightBrow.y * h);
    ctx.lineTo(leftBrow.x * w - 5 * scale, leftBrow.y * h);
    ctx.closePath();
    ctx.fillStyle = '#1e1410';
    ctx.globalAlpha = (intensity / 100.0) * 0.55;
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = `blur(${4 * scale}px)`;
    ctx.fill();
    ctx.restore();
  }

  // B076: Arm Slimming (Thon cánh tay)
  applyArmSlim(intensity: number) {
    if (intensity === 0 || !this.webGLWarp) return;
    const factor = (intensity / 100.0) * 0.035;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: { x: 0.18, y: 0.52 }, target: { x: 0.18 + factor, y: 0.52 }, radius: 0.22, intensity: 0.9, mode: 0 },
      { center: { x: 0.82, y: 0.52 }, target: { x: 0.82 - factor, y: 0.52 }, radius: 0.22, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B077: Leg Slimming (Thon chân)
  applyLegSlim(intensity: number) {
    if (intensity === 0 || !this.webGLWarp) return;
    const factor = (intensity / 100.0) * 0.035;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: { x: 0.38, y: 0.85 }, target: { x: 0.38 + factor, y: 0.85 }, radius: 0.18, intensity: 0.9, mode: 0 },
      { center: { x: 0.62, y: 0.85 }, target: { x: 0.62 - factor, y: 0.85 }, radius: 0.18, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B079: Height / Body Stretch (Điều chỉnh chiều cao/tỷ lệ)
  applyHeightStretch(intensity: number) {
    if (intensity === 0 || !this.webGLWarp) return;
    const factor = (intensity / 100.0) * 0.045;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: { x: 0.5, y: 0.85 }, target: { x: 0.5, y: 0.85 + factor }, radius: 0.35, intensity: 0.95, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B080: Hip Shaping (Điều chỉnh hông)
  applyHipShape(intensity: number) {
    if (intensity === 0 || !this.webGLWarp) return;
    const factor = (intensity / 100.0) * 0.040;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: { x: 0.30, y: 0.72 }, target: { x: 0.30 - factor, y: 0.72 }, radius: 0.22, intensity: 0.95, mode: 0 },
      { center: { x: 0.70, y: 0.72 }, target: { x: 0.70 + factor, y: 0.72 }, radius: 0.22, intensity: 0.95, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // B081: Tummy Tuck (Điều chỉnh vùng bụng)
  applyTummyTuck(intensity: number) {
    if (intensity === 0 || !this.webGLWarp) return;
    const factor = (intensity / 100.0) * 0.038;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: { x: 0.5, y: 0.68 }, target: { x: 0.5, y: 0.68 - factor * 0.5 }, radius: 0.25, intensity: 0.95, mode: -1.0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // X001: Forehead Width (Độ rộng trán)
  applyForeheadWidth(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const leftTemple = landmarks[67], rightTemple = landmarks[297];
    if (!leftTemple || !rightTemple) return;
    const factor = (intensity / 100.0) * 0.035;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftTemple, target: { x: leftTemple.x - factor, y: leftTemple.y }, radius: 0.24, intensity: 0.9, mode: 0 },
      { center: rightTemple, target: { x: rightTemple.x + factor, y: rightTemple.y }, radius: 0.24, intensity: 0.9, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // X002: Eye Spacing (Khoảng cách hai mắt)
  applyEyeSpacing(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0 || !this.webGLWarp) return;
    const leftInner = landmarks[133], rightInner = landmarks[362];
    if (!leftInner || !rightInner) return;
    const factor = (intensity / 100.0) * 0.025;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: leftInner, target: { x: leftInner.x - factor, y: leftInner.y }, radius: 0.16, intensity: 0.95, mode: 0 },
      { center: rightInner, target: { x: rightInner.x + factor, y: rightInner.y }, radius: 0.16, intensity: 0.95, mode: 0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // X004: Chest Volume (Tăng thể tích ngực)
  applyChestVolume(intensity: number) {
    if (intensity === 0 || !this.webGLWarp) return;
    const factor = (intensity / 100.0) * 0.28;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: { x: 0.40, y: 0.58 }, target: { x: 0.40, y: 0.58 }, radius: 0.18, intensity: factor, mode: 1.0 },
      { center: { x: 0.60, y: 0.58 }, target: { x: 0.60, y: 0.58 }, radius: 0.18, intensity: factor, mode: 1.0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // X005: Buttock Volume (Tăng thể tích mông)
  applyButtockVolume(intensity: number) {
    if (intensity === 0 || !this.webGLWarp) return;
    const factor = (intensity / 100.0) * 0.28;
    const glCanvas = this.webGLWarp.applyWarp(this.workCanvas, [
      { center: { x: 0.38, y: 0.76 }, target: { x: 0.38, y: 0.76 }, radius: 0.22, intensity: factor, mode: 1.0 },
      { center: { x: 0.62, y: 0.76 }, target: { x: 0.62, y: 0.76 }, radius: 0.22, intensity: factor, mode: 1.0 }
    ]);
    const ctx = this.workCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.workCanvas.width, this.workCanvas.height);
    ctx.drawImage(glCanvas, 0, 0);
  }

  // X014: Magic Sky Replacement (Thay thế bầu trời ma thuật)
  applyMagicSky(skyPreset = 'sunset', intensity = 60) {
    if (intensity === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = w; skyCanvas.height = h;
    const sCtx = skyCanvas.getContext('2d')!;
    const grad = sCtx.createLinearGradient(0, 0, 0, h * 0.55);
    if (skyPreset === 'sunset') {
      grad.addColorStop(0, '#ff5e62');
      grad.addColorStop(0.5, '#ff9966');
      grad.addColorStop(1, 'rgba(255,153,102,0)');
    } else {
      grad.addColorStop(0, '#1a2a6c');
      grad.addColorStop(0.5, '#b21f1f');
      grad.addColorStop(1, 'rgba(178,31,31,0)');
    }
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, w, h * 0.55);

    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = (intensity / 100.0) * 0.50;
    ctx.drawImage(skyCanvas, 0, 0);
    ctx.restore();
  }

  // X023: Lens Film Effects (Hiệu ứng ống kính: Film Grain, Lens Flare)
  applyLensFilmEffects(intensity: number) {
    if (intensity === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = w; grainCanvas.height = h;
    const gCtx = grainCanvas.getContext('2d')!;
    const imgData = gCtx.createImageData(w, h);
    const data = imgData.data;
    const grainAmount = (intensity / 100.0) * 32;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * grainAmount;
      data[i] = 128 + noise;
      data[i + 1] = 128 + noise;
      data[i + 2] = 128 + noise;
      data[i + 3] = 255;
    }
    gCtx.putImageData(imgData, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = (intensity / 100.0) * 0.45;
    ctx.drawImage(grainCanvas, 0, 0);
    ctx.restore();

    ctx.save();
    const flareGrad = ctx.createLinearGradient(0, h * 0.25, w, h * 0.35);
    flareGrad.addColorStop(0, 'rgba(255,200,100,0)');
    flareGrad.addColorStop(0.4, `rgba(255,220,150,${(intensity / 100.0) * 0.18})`);
    flareGrad.addColorStop(0.6, `rgba(180,220,255,${(intensity / 100.0) * 0.14})`);
    flareGrad.addColorStop(1, 'rgba(180,220,255,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, h * 0.2, w, h * 0.2);
    ctx.restore();
  }

  // Unified Pipeline Executor for Preview and Export
  applyPipeline(params: PipelineParams, landmarks?: NormalizedLandmark[]) {
    this.reset();

    // Stage 0A: Unified Crop Operation with Coordinate Mapping
    let x_n = 0, y_n = 0, w_n = 1, h_n = 1;
    let isCropped = false;

    if (params.crop && params.crop.aspectRatio !== 'original') {
      isCropped = true;
      let targetRatio = 1.0;
      switch (params.crop.aspectRatio) {
        case '1:1': targetRatio = 1.0; break;
        case '4:5': targetRatio = 4 / 5; break;
        case '3:4': targetRatio = 3 / 4; break;
        case '9:16': targetRatio = 9 / 16; break;
      }

      const origW = this.originalCanvas.width;
      const origH = this.originalCanvas.height;
      const currentRatio = origW / origH;

      if (params.crop.width && params.crop.height && params.crop.width > 0 && params.crop.height > 0 && params.crop.width < 1.0) {
        x_n = params.crop.x;
        y_n = params.crop.y;
        w_n = params.crop.width;
        h_n = params.crop.height;
      } else {
        if (currentRatio > targetRatio) {
          w_n = targetRatio / currentRatio;
          h_n = 1.0;
          x_n = (1.0 - w_n) / 2;
          y_n = 0.0;
        } else {
          w_n = 1.0;
          h_n = currentRatio / targetRatio;
          x_n = 0.0;
          y_n = (1.0 - h_n) / 2;
        }
      }

      const cropX = Math.round(x_n * origW);
      const cropY = Math.round(y_n * origH);
      const cropW = Math.max(1, Math.round(w_n * origW));
      const cropH = Math.max(1, Math.round(h_n * origH));

      this.workCanvas.width = cropW;
      this.workCanvas.height = cropH;
      const ctx = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(this.originalCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    }

    this.currentCropNorm = { x: x_n, y: y_n, w: w_n, h: h_n };

    // Coordinate mapping for landmarks into cropped coordinate space
    let actualLandmarks: NormalizedLandmark[] | undefined = undefined;
    if (landmarks) {
      actualLandmarks = (Array.isArray(landmarks) && Array.isArray((landmarks as any)[0]))
        ? (landmarks as any)[0]
        : (landmarks as any);
    }

    let mappedLandmarks = actualLandmarks;
    if (actualLandmarks && isCropped) {
      mappedLandmarks = actualLandmarks.map(lm => ({
        ...lm,
        x: (lm.x - x_n) / w_n,
        y: (lm.y - y_n) / h_n,
        z: lm.z / w_n
      }));
    }

    // Stage 0B: Replay Blemish Healing operations (B002)
    if (params.healings && params.healings.length > 0) {
      for (const op of params.healings) {
        const u = (op.x - x_n) / w_n;
        const v = (op.y - y_n) / h_n;
        const radiusPx = (op.radiusNorm / h_n) * this.workCanvas.height;
        this.applyBlemishHealing({ x: u, y: v }, radiusPx);
      }
    }

    // Stage 1: Skin Enhancements (2D Canvas, mask-based)
    if (params.skin_smooth > 0 && mappedLandmarks) {
      this.applySkinSmoothing(mappedLandmarks, params.skin_smooth);
    }
    if (params.skin_brighten && params.skin_brighten > 0 && mappedLandmarks) {
      this.applySkinBrightening(mappedLandmarks, params.skin_brighten);
    }
    if (params.skin_oil && params.skin_oil > 0) {
      this.applyOilReduction(mappedLandmarks || [], params.skin_oil);
    }
    if (params.skin_tone && params.skin_tone !== 0 && mappedLandmarks) {
      this.applySkinToneAdjust(mappedLandmarks, params.skin_tone);
    }
    if (params.nasolabial && params.nasolabial > 0 && mappedLandmarks) {
      this.applyNasolabialReduction(mappedLandmarks, params.nasolabial);
    }
    if (params.dark_circles && params.dark_circles > 0 && mappedLandmarks) {
      this.applyDarkCircleReduction(mappedLandmarks, params.dark_circles);
    }
    if (params.skin_detail && params.skin_detail > 0 && mappedLandmarks) {
      this.applySkinDetail(mappedLandmarks, params.skin_detail);
    }
    if (params.eye_bags && params.eye_bags > 0 && mappedLandmarks) {
      this.applyEyeBagReduction(mappedLandmarks, params.eye_bags);
    }
    if (params.skin_blemish_reduction && params.skin_blemish_reduction > 0 && mappedLandmarks) {
      this.applyBlemishReduction(mappedLandmarks, params.skin_blemish_reduction);
    }
    if (params.wrinkle_reduction && params.wrinkle_reduction > 0 && mappedLandmarks) {
      this.applyWrinkleReduction(mappedLandmarks, params.wrinkle_reduction);
    }
    if (params.skin_evening && params.skin_evening > 0 && mappedLandmarks) {
      this.applySkinEvening(mappedLandmarks, params.skin_evening);
    }

    // Stage 2: Geometric Feature Shaping (WebGL Warp)
    if (params.face_slim > 0 && mappedLandmarks) {
      this.applyFaceSlimming(mappedLandmarks, params.face_slim);
    }
    if (params.face_width && params.face_width !== 0 && mappedLandmarks) {
      this.applyFaceWidth(mappedLandmarks, params.face_width);
    }
    if (params.jaw_angle && params.jaw_angle > 0 && mappedLandmarks) {
      this.applyJawAngle(mappedLandmarks, params.jaw_angle);
    }
    if (params.jaw_slim && params.jaw_slim > 0 && mappedLandmarks) {
      this.applyJawContour(mappedLandmarks, params.jaw_slim);
    }
    if (params.chin_vline && params.chin_vline > 0 && mappedLandmarks) {
      this.applyChinVLine(mappedLandmarks, params.chin_vline);
    }
    if (params.chin_length && params.chin_length !== 0 && mappedLandmarks) {
      this.applyChinLength(mappedLandmarks, params.chin_length);
    }
    if (params.chin_slim > 0 && mappedLandmarks) {
      this.applyDoubleChinReduction(mappedLandmarks, params.chin_slim);
    }
    if (params.cheekbone_width && params.cheekbone_width > 0 && mappedLandmarks) {
      this.applyCheekboneWidth(mappedLandmarks, params.cheekbone_width);
    }
    if (params.midface_ratio && params.midface_ratio !== 0 && mappedLandmarks) {
      this.applyMidfaceRatio(mappedLandmarks, params.midface_ratio);
    }
    if (params.lower_face_ratio && params.lower_face_ratio !== 0 && mappedLandmarks) {
      this.applyLowerFaceRatio(mappedLandmarks, params.lower_face_ratio);
    }
    if (params.forehead_height && params.forehead_height !== 0 && mappedLandmarks) {
      this.applyForeheadHeight(mappedLandmarks, params.forehead_height);
    }
    if (params.head_scale && params.head_scale !== 0 && mappedLandmarks) {
      this.applyHeadScale(mappedLandmarks, params.head_scale);
    }
    if (params.forehead_width && params.forehead_width !== 0 && mappedLandmarks) {
      this.applyForeheadWidth(mappedLandmarks, params.forehead_width);
    }
    if (params.eye_enlarge && params.eye_enlarge > 0 && mappedLandmarks) {
      this.applyEyeEnlargement(mappedLandmarks, params.eye_enlarge);
    }
    if (params.eye_height && params.eye_height > 0 && mappedLandmarks) {
      this.applyEyeHeight(mappedLandmarks, params.eye_height);
    }
    if (params.eye_length && params.eye_length > 0 && mappedLandmarks) {
      this.applyEyeLength(mappedLandmarks, params.eye_length);
    }
    if (params.eye_spacing && params.eye_spacing !== 0 && mappedLandmarks) {
      this.applyEyeSpacing(mappedLandmarks, params.eye_spacing);
    }
    if (params.gaze_direction && params.gaze_direction !== 0 && mappedLandmarks) {
      this.applyGazeDirection(mappedLandmarks, params.gaze_direction);
    }
    if (params.eyelid_lift && params.eyelid_lift > 0 && mappedLandmarks) {
      this.applyEyelidLift(mappedLandmarks, params.eyelid_lift);
    }
    if (params.eyebrow_height && params.eyebrow_height !== 0 && mappedLandmarks) {
      this.applyEyebrowHeight(mappedLandmarks, params.eyebrow_height);
    }
    if (params.eyebrow_spacing && params.eyebrow_spacing !== 0 && mappedLandmarks) {
      this.applyEyebrowSpacing(mappedLandmarks, params.eyebrow_spacing);
    }
    if (params.eyebrow_tilt && params.eyebrow_tilt !== 0 && mappedLandmarks) {
      this.applyEyebrowTilt(mappedLandmarks, params.eyebrow_tilt);
    }
    if (params.eyebrow_arch && params.eyebrow_arch !== 0 && mappedLandmarks) {
      this.applyEyebrowArch(mappedLandmarks, params.eyebrow_arch);
    }
    if (params.nose_size && params.nose_size !== 0 && mappedLandmarks) {
      this.applyNoseSize(mappedLandmarks, params.nose_size);
    }
    if (params.nose_tip && params.nose_tip !== 0 && mappedLandmarks) {
      this.applyNoseTip(mappedLandmarks, params.nose_tip);
    }
    if (params.lip_position && params.lip_position !== 0 && mappedLandmarks) {
      this.applyLipPosition(mappedLandmarks, params.lip_position);
    }
    if (params.lip_tilt && params.lip_tilt !== 0 && mappedLandmarks) {
      this.applyLipTilt(mappedLandmarks, params.lip_tilt);
    }

    // Stage 3: Facial Details, Makeup & Hair (2D Canvas & Shaders)
    if (params.double_eyelid && params.double_eyelid > 0 && mappedLandmarks) {
      this.applyDoubleEyelid(mappedLandmarks, params.double_eyelid);
    }
    if (params.eyeshadow_intensity && params.eyeshadow_intensity > 0 && mappedLandmarks) {
      this.applyEyeShadow(mappedLandmarks, params.eyeshadow_color, params.eyeshadow_intensity);
    }
    if (params.eyeliner && params.eyeliner > 0 && mappedLandmarks) {
      this.applyEyeliner(mappedLandmarks, params.eyeliner);
    }
    if (params.false_lashes && params.false_lashes > 0 && mappedLandmarks) {
      this.applyFalseLashes(mappedLandmarks, params.false_lashes);
    }
    if (params.eyebrow_color_intensity && params.eyebrow_color_intensity > 0 && mappedLandmarks) {
      this.applyEyebrowColor(mappedLandmarks, params.eyebrow_color, params.eyebrow_color_intensity);
    }
    if (params.eye_color_intensity && params.eye_color_intensity > 0 && mappedLandmarks) {
      this.applyEyeColor(mappedLandmarks, params.eye_color || '#3d6b8c', params.eye_color_intensity);
    }
    if (params.eye_bright && params.eye_bright > 0 && mappedLandmarks) {
      this.applyEyeBrightening(mappedLandmarks, params.eye_bright);
    }
    if (params.eye_catchlight && params.eye_catchlight > 0 && mappedLandmarks) {
      this.applyEyeCatchlight(mappedLandmarks, params.eye_catchlight);
    }
    if (params.teeth_whiten && params.teeth_whiten > 0 && mappedLandmarks) {
      this.applyTeethWhitening(mappedLandmarks, params.teeth_whiten);
    }
    if (params.lip_finish_intensity && params.lip_finish_intensity > 0 && mappedLandmarks) {
      this.applyLipFinish(mappedLandmarks, params.lip_finish, params.lip_finish_intensity);
    }
    if (params.lip_liner && params.lip_liner > 0 && mappedLandmarks) {
      this.applyLipLiner(mappedLandmarks, '#c43a53', params.lip_liner);
    }
    if (params.makeup_preset_intensity && params.makeup_preset_intensity > 0 && mappedLandmarks) {
      this.applyMakeupPreset(mappedLandmarks, params.makeup_preset, params.makeup_preset_intensity);
    }
    if (params.hair_smooth > 0) {
      this.applyHairSmoothing(params.hair_smooth);
    }
    if (params.hair_shine && params.hair_shine > 0) {
      this.applyHairShine(params.hair_shine);
    }
    if (params.hair_flyaway && params.hair_flyaway > 0) {
      this.applyFlyawayReduction(params.hair_flyaway);
    }
    if (params.hair_highlight_intensity && params.hair_highlight_intensity > 0) {
      this.applyHairHighlights(params.hair_highlight, params.hair_highlight_intensity);
    }
    if (params.hairline_adjust && params.hairline_adjust > 0 && mappedLandmarks) {
      this.applyHairlineAdjust(mappedLandmarks, params.hairline_adjust);
    }
    if (params.crown_volume && params.crown_volume > 0 && mappedLandmarks) {
      this.applyCrownVolume(mappedLandmarks, params.crown_volume);
    }
    if (params.hair_fill && params.hair_fill > 0 && mappedLandmarks) {
      this.applyHairFill(mappedLandmarks, params.hair_fill);
    }
    if (params.bangs_preview && params.bangs_preview > 0 && mappedLandmarks) {
      this.applyBangsPreview(mappedLandmarks, params.bangs_preview);
    }
    if (params.collarbone && params.collarbone > 0) {
      this.applyCollarboneDefinition(params.collarbone);
    }

    // Stage 4: Global Tone, Color Filters & Environment
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
    if (params.magic_sky_intensity && params.magic_sky_intensity > 0) {
      this.applyMagicSky(params.magic_sky, params.magic_sky_intensity);
    }
    if (params.lens_film_effects && params.lens_film_effects > 0) {
      this.applyLensFilmEffects(params.lens_film_effects);
    }

    // Stage 5: Body Sculpting
    if (params.body_slim && params.body_slim > 0) {
      this.applyBodySlim(params.body_slim);
    }
    if (params.arm_slim && params.arm_slim > 0) {
      this.applyArmSlim(params.arm_slim);
    }
    if (params.leg_slim && params.leg_slim > 0) {
      this.applyLegSlim(params.leg_slim);
    }
    if (params.height_stretch && params.height_stretch > 0) {
      this.applyHeightStretch(params.height_stretch);
    }
    if (params.hip_shape && params.hip_shape > 0) {
      this.applyHipShape(params.hip_shape);
    }
    if (params.tummy_tuck && params.tummy_tuck > 0) {
      this.applyTummyTuck(params.tummy_tuck);
    }
    if (params.chest_volume && params.chest_volume > 0) {
      this.applyChestVolume(params.chest_volume);
    }
    if (params.buttock_volume && params.buttock_volume > 0) {
      this.applyButtockVolume(params.buttock_volume);
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
