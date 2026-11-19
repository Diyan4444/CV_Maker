import { PaletteKey, PALETTE_RAMPS } from '@/lib/color/oklab';

export interface AnchorConfig {
  palette: PaletteKey;
  /** Normalized position [x, y] in range [0, 1] */
  position: [number, number];
  /** Influence radius (normalized) */
  radius: number;
  /** Relative anchor weight */
  weight: number;
}

export interface MotionConfig {
  driftSpeed: number;
  driftAmplitude: number;
  orbitRadius: number;
  pointerSensitivity: number;
  pointerBloom: number;
}

export interface BackgroundRecipe {
  id: string;
  name: string;
  description: string;
  pathPattern: string | RegExp;
  anchors: AnchorConfig[];
  motion: MotionConfig;
  /** Pre-computed static CSS gradient fallback (for SSR and WebGL fallback) */
  fallbackCss: string;
}

// Normal motion profile
const NORMAL_MOTION: MotionConfig = {
  driftSpeed: 0.035,
  driftAmplitude: 0.075,
  orbitRadius: 0.045,
  pointerSensitivity: 0.06,
  pointerBloom: 0.065,
};

// Calm mode profile (for editor, privacy, etc.)
const CALM_MOTION: MotionConfig = {
  driftSpeed: 0.015,
  driftAmplitude: 0.028,
  orbitRadius: 0.018,
  pointerSensitivity: 0.02,
  pointerBloom: 0.03,
};

/**
 * Helper to build an attractive, deterministic CSS gradient fallback
 * using the exact anchor positions and the palette ramp colors.
 */
function generateFallbackCss(anchors: AnchorConfig[]): string {
  const layers = anchors.map((a) => {
    const ramp = PALETTE_RAMPS[a.palette];
    const deepest = ramp.stops[0].hex;
    const lightest = ramp.stops[ramp.stops.length - 1].hex;
    const xPct = Math.round(a.position[0] * 100);
    const yPct = Math.round(a.position[1] * 100);
    const radPct = Math.round(a.radius * 70);
    return `radial-gradient(circle at ${xPct}% ${yPct}%, ${lightest} 0%, ${deepest} 85%, transparent ${radPct}%)`;
  });
  return `${layers.join(', ')}, #F1F7F7`;
}

