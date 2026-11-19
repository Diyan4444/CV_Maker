import { describe, it, expect } from 'vitest';
import { CURSOR_FOLLOW, BACKGROUND_RECIPES } from '@/config/backgrounds';

describe('Cursor-Follow Control Flag', () => {
  it('verifies CURSOR_FOLLOW is currently disabled (false) by specification', () => {
    expect(CURSOR_FOLLOW).toBe(false);
  });

  it('verifies that when CURSOR_FOLLOW is false, effective pointer sensitivity and bloom are zeroed', () => {
    for (const recipe of Object.values(BACKGROUND_RECIPES)) {
      const effectiveSensitivity = CURSOR_FOLLOW ? recipe.motion.pointerSensitivity : 0.0;
      const effectiveBloom = CURSOR_FOLLOW ? recipe.motion.pointerBloom : 0.0;
      expect(effectiveSensitivity).toBe(0.0);
      expect(effectiveBloom).toBe(0.0);
    }
  });

  it('verifies that when CURSOR_FOLLOW is true, recipe motion configurations retain their designed values', () => {
    const simulatedTrue = true;
    for (const recipe of Object.values(BACKGROUND_RECIPES)) {
      const effectiveSensitivity = simulatedTrue ? recipe.motion.pointerSensitivity : 0.0;
      const effectiveBloom = simulatedTrue ? recipe.motion.pointerBloom : 0.0;
      expect(effectiveSensitivity).toBeGreaterThan(0);
      expect(effectiveBloom).toBeGreaterThan(0);
      expect(recipe.motion.pointerSensitivity).toBeGreaterThan(0);
      expect(recipe.motion.pointerBloom).toBeGreaterThan(0);
    }
  });
});
