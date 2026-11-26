import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3101';

describe('Dev Routes Production 404 Guard', () => {
  it('returns 404 Not Found for /dev/templates in production', async () => {
    const res = await fetch(`${BASE_URL}/dev/templates`);
    expect(res.status).toBe(404);
  });

  it('returns 404 Not Found for /dev/background in production', async () => {
    const res = await fetch(`${BASE_URL}/dev/background`);
    expect(res.status).toBe(404);
  });

  it('returns 404 Not Found for /dev/loading in production', async () => {
    const res = await fetch(`${BASE_URL}/dev/loading`);
    expect(res.status).toBe(404);
  });

  it('returns 404 Not Found for /dev/design in production', async () => {
    const res = await fetch(`${BASE_URL}/dev/design`);
    expect(res.status).toBe(404);
  });
});
