import { test, expect } from '@playwright/test';

test.describe('Real ColorField Cursor-Follow Verification', () => {
  test('Verifies that when CURSOR_FOLLOW is disabled, pointer listeners are NOT attached and pointer influence is zeroed', async ({
    page,
  }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    // Wait for ColorField WebGL canvas and state to initialize
    await page.waitForFunction(
      () => Boolean((window as unknown as { __COLORFIELD_MOTION_STATE__?: unknown }).__COLORFIELD_MOTION_STATE__),
      { timeout: 15000 }
    );

    // 1. Verify pointer listener flag is false
    const pointerAttached = await page.evaluate(
      () => (window as unknown as { __COLORFIELD_POINTER_ATTACHED__?: boolean }).__COLORFIELD_POINTER_ATTACHED__
    );
    expect(pointerAttached).toBe(false);

    // 2. Verify initial motion state passed to renderer has zero pointer influence
    const initialMotion = await page.evaluate(
      () =>
        (window as unknown as {
          __COLORFIELD_MOTION_STATE__?: {
            cursorFollow: boolean;
            pointerCoords: [number, number];
            pointerSensitivity: number;
            pointerBloom: number;
          };
        }).__COLORFIELD_MOTION_STATE__
    );

    expect(initialMotion).toBeDefined();
    expect(initialMotion?.cursorFollow).toBe(false);
    expect(initialMotion?.pointerSensitivity).toBe(0.0);
    expect(initialMotion?.pointerBloom).toBe(0.0);
    expect(initialMotion?.pointerCoords).toEqual([0.5, 0.5]);

    // 3. Move the mouse across different parts of the screen
    await page.mouse.move(100, 100);
    await page.waitForTimeout(100);
    await page.mouse.move(500, 300);
    await page.waitForTimeout(100);

    // 4. Verify that motion state remains locked to [0.5, 0.5] with zero sensitivity and bloom
    const motionAfterMovement = await page.evaluate(
      () =>
        (window as unknown as {
          __COLORFIELD_MOTION_STATE__?: {
            cursorFollow: boolean;
            pointerCoords: [number, number];
            pointerSensitivity: number;
            pointerBloom: number;
          };
        }).__COLORFIELD_MOTION_STATE__
    );

    expect(motionAfterMovement?.pointerCoords).toEqual([0.5, 0.5]);
    expect(motionAfterMovement?.pointerSensitivity).toBe(0.0);
    expect(motionAfterMovement?.pointerBloom).toBe(0.0);
  });
});
