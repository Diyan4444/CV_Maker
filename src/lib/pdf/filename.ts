/**
 * Sanitizes names and document titles into valid, cross-platform PDF filenames.
 *
 * Rules:
 * - Format: <preferred or full name>-<document title>.pdf
 * - Strip characters illegal on Windows/macOS/Linux (\ / : * ? " < > | and control characters)
 * - Collapse spaces to hyphens
 * - Keep accented Latin letters (e.g. Nguyễn, Łukasz, Żółć)
 * - Strip emojis and unsupported symbols
 * - Limit base length to ~100 characters
 * - Fall back to "resume.pdf" or "cv.pdf"
 */
export function sanitizePdfFilename(
  name?: string | null,
  title?: string | null,
  type: 'resume' | 'cv' = 'resume'
): string {
  const parts = [name?.trim(), title?.trim()].filter(Boolean);
  const raw = parts.join(' - ');

  if (!raw) {
    return type === 'cv' ? 'cv.pdf' : 'resume.pdf';
  }

  // 1. Strip illegal characters across Win/macOS/Linux and control characters
  let cleaned = raw.replace(/[\\/:*?"<>|\x00-\x1F\x7F]/g, '-');

  // 2. Preserve Latin script characters (including accents), numbers, spaces, and hyphens/underscores.
  //    Strip emoji, non-Latin scripts, and illegal punctuation.
  cleaned = cleaned.replace(/[^\p{Script=Latin}0-9\s_-]/gu, '');

  // 3. Collapse consecutive spaces, underscores, and hyphens into a single hyphen
  cleaned = cleaned.replace(/[\s_]+/g, '-').replace(/-+/g, '-');

  // 4. Trim leading and trailing hyphens/dots
  cleaned = cleaned.replace(/^[-.]+|[-.]+$/g, '');

  if (!cleaned) {
    return type === 'cv' ? 'cv.pdf' : 'resume.pdf';
  }

  // 5. Max ~100 characters for the basename
  if (cleaned.length > 100) {
    cleaned = cleaned.slice(0, 100).replace(/[-.]+$/, '');
  }

  return `${cleaned}.pdf`;
}
