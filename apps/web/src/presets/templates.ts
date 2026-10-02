export interface PosterTemplate {
  id: string;
  name: string;
  nameVi: string;
  category: 'magazine' | 'poster' | 'polaroid' | 'minimal' | 'social' | 'album';
  aspectRatio: '3:4' | '9:16' | '1:1' | '4:5';
  title: string;
  subtitle: string;
  dateText: string;
  tagline: string;
  footer: string;
  textColor: string;
  accentColor: string;
  decorations: {
    showBarcode?: boolean;
    showBorders?: boolean;
    showLaurel?: boolean;
    showStamp?: boolean;
    showParentalBadge?: boolean;
    framePadding?: number; // percentage padding
  };
}

export const POSTER_TEMPLATES: PosterTemplate[] = [
  {
    id: 'mag_vogue',
    name: 'Vogue Haute Couture',
    nameVi: 'Bìa Thời Trang Vogue',
    category: 'magazine',
    aspectRatio: '3:4',
    title: "D'BEATY",
    subtitle: 'THE LUXURY AUTUMN ISSUE',
    dateText: 'OCTOBER 2026 / NO. 102',
    tagline: 'TIMELESS BEAUTY & MODERN AESTHETICS',
    footer: 'PARIS - MILAN - TOKYO - NEW YORK',
    textColor: '#ffffff',
    accentColor: '#d4af37',
    decorations: { showBarcode: true, showBorders: false, framePadding: 0 }
  },
  {
    id: 'mag_harper',
    name: "Harper's Elegance",
    nameVi: 'Thanh Lịch Bìa Harper',
    category: 'magazine',
    aspectRatio: '3:4',
    title: 'ELEGANCE',
    subtitle: 'EXCLUSIVE PORTRAIT EDITION',
    dateText: 'FALL / WINTER 2026',
    tagline: 'THE ART OF EFFORTLESS GRACE',
    footer: 'WWW.DBEATY.APP - SPECIAL FEATURE',
    textColor: '#f8f9fa',
    accentColor: '#e0a96d',
    decorations: { showBarcode: true, showBorders: true, framePadding: 4 }
  },
  {
    id: 'poster_cinema',
    name: 'Cinematic Masterpiece',
    nameVi: 'Poster Phim Điện Ảnh',
    category: 'poster',
    aspectRatio: '4:5',
    title: 'THE RADIANCE',
    subtitle: 'A CINEMATOGRAPHIC JOURNEY',
    dateText: 'IN THEATERS WORLDWIDE 2026',
    tagline: 'SHE FOUND HER LIGHT IN THE SHADOWS',
    footer: 'DIRECTED BY D\'BEATY STUDIOS - SOUNDTRACK BY MASTER ARTISTS',
    textColor: '#ffffff',
    accentColor: '#e63946',
    decorations: { showLaurel: true, showBarcode: false, showBorders: false }
  },
  {
    id: 'poster_music_indie',
    name: 'Indie Soundwave',
    nameVi: 'Poster Nhạc Indie',
    category: 'poster',
    aspectRatio: '3:4',
    title: 'GOLDEN NOCTURNE',
    subtitle: 'LIVE AT THE METROPOLIS',
    dateText: 'FRIDAY NIGHT / DOORS OPEN 8PM',
    tagline: 'FEATURING NEW ACOUSTIC TRACKS',
    footer: 'TICKETS & STREAMING AVAILABLE NOW',
    textColor: '#ffffff',
    accentColor: '#48cae4',
    decorations: { showBorders: true, framePadding: 6 }
  },
  {
    id: 'polaroid_classic',
    name: 'Retro Instant Film',
    nameVi: 'Khung Polaroid Cổ Điển',
    category: 'polaroid',
    aspectRatio: '3:4',
    title: 'Memories of us',
    subtitle: 'Sunny afternoon in Da Lat',
    dateText: '10.02.2026',
    tagline: 'Captured with love & nostalgia',
    footer: 'POLAROID COLOR 600',
    textColor: '#1a1a1a',
    accentColor: '#333333',
    decorations: { showBorders: true, framePadding: 8 }
  },
  {
    id: 'polaroid_script',
    name: 'Vintage Handwritten',
    nameVi: 'Chữ Ký Hoài Niệm Polaroid',
    category: 'polaroid',
    aspectRatio: '4:5',
    title: 'Forever Golden',
    subtitle: 'Moments that stay with us forever',
    dateText: 'Autumn Breeze, 2026',
    tagline: 'Live gently, love deeply',
    footer: 'INSTAX ARCHIVE SERIES',
    textColor: '#2b2d42',
    accentColor: '#8d99ae',
    decorations: { showBorders: true, framePadding: 10 }
  },
  {
    id: 'minimal_gallery',
    name: 'Modern Art Gallery',
    nameVi: 'Triển Lãm Nghệ Thuật Hiện Đại',
    category: 'minimal',
    aspectRatio: '3:4',
    title: 'PORTRAIT N° 07',
    subtitle: 'CONTEMPORARY HUMAN EXPRESSION',
    dateText: 'GALLERY EXHIBIT: 2026-2027',
    tagline: 'CURATED BY D\'BEATY COLLECTION',
    footer: 'MUSEUM OF MODERN PORTRAITURE',
    textColor: '#111827',
    accentColor: '#6b7280',
    decorations: { showBorders: true, framePadding: 12 }
  },
  {
    id: 'social_story_card',
    name: 'Modern Aesthetic Story',
    nameVi: 'Khung Story Mạng Xã Hội',
    category: 'social',
    aspectRatio: '9:16',
    title: 'TODAY\'S MOOD',
    subtitle: 'GLOWING FROM WITHIN',
    dateText: 'SUNDAY MORNING VIBES',
    tagline: 'Embrace every little moment of sunshine',
    footer: 'SWIPE UP TO DISCOVER MORE',
    textColor: '#ffffff',
    accentColor: '#ffb703',
    decorations: { showBorders: false, framePadding: 4 }
  },
  {
    id: 'social_quote_card',
    name: 'Inspirational Quote',
    nameVi: 'Trích Dẫn Nghệ Thuật',
    category: 'social',
    aspectRatio: '4:5',
    title: 'BEAUTY BEGINS',
    subtitle: 'THE MOMENT YOU DECIDE TO BE YOURSELF',
    dateText: 'D\'BEATY INSPIRATION',
    tagline: '— COCO CHANEL',
    footer: 'SHARE THE CONFIDENCE #DBEATY',
    textColor: '#ffffff',
    accentColor: '#f72585',
    decorations: { showBorders: true, framePadding: 5 }
  },
  {
    id: 'vintage_postcard',
    name: 'European Postcard',
    nameVi: 'Bưu Thiếp Du Lịch Châu Âu',
    category: 'polaroid',
    aspectRatio: '4:5',
    title: 'POSTE RESTANTE',
    subtitle: 'Greetings from the Riviera',
    dateText: 'OCT 2026 / AIR MAIL',
    tagline: 'Wish you were here with me',
    footer: 'PAR AVION - REPUBLIQUE FRANCAISE',
    textColor: '#3d342b',
    accentColor: '#b08968',
    decorations: { showStamp: true, showBorders: true, framePadding: 8 }
  },
  {
    id: 'album_cover_vinyl',
    name: 'Vinyl Record Jacket',
    nameVi: 'Bìa Đĩa Than Vinyl',
    category: 'album',
    aspectRatio: '1:1',
    title: 'VELVET ECHOES',
    subtitle: 'THE DEBUT STUDIO ALBUM',
    dateText: 'STEREO LP / 33 1/3 RPM',
    tagline: 'LIMITED EDITION COLLECTOR SERIES',
    footer: 'PRODUCED & MASTERED BY D\'BEATY LAB',
    textColor: '#ffffff',
    accentColor: '#ffd166',
    decorations: { showParentalBadge: true, showBarcode: true, showBorders: false }
  },
  {
    id: 'lifestyle_lookbook',
    name: 'Editorial Lookbook',
    nameVi: 'Sổ Mẫu Lookbook Thời Trang',
    category: 'magazine',
    aspectRatio: '3:4',
    title: 'COLLECTION 26',
    subtitle: 'MINIMALIST SILHOUETTES',
    dateText: 'CAPSULE WARDROBE',
    tagline: 'PURITY IN FORM & TEXTURE',
    footer: 'LOOK 04 / EDITION OF 100',
    textColor: '#ffffff',
    accentColor: '#a8dadc',
    decorations: { showBorders: true, framePadding: 6 }
  }
];

