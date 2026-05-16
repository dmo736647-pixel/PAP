import { describe, expect, it } from 'vitest';
import { GET as getReadiness } from './readiness/route';
import { GET as getWorkspace } from './workspace/route';
import { POST as confirmAction } from './actions/[id]/confirm/route';
import { POST as rejectAction } from './actions/[id]/reject/route';
import { createAlphaWorkspaceSnapshot } from '@/lib/pap/alpha-workspace';

async function json(response: Response) {
  return response.json() as Promise<unknown>;
}

describe('alpha API route handlers', () => {
  it('returns readiness without enabling live actions', async () => {
    const body = await json(getReadiness()) as {
      status: { source: string; gmail: string; calendar: string };
      readOnlyFirst: boolean;
      liveActionsEnabled: boolean;
    };

    expect(body.status).toMatchObject({
      source: 'demo_data',
      gmail: 'not_connected',
      calendar: 'not_connected',
    });
    expect(body.readOnlyFirst).toBe(true);
    expect(body.liveActionsEnabled).toBe(false);
  });

  it('returns an alpha workspace snapshot', async () => {
    const body = await json(getWorkspace()) as {
      workspace: { user: { id: string }; actions: unknown[] };
    };

    expect(body.workspace.user.id).toBe('user_alpha_1');
    expect(body.workspace.actions.length).toBeGreaterThan(0);
  });

  it('confirms and rejects actions by id', async () => {
    const actionId = createAlphaWorkspaceSnapshot().actions[0].id;
    const context = { params: Promise.resolve({ id: encodeURIComponent(actionId) }) };

    const confirmed = await json(await confirmAction(new Request('http://localhost'), context)) as {
      action: { id: string; status: string };
      auditRecord: { eventType: string };
    };
    const rejected = await json(await rejectAction(new Request('http://localhost'), context)) as {
      action: { id: string; status: string };
      auditRecord: { eventType: string };
    };

    expect(confirmed.action).toMatchObject({ id: actionId, status: 'confirmed' });
    expect(confirmed.auditRecord.eventType).toBe('confirmed');
    expect(rejected.action).toMatchObject({ id: actionId, status: 'rejected' });
    expect(rejected.auditRecord.eventType).toBe('rejected');
  });

  it('returns 404 for unknown action ids', async () => {
    const response = await confirmAction(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'missing' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Action not found' });
  });
});
