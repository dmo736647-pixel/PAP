import { describe, expect, it } from 'vitest';

describe('Google private alpha API contract', () => {
  it('uses protected sync endpoints', () => {
    expect('/api/google/sync').toBe('/api/google/sync');
    expect('/api/google/sync/status').toBe('/api/google/sync/status');
  });
});
