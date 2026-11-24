/**
 * Safe redirect path validator.
 * Enforces same-site relative paths only:
 * - Must start with a single "/"
 * - No protocol-relative paths ("//")
 * - No backslashes ("\" or URL-encoded variants)
 * - No schemes (e.g. "javascript:", "https:", "data:", "vbscript:")
 * - Validates both raw and fully decoded forms to defeat multi-layer URL encoding tricks
 * - Rejects control characters (0x00-0x1F, 0x7F) and hostile inputs
 * - Falls back to /dashboard (or specified safe fallback) on any invalid input
 */
export function safeNextPath(
  input: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!input || typeof input !== 'string') {
    return fallback;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }

  // Check for ASCII control characters (0x00 - 0x1F, 0x7F)
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code <= 31 || code === 127) {
      return fallback;
    }
  }

  // Candidate safety validator
  const isCandidateSafe = (candidate: string): boolean => {
    // Must start with exactly one '/' and not followed by another '/' or '\'
    if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/\\')) {
      return false;
    }

    // Must not contain backslashes anywhere
    if (candidate.includes('\\')) {
      return false;
    }

    // Must not contain URL scheme before query or hash
    // (e.g., /https://evil.com or /javascript:alert(1))
    const pathPart = candidate.split(/[?#]/)[0];
    if (pathPart.includes(':')) {
      return false;
    }

    return true;
  };

  if (!isCandidateSafe(trimmed)) {
    return fallback;
  }

  // Inspect decoded forms to defeat URL-encoding bypasses (e.g., %2F%2Fevil.com, /%5Cevil.com)
  try {
    let current = trimmed;
    for (let round = 0; round < 3; round++) {
      const decoded = decodeURIComponent(current);
      if (decoded === current) {
        break;
      }
      current = decoded;

      // Re-verify control characters on decoded content
      for (let i = 0; i < current.length; i++) {
        const code = current.charCodeAt(i);
        if (code <= 31 || code === 127) {
          return fallback;
        }
      }

      if (!isCandidateSafe(current)) {
        return fallback;
      }
    }
  } catch {
    // Malformed URI sequence
    return fallback;
  }

  return trimmed;
}
