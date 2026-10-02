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

    const ctxOrg = this.originalCanvas.getContext('2d', { willReadFrequently: true })!;
    ctxOrg.drawImage(image, 0, 0);
    
    const ctxWork = this.workCanvas.getContext('2d', { willReadFrequently: true })!;
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
  applySkinSmoothing(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0) return;
    const ctx = this.workCanvas.getContext('2d')!;
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;

    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = w;
    blurCanvas.height = h;
    const bCtx = blurCanvas.getContext('2d')!;
    bCtx.filter = `blur(${intensity * 0.15}px)`;
    bCtx.drawImage(this.originalCanvas, 0, 0);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w;
    maskCanvas.height = h;
    const mCtx = maskCanvas.getContext('2d')!;
    
    mCtx.fillStyle = 'black';
    mCtx.fillRect(0, 0, w, h);

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
      
      // Edge-aware mask simulation: blur the mask itself for soft transition
      mCtx.filter = 'blur(10px)';
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
        mCtx.filter = 'blur(5px)'; // soft edges around eyes/lips
        mCtx.fill();
        mCtx.filter = 'none';
      };

      drawFeature([33, 160, 158, 133, 153, 144]); // Left eye
      drawFeature([362, 385, 387, 263, 373, 380]); // Right eye
      drawFeature([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]); // Lips
      drawFeature([70, 63, 105, 66, 107, 55, 65, 52, 53, 46]); // Left Brow (rough)
      drawFeature([300, 293, 334, 296, 336, 285, 295, 282, 283, 276]); // Right Brow (rough)
    }
    
    mCtx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.drawImage(this.originalCanvas, 0, 0);
    
    bCtx.globalCompositeOperation = 'destination-in';
    bCtx.drawImage(maskCanvas, 0, 0);
    
    ctx.globalAlpha = intensity / 100.0;
    ctx.drawImage(blurCanvas, 0, 0);
    ctx.restore();
  }

  // Effect 3: Face Slimming (Thon mặt) - CPU Pixel Warp
  applyFaceSlimming(landmarks: NormalizedLandmark[], intensity: number) {
    if (intensity === 0 || !landmarks || landmarks.length === 0) return;
    
    const w = this.workCanvas.width;
    const h = this.workCanvas.height;
    const ctx = this.workCanvas.getContext('2d')!;
    
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const nose = landmarks[1];
    
    if (!leftCheek || !rightCheek || !nose) return;

    // We will do a localized pinch around the left cheek and right cheek separately
    // pulling them towards the nose.
    
    const imgData = ctx.getImageData(0, 0, w, h);
    const outData = ctx.createImageData(w, h);
    
    const radius = Math.abs(rightCheek.x - leftCheek.x) * w * 0.7; 
    const pinchStrength = (intensity / 100.0) * 0.3; // max 30% displacement
    
    const cxL = leftCheek.x * w;
    const cxR = rightCheek.x * w;
    
    const src = imgData.data;
    const dst = outData.data;
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let dx = x;
        let dy = y;
        
        // Influence from left cheek (pull towards center rightwards)
        const distL = Math.sqrt((x - cxL)**2 + (y - nose.y*h)**2);
        if (distL < radius) {
          const factor = (1.0 - (distL / radius)) * pinchStrength;
          dx += (nose.x*w - x) * factor;
        }
        
        // Influence from right cheek (pull towards center leftwards)
        const distR = Math.sqrt((x - cxR)**2 + (y - nose.y*h)**2);
        if (distR < radius) {
          const factor = (1.0 - (distR / radius)) * pinchStrength;
          dx += (nose.x*w - x) * factor;
        }

        // Bilinear interpolation for sub-pixel accuracy
        const x1 = Math.floor(dx);
        const y1 = Math.floor(dy);
        const x2 = Math.min(x1 + 1, w - 1);
        const y2 = Math.min(y1 + 1, h - 1);
        
        const wx = dx - x1;
        const wy = dy - y1;
        
        const idx = (y * w + x) * 4;
        
        for (let c = 0; c < 4; c++) {
          const p11 = src[(y1 * w + x1) * 4 + c];
          const p12 = src[(y1 * w + x2) * 4 + c];
          const p21 = src[(y2 * w + x1) * 4 + c];
          const p22 = src[(y2 * w + x2) * 4 + c];
          
          const val = p11 * (1 - wx) * (1 - wy) +
                      p12 * wx * (1 - wy) +
                      p21 * (1 - wx) * wy +
                      p22 * wx * wy;
                      
          dst[idx + c] = val;
        }
      }
    }
    
    ctx.putImageData(outData, 0, 0);
  }
}
