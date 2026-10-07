import { 
  Droplets, Sparkles, Minimize, Eye, Smile, 
  Palette, CircleDot, Scissors, UserRound, Sliders 
} from 'lucide-react';
import type { ToolType, ToolCategory, EditState } from '../types';

export type ToolControlType = 'slider' | 'bidirectional_slider' | 'color_picker' | 'brush' | 'crop';
export type ToolAvailability = 'available' | 'coming_soon';

export interface PublicToolDef {
  id: ToolType;
  name: string;
  desc: string;
  category: ToolCategory;
  subgroup: string;
  iconKey: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  controlType: ToolControlType;
  min: number;
  max: number;
  step: number;
  default: number;
  availability: ToolAvailability;
  searchTerms: string[];
}

export const PUBLIC_TOOLS: PublicToolDef[] = [
  // --- SKIN ---
  {
    id: 'skin_smooth',
    name: 'Mịn da',
    desc: 'Làm mịn bề mặt da tự nhiên, bảo toàn kết cấu vi mô.',
    category: 'skin',
    subgroup: 'Làn da',
    iconKey: 'droplets',
    icon: Droplets,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['da', 'min da', 'smooth', 'lam min', 'soften']
  },
  {
    id: 'skin_brighten',
    name: 'Sáng da',
    desc: 'Nâng sáng vùng da tối màu mà không làm cháy sáng.',
    category: 'skin',
    subgroup: 'Làn da',
    iconKey: 'sparkles',
    icon: Sparkles,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['da', 'sang da', 'brighten', 'trang da', 'tone']
  },
  {
    id: 'skin_oil',
    name: 'Giảm bóng dầu',
    desc: 'Khử vùng phản xạ bóng nhờn, mang lại bề mặt da lì mịn màng.',
    category: 'skin',
    subgroup: 'Làn da',
    iconKey: 'droplets',
    icon: Droplets,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['da', 'dau', 'bong dau', 'matte', 'kiem dau', 'oil', 'giam bong dau', 'khu bong dau']
  },
  {
    id: 'skin_tone',
    name: 'Tông da',
    desc: 'Điều chỉnh sắc thái da ấm hoặc trắng hồng tươi tắn.',
    category: 'skin',
    subgroup: 'Làn da',
    iconKey: 'palette',
    icon: Palette,
    controlType: 'bidirectional_slider',
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['da', 'tong da', 'trang hong', 'am', 'tone', 'warmth']
  },
  {
    id: 'skin_detail',
    name: 'Chi tiết da',
    desc: 'Khôi phục vi chi tiết lỗ chân lông tự nhiên sau khi làm mịn.',
    category: 'skin',
    subgroup: 'Làn da',
    iconKey: 'sparkles',
    icon: Sparkles,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['da', 'chi tiet', 'lo chan long', 'texture', 'detail']
  },
  {
    id: 'skin_blemish',
    name: 'Xóa khuyết điểm',
    desc: 'Chấm cọ trực tiếp lên nốt mụn để xóa sạch tự nhiên.',
    category: 'skin',
    subgroup: 'Khuyết điểm',
    iconKey: 'circle_dot',
    icon: CircleDot,
    controlType: 'brush',
    min: 8,
    max: 40,
    step: 1,
    default: 16,
    availability: 'available',
    searchTerms: ['mun', 'tham', 'khuyet diem', 'xoa mun', 'xoa khuyet diem', 'blemish', 'spot']
  },
  {
    id: 'nasolabial',
    name: 'Giảm rãnh cười',
    desc: 'Làm mờ nếp gấp rãnh cười sâu giữa mũi và khóe miệng.',
    category: 'skin',
    subgroup: 'Khuyết điểm',
    iconKey: 'smile',
    icon: Smile,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['ranh cuoi', 'giam ranh cuoi', 'nep nhan', 'khoe mieng', 'smile line', 'nasolabial']
  },
  {
    id: 'dark_circles',
    name: 'Giảm quầng thâm',
    desc: 'Khử sắc tối và làm sáng bừng vùng da dưới mắt.',
    category: 'skin',
    subgroup: 'Khuyết điểm',
    iconKey: 'eye',
    icon: Eye,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['tham mat', 'quang tham', 'giam quang tham', 'mat', 'dark circles', 'eye']
  },
  {
    id: 'eye_bags',
    name: 'Giảm bọng mắt',
    desc: 'Co gọn nhẹ nhàng bọng mỡ dưới mí mắt.',
    category: 'skin',
    subgroup: 'Khuyết điểm',
    iconKey: 'eye',
    icon: Eye,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['bong mat', 'giam bong mat', 'mo mat', 'eye bags', 'mat']
  },

  // --- FACE ---
  {
    id: 'face_slim',
    name: 'Thon mặt',
    desc: 'Thu gọn hai bên má tạo dáng mặt thanh thoát.',
    category: 'face',
    subgroup: 'Dáng mặt',
    iconKey: 'minimize',
    icon: Minimize,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['mat', 'thon mat', 'gop mat', 'slim', 'face slim']
  },
  {
    id: 'face_width',
    name: 'Độ rộng khuôn mặt',
    desc: 'Điều chỉnh khuôn mặt thon gọn hoặc đầy đặn hơn.',
    category: 'face',
    subgroup: 'Dáng mặt',
    iconKey: 'minimize',
    icon: Minimize,
    controlType: 'bidirectional_slider',
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['mat', 'rong mat', 'be rong', 'khuon mat', 'face width']
  },
  {
    id: 'cheekbone_width',
    name: 'Gò má',
    desc: 'Hạ xương gò má nhô cao giúp đường nét mềm mại.',
    category: 'face',
    subgroup: 'Dáng mặt',
    iconKey: 'minimize',
    icon: Minimize,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['go ma', 'ha go ma', 'cheekbone', 'mat']
  },
  {
    id: 'jaw_angle',
    name: 'Góc hàm',
    desc: 'Điều chỉnh góc xương hàm mềm mại hoặc góc cạnh.',
    category: 'face',
    subgroup: 'Hàm & cằm',
    iconKey: 'minimize',
    icon: Minimize,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['ham', 'goc ham', 'quai ham', 'jaw angle', 'jaw']
  },
  {
    id: 'jaw_slim',
    name: 'Đường viền hàm',
    desc: 'Nâng và vuốt gọn đường viền hàm dưới từ cằm tới mang tai.',
    category: 'face',
    subgroup: 'Hàm & cằm',
    iconKey: 'minimize',
    icon: Minimize,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['vien ham', 'duong ham', 'jaw slim', 'cam']
  },
  {
    id: 'chin_vline',
    name: 'Cằm V-line',
    desc: 'Thu hẹp đỉnh cằm tạo hình chữ V thanh tú.',
    category: 'face',
    subgroup: 'Hàm & cằm',
    iconKey: 'minimize',
    icon: Minimize,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['cam', 'v-line', 'vline', 'cam vline', 'chin']
  },
  {
    id: 'chin_length',
    name: 'Độ dài cằm',
    desc: 'Kéo dài hoặc thu ngắn cằm theo tỷ lệ khuôn mặt.',
    category: 'face',
    subgroup: 'Hàm & cằm',
    iconKey: 'minimize',
    icon: Minimize,
    controlType: 'bidirectional_slider',
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['cam', 'do dai cam', 'chin length', 'dai cam', 'ngan cam']
  },
  {
    id: 'chin_slim',
    name: 'Giảm nọng cằm',
    desc: 'Nâng mô mỡ dưới cằm, giảm nọng rõ rệt.',
    category: 'face',
    subgroup: 'Hàm & cằm',
    iconKey: 'minimize',
    icon: Minimize,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['nong cam', 'giam nong', 'chin slim', 'double chin', 'cam']
  },

  // --- EYES ---
  {
    id: 'eye_enlarge',
    name: 'Mắt to',
    desc: 'Phóng to đôi mắt tự nhiên, long lanh hơn.',
    category: 'eyes',
    subgroup: 'Hình dáng mắt',
    iconKey: 'eye',
    icon: Eye,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['mat', 'mat to', 'phong to mat', 'eye enlarge', 'big eyes']
  },
  {
    id: 'eye_height',
    name: 'Chiều cao mắt',
    desc: 'Mở rộng mí mắt trên và dưới theo chiều dọc.',
    category: 'eyes',
    subgroup: 'Hình dáng mắt',
    iconKey: 'eye',
    icon: Eye,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['mat', 'chieu cao mat', 'mo mat', 'eye height']
  },
  {
    id: 'eye_length',
    name: 'Chiều dài mắt',
    desc: 'Kéo dài đuôi mắt về phía thái dương sắc sảo.',
    category: 'eyes',
    subgroup: 'Hình dáng mắt',
    iconKey: 'eye',
    icon: Eye,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['mat', 'chieu dai mat', 'duoi mat', 'eye length']
  },
  {
    id: 'eyelid_lift',
    name: 'Nâng mí',
    desc: 'Nâng mí mắt trên đỡ sụp, tạo ánh nhìn tươi trẻ.',
    category: 'eyes',
    subgroup: 'Hình dáng mắt',
    iconKey: 'eye',
    icon: Eye,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['mi', 'nang mi', 'sup mi', 'eyelid lift', 'mat']
  },
  {
    id: 'eye_color',
    name: 'Màu mắt',
    desc: 'Đổi màu kính áp tròng tự nhiên với bảng màu chọn lọc.',
    category: 'eyes',
    subgroup: 'Trang điểm mắt',
    iconKey: 'palette',
    icon: Palette,
    controlType: 'color_picker',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['mau mat', 'lens', 'kinh ap trong', 'eye color', 'mat']
  },
  {
    id: 'double_eyelid',
    name: 'Mí đôi',
    desc: 'Tạo đường nếp mí đôi mềm mại uốn cong theo dáng mắt.',
    category: 'eyes',
    subgroup: 'Trang điểm mắt',
    iconKey: 'sparkles',
    icon: Sparkles,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['mi doi', '2 mi', 'cat mi', 'double eyelid', 'mat']
  },
  {
    id: 'eye_bright',
    name: 'Sáng mắt',
    desc: 'Tăng độ trong trẻo cho lòng trắng mắt, khử ánh đỏ.',
    category: 'eyes',
    subgroup: 'Trang điểm mắt',
    iconKey: 'eye',
    icon: Eye,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['sang mat', 'long trang', 'eye bright', 'mat']
  },
  {
    id: 'eye_catchlight',
    name: 'Điểm sáng',
    desc: 'Thêm điểm sáng phản chiếu long lanh trong con ngươi.',
    category: 'eyes',
    subgroup: 'Trang điểm mắt',
    iconKey: 'sparkles',
    icon: Sparkles,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['diem sang', 'con nguoi', 'catchlight', 'long lanh', 'mat']
  },

  // --- MOUTH ---
  {
    id: 'teeth_whiten',
    name: 'Trắng răng',
    desc: 'Khử sắc vàng xỉn trong khoang miệng, mang lại nụ cười rạng ngời.',
    category: 'mouth',
    subgroup: 'Nụ cười',
    iconKey: 'smile',
    icon: Smile,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['rang', 'trang rang', 'nu cuoi', 'teeth whiten', 'teeth']
  },

  // --- HAIR ---
  {
    id: 'hair_smooth',
    name: 'Mượt tóc',
    desc: 'Làm mềm mượt và giảm xơ rối cho mái tóc.',
    category: 'hair',
    subgroup: 'Chăm sóc tóc',
    iconKey: 'scissors',
    icon: Scissors,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['toc', 'muot toc', 'giam xo', 'hair smooth', 'hair']
  },
  {
    id: 'hair_shine',
    name: 'Bóng tóc',
    desc: 'Tăng ánh sáng bóng khỏe, chuẩn salon cho mái tóc.',
    category: 'hair',
    subgroup: 'Chăm sóc tóc',
    iconKey: 'sparkles',
    icon: Sparkles,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['toc', 'bong toc', 'hair shine', 'hair']
  },

  // --- BODY ---
  {
    id: 'body_slim',
    name: 'Thon eo',
    desc: 'Thu nhỏ vòng eo thon gọn và cân đối.',
    category: 'body',
    subgroup: 'Vóc dáng',
    iconKey: 'user_round',
    icon: UserRound,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['eo', 'thon eo', 'voc dang', 'body slim', 'body']
  },
  {
    id: 'collarbone',
    name: 'Xương quai xanh',
    desc: 'Tôn rõ đường xương quai xanh quyến rũ.',
    category: 'body',
    subgroup: 'Vóc dáng',
    iconKey: 'user_round',
    icon: UserRound,
    controlType: 'slider',
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['xuong quai xanh', 'quai xanh', 'collarbone', 'body']
  },

  // --- ADJUST ---
  {
    id: 'brightness',
    name: 'Độ sáng',
    desc: 'Điều chỉnh ánh sáng tổng thể của bức ảnh.',
    category: 'adjust',
    subgroup: 'Ánh sáng & Màu sắc',
    iconKey: 'sliders',
    icon: Sliders,
    controlType: 'bidirectional_slider',
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['sang', 'do sang', 'brightness', 'anh sang']
  },
  {
    id: 'contrast',
    name: 'Độ tương phản',
    desc: 'Tăng giảm độ tương phản giữa vùng sáng và vùng tối.',
    category: 'adjust',
    subgroup: 'Ánh sáng & Màu sắc',
    iconKey: 'sliders',
    icon: Sliders,
    controlType: 'bidirectional_slider',
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['tuong phan', 'contrast']
  },
  {
    id: 'saturation',
    name: 'Độ bão hòa',
    desc: 'Điều chỉnh độ rực rỡ của các gam màu.',
    category: 'adjust',
    subgroup: 'Ánh sáng & Màu sắc',
    iconKey: 'sliders',
    icon: Sliders,
    controlType: 'bidirectional_slider',
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['bao hoa', 'saturation', 'mau sac']
  },
  {
    id: 'temperature',
    name: 'Nhiệt độ màu',
    desc: 'Cân bằng sắc ấm vàng nắng hoặc mát xanh dịu.',
    category: 'adjust',
    subgroup: 'Ánh sáng & Màu sắc',
    iconKey: 'sliders',
    icon: Sliders,
    controlType: 'bidirectional_slider',
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['nhiet do', 'am', 'lanh', 'temperature']
  },
  {
    id: 'tint',
    name: 'Sắc thái màu',
    desc: 'Tinh chỉnh sắc thái màu ngả xanh lá hoặc tím hồng.',
    category: 'adjust',
    subgroup: 'Ánh sáng & Màu sắc',
    iconKey: 'sliders',
    icon: Sliders,
    controlType: 'bidirectional_slider',
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    availability: 'available',
    searchTerms: ['sac thai', 'tint', 'hong', 'xanh']
  }
];

