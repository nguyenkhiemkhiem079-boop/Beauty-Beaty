export type ToolCategory = 'skin' | 'face' | 'eyes' | 'mouth' | 'hair' | 'adjust' | 'filters' | 'templates' | 'ai';

export type ToolType = 
  | 'skin_smooth' 
  | 'skin_brighten'
  | 'face_slim' 
  | 'chin_slim' 
  | 'eye_enlarge'
  | 'teeth_whiten'
  | 'hair_smooth' 
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'temperature'
  | 'ai_makeup';

export interface EditState {
  skin_smooth: number;
  skin_brighten: number;
  face_slim: number;
  chin_slim: number;
  eye_enlarge: number;
  teeth_whiten: number;
  hair_smooth: number;
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  filter_id?: string;
  filter_intensity?: number;
  template_id?: string;
  ai_makeup?: number;
}

export const DEFAULT_EDIT_STATE: EditState = {
  skin_smooth: 0,
  skin_brighten: 0,
  face_slim: 0,
  chin_slim: 0,
  eye_enlarge: 0,
  teeth_whiten: 0,
  hair_smooth: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  filter_id: '',
  filter_intensity: 100,
  template_id: ''
};
