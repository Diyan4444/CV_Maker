import React from 'react';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';
import { AtsSingleColumnTemplate } from './templates/AtsSingleColumn';
import { ModernProfessionalTemplate } from './templates/ModernProfessional';
import { AcademicCvTemplate } from './templates/AcademicCv';

interface DocumentPdfRendererProps {
  meta: DocumentMeta;
  sections: DocumentSection[];
}

export function DocumentPdfRenderer({ meta, sections }: DocumentPdfRendererProps) {
  const templateId = meta.templateId || (meta as any).template_id;
  switch (templateId) {
    case 'modern_professional':
      return <ModernProfessionalTemplate meta={meta} sections={sections} />;
    case 'academic_cv':
      return <AcademicCvTemplate meta={meta} sections={sections} />;
    case 'ats_single_column':
    default:
      return <AtsSingleColumnTemplate meta={meta} sections={sections} />;
  }
}
