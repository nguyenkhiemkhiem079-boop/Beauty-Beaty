export type ToolCategory = 'skin' | 'face' | 'eyes' | 'mouth' | 'hair' | 'body' | 'adjust' | 'filters' | 'templates' | 'crop' | 'collage' | 'ai' | 'makeup';

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
  | 'makeup_preset'
  | 'makeup_lipstick'
  | 'makeup_blush'
  | 'makeup_eyeshadow'
  | 'makeup_eyeliner'
  | 'makeup_contour'
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
  // Local-capable algorithmic feature parameters
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
  makeup_lipstick?: number;
  makeup_lipstick_color?: string;
  makeup_blush?: number;
  makeup_blush_color?: string;
  makeup_contour?: number;
  makeup_eyeshadow?: number;
  makeup_eyeshadow_color?: string;
  makeup_eyeliner?: number;
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
  healings: [],
  skin_blemish_reduction: 0,
  wrinkle_reduction: 0,
  skin_evening: 0,
  midface_ratio: 0,
  lower_face_ratio: 0,
  forehead_height: 0,
  head_scale: 0,
  gaze_direction: 0,
  nose_size: 0,
  nose_tip: 0,
  lip_position: 0,
  lip_tilt: 0,
  eyebrow_height: 0,
  eyebrow_spacing: 0,
  eyebrow_tilt: 0,
  eyebrow_arch: 0,
  eyebrow_color: '#3b2f2f',
  eyebrow_color_intensity: 0,
  lip_finish: 'gloss',
  lip_finish_intensity: 0,
  lip_liner: 0,
  eyeshadow_color: '#8b4513',
  eyeshadow_intensity: 0,
  eyeliner: 0,
  false_lashes: 0,
  makeup_preset: '',
  makeup_preset_intensity: 0,
  hair_flyaway: 0,
  hair_highlight: '#d4af37',
  hair_highlight_intensity: 0,
  hairline_adjust: 0,
  crown_volume: 0,
  hair_fill: 0,
  bangs_preview: 0,
  arm_slim: 0,
  leg_slim: 0,
  height_stretch: 0,
  hip_shape: 0,
  tummy_tuck: 0,
  forehead_width: 0,
  eye_spacing: 0,
  chest_volume: 0,
  buttock_volume: 0,
  magic_sky: '',
  magic_sky_intensity: 0,
  lens_film_effects: 0
};
