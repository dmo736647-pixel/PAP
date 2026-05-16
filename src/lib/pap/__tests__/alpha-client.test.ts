import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmAlphaAction, fetchAlphaReadiness, fetchAlphaWorkspace, rejectAlphaAction } from '../alpha-client';

describe('alpha client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches alpha readiness and workspace', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ readOnlyFirst: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ workspace: { actions: [] } }), { status: 200 }));

    await expect(fetchAlphaReadiness()).resolves.toEqual({ readOnlyFirst: true });
    await expect(fetchAlphaWorkspace()).resolves.toEqual({ workspace: { actions: [] } });
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/alpha/readiness', undefined);
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/alpha/workspace', undefined);
  });

  it('posts action decisions with encoded action ids', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ action: { status: 'confirmed' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ action: { status: 'rejected' } }), { status: 200 }));

    await confirmAlphaAction('briefing:action/1');
    await rejectAlphaAction('briefing:action/1');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/alpha/actions/briefing%3Aaction%2F1/confirm', { method: 'POST' });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/alpha/actions/briefing%3Aaction%2F1/reject', { method: 'POST' });
  });

  it('throws when alpha API returns an error status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));

    await expect(fetchAlphaReadiness()).rejects.toThrow('Alpha API request failed: 500');
  });
});
