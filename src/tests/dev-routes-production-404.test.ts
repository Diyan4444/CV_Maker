import { describe, it, expect } from 'vitest';

describe('Dev Routes Production 404 Guard', () => {
  it('returns 404 Not Found for /dev/templates in production', async () => {
    const res = await fetch('http://localhost:3000/dev/templates');
    expect(res.status).toBe(404);
  });

  it('returns 404 Not Found for /dev/backgrounds in production', async () => {
    const res = await fetch('http://localhost:3000/dev/backgrounds');
    expect(res.status).toBe(404);
  });
});
