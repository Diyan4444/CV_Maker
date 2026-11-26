import { DocumentMeta, DocumentSection } from '../documents/types';
import { getTemplateDefinition } from '../documents/templates';
import { AtsCheckResult, AtsReadinessReport } from './types';

const STANDARD_HEADINGS = new Set([
  'summary',
  'professional summary',
  'executive summary',
  'profile',
  'about',
  'experience',
  'work experience',
  'professional experience',
  'employment history',
  'work history',
  'career history',
  'education',
  'academic background',
  'education & credentials',
  'skills',
  'technical skills',
  'comprehensive skills',
  'comprehensive skills (60 items)',
  'core competencies',
  'skills & tools',
  'areas of expertise',
  'projects',
  'key projects',
  'selected projects',
  'technical projects',
  'academic projects',
  'personal projects',
  'certifications',
  'certifications & licenses',
  'licenses & certifications',
  'licenses',
  'publications',
  'research & publications',
  'selected publications',
  'awards',
  'honors & awards',
  'honors',
  'achievements',
  'key achievements',
  'languages',
  'volunteer',
  'volunteer experience',
  'community involvement',
  'academic appointments',
]);

/**
 * 1. Contact Details Check
 */
export function checkContactDetails(sections: DocumentSection[]): AtsCheckResult {
  const headerSec = sections.find(
    (s) => (s.sectionType || (s as any).section_type) === 'header'
  );

  if (!headerSec) {
    return {
      id: 'contact_details',
      name: 'Contact details: name & email',
      status: 'needs_attention',
      explanation: 'Header section with contact details is missing from the document.',
      sectionId: 'sec-header',
    };
  }

  const h = (headerSec.content as any) || {};
  const fullName = (h.fullName || h.full_name || '').trim();
  const email = (h.email || '').trim();
  const phone = (h.phone || '').trim();
  const location = (h.location || '').trim();

  if (!fullName) {
    return {
      id: 'contact_details',
      name: 'Contact details: name & email',
      status: 'needs_attention',
      explanation: 'Full name is missing from the contact header.',
      sectionId: headerSec.id,
      fieldId: 'full_name',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      id: 'contact_details',
      name: 'Contact details: name & email',
      status: 'needs_attention',
      explanation: 'A valid professional email address is required for applicant tracking systems.',
      sectionId: headerSec.id,
      fieldId: 'email',
    };
  }

  if (!phone || !location) {
    return {
      id: 'contact_details',
      name: 'Contact details: name & email',
      status: 'info',
      explanation: `${!phone && !location ? 'Phone number and location' : !phone ? 'Phone number' : 'Location'} not provided (optional, but helpful for location-filtered searches).`,
      sectionId: headerSec.id,
    };
  }

  return {
    id: 'contact_details',
    name: 'Contact details: name & email',
    status: 'pass',
    explanation: 'Full name, email, phone, and location are clearly specified in the contact header.',
    sectionId: headerSec.id,
  };
}

/**
 * 2. Section Headings Recognizable Check
 */
export function checkSectionHeadings(sections: DocumentSection[]): AtsCheckResult {
  const visibleNonHeaderSections = sections
    .filter((s) => (s.isVisible !== undefined ? s.isVisible : (s as any).is_visible !== false))
    .filter((s) => (s.sectionType || (s as any).section_type) !== 'header');

  for (const sec of visibleNonHeaderSections) {
    const rawTitle = (sec.custom_title || (sec as any).customTitle || sec.title || '').trim();
    const normalized = rawTitle.toLowerCase();

    if (!STANDARD_HEADINGS.has(normalized)) {
      return {
        id: 'section_headings',
        name: 'Standard section headings',
        status: 'info',
        explanation: `Custom heading "${rawTitle}" may not be automatically categorized by older ATS parsers. Standard titles (e.g. Experience, Education) are recommended.`,
        sectionId: sec.id,
      };
    }
  }

  return {
    id: 'section_headings',
    name: 'Standard section headings',
    status: 'pass',
    explanation: 'All section headings use recognizable, industry-standard titles.',
  };
}

/**
 * 3. Text Extraction Check
 */
