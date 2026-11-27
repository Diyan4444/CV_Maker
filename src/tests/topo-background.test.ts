import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {
  TOPO_ICON_TYPES,
  generateTopoIcons,
  getTopoColors,
  stepCriticallyDampedSpring,
} from '@/lib/background/topo';

describe('Phase 8B-2 Topographic Background & Icon Sprite', () => {
  it('generates 9 distinct outline icon types in 14-18 sparse non-grid instances on desktop', () => {
    const icons = generateTopoIcons(16, 84729);
    expect(icons.length).toBeGreaterThanOrEqual(14);
    expect(icons.length).toBeLessThanOrEqual(18);

    const typeCounts = new Map<string, number>();
    for (const ic of icons) {
      typeCounts.set(ic.type, (typeCounts.get(ic.type) || 0) + 1);
      expect(ic.sizePx).toBeGreaterThanOrEqual(18);
      expect(ic.sizePx).toBeLessThanOrEqual(26);
      expect(ic.idleOpacity).toBeGreaterThanOrEqual(0.36);
      expect(ic.idleOpacity).toBeLessThanOrEqual(0.46);
    }

    for (const t of TOPO_ICON_TYPES) {
      const count = typeCounts.get(t) || 0;
      expect(count, `Expected icon type ${t} to appear 1-2 times`).toBeGreaterThanOrEqual(1);
      expect(count, `Expected icon type ${t} to appear 1-2 times`).toBeLessThanOrEqual(2);
    }

    // Verify Poisson-disc minimum spacing (not collapsed or on a regular grid)
    for (let i = 0; i < icons.length; i++) {
      for (let j = i + 1; j < icons.length; j++) {
        const dist = Math.hypot(icons[i].nx - icons[j].nx, icons[i].ny - icons[j].ny);
        expect(dist).toBeGreaterThanOrEqual(0.15);
      }
    }

    const xs = new Set(icons.map((ic) => Math.round(ic.nx * 20)));
    const ys = new Set(icons.map((ic) => Math.round(ic.ny * 20)));
    expect(xs.size).toBeGreaterThan(5);
    expect(ys.size).toBeGreaterThan(5);
  });

  it('generates fewer icons on small screens', () => {
    const mobileIcons = generateTopoIcons(7, 84729);
    expect(mobileIcons.length).toBe(7);
  });

  it('derives all charcoal and contour colors from palette hexes', () => {
    const colors = getTopoColors();
    expect(colors.base).toBe('#1A1A1A');
    expect(colors.contourLow).toMatch(/^#[0-9A-F]{6}$/i);
    expect(colors.contourHigh).toBe('#8EB69B');
    expect(colors.teal).toMatch(/^#[0-9A-F]{6}$/i);
    expect(colors.slate).toMatch(/^#[0-9A-F]{6}$/i);
    expect(colors.plum).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('critically damped spring settles cleanly to target and stops', () => {
    const state = { x: 0, y: 0, vx: 0, vy: 0, glow: 0, vg: 0 };
    let steps = 0;
    let active = true;
    while (active && steps < 300) {
      active = stepCriticallyDampedSpring(state, 400, 300, 1, 1 / 60);
      steps++;
    }
    expect(active).toBe(false);
    expect(steps).toBeLessThan(90); // settles well within 1.5s @ 60fps
    expect(state.x).toBe(400);
    expect(state.y).toBe(300);
    expect(state.glow).toBe(1);
  });

  it('background source gzipped size is under 15 KB', () => {
    const topoLib = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/background/topo.ts'));
    const topoComp = fs.readFileSync(path.resolve(process.cwd(), 'src/components/canvas/TopoBackground.tsx'));
    const combined = Buffer.concat([topoLib, topoComp]);
    const gzipped = zlib.gzipSync(combined);
    console.log(`[TopoBackground Gzip Size] ${gzipped.length} bytes (${(gzipped.length / 1024).toFixed(2)} KB)`);
    expect(gzipped.length).toBeLessThan(15 * 1024);
  });
});
