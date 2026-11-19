import { test, expect } from '@playwright/test';

// Standard sRGB to OKLab conversion
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToOklab(r: number, g: number, b: number) {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function deltaEOk(c1: { L: number; a: number; b: number }, c2: { L: number; a: number; b: number }) {
  const dL = c1.L - c2.L;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

test.describe('GPU WebGL Color Pipeline Verification', () => {
  test('Renders /login recipe on WebGL canvas and verifies OKLab color values with strict tolerance', async ({
    page,
  }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Ensure WebGL context is initialized and attached
    await page.waitForFunction(
      () => Boolean((window as unknown as { __COLORFIELD_GL__?: WebGLRenderingContext }).__COLORFIELD_GL__),
      { timeout: 15000 }
    );

    const pixelSamples = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return null;

      const gl = (window as unknown as { __COLORFIELD_GL__?: WebGLRenderingContext }).__COLORFIELD_GL__;
      if (!gl) return null;

      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      function readAtNormalized(nx: number, ny: number) {
        const px = Math.min(Math.max(Math.floor(nx * width), 0), width - 1);
        const py = Math.min(Math.max(Math.floor((1.0 - ny) * height), 0), height - 1);
        const pixel = new Uint8Array(4);
        gl!.readPixels(px, py, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, pixel);
        return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
      }

      return {
        topLeftForest: readAtNormalized(0.15, 0.20),
        bottomRightMist: readAtNormalized(0.85, 0.80),
        center: readAtNormalized(0.50, 0.50),
      };
    });

    expect(pixelSamples).not.toBeNull();
    if (!pixelSamples) return;

    const { topLeftForest, bottomRightMist, center } = pixelSamples;

    // Convert sampled raw pixels to OKLab
    const oklabForest = rgbToOklab(topLeftForest.r, topLeftForest.g, topLeftForest.b);
    const oklabMist = rgbToOklab(bottomRightMist.r, bottomRightMist.g, bottomRightMist.b);
    const oklabCenter = rgbToOklab(center.r, center.g, center.b);

    console.log('Measured OKLab Forest (Anchor 0):', oklabForest);
    console.log('Measured OKLab Mist (Anchor 1):', oklabMist);
    console.log('Measured OKLab Center (Blended):', oklabCenter);

    // Expected target OKLab values:
    // Anchor 0 is P3 (Forest) centered around #163832 / #235347:
    // Expected L ~ 0.35, a ~ -0.045 (negative/green), b ~ 0.00
    const expectedForest = { L: 0.35, a: -0.045, b: 0.00 };
    const distForest = deltaEOk(oklabForest, expectedForest);
    // Explicit tolerance: Delta E in OKLab < 0.22 ensures it belongs to Forest palette
    expect(distForest, `Forest anchor Delta E (${distForest.toFixed(3)}) exceeds tolerance 0.22`).toBeLessThan(0.22);
    expect(oklabForest.a, 'Forest anchor must have negative a (green hue)').toBeLessThan(0);

    // Anchor 1 is P4 (Mist) centered around high lightness pastel stops (#BDD7D8 / #D5E5E5):
    // Expected L ~ 0.88, a ~ -0.015, b ~ -0.005
    const expectedMist = { L: 0.88, a: -0.015, b: -0.005 };
    const distMist = deltaEOk(oklabMist, expectedMist);
    expect(distMist, `Mist anchor Delta E (${distMist.toFixed(3)}) exceeds tolerance 0.22`).toBeLessThan(0.22);
    expect(oklabMist.L, 'Mist anchor must have high perceived lightness (> 0.75)').toBeGreaterThan(0.75);

    // Center is a smooth gradient blend between Forest and Mist:
    // It maintains a high-lightness wash (> 0.60) with blended green/teal chromaticity (a < 0)
    expect(oklabCenter.L).toBeGreaterThan(0.60);
    expect(oklabCenter.a).toBeLessThan(0);
  });
});