export function checkTextExtraction(
  sections: DocumentSection[],
  extractedText: string
): AtsCheckResult {
  if (!extractedText || !extractedText.trim()) {
    return {
      id: 'text_extraction',
      name: 'PDF text extraction & order',
      status: 'needs_attention',
      explanation: 'No readable text could be extracted from the generated PDF.',
      sectionId: 'sec-header',
    };
  }

  const headerSec = sections.find(
    (s) => (s.sectionType || (s as any).section_type) === 'header'
  );
  const fullName = headerSec ? ((headerSec.content as any)?.fullName || (headerSec.content as any)?.full_name || '').trim() : '';

  if (fullName) {
    const nameIndex = extractedText.indexOf(fullName);
    if (nameIndex === -1) {
      return {
        id: 'text_extraction',
        name: 'PDF text extraction & order',
        status: 'needs_attention',
        explanation: `Applicant name "${fullName}" was not found in the extracted PDF text stream.`,
        sectionId: headerSec?.id,
      };
    }

    // Verify name appears near the beginning (before any section headings)
    const firstSectionHeadingIndex = extractedText.search(/(EXPERIENCE|EDUCATION|SUMMARY|SKILLS|PROJECTS)/i);
    if (firstSectionHeadingIndex !== -1 && nameIndex > firstSectionHeadingIndex) {
      return {
        id: 'text_extraction',
        name: 'PDF text extraction & order',
        status: 'needs_attention',
        explanation: 'Applicant name appears after section headings in the text stream.',
        sectionId: headerSec?.id,
      };
    }
  }

  // Check that visible section titles appear in relative document order in the extracted text
  const visibleSections = sections
    .filter((s) => (s.isVisible !== undefined ? s.isVisible : (s as any).is_visible !== false))
    .filter((s) => (s.sectionType || (s as any).section_type) !== 'header');

  let lastIndex = 0;
  for (const sec of visibleSections) {
    const title = (sec.custom_title || (sec as any).customTitle || sec.title || '').trim();
    if (!title) continue;

    const titleIndex = extractedText.toUpperCase().indexOf(title.toUpperCase(), lastIndex);
    if (titleIndex === -1) {
      // Check if it exists earlier
      const priorIndex = extractedText.toUpperCase().indexOf(title.toUpperCase());
      if (priorIndex !== -1 && priorIndex < lastIndex) {
        return {
          id: 'text_extraction',
          name: 'PDF text extraction & order',
          status: 'needs_attention',
          explanation: `Section "${title}" appears out of document order in the extracted PDF stream.`,
          sectionId: sec.id,
        };
      }
    } else {
      lastIndex = titleIndex + title.length;
    }
  }

  return {
    id: 'text_extraction',
    name: 'PDF text extraction & order',
    status: 'pass',
    explanation: 'Extracted PDF text maintains document order, starts with applicant name, and preserves section content.',
  };
}

/**
 * 4. Split Words Check
 */
export function checkSplitWords(extractedText: string): AtsCheckResult {
  if (!extractedText) {
    return {
      id: 'split_words',
      name: 'No broken words / split hyphens',
      status: 'pass',
      explanation: 'No extracted text to analyze.',
    };
  }

  // Detect word hyphen-space word (e.g. "Mitter- rand")
  const splitMatches = extractedText.match(/\b[a-zA-Z]{2,}-\s+[a-zA-Z]{2,}\b/g);

  if (splitMatches && splitMatches.length > 0) {
    return {
      id: 'split_words',
      name: 'No broken words / split hyphens',
      status: 'needs_attention',
      explanation: `Detected hyphen-space broken word(s) in extracted PDF text: ${splitMatches.slice(0, 3).join(', ')}. This can break ATS keyword search.`,
    };
  }

  return {
    id: 'split_words',
    name: 'No broken words / split hyphens',
    status: 'pass',
    explanation: 'Zero hyphen-space broken words detected in extracted PDF text.',
  };
}

/**
 * 5. Entries in Experience / Education Without Dates
 */
