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
    // 1. Force deterministic static composition via prefers-reduced-motion: reduce
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Ensure WebGL context is initialized and attached
    await page.waitForFunction(
      () => Boolean((window as unknown as { __COLORFIELD_GL__?: WebGLRenderingContext }).__COLORFIELD_GL__),
      { timeout: 15000 }
    );

    // Wait 500ms for static frame to settle
    await page.waitForTimeout(500);

    const pixelSamples = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return null;

      const gl = (window as unknown as { __COLORFIELD_GL__?: WebGLRenderingContext }).__COLORFIELD_GL__;
      if (!gl) return null;

      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;

      function readAtNormalized(nx: number, ny: number) {
        const px = Math.min(Math.max(Math.floor(nx * (width - 1)), 0), width - 1);
        const py = Math.min(Math.max(Math.floor((1.0 - ny) * (height - 1)), 0), height - 1);
        const pixel = new Uint8Array(4);
        gl!.readPixels(px, py, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, pixel);
        return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
      }

      return {
        anchor0ForestExtreme: readAtNormalized(0.0, 0.0), // Exact top-left corner
        anchor1MistExtreme: readAtNormalized(1.0, 1.0),   // Exact bottom-right corner
        center: readAtNormalized(0.50, 0.50),             // Exact center
      };
    });

    expect(pixelSamples).not.toBeNull();
    if (!pixelSamples) return;

    const { anchor0ForestExtreme, anchor1MistExtreme, center } = pixelSamples;

    // Convert sampled raw pixels to OKLab
    const oklabForest = rgbToOklab(anchor0ForestExtreme.r, anchor0ForestExtreme.g, anchor0ForestExtreme.b);
    const oklabMist = rgbToOklab(anchor1MistExtreme.r, anchor1MistExtreme.g, anchor1MistExtreme.b);
    const oklabCenter = rgbToOklab(center.r, center.g, center.b);

    console.log('Deterministic Static OKLab Forest (Anchor 0 at 0,0):', oklabForest);
    console.log('Deterministic Static OKLab Mist (Anchor 1 at 1,1):', oklabMist);
    console.log('Deterministic Static OKLab Center (at 0.5,0.5):', oklabCenter);

    // Expected analytical OKLab values under deterministic static composition:
    // Anchor 0 is P3 (Forest) at (0.0, 0.0). At d=0, rampT=0, yielding Stop 0 (#051F20):
    // Analytical OKLab: L ≈ 0.2198, a ≈ -0.0301, b ≈ -0.0101
    const expectedForest = { L: 0.2198, a: -0.0301, b: -0.0101 };
    const distForest = deltaEOk(oklabForest, expectedForest);
    console.log(`Delta E (Forest Anchor 0): ${distForest.toFixed(4)}`);
    expect(distForest, `Forest anchor Delta E (${distForest.toFixed(4)}) exceeds tolerance 0.05`).toBeLessThanOrEqual(0.05);

    // Anchor 1 is P4 (Mist) at (1.0, 1.0). At d=0, rampT=0, yielding Stop 0 (#5D6B6B):
    // Analytical OKLab: L ≈ 0.5196, a ≈ -0.0162, b ≈ -0.0049
    const expectedMist = { L: 0.5196, a: -0.0162, b: -0.0049 };
    const distMist = deltaEOk(oklabMist, expectedMist);
    console.log(`Delta E (Mist Anchor 1): ${distMist.toFixed(4)}`);
    expect(distMist, `Mist anchor Delta E (${distMist.toFixed(4)}) exceeds tolerance 0.05`).toBeLessThanOrEqual(0.05);

    // Center at (0.5, 0.5) blends lighter stops:
    // Analytical OKLab: L ≈ 0.9067, a ≈ -0.0250, b ≈ 0.0093
    const expectedCenter = { L: 0.9067, a: -0.0250, b: 0.0093 };
    const distCenter = deltaEOk(oklabCenter, expectedCenter);
    console.log(`Delta E (Center): ${distCenter.toFixed(4)}`);
    expect(distCenter, `Center blend Delta E (${distCenter.toFixed(4)}) exceeds tolerance 0.05`).toBeLessThanOrEqual(0.05);
  });
});
