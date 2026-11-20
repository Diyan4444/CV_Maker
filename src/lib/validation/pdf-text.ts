 
/**
 * Unicode Script Detection & PDF Sanitization Utility
 * Strictly aligned with docs/PRODUCT_VISION.md Section 11 & earlier font policy
 */

import { DocumentSection } from '../documents/types';
import { wrapLongTokens } from '../pdf/wrap-long-tokens';

// Matches non-Latin Unicode ranges (Devanagari, Arabic, Cyrillic, CJK, Hangul, Thai, Hebrew, etc.)
// Preserves: ASCII (0000-007F), Latin-1 Supplement (0080-00FF), Latin Extended-A/B (0100-024F), common punctuation
export const NON_LATIN_PATTERN =
  /[\u0900-\u097F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0590-\u05FF\u0E00-\u0E7F]/;

export const NON_LATIN_SCRIPT_REGEX = new RegExp(NON_LATIN_PATTERN.source, 'g');

/**
 * Detects whether an input string contains non-Latin scripts.
 */
export function containsNonLatinScript(text: string): boolean {
  if (!text) return false;
  return NON_LATIN_PATTERN.test(text);
}

/**
 * Strips non-Latin characters from a string for PDF rendering,
 * while preserving standard Latin and accented Latin characters.
 */
export function stripNonLatinScript(text: string): string {
  if (!text) return '';
  const cleaned = text.replace(new RegExp(NON_LATIN_PATTERN.source, 'g'), '').replace(/\s{2,}/g, ' ').trim();
  return wrapLongTokens(cleaned);
}

/**
 * Single field validator returning friendly warning message.
 */
export function validatePdfTextField(text: string): { valid: boolean; warning?: string } {
  if (containsNonLatinScript(text)) {
    return {
      valid: false,
      warning:
        'Non-Latin script (such as Hindi or Marathi Devanagari) detected. Due to PDF font shaping limitations, non-Latin text cannot be cleanly rendered in PDF resumes or CVs and will be omitted from the exported document. Your public website (HTML) displays it accurately.',
    };
  }
  return { valid: true };
}

/**
 * Scans an entire document data structure and returns all fields containing non-Latin characters.
 */
export function scanDocumentForNonLatin(sections: DocumentSection[]): {
  hasNonLatin: boolean;
  affectedFields: string[];
} {
  const affected: string[] = [];

  for (const sec of sections) {
    if (containsNonLatinScript(sec.title)) {
      affected.push(`Section Title: "${sec.title}"`);
    }

    const type = (sec as any).sectionType || (sec as any).section_type;

    if (type === 'header') {
      const header = sec.content as any;
      const name = header?.fullName || header?.full_name;
      if (containsNonLatinScript(name)) affected.push('Header: Full Name');
      if (header?.preferredName && containsNonLatinScript(header.preferredName)) affected.push('Header: Preferred Name');
      if (header?.headline && containsNonLatinScript(header.headline)) affected.push('Header: Professional Headline');
    } else if (type === 'summary') {
      const summary = sec.content as any;
      const text = summary?.text || '';
      if (containsNonLatinScript(text)) affected.push('Summary');
    } else {
      const entriesContent = sec.content as any;
      if (Array.isArray(entriesContent?.entries)) {
        entriesContent.entries.forEach((entry: any, idx: number) => {
          const entryLabel = (entry.title as string) || (entry.name as string) || (entry.institution as string) || (entry.organization as string) || `Entry #${idx + 1}`;
          for (const [key, val] of Object.entries(entry)) {
            if (typeof val === 'string' && containsNonLatinScript(val)) {
              affected.push(`${sec.title} -> ${entryLabel} (${key})`);
            } else if (Array.isArray(val)) {
              val.forEach((item, bIdx) => {
                if (typeof item === 'string' && containsNonLatinScript(item)) {
                  affected.push(`${sec.title} -> ${entryLabel} (bullet #${bIdx + 1})`);
                }
              });
            }
          }
        });
      }
    }
  }

  return {
    hasNonLatin: affected.length > 0,
    affectedFields: affected,
  };
}