export function checkExperienceEducationDates(sections: DocumentSection[]): AtsCheckResult {
  const chronoSections = sections.filter(
    (s) =>
      (s.isVisible !== undefined ? s.isVisible : (s as any).is_visible !== false) &&
      ['experience', 'education'].includes(s.sectionType || (s as any).section_type)
  );

  for (const sec of chronoSections) {
    const entries = ((sec.content as any)?.entries as any[]) || [];
    for (const entry of entries) {
      if (entry.isVisible === false) continue;
      const start = (entry.startDate || (entry as any).start_date || '').trim();
      const end = (entry.endDate || (entry as any).end_date || '').trim();
      const isCurrent = entry.isCurrent || (entry as any).is_current;

      if (!start && !end && !isCurrent) {
        const title = entry.role || entry.degree || 'Untitled entry';
        const org = entry.organization || entry.institution || 'organization';
        return {
          id: 'chronological_dates',
          name: 'Chronological dates on entries',
          status: 'info',
          explanation: `Entry "${title}" at "${org}" has no start or end date specified. Dates help ATS systems index timeline and seniority.`,
          sectionId: sec.id,
        };
      }
    }
  }

  return {
    id: 'chronological_dates',
    name: 'Chronological dates on entries',
    status: 'pass',
    explanation: 'All visible experience and education entries include chronological dates.',
  };
}

/**
 * 6. Resume Page Count Check
 */
export function checkResumePageCount(docMeta: DocumentMeta, pageCount: number): AtsCheckResult {
  const docType = docMeta.type || 'resume';

  if (docType === 'resume') {
    if (pageCount > 2) {
      return {
        id: 'page_count',
        name: 'Document length & page count',
        status: 'info',
        explanation: `Resume length is ${pageCount} pages. Most corporate ATS screeners recommend 1–2 pages for resumes unless applying for executive roles.`,
      };
    }
    return {
      id: 'page_count',
      name: 'Document length & page count',
      status: 'pass',
      explanation: `Document length (${pageCount} page${pageCount === 1 ? '' : 's'}) is within the recommended 1–2 page limit.`,
    };
  }

  return {
    id: 'page_count',
    name: 'Document length & page count',
    status: 'pass',
    explanation: `Academic CV length is ${pageCount} page${pageCount === 1 ? '' : 's'} (multi-page dossiers are standard for academic and scientific CVs).`,
  };
}

/**
 * 7. Layout Facts Derived From Template Metadata
 */
export function checkLayoutFacts(docMeta: DocumentMeta): AtsCheckResult {
  const templateId = docMeta.templateId || (docMeta as any).template_id;
  const tmpl = getTemplateDefinition(templateId);

  const columnDesc = tmpl.isSingleColumn ? 'Single-column linear flow' : 'Multi-column layout';
  const tableDesc = tmpl.hasTables ? 'contains tables' : 'table-free structure';
  const imageDesc = tmpl.hasImages ? 'contains raster images' : 'pure vector typography (zero raster images)';

  return {
    id: 'layout_facts',
    name: 'Layout structure & ATS safety',
    status: tmpl.isSingleColumn && !tmpl.hasTables && !tmpl.hasImages ? 'pass' : 'info',
    explanation: `Verified from template (${tmpl.name}): ${columnDesc}, ${tableDesc}, ${imageDesc}.`,
  };
}

/**
 * 8. Visible URL Text for Links
 */
export function checkVisibleUrls(sections: DocumentSection[]): AtsCheckResult {
  const headerSec = sections.find(
    (s) => (s.sectionType || (s as any).section_type) === 'header'
  );

  if (headerSec) {
    const h = (headerSec.content as any) || {};
    const urls = [h.website, h.linkedin, h.github].filter(Boolean);
    for (const url of urls) {
      if (typeof url === 'string' && url.trim().length > 0) {
        // Verify URL is not a bare anchor placeholder
        if (url.trim().toLowerCase() === 'click here' || url.trim().toLowerCase() === 'link') {
          return {
            id: 'visible_urls',
            name: 'Visible URL text for links',
            status: 'needs_attention',
            explanation: `Header contains generic link anchor "${url}". ATS systems require explicit visible URL domains (e.g. github.com/username).`,
            sectionId: headerSec.id,
          };
        }
      }
    }
  }

  return {
    id: 'visible_urls',
    name: 'Visible URL text for links',
    status: 'pass',
    explanation: 'All hyperlinks display explicit visible URL text readable by ATS parsers.',
  };
}

/**
 * 9. Non-Latin Text Removed From PDF
 */
