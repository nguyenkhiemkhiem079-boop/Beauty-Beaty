import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export class FaceLandmarkManager {
  private landmarker: FaceLandmarker | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
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
      
      this.isInitialized = true;
      console.log("FaceLandmarker initialized successfully");
    } catch (error) {
      console.error("Failed to initialize FaceLandmarker", error);
      throw error;
    }
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
