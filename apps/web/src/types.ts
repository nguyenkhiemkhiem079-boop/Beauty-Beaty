export type ToolCategory = 'skin' | 'face' | 'eyes' | 'mouth' | 'hair' | 'adjust' | 'filters' | 'templates' | 'crop' | 'collage' | 'ai';

export type ToolType = 
  | 'skin_smooth' 
  | 'skin_brighten'
  | 'skin_blemish'
  | 'skin_oil'
  | 'skin_tone'
  | 'nasolabial'
  | 'dark_circles'
  | 'skin_detail'
  | 'eye_bags'
  | 'face_slim' 
  | 'chin_slim'
  | 'jaw_slim'
  | 'chin_vline'
  | 'face_width'
  | 'jaw_angle'
  | 'chin_length'
  | 'cheekbone_width'
  | 'body_slim'
  | 'eye_enlarge'
  | 'eye_height'
  | 'eye_length'
  | 'eye_color'
  | 'eyelid_lift'
  | 'double_eyelid'
  | 'eye_bright'
  | 'eye_catchlight'
  | 'teeth_whiten'
  | 'hair_smooth'
  | 'hair_shine'
  | 'collarbone'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'temperature'
  | 'tint'
  | 'crop'
  | 'ai_makeup';

export interface TemplateCustomText {
  title?: string;
  subtitle?: string;
  dateText?: string;
  tagline?: string;
  footer?: string;
}

export interface HealingOperation {
  id?: string;
  x: number;          // normalized x (0..1) relative to canvas
  y: number;          // normalized y (0..1) relative to canvas
  radiusNorm: number; // normalized radius relative to canvas height
}

export interface CropOperation {
  aspectRatio: 'original' | '1:1' | '4:5' | '3:4' | '9:16';
  x: number;      // normalized crop origin x in source image (0..1)
  y: number;      // normalized crop origin y in source image (0..1)
  width: number;  // normalized crop width in source image (0..1)
  height: number; // normalized crop height in source image (0..1)
}

export interface EditState {
  // Skin (B001-B012)
  skin_smooth: number;    // B001
  skin_brighten: number;  // B009 tone lift
  skin_oil: number;       // B006 oil/specular reduction
  skin_tone: number;      // B008 skin tone adjust
  nasolabial: number;     // B005 nasolabial folds
  dark_circles: number;   // B011 dark circles under eyes
  skin_detail: number;    // B010 high-freq detail restoration
  eye_bags: number;       // B012 eye bags reduction
  // Face (B013-B024)
  face_slim: number;      // B013 V-line
  chin_slim: number;      // B019 double chin
  jaw_slim: number;       // B016 jaw contour
  chin_vline: number;     // B017 chin v-shape
  face_width: number;     // B014 face width (-100..100)
  jaw_angle: number;      // B015 jaw angle (0..100)
  chin_length: number;    // B018 chin length (-100..100)
  cheekbone_width: number;// B020 cheekbone width (0..100)
  // Eyes (B025-B034)
  eye_enlarge: number;    // B025
  eye_height: number;     // B026 eye height (0..100)
  eye_length: number;     // B027 eye length (0..100)
  eye_color: string;      // B029 eye color hex
  eye_color_intensity: number; // B029 eye color intensity (0..100)
  eyelid_lift: number;    // B032 eyelid lift (0..100)
  double_eyelid: number;  // B033 double eyelid crease (0..100)
  eye_bright: number;     // B028 sclera brightening
  eye_catchlight: number; // B034 catchlight
  // Mouth (B043)
  teeth_whiten: number;   // B043
  // Hair (B063-B064)
  hair_smooth: number;    // B063
  hair_shine: number;     // B064 hair shine
  // Body (B075)
  body_slim?: number;     // B075
  // Extra features
  collarbone?: number;    // X006 collarbone definition
  // Global adjustments
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  // Filter/Template/Crop/Healing
  filter_id?: string;
  filter_intensity?: number;
  template_id?: string;
  template_custom_text?: TemplateCustomText;
  template_placement?: 'top' | 'center' | 'bottom';
  crop?: CropOperation;
  healings?: HealingOperation[];
  ai_makeup?: number;
}

export const DEFAULT_EDIT_STATE: EditState = {
  skin_smooth: 0,
  skin_brighten: 0,
  skin_oil: 0,
  skin_tone: 0,
  nasolabial: 0,
  dark_circles: 0,
  skin_detail: 0,
  eye_bags: 0,
  face_slim: 0,
  chin_slim: 0,
  jaw_slim: 0,
  chin_vline: 0,
  face_width: 0,
  jaw_angle: 0,
  chin_length: 0,
  cheekbone_width: 0,
  eye_enlarge: 0,
  eye_height: 0,
  eye_length: 0,
  eye_color: '#3d6b8c',
  eye_color_intensity: 0,
  eyelid_lift: 0,
  double_eyelid: 0,
  eye_bright: 0,
  eye_catchlight: 0,
  teeth_whiten: 0,
  hair_smooth: 0,
  hair_shine: 0,
  body_slim: 0,
  collarbone: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  filter_id: '',
  filter_intensity: 100,
  template_id: '',
  template_placement: 'top',
  crop: {
    aspectRatio: 'original',
    x: 0,
    y: 0,
    width: 1,
    height: 1
  },
  healings: []
};