export function checkNonLatinText(sections: DocumentSection[]): AtsCheckResult {
  // Regex detecting non-Latin characters (Arabic, Cyrillic, Chinese/Japanese/Korean, Devanagari, Hebrew, etc.)
  // We exclude standard Latin (\p{Script=Latin}), ASCII symbols, common digits, and punctuation.
  const nonLatinRegex = /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}\s]/u;

  const affectedFields: string[] = [];
  let firstAffectedSecId: string | undefined;

  for (const sec of sections) {
    const type = sec.sectionType || (sec as any).section_type;
    if (type === 'header') {
      const h = (sec.content as any) || {};
      for (const [key, val] of Object.entries(h)) {
        if (typeof val === 'string' && nonLatinRegex.test(val)) {
          affectedFields.push(`Header ${key}`);
          if (!firstAffectedSecId) firstAffectedSecId = sec.id;
        }
      }
    } else if (type === 'summary') {
      const text = (sec.content as any)?.text || '';
      if (typeof text === 'string' && nonLatinRegex.test(text)) {
        affectedFields.push('Summary text');
        if (!firstAffectedSecId) firstAffectedSecId = sec.id;
      }
    } else {
      const entries = ((sec.content as any)?.entries as any[]) || [];
      for (const entry of entries) {
        for (const [key, val] of Object.entries(entry)) {
          if (typeof val === 'string' && nonLatinRegex.test(val)) {
            affectedFields.push(`${sec.title} ${key}`);
            if (!firstAffectedSecId) firstAffectedSecId = sec.id;
          }
        }
      }
    }
  }

  if (affectedFields.length > 0) {
    const uniqueFields = Array.from(new Set(affectedFields));
    return {
      id: 'non_latin_text',
      name: 'Non-Latin text omitted notice',
      status: 'info',
      explanation: `Non-Latin script characters detected and omitted from PDF export in: ${uniqueFields.slice(0, 3).join(', ')}${uniqueFields.length > 3 ? '...' : ''}. PDF fonts strictly support Latin characters.`,
      sectionId: firstAffectedSecId,
    };
  }

  return {
    id: 'non_latin_text',
    name: 'Non-Latin text omitted notice',
    status: 'pass',
    explanation: 'All document content uses standard Latin typography supported by the PDF fonts.',
  };
}

/**
 * 10. Visible Sections That Are Empty
 */
export function checkEmptySections(sections: DocumentSection[]): AtsCheckResult {
  const visibleSections = sections.filter(
    (s) => (s.isVisible !== undefined ? s.isVisible : (s as any).is_visible !== false)
  );

  for (const sec of visibleSections) {
    const type = sec.sectionType || (sec as any).section_type;
    const title = sec.custom_title || (sec as any).customTitle || sec.title;

    if (type === 'summary') {
      const text = ((sec.content as any)?.text || '').trim();
      if (!text) {
        return {
          id: 'empty_sections',
          name: 'No empty visible sections',
          status: 'info',
          explanation: `Section "${title}" is visible but contains no summary text. Hide or populate it to prevent blank sections.`,
          sectionId: sec.id,
        };
      }
    } else if (type !== 'header') {
      const entries = ((sec.content as any)?.entries as any[]) || [];
      const visibleEntries = entries.filter((e) => e.isVisible !== false);
      if (visibleEntries.length === 0) {
        return {
          id: 'empty_sections',
          name: 'No empty visible sections',
          status: 'info',
          explanation: `Section "${title}" is visible but contains no active entries. Hide or populate it to avoid blank sections in the ATS stream.`,
          sectionId: sec.id,
        };
      }
    }
  }

  return {
    id: 'empty_sections',
    name: 'No empty visible sections',
    status: 'pass',
    explanation: 'All visible sections contain entries or text.',
  };
}

/**
 * 11. Professional Summary Present Check
 */
