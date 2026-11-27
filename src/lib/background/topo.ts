import { mixHexOklab } from '@/lib/color/oklab';

export const TOPO_ICON_TYPES = [
  'resume',
  'career',
  'education',
  'profile',
  'skills',
  'achievements',
  'email',
  'globe',
  'growth',
] as const;

export type TopoIconType = (typeof TOPO_ICON_TYPES)[number];

export interface TopoIconInstance {
  id: number;
  type: TopoIconType;
  nx: number; // normalized [0.04, 0.96]
  ny: number; // normalized [0.05, 0.95]
  sizePx: number; // 18..26
  color: string;
  idleOpacity: number; // 0.10..0.16
  depth: number; // 0.35..1.0 -> max 6px parallax
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgbNorm(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function getTopoColors() {
  const base = '#1A1A1A';
  return {
    base,
    teal: mixHexOklab(base, '#0B2B26', 0.45),
    slate: mixHexOklab(base, '#243A66', 0.35),
    plum: mixHexOklab(base, '#881144', 0.25),
    contourLow: mixHexOklab('#6B6B6B', '#D9D9D9', 0.25),
    contourHigh: '#8EB69B',
    glow: '#8EB69B',
  };
}

const ICON_COLORS = [
  '#D9D9D9',
  mixHexOklab('#D9D9D9', '#8EB69B', 0.35),
  mixHexOklab('#D9D9D9', '#243A66', 0.25),
];

/**
 * Deterministic Poisson-disc scatter across normalized [0.05..0.95] viewport.
 * Ensures sparse, non-grid placement and guarantees every icon type appears 1-2 times on desktop.
 */
export function generateTopoIcons(targetCount: number, seed = 84729): TopoIconInstance[] {
  const rng = mulberry32(seed);
  const count = Math.max(4, Math.min(18, targetCount));
  const minDist = count >= 14 ? 0.16 : 0.22;
  const minDistSq = minDist * minDist;

  const points: Array<{ nx: number; ny: number }> = [];
  let attempts = 0;
  while (points.length < count && attempts < 1200) {
    attempts++;
    const nx = 0.05 + rng() * 0.9;
    const ny = 0.06 + rng() * 0.88;
    let ok = true;
    for (const p of points) {
      const dx = p.nx - nx;
      const dy = p.ny - ny;
      if (dx * dx + dy * dy < minDistSq) {
        ok = false;
        break;
      }
    }
    if (ok) points.push({ nx, ny });
  }

  // Assign types so all 9 types appear 1-2 times when count >= 9
  const typePool: TopoIconType[] = [...TOPO_ICON_TYPES];
  while (typePool.length < points.length) {
    typePool.push(TOPO_ICON_TYPES[typePool.length % TOPO_ICON_TYPES.length]);
  }
  for (let i = typePool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [typePool[i], typePool[j]] = [typePool[j], typePool[i]];
  }

  return points.map((p, idx) => ({
    id: idx,
    type: typePool[idx],
    nx: p.nx,
    ny: p.ny,
    sizePx: Math.round(18 + rng() * 8), // 18..26px
    color: ICON_COLORS[idx % ICON_COLORS.length],
    idleOpacity: Number((0.36 + rng() * 0.1).toFixed(3)), // 0.36..0.46 (>= 2.0:1 idle contrast)
    depth: Number((0.35 + rng() * 0.65).toFixed(2)),
  }));
}

export interface Spring2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  glow: number;
  vg: number;
}

export function stepCriticallyDampedSpring(
  state: Spring2D,
  targetX: number,
  targetY: number,
  targetGlow: number,
  dt: number,
  omega = 14
): boolean {
  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  const e = Math.exp(-omega * clampedDt);

  const dx = state.x - targetX;
  const nx = targetX + (dx + (state.vx + omega * dx) * clampedDt) * e;
  state.vx = (state.vx - omega * (state.vx + omega * dx) * clampedDt) * e;
  state.x = nx;

  const dy = state.y - targetY;
  const ny = targetY + (dy + (state.vy + omega * dy) * clampedDt) * e;
  state.vy = (state.vy - omega * (state.vy + omega * dy) * clampedDt) * e;
  state.y = ny;

  const dg = state.glow - targetGlow;
  const ng = targetGlow + (dg + (state.vg + omega * dg) * clampedDt) * e;
  state.vg = (state.vg - omega * (state.vg + omega * dg) * clampedDt) * e;
  state.glow = ng;

  const settled =
    Math.abs(state.x - targetX) < 0.25 &&
    Math.abs(state.y - targetY) < 0.25 &&
    Math.abs(state.vx) < 0.25 &&
    Math.abs(state.vy) < 0.25 &&
    Math.abs(state.glow - targetGlow) < 0.003 &&
    Math.abs(state.vg) < 0.003;

  if (settled) {
    state.x = targetX;
    state.y = targetY;
    state.vx = 0;
    state.vy = 0;
    state.glow = targetGlow;
    state.vg = 0;
  }
  return !settled;
}
