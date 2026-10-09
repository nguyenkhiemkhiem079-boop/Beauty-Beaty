import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

export interface SegmentationResult {
  mask: Uint8Array;
  width: number;
  height: number;
}

export const SEGMENT_BACKGROUND = 0;
export const SEGMENT_HAIR = 1;
export const SEGMENT_BODY = 2;
export const SEGMENT_FACE = 3;
export const SEGMENT_CLOTHES = 4;
export const SEGMENT_OTHERS = 5;

export class SegmenterManager {
  private segmenter: ImageSegmenter | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = (async () => {
      let filesetResolver;
    try {
      filesetResolver = await FilesetResolver.forVisionTasks(
        "/wasm"
      );
      
      this.segmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "/models/selfie_multiclass.tflite",
          delegate: "GPU"
        },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false
      });
    } catch (gpuError) {
      console.warn("GPU Segmenter init failed, falling back to CPU", gpuError);
      if (filesetResolver) {
        this.segmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "/models/selfie_multiclass.tflite",
            delegate: "CPU"
          },
          runningMode: "IMAGE",
          outputCategoryMask: true,
          outputConfidenceMasks: false
        });
      } else {
        throw gpuError;
      }
    }
    
      this.isInitialized = true;
      console.log("ImageSegmenter initialized successfully");
    })().catch(e => {
      this.initPromise = null;
      throw e;
    });
    
    return this.initPromise;
  }


  async segment(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<SegmentationResult | undefined> {
    if (!this.segmenter) {
      await this.initialize();
    }
    
    if (!this.segmenter) {
       throw new Error("Segmenter not ready");
    }

    const result = this.segmenter.segment(imageElement);
    // return the category mask (0=background, 1=hair, 2=body, 3=face, 4=clothes, 5=others)
    if (result && result.categoryMask) {
        return {
          mask: result.categoryMask.getAsUint8Array(),
          width: result.categoryMask.width,
          height: result.categoryMask.height
        };
    }
    return undefined;
  }
}

export const segmenterManager = new SegmenterManager();
