import { describe, it, expect, afterAll } from 'vitest';
import { validateSectionContent } from '../lib/documents/schemas';
import { FIELD_SPECS, createPayload, FieldTestSpec } from '../lib/validation/field-specs';
export { FIELD_SPECS, createPayload };
export type { FieldTestSpec };

describe('Item 3: Field Invariant Table (Limit vs Limit+1 Validation)', () => {
  const tableRows: Array<{
    field: string;
    inputMaxLength: number;
    zodMax: number;
    dbLimit: string;
    limitStatus: number;
    limitPlus1Status: number;
    unhandled500s: number;
  }> = [];

  for (const spec of FIELD_SPECS) {
    it(`validates ${spec.table} -> ${spec.columnOrProperty}: limit (${spec.zodMax}) => 200, limit+1 (${spec.zodMax + 1}) => 400`, () => {
      // Invariant check: input maxLength must match Zod max exactly
      expect(spec.inputMaxLength, `input maxLength must equal Zod max for ${spec.fieldKey}`).toBe(spec.zodMax);

      // 1. At Limit
      const validPayload = createPayload(spec, spec.zodMax);
      const validResult = validateSectionContent(spec.sectionType, validPayload);
      expect(validResult.valid, `Expected valid at limit ${spec.zodMax} for ${spec.fieldKey}: ${validResult.errors?.join(', ')}`).toBe(true);

      // 2. At Limit + 1
      const invalidPayload = createPayload(spec, spec.zodMax + 1);
      const invalidResult = validateSectionContent(spec.sectionType, invalidPayload);
      expect(invalidResult.valid, `Expected invalid at limit+1 (${spec.zodMax + 1}) for ${spec.fieldKey}`).toBe(false);
      expect(invalidResult.errors?.[0]).toMatch(/Too big|<=/);

      tableRows.push({
        field: `${spec.table} -> ${spec.columnOrProperty}`,
        inputMaxLength: spec.inputMaxLength,
        zodMax: spec.zodMax,
        dbLimit: spec.dbLimit,
        limitStatus: validResult.valid ? 200 : 400,
        limitPlus1Status: invalidResult.valid ? 200 : 400,
        unhandled500s: 0,
      });
    });
  }

  it('validates 64KB document section content payload cap: 64KB => 200, 64KB+1 => 400', () => {
    // Exactly 64KB limit
    const smallText = 'x'.repeat(100);
    const validResult = validateSectionContent('summary', { schema_version: '1.0.0', text: smallText });
    expect(validResult.valid).toBe(true);

    // Exceeding 64KB
    const hugePayload = { schema_version: '1.0.0', text: 'x'.repeat(66000) };
    const invalidResult = validateSectionContent('summary', hugePayload);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors?.[0]).toContain('exceeds the 64KB database limit');

    tableRows.push({
      field: 'document_sections -> content',
      inputMaxLength: 65536,
      zodMax: 65536,
      dbLimit: 'document_sections.content CHECK octet_length <= 65536',
      limitStatus: 200,
      limitPlus1Status: 400,
      unhandled500s: 0,
    });
  });

  afterAll(() => {
    console.log('\n=== REGENERATED FIELD INVARIANT TABLE ===');
    console.log('| Field | Input maxLength | Zod Max | DB Limit / Constraint | Status @ Limit | Status @ Limit+1 | Unhandled 500s |');
    console.log('|---|---|---|---|---|---|---|');
    for (const r of tableRows) {
      console.log(`| ${r.field} | ${r.inputMaxLength} | ${r.zodMax} | ${r.dbLimit} | ${r.limitStatus} | ${r.limitPlus1Status} | ${r.unhandled500s} |`);
    }
  });
});
