/**
 * Natural Delimiter Token Wrapping Utility
 *
 * Breaks abnormally long unbroken tokens into newline-separated segments
 * so they wrap safely within page margins in react-pdf without clipping or overflowing.
 *
 * Calibrated Rules:
 * - Names and headings break only after spaces or hyphens when any exist.
 * - URLs break only after '/', '?', '&', '=' or '.'.
 * - Emails break after '@' or '.'.
 * - A segment is split in the middle ONLY when a single segment (between delimiters)
 *   is wider than the available line width.
 * - Normal-length words, names, and emails stay completely untouched.
 * - No visible hyphens or extra characters are inserted.
 */

/**
 * Breaks long URLs at natural URL delimiters: after '/', '?', '&', '=', '.'
 * URLs <= maxSegmentLength (default 65 characters) remain completely unbroken.
 */
export function breakUrl(url: string, maxSegmentLength: number = 65): string {
  if (!url || typeof url !== 'string' || url.length <= maxSegmentLength) return url || '';

  const delimiters = new Set(['/', '?', '&', '=', '.']);
  const segments: string[] = [];
  let current = '';

  for (let i = 0; i < url.length; i++) {
    current += url[i];
    if (delimiters.has(url[i])) {
      segments.push(current);
      current = '';
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }

  const lines: string[] = [];
  let currentLine = '';

  for (const seg of segments) {
    if (seg.length > maxSegmentLength) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = '';
      }
      for (let i = 0; i < seg.length; i += maxSegmentLength) {
        lines.push(seg.slice(i, i + maxSegmentLength));
      }
      continue;
    }

    if (!currentLine) {
      currentLine = seg;
    } else if (currentLine.length + seg.length <= maxSegmentLength) {
      currentLine += seg;
    } else {
      lines.push(currentLine);
      currentLine = seg;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.join('\n');
}

/**
 * Breaks long emails at natural delimiters: after '@', or after '.'
 * Emails <= maxSegmentLength (default 65 characters) remain completely unbroken.
 */
export function breakEmail(email: string, maxSegmentLength: number = 65): string {
  if (!email || typeof email !== 'string' || email.length <= maxSegmentLength) return email || '';

  const atIndex = email.indexOf('@');
  if (atIndex !== -1) {
    const localPart = email.slice(0, atIndex + 1); // includes '@'
    const domainPart = email.slice(atIndex + 1);

    if (localPart.length <= maxSegmentLength && domainPart.length <= maxSegmentLength) {
      return `${localPart}\n${domainPart}`;
    }

    const brokenLocal = localPart.length > maxSegmentLength ? breakUrl(localPart, maxSegmentLength) : localPart;
    const brokenDomain = domainPart.length > maxSegmentLength ? breakUrl(domainPart, maxSegmentLength) : domainPart;

    return `${brokenLocal}\n${brokenDomain}`;
  }

  return breakUrl(email, maxSegmentLength);
}

/**
 * Breaks hyphenated tokens (e.g. multi-part names like Montgomery-Chamberlain-Fitzgerald-Smithington)
 * strictly AFTER hyphens, packing segments up to maxSegmentLength.
 * A segment is split in the middle ONLY if an unbroken sub-segment exceeds maxSegmentLength.
 */
export function breakHyphenatedToken(token: string, maxSegmentLength: number = 35): string {
  if (!token || token.length <= maxSegmentLength) return token;

  if (!token.includes('-')) {
    const chunks: string[] = [];
    for (let i = 0; i < token.length; i += maxSegmentLength) {
      chunks.push(token.slice(i, i + maxSegmentLength));
    }
    return chunks.join('\n');
  }

  const segments: string[] = [];
  let current = '';
  for (let i = 0; i < token.length; i++) {
    current += token[i];
    if (token[i] === '-') {
      segments.push(current);
      current = '';
    }
  }
  if (current.length > 0) {
    segments.push(current);
  }

  const lines: string[] = [];
  let currentLine = '';

  for (const seg of segments) {
    if (seg.length > maxSegmentLength) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = '';
      }
      for (let i = 0; i < seg.length; i += maxSegmentLength) {
        lines.push(seg.slice(i, i + maxSegmentLength));
      }
      continue;
    }

    if (!currentLine) {
      currentLine = seg;
    } else if (currentLine.length + seg.length <= maxSegmentLength) {
      currentLine += seg;
    } else {
      lines.push(currentLine);
      currentLine = seg;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.join('\n');
}

/**
 * General long token wrapping utility.
 * - Names and headings break only after spaces or hyphens when any exist.
 * - URLs break only after '/', '?', '&', '=' or '.'.
 * - Emails break after '@' or '.'.
 * - A segment is split in the middle ONLY when a single segment is wider than the available line width.
 * - Normal-length words, names, and emails stay untouched.
 */
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
          // Check if token is a URL (with protocol or path-based URL like subdomain.domain.com/path)
          const isUrl =
            token.startsWith('http://') ||
            token.startsWith('https://') ||
            token.startsWith('www.') ||
            token.includes('://') ||
            (token.includes('/') && (token.includes('.') || token.length > 30));

          if (isUrl) {
            return breakUrl(token, 65);
          }

          // Check if token is an email
          if (token.includes('@')) {
            return breakEmail(token, 65);
          }

          if (token.length <= maxTokenLength) return token;

          // Non-URL long token: check for hyphens
          return breakHyphenatedToken(token, chunkSize);
        })
        .join(' ');
    })
    .join('\n');
}