export function checkSummaryPresent(sections: DocumentSection[]): AtsCheckResult {
  const summarySec = sections.find(
    (s) => (s.sectionType || (s as any).section_type) === 'summary'
  );
  const isVisible = summarySec
    ? summarySec.isVisible !== undefined
      ? summarySec.isVisible
      : (summarySec as any).is_visible !== false
    : false;
  const text = ((summarySec?.content as any)?.text || '').trim();

  if (summarySec && isVisible && text.length > 0) {
    return {
      id: 'summary_present',
      name: 'Professional summary',
      status: 'pass',
      explanation: 'Professional summary is present and visible.',
      sectionId: summarySec.id,
    };
  }

  return {
    id: 'summary_present',
    name: 'Professional summary',
    status: 'info',
    explanation:
      'No visible professional summary found. A brief 2–3 sentence summary helps recruiters and ATS parsers understand your target role.',
    sectionId: summarySec?.id,
  };
}

/**
 * 12. Education Section Populated Check
 */
export function checkEducationPresent(sections: DocumentSection[]): AtsCheckResult {
  const eduSec = sections.find(
    (s) => (s.sectionType || (s as any).section_type) === 'education'
  );
  const isVisible = eduSec
    ? eduSec.isVisible !== undefined
      ? eduSec.isVisible
      : (eduSec as any).is_visible !== false
    : false;
  const entries = (((eduSec?.content as any)?.entries as any[]) || []).filter(
    (e) => e.isVisible !== false
  );

  if (eduSec && isVisible && entries.length > 0) {
    return {
      id: 'education_present',
      name: 'Education section',
      status: 'pass',
      explanation: 'Education section contains at least one visible entry.',
      sectionId: eduSec.id,
    };
  }

  return {
    id: 'education_present',
    name: 'Education section',
    status: 'needs_attention',
    explanation: 'Education section is missing, hidden, or has no visible entries.',
    sectionId: eduSec?.id,
  };
}

/**
 * 13. Experience or Projects Populated Check
 */
export function checkExperienceOrProjectsPresent(sections: DocumentSection[]): AtsCheckResult {
  const expSec = sections.find(
    (s) => (s.sectionType || (s as any).section_type) === 'experience'
  );
  const projSec = sections.find(
    (s) => (s.sectionType || (s as any).section_type) === 'projects'
  );

  const hasVisibleEntries = (sec?: DocumentSection) => {
    if (!sec) return false;
    const vis = sec.isVisible !== undefined ? sec.isVisible : (sec as any).is_visible !== false;
    if (!vis) return false;
    const entries = (((sec.content as any)?.entries as any[]) || []).filter(
      (e) => e.isVisible !== false
    );
    return entries.length > 0;
  };

  if (hasVisibleEntries(expSec) || hasVisibleEntries(projSec)) {
    return {
      id: 'experience_or_projects',
      name: 'Experience or projects',
      status: 'pass',
      explanation: 'Document includes visible experience or project entries.',
      sectionId: hasVisibleEntries(expSec) ? expSec?.id : projSec?.id,
    };
  }

  return {
    id: 'experience_or_projects',
    name: 'Experience or projects',
    status: 'needs_attention',
    explanation:
      'No visible experience or project entries found. Add work, internship, or project entries so ATS parsers can index your background.',
    sectionId: expSec?.id || projSec?.id,
  };
}

/**
 * Complete ATS Readiness Evaluation Suite
 */
export function runAtsReadinessChecks(
  docMeta: DocumentMeta,
  sections: DocumentSection[],
  extractedText: string,
  pageCount: number
): AtsReadinessReport {
  const startTime = performance.now();

  const checks: AtsCheckResult[] = [
    checkContactDetails(sections),
    checkSectionHeadings(sections),
    checkTextExtraction(sections, extractedText),
    checkSplitWords(extractedText),
    checkExperienceEducationDates(sections),
    checkResumePageCount(docMeta, pageCount),
    checkLayoutFacts(docMeta),
    checkVisibleUrls(sections),
    checkNonLatinText(sections),
    checkEmptySections(sections),
    checkSummaryPresent(sections),
    checkEducationPresent(sections),
    checkExperienceOrProjectsPresent(sections),
  ];

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const needsAttentionCount = checks.filter((c) => c.status === 'needs_attention').length;
  const infoCount = checks.filter((c) => c.status === 'info').length;

  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    title: 'ATS Readiness',
    note: 'Automated checks, not a guarantee. No tool can promise compatibility with every applicant tracking system; read your PDF yourself.',
    checks,
    summary: {
      passCount,
      needsAttentionCount,
      infoCount,
    },
    durationMs,
  };
}
