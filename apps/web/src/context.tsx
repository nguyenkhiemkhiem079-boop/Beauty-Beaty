import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type ToolCategory = 'skin' | 'face' | 'hair' | 'body' | 'ai';
export type ToolType = 'skin_smooth' | 'face_slim' | 'hair_smooth' | 'chin_slim' | 'ai_makeup';

export interface EditState {
  skin_smooth: number;
  face_slim: number;
  hair_smooth: number;
  chin_slim: number;
  ai_makeup?: number;
}

interface AppContextType {
  imageSrc: string | null;
  setImageSrc: (src: string | null) => void;
  originalImage: HTMLImageElement | null;
  setOriginalImage: (img: HTMLImageElement | null) => void;
  editState: EditState;
  setEditState: (state: EditState | ((prev: EditState) => EditState)) => void;
  history: EditState[];
  setHistory: (history: EditState[]) => void;
  historyIndex: number;
  setHistoryIndex: (index: number) => void;
  landmarks: NormalizedLandmark[][] | null;
  setLandmarks: (landmarks: NormalizedLandmark[][] | null) => void;
  segmentationMask: Uint8Array | null;
  setSegmentationMask: (mask: Uint8Array | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  
  const [editState, setEditState] = useState<EditState>({ skin_smooth: 0, face_slim: 0, hair_smooth: 0, chin_slim: 0 });
  const [history, setHistory] = useState<EditState[]>([{ skin_smooth: 0, face_slim: 0, hair_smooth: 0, chin_slim: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[][] | null>(null);
  const [segmentationMask, setSegmentationMask] = useState<Uint8Array | null>(null);

  return (
    <AppContext.Provider value={{
      imageSrc, setImageSrc,
      originalImage, setOriginalImage,
      editState, setEditState,
      history, setHistory,
      historyIndex, setHistoryIndex,
      landmarks, setLandmarks,
      segmentationMask, setSegmentationMask
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