export const TOOL_MAP: Record<string, PublicToolDef> = Object.fromEntries(
  PUBLIC_TOOLS.map(t => [t.id, t])
);

/**
 * Type-safe getter for tool value in EditState without `any` casts.
 */
export function getToolValue(state: EditState, toolId: ToolType): number {
  switch (toolId) {
    case 'skin_smooth': return state.skin_smooth;
    case 'skin_brighten': return state.skin_brighten;
    case 'skin_oil': return state.skin_oil;
    case 'skin_tone': return state.skin_tone;
    case 'nasolabial': return state.nasolabial;
    case 'dark_circles': return state.dark_circles;
    case 'skin_detail': return state.skin_detail;
    case 'eye_bags': return state.eye_bags;
    case 'face_slim': return state.face_slim;
    case 'chin_slim': return state.chin_slim;
    case 'jaw_slim': return state.jaw_slim;
    case 'chin_vline': return state.chin_vline;
    case 'face_width': return state.face_width;
    case 'jaw_angle': return state.jaw_angle;
    case 'chin_length': return state.chin_length;
    case 'cheekbone_width': return state.cheekbone_width;
    case 'body_slim': return state.body_slim ?? 0;
    case 'collarbone': return state.collarbone ?? 0;
    case 'eye_enlarge': return state.eye_enlarge;
    case 'eye_height': return state.eye_height;
    case 'eye_length': return state.eye_length;
    case 'eye_color': return state.eye_color_intensity ?? 0;
    case 'eyelid_lift': return state.eyelid_lift;
    case 'double_eyelid': return state.double_eyelid;
    case 'eye_bright': return state.eye_bright;
    case 'eye_catchlight': return state.eye_catchlight;
    case 'teeth_whiten': return state.teeth_whiten;
    case 'hair_smooth': return state.hair_smooth;
    case 'hair_shine': return state.hair_shine;
    case 'brightness': return state.brightness;
    case 'contrast': return state.contrast;
    case 'saturation': return state.saturation;
    case 'temperature': return state.temperature;
    case 'tint': return state.tint;
    default: return 0;
  }
}