export interface CollageLayout {
  id: string;
  name: string;
  nameVi: string;
  aspectRatio: '1:1' | '4:3' | '3:4' | '9:16';
  slots: Array<{
    x: number;      // percentage (0-100)
    y: number;      // percentage (0-100)
    width: number;  // percentage (0-100)
    height: number; // percentage (0-100)
  }>;
}

export const COLLAGE_LAYOUTS: CollageLayout[] = [
  {
    id: 'grid_2_vert',
    name: '2 Photos Vertical',
    nameVi: '2 Ảnh Cột Dọc',
    aspectRatio: '1:1',
    slots: [
      { x: 0, y: 0, width: 50, height: 100 },
      { x: 50, y: 0, width: 50, height: 100 }
    ]
  },
  {
    id: 'grid_2_horiz',
    name: '2 Photos Horizontal',
    nameVi: '2 Ảnh Hàng Ngang',
    aspectRatio: '1:1',
    slots: [
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 0, y: 50, width: 100, height: 50 }
    ]
  },
  {
    id: 'grid_3_hero',
    name: '3 Photos (1 Hero + 2 Stacked)',
    nameVi: '3 Ảnh (1 Chính + 2 Phụ)',
    aspectRatio: '4:3',
    slots: [
      { x: 0, y: 0, width: 60, height: 100 },
      { x: 60, y: 0, width: 40, height: 50 },
      { x: 60, y: 50, width: 40, height: 50 }
    ]
  },
  {
    id: 'grid_4_square',
    name: '4 Photos 2x2 Grid',
    nameVi: '4 Ảnh Lưới 2x2',
    aspectRatio: '1:1',
    slots: [
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 50, y: 0, width: 50, height: 50 },
      { x: 0, y: 50, width: 50, height: 50 },
      { x: 50, y: 50, width: 50, height: 50 }
    ]
  },
  {
    id: 'grid_3_strip',
    name: '3 Photos Filmstrip',
    nameVi: '3 Ảnh Dải Phim Ngang',
    aspectRatio: '4:3',
    slots: [
      { x: 0, y: 0, width: 33.33, height: 100 },
      { x: 33.33, y: 0, width: 33.33, height: 100 },
      { x: 66.66, y: 0, width: 33.34, height: 100 }
    ]
  },
  {
    id: 'grid_6_editorial',
    name: '6 Photos Editorial Grid',
    nameVi: '6 Ảnh Tạp Chí 3x2',
    aspectRatio: '3:4',
    slots: [
      { x: 0, y: 0, width: 50, height: 33.33 },
      { x: 50, y: 0, width: 50, height: 33.33 },
      { x: 0, y: 33.33, width: 50, height: 33.33 },
      { x: 50, y: 33.33, width: 50, height: 33.33 },
      { x: 0, y: 66.66, width: 50, height: 33.34 },
      { x: 50, y: 66.66, width: 50, height: 33.34 }
    ]
  }
];
