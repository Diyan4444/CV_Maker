export interface ColorToken {
  hex: string;
  name: string;
}

export interface Palette {
  id: 'mist' | 'wine' | 'ink' | 'forest';
  name: string;
  description: string;
  raw: {
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    c5: string;
    c6: string;
  };
  semantic: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    borderMuted: string;
    text: string;
    textMuted: string;
    accent: string;
    accentHover: string;
  };
}

export const PALETTES: Record<Palette['id'], Palette> = {
  // Mist: Default App / Editor Theme
  // Raw: #F7CBCA (1), #DDD3D3 (2), #F1F7F7 (3), #D5E5E5 (4), #BDD7D8 (5), #5D6B6B (6)
  mist: {
    id: 'mist',
    name: 'Mist',
    description: 'Default editor and app theme with calm, mineral tones',
    raw: {
      c1: '#F7CBCA',
      c2: '#DDD3D3',
      c3: '#F1F7F7',
      c4: '#D5E5E5',
      c5: '#BDD7D8',
      c6: '#5D6B6B',
    },
    semantic: {
      bg: '#F1F7F7',         // c3: Clean mineral background
      surface: '#FFFFFF',    // Documented neutral surface card (outside palette)
      surfaceAlt: '#D5E5E5', // c4: Subtle secondary container
      border: '#BDD7D8',     // c5: Crisp card/input borders
      borderMuted: '#DDD3D3',// c2: Divider borders
      text: '#1A2424',       // Documented neutral text outside palette (Passing AA 14.7:1 on bg)
      textMuted: '#5D6B6B',  // c6: Muted labels/helpers (Passing AA 5.13:1 on bg)
      accent: '#5D6B6B',     // c6: Pure palette color used as accent (Passing AA 5.13:1 on bg)
      accentHover: '#5D6B6B',
    },
  },

  // Wine: Accent editorial theme
  // Raw: #800021 (1), #881144 (2), #243A66 (3), #C24366 (4), #FF69B4 (5), #FFE4D8 (6)
  wine: {
    id: 'wine',
    name: 'Wine',
    description: 'Editorial wine and ink theme for publications and literary profiles',
    raw: {
      c1: '#800021',
      c2: '#881144',
      c3: '#243A66',
      c4: '#C24366',
      c5: '#FF69B4',
      c6: '#FFE4D8',
    },
    semantic: {
      bg: '#FFE4D8',         // c6: Warm parchment background
      surface: '#FFFFFF',    // White content cards
      surfaceAlt: '#FDEEE6', // Slightly tinted parchment container
      border: '#C24366',     // c4: Accent rules & outlines
      borderMuted: '#EBC7B8',// Soft divider
      text: '#800021',       // c1: Deep wine text (Passing AA 7.2:1 against bg)
      textMuted: '#243A66',  // c3: Navy slate for secondary text (Passing AA 7.8:1 against bg)
      accent: '#881144',     // c2: Rich crimson for primary CTAs (Passing AA 6.7:1 against bg)
      accentHover: '#800021',
    },
  },

  // Ink: High-contrast Dark Mode
  // Raw: #0B0B0B (1), #1A1A1A (2), #333333 (3), #6B6B6B (4), #D9D9D9 (5), #FFFFFF (6)
  ink: {
    id: 'ink',
    name: 'Ink',
    description: 'Minimalist editorial monochrome dark theme',
    raw: {
      c1: '#0B0B0B',
      c2: '#1A1A1A',
      c3: '#333333',
      c4: '#6B6B6B',
      c5: '#D9D9D9',
      c6: '#FFFFFF',
    },
    semantic: {
      bg: '#0B0B0B',         // c1: Deep near-black
      surface: '#1A1A1A',    // c2: Elevated cards
      surfaceAlt: '#333333', // c3: Hover states & input backgrounds
      border: '#333333',     // c3: Subtle dark borders
      borderMuted: '#262626',
      text: '#FFFFFF',       // c6: Crisp white text (Passing AA 18.2:1 against bg)
      textMuted: '#D9D9D9',  // c5: Silver muted text (Passing AA 13.1:1 against bg)
      accent: '#FFFFFF',     // Clean stark white accent
      accentHover: '#D9D9D9',
    },
  },

  // Forest: Rich botanical theme
  // Raw: #051F20 (1), #0B2B26 (2), #163832 (3), #235347 (4), #8EB69B (5), #DAF1DE (6)
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Grounded deep botanical and sage theme',
    raw: {
      c1: '#051F20',
      c2: '#0B2B26',
      c3: '#163832',
      c4: '#235347',
      c5: '#8EB69B',
      c6: '#DAF1DE',
    },
    semantic: {
      bg: '#DAF1DE',         // c6: Pale mint background
      surface: '#FFFFFF',    // Crisp white cards
      surfaceAlt: '#CFE9D4', // Soft mint panel
      border: '#8EB69B',     // c5: Sage borders
      borderMuted: '#B9DEC2',
      text: '#051F20',       // c1: Deep pine text (Passing AA 12.8:1 against bg)
      textMuted: '#235347',  // c4: Dark moss secondary text (Passing AA 6.1:1 against bg)
      accent: '#163832',     // c3: Deep forest buttons/tags (Passing AA 9.5:1 against bg)
      accentHover: '#0B2B26',
    },
  },
};
