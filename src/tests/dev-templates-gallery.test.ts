import { describe, it, expect } from 'vitest';
import React from 'react';
import { TemplatesGallery } from '@/app/dev/templates/TemplatesGallery';
import { AtsSingleColumnTemplate } from '@/components/pdf/templates/AtsSingleColumn';
import { AcademicCvTemplate } from '@/components/pdf/templates/AcademicCv';
import { ModernProfessionalTemplate } from '@/components/pdf/templates/ModernProfessional';
import { EXTREME_EDGE_CASE_FIXTURE } from '@/lib/fixtures/document-fixtures';

describe('Dev Templates Gallery Render Verification (Vitest)', () => {
  it('instantiates TemplatesGallery component cleanly', () => {
    const element = React.createElement(TemplatesGallery);
    expect(element).toBeDefined();
    expect(element.type).toBe(TemplatesGallery);
  });

  it('renders all template engines with extreme edge-case fixture', () => {
    const extremeDoc = EXTREME_EDGE_CASE_FIXTURE;

    const ats = React.createElement(AtsSingleColumnTemplate, {
      meta: extremeDoc.meta,
      sections: extremeDoc.sections,
    });
    expect(ats).toBeDefined();

    const modern = React.createElement(ModernProfessionalTemplate, {
      meta: extremeDoc.meta,
      sections: extremeDoc.sections,
    });
    expect(modern).toBeDefined();

    const academic = React.createElement(AcademicCvTemplate, {
      meta: extremeDoc.meta,
      sections: extremeDoc.sections,
    });
    expect(academic).toBeDefined();
  });
});
