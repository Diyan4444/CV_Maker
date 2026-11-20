/**
 * Breaks abnormally long unbroken tokens (> 40 characters) into newline-separated chunks
 * so they wrap safely within page margins in react-pdf without clipping or overflowing.
 *
 * Guarantees:
 * - Normal words (<= 40 characters) stay intact.
 * - URLs (starting with http://, https://, or www.) stay intact.
 * - Email addresses (containing '@') stay intact.
 * - No visible hyphens or extra characters are inserted.
 * - Extracted text reconstructed across line segments retains every character without loss.
 */
export function wrapLongTokens(
  text: string | null | undefined,
  maxTokenLength: number = 40,
  chunkSize: number = 35
): string {
  if (!text || typeof text !== 'string') return text || '';

  // If text has no long tokens, return fast
  if (text.length <= maxTokenLength) return text;

  return text
    .split('\n')
    .map((line) => {
      return line
        .split(' ')
        .map((token) => {
          // Keep normal words intact
          if (token.length <= maxTokenLength) return token;

          // Keep URLs and emails intact
          if (
            token.startsWith('http://') ||
            token.startsWith('https://') ||
            token.startsWith('www.') ||
            token.includes('@')
          ) {
            return token;
          }

          // Chunk abnormally long unbroken token
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