/**
 * Type-safe setter for tool value in EditState without `any` casts.
 */
export function setToolValue(state: EditState, toolId: ToolType, value: number): EditState {
  switch (toolId) {
    case 'skin_smooth': return { ...state, skin_smooth: value };
    case 'skin_brighten': return { ...state, skin_brighten: value };
    case 'skin_oil': return { ...state, skin_oil: value };
    case 'skin_tone': return { ...state, skin_tone: value };
    case 'nasolabial': return { ...state, nasolabial: value };
    case 'dark_circles': return { ...state, dark_circles: value };
    case 'skin_detail': return { ...state, skin_detail: value };
    case 'eye_bags': return { ...state, eye_bags: value };
    case 'face_slim': return { ...state, face_slim: value };
    case 'chin_slim': return { ...state, chin_slim: value };
    case 'jaw_slim': return { ...state, jaw_slim: value };
    case 'chin_vline': return { ...state, chin_vline: value };
    case 'face_width': return { ...state, face_width: value };
    case 'jaw_angle': return { ...state, jaw_angle: value };
    case 'chin_length': return { ...state, chin_length: value };
    case 'cheekbone_width': return { ...state, cheekbone_width: value };
    case 'body_slim': return { ...state, body_slim: value };
    case 'collarbone': return { ...state, collarbone: value };
    case 'eye_enlarge': return { ...state, eye_enlarge: value };
    case 'eye_height': return { ...state, eye_height: value };
    case 'eye_length': return { ...state, eye_length: value };
    case 'eye_color': return { ...state, eye_color_intensity: value };
    case 'eyelid_lift': return { ...state, eyelid_lift: value };
    case 'double_eyelid': return { ...state, double_eyelid: value };
    case 'eye_bright': return { ...state, eye_bright: value };
    case 'eye_catchlight': return { ...state, eye_catchlight: value };
    case 'teeth_whiten': return { ...state, teeth_whiten: value };
    case 'hair_smooth': return { ...state, hair_smooth: value };
    case 'hair_shine': return { ...state, hair_shine: value };
    case 'brightness': return { ...state, brightness: value };
    case 'contrast': return { ...state, contrast: value };
    case 'saturation': return { ...state, saturation: value };
    case 'temperature': return { ...state, temperature: value };
    case 'tint': return { ...state, tint: value };
    default: return state;
  }
}