export const BACKGROUND_RECIPES: Record<string, BackgroundRecipe> = {
  profile: {
    id: 'profile',
    name: 'Master Profile',
    description: 'P1 (Wine) top-left, P4 (Mist) bottom-right',
    pathPattern: '^/profile',
    anchors: [
      { palette: 'P1', position: [0.0, 0.0], radius: 1.1, weight: 1.0 },
      { palette: 'P4', position: [1.0, 1.0], radius: 1.1, weight: 1.0 },
    ],
    motion: NORMAL_MOTION,
    fallbackCss: generateFallbackCss([
      { palette: 'P1', position: [0.0, 0.0], radius: 1.1, weight: 1.0 },
      { palette: 'P4', position: [1.0, 1.0], radius: 1.1, weight: 1.0 },
    ]),
  },

  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'P1, P2, P3 evenly spaced 120° around center (no P4)',
    pathPattern: '^/dashboard',
    anchors: [
      { palette: 'P1', position: [0.5, 0.12], radius: 1.0, weight: 1.0 }, // Top (270°)
      { palette: 'P2', position: [0.83, 0.69], radius: 1.0, weight: 1.0 }, // Bottom Right (30°)
      { palette: 'P3', position: [0.17, 0.69], radius: 1.0, weight: 1.0 }, // Bottom Left (150°)
    ],
    motion: NORMAL_MOTION,
    fallbackCss: generateFallbackCss([
      { palette: 'P1', position: [0.5, 0.12], radius: 1.0, weight: 1.0 },
      { palette: 'P2', position: [0.83, 0.69], radius: 1.0, weight: 1.0 },
      { palette: 'P3', position: [0.17, 0.69], radius: 1.0, weight: 1.0 },
    ]),
  },

  onboarding: {
    id: 'onboarding',
    name: 'Onboarding',
    description: 'P1 top-left, P2 top-right, P3 bottom-left, P4 bottom-right',
    pathPattern: '^/onboarding',
    anchors: [
      { palette: 'P1', position: [0.0, 0.0], radius: 1.0, weight: 1.0 },
      { palette: 'P2', position: [1.0, 0.0], radius: 1.0, weight: 1.0 },
      { palette: 'P3', position: [0.0, 1.0], radius: 1.0, weight: 1.0 },
      { palette: 'P4', position: [1.0, 1.0], radius: 1.0, weight: 1.0 },
    ],
    motion: NORMAL_MOTION,
    fallbackCss: generateFallbackCss([
      { palette: 'P1', position: [0.0, 0.0], radius: 1.0, weight: 1.0 },
      { palette: 'P2', position: [1.0, 0.0], radius: 1.0, weight: 1.0 },
      { palette: 'P3', position: [0.0, 1.0], radius: 1.0, weight: 1.0 },
      { palette: 'P4', position: [1.0, 1.0], radius: 1.0, weight: 1.0 },
    ]),
  },

  landing: {
    id: 'landing',
    name: 'Landing Page',
    description: 'P1 top-right, P3 bottom-left, P4 light wash in center',
    pathPattern: '^/$',
    anchors: [
      { palette: 'P1', position: [1.0, 0.0], radius: 1.1, weight: 1.0 },
      { palette: 'P3', position: [0.0, 1.0], radius: 1.1, weight: 1.0 },
      { palette: 'P4', position: [0.5, 0.5], radius: 1.4, weight: 0.9 }, // Center light wash
    ],
    motion: NORMAL_MOTION,
    fallbackCss: generateFallbackCss([
      { palette: 'P1', position: [1.0, 0.0], radius: 1.1, weight: 1.0 },
      { palette: 'P3', position: [0.0, 1.0], radius: 1.1, weight: 1.0 },
      { palette: 'P4', position: [0.5, 0.5], radius: 1.4, weight: 0.9 },
    ]),
  },

  login: {
    id: 'login',
    name: 'Authentication (Login / Signup)',
    description: 'P3 top-left, P4 bottom-right',
    pathPattern: '^/login|^/signup|^/auth',
    anchors: [
      { palette: 'P3', position: [0.0, 0.0], radius: 1.1, weight: 1.0 },
      { palette: 'P4', position: [1.0, 1.0], radius: 1.1, weight: 1.0 },
    ],
    motion: NORMAL_MOTION,
    fallbackCss: generateFallbackCss([
      { palette: 'P3', position: [0.0, 0.0], radius: 1.1, weight: 1.0 },
      { palette: 'P4', position: [1.0, 1.0], radius: 1.1, weight: 1.0 },
    ]),
  },

  website: {
    id: 'website',
    name: 'Website Management',
    description: 'P1 top-left, P2 bottom-right',
    pathPattern: '^/website',
    anchors: [
      { palette: 'P1', position: [0.05, 0.05], radius: 1.1, weight: 1.0 },
      { palette: 'P2', position: [0.95, 0.95], radius: 1.1, weight: 1.0 },
    ],
    motion: NORMAL_MOTION,
    fallbackCss: generateFallbackCss([
      { palette: 'P1', position: [0.05, 0.05], radius: 1.1, weight: 1.0 },
      { palette: 'P2', position: [0.95, 0.95], radius: 1.1, weight: 1.0 },
    ]),
  },

  editor: {
    id: 'editor',
    name: 'Document Editor (Calm Mode)',
    description: 'P3 and P4 with calm, low-amplitude motion',
    pathPattern: '^/editor',
    anchors: [
      { palette: 'P3', position: [0.0, 0.1], radius: 1.1, weight: 1.0 },
      { palette: 'P4', position: [1.0, 0.9], radius: 1.1, weight: 1.0 },
    ],
    motion: CALM_MOTION,
    fallbackCss: generateFallbackCss([
      { palette: 'P3', position: [0.0, 0.1], radius: 1.1, weight: 1.0 },
      { palette: 'P4', position: [1.0, 0.9], radius: 1.1, weight: 1.0 },
    ]),
  },

  default: {
    id: 'default',
    name: 'Default Page (Calm Mode)',
    description: 'P4 and P3 calm mode for general routes',
    pathPattern: '.*',
    anchors: [
      { palette: 'P4', position: [0.1, 0.1], radius: 1.1, weight: 1.0 },
      { palette: 'P3', position: [0.9, 0.9], radius: 1.1, weight: 1.0 },
    ],
    motion: CALM_MOTION,
    fallbackCss: generateFallbackCss([
      { palette: 'P4', position: [0.1, 0.1], radius: 1.1, weight: 1.0 },
      { palette: 'P3', position: [0.9, 0.9], radius: 1.1, weight: 1.0 },
    ]),
  },
};

/**
 * Resolves the appropriate BackgroundRecipe for a given pathname.
 * Public site (/u/[username]) is explicitly excluded (returns null).
 */
export function getRecipeForPathname(pathname: string): BackgroundRecipe | null {
  // Exclude public personal sites (/u/[username])
  if (pathname.startsWith('/u/')) {
    return null;
  }

  for (const [key, recipe] of Object.entries(BACKGROUND_RECIPES)) {
    if (key === 'default') continue;
    const regex = new RegExp(recipe.pathPattern);
    if (regex.test(pathname)) {
      return recipe;
    }
  }

  return BACKGROUND_RECIPES.default;
}
