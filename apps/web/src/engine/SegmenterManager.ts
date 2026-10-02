import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

export class SegmenterManager {
  private segmenter: ImageSegmenter | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    let filesetResolver;
    try {
      filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
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
  }

  async segment(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<Uint8Array | undefined> {
    if (!this.segmenter) {
      await this.initialize();
    }
    
    if (!this.segmenter) {
       throw new Error("Segmenter not ready");
    }

    const result = this.segmenter.segment(imageElement);
    // return the category mask (0=background, 1=hair, 2=body, 3=face, 4=clothes, 5=others)
    if (result && result.categoryMask) {
        return result.categoryMask.getAsUint8Array();
    }
    return undefined;
  }
}

export const segmenterManager = new SegmenterManager();
