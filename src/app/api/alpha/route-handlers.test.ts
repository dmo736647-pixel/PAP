import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { GET as getReadiness } from './readiness/route';
import { GET as getWorkspace } from './workspace/route';
import { POST as confirmAction } from './actions/[id]/confirm/route';
import { POST as rejectAction } from './actions/[id]/reject/route';
import { getAlphaWorkspaceSnapshot, resetAlphaWorkspaceStore } from '@/lib/pap/alpha-workspace';

async function json(response: Response) {
  return response.json() as Promise<unknown>;
}

function workspaceRequest() {
  return new NextRequest('http://localhost/api/alpha/workspace');
}

describe('alpha API route handlers', () => {
  beforeEach(() => {
    resetAlphaWorkspaceStore();
  });

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
    const body = await json(await getWorkspace(workspaceRequest())) as {
      workspace: { user: { id: string }; actions: unknown[] };
    };

    expect(body.workspace.user.id).toBe('user_alpha_1');
    expect(body.workspace.actions.length).toBeGreaterThan(0);
  });

  it('persists confirmed and rejected actions in the workspace route', async () => {
    const actionId = getAlphaWorkspaceSnapshot().actions[0].id;
    const context = { params: Promise.resolve({ id: encodeURIComponent(actionId) }) };

    const confirmed = await json(await confirmAction(new Request('http://localhost'), context)) as {
      action: { id: string; status: string };
      auditRecord: { eventType: string };
    };
    let workspaceBody = await json(await getWorkspace(workspaceRequest())) as {
      workspace: { actions: Array<{ id: string; status: string }>; auditRecords: Array<{ eventType: string }> };
    };

    expect(confirmed.action).toMatchObject({ id: actionId, status: 'confirmed' });
    expect(confirmed.auditRecord.eventType).toBe('confirmed');
    expect(workspaceBody.workspace.actions.find((action) => action.id === actionId)?.status).toBe('confirmed');
    expect(workspaceBody.workspace.auditRecords).toHaveLength(1);

    const rejected = await json(await rejectAction(new Request('http://localhost'), context)) as {
      action: { id: string; status: string };
      auditRecord: { eventType: string };
    };
    workspaceBody = await json(await getWorkspace(workspaceRequest())) as {
      workspace: { actions: Array<{ id: string; status: string }>; auditRecords: Array<{ eventType: string }> };
    };

    expect(rejected.action).toMatchObject({ id: actionId, status: 'rejected' });
    expect(rejected.auditRecord.eventType).toBe('rejected');
    expect(workspaceBody.workspace.actions.find((action) => action.id === actionId)?.status).toBe('rejected');
    expect(workspaceBody.workspace.auditRecords.map((record) => record.eventType)).toEqual(['confirmed', 'rejected']);
  });

  it('returns 404 for unknown action ids', async () => {
    const response = await confirmAction(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'missing' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Action not found' });
  });
});
