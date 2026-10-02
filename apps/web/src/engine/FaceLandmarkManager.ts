import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export class FaceLandmarkManager {
  private landmarker: FaceLandmarker | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = (async () => {
      let filesetResolver;
    try {
      filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
      );
      
      this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "/models/face_landmarker.task",
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "IMAGE",
        numFaces: 1
      });
    } catch (gpuError) {
      console.warn("GPU FaceLandmarker init failed, falling back to CPU", gpuError);
      if (filesetResolver) {
        this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "/models/face_landmarker.task",
            delegate: "CPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "IMAGE",
          numFaces: 1
        });
      } else {
        throw gpuError;
      }
    }
    
      this.isInitialized = true;
      console.log("FaceLandmarker initialized successfully");
    })().catch(e => {
      this.initPromise = null;
      throw e;
    });
    
    return this.initPromise;
  }

  async detectFaces(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<NormalizedLandmark[][]> {
    if (!this.landmarker) {
      await this.initialize();
    }
    
    if (!this.landmarker) {
       throw new Error("Landmarker not ready");
    }

    const result = this.landmarker.detect(imageElement);
    return result.faceLandmarks;
  }
}

export const faceLandmarkManager = new FaceLandmarkManager();
