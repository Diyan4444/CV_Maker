import { describe, it, expect } from 'vitest';
import { AccountExportDataSchema, EXPORT_DATA_CATEGORIES } from '@/lib/account/export-schema';

describe('Phase 8D Settings Export Tile Schema Parity', () => {
  it('EXPORT_DATA_CATEGORIES is derived from AccountExportDataSchema keys with friendly labels and no Website settings', () => {
    const schemaKeys = Object.keys(AccountExportDataSchema.shape);
    const tileKeys = EXPORT_DATA_CATEGORIES.map((c) => c.key);
    const tileLabels = EXPORT_DATA_CATEGORIES.map((c) => c.label);

    expect(tileKeys.length).toBe(10);
    for (const k of tileKeys) {
      expect(schemaKeys).toContain(k);
    }

    expect(tileLabels).toEqual([
      'Profile',
      'Education',
      'Experience',
      'Projects',
      'Skills',
      'Publications',
      'Achievements',
      'Certifications',
      'Custom sections',
      'Documents',
    ]);
    expect(tileLabels).not.toContain('Website settings');
  });
});
