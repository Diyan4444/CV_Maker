/**
 * Unicode Script Detection Utility
 * Detects whether an input string contains non-Latin scripts (Devanagari, Cyrillic, Arabic, CJK, etc.)
 */
export function containsNonLatinScript(text: string): boolean {
  if (!text) return false;
  // Match characters outside ASCII, Latin-1 Supplement, Latin Extended-A/B, common punctuation
  // Specifically captures Devanagari range \u0900-\u097F
  const nonLatinRegex = /[\u0900-\u097F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;
  return nonLatinRegex.test(text);
}

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