/**
 * Type-safe reset for an individual tool in EditState.
 */
export function resetToolValue(state: EditState, toolId: ToolType): EditState {
  if (toolId === 'eye_color') {
    return { ...state, eye_color: '#3d6b8c', eye_color_intensity: 0 };
  }
  if (toolId === 'skin_blemish') {
    return { ...state, healings: [] };
  }
  return setToolValue(state, toolId, 0);
}

/**
 * Type-safe reset for all tools in a specific category.
 */
export function resetCategoryValues(state: EditState, category: ToolCategory): EditState {
  const next = { ...state };
  if (category === 'skin') {
    next.skin_smooth = 0;
    next.skin_brighten = 0;
    next.skin_oil = 0;
    next.skin_tone = 0;
    next.nasolabial = 0;
    next.dark_circles = 0;
    next.skin_detail = 0;
    next.eye_bags = 0;
    next.healings = [];
  } else if (category === 'face') {
    next.face_slim = 0;
    next.chin_slim = 0;
    next.jaw_slim = 0;
    next.chin_vline = 0;
    next.face_width = 0;
    next.jaw_angle = 0;
    next.chin_length = 0;
    next.cheekbone_width = 0;
  } else if (category === 'body') {
    next.body_slim = 0;
    next.collarbone = 0;
  } else if (category === 'eyes') {
    next.eye_enlarge = 0;
    next.eye_height = 0;
    next.eye_length = 0;
    next.eye_color = '#3d6b8c';
    next.eye_color_intensity = 0;
    next.eyelid_lift = 0;
    next.double_eyelid = 0;
    next.eye_bright = 0;
    next.eye_catchlight = 0;
  } else if (category === 'mouth') {
    next.teeth_whiten = 0;
  } else if (category === 'hair') {
    next.hair_smooth = 0;
    next.hair_shine = 0;
  } else if (category === 'adjust') {
    next.brightness = 0;
    next.contrast = 0;
    next.saturation = 0;
    next.temperature = 0;
    next.tint = 0;
  } else if (category === 'filters') {
    next.filter_id = undefined;
    next.filter_intensity = 0;
  } else if (category === 'templates') {
    next.template_id = undefined;
    next.template_custom_text = undefined;
  }
  return next;
}
