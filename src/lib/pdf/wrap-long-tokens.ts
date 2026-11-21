/**
 * Natural Delimiter Token Wrapping Utility
 *
 * Breaks abnormally long unbroken tokens into newline-separated segments
 * so they wrap safely within page margins in react-pdf without clipping or overflowing.
 *
 * Calibrated Thresholds:
 * - URLs: breakUrl breaks at natural delimiters ('/', '?', '&', '=', '.') when > 65 chars.
 * - Emails: breakEmail breaks at '@' (and natural domain/local points) when > 65 chars.
 * - URLs <= 65 chars (e.g. 60 chars) and emails <= 65 chars (e.g. 45 chars) that fit on a line stay UNBROKEN.
 * - Headings / large non-URL words: tokens > 38 chars break at 35 chars to prevent 24pt header overflow.
 * - No visible hyphens or extra characters are inserted.
 * - Extracted text reconstructed across line segments retains every character without loss.
 */

/**
 * Breaks long URLs at natural URL delimiters: after '/', '?', '&', '=', '.'
 * without inserting hyphens or modifying characters.
 * URLs <= maxSegmentLength (default 65 characters) remain completely unbroken.
 */
export function breakUrl(url: string, maxSegmentLength: number = 65): string {
  if (!url || typeof url !== 'string' || url.length <= maxSegmentLength) return url || '';

  const chunks: string[] = [];
  let remaining = url;

  while (remaining.length > maxSegmentLength) {
    // Search backwards from maxSegmentLength down to 15 for a natural breakpoint after '/', '?', '&', '=', '.'
    let breakIdx = -1;
    for (let i = maxSegmentLength; i >= 15; i--) {
      const ch = remaining[i - 1];
      if (ch === '/' || ch === '?' || ch === '&' || ch === '=' || ch === '.') {
        breakIdx = i;
        break;
      }
    }

    // If no delimiter was found in [15, maxSegmentLength], search from 14 down to 5
    if (breakIdx === -1) {
      for (let i = maxSegmentLength; i >= 5; i--) {
        const ch = remaining[i - 1];
        if (ch === '/' || ch === '?' || ch === '&' || ch === '=' || ch === '.') {
          breakIdx = i;
          break;
        }
      }
    }

    // If still no delimiter found (unbroken token), hard split at maxSegmentLength
    if (breakIdx === -1) {
      breakIdx = maxSegmentLength;
    }

    chunks.push(remaining.slice(0, breakIdx));
    remaining = remaining.slice(breakIdx);
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks.join('\n');
}

/**
 * Breaks long emails at natural email delimiters: after '@', or after/before '.'
 * without inserting hyphens or modifying characters.
 * Emails <= maxSegmentLength (default 65 characters) remain completely unbroken.
 */
export function breakEmail(email: string, maxSegmentLength: number = 65): string {
  if (!email || typeof email !== 'string' || email.length <= maxSegmentLength) return email || '';

  const atIndex = email.indexOf('@');
  if (atIndex !== -1) {
    const localPart = email.slice(0, atIndex);
    const domainPart = email.slice(atIndex + 1);

    // Only break parts that individually or collectively exceed limits
    const brokenLocal = localPart.length > maxSegmentLength ? breakUrl(localPart, maxSegmentLength) : localPart;
    const brokenDomain = domainPart.length > maxSegmentLength ? breakUrl(domainPart, maxSegmentLength) : domainPart;

    if (brokenDomain) {
      return `${brokenLocal}@\n${brokenDomain}`;
    }
    return `${brokenLocal}@`;
  }

  return breakUrl(email, maxSegmentLength);
}

export function wrapLongTokens(
  text: string | null | undefined,
  maxTokenLength: number = 38,
  chunkSize: number = 35
): string {
  if (!text || typeof text !== 'string') return text || '';

  return text
    .split('\n')
    .map((line) => {
      return line
        .split(' ')
        .map((token) => {
          // Check if token is a URL
          if (
            token.startsWith('http://') ||
            token.startsWith('https://') ||
            token.startsWith('www.') ||
            token.includes('://')
          ) {
            return breakUrl(token, 65);
          }

          // Check if token is an email
          if (token.includes('@')) {
            return breakEmail(token, 65);
          }

          if (token.length <= maxTokenLength) return token;

          // Abnormally long unbroken non-URL token (e.g. giant name in header)
          const chunks: string[] = [];
          for (let i = 0; i < token.length; i += chunkSize) {
            chunks.push(token.slice(i, i + chunkSize));
          }
          return chunks.join('\n');
        })
        .join(' ');
    })
    .join('\n');
}
